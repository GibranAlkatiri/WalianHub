/**
 * Panel Konten Kelurahan Walian — Klien Autentikasi CMS
 * Menangani login via /api/auth, penyimpanan sesi GitHub token,
 * dan pemuatan panel konten.
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

    if (window.__walianPanelDimuat) return;
    window.__walianPanelDimuat = true;
    import('./cms.js?v=20261010_03')
      .then(function (cms) { return cms.start(); })
      .catch(function () {
        window.__walianPanelDimuat = false;
        gagalPanel('Panel gagal dimuat. Periksa koneksi lalu muat ulang.');
      });
  }

  // Tombol keluar / reset sesi
  if (tombolKeluar) {
    tombolKeluar.addEventListener('click', function () {
      try {
        localStorage.removeItem(KUNCI);
      } catch (e) {
        /* abaikan */
      }
      location.reload();
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

  // Periksa sesi aktif yang tersimpan
  try {
    var sesi = JSON.parse(localStorage.getItem(KUNCI) || 'null');
    if (sesi && sesi.token && sesi.backendName === 'github') {
      bukaPanel();
    }
  } catch (e) {
    /* Sesi rusak: biarkan form login tampil */
  }

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
          if (!r.ok || !r.j.token) {
            if (galat) {
              galat.textContent = (r.j && r.j.error) || 'Username atau password salah.';
              galat.hidden = false;
            }
            return;
          }
          localStorage.setItem(
            KUNCI,
            JSON.stringify({ token: r.j.token, backendName: 'github' })
          );
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
