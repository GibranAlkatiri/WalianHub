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

export async function uploadVideo(file, params, progress = () => {}) {
  progress('Memeriksa video…');
  // Periksa durasi/dimensi sebelum mengirim berkas ke server.
  const video = document.createElement('video'), local = URL.createObjectURL(file);
  try {
    video.preload = 'metadata';video.src = local;
    await new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('Video belum dapat dibaca. Pilih ulang berkas MP4.')),15000);
      video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};
      video.onerror=()=>{clearTimeout(timer);reject(new Error('Berkas video tidak dapat dibaca oleh browser. Gunakan MP4 H.264/AAC.'));};
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 300
      || video.videoWidth <= 0 || video.videoHeight <= 0 || video.videoWidth > 1920 || video.videoHeight > 1920
      || video.videoWidth * video.videoHeight > 1920*1080) throw new Error('Video maksimal 1080p dan 5 menit. Gunakan versi yang sudah dikompresi.');
  } finally {video.removeAttribute('src');video.load();URL.revokeObjectURL(local);}
  progress('Menyiapkan unggahan video…');
  const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const url=new URL('/api/video',location.origin);
  for (const [key,value] of Object.entries({...params,bytes:file.size,sha256})) url.searchParams.set(key,value);
  const send=()=>new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',url);xhr.withCredentials=true;xhr.timeout=300000;
    xhr.setRequestHeader('content-type','video/mp4');
    xhr.upload.onprogress=event=>{if(event.lengthComputable)progress(`Mengunggah video… ${Math.min(99,Math.round(event.loaded/event.total*100))}%`);};
    xhr.upload.onload=()=>progress('Menyelesaikan penyimpanan video…');
    xhr.onerror=()=>reject(new TypeError('Koneksi terputus.'));
    xhr.ontimeout=()=>reject(new Error('Unggahan terlalu lama. Pilih ulang video untuk mencoba lagi; isian Anda tetap ada.'));
    xhr.onload=()=>{
      let data;try {data=JSON.parse(xhr.responseText);}catch {data={error:'Respons unggahan video belum dapat dibaca.'};}
      if(xhr.status===401){clearLegacy();window.dispatchEvent(new Event('walian:session-expired'));}
      if(xhr.status<200 || xhr.status>=300)reject(new Error(data.error || 'Video belum berhasil diunggah.'));
      else resolve(data);
    };
    xhr.send(file);
  });
  try {return await send();}catch(error){
    if(!(error instanceof TypeError))throw error;
    // ID dan checksum tetap sama ketika respons jaringan hilang.
    progress('Mencoba kembali unggahan video…');
    return send().catch(error=>{throw new Error(error.message || 'Unggahan terputus. Pilih ulang video.');});
  }
}
