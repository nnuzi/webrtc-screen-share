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
  it('returns ip, port, and protocol', async () => {
    const res = await get(`http://localhost:${port}/api/server-info`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ip');
    expect(res.body).toHaveProperty('port');
    expect(res.body).toHaveProperty('protocol');
    expect(res.body.protocol).toBe('http');
  });

  it('respects PUBLIC_URL environment variable', async () => {
    process.env.PUBLIC_URL = 'https://example.com:8443';
    const res = await get(`http://localhost:${port}/api/server-info`);
    expect(res.body.ip).toBe('example.com');
    expect(res.body.port).toBe('8443');
    expect(res.body.protocol).toBe('http');
    delete process.env.PUBLIC_URL;
  });

  it('uses default port when PUBLIC_URL omits it', async () => {
    process.env.PUBLIC_URL = 'https://example.com';
    const res = await get(`http://localhost:${port}/api/server-info`);
    expect(res.body.port).toBe('3000');
    delete process.env.PUBLIC_URL;
  });
});
