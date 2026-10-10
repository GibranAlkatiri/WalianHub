import { sessionEnabled, sameOrigin, sha256, equal, readSession, createSession, revokeSession, checkLoginLimit, failedLogin, cookieHeader, SESSION_SECONDS, SessionError } from '../../server/cms-session.js';

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const json = (data, status = 200, cookie) => new Response(JSON.stringify(data), { status, headers: { ...HEADERS, ...(cookie ? { 'set-cookie': cookie } : {}) } });
const failure = (error) => json({ ok: false, mode: 'session', error: error instanceof SessionError ? error.message : 'Login belum dapat diproses. Coba kembali.' }, error instanceof SessionError ? error.status : 503);

async function credentials(request) {
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new SessionError('Isian login terlalu panjang.', 413);
  const text = await request.text();
  if (text.length > 4096) throw new SessionError('Isian login terlalu panjang.', 413);
  const type = request.headers.get('content-type') || '';
  let body;
  try {
    if (type.includes('application/json')) body = JSON.parse(text);
    else if (type.includes('application/x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(text));
    else throw new SessionError('Format login tidak didukung.', 415);
  } catch (error) { if (error instanceof SessionError) throw error; throw new SessionError('Isian login tidak valid.', 400); }
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') throw new SessionError('Isian login tidak valid.', 400);
  return body;
}
export async function onRequestGet({ request, env } = { env: {} }) {
  if (!sessionEnabled(env)) return json({ ok: false, mode: 'legacy', error: 'Gunakan form login di /admin/.' }, 405);
  try { return json({ ok: true, mode: 'session', ...await readSession(request, env) }); }
  catch (error) { return failure(error); }
}
export async function onRequestPost({ request, env }) {
  const sessions = sessionEnabled(env);
  try {
    if (sessions) sameOrigin(request);
    else if (request.headers.has('origin') && request.headers.get('origin') !== new URL(request.url).origin) throw new SessionError('Permintaan harus berasal dari panel ini.', 403);
    const envUser = String(env.CMS_USERNAME || '').trim();
    const envHash = String(env.CMS_PASSWORD_HASH || '').trim().toLowerCase();
    const envToken = String(env.GITHUB_TOKEN || '').trim();
    if (!envUser || !/^[a-f0-9]{64}$/.test(envHash) || (!sessions && !envToken)) return json({ ok: false, mode: sessions ? 'session' : 'legacy', error: 'Konfigurasi login di server belum lengkap. Lengkapi env lalu redeploy.' }, 500);
    const key = sessions ? await checkLoginLimit(request, env) : null;
    const { username, password } = await credentials(request);
    const passwordValid = equal(await sha256(password), envHash);
    if (username.trim() !== envUser || !passwordValid) {
      if (sessions) await failedLogin(key, env);
      return json({ ok: false, mode: sessions ? 'session' : 'legacy', error: 'Username atau password salah.' }, 401);
    }
    // Keep the production GitHub flow until the final migration switch.
    if (!sessions) return json({ ok: true, mode: 'legacy', token: envToken });
    const session = await createSession(request, env);
    return json({ ok: true, mode: 'session', username: envUser, expiresAt: session.expiresAt }, 200, cookieHeader(session.token, SESSION_SECONDS));
  } catch (error) { return failure(error); }
}
export async function onRequestDelete({ request, env }) {
  if (!sessionEnabled(env)) return json({ ok: false, mode: 'legacy', error: 'Metode tidak didukung.' }, 405);
  try { sameOrigin(request); await revokeSession(request, env); return json({ ok: true, mode: 'session' }, 200, cookieHeader()); }
  catch (error) { return failure(error); }
}
