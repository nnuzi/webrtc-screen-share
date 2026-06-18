class WebRTCManager extends EventTarget {
    constructor(config) {
        super();
        this.pc = new RTCPeerConnection(config);
        this.queue = [];

        this.pc.onicecandidate = (e) => {
            if (e.candidate) this.dispatchEvent(new CustomEvent('icecandidate', { detail: e.candidate }));
        };

        this.pc.ontrack = (e) => {
            this.dispatchEvent(new CustomEvent('track', { detail: e.streams[0] }));
        };

        this.pc.onconnectionstatechange = () => {
            this.dispatchEvent(new CustomEvent('statechange', { detail: this.pc.connectionState }));
        };
    }

    async addRemoteCandidate(candidate) {
        if (this.pc.remoteDescription?.type) {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            this.queue.push(candidate);
        }
    }

    async setRemote(desc) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
        for (const c of this.queue) await this.pc.addIceCandidate(new RTCIceCandidate(c));
        this.queue = [];
    }
}

if (typeof module !== 'undefined') {
    module.exports = WebRTCManager;
}