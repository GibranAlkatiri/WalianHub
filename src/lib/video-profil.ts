// Penyajian video Profil dipakai bersama oleh halaman statis dan template CMS.
export interface VideoProfilData {
  url: string;
  judul: string;
  deskripsi: string;
}

export interface SumberVideoProfil {
  jenis: 'youtube' | 'mp4';
  url: string;
  tautan: string;
}

// Hanya provider yang dipercaya; tautan Drive adalah arsip, bukan URL streaming.
export function sumberVideoProfil(tautan = ''): SumberVideoProfil | null {
  const lokal = tautan.trim();
  if (/^\/videos\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.mp4$/.test(lokal)) {
    return { jenis: 'mp4', url: lokal, tautan: lokal };
  }
  try {
    const alamat = new URL(tautan.trim());
    if (alamat.username || alamat.password || !['https:', 'http:'].includes(alamat.protocol)) return null;
    const embed = videoProfilEmbed(tautan);
    if (embed) return { jenis: 'youtube', url: embed + '?playsinline=1&rel=0', tautan: `https://www.youtube.com/watch?v=${embed.split('/').at(-1)}` };
    if (alamat.protocol === 'https:' && alamat.hostname === 'res.cloudinary.com' && !alamat.port
      && /^\/[\w-]+\/video\/upload\/.+\.mp4$/.test(alamat.pathname) && !alamat.search && !alamat.hash) {
      return { jenis: 'mp4', url: alamat.href, tautan: alamat.href };
    }
  } catch { /* URL tidak didukung: blok video disembunyikan. */ }
  return null;
}

export function videoProfilEmbed(tautan = ''): string | null {
  try {
    const alamat = new URL(tautan.trim());
    if (!['https:', 'http:'].includes(alamat.protocol) || alamat.username || alamat.password || alamat.port) return null;
    const host = alamat.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = alamat.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      if (/^\/(embed|shorts)\//.test(alamat.pathname)) id = alamat.pathname.split('/')[2];
      else if (alamat.pathname === '/watch') id = alamat.searchParams.get('v');
    }
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  } catch { return null; }
}
