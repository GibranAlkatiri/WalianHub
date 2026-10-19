import { beforeAll, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/_middleware.js';
import { parsePengaturanTemplates, renderPengaturan } from '../server/pengaturan-template.js';
import { publishedPengaturan } from '../server/published-pengaturan.js';

const root = new URL('../', import.meta.url);
let templateHtml;
const publishedRows = ['situs', 'beranda', 'profil'].map((slug) => {
  const data = JSON.parse(readFileSync(new URL(`src/content/pengaturan/${slug}.json`, root), 'utf8'));
  if (slug === 'situs') data.namaKelurahan = 'Kelurahan Uji Runtime';
  return { slug, data_json: JSON.stringify(data) };
});

// Use a fresh Astro artifact: source validation alone did not catch the 503.
beforeAll(async () => {
  const build = Bun.spawn([process.execPath, 'run', 'build'], {
    cwd: fileURLToPath(root), stdout: 'pipe', stderr: 'pipe',
  });
  const [code, stdout, stderr] = await Promise.all([
    build.exited, new Response(build.stdout).text(), new Response(build.stderr).text(),
  ]);
  if (code !== 0) throw new Error(`Build gagal:\n${stdout}\n${stderr}`);
  templateHtml = readFileSync(new URL('dist/cms-templates/pengaturan/index.html', root), 'utf8');
}, 60000);

function environment(template = () => templateHtml, rows = publishedRows) {
  return {
    CMS_PENGATURAN_D1: '1', CMS_PUBLIC_PENGATURAN_D1: '1',
    CMS_DB: {
      prepare(sql) {
        if (sql !== "SELECT slug,data_json FROM cms_published_content WHERE collection = 'pengaturan'") throw new Error('Kueri tidak dikenali.');
        return { all: async () => ({ results: rows }) };
      },
    },
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/cms-templates/pengaturan') return new Response(null, { status: 308, headers: { location: '/cms-templates/pengaturan/' } });
        if (path === '/cms-templates/pengaturan/') return new Response(template(), { headers: { 'content-type': 'text/html' } });
        if (!['/', '/profil', '/layanan', '/wisata'].includes(path)) throw new Error('Aset tidak dikenali: ' + path);
        const file = path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
        return new Response(readFileSync(new URL(`dist/${file}`, root)), { headers: { 'content-type': 'text/html' } });
      },
    },
  };
}

test('hero tanpa statistik; angka dan demografi yang belum tersedia tidak ditampilkan', async () => {
  expect(templateHtml).toContain('id="cms-stat-environment"');
  expect(templateHtml).toContain('id="cms-stat-area"');
  expect(templateHtml).not.toContain('id="cms-stat-family"');
  expect(templateHtml).toContain('id="cms-stat-population"');
  expect(templateHtml).toContain('id="cms-summary"');
  expect(templateHtml).toContain('id="cms-demography"');
  expect(templateHtml).toContain('id="cms-video"');
  const parts = renderPengaturan(await publishedPengaturan(environment()), parsePengaturanTemplates(templateHtml));
  for (const part of ['hero', 'summary', 'demography', 'intro', 'contact', 'footer', 'complaint', 'heading', 'video', 'structure', 'region', 'vision']) {
    expect(parts[part]).toBeString();
    expect(parts[part]).not.toContain('__CMS_');
  }
  expect(parts.hero).toContain('Lihat Layanan');
  expect(parts.hero).toContain('Hubungi Kantor');
  expect(parts.hero).not.toContain('ringkasan-kelurahan');
  expect(parts.hero).not.toContain('demografi-agama');
  expect(parts.summary).toContain('Lingkungan');
  expect(parts.summary).not.toContain('Data menyusul');
  expect(parts.summary).not.toContain('Luas wilayah');
  expect(parts.region).toContain(parts.summary);
  expect(parts.heading).not.toContain('id="ringkasan-kelurahan"');
  expect(parts.demography).toBe('');
  expect(parts.video).toBe('');
  expect(parts.heading).not.toContain('id="video-profil"');
  expect(parts.heading).not.toContain('href="#video-profil"');
  expect(parts.heading).not.toContain('Video menyusul');
});

