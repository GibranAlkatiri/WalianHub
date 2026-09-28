/**
 * Membuat alamat internal yang mengikuti base path.
 * Contoh saat base = "/WalianHub":
 *   url('/')            → '/WalianHub/'
 *   url('/profil')      → '/WalianHub/profil'
 *   url('/#kontak')     → '/WalianHub/#kontak'
 * Alamat luar (https://...), mailto:, tel:, dan anchor (#...) dikembalikan apa adanya.
 */
export function url(path = '/'): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path) || path.startsWith('//')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
