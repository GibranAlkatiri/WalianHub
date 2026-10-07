// Scroll native mempertahankan swipe dan snap. Tombol mengarah ke pusat kartu
// tanpa menggulir halaman secara vertikal atau memicu ulang animasi masuk.
export function mulaiCarousel(carousel: HTMLElement) {
  const lintasan = carousel.querySelector<HTMLElement>('[data-carousel-lintasan]');
  const kontrol = carousel.querySelector<HTMLElement>('[data-carousel-kontrol]');
  const titik = [...carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-titik]')];
  const sebelumnya = carousel.querySelector<HTMLButtonElement>('[data-carousel-sebelumnya]');
  const berikutnya = carousel.querySelector<HTMLButtonElement>('[data-carousel-berikutnya]');
  const status = carousel.querySelector<HTMLElement>('[data-carousel-status]');
  if (!lintasan || !titik.length) return;
  const kartu = [...lintasan.children] as HTMLElement[];
  const gerakan = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ponsel = window.matchMedia('(max-width: 767px)');
  let aktif = 0;
  let tujuan: number | undefined;

  function perbarui() {
    const tengah = lintasan!.getBoundingClientRect().left + lintasan!.clientWidth / 2;
    let terdekat = Infinity;
    kartu.forEach((k, i) => {
      const posisi = k.getBoundingClientRect();
      const jarak = Math.abs(posisi.left + posisi.width / 2 - tengah);
      if (jarak < terdekat) {
        terdekat = jarak;
        aktif = i;
      }
    });
    titik.forEach((t, i) => {
      t.toggleAttribute('data-aktif', i === aktif);
      if (i === aktif) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
    if (sebelumnya) sebelumnya.disabled = aktif === 0;
    if (berikutnya) berikutnya.disabled = aktif === kartu.length - 1;
    if (status) status.textContent = `Destinasi ${aktif + 1} dari ${kartu.length}`;
  }

  function tampilkan(nomor: number) {
    if (!ponsel.matches) return;
    tujuan = Math.max(0, Math.min(kartu.length - 1, nomor));
    const posisi = kartu[tujuan].getBoundingClientRect();
    const kiri = lintasan!.scrollLeft + posisi.left + posisi.width / 2
      - lintasan!.getBoundingClientRect().left - lintasan!.clientWidth / 2;
    lintasan!.scrollTo({ left: kiri, behavior: gerakan.matches ? 'instant' : 'smooth' });
    if (gerakan.matches) {
      perbarui();
      tujuan = undefined;
    }
  }

  if (kontrol) kontrol.hidden = kartu.length < 2;
  titik.forEach((t, i) => t.addEventListener('click', () => tampilkan(i)));
  sebelumnya?.addEventListener('click', () => tampilkan((tujuan ?? aktif) - 1));
  berikutnya?.addEventListener('click', () => tampilkan((tujuan ?? aktif) + 1));
  kontrol?.addEventListener('keydown', (event) => {
    const nomor = event.key === 'ArrowRight' ? (tujuan ?? aktif) + 1
      : event.key === 'ArrowLeft' ? (tujuan ?? aktif) - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? kartu.length - 1 : undefined;
    if (nomor === undefined || !ponsel.matches) return;
    event.preventDefault();
    const i = Math.max(0, Math.min(kartu.length - 1, nomor));
    titik[i].focus({ preventScroll: true });
    tampilkan(i);
  });
  lintasan.addEventListener('scroll', perbarui, { passive: true });
  lintasan.addEventListener('scrollend', () => { tujuan = undefined; });
  lintasan.addEventListener('pointerdown', () => { tujuan = undefined; });
  window.addEventListener('resize', () => {
    // Batalkan posisi mobile saat berubah menjadi grid desktop.
    lintasan.scrollTo({ left: ponsel.matches ? lintasan.scrollLeft : 0, behavior: 'instant' });
    tujuan = undefined;
    perbarui();
  });
  gerakan.addEventListener('change', () => {
    if (gerakan.matches && tujuan !== undefined) tampilkan(tujuan);
  });
  perbarui();
}
