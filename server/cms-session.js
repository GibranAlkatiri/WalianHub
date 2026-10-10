export const COOKIE = '__Host-walian-cms-session';
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
export const sessionEnabled = (env) => env.CMS_SESSION_AUTH === '1';
export class SessionError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export const sha256 = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
export function equal(a, b) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export function sameOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new SessionError('Permintaan harus berasal dari panel ini.', 403);
}
function database(env) {
  if (!env.CMS_DB) throw new SessionError('Penyimpanan sesi belum tersedia. Hubungi pengelola panel.', 503);
  return env.CMS_DB;
}
function cookieToken(request) {
  const matches = (request.headers.get('cookie') || '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(COOKIE + '='));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export const cookieHeader = (token = '', maxAge = 0) => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
const credentialVersion = (env) => sha256(`${String(env.CMS_USERNAME || '').trim()}\0${String(env.CMS_PASSWORD_HASH || '').trim().toLowerCase()}`);

export async function readSession(request, env, now = Date.now()) {
  const db = database(env), token = cookieToken(request);
  if (!token) throw new SessionError('Sesi berakhir. Silakan masuk kembali.', 401);
  let session;
  try { session = await db.prepare('SELECT username, credential_version, expires_at FROM cms_sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha256(token), now).first(); }
  catch { throw new SessionError('Sesi belum dapat diperiksa. Coba kembali.', 503); }
  if (!session || session.username !== String(env.CMS_USERNAME || '').trim() || !equal(session.credential_version, await credentialVersion(env))) throw new SessionError('Sesi berakhir. Silakan masuk kembali.', 401);
  return { username: session.username, expiresAt: session.expires_at };
}
export async function checkLoginLimit(request, env, now = Date.now()) {
  const db = database(env);
  const key = await sha256(`login\0${request.headers.get('cf-connecting-ip') || 'local'}\0${String(env.CMS_USERNAME || '').trim()}`);
  const row = await db.prepare('SELECT attempts FROM cms_login_limits WHERE key_hash = ? AND expires_at > ?').bind(key, now).first();
  if (row?.attempts >= 10) throw new SessionError('Terlalu banyak percobaan login. Coba lagi dalam 15 menit.', 429);
  return key;
}
export async function failedLogin(key, env, now = Date.now()) {
  await database(env).prepare(`INSERT INTO cms_login_limits(key_hash, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
    expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END`).bind(key, now + 15 * 60 * 1000, now, now).run();
}
export async function createSession(request, env, now = Date.now()) {
  const db = database(env);
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const expiresAt = now + SESSION_SECONDS * 1000;
  const old = cookieToken(request);
  const statements = [db.prepare('DELETE FROM cms_sessions WHERE expires_at <= ?').bind(now), db.prepare('DELETE FROM cms_login_limits WHERE expires_at <= ?').bind(now)];
  if (old) statements.push(db.prepare('DELETE FROM cms_sessions WHERE token_hash = ?').bind(await sha256(old)));
  statements.push(db.prepare('INSERT INTO cms_sessions(token_hash, username, credential_version, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(await sha256(token), String(env.CMS_USERNAME).trim(), await credentialVersion(env), now, expiresAt));
  await db.batch(statements);
  return { token, expiresAt };
}
export async function revokeSession(request, env) {
  const db = database(env), token = cookieToken(request);
  if (token) await db.prepare('DELETE FROM cms_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}
