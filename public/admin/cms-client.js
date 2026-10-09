const KEY = 'decap-cms-user';

export function session() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export async function request(action, params = {}, method = 'GET') {
  const token = session()?.token;
  if (!token) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  const url = new URL('/api/cms', location.origin);
  if (method === 'GET') for (const [key, value] of Object.entries({ action, ...params })) url.searchParams.set(key, value);
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify({ action, ...params }) } : {}),
  }).catch(() => { throw new Error('Koneksi terputus. Periksa jaringan lalu coba kembali; isian Anda tetap ada.'); });
  const data = await res.json().catch(() => ({ error: 'Server belum merespons dengan benar. Coba kembali.' }));
  if (res.status === 401) { localStorage.removeItem(KEY); location.reload(); }
  if (!res.ok) throw new Error(data.error || 'Permintaan belum berhasil. Coba kembali.');
  return data;
}

export async function imageUrl(params) {
  const url = new URL('/api/cms', location.origin);
  for (const [key, value] of Object.entries({ action: 'asset', ...params })) url.searchParams.set(key, value);
  const res = await fetch(url, { headers: { authorization: `Bearer ${session()?.token || ''}` } });
  if (!res.ok) throw new Error('Foto belum dapat dimuat.');
  return URL.createObjectURL(await res.blob());
}

export function logout() { localStorage.removeItem(KEY); location.reload(); }
