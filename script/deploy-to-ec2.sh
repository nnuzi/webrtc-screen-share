#!/usr/bin/env bash
#
# deploy-to-ec2.sh
# ---------------------------------------------------------------------------
# Deploy the webrtc-screen-share Docker service onto an ALREADY-EXISTING EC2
# (or any Linux) instance. The service is stateless, so this simply builds the
# image on the target host and runs two containers:
#
#   1. app          - the Express + Socket.IO signaling server (listens on
#                     APP_PORT, serves HTTPS with a self-signed cert)
#   2. cloudflared  - a tunnel that makes an OUTBOUND connection to Cloudflare
#                     and exposes the app on a valid https://*.trycloudflare.com
#                     domain. No inbound 443 / public-IP / certificate setup
#                     needed on the host.
#
# Usage:
#   ./deploy-to-ec2.sh -t ubuntu@1.2.3.4 -k ~/.ssh/key.pem
#
# Flags (all optional except -t / -k):
#   -t TARGET     SSH destination, e.g. ubuntu@13.159.201.108   (required)
#   -k KEY        Path to SSH private key                        (required)
#   -p PORT       SSH port                                       (default 22)
#   -a APP_PORT   Host + container port for the app             (default 1443)
#   -i IMAGE      Local image name                              (default wss)
#   -h            Show this help
#
# Notes / requirements:
#   * The image is BUILT ON THE TARGET HOST, so it works for both x86_64 and
#     arm64 (no cross-architecture or ECR-pull issues).
#   * The target user must have PASSWORDLESS sudo (standard for cloud VMs).
#   * For a STABLE domain instead of a random one, set up a named Cloudflare
#     tunnel and replace the cloudflared command accordingly.
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------- argument parsing ----------
TARGET=""
KEY=""
SSH_PORT=22
APP_PORT=1443
IMAGE=wss

usage() {
  grep '^#' "$0" | tail -n +2 | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while getopts ":t:k:p:a:i:h" opt; do
  case "$opt" in
    t) TARGET="$OPTARG" ;;
    k) KEY="$OPTARG" ;;
    p) SSH_PORT="$OPTARG" ;;
    a) APP_PORT="$OPTARG" ;;
    i) IMAGE="$OPTARG" ;;
    h) usage 0 ;;
    *) usage 1 ;;
  esac
done

if [[ -z "$TARGET" || -z "$KEY" ]]; then
  echo "ERROR: -t (target) and -k (ssh key) are required." >&2
  usage 1
fi

# ---------- paths ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARBALL="/tmp/wss-src-$$.tar.gz"

SSH_OPTS=(-i "$KEY" -o Port="$SSH_PORT" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)
REMOTE_TARBALL="/tmp/wss-src.tar.gz"

# ---------- helpers ----------
run_ssh() {
  ssh "${SSH_OPTS[@]}" "$TARGET" "$@"
}

echo "==> Target: $TARGET (ssh port $SSH_PORT, app port $APP_PORT)"

# 1) connectivity + passwordless sudo check
echo "==> Checking connectivity and sudo..."
run_ssh 'sudo -n true' || {
  echo "ERROR: passwordless sudo is required on the target." >&2
  echo "       Run 'sudo visudo' / ensure the user has NOPASSWD, or pre-install Docker." >&2
  exit 1
}

# 2) install Docker if missing (detect OS)
echo "==> Ensuring Docker is installed on target..."
run_ssh 'bash -s' <<'EOF'
  if command -v docker >/dev/null 2>&1; then
    echo "docker already present: $(docker --version)"
    exit 0
  fi
  . /etc/os-release 2>/dev/null || true
  case "${ID:-unknown}" in
    ubuntu|debian|linuxmint)
      sudo apt-get update -y && sudo apt-get install -y docker.io
      sudo systemctl enable --now docker
      ;;
    amzn|centos|rhel|fedora)
      sudo yum install -y docker && sudo systemctl enable --now docker
      ;;
    *)
      echo "Unsupported OS: ${ID}. Please install Docker manually." >&2
      exit 1
      ;;
  esac
  echo "docker installed: $(docker --version)"
EOF

# 3) package source locally (exclude heavy / non-build files)
echo "==> Packaging source from $PROJECT_ROOT ..."
tar czf "$TARBALL" \
  --exclude='./node_modules' \
  --exclude='./.git' \
  --exclude='./terraform' \
  --exclude='./.github' \
  --exclude='./.DS_Store' \
  --exclude='./dist' \
  --exclude='./build' \
  -C "$PROJECT_ROOT" .

# 4) transfer
echo "==> Uploading to $TARGET:$REMOTE_TARBALL ..."
scp "${SSH_OPTS[@]}" "$TARBALL" "$TARGET:$REMOTE_TARBALL"

# 5) extract, build, run on target
echo "==> Building image and starting containers on target..."
run_ssh "APP_PORT=$APP_PORT IMAGE=$IMAGE bash -s" <<'EOF'
  set -e
  sudo rm -rf /opt/wss && sudo mkdir -p /opt/wss
  sudo tar xzf /tmp/wss-src.tar.gz -C /opt/wss
  cd /opt/wss
  sudo docker rm -f "$IMAGE" 2>/dev/null || true
  sudo docker build -t "$IMAGE" .
  sudo docker rm -f "$IMAGE" 2>/dev/null || true
  sudo docker run -d --restart unless-stopped \
    -p "${APP_PORT}:${APP_PORT}" -e PORT="${APP_PORT}" \
    --name "$IMAGE" "$IMAGE"
  sudo docker rm -f cloudflared-tunnel 2>/dev/null || true
  sudo docker run -d --restart unless-stopped --network host \
    --name cloudflared-tunnel \
    cloudflare/cloudflared:latest tunnel --no-autoupdate \
    --url "https://localhost:${APP_PORT}" --no-tls-verify
EOF

# 6) fetch the tunnel URL
echo "==> Waiting for cloudflared tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 15); do
  sleep 2
  TUNNEL_URL="$(run_ssh 'sudo docker logs cloudflared-tunnel 2>&1' \
    | grep -oE 'https://[a-z0-9.-]+\.trycloudflare\.com' | head -1 || true)"
  [[ -n "$TUNNEL_URL" ]] && break
done

# 7) cleanup local tarball
rm -f "$TARBALL"

# ---------- summary ----------
echo
echo "============================================================"
echo " Deployment complete."
echo "============================================================"
if [[ -n "$TUNNEL_URL" ]]; then
  echo " Receiver URL : $TUNNEL_URL/receiver.html?room=YOUR_ROOM"
  echo " Sender  URL  : $TUNNEL_URL/sender.html"
else
  echo " WARNING: could not auto-detect the cloudflared URL."
  echo " Run: ssh -i $KEY -p $SSH_PORT $TARGET 'sudo docker logs cloudflared-tunnel'"
fi
echo " App container: $IMAGE  (port $APP_PORT, restart=unless-stopped)"
echo "============================================================"
