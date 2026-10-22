// Tanpa SDK atau permintaan video sebelum pengguna menekan Putar.
import { sumberVideoProfil } from './video-profil';

for (const frame of document.querySelectorAll<HTMLElement>('[data-profile-video]')) {
  const button = frame.querySelector<HTMLButtonElement>('[data-video-play]');
  const aside = frame.closest('aside');
  const status = aside?.querySelector<HTMLElement>('[data-video-status]');
  if (!button) continue;
  button.addEventListener('click', () => {
    // Validasi ulang atribut DOM agar hanya sumber yang didukung dapat dimuat.
    const source = sumberVideoProfil(frame.dataset.videoSrc);
    if (!source || source.jenis !== frame.dataset.videoKind) return;
    const title = frame.dataset.videoTitle || 'Video pengenalan Kelurahan Walian';
    const fail = () => {
      if (!status) return;
      status.hidden = false;
      status.textContent = 'Video belum dapat diputar. Periksa koneksi lalu muat ulang halaman.';
    };
    if (source.jenis === 'youtube') {
      const player = document.createElement('iframe');
      const address = new URL(source.url);
      address.searchParams.set('autoplay', '1');
      player.src = address.href;
      player.title = title;
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.className = 'absolute inset-0 h-full w-full';
      player.addEventListener('error', fail, { once: true });
      frame.replaceChildren(player);
      player.focus();
    } else {
      const player = document.createElement('video');
      player.controls = true;
      player.playsInline = true;
      player.preload = 'none';
      player.setAttribute('aria-label', title);
      player.className = 'absolute inset-0 h-full w-full';
      player.tabIndex = 0;
      player.src = source.url;
      player.addEventListener('error', fail, { once: true });
      frame.replaceChildren(player);
      player.focus();
      // Jika pemutaran otomatis ditolak, kontrol tetap tersedia untuk ditekan.
      player.play().catch(() => {
        if (player.error) fail();
      });
    }
  }, { once: true });
}
