/**
 * Panel Konten Kelurahan Walian — Klien Autentikasi CMS
 * Memeriksa sesi server dan memuat panel konten setelah login.
 * Penyimpanan token lama hanya dipakai selama produksi belum dimigrasikan.
 */
(function () {
  'use strict';

  var KUNCI = 'decap-cms-user';
  var galat = document.getElementById('galat');
  var statusGalat = document.getElementById('status-galat');
  var statusText = document.getElementById('status');
  var statusKeluar = document.getElementById('status-keluar');
  var formMasuk = document.getElementById('form-masuk');
  var tombolMasuk = document.getElementById('tombol');
  var tombolKeluar = document.getElementById('tombol-keluar');
  var tombolIntip = document.getElementById('tombol-intip');
  var kolomSandi = document.getElementById('kolom-sandi');
  window.WALIAN_CMS_AUTH = null;
  function hapusSesiLama() { try { localStorage.removeItem(KUNCI); } catch (e) { /* penyimpanan diblokir */ } }
  function perluMasuk() {
    if (window.WALIAN_CMS_AUTH === 'session') hapusSesiLama();
    document.body.classList.remove('panel-aktif');
    document.title = 'Masuk — Panel Konten Kelurahan Walian';
    document.getElementById('cms-root').hidden = true;
    document.getElementById('panel').hidden = true;
    if (galat) { galat.textContent = 'Sesi berakhir. Masuk kembali untuk melanjutkan; isian Anda tetap ada.'; galat.hidden = false; }
    if (formMasuk && formMasuk.username) formMasuk.username.focus();
  }
  window.addEventListener('walian:session-expired', perluMasuk);

  // Tangkap error runtime JS agar tidak terjadi blank screen tanpa petunjuk
  window.addEventListener('error', function (ev) {
    try {
      if (document.body.classList.contains('panel-aktif')) {
        gagalPanel('Error runtime: ' + (ev.message || 'Script panel gagal dimuat'));
      }
    } catch (e) {
      /* abaikan */
    }
  });

  function gagalPanel(pesan) {
    if (statusText) statusText.hidden = true;
    var putar = document.querySelector('.putar');
    if (putar) putar.hidden = true;
    if (statusGalat) {
      statusGalat.textContent = pesan;
      statusGalat.hidden = false;
    }
    if (statusKeluar) statusKeluar.hidden = false;
  }

  function bukaPanel() {
    document.body.classList.add('panel-aktif');
    document.title = 'Panel Konten — Kelurahan Walian';
    var panel = document.getElementById('panel');
    if (panel) panel.hidden = false;

    var root = document.getElementById('cms-root');
    if (root && root.querySelector('.cms-header')) { root.hidden = false; if (panel) panel.hidden = true; return; }
    if (window.__walianPanelDimuat) return;
    window.__walianPanelDimuat = true;
    import('./cms.js?v=20261010_05')
      .then(function (cms) { return cms.start(); })
      .catch(function () {
        window.__walianPanelDimuat = false;
        gagalPanel('Panel gagal dimuat. Periksa koneksi lalu muat ulang.');
      }).finally(function () { window.__walianPanelDimuat = false; });
  }

  // Tombol keluar / reset sesi
  if (tombolKeluar) {
    tombolKeluar.addEventListener('click', function () {
      import('./cms-client.js?v=20261010_04').then(function (client) { return client.logout(); }).catch(function (error) { gagalPanel(error.message); });
    });
  }

  // Tombol intip sandi
  if (tombolIntip && kolomSandi) {
    tombolIntip.addEventListener('click', function () {
      var tampil = kolomSandi.type === 'password';
      kolomSandi.type = tampil ? 'text' : 'password';
      tombolIntip.textContent = tampil ? 'Sembunyi' : 'Lihat';
      tombolIntip.setAttribute('aria-pressed', tampil ? 'true' : 'false');
      kolomSandi.focus();
    });
  }

  // The server chooses the active rollout mode; an old stored token never
  // authorizes the new session flow.
  if (tombolMasuk) tombolMasuk.disabled = true;
  var periksaSesi = new AbortController();
  var batasPeriksaSesi = setTimeout(function () { periksaSesi.abort(); }, 10000);
  fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store', signal: periksaSesi.signal })
    .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
    .then(function (result) {
      if (result.data.mode === 'session') {
        window.WALIAN_CMS_AUTH = 'session'; hapusSesiLama();
        if (result.status === 200 && result.data.ok) bukaPanel();
        else if (result.status !== 401 && galat) { galat.textContent = result.data.error || 'Sesi belum dapat diperiksa. Coba kembali.'; galat.hidden = false; }
      } else if (result.status === 405 && result.data.mode === 'legacy') {
        window.WALIAN_CMS_AUTH = 'legacy';
        try { var sesi = JSON.parse(localStorage.getItem(KUNCI) || 'null'); if (sesi && sesi.token && sesi.backendName === 'github') bukaPanel(); } catch (e) { hapusSesiLama(); }
      }
    }).catch(function () {
      if (galat) { galat.textContent = 'Sesi belum dapat diperiksa. Periksa koneksi lalu coba masuk.'; galat.hidden = false; }
    }).finally(function () { clearTimeout(batasPeriksaSesi); if (tombolMasuk) tombolMasuk.disabled = false; });

  // Penanganan submit form login
  if (formMasuk) {
    formMasuk.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!tombolMasuk) return;
      tombolMasuk.disabled = true;
      tombolMasuk.textContent = 'Memeriksa…';
      if (galat) galat.hidden = true;

      var username = ev.target.username ? ev.target.username.value : '';
      var password = ev.target.password ? ev.target.password.value : '';

      fetch('/api/auth', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      })
        .then(function (res) {
          return res.json().then(function (j) {
            return { ok: res.ok, j: j };
          });
        })
        .then(function (r) {
          if (!r.ok || !r.j.ok || (r.j.mode !== 'session' && !r.j.token)) {
            if (galat) {
              galat.textContent = (r.j && r.j.error) || 'Username atau password salah.';
              galat.hidden = false;
            }
            return;
          }
          window.WALIAN_CMS_AUTH = r.j.mode === 'session' ? 'session' : 'legacy';
          if (window.WALIAN_CMS_AUTH === 'session') hapusSesiLama();
          else localStorage.setItem(KUNCI, JSON.stringify({ token: r.j.token, backendName: 'github' }));
          if (kolomSandi) kolomSandi.value = '';
          bukaPanel();
        })
        .catch(function () {
          if (galat) {
            galat.textContent = 'Tidak dapat menghubungi server. Coba beberapa saat lagi.';
            galat.hidden = false;
          }
        })
        .finally(function () {
          tombolMasuk.disabled = false;
          tombolMasuk.textContent = 'Masuk';
        });
    });
  }
})();
