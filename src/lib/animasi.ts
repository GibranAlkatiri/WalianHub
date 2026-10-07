// Efek muncul disiapkan sebelum elemen masuk layar, tanpa hilang lalu muncul lagi.
// Konten di layar awal dan konten tanpa JavaScript tetap langsung terlihat.
// Observer juga mengenali kartu yang masuk melalui geseran carousel/bagan.
export {};

const elemen = [...document.querySelectorAll<HTMLElement>('[data-motion]')];
const kurangiGerakan = window.matchMedia('(prefers-reduced-motion: reduce)');
const sudahTampil = new WeakSet<HTMLElement>();
const berjalan = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;

function tampilkanLangsung(target: HTMLElement) {
  // Anchor/fokus harus melewati transisi CSS kartu sekaligus animasi masuknya.
  const hentikanTransisi = target.hasAttribute('data-motion-state') || berjalan.has(target);
  if (hentikanTransisi) target.setAttribute('data-motion-instant', '');
  sudahTampil.add(target);
  observer?.unobserve(target);
  berjalan.get(target)?.cancel();
  berjalan.delete(target);
  target.removeAttribute('data-motion-state');
  if (hentikanTransisi) {
    // Terapkan posisi normal sebelum transisi hover diaktifkan kembali.
    target.getBoundingClientRect();
    target.removeAttribute('data-motion-instant');
  }
}

function sudahDiLayar(target: HTMLElement) {
  const kotak = target.getBoundingClientRect();
  return kotak.bottom > 0 && kotak.top < window.innerHeight && kotak.right > 0 && kotak.left < window.innerWidth;
}

function mulai() {
  observer?.disconnect();
  if (kurangiGerakan.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) {
    elemen.forEach(tampilkanLangsung);
    return;
  }

  observer = new IntersectionObserver((entries) => {
    const urutanGrup = new Map<Element, number>();
    for (const entry of entries) {
      const target = entry.target as HTMLElement;
      if (!entry.isIntersecting || sudahTampil.has(target)) continue;
      observer?.unobserve(target);
      sudahTampil.add(target);

      // Konten yang sedang dipakai keyboard harus langsung terlihat.
      if (target.contains(document.activeElement) || kurangiGerakan.matches) {
        tampilkanLangsung(target);
        continue;
      }
      const grup = target.closest('[data-motion-group]');
      const urutan = grup ? (urutanGrup.get(grup) ?? 0) : 0;
      if (grup) urutanGrup.set(grup, urutan + 1);
      const jeda = Math.min(420, Number(target.dataset.motionDelay || 0) + (urutan % 4) * 140);
      // Kartu yang masuk layar bersama muncul berurutan; batch berikutnya mulai lagi.
      const jedaKartu = Number(target.dataset.motionDelay ?? 200) + Math.min(540, urutan * 180);
      const kartu = target.hasAttribute('data-motion-card');
      // Judul section memakai pola kiri + pop yang dipilih pada tahap 2.
      const judulSection = target.dataset.motion === 'heading';
      // Percobaan tahap 3: isi section masuk dari kanan sambil menjadi lebih jelas.
      const isiSection = target.dataset.motion === 'content';
      // Simpul memakai pop lebih kecil agar tetap dekat dengan garis bagan.
      const simpulBagan = target.dataset.motion === 'node';
      const kartuPop = target.dataset.motion === 'card' || simpulBagan;
      const dari = judulSection
        ? { opacity: 0.2, transform: 'translateX(-32px) scale(0.94)' }
        : isiSection
          ? { opacity: 0.4, transform: 'translateX(20px)' }
          : kartuPop
            ? { opacity: 0.35, transform: simpulBagan ? 'translateY(6px) scale(0.98)' : 'translateY(16px) scale(0.96)' }
            : { opacity: 0.6, transform: kartu ? 'scale(0.985)' : 'none' };
      // Judul masuk dari kiri, sedikit melewati ukuran akhirnya, lalu menetap.
      const keyframes = judulSection
        ? [
            { ...dari, offset: 0 },
            { opacity: 1, transform: 'translateX(4px) scale(1.02)', offset: 0.72 },
            { opacity: 1, transform: 'none', offset: 1 },
          ]
        : kartuPop
          ? [
              { ...dari, offset: 0 },
              { opacity: 1, transform: simpulBagan ? 'translateY(-1px) scale(1.005)' : 'translateY(-2px) scale(1.01)', offset: 0.75 },
              { opacity: 1, transform: 'none', offset: 1 },
            ]
          : [dari, { opacity: 1, transform: 'none' }];
      const animasi = target.animate(
        keyframes,
        {
          duration: judulSection ? 625 : isiSection ? 750 : kartuPop ? 1300 : 1375,
          delay: judulSection ? 100 : isiSection ? Number(target.dataset.motionDelay ?? 200) : kartuPop ? jedaKartu : jeda,
          easing: judulSection || isiSection || kartuPop ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'cubic-bezier(0.33, 0, 0.25, 1)',
          fill: 'backwards',
        },
      );
      target.removeAttribute('data-motion-state');
      berjalan.set(target, animasi);
      animasi.onfinish = () => berjalan.delete(target);
    }
  }, { threshold: 0.05 });

  elemen.filter((target) => !sudahTampil.has(target)).forEach((target) => {
    if (sudahDiLayar(target)) tampilkanLangsung(target);
    else {
      target.setAttribute('data-motion-state', 'menunggu');
      observer!.observe(target);
    }
  });
}

// Melompat ke anchor harus langsung memperlihatkan informasi yang dicari.
window.addEventListener('hashchange', () => {
  let id: string;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const tujuan = document.getElementById(id);
  if (!tujuan) return;
  tujuan.querySelectorAll<HTMLElement>('[data-motion]').forEach(tampilkanLangsung);
  let target = tujuan.closest<HTMLElement>('[data-motion]');
  while (target) {
    tampilkanLangsung(target);
    target = target.parentElement?.closest<HTMLElement>('[data-motion]') ?? null;
  }
});

document.addEventListener('focusin', (event) => {
  if (!(event.target instanceof Element)) return;
  let target = event.target.closest<HTMLElement>('[data-motion]');
  while (target) {
    tampilkanLangsung(target);
    target = target.parentElement?.closest<HTMLElement>('[data-motion]') ?? null;
  }
});

kurangiGerakan.addEventListener('change', mulai);
mulai();
