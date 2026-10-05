// Login username+password untuk panel Decap CMS (/admin/).
//
// Decap backend `github` tidak punya login password bawaan: ia membuka popup ke
// `{base_url}/{auth_endpoint}?provider=github`, lalu menunggu handshake postMessage:
// popup kirim `authorizing:github`, parent membalas echo yang sama, popup menjawab
// `authorization:github:success:{"token":"...","provider":"github"}`.
// (Lihat upstream: decap-cms-lib-auth/src/netlify-auth.js dan
// decap-cms-backend-github/src/AuthenticationPage.js — keduanya memakai pola ini.)
//
// Endpoint ini menggantikan OAuth proxy: staf login dengan 1 username+password
// (disimpan sebagai env di Cloudflare Pages), lalu server menyerahkan GitHub
// personal access token milik server lewat handshake di atas. Token tidak pernah
// masuk repository.
//
// Env yang dibutuhkan (Cloudflare Pages → Settings → Environment variables):
// - CMS_USERNAME       contoh: admin
// - CMS_PASSWORD_HASH  SHA-256 hex dari password (`echo -n '...' | sha256sum`)
// - GITHUB_TOKEN       fine-grained PAT, akses repo ini saja, Contents: Read+Write
//
// ponytail: 1 admin saja — kredensial di env, satu token GitHub milik satu akun.
// Upgrade path: simpan hash per-user (KV/D1) + pilih PAT per-user di onRequestPost.

const NO_STORE = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
};

function halamanLogin(pesan) {
  const galat = pesan ? `<p role="alert" style="color:#b91c1c">${pesan}</p>` : '';
  return `<!doctype html>
<html lang="id">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Masuk — Panel Konten Kelurahan Walian</title></head>
<body style="font-family:system-ui,sans-serif;max-width:22rem;margin:4rem auto;padding:0 1rem">
<h1>Masuk Panel Konten</h1>
<p>Kelurahan Walian — khusus pengelola konten.</p>
${galat}
<form method="post" action="/api/auth">
<label>Username<br /><input type="text" name="username" autocomplete="username" required autofocus /></label><br /><br />
<label>Password<br /><input type="password" name="password" autocomplete="current-password" required /></label><br /><br />
<button type="submit">Masuk</button>
</form>
</body>
</html>`;
}

// Halaman jembatan: setelah password benar, teruskan token ke parent (/admin/)
// memakai handshake postMessage yang diharapkan Decap.
function halamanBerhasil(token) {
  const data = JSON.stringify({ token, provider: 'github' });
  return `<!doctype html>
<html lang="id">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Masuk berhasil — Panel Konten Kelurahan Walian</title></head>
<body style="font-family:system-ui,sans-serif;max-width:22rem;margin:4rem auto;padding:0 1rem">
<p>Login berhasil. Jendela ini akan tertutup otomatis…</p>
<script>
(function () {
  var DATA = ${data};
  window.addEventListener('message', function (e) {
    if (e.data === 'authorizing:github' && e.source) {
      e.source.postMessage('authorization:github:success:' + JSON.stringify(DATA), e.origin);
    }
  }, false);
  if (window.opener) window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;
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

export async function onRequestGet() {
  return new Response(halamanLogin(''), { headers: NO_STORE });
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  const userCocok = env.CMS_USERNAME !== undefined && username === env.CMS_USERNAME;
  const passCocok = sama(await sha256Hex(password), String(env.CMS_PASSWORD_HASH || '').toLowerCase());
  if (!userCocok || !passCocok || !env.GITHUB_TOKEN) {
    return new Response(halamanLogin('Username atau password salah.'), {
      status: 401,
      headers: NO_STORE,
    });
  }
  return new Response(halamanBerhasil(env.GITHUB_TOKEN), { headers: NO_STORE });
}
