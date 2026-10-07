// Foto lama tetap utuh selama fade. Pemilihan cepat menunggu transisi yang
// sedang berjalan, kemudian mengambil pilihan terakhir tanpa kilatan.
export function mulaiSlideshow(hero: HTMLElement) {
  const slide = [...hero.querySelectorAll<HTMLElement>('[data-slide]')];
  const kontrol = hero.querySelector<HTMLElement>('[data-hero-kontrol]');
  const tombol = hero.querySelector<HTMLButtonElement>('[data-hero-jeda]');
  const pilihan = [...hero.querySelectorAll<HTMLButtonElement>('[data-hero-pilih]')];
  const status = hero.querySelector<HTMLElement>('[data-hero-status]');
  const gerakan = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bergilir = slide.length > 1;
  const interval = Number(hero.dataset.intervalFoto);
  const durasi = Number(hero.dataset.durasiPergantian);
  let aktif = 0;
  let berhenti = gerakan.matches;
  let terlihat = hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight;
  let berganti = false;
  let pilihanTerakhir: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timerFade: ReturnType<typeof setTimeout> | undefined;

  function labelFoto() {
    const foto = hero.querySelector<HTMLImageElement>('[data-slide][data-aktif] img') ?? hero.querySelector<HTMLImageElement>('img');
    const label = hero.querySelector<HTMLElement>('[data-label-foto]');
    if (foto && label) label.hidden = foto.getAttribute('src') !== foto.dataset.default;
  }

  function muatBerikutnya() {
    if (!bergilir) return;
    const foto = slide[(aktif + 1) % slide.length].querySelector<HTMLImageElement>('img');
    if (foto) foto.loading = 'eager';
  }

  hero.addEventListener('error', () => queueMicrotask(labelFoto), true);
  labelFoto();
  if (!slide.length) return;

  function bolehBerjalan() {
    return !berhenti && terlihat && !document.hidden;
  }

  function aturTimer() {
    clearTimeout(timer);
    hero.toggleAttribute('data-jeda-gerakan', !bolehBerjalan());
    if (bergilir && bolehBerjalan()) {
      timer = setTimeout(() => void tampilkan((aktif + 1) % slide.length), interval);
    }
  }

  function perbaruiKontrol() {
    tombol?.toggleAttribute('data-berhenti', berhenti);
    tombol?.setAttribute('aria-label', berhenti ? 'Putar pergantian foto' : 'Jeda pergantian foto');
    pilihan.forEach((t, i) => {
      t.toggleAttribute('data-aktif', i === aktif);
      if (i === aktif) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
    if (status) {
      status.setAttribute('aria-live', berhenti ? 'polite' : 'off');
      status.textContent = `Foto ${aktif + 1} dari ${slide.length}: ${slide[aktif].querySelector('img')?.alt ?? ''}`;
    }
  }

  function jeda() {
    berhenti = true;
    perbaruiKontrol();
    aturTimer();
  }

  function selesaiFade() {
    clearTimeout(timerFade);
    slide.forEach((s) => s.removeAttribute('data-keluar'));
    berganti = false;
    const berikutnya = pilihanTerakhir;
    pilihanTerakhir = undefined;
    if (berikutnya !== undefined) void tampilkan(berikutnya, true);
  }

  async function tampilkan(nomor: number, manual = false) {
    if (berganti) {
      if (manual) pilihanTerakhir = nomor;
      return;
    }
    if (nomor === aktif) return;
    berganti = true;
    clearTimeout(timer);
    const gambar = slide[nomor].querySelector<HTMLImageElement>('img');
    // Decode sebelum fade agar foto yang belum dimuat tidak menampilkan latar kosong.
    if (gambar) {
      gambar.loading = 'eager';
      await gambar.decode().catch(() => gambar.decode().catch(() => undefined));
    }
    if (!manual && !bolehBerjalan()) {
      selesaiFade();
      aturTimer();
      return;
    }
    if (!gerakan.matches) slide[aktif].setAttribute('data-keluar', '');
    slide[aktif].removeAttribute('data-aktif');
    slide[aktif].setAttribute('aria-hidden', 'true');
    aktif = nomor;
    slide[aktif].setAttribute('data-aktif', '');
    slide[aktif].removeAttribute('aria-hidden');
    muatBerikutnya();
    labelFoto();
    perbaruiKontrol();
    aturTimer();
    if (gerakan.matches) selesaiFade();
    else timerFade = setTimeout(selesaiFade, durasi);
  }

  if (kontrol && bergilir) kontrol.hidden = false;
  pilihan.forEach((t, i) => t.addEventListener('click', () => {
    jeda();
    void tampilkan(i, true);
  }));
  // Fokus keyboard menghentikan putaran sampai pengunjung memilih lanjut.
  kontrol?.addEventListener('focusin', (event) => {
    if (event.target instanceof Element && event.target.matches(':focus-visible')) jeda();
  });
  tombol?.addEventListener('click', () => {
    berhenti = !berhenti;
    perbaruiKontrol();
    aturTimer();
  });
  kontrol?.addEventListener('keydown', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-hero-pilih]')) return;
    const nomor = Number((event.target.closest('[data-hero-pilih]') as HTMLElement).dataset.heroPilih);
    const berikutnya = event.key === 'ArrowRight' ? (nomor + 1) % slide.length
      : event.key === 'ArrowLeft' ? (nomor - 1 + slide.length) % slide.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? slide.length - 1 : undefined;
    if (berikutnya === undefined) return;
    event.preventDefault();
    pilihan[berikutnya].focus();
    pilihan[berikutnya].click();
  });
  document.addEventListener('visibilitychange', aturTimer);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      terlihat = entry.isIntersecting;
      aturTimer();
    }).observe(hero);
  }
  gerakan.addEventListener('change', () => {
    if (gerakan.matches) {
      jeda();
      // Jika gambar masih di-decode, biarkan permintaannya selesai tanpa gerakan.
      if (hero.querySelector('[data-keluar]')) selesaiFade();
    }
  });
  perbaruiKontrol();
  muatBerikutnya();
  aturTimer();
}
