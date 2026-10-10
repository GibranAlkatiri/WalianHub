// Dipasang pada halaman, di luar daftar yang diisi ulang oleh Pages Function.
function bukaDariAnchor() {
  let id: string;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const layanan = id ? document.getElementById(id) : null;
  if (layanan instanceof HTMLDetailsElement) {
    layanan.setAttribute('data-layanan-langsung', '');
    layanan.open = true;
    layanan.getBoundingClientRect();
    requestAnimationFrame(() => layanan.removeAttribute('data-layanan-langsung'));
  }
}
bukaDariAnchor();
window.addEventListener('hashchange', bukaDariAnchor);
