// Gulir native: tetap bisa digeser pada ponsel dan dipakai dengan keyboard.
// Salinan foto hanya untuk sambungan loop; identitas tetap satu per anggota.
export function mulaiTimKkt(section: HTMLElement) {
  const viewport = section.querySelector<HTMLElement>('[data-kkt-viewport]');
  const group = section.querySelector<HTMLElement>('[data-kkt-group]');
  const dialog = section.querySelector<HTMLDialogElement>('[data-kkt-dialog]');
  const card = section.querySelector<HTMLElement>('[data-kkt-card]');
  if (!viewport || !group || !dialog || !card) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clone = group.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-kkt-group');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    link.tabIndex = -1;
    link.addEventListener('mousedown', (event) => event.preventDefault());
  });
  viewport.append(clone);

  let interacting = false;
  let touching = false;
  let interactionTimer: ReturnType<typeof setTimeout> | undefined;
  let hovered = false;
  let keyboard = false;
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let position = 0;
  let origin: HTMLElement | undefined;
  let previousOverflow = '';
  const close = section.querySelector<HTMLButtonElement>('[data-kkt-close]');

  function stopped() {
    return interacting || hovered || (keyboard && viewport!.contains(document.activeElement))
      || dialog!.open || reduced.matches || !visible || document.hidden;
  }

  function tick(time: number) {
    frame = 0;
    if (stopped()) return;
    const period = group!.getBoundingClientRect().width;
    if (period > viewport!.clientWidth) {
      // scrollLeft dimundurkan: foto bergerak dari kiri ke kanan.
      position -= Math.min(time - lastTime, 48) * .026;
      if (position <= 0) position += period;
      if (position > period) position %= period;
      viewport!.scrollLeft = position;
    }
    lastTime = time;
    frame = requestAnimationFrame(tick);
  }

  function update() {
    if (stopped()) {
      cancelAnimationFrame(frame);
      frame = 0;
      position = viewport!.scrollLeft;
    } else if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function resumeAfterGesture() {
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => { interacting = false; update(); }, 700);
  }

  function motionPreference() {
    clone.hidden = reduced.matches;
    viewport!.toggleAttribute('data-kkt-loop', !reduced.matches);
    // Mulai dengan 01 di sisi kanan, diikuti kemunculan 02, 03, dan seterusnya.
    viewport!.scrollLeft = reduced.matches ? 0 : Math.max(0, group!.getBoundingClientRect().width - viewport!.clientWidth);
    position = viewport!.scrollLeft;
    update();
  }

  viewport.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') { hovered = true; update(); }
  });
  viewport.addEventListener('pointerleave', () => { hovered = false; update(); });
  viewport.addEventListener('pointerdown', (event) => {
    keyboard = false;
    if (event.pointerType === 'touch') {
      touching = true;
      interacting = true;
      clearTimeout(interactionTimer);
    }
    update();
  });
  const endTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !touching) return;
    touching = false;
    resumeAfterGesture();
  };
  document.addEventListener('pointerup', endTouch);
  document.addEventListener('pointercancel', endTouch);
  viewport.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaX) > 0 || event.shiftKey) {
      interacting = true;
      update();
      resumeAfterGesture();
    }
  }, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (stopped()) position = viewport.scrollLeft;
    if (interacting && !touching) resumeAfterGesture();
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') { keyboard = true; update(); }
  });
  viewport.addEventListener('focusin', update);
  viewport.addEventListener('focusout', () => { queueMicrotask(update); });

  function openProfile(link: HTMLElement) {
    const id = link.dataset.kktMember;
    const template = [...section.querySelectorAll<HTMLTemplateElement>('[data-kkt-profile]')]
      .find((item) => item.dataset.kktProfile === id);
    if (!template) return;
    origin = group!.querySelector<HTMLElement>(`[data-kkt-member="${id}"]`) ?? link;
    card!.replaceChildren(template.content.cloneNode(true));
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog!.showModal();
    update();
  }

  viewport.querySelectorAll<HTMLAnchorElement>('[data-kkt-member]').forEach((link) => {
    link.setAttribute('role', 'button');
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => { event.preventDefault(); openProfile(link); });
    link.addEventListener('keydown', (event) => {
      if (event.key === ' ') { event.preventDefault(); openProfile(link); }
    });
  });
  close?.addEventListener('click', () => dialog.close());
  // Kartu hanya punya satu kontrol. Tab tetap di tombol tutup, termasuk
  // browser yang memindahkan fokus ke chrome setelah kontrol modal terakhir.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') { event.preventDefault(); close?.focus(); }
  });
  // Seperti kartu modal lain, klik di luar dan Escape menutup tanpa mengubah URL.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    origin?.focus({ preventScroll: true });
    update();
  });
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', motionPreference);
  new ResizeObserver(() => { position = viewport.scrollLeft; update(); }).observe(viewport);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(viewport);
  motionPreference();
}
