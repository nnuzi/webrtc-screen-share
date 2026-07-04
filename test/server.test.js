import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createServer } from '../server.js';

let server, port;

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

describe('GET /api/server-info', () => {
  it('returns ip, port, and protocol from request host', async () => {
    const res = await get(`http://localhost:${port}/api/server-info`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ip');
    expect(res.body).toHaveProperty('port');
    expect(res.body).toHaveProperty('protocol');
    expect(res.body.ip).toBe('localhost');
    expect(res.body.port).toBe(String(port));
    expect(res.body.protocol).toBe('http');
  });

  it('respects x-forwarded-proto header', async () => {
    const res = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'localhost',
        port,
        path: '/api/server-info',
        headers: { 'X-Forwarded-Proto': 'https' }
      };
      http.get(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
    expect(res.body.protocol).toBe('https');
  });
});
