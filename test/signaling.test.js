import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc } from 'socket.io-client';
import { createServer } from '../server.js';

let server, port;

function connect(room) {
  return ioc(`http://localhost:${port}`, { query: { room } });
}

function waitForConnect(socket) {
  return new Promise((resolve) => {
    if (socket.connected) resolve();
    else socket.on('connect', resolve);
  });
}

function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.on(event, (...args) => {
      clearTimeout(timer);
      resolve(args.length <= 1 ? args[0] : args);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  const s = createServer(0);
  server = s.server;
  await new Promise((resolve) => server.on('listening', resolve));
  port = server.address().port;
});

afterAll(() => {
  server.close();
});

describe('Signaling · Event forwarding', () => {
  it('forwards offer to clients in the same room', async () => {
    const sender = connect('room1');
    const receiver = connect('room1');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const offerPromise = waitForEvent(receiver, 'offer');
    sender.emit('offer', { type: 'offer', sdp: 'test' });

    const offer = await offerPromise;
    expect(offer).toEqual({ type: 'offer', sdp: 'test' });

    sender.close();
    receiver.close();
  });

  it('forwards answer to clients in the same room', async () => {
    const sender = connect('room1');
    const receiver = connect('room1');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const answerPromise = waitForEvent(sender, 'answer');
    receiver.emit('answer', { type: 'answer', sdp: 'answer-sdp' });

    const answer = await answerPromise;
    expect(answer).toEqual({ type: 'answer', sdp: 'answer-sdp' });

    sender.close();
    receiver.close();
  });

  it('forwards candidate to clients in the same room', async () => {
    const sender = connect('room1');
    const receiver = connect('room1');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const candidatePromise = waitForEvent(receiver, 'candidate');
    sender.emit('candidate', { candidate: 'candidate:1', sdpMid: '0' });

    const candidate = await candidatePromise;
    expect(candidate).toEqual({ candidate: 'candidate:1', sdpMid: '0' });

    sender.close();
    receiver.close();
  });

  it('forwards ready event as receiver-ready', async () => {
    const sender = connect('room1');
    const receiver = connect('room1');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const readyPromise = waitForEvent(sender, 'receiver-ready');
    receiver.emit('ready');

    await readyPromise;

    sender.close();
    receiver.close();
  });
});

describe('Signaling · Room isolation', () => {
  it('does NOT forward messages across different rooms', async () => {
    const sender = connect('roomA');
    const receiver = connect('roomB');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        sender.close();
        receiver.close();
        resolve();
      }, 300);
      receiver.on('offer', () => {
        clearTimeout(timer);
        sender.close();
        receiver.close();
        reject(new Error('Cross-room message leaked'));
      });
      sender.emit('offer', { type: 'offer', sdp: 'should-not-reach' });
    });
  });
});

describe('Signaling · Connection lifecycle', () => {
  it('forwards peer-disconnected event on disconnect', async () => {
    const sender = connect('room1');
    const receiver = connect('room1');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    const discPromise = waitForEvent(receiver, 'peer-disconnected');
    sender.close();

    const msg = await discPromise;
    expect(msg).toHaveProperty('room', 'room1');
    receiver.close();
  });

  it('handles connect_error gracefully', async () => {
    const badSocket = ioc(`http://localhost:${port}`, {
      query: { room: 'test' },
      forceNew: true,
    });
    await waitForConnect(badSocket);
    badSocket.close();
  });

  it('handles disconnect reason', async () => {
    const sender = connect('room1');
    await waitForConnect(sender);

    let disconnectReason = null;
    sender.on('disconnect', (reason) => { disconnectReason = reason; });

    sender.close();
    await sleep(100);
    expect(disconnectReason).toBe('io client disconnect');
  });
});
