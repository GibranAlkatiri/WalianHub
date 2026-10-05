// Login username+password untuk panel Decap CMS (/admin/).
//
// /admin/index.html menampilkan form username+password sendiri dan memanggil
// endpoint ini dengan JSON. Jika kredensial benar, server mengembalikan GitHub
// personal access token milik server; frontend menyimpannya di localStorage
// key `decap-cms-user` agar Decap langsung masuk tanpa layar login GitHub.
//
// Format sesi yang ditulis frontend: {"token":"...","backendName":"github"}.
// Ini cocok dengan LocalStorageAuthStore Decap (storageKey 'decap-cms-user'):
// saat boot, Decap memanggil backend.currentUser() → restoreUser(stored) →
// github authenticate(state.token) → api.user() + hasWriteAccess() memakai
// token tersebut. Jadi seeding {token, backendName} cukup untuk login penuh.
//
// Env yang dibutuhkan (Cloudflare Pages → Settings → Environment variables):
// - CMS_USERNAME       contoh: admin
// - CMS_PASSWORD_HASH  SHA-256 hex dari password (`echo -n '...' | sha256sum`)
// - GITHUB_TOKEN       fine-grained PAT, akses repo ini saja, Contents: Read+Write
//
// ponytail: 1 admin saja — kredensial di env, satu token GitHub milik satu akun.
// Upgrade path: simpan hash per-user (KV/D1) + pilih PAT per-user di bawah.

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function sha256Hex(teks) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teks));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sama(a, b) {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

async function bacaKredensial(request) {
  const tipe = request.headers.get('content-type') || '';
  if (tipe.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return { username: String(body.username || ''), password: String(body.password || '') };
  }
  const form = await request.formData();
  return { username: String(form.get('username') || ''), password: String(form.get('password') || '') };
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Gunakan form login di /admin/.' }, 405);
}

export async function onRequestPost({ request, env }) {
  const { username, password } = await bacaKredensial(request);
  // Env di-trim: spasi tak sengaja di kolom Value Cloudflare tidak boleh
  // membuat login selalu gagal.
  const envUser = String(env.CMS_USERNAME || '').trim();
  const envHash = String(env.CMS_PASSWORD_HASH || '').trim().toLowerCase();
  const envToken = String(env.GITHUB_TOKEN || '').trim();
  if (!envUser || !envHash || !envToken) {
    return json(
      { ok: false, error: 'Konfigurasi login di server belum lengkap. Lengkapi env lalu redeploy.' },
      500,
    );
  }
  const userCocok = username.trim() === envUser;
  const passCocok = sama(await sha256Hex(password), envHash);
  if (!userCocok || !passCocok) {
    return json({ ok: false, error: 'Username atau password salah.' }, 401);
  }
  return json({ ok: true, token: envToken });
}
