// Tinggi panel mengikuti isi; klik berulang membalik dari posisi saat ini.
// Tanpa JavaScript daftar tetap terbuka dan tidak menampilkan tombol mati.
export function mulaiPanelProgram() {
  const tombol = document.querySelector<HTMLButtonElement>('[data-program-tombol]');
  const isi = document.querySelector<HTMLElement>('[data-program-isi]');
  const label = tombol?.querySelector<HTMLElement>('[data-program-label]');
  if (!tombol || !isi || !label) return;
  const gerakan = window.matchMedia('(prefers-reduced-motion: reduce)');
  let buka = false;
  let animasi: Animation | undefined;
  isi.hidden = true;
  isi.inert = true;
  tombol.hidden = false;

  function selesai() {
    animasi?.cancel();
    animasi = undefined;
    isi!.hidden = !buka;
    isi!.inert = !buka;
  }

  tombol.addEventListener('click', () => {
    const tinggiAwal = isi.hidden ? 0 : isi.getBoundingClientRect().height;
    const opacityAwal = isi.hidden ? 0 : Number(getComputedStyle(isi).opacity);
    animasi?.cancel();
    buka = !buka;
    tombol.setAttribute('aria-expanded', String(buka));
    label.textContent = buka ? 'Tutup' : 'Selengkapnya';
    isi.hidden = false;
    isi.inert = !buka;
    if (gerakan.matches || !isi.animate) {
      selesai();
      if (!buka) tombol.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      return;
    }
    animasi = isi.animate([
      { height: `${tinggiAwal}px`, opacity: opacityAwal },
      { height: `${buka ? isi.scrollHeight : 0}px`, opacity: buka ? 1 : 0 },
    ], { duration: buka ? 550 : 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
    animasi.onfinish = () => {
      selesai();
      if (!buka) tombol.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    };
  });
  gerakan.addEventListener('change', () => { if (gerakan.matches) selesai(); });
  window.addEventListener('resize', () => { if (animasi) selesai(); });
}
