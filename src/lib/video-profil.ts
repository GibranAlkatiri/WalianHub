// Penyajian video Profil dipakai bersama oleh halaman statis dan template CMS.
export interface VideoProfilData {
  url: string;
  judul: string;
  deskripsi: string;
}

export function videoProfilEmbed(tautan = ''): string | null {
  try {
    const alamat = new URL(tautan.trim());
    if (!['https:', 'http:'].includes(alamat.protocol)) return null;
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
