import { describe, it, expect, beforeAll, vi } from 'vitest';

class MockRTCIceCandidate {
  constructor(candidate) {
    Object.assign(this, candidate);
  }
}

class MockRTCSessionDescription {
  constructor(desc) {
    Object.assign(this, desc);
  }
}

class MockRTCPeerConnection {
  constructor(config) {
    this.config = config;
    this.localDescription = null;
    this.remoteDescription = null;
    this.onicecandidate = null;
    this.ontrack = null;
    this.onconnectionstatechange = null;
    this.connectionState = 'new';
    this.addIceCandidateCalls = [];
  }

  addIceCandidate(candidate) {
    this.addIceCandidateCalls.push(candidate);
    return Promise.resolve();
  }

  setRemoteDescription(desc) {
    this.remoteDescription = new MockRTCSessionDescription(desc);
    return Promise.resolve();
  }

  close() {}
}

let WebRTCManager;

beforeAll(async () => {
  globalThis.RTCIceCandidate = MockRTCIceCandidate;
  globalThis.RTCSessionDescription = MockRTCSessionDescription;
  globalThis.RTCPeerConnection = MockRTCPeerConnection;
  WebRTCManager = (await import('../public/WebRTCManager.js')).default;
});

describe('WebRTCManager', () => {
  it('queues ICE candidates when remote description is not set', () => {
    const manager = new WebRTCManager({});
    const candidate = { candidate: 'candidate:1 1 UDP 1 192.168.1.1 1234 typ host' };

    manager.addRemoteCandidate(candidate);

    expect(manager.queue).toHaveLength(1);
    expect(manager.queue[0]).toEqual(candidate);
  });

  it('immediately adds ICE candidate when remote description is set', async () => {
    const manager = new WebRTCManager({});
    await manager.setRemote({ type: 'offer', sdp: 'test' });

    const candidate = { candidate: 'candidate:2', sdpMid: '0' };
    await manager.addRemoteCandidate(candidate);

    expect(manager.queue).toHaveLength(0);
    expect(manager.pc.addIceCandidateCalls).toHaveLength(1);
  });

  it('flushes queued candidates after setRemote', async () => {
    const manager = new WebRTCManager({});
    const c1 = { candidate: 'c1', sdpMid: '0' };
    const c2 = { candidate: 'c2', sdpMid: '1' };

    manager.addRemoteCandidate(c1);
    manager.addRemoteCandidate(c2);
    expect(manager.queue).toHaveLength(2);

    await manager.setRemote({ type: 'offer', sdp: 'test' });

    expect(manager.queue).toHaveLength(0);
    expect(manager.pc.addIceCandidateCalls).toHaveLength(2);
  });

  it('dispatches icecandidate event', () => {
    const manager = new WebRTCManager({});
    const handler = vi.fn();
    manager.addEventListener('icecandidate', handler);

    manager.pc.onicecandidate({ candidate: { candidate: 'test' } });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ candidate: 'test' });
  });

  it('dispatches track event', () => {
    const manager = new WebRTCManager({});
    const handler = vi.fn();
    manager.addEventListener('track', handler);

    const stream = { id: 'stream1' };
    manager.pc.ontrack({ streams: [stream] });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe(stream);
  });

  it('dispatches statechange event', () => {
    const manager = new WebRTCManager({});
    const handler = vi.fn();
    manager.addEventListener('statechange', handler);

    manager.pc.connectionState = 'connected';
    manager.pc.onconnectionstatechange();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe('connected');
  });
});
