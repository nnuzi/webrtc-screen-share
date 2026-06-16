resource "tls_private_key" "wss" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "wss" {
  key_name   = "webrtc-screen-share-key"
  public_key = tls_private_key.wss.public_key_openssh
}

resource "local_file" "pem" {
  filename        = "${path.module}/webrtc-screen-share-key.pem"
  content         = tls_private_key.wss.private_key_pem
  file_permission = "0600"
}