test('statistik dan demografi terisi hanya tampil di Profil; total parsial tidak menjadi total kelurahan', async () => {
  const settings = await publishedPengaturan(environment());
  settings.beranda.jumlahPenduduk = 2500;
  settings.beranda.demografiAgama = { kristen: 1500, katolik: 1000, islam: 0, hindu: 0, buddha: 0, konghucu: 0 };
  settings.profil.sumberData = { sumber: 'Kelurahan <resmi>', tahun: '2026' };
  settings.profil.lingkungan = settings.profil.lingkungan.map((item, index) => ({ ...item, jumlahPenduduk: index ? null : 100, luasKm2: index ? null : 1 }));
  const parts = renderPengaturan(settings, parsePengaturanTemplates(templateHtml));
  expect(parts.summary).toContain('2.500');
  expect(parts.summary).not.toContain('Luas wilayah');
  expect(parts.demography).toContain('60%');
  expect(parts.demography).toContain('40%');
  expect(parts.demography).toContain('Kelurahan &lt;resmi&gt;');
  const rows = Object.entries(settings).map(([slug, data]) => ({ slug, data_json: JSON.stringify(data) }));
  for (const path of ['/', '/profil']) {
    const response = await onRequest({ request: new Request('https://cms.example' + path), env: environment(undefined, rows) });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.includes('id="demografi-agama"')).toBe(path === '/profil');
    expect(html.includes('id="ringkasan-kelurahan"')).toBe(path === '/profil');
    if (path === '/') { expect(html).not.toContain('2.500'); expect(html).not.toContain('demografi-card'); }
    else {
      expect(html).toContain('2.500'); expect(html).toContain('Lingkungan');
      expect(html.match(/id="ringkasan-kelurahan"/g)).toHaveLength(1);
      expect(html.indexOf('id="ringkasan-kelurahan"')).toBeGreaterThan(html.indexOf('id="wilayah"'));
      expect(html.indexOf('id="ringkasan-kelurahan"')).toBeLessThan(html.indexOf('Data lingkungan'));
    }
  }
});

test('video Profil mengikuti isi CMS: kosong atau invalid hilang, tautan YouTube masuk ke pengantar', async () => {
  const settings = await publishedPengaturan(environment());
  for (const url of ['', 'https://example.com/watch?v=abcdefghijk', 'https://youtu.be.example.com/abcdefghijk', 'https://www.youtube.com/watch?v=x', 'https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'https://www.youtube.com/shorts/abcdefghijk', 'https://www.youtube.com/embed/abcdefghijk']) {
    const valid = url.includes('abcdefghijk') && !url.includes('example.com');
    settings.profil.videoProfil = { url, judul: 'Potensi <Walian>', deskripsi: '' };
    const rows = Object.entries(settings).map(([slug, data]) => ({ slug, data_json: JSON.stringify(data) }));
    const response = await onRequest({ request: new Request('https://cms.example/profil'), env: environment(undefined, rows) });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.includes('id="video-profil"')).toBe(valid);
    expect(html).not.toContain('Video menyusul');
    expect(html).not.toContain('href="#video-profil"');
    if (valid) {
      expect(html).toContain('data-has-video="true"');
      expect(html).toContain('https://www.youtube.com/embed/abcdefghijk');
      expect(html).toContain('Potensi &lt;Walian&gt;');
      expect(html).not.toContain('<p class="mt-2 text-sm text-ink-muted"></p>');
      expect(html.indexOf('id="video-profil"')).toBeLessThan(html.indexOf('id="ringkasan-kelurahan"'));
    }
  }
});

test('data seluruh lingkungan yang lengkap menghasilkan total penduduk dan luas di ringkasan', async () => {
  const settings = await publishedPengaturan(environment());
  settings.beranda.jumlahPenduduk = null;
  const sample = settings.profil.lingkungan[0];
  settings.profil.lingkungan = [{ ...sample, jumlahPenduduk: 100, luasKm2: 1 }, { ...sample, nama: 'Lingkungan II', jumlahPenduduk: 200, luasKm2: 2 }];
  const parts = renderPengaturan(settings, parsePengaturanTemplates(templateHtml));
  expect(parts.summary).toContain('300');
  expect(parts.summary).toContain('Penduduk');
  expect(parts.summary).toContain('Luas wilayah');
  expect(parts.summary).toContain('km²');
});

test('semua statistik kosong menghilangkan ringkasan runtime tanpa memulihkan data awal', async () => {
  const settings = await publishedPengaturan(environment());
  settings.beranda.jumlahPenduduk = null;
  settings.profil.lingkungan = [];
  const parts = renderPengaturan(settings, parsePengaturanTemplates(templateHtml));
  expect(parts.summary).toBe('');
  const rows = Object.entries(settings).map(([slug, data]) => ({ slug, data_json: JSON.stringify(data) }));
  const response = await onRequest({ request: new Request('https://cms.example/profil'), env: environment(undefined, rows) });
  expect(response.status).toBe(200);
  expect(await response.text()).not.toContain('id="ringkasan-kelurahan"');
});

test('empat halaman publik memakai Pengaturan D1 dan template hasil build tanpa 503', async () => {
  for (const path of ['/', '/profil', '/layanan', '/wisata']) {
    const response = await onRequest({
      request: new Request('https://cms.example' + path), env: environment(),
      next() { throw new Error('Pembacaan D1 tidak boleh dilewati.'); },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-walian-pengaturan')).toBe('d1');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).toContain('Kelurahan Uji Runtime');
  }
});

test('template yang diperlukan hilang tetap menghasilkan 503 tanpa memulihkan konten statis', async () => {
  const missingArea = () => templateHtml.replace(/<template id="cms-stat-area">[\s\S]*?<\/template>/, '');
  const response = await onRequest({ request: new Request('https://cms.example/'), env: environment(missingArea) });
  expect(response.status).toBe(503);
  expect(await response.text()).toContain('Informasi website belum dapat dimuat.');
});
