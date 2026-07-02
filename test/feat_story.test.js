import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc } from 'socket.io-client';
import http from 'http';
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
    socket.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args.length <= 1 ? args[0] : args);
    });
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
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

describe('Feature: full screen-share flow', () => {
  it('Step 1→7: sender creates room → signaling exchange → disconnect notification', async () => {
    const room = 'full-flow-room';

    // Step 1: sender connects
    const sender = connect(room);
    await waitForConnect(sender);
    expect(sender.connected).toBe(true);

    // Step 2: receiver joins
    const receiver = connect(room);
    await waitForConnect(receiver);
    expect(receiver.connected).toBe(true);

    // Step 3: receiver emits ready → sender gets receiver-ready
    const readyPromise = waitForEvent(sender, 'receiver-ready');
    receiver.emit('ready');
    await readyPromise;

    // Step 4: sender offer → receiver receives it
    const offerData = { type: 'offer', sdp: 'v=0\no=full-flow 1 1 IN IP4 127.0.0.1\n' };
    const offerPromise = waitForEvent(receiver, 'offer');
    sender.emit('offer', offerData);
    expect(await offerPromise).toEqual(offerData);

    // Step 5: receiver answer → sender receives it
    const answerData = { type: 'answer', sdp: 'v=0\no=full-flow 2 2 IN IP4 127.0.0.1\n' };
    const answerPromise = waitForEvent(sender, 'answer');
    receiver.emit('answer', answerData);
    expect(await answerPromise).toEqual(answerData);

    // Step 6: bidirectional ICE candidate exchange
    const scPromise = waitForEvent(receiver, 'candidate');
    const rcPromise = waitForEvent(sender, 'candidate');
    sender.emit('candidate', { candidate: 'sender-candidate', sdpMid: '0' });
    receiver.emit('candidate', { candidate: 'receiver-candidate', sdpMid: '0' });
    const [sc, rc] = await Promise.all([scPromise, rcPromise]);
    expect(sc.candidate).toBe('sender-candidate');
    expect(rc.candidate).toBe('receiver-candidate');

    // Step 7: sender disconnect → receiver gets peer-disconnected
    const discPromise = waitForEvent(receiver, 'peer-disconnected');
    sender.close();
    const msg = await discPromise;
    expect(msg).toHaveProperty('room', room);

    receiver.close();
  });
});

describe('Feature: room isolation', () => {
  it('Step 1: roomA messages do not leak to roomB', async () => {
    const senderA = connect('isoA');
    const receiverB = connect('isoB');
    await Promise.all([waitForConnect(senderA), waitForConnect(receiverB)]);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { resolve(); }, 300);
      receiverB.on('offer', () => {
        clearTimeout(timer);
        reject(new Error('Cross-room message leaked'));
      });
      senderA.emit('offer', { type: 'offer', sdp: 'should-not-reach-B' });
    });

    senderA.close();
    receiverB.close();
  });

  it('Step 2: disconnecting one room does not affect other rooms', async () => {
    const s1 = connect('grp1'); const r1 = connect('grp1');
    const s2 = connect('grp2'); const r2 = connect('grp2');
    await Promise.all([
      waitForConnect(s1), waitForConnect(r1),
      waitForConnect(s2), waitForConnect(r2),
    ]);

    s1.close();
    r1.close();

    const offerPromise = waitForEvent(r2, 'offer');
    s2.emit('offer', { type: 'offer', sdp: 'grp2-works' });
    await offerPromise;

    s2.close();
    r2.close();
  });
});

