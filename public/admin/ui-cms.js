/**
 * Panel Konten Kelurahan Walian — UI & Pratinjau CMS
 * Mengatur template pratinjau yang me-mirror tampilan website
 * untuk Destinasi Wisata, Layanan Surat, dan Pengumuman.
 */
(function () {
  'use strict';

  // Helper aman untuk membangun React Elements tanpa JSX
  function h(tag, props) {
    var reactH = window.h || (window.React && window.React.createElement);
    if (!reactH) return null;
    var children = [];
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (Array.isArray(c)) {
        for (var j = 0; j < c.length; j++) {
          if (c[j] !== undefined && c[j] !== null && c[j] !== false) {
            children.push(c[j]);
          }
        }
      } else if (c !== undefined && c !== null && c !== false) {
        children.push(c);
      }
    }
    return reactH.apply(null, [tag, props].concat(children));
  }

  // Helper mengambil nilai dari Decap Immutable.Map atau Plain Object
  function getVal(entry, path, fallback) {
    try {
      if (!entry) return fallback;
      if (typeof entry.getIn === 'function') {
        var v = entry.getIn(Array.isArray(path) ? path : [path]);
        return v !== undefined && v !== null ? v : fallback;
      }
      var cur = entry.data || entry;
      var parts = Array.isArray(path) ? path : [path];
      if (parts[0] === 'data') parts = parts.slice(1);
      for (var i = 0; i < parts.length; i++) {
        if (cur == null) return fallback;
        cur = cur[parts[i]];
      }
      return cur !== undefined && cur !== null ? cur : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Helper mengambil list menjadi Array
  function getList(entry, path) {
    var fullPath = Array.isArray(path) ? ['data'].concat(path) : ['data', path];
    var val = getVal(entry, fullPath, []);
    if (!val) return [];
    if (typeof val.toJS === 'function') {
      val = val.toJS();
    }
    return Array.isArray(val) ? val : [val];
  }

  // Helper mengambil URL gambar / asset preview Decap CMS
  function resolveAsset(props, rawPath) {
    if (!rawPath) return '';
    try {
      var asset = props.getAsset ? props.getAsset(rawPath) : rawPath;
      return asset && asset.toString ? asset.toString() : String(asset || '');
    } catch (e) {
      return String(rawPath || '');
    }
  }

  // Helper mengambil properti objek atau Immutable Map
  function getItemField(item, field, fallback) {
    if (!item) return fallback;
    if (typeof item.get === 'function') {
      var v = item.get(field);
      return v !== undefined && v !== null ? v : fallback;
    }
    var v2 = item[field];
    return v2 !== undefined && v2 !== null ? v2 : fallback;
  }

  // Koleksi SVG Icons Lucide sederhana
  function renderIconSvg(name, extraClass) {
    var cls = 'nc-svg-icon' + (extraClass ? ' ' + extraClass : '');
    var path = '';

    switch (name) {
      case 'external-link':
        path = 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3';
        break;
      case 'house':
        path = 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';
        break;
      case 'id-card':
        path = 'M16 10h2M16 14h2M6.17 15a3 3 0 0 1 5.66 0M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z';
        break;
      case 'file-text':
      default:
        path = 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm0 0l5 5M10 9H8M16 13H8M16 17H8';
        break;
      case 'hand-heart':
        path = 'M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16M18 15h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-3';
        break;
      case 'store':
        path = 'M2 7h20M2 7l2-4h16l2 4M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7M9 11v6M15 11v6';
        break;
      case 'users':
        path = 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75';
        break;
      case 'land-plot':
        path = 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5';
        break;
      case 'landmark':
        path = 'M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l10 5H2z';
        break;
      case 'leaf':
        path = 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12';
        break;
      case 'calendar':
        path = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z';
        break;
      case 'phone':
        path = 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';
        break;
      case 'mail':
        path = 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6';
        break;
      case 'map':
        path = 'M1 6v15l7-4 8 4 7-4V2l-7 4-8-4zM8 2v15M16 6v15';
        break;
      case 'map-pin':
        path = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z';
        break;
      case 'mountain':
        path = 'M8 3l4 8 5-5 5 15H2z';
        break;
      case 'clock':
        path = 'M12 6v6l4 2M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z';
        break;
      case 'check-circle':
        path = 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3';
        break;
      case 'award':
        path = 'M12 15l-3 6 4-2 4 2-3-6M8.21 13.89L7 23l5-3 5 3-1.21-9.11M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z';
        break;
      case 'image':
        path = 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 9H4l6-6 4 4 3-3 3 5z';
        break;
    }

    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: cls,
      },
      h('path', { d: path })
    );
  }

  // Wrapper komponen React Decap
  function buatKomponen(renderFn) {
    if (window.createClass) {
      return window.createClass({
        render: function () {
          return renderFn(this.props);
        },
      });
    }
    return function (props) {
      return renderFn(props);
    };
  }

  // ── 1. Pratinjau Destinasi Wisata (Mirror DestinationCard.astro) ────
  var DestinasiPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var nama = getVal(entry, ['data', 'nama'], 'Nama Destinasi');
    var kategori = getVal(entry, ['data', 'kategori'], 'Alam');
    var ringkasan = getVal(
      entry,
      ['data', 'ringkasan'],
      'Ringkasan singkat destinasi akan tampil di kartu ini.'
    );

    var rawGambar = getVal(entry, ['data', 'gambar'], '');
    var gambarSrc = '';
    if (rawGambar) {
      var asset = props.getAsset ? props.getAsset(rawGambar) : rawGambar;
      gambarSrc = asset && asset.toString ? asset.toString() : String(asset || '');
    }

    var alamat = getVal(entry, ['data', 'lokasi', 'alamat'], 'Kelurahan Walian');
    var lat = getVal(entry, ['data', 'lokasi', 'lat'], '');
    var lng = getVal(entry, ['data', 'lokasi', 'lng'], '');
    var unggulan = getVal(entry, ['data', 'unggulan'], false);
    var urutan = getVal(entry, ['data', 'urutan'], 100);
    var diperbarui = getVal(entry, ['data', 'diperbarui'], '');
    var bodyWidget = props.widgetFor ? props.widgetFor('body') : null;

    var mapsUrl =
      lat && lng
        ? 'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(lat + ',' + lng)
        : '#';

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Kartu Website'),
        h('span', { className: 'nc-badge-target' }, 'Halaman /wisata & Beranda')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        h(
          'article',
          { className: 'kartu-destinasi-preview' },
          h(
            'div',
            { className: 'kartu-destinasi-media' },
            gambarSrc
              ? h('img', {
                  src: gambarSrc,
                  alt: nama,
                  className: 'kartu-destinasi-img',
                })
              : h(
                  'div',
                  { className: 'kartu-destinasi-placeholder' },
                  h('span', { className: 'placeholder-ikon' }, '📷'),
                  h(
                    'span',
                    { className: 'placeholder-label' },
                    'Foto belum dipilih (website menampilkan gambar pengganti default)'
                  )
                )
          ),
          h(
            'div',
            { className: 'kartu-destinasi-body' },
            h(
              'div',
              { className: 'kartu-destinasi-meta-top' },
              h('span', { className: 'lencana-kategori' }, kategori),
              unggulan
                ? h('span', { className: 'lencana-unggulan' }, '⭐ Pilihan Beranda')
                : null
            ),
            h('h3', { className: 'judul-destinasi' }, nama),
            h('p', { className: 'ringkasan-destinasi' }, ringkasan),
            h(
              'div',
              { className: 'kartu-destinasi-aksi' },
              h(
                'a',
                {
                  href: mapsUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'tombol-lokasi-preview',
                },
                'Cek Lokasi',
                renderIconSvg('external-link', 'size-4')
              )
            )
          )
        )
      ),
      h(
        'div',
        { className: 'nc-info-box' },
        h('h4', { className: 'nc-info-title' }, 'Detail Titik Lokasi & Publikasi'),
        h(
          'div',
          { className: 'nc-info-grid' },
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Alamat'),
            h('span', { className: 'nc-info-val' }, alamat || '—')
          ),
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Titik Maps'),
            h(
              'span',
              { className: 'nc-info-val' },
              lat && lng ? lat + ', ' + lng : 'Belum diisi'
            )
          ),
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Urutan'),
            h('span', { className: 'nc-info-val' }, '#' + urutan)
          ),
          diperbarui
            ? h(
                'div',
                { className: 'nc-info-row' },
                h('span', { className: 'nc-info-label' }, 'Tanggal dicek'),
                h('span', { className: 'nc-info-val' }, String(diperbarui).slice(0, 10))
              )
            : null
        )
      ),
      bodyWidget
        ? h(
            'div',
            { className: 'nc-info-box' },
            h('h4', { className: 'nc-info-title' }, 'Cerita / Deskripsi Destinasi'),
            h('div', { className: 'nc-markdown-preview' }, bodyWidget)
          )
        : null
    );
  });

  // ── 2. Pratinjau Layanan Surat (Mirror ItemLayanan.astro) ───────────
  var LayananPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var judul = getVal(entry, ['data', 'judul'], 'Nama Layanan Surat');
    var ringkasan = getVal(
      entry,
      ['data', 'ringkasan'],
      'Ringkasan singkat layanan surat.'
    );
    var ikon = getVal(entry, ['data', 'ikon'], 'file-text');
    var unggulan = getVal(entry, ['data', 'unggulan'], false);
    var urutan = getVal(entry, ['data', 'urutan'], 100);
    var diperbarui = getVal(entry, ['data', 'diperbarui'], '');
    var persyaratan = getList(entry, 'persyaratan');
    var alur = getList(entry, 'alur');
    var bodyWidget = props.widgetFor ? props.widgetFor('body') : null;

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Kartu Website'),
        h('span', { className: 'nc-badge-target' }, 'Halaman /layanan')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        h(
          'div',
          { className: 'kartu-layanan-preview' },
          h(
            'div',
            { className: 'kartu-layanan-header' },
            h(
              'span',
              { className: 'lingkaran-ikon-layanan' },
              renderIconSvg(ikon)
            ),
            h(
              'div',
              { className: 'kartu-layanan-teks' },
              h(
                'div',
                { className: 'kartu-layanan-top-row' },
                h('h3', { className: 'judul-layanan' }, judul),
                unggulan
                  ? h('span', { className: 'lencana-unggulan' }, '⭐ Tampil di Beranda')
                  : null
              ),
              h('p', { className: 'ringkasan-layanan' }, ringkasan)
            )
          ),
          h(
            'div',
            { className: 'kartu-layanan-body' },
            h(
              'div',
              { className: 'grid-layanan-detail' },
              h(
                'div',
                { className: 'kolom-layanan' },
                h('h4', { className: 'label-seksi-layanan' }, 'PERSYARATAN'),
                persyaratan && persyaratan.length > 0
                  ? h(
                      'ul',
                      { className: 'daftar-syarat' },
                      persyaratan.map(function (item, i) {
                        var text =
                          typeof item === 'object'
                            ? item.syarat || JSON.stringify(item)
                            : String(item);
                        return h('li', { key: i }, text);
                      })
                    )
                  : h(
                      'p',
                      { className: 'teks-kosong' },
                      'Informasi persyaratan sedang disiapkan.'
                    )
              ),
              h(
                'div',
                { className: 'kolom-layanan' },
                h('h4', { className: 'label-seksi-layanan' }, 'ALUR PENGURUSAN'),
                alur && alur.length > 0
                  ? h(
                      'ol',
                      { className: 'daftar-alur' },
                      alur.map(function (item, i) {
                        var text =
                          typeof item === 'object'
                            ? item.langkah || JSON.stringify(item)
                            : String(item);
                        return h('li', { key: i }, text);
                      })
                    )
                  : h(
                      'p',
                      { className: 'teks-kosong' },
                      'Informasi alur pengurusan sedang disiapkan.'
                    )
              )
            ),
            bodyWidget
              ? h(
                  'div',
                  { className: 'catatan-layanan' },
                  h('h4', { className: 'label-seksi-layanan' }, 'CATATAN TAMBAHAN'),
                  h('div', { className: 'nc-markdown-preview' }, bodyWidget)
                )
              : null
          )
        )
      ),
      h(
        'div',
        { className: 'nc-info-box' },
        h(
          'div',
          { className: 'nc-info-grid' },
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Urutan tampilan'),
            h('span', { className: 'nc-info-val' }, '#' + urutan)
          ),
          diperbarui
            ? h(
                'div',
                { className: 'nc-info-row' },
                h('span', { className: 'nc-info-label' }, 'Terakhir dicek'),
                h('span', { className: 'nc-info-val' }, String(diperbarui).slice(0, 10))
              )
            : null
        )
      )
    );
  });

  // ── 3. Pratinjau Pengumuman ─────────────────────────────────────────
  var PengumumanPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var daftar = getList(entry, 'daftar');

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Pengumuman'),
        h('span', { className: 'nc-badge-target' }, 'Halaman /layanan')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        daftar && daftar.length > 0
          ? h(
              'div',
              { className: 'daftar-pengumuman-grid' },
              daftar.map(function (item, idx) {
                var p = typeof item === 'object' ? item : {};
                return h(
                  'article',
                  {
                    key: idx,
                    className:
                      'kartu-pengumuman-preview' +
                      (p.penting ? ' pengumuman-penting' : ''),
                  },
                  h(
                    'div',
                    { className: 'pengumuman-top' },
                    h(
                      'span',
                      { className: 'pengumuman-tgl' },
                      p.tanggal || 'Tanggal pengumuman'
                    ),
                    p.penting
                      ? h('span', { className: 'lencana-penting' }, 'PENTING')
                      : null
                  ),
                  h(
                    'h4',
                    { className: 'judul-pengumuman' },
                    p.judul || 'Judul pengumuman'
                  ),
                  h(
                    'p',
                    { className: 'ringkasan-pengumuman' },
                    p.isi || p.ringkasan || 'Isi pengumuman untuk warga.'
                  ),
                  p.tautan
                    ? h(
                        'a',
                        {
                          href: p.tautan,
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          className: 'tautan-pengumuman',
                        },
                        'Buka Tautan Info',
                        renderIconSvg('external-link', 'size-3')
                      )
                    : null
                );
              })
            )
          : h(
              'p',
              { className: 'teks-kosong' },
              'Belum ada pengumuman yang ditambahkan.'
            )
      )
    );
  });

  // ── 4. Pratinjau Identitas Situs & Kontak (situs.json) ─────────────
  var SitusPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var namaKelurahan = getVal(entry, ['data', 'namaKelurahan'], 'Kelurahan Walian');
    var kecamatan = getVal(entry, ['data', 'kecamatan'], 'Kecamatan Tomohon Selatan');
    var kota = getVal(entry, ['data', 'kota'], 'Kota Tomohon');
    var provinsi = getVal(entry, ['data', 'provinsi'], 'Sulawesi Utara');
    var alamat = getVal(entry, ['data', 'alamat'], 'Alamat Kantor Kelurahan');
    var lat = getVal(entry, ['data', 'koordinat', 'lat'], '');
    var lng = getVal(entry, ['data', 'koordinat', 'lng'], '');
    var mapsUrl = getVal(entry, ['data', 'googleMapsUrl'], '');
    var wa = getVal(entry, ['data', 'whatsapp'], '');
    var email = getVal(entry, ['data', 'email'], '');
    var jadwal = getList(entry, ['jamLayanan', 'jadwal']);
    var tanggalLibur = getList(entry, ['jamLayanan', 'tanggalLibur']);
    var tautanPenting = getList(entry, 'tautanPenting');
    var medsos = getVal(entry, ['data', 'mediaSosial'], {});
    if (medsos && typeof medsos.toJS === 'function') medsos = medsos.toJS();
    var kredit = getVal(entry, ['data', 'kredit'], {});
    if (kredit && typeof kredit.toJS === 'function') kredit = kredit.toJS();

    var cleanWa = String(wa).replace(/\D/g, '');
    var waUrl = cleanWa
      ? 'https://wa.me/' + (cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa)
      : '#';

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Pengaturan Situs'),
        h('span', { className: 'nc-badge-target' }, 'Footer & Seksi Kontak Website')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        h(
          'div',
          { className: 'kartu-situs-preview' },
          h(
            'div',
            { className: 'kartu-situs-header' },
            h('span', { className: 'lencana-wilayah' }, kecamatan + ' • ' + kota),
            h('h2', { className: 'judul-situs' }, namaKelurahan),
            h('p', { className: 'subjudul-situs' }, provinsi + ', Indonesia')
          ),
          h(
            'div',
            { className: 'kartu-situs-body' },
            h(
              'div',
              { className: 'situs-kontak-item' },
              h('span', { className: 'ikon-situs-wrap' }, renderIconSvg('map-pin')),
              h(
                'div',
                { className: 'situs-kontak-teks' },
                h('strong', null, 'Alamat Kantor Pelayanan:'),
                h('p', null, alamat || 'Belum diatur'),
                lat && lng
                  ? h('span', { className: 'teks-koordinat' }, 'Koordinat: ' + lat + ', ' + lng)
                  : null
              )
            ),
            h(
              'div',
              { className: 'situs-aksi-kontak' },
              wa
                ? h(
                    'a',
                    {
                      href: waUrl,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className: 'tombol-kontak-wa',
                    },
                    renderIconSvg('phone', 'size-4'),
                    'WhatsApp (' + wa + ')'
                  )
                : null,
              email
                ? h(
                    'a',
                    {
                      href: 'mailto:' + email,
                      className: 'tombol-kontak-email',
                    },
                    renderIconSvg('mail', 'size-4'),
                    email
                  )
                : null,
              mapsUrl
                ? h(
                    'a',
                    {
                      href: mapsUrl,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className: 'tombol-kontak-maps',
                    },
                    renderIconSvg('external-link', 'size-4'),
                    'Buka Google Maps'
                  )
                : null
            )
          )
        )
      ),
      h(
        'div',
        { className: 'nc-info-box' },
        h(
          'div',
          { className: 'nc-box-header-row' },
          h('span', { className: 'box-ikon' }, renderIconSvg('clock')),
          h('h4', { className: 'nc-info-title-inline' }, 'Jadwal Jam Pelayanan Kantor')
        ),
        jadwal && jadwal.length > 0
          ? h(
              'div',
              { className: 'jadwal-layanan-grid' },
              jadwal.map(function (j, idx) {
                var hari = getItemField(j, 'hari', 'Hari');
                var jam = getItemField(j, 'jam', '08.00 - 16.00');
                var tutup = Boolean(getItemField(j, 'tutup', false));
                return h(
                  'div',
                  { key: idx, className: 'jadwal-row' + (tutup ? ' jadwal-tutup' : '') },
                  h('span', { className: 'jadwal-hari' }, hari),
                  h('span', { className: 'jadwal-jam' }, tutup ? 'Tutup' : jam),
                  h(
                    'span',
                    { className: 'lencana-jadwal ' + (tutup ? 'lencana-libur' : 'lencana-buka') },
                    tutup ? 'Tutup' : 'Buka'
                  )
                );
              })
            )
          : h('p', { className: 'teks-kosong' }, 'Jadwal jam pelayanan belum diatur.'),
        tanggalLibur && tanggalLibur.length > 0
          ? h(
              'div',
              { className: 'seksi-libur-khusus' },
              h('span', { className: 'label-libur' }, 'Tanggal Libur Khusus:'),
              h(
                'div',
                { className: 'pills-libur' },
                tanggalLibur.map(function (tgl, i) {
                  return h('span', { key: i, className: 'pill-tgl' }, String(tgl));
                })
              )
            )
          : null
      ),
      tautanPenting && tautanPenting.length > 0
        ? h(
            'div',
            { className: 'nc-info-box' },
            h('h4', { className: 'nc-info-title' }, 'Tautan Penting & Portal Terkait'),
            h(
              'div',
              { className: 'tautan-penting-grid' },
              tautanPenting.map(function (tp, idx) {
                var judul = getItemField(tp, 'judul', 'Tautan');
                var url = getItemField(tp, 'url', '#');
                var deskripsi = getItemField(tp, 'deskripsi', '');
                return h(
                  'a',
                  {
                    key: idx,
                    href: url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'kartu-tautan-link',
                  },
                  h('span', { className: 'judul-tautan-link' }, judul),
                  deskripsi ? h('span', { className: 'deskripsi-tautan-link' }, deskripsi) : null,
                  renderIconSvg('external-link', 'size-3')
                );
              })
            )
          )
        : null,
      h(
        'div',
        { className: 'nc-info-box' },
        h('h4', { className: 'nc-info-title' }, 'Kredit & Kolaborasi Website'),
        h(
          'div',
          { className: 'nc-info-grid' },
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Program'),
            h('span', { className: 'nc-info-val' }, (kredit && kredit.kkt) || 'KKT Posko Walian')
          ),
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Universitas'),
            h('span', { className: 'nc-info-val' }, (kredit && kredit.universitas) || 'Universitas Sam Ratulangi')
          ),
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Tahun'),
            h('span', { className: 'nc-info-val' }, String((kredit && kredit.tahun) || '2026'))
          )
        )
      )
    );
  });

  // ── 5. Pratinjau Hero Beranda (beranda.json) ────────────────────────
  var BerandaPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var judul = getVal(
      entry,
      ['data', 'hero', 'judul'],
      'Selamat Datang di Kelurahan Walian'
    );
    var subjudul = getVal(
      entry,
      ['data', 'hero', 'subjudul'],
      'Pusat informasi resmi pemerintahan dan potensi Kelurahan Walian.'
    );
    var fotoList = getList(entry, ['hero', 'foto']);

    var fotoUtama = fotoList.length > 0 ? fotoList[0] : null;
    var rawBg = fotoUtama ? getItemField(fotoUtama, 'gambar', '') : '';
    var bgSrc = resolveAsset(props, rawBg);

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Hero Beranda'),
        h('span', { className: 'nc-badge-target' }, 'Tampilan Atas Beranda /')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        h(
          'div',
          {
            className: 'hero-preview-box',
            style: bgSrc
              ? {
                  backgroundImage: 'url(' + bgSrc + ')',
                }
              : {},
          },
          h('div', { className: 'hero-preview-overlay' }),
          h(
            'div',
            { className: 'hero-preview-content' },
            h(
              'div',
              { className: 'hero-pill-badge' },
              renderIconSvg('mountain', 'size-3'),
              h('span', null, 'Kelurahan Walian • Tomohon Selatan')
            ),
            h('h1', { className: 'hero-preview-judul' }, judul),
            h('p', { className: 'hero-preview-subjudul' }, subjudul),
            h(
              'div',
              { className: 'hero-preview-cta' },
              h('span', { className: 'hero-btn-primary' }, 'Jelajahi Layanan'),
              h('span', { className: 'hero-btn-outline' }, 'Destinasi Wisata')
            )
          ),
          h(
            'div',
            { className: 'hero-preview-footer-strip' },
            h(
              'span',
              { className: 'hero-indicator-badge' },
              fotoList.length +
                ' Foto Terdaftar' +
                (fotoList.length >= 2 ? ' (Slideshow Aktif)' : ' (Foto Tunggal)')
            )
          )
        )
      ),
      h(
        'div',
        { className: 'nc-info-box' },
        h(
          'div',
          { className: 'nc-box-header-row' },
          h('span', { className: 'box-ikon' }, renderIconSvg('image')),
          h(
            'h4',
            { className: 'nc-info-title-inline' },
            'Koleksi Foto Latar Hero Slideshow (' + fotoList.length + ')'
          )
        ),
        h(
          'p',
          { className: 'hero-slideshow-info-note' },
          'Website beranda memutar foto latar otomatis bila terdaftar minimal 2 foto. Foto pertama tampil pertama kali saat halaman dimuat.'
        ),
        fotoList && fotoList.length > 0
          ? h(
              'div',
              { className: 'hero-foto-grid' },
              fotoList.map(function (item, idx) {
                var gbr = getItemField(item, 'gambar', '');
                var ket = getItemField(item, 'keterangan', 'Foto hero ' + (idx + 1));
                var pos = getItemField(item, 'posisi', 'center');
                var imgSrc = resolveAsset(props, gbr);
                var isFirst = idx === 0;
                return h(
                  'div',
                  {
                    key: idx,
                    className: 'hero-foto-card' + (isFirst ? ' foto-card-utama' : ''),
                  },
                  h(
                    'div',
                    { className: 'hero-foto-thumb-wrap' },
                    imgSrc
                      ? h('img', {
                          src: imgSrc,
                          alt: ket,
                          className: 'hero-foto-thumb',
                        })
                      : h(
                          'div',
                          { className: 'hero-foto-empty' },
                          renderIconSvg('image', 'size-5'),
                          h('span', null, 'Belum ada gambar')
                        ),
                    h(
                      'span',
                      { className: 'hero-foto-pos-badge' },
                      isFirst ? 'Slide Utama' : 'Slide ' + (idx + 1)
                    )
                  ),
                  h(
                    'div',
                    { className: 'hero-foto-caption' },
                    h('strong', null, ket),
                    h('span', { className: 'hero-foto-pos' }, 'Posisi fokus: ' + pos)
                  )
                );
              })
            )
          : h('p', { className: 'teks-kosong' }, 'Belum ada foto yang ditambahkan.')
      )
    );
  });

  // ── Helper Bagan & Wilayah untuk Pratinjau Profil ──────────────────
  function extractListStrings(val) {
    if (!val) return [];
    if (typeof val === 'string') return [val.trim()].filter(Boolean);
    if (typeof val.toJS === 'function') val = val.toJS();
    if (Array.isArray(val)) {
      var out = [];
      for (var i = 0; i < val.length; i++) {
        var item = val[i];
        if (typeof item === 'string') {
          if (item.trim()) out.push(item.trim());
        } else if (item && typeof item === 'object') {
          var str = item.nama || item.value || '';
          if (!str && typeof item.toJS === 'function') {
            var js = item.toJS();
            str = js.nama || js.value || '';
          }
          if (str && String(str).trim()) {
            out.push(String(str).trim());
          } else {
            var vals = Object.values(item);
            if (vals.length > 0 && typeof vals[0] === 'string' && vals[0].trim()) {
              out.push(vals[0].trim());
            }
          }
        }
      }
      return out;
    }
    return [];
  }

  function susunBaganJs(lurahNama, strukturDaftar) {
    var namaAkar = [];
    if (lurahNama && lurahNama !== '—') {
      namaAkar = [lurahNama];
    }
    var akar = {
      jabatan: 'Lurah',
      nama: namaAkar,
      samping: [],
      bawahan: []
    };

    var simpulMap = {};
    simpulMap['Lurah'] = akar;

    if (!strukturDaftar || strukturDaftar.length === 0) {
      return akar;
    }

    var list = [];
    for (var i = 0; i < strukturDaftar.length; i++) {
      var st = strukturDaftar[i];
      var rawObj = typeof st.toJS === 'function' ? st.toJS() : st;

      var jabatan = getItemField(rawObj, 'jabatan', 'Aparatur ' + (i + 1));
      var rawNama = getItemField(rawObj, 'nama', []);
      var namaArr = extractListStrings(rawNama);
      var atasan = getItemField(rawObj, 'atasan', '');
      var garisSamping = Boolean(getItemField(rawObj, 'garisSamping', false));

      var simpul = {
        jabatan: jabatan,
        nama: namaArr,
        samping: [],
        bawahan: []
      };

      simpulMap[jabatan] = simpul;
      list.push({ simpul: simpul, atasan: atasan, garisSamping: garisSamping });
    }

    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      var atasanSimpul = item.atasan && simpulMap[item.atasan] ? simpulMap[item.atasan] : null;

      if (atasanSimpul) {
        if (item.garisSamping) {
          atasanSimpul.samping.push(item.simpul);
        } else {
          atasanSimpul.bawahan.push(item.simpul);
        }
      } else {
        if (item.garisSamping) {
          akar.samping.push(item.simpul);
        } else {
          akar.bawahan.push(item.simpul);
        }
      }
    }

    return akar;
  }

  function renderSimpulBagan(simpul, puncak, samping) {
    var isPuncak = Boolean(puncak);
    var isSamping = Boolean(samping);

    var cardClass = isPuncak
      ? 'bagan-card bagan-card-puncak'
      : 'bagan-card bagan-card-anggota';

    var jabatanClass = isPuncak ? 'bagan-jabatan-puncak' : 'bagan-jabatan-anggota';
    var namaClass = isPuncak ? 'bagan-nama-puncak' : 'bagan-nama-anggota';
    var kosongClass = isPuncak ? 'bagan-nama-puncak-kosong' : 'bagan-nama-kosong';

    var namaElements = [];
    if (simpul.nama && simpul.nama.length > 0) {
      for (var n = 0; n < simpul.nama.length; n++) {
        namaElements.push(h('p', { key: n, className: namaClass }, simpul.nama[n]));
      }
    } else {
      namaElements.push(
        h(
          'p',
          { key: 'empty', className: kosongClass },
          isPuncak ? '[Belum ditentukan]' : '[Kosong]'
        )
      );
    }

    var cardNode = h(
      'div',
      { className: cardClass },
      h('span', { className: jabatanClass }, simpul.jabatan),
      h('div', { className: 'bagan-nama-wrap' }, namaElements)
    );

    var childrenNodes = [];

    if (simpul.samping && simpul.samping.length > 0) {
      var sampingItems = simpul.samping.map(function (s, sIdx) {
        return h(
          'li',
          { key: 's-' + sIdx, className: 'bagan-samping-item' },
          renderSimpulBagan(s, false, true)
        );
      });
      childrenNodes.push(
        h('ul', { key: 'samping-list', className: 'bagan-samping' }, sampingItems)
      );
    }

    if (simpul.bawahan && simpul.bawahan.length > 0) {
      var bawahanItems = simpul.bawahan.map(function (b, bIdx) {
        return h(
          'li',
          { key: 'b-' + bIdx },
          renderSimpulBagan(b, false, false)
        );
      });
      childrenNodes.push(
        h('ul', { key: 'bawahan-list', className: 'bagan-cabang' }, bawahanItems)
      );
    }

    if (isSamping) {
      return h(
        'div',
        { className: 'bagan-samping-garis' },
        cardNode,
        childrenNodes.length > 0 ? childrenNodes : null
      );
    }

    return h(
      'div',
      { className: 'bagan-simpul-container' },
      cardNode,
      childrenNodes.length > 0 ? childrenNodes : null
    );
  }

  function hitungTotalWilayah(daftarLingkungan) {
    var total = {
      lingkungan: daftarLingkungan ? daftarLingkungan.length : 0,
      kepalaKeluarga: null,
      jumlahPenduduk: null,
      luasKm2: null
    };

    if (!daftarLingkungan || daftarLingkungan.length === 0) return total;

    for (var i = 0; i < daftarLingkungan.length; i++) {
      var item = daftarLingkungan[i];
      var raw = typeof item.toJS === 'function' ? item.toJS() : item;

      var kk = getItemField(raw, 'kepalaKeluarga', null);
      if (kk !== null && kk !== undefined && kk !== '' && !isNaN(Number(kk))) {
        total.kepalaKeluarga = (total.kepalaKeluarga || 0) + Number(kk);
      }

      var jp = getItemField(raw, 'jumlahPenduduk', null);
      if (jp !== null && jp !== undefined && jp !== '' && !isNaN(Number(jp))) {
        total.jumlahPenduduk = (total.jumlahPenduduk || 0) + Number(jp);
      }

      var luas = getItemField(raw, 'luasKm2', null);
      if (luas !== null && luas !== undefined && luas !== '' && !isNaN(Number(luas))) {
        total.luasKm2 = (total.luasKm2 || 0) + Number(luas);
      }
    }

    return total;
  }

  function formatAngkaId(nilai) {
    if (nilai === null || nilai === undefined || nilai === '') return null;
    var num = Number(nilai);
    if (isNaN(num)) return String(nilai);
    return num.toLocaleString('id-ID');
  }

  function renderStatCard(ikon, label, angka, satuan) {
    return h(
      'div',
      { className: 'profil-stat-card' },
      h(
        'span',
        { className: 'profil-stat-ikon-wrap' },
        renderIconSvg(ikon, 'size-5')
      ),
      angka !== null && angka !== undefined
        ? h(
            'p',
            { className: 'profil-stat-angka' },
            angka,
            satuan ? h('span', { className: 'profil-stat-satuan' }, ' ' + satuan) : null
          )
        : h('p', { className: 'profil-stat-kosong' }, 'Data menyusul'),
      h('p', { className: 'profil-stat-label' }, label)
    );
  }

  // ── 6. Pratinjau Profil Kelurahan (profil.json) ─────────────────────
  var ProfilPreview = buatKomponen(function (props) {
    var entry = props.entry;
    var ringkasan = getVal(
      entry,
      ['data', 'ringkasan'],
      'Ringkasan profil wilayah Kelurahan Walian.'
    );
    var lurahNama = getVal(entry, ['data', 'lurah', 'nama'], '—');
    var rawLurahFoto = getVal(entry, ['data', 'lurah', 'foto'], '');
    var lurahFotoSrc = resolveAsset(props, rawLurahFoto);

    var visi = getVal(entry, ['data', 'visi'], 'Visi Kelurahan Walian');
    var misi = getList(entry, 'misi');
    var programUnggulan = getList(entry, 'programUnggulan');
    var sumberVisiMisi = getVal(entry, ['data', 'sumberVisiMisi'], '');

    var lingkungan = getList(entry, 'lingkungan');
    var struktur = getList(entry, 'strukturOrganisasi');
    var sumberTahun = getVal(entry, ['data', 'sumberData', 'tahun'], '2026');
    var sumberInstansi = getVal(
      entry,
      ['data', 'sumberData', 'sumber'],
      'Kantor Kelurahan Walian'
    );
    var diperbarui = getVal(entry, ['data', 'diperbarui'], '');

    var baganTree = susunBaganJs(lurahNama, struktur);
    var totalWilayah = hitungTotalWilayah(lingkungan);

    return h(
      'div',
      { className: 'nc-preview-root' },
      h(
        'div',
        { className: 'nc-preview-banner' },
        h('span', { className: 'nc-badge-mode' }, 'Pratinjau Halaman Profil'),
        h('span', { className: 'nc-badge-target' }, 'Halaman /profil')
      ),
      h(
        'div',
        { className: 'nc-preview-card-wrap' },
        h(
          'div',
          { className: 'profil-intro-preview' },
          h(
            'div',
            { className: 'profil-lurah-col' },
            h(
              'div',
              { className: 'profil-lurah-avatar-wrap' },
              lurahFotoSrc
                ? h('img', {
                    src: lurahFotoSrc,
                    alt: lurahNama,
                    className: 'profil-lurah-avatar-img',
                  })
                : h(
                    'div',
                    { className: 'profil-lurah-avatar-placeholder' },
                    renderIconSvg('users', 'size-8')
                  )
            ),
            h('h3', { className: 'profil-lurah-nama' }, lurahNama),
            h('span', { className: 'profil-lurah-jabatan' }, 'Kepala Kelurahan Walian')
          ),
          h(
            'div',
            { className: 'profil-intro-body' },
            h('span', { className: 'lencana-seksi-profil' }, 'SEKILAS WILAYAH'),
            h('h2', { className: 'judul-profil-intro' }, 'Profil Pemerintahan & Potensi'),
            h('p', { className: 'paragraf-ringkasan-profil' }, ringkasan)
          )
        )
      ),

      // ── Seksi Struktur Organisasi (Tree Bagan) ──
      h(
        'div',
        { className: 'profil-seksi-bagan' },
        h(
          'div',
          { className: 'profil-heading-wrap' },
          h('span', { className: 'profil-overline' }, 'STRUKTUR ORGANISASI'),
          h('h3', { className: 'profil-title' }, 'Struktur organisasi Kelurahan Walian')
        ),
        h(
          'div',
          { className: 'bagan-bingkai-preview' },
          h(
            'ul',
            { className: 'bagan' },
            h('li', null, renderSimpulBagan(baganTree, true, false))
          )
        )
      ),

      // ── Seksi Wilayah & Penduduk ──
      h(
        'div',
        { className: 'profil-seksi-wilayah' },
        h(
          'div',
          { className: 'profil-heading-wrap' },
          h('span', { className: 'profil-overline' }, 'WILAYAH'),
          h('h3', { className: 'profil-title' }, 'Wilayah dan penduduk'),
          h('h4', { className: 'profil-subjudul' }, 'Ringkasan kelurahan')
        ),
        h(
          'div',
          { className: 'profil-stat-grid' },
          renderStatCard('map', 'Lingkungan', String(totalWilayah.lingkungan), null),
          renderStatCard(
            'house',
            'Kepala keluarga',
            formatAngkaId(totalWilayah.kepalaKeluarga),
            null
          ),
          renderStatCard(
            'users',
            'Jumlah penduduk',
            formatAngkaId(totalWilayah.jumlahPenduduk),
            'jiwa'
          ),
          renderStatCard(
            'land-plot',
            'Luas wilayah',
            formatAngkaId(totalWilayah.luasKm2),
            'km²'
          )
        ),
        h(
          'p',
          { className: 'profil-sumber-caption' },
          'Sumber data: ' +
            sumberInstansi +
            ', ' +
            sumberTahun +
            '. Total dijumlahkan dari data lingkungan yang sudah diisi.'
        ),
        h('h4', { className: 'profil-subjudul' }, 'Data lingkungan'),
        h(
          'div',
          { className: 'profil-tabel-card' },
          h(
            'table',
            { className: 'profil-tabel-lingkungan' },
            h(
              'thead',
              null,
              h(
                'tr',
                null,
                h('th', { scope: 'col', className: 'text-left' }, 'Lingkungan'),
                h('th', { scope: 'col', className: 'text-left' }, 'Kepala lingkungan'),
                h('th', { scope: 'col', className: 'text-left' }, 'Wakil'),
                h('th', { scope: 'col', className: 'text-right' }, 'Jumlah KK'),
                h('th', { scope: 'col', className: 'text-right' }, 'Penduduk'),
                h('th', { scope: 'col', className: 'text-right' }, 'Luas (km²)')
              )
            ),
            h(
              'tbody',
              null,
              lingkungan && lingkungan.length > 0
                ? lingkungan.map(function (ling, idx) {
                    var raw = typeof ling.toJS === 'function' ? ling.toJS() : ling;
                    var nama = getItemField(raw, 'nama', 'Lingkungan ' + (idx + 1));
                    var kepala = getItemField(raw, 'kepala', null);
                    var wakil = getItemField(raw, 'wakil', null);
                    var kk = getItemField(raw, 'kepalaKeluarga', null);
                    var jp = getItemField(raw, 'jumlahPenduduk', null);
                    var luas = getItemField(raw, 'luasKm2', null);

                    return h(
                      'tr',
                      { key: idx, className: idx % 2 === 1 ? 'row-selang' : '' },
                      h('th', { scope: 'row', className: 'font-semibold text-left' }, nama),
                      h('td', { className: 'text-left' }, kepala || '–'),
                      h('td', { className: 'text-left' }, wakil || '–'),
                      h('td', { className: 'text-right' }, formatAngkaId(kk) || '–'),
                      h('td', { className: 'text-right' }, formatAngkaId(jp) || '–'),
                      h('td', { className: 'text-right' }, formatAngkaId(luas) || '–')
                    );
                  })
                : h(
                    'tr',
                    null,
                    h(
                      'td',
                      { colSpan: 6, className: 'text-center teks-kosong' },
                      'Belum ada data lingkungan.'
                    )
                  )
            ),
            h(
              'tfoot',
              null,
              h(
                'tr',
                null,
                h('th', { scope: 'row', colSpan: 3, className: 'text-left' }, 'Total kelurahan'),
                h(
                  'td',
                  { className: 'text-right' },
                  formatAngkaId(totalWilayah.kepalaKeluarga) || '–'
                ),
                h(
                  'td',
                  { className: 'text-right' },
                  formatAngkaId(totalWilayah.jumlahPenduduk) || '–'
                ),
                h(
                  'td',
                  { className: 'text-right' },
                  formatAngkaId(totalWilayah.luasKm2) || '–'
                )
              )
            )
          )
        )
      ),

      // ── Seksi Visi & Misi ──
      h(
        'div',
        { className: 'nc-info-box' },
        h(
          'div',
          { className: 'profil-heading-wrap' },
          h('span', { className: 'profil-overline' }, 'VISI & MISI'),
          h('h3', { className: 'profil-title' }, 'Arah pembangunan Walian')
        ),
        h(
          'div',
          { className: 'profil-visi-box' },
          h('span', { className: 'lencana-visi' }, 'VISI DAERAH'),
          h('p', { className: 'teks-visi' }, '“' + visi + '”'),
          sumberVisiMisi
            ? h('span', { className: 'sumber-visi-misi' }, 'Sumber: ' + sumberVisiMisi)
            : null
        ),
        h('h4', { className: 'nc-info-title' }, 'MISI PEMBANGUNAN'),
        misi && misi.length > 0
          ? h(
              'ol',
              { className: 'profil-misi-list' },
              misi.map(function (item, idx) {
                var text =
                  typeof item === 'object'
                    ? getItemField(item, 'misi', JSON.stringify(item))
                    : String(item);
                return h('li', { key: idx }, text);
              })
            )
          : h('p', { className: 'teks-kosong' }, 'Misi belum diisi.'),
        programUnggulan && programUnggulan.length > 0
          ? h(
              'div',
              { className: 'seksi-program-unggulan' },
              h('h4', { className: 'nc-info-title' }, 'PROGRAM UNGGULAN'),
              h(
                'div',
                { className: 'program-unggulan-grid' },
                programUnggulan.map(function (prog, idx) {
                  var text =
                    typeof prog === 'object'
                      ? getItemField(prog, 'program', JSON.stringify(prog))
                      : String(prog);
                  return h(
                    'div',
                    { key: idx, className: 'item-program-unggulan' },
                    renderIconSvg('leaf', 'size-4'),
                    h('span', null, text)
                  );
                })
              )
            )
          : null
      ),

      // ── Footer Info ──
      h(
        'div',
        { className: 'nc-info-box' },
        h(
          'div',
          { className: 'nc-info-grid' },
          h(
            'div',
            { className: 'nc-info-row' },
            h('span', { className: 'nc-info-label' }, 'Sumber Data'),
            h(
              'span',
              { className: 'nc-info-val' },
              sumberInstansi + ' (' + sumberTahun + ')'
            )
          ),
          diperbarui
            ? h(
                'div',
                { className: 'nc-info-row' },
                h('span', { className: 'nc-info-label' }, 'Terakhir Dicek'),
                h('span', { className: 'nc-info-val' }, String(diperbarui).slice(0, 10))
              )
            : null
        )
      )
    );
  });

  // ── 7. Dispatcher Pratinjau Pengaturan (Koleksi File Pengaturan) ────
  var PengaturanDispatcher = buatKomponen(function (props) {
    var slug = '';
    if (props.entry && typeof props.entry.get === 'function') {
      slug = props.entry.get('slug') || '';
    } else if (props.entry && props.entry.slug) {
      slug = props.entry.slug;
    }

    if (slug === 'situs') return h(SitusPreview, props);
    if (slug === 'beranda') return h(BerandaPreview, props);
    if (slug === 'profil') return h(ProfilPreview, props);

    // Fallback deteksi data jika slug tidak terbaca langsung
    var hasLurah = getVal(props.entry, ['data', 'lurah']);
    if (hasLurah !== undefined) return h(ProfilPreview, props);
    var hasHero = getVal(props.entry, ['data', 'hero']);
    if (hasHero !== undefined) return h(BerandaPreview, props);
    var hasNamaKelurahan = getVal(props.entry, ['data', 'namaKelurahan']);
    if (hasNamaKelurahan !== undefined) return h(SitusPreview, props);

    return h(
      'div',
      { className: 'nc-preview-root' },
      h('div', { className: 'nc-preview-banner' }, 'Pratinjau Pengaturan'),
      h('p', { className: 'teks-kosong' }, 'Pilih berkas pengaturan untuk melihat pratinjau.')
    );
  });

  // Fungsi registrasi yang dipanggil oleh auth-client.js saat Decap siap
  window.daftarkanPreview = function () {
    if (!window.CMS) return;

    try {
      if (typeof window.CMS.registerPreviewStyle === 'function') {
        window.CMS.registerPreviewStyle(
          'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
        );
        window.CMS.registerPreviewStyle('./preview.css?v=20261008_02');
      }

      if (typeof window.CMS.registerPreviewTemplate === 'function') {
        window.CMS.registerPreviewTemplate('destinasi', DestinasiPreview);
        window.CMS.registerPreviewTemplate('layanan', LayananPreview);
        window.CMS.registerPreviewTemplate('pengumuman', PengumumanPreview);
        window.CMS.registerPreviewTemplate('situs', SitusPreview);
        window.CMS.registerPreviewTemplate('beranda', BerandaPreview);
        window.CMS.registerPreviewTemplate('profil', ProfilPreview);
        window.CMS.registerPreviewTemplate('pengaturan', PengaturanDispatcher);
      }
    } catch (e) {
      /* Cegah error ganda bila register terpanggil berkali-kali */
    }
  };
})();
