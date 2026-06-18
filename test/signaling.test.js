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

describe('signaling', () => {
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

  it('does NOT forward messages across different rooms', async () => {
    const sender = connect('roomA');
    const receiver = connect('roomB');

    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    let crossTalk = false;
    receiver.on('offer', () => { crossTalk = true; });

    sender.emit('offer', { type: 'offer', sdp: 'should-not-reach' });

    await sleep(300);
    expect(crossTalk).toBe(false);

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
