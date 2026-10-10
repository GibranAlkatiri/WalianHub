import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { onRequestGet, onRequestPost, onRequestDelete } from '../functions/api/auth.js';
import { createCmsHandler, serializeContent } from '../functions/api/cms.js';
import { COOKIE, SESSION_SECONDS, readSession, sha256, failedLogin } from '../server/cms-session.js';
import { sqliteD1 } from './helpers/d1-sqlite.js';
import { fakeGithub } from './helpers/cms-github.js';

const schema = readFileSync(new URL('../migrations/0002_sessions.sql', import.meta.url), 'utf8');
const config = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
const password = 'uji-sesi-aman';
const path = 'src/content/layanan/contoh.md';
const data = { judul: 'Contoh layanan', ringkasan: 'Layanan warga', persyaratan: ['KTP'], alur: ['Datang'], unggulan: true, urutan: 1, ikon: 'house', diperbarui: '2026-10-10', body: 'Catatan' };
function setup() {
  const db = sqliteD1(schema);
  const env = { CMS_SESSION_AUTH: '1', CMS_DB: db, CMS_USERNAME: 'walian', CMS_PASSWORD_HASH: createHash('sha256').update(password).digest('hex'), GITHUB_TOKEN: 'server-github-test-only', ASSETS: { fetch: async () => new Response(config) } };
  const github = fakeGithub({ [path]: serializeContent(data, path) }, 'GibranAlkatiri/WalianHub');
  const githubHeaders = [];
  const cms = createCmsHandler(async (url, init) => { githubHeaders.push(init.headers.Authorization); return github.fetch(url, init); });
  const req = (method, body, cookie, headers = {}) => new Request('https://cms.example/api/auth', { method, headers: { ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), ...(['POST', 'DELETE'].includes(method) ? { origin: 'https://cms.example' } : {}), ...(cookie ? { cookie } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const login = (body = { username: 'walian', password }, cookie, extra = {}) => onRequestPost({ env, request: req('POST', body, cookie, extra) });
  const call = async (action, params = {}, cookie, method = 'GET', headers = {}) => {
    const url = new URL('https://cms.example/api/cms');
    if (method === 'GET') for (const [key, value] of Object.entries({ action, collection: 'layanan', ...params })) url.searchParams.set(key, value);
    return cms({ env, request: new Request(url, { method, headers: { ...(cookie ? { cookie } : {}), ...(method === 'POST' ? { origin: url.origin, 'content-type': 'application/json' } : {}), ...headers }, ...(method === 'POST' ? { body: JSON.stringify({ action, collection: 'layanan', slug: 'contoh', ...params }) } : {}) }) });
  };
  return { env, db, github, githubHeaders, req, login, call };
}
const cookieOf = (response) => response.headers.get('set-cookie').split(';')[0];

describe('Sesi CMS mandiri', () => {
  test('login menerbitkan cookie HttpOnly tanpa token GitHub dan hanya menyimpan hash sesi', async () => {
    const { login, db, env } = setup();
    try {
      const response = await login(); const body = await response.json(); const cookie = response.headers.get('set-cookie');
      expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
      expect(body).toMatchObject({ ok: true, mode: 'session', username: 'walian' });
      expect(JSON.stringify(body)).not.toContain(env.GITHUB_TOKEN); expect(body.token).toBeUndefined();
      for (const attribute of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/', `Max-Age=${SESSION_SECONDS}`]) expect(cookie).toContain(attribute);
      const token = cookieOf(response).slice(COOKIE.length + 1);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      const stored = db.raw.query('SELECT * FROM cms_sessions').get();
      expect(stored.token_hash).toBe(await sha256(token)); expect(JSON.stringify(stored)).not.toContain(token);
      expect(stored.expires_at - stored.created_at).toBe(SESSION_SECONDS * 1000);
    } finally { db.close(); }
  });
  test('login mandiri tetap berhasil tanpa GitHub; operasi GitHub memberi pesan konfigurasi', async () => {
    const { env, login, db, call } = setup();
    try {
      env.GITHUB_TOKEN = '';
      const response = await login(); expect(response.status).toBe(200);
      expect((await call('config', {}, cookieOf(response))).status).toBe(503);
    } finally { db.close(); }
  });
  test('cookie mengizinkan baca, simpan dan terbit; server saja yang meneruskan token GitHub', async () => {
    const { login, call, db, githubHeaders, env } = setup();
    try {
      const cookie = cookieOf(await login());
      const entry = await (await call('entry', { slug: 'contoh' }, cookie)).json();
      const savedRes = await call('save', { data: { ...data, judul: 'Revisi draf' }, publishedSha: entry.publishedSha }, cookie, 'POST');
      expect(savedRes.status).toBe(200); const saved = await savedRes.json();
      const published = await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, cookie, 'POST');
      expect(published.status).toBe(200);
      expect(githubHeaders.length).toBeGreaterThan(0);
      expect(githubHeaders.every((header) => header === `Bearer ${env.GITHUB_TOKEN}`)).toBe(true);
    } finally { db.close(); }
  });
  test('token GitHub lama, cookie palsu dan cookie ganda ditolak sebelum membaca repository', async () => {
    const { login, call, db, github, env } = setup();
    try {
      const cookie = cookieOf(await login());
      for (const supplied of [undefined, `${COOKIE}=${'a'.repeat(64)}`, cookie + '; ' + cookie]) expect((await call('config', {}, supplied, 'GET', { authorization: `Bearer ${env.GITHUB_TOKEN}` })).status).toBe(401);
      expect(github.requests).toHaveLength(0);
    } finally { db.close(); }
  });
  test('cek sesi, reload dan kedaluwarsa 8 jam menggunakan waktu server', async () => {
    const { login, req, env, db } = setup();
    try {
      const cookie = cookieOf(await login());
      expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(200);
      const expiry = db.raw.query('SELECT expires_at FROM cms_sessions').get().expires_at;
      expect((await readSession(req('GET', undefined, cookie), env, expiry - 1)).username).toBe('walian');
      await expect(readSession(req('GET', undefined, cookie), env, expiry)).rejects.toThrow('Sesi berakhir');
      db.raw.query('UPDATE cms_sessions SET created_at=1, expires_at=2').run();
      expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(401);
    } finally { db.close(); }
  });
  test('mengubah username atau hash password membatalkan sesi sebelumnya', async () => {
    const { login, req, env, db } = setup();
    try {
      const cookie = cookieOf(await login());
      env.CMS_PASSWORD_HASH = 'b'.repeat(64);
      expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(401);
      env.CMS_USERNAME = 'admin-baru';
      expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(401);
    } finally { db.close(); }
  });
  test('login ulang merotasi cookie pada browser yang sama dan mempertahankan sesi browser lain', async () => {
    const { login, req, env, db } = setup();
    try {
      const first = cookieOf(await login()); const other = cookieOf(await login());
      const rotated = cookieOf(await login(undefined, first)); expect(rotated).not.toBe(first);
      expect((await onRequestGet({ env, request: req('GET', undefined, first) })).status).toBe(401);
      for (const cookie of [other, rotated]) expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(200);
      expect(db.raw.query('SELECT count(*) AS n FROM cms_sessions').get().n).toBe(2);
    } finally { db.close(); }
  });
  test('logout menghapus sesi di server; cookie lama tidak dapat dipakai ulang', async () => {
    const { login, req, env, db, call } = setup();
    try {
      const cookie = cookieOf(await login());
      const result = await onRequestDelete({ env, request: req('DELETE', undefined, cookie) });
      expect(result.status).toBe(200); expect(result.headers.get('set-cookie')).toContain('Max-Age=0');
      expect((await call('list', {}, cookie)).status).toBe(401);
      expect((await onRequestDelete({ env, request: req('DELETE') })).status).toBe(200);
    } finally { db.close(); }
  });
  test('login, logout dan perubahan konten lintas origin atau tanpa origin ditolak', async () => {
    const { login, req, env, db, call } = setup();
    try {
      const cookie = cookieOf(await login());
      for (const origin of ['https://luar.example', 'null', '']) {
        expect((await login(undefined, cookie, { origin })).status).toBe(403);
        expect((await onRequestDelete({ env, request: req('DELETE', undefined, cookie, { origin }) })).status).toBe(403);
        expect((await call('save', {}, cookie, 'POST', { origin })).status).toBe(403);
      }
      expect((await login(undefined, cookie, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
      expect((await onRequestGet({ env, request: req('GET', undefined, cookie) })).status).toBe(200);
    } finally { db.close(); }
  });
  test('percobaan password salah dibatasi per alamat, pulih setelah jendela waktu berakhir', async () => {
    const { login, env, db } = setup();
    try {
      for (let i = 0; i < 10; i++) expect((await login({ username: 'walian', password: 'salah' })).status).toBe(401);
      expect((await login()).status).toBe(429);
      expect((await login(undefined, undefined, { 'cf-connecting-ip': '192.0.2.2' })).status).toBe(200);
      db.raw.query('UPDATE cms_login_limits SET expires_at=1').run();
      expect((await login()).status).toBe(200);
      const key = 'c'.repeat(64);
      await Promise.all(Array.from({ length: 5 }, () => failedLogin(key, env)));
      expect(db.raw.query('SELECT attempts FROM cms_login_limits WHERE key_hash=?').get(key).attempts).toBe(5);
    } finally { db.close(); }
  });
  test('binding atau schema sesi yang hilang gagal tertutup, tanpa mengembalikan token', async () => {
    const { login, env, db, req, call } = setup();
    try {
      env.CMS_DB = undefined; const response = await login();
      expect(response.status).toBe(503); expect((await response.json()).token).toBeUndefined();
      env.CMS_DB = { prepare: () => { throw new Error('detail internal yang tidak boleh muncul'); } };
      const result = await call('config', {}, `${COOKIE}=${'a'.repeat(64)}`);
      expect(result.status).toBe(503); expect(await result.text()).not.toContain('detail internal');
      expect((await onRequestGet({ env, request: req('GET', undefined, `${COOKIE}=${'a'.repeat(64)}`) })).status).toBe(503);
    } finally { db.close(); }
  });
  test('isian login rusak, tipe salah dan payload besar ditolak tanpa membuat sesi', async () => {
    const { env, db } = setup();
    try {
      for (const [body, contentType, status] of [['{', 'application/json', 400], ['[]', 'application/json', 400], ['{}', 'text/plain', 415], ['x'.repeat(5000), 'application/json', 413]]) {
        const response = await onRequestPost({ env, request: new Request('https://cms.example/api/auth', { method: 'POST', headers: { origin: 'https://cms.example', 'content-type': contentType }, body }) });
        expect(response.status).toBe(status);
      }
      expect(db.raw.query('SELECT count(*) AS n FROM cms_sessions').get().n).toBe(0);
    } finally { db.close(); }
  });
});