describe('Feature: ICE restart signaling', () => {
  it('Step 1→4: initial connect → ICE restart offer → new answer → new candidate', async () => {
    const room = 'ice-restart-flow';

    // Step 1: establish connection
    const sender = connect(room);
    const receiver = connect(room);
    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    // Step 2: ICE restart offer
    const offer1 = waitForEvent(receiver, 'offer');
    sender.emit('offer', { type: 'offer', sdp: 'initial-sdp' });
    await offer1;

    const restartOffer = { type: 'offer', sdp: 'restart-sdp', iceRestart: true };
    const offer2 = waitForEvent(receiver, 'offer');
    sender.emit('offer', restartOffer);
    const received = await offer2;
    expect(received.iceRestart).toBe(true);

    // Step 3: new answer
    const answerPromise = waitForEvent(sender, 'answer');
    receiver.emit('answer', { type: 'answer', sdp: 'restart-answer' });
    expect(await answerPromise).toEqual({ type: 'answer', sdp: 'restart-answer' });

    // Step 4: new candidate
    const candPromise = waitForEvent(receiver, 'candidate');
    sender.emit('candidate', { candidate: 'restart-candidate', sdpMid: '0' });
    expect((await candPromise).candidate).toBe('restart-candidate');

    sender.close();
    receiver.close();
  });
});

describe('Feature: multiple receivers', () => {
  it('Step 1→3: two receivers join → both get offer → each replies with answer', async () => {
    const room = 'multi-receiver';

    // Step 1: connect
    const sender = connect(room);
    const r1 = connect(room);
    const r2 = connect(room);
    await Promise.all([waitForConnect(sender), waitForConnect(r1), waitForConnect(r2)]);

    // Step 2: both receivers get the offer
    const p1 = waitForEvent(r1, 'offer');
    const p2 = waitForEvent(r2, 'offer');
    sender.emit('offer', { type: 'offer', sdp: 'multi-sdp' });
    const [o1, o2] = await Promise.all([p1, p2]);
    expect(o1).toEqual({ type: 'offer', sdp: 'multi-sdp' });
    expect(o2).toEqual({ type: 'offer', sdp: 'multi-sdp' });

    // Step 3: sender receives both answers
    const answers = [];
    sender.on('answer', (a) => answers.push(a.sdp));
    r1.emit('answer', { type: 'answer', sdp: 'answer-r1' });
    r2.emit('answer', { type: 'answer', sdp: 'answer-r2' });
    await new Promise((r) => setTimeout(r, 200));

    expect(answers).toContain('answer-r1');
    expect(answers).toContain('answer-r2');
    expect(answers).toHaveLength(2);

    sender.close();
    r1.close();
    r2.close();
  });
});

describe('Feature: error handling', () => {
  it('Step 1: no room param — connects with default room', async () => {
    const sock = ioc(`http://localhost:${port}`);
    await waitForConnect(sock);
    expect(sock.connected).toBe(true);
    sock.close();
  });

  it('Step 2: duplicate offers do not crash', async () => {
    const sender = connect('dup-offer');
    const receiver = connect('dup-offer');
    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    let count = 0;
    receiver.on('offer', () => { count++; });

    sender.emit('offer', { type: 'offer', sdp: 'first' });
    sender.emit('offer', { type: 'offer', sdp: 'second' });
    await new Promise((r) => setTimeout(r, 200));

    expect(count).toBe(2);
    sender.close();
    receiver.close();
  });

  it('Step 3: reconnect after disconnect — new session in same room works', async () => {
    const room = 'reconnect-room';

    const sender = connect(room);
    const receiver = connect(room);
    await Promise.all([waitForConnect(sender), waitForConnect(receiver)]);

    sender.close();
    receiver.close();

    const sender2 = connect(room);
    const receiver2 = connect(room);
    await Promise.all([waitForConnect(sender2), waitForConnect(receiver2)]);

    const offerPromise = waitForEvent(receiver2, 'offer');
    sender2.emit('offer', { type: 'offer', sdp: 'reconnect-test' });
    await offerPromise;

    sender2.close();
    receiver2.close();
  });
});

describe('Feature: server info API', () => {
  it('Step 1: GET /api/server-info returns valid data', async () => {
    const res = await get(`http://localhost:${port}/api/server-info`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ip');
    expect(res.body).toHaveProperty('port');
    expect(res.body).toHaveProperty('protocol');
  });
});
