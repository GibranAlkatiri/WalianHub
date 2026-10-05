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

function reqPost(username, password) {
  return {
    request: new Request('http://localhost/api/auth', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    }),
    env: ENV,
  };
}

describe('Login password panel CMS', () => {
  test('GET menampilkan form login tanpa cache', async () => {
    const res = await onRequestGet();
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<form');
    expect(html).toContain('name="password"');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('kredensial benar mengembalikan halaman handshake Decap', async () => {
    const res = await onRequestPost(reqPost('walian', PASSWORD));
    expect(res.status).toBe(200);
    const html = await res.text();
    // Format yang ditunggu NetlifyAuthenticator Decap:
    expect(html).toContain('authorizing:github');
    expect(html).toContain('authorization:github:success:');
    expect(html).toContain('"provider":"github"');
    expect(html).toContain(ENV.GITHUB_TOKEN);
  });

  test('password salah, username salah, dan panjang beda ditolak 401', async () => {
    for (const [u, p] of [
      ['walian', 'salah'],
      ['walian', ''],
      ['bukan-admin', PASSWORD],
      ['', ''],
    ]) {
      const res = await onRequestPost(reqPost(u, p));
      expect(res.status).toBe(401);
      expect(await res.text()).toContain('salah');
    }
  });

  test('tanpa GITHUB_TOKEN di env login tetap ditolak', async () => {
    const { request } = reqPost('walian', PASSWORD);
    const res = await onRequestPost({ request, env: { ...ENV, GITHUB_TOKEN: '' } });
    expect(res.status).toBe(401);
  });
});
