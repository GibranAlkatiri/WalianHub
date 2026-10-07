import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { onRequestGet, onRequestPost } from '../functions/api/auth.js';

const PASSWORD = 'kata-sandi-contoh';
const ENV = {
  CMS_USERNAME: 'walian',
  // Hash dihitung dengan implementasi independen (node:crypto),
  // jadi bug di SHA-256 sisi function membuat test ini gagal.
  CMS_PASSWORD_HASH: createHash('sha256').update(PASSWORD, 'utf8').digest('hex'),
  GITHUB_TOKEN: 'token-contoh-untuk-test',
};

function reqPost(username, password, sebagaiJson = true) {
  if (sebagaiJson) {
    return {
      request: new Request('http://localhost/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }),
      env: ENV,
    };
  }
  return {
    request: new Request('http://localhost/api/auth', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    }),
    env: ENV,
  };
}

describe('Login password panel CMS (mode JSON)', () => {
  test('GET ditolak 405 dengan pesan JSON', async () => {
    const res = await onRequestGet();
    expect(res.status).toBe(405);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test('kredensial benar mengembalikan token JSON', async () => {
    const res = await onRequestPost(reqPost('walian', PASSWORD));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBe(ENV.GITHUB_TOKEN);
  });

  test('mode form-urlencoded tetap diterima (kompatibilitas)', async () => {
    const res = await onRequestPost(reqPost('walian', PASSWORD, false));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe(ENV.GITHUB_TOKEN);
  });

  test('password salah, username salah, dan kosong ditolak 401 JSON', async () => {
    for (const [u, p] of [
      ['walian', 'salah'],
      ['walian', ''],
      ['bukan-admin', PASSWORD],
      ['', ''],
    ]) {
      const res = await onRequestPost(reqPost(u, p));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('salah');
      expect(body.token).toBeUndefined();
    }
  });

  test('env belum lengkap memberi error konfigurasi (500), bukan error kredensial', async () => {
    const { request } = reqPost('walian', PASSWORD);
    const res = await onRequestPost({ request, env: { ...ENV, GITHUB_TOKEN: '' } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('belum lengkap');
  });

  test('spasi tak sengaja di env dan username dimaafkan', async () => {
    const { request } = reqPost('  walian  ', PASSWORD);
    const res = await onRequestPost({
      request,
      env: { ...ENV, CMS_USERNAME: '  walian  ', CMS_PASSWORD_HASH: ` ${ENV.CMS_PASSWORD_HASH}\n` },
    });
    expect(res.status).toBe(200);
  });
});
