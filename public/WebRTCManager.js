class WebRTCManager extends EventTarget {
    constructor(config) {
        super();
        this.pc = new RTCPeerConnection(config);
        this.queue = [];
        this._closed = false;

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
        if (this._closed) return;
        if (this.pc.remoteDescription) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.warn('Failed to add ICE candidate:', err);
            }
        } else {
            this.queue.push(candidate);
        }
    }

    async setRemote(desc) {
        if (this._closed) throw new Error('WebRTCManager is closed');
        await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
        const results = await Promise.allSettled(
            this.queue.map(c => this.pc.addIceCandidate(new RTCIceCandidate(c)))
        );
        for (const r of results) {
            if (r.status === 'rejected') console.warn('Failed to flush ICE candidate:', r.reason);
        }
        this.queue = [];
    }

    close() {
        this._closed = true;
        this.pc.close();
    }

    restartIce() {
        return this.pc.createOffer({ iceRestart: true });
    }
}

if (typeof module !== 'undefined') {
    module.exports = WebRTCManager;
}