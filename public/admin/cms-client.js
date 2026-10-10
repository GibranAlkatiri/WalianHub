const KEY = 'decap-cms-user';
const clearLegacy = () => { try { localStorage.removeItem(KEY); } catch { /* session cookies do not depend on localStorage */ } };

export function session() {
  if (window.WALIAN_CMS_AUTH !== 'legacy') return null;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export async function request(action, params = {}, method = 'GET') {
  const token = session()?.token;
  if (window.WALIAN_CMS_AUTH !== 'session' && !token) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  const url = new URL('/api/cms', location.origin);
  if (method === 'GET') for (const [key, value] of Object.entries({ action, ...params })) url.searchParams.set(key, value);
  const res = await fetch(url, {
    method,
    credentials: 'same-origin', cache: 'no-store',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify({ action, ...params }) } : {}),
  }).catch(() => { throw new Error('Koneksi terputus. Periksa jaringan lalu coba kembali; isian Anda tetap ada.'); });
  const data = await res.json().catch(() => ({ error: 'Server belum merespons dengan benar. Coba kembali.' }));
  if (res.status === 401) { clearLegacy(); window.dispatchEvent(new Event('walian:session-expired')); }
  if (!res.ok) throw new Error(data.error || 'Permintaan belum berhasil. Coba kembali.');
  return data;
}

export async function imageUrl(params) {
  const url = new URL('/api/cms', location.origin);
  for (const [key, value] of Object.entries({ action: 'asset', ...params })) url.searchParams.set(key, value);
  const token = session()?.token;
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (res.status === 401) { clearLegacy(); window.dispatchEvent(new Event('walian:session-expired')); }
  if (!res.ok) throw new Error('Foto belum dapat dimuat.');
  return URL.createObjectURL(await res.blob());
}

export async function uploadImage(file, params) {
  const url = new URL('/api/media', location.origin);
  for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
  const send = () => fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':file.type},body:file});
  let res;
  // Retry a transport failure with the same ID; the server never overwrites it.
  try { res = await send(); } catch {
    try { res = await send(); } catch { throw new Error('Unggahan terputus. Pilih ulang foto untuk mencoba lagi; isian Anda tetap ada.'); }
  }
  const data = await res.json().catch(()=>({error:'Unggahan belum selesai. Pilih ulang foto untuk mencoba lagi.'}));
  if (res.status === 401) { clearLegacy();window.dispatchEvent(new Event('walian:session-expired')); }
  if (!res.ok) throw new Error(data.error || 'Foto belum berhasil diunggah. Coba kembali.');
  return data;
}

export async function logout() {
  if (window.WALIAN_CMS_AUTH === 'session') {
    const res = await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' }).catch(() => { throw new Error('Keluar belum berhasil. Periksa koneksi lalu coba kembali.'); });
    if (!res.ok) throw new Error('Keluar belum berhasil. Coba kembali.');
  }
  clearLegacy();
  window.dispatchEvent(new Event('walian:logout'));
  location.reload();
}
