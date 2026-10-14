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

function environment(template = () => templateHtml) {
  return {
    CMS_PENGATURAN_D1: '1', CMS_PUBLIC_PENGATURAN_D1: '1',
    CMS_DB: {
      prepare(sql) {
        if (sql !== "SELECT slug,data_json FROM cms_published_content WHERE collection = 'pengaturan'") throw new Error('Kueri tidak dikenali.');
        return { all: async () => ({ results: publishedRows }) };
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

test('template Pengaturan hasil build dapat dirender dengan dua statistik ringkasan dan demografi', async () => {
  expect(templateHtml).toContain('id="cms-stat-environment"');
  expect(templateHtml).toContain('id="cms-stat-area"');
  expect(templateHtml).not.toContain('id="cms-stat-family"');
  expect(templateHtml).not.toContain('id="cms-stat-population"');
  expect(templateHtml).toContain('__CMS_DEMOGRAFI__');
  expect(templateHtml).toContain('id="cms-video"');
  const parts = renderPengaturan(await publishedPengaturan(environment()), parsePengaturanTemplates(templateHtml));
  for (const part of ['hero', 'intro', 'contact', 'footer', 'complaint', 'heading', 'video', 'structure', 'region', 'vision']) {
    expect(parts[part]).toBeString();
    expect(parts[part]).not.toContain('__CMS_');
  }
  expect(parts.hero).toContain('demografi-card');
  expect(parts.video).toContain('video-profil');
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
