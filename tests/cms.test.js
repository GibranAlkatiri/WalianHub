import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { createCmsHandler, parseContent, serializeContent } from '../functions/api/cms.js';
import { fakeGithub } from './helpers/cms-github.js';

const CONFIG = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
const PATH = 'src/content/layanan/contoh.md';
const DATA = { judul: 'Contoh', ringkasan: 'Layanan contoh', ikon: 'house', unggulan: false, urutan: 1, persyaratan: ['KTP'], alur: ['Datang'], diperbarui: '2026-10-10', body: 'Catatan' };
function setup(files = { [PATH]: serializeContent(DATA, PATH) }, intercept = null) {
  const github = fakeGithub(files, load(CONFIG).backend.repo);
  const handler = createCmsHandler(intercept ? async (input, init) => intercept(input, init) || github.fetch(input, init) : github.fetch);
  const env = { GITHUB_TOKEN: 'token-test', ASSETS: { fetch: async () => new Response(CONFIG) } };
  const call = async (action, data = {}, method = 'GET', headers = {}) => {
    const url = new URL('http://localhost/api/cms');
    if (method === 'GET') for (const [key, value] of Object.entries({ action, collection: 'layanan', ...data })) url.searchParams.set(key, value);
    const res = await handler({ env, request: new Request(url, { method, headers: { authorization: 'Bearer token-test', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), ...headers }, ...(method === 'POST' ? { body: JSON.stringify({ action, collection: 'layanan', slug: 'contoh', ...data }) } : {}) }) });
    return { status: res.status, body: await res.json() };
  };
  const save = async (data = DATA, extra = {}) => { const current = (await call('entry', { slug: 'contoh' })).body; return call('save', { data, revision: current.revision, publishedSha: current.publishedSha, ...extra }, 'POST'); };
  return { github, call, save };
}
describe('CMS sederhana: draf dan penerbitan', () => {
  test('JSON dan Markdown mempertahankan Unicode, daftar string, tanggal dan body', () => {
    const data = { ...DATA, judul: 'Pelayanan warga — café', body: 'Baris 1\n\nBaris 2' };
    expect(parseContent(serializeContent(data, PATH), PATH)).toEqual({ ...data, body: data.body + '\n' });
    expect(parseContent(serializeContent(data, 'profil.json'), 'profil.json')).toEqual(data);
  });
  test('permintaan tanpa sesi ditolak sebelum GitHub dihubungi', async () => {
    const { call, github } = setup();
    expect((await call('config', {}, 'GET', { authorization: '' })).status).toBe(401);
    expect(github.requests).toHaveLength(0);
  });
  test('permintaan lintas situs dan traversal tidak diperbolehkan', async () => {
    const { call } = setup();
    expect((await call('save', { data: DATA }, 'POST', { origin: 'https://evil.example' })).status).toBe(403);
    for (const slug of ['../auth', 'a/b', 'main..', '']) expect((await call('entry', { slug })).status).toBe(404);
  });
  test('daftar awal hanya menampilkan konten terbit', async () => {
    const { call } = setup(); const entries = (await call('list')).body.entries;
    expect(entries).toHaveLength(1); expect(entries[0].status).toBe('published');
  });
  test('menyimpan revisi tidak mengubah versi terbit dan muncul sebagai draf', async () => {
    const { save, call, github } = setup(); const before = github.get(PATH);
    const saved = await save({ ...DATA, judul: 'Revisi' });
    expect(saved.status).toBe(200); expect(saved.body.status).toBe('draft'); expect(saved.body.published).toBe(true);
    expect(github.get(PATH)).toBe(before);
    expect((await call('list')).body.entries[0].title).toBe('Revisi');
    expect((await call('entry', { slug: 'contoh' })).body.data.judul).toBe('Revisi');
  });
  test('konten baru dapat disimpan belum lengkap tanpa tampil di main', async () => {
    const { save, github, call } = setup({});
    expect((await save({ judul: 'Draf baru', ringkasan: '' })).body.status).toBe('draft');
    expect(github.get(PATH)).toBeNull(); expect((await call('list')).body.entries).toHaveLength(1);
  });
  test('dua editor tidak bisa menimpa revisi draf yang sudah berubah', async () => {
    const { save, call, github } = setup(); const first = (await save()).body;
    const body = { data: { ...DATA, judul: 'Editor A' }, revision: first.revision, publishedSha: first.publishedSha };
    expect((await call('save', body, 'POST')).status).toBe(200);
    expect((await call('save', { ...body, data: { ...DATA, judul: 'Editor B' } }, 'POST')).status).toBe(409);
    expect(parseContent(github.get(PATH, 'cms/layanan/contoh'), PATH).judul).toBe('Editor A');
  });
  test.each(['missing', 'pending', 'failure', 'skipped'])('penerbitan ditolak jika CI %s', async (checks) => {
    const { save, call, github } = setup(); const saved = (await save({ ...DATA, judul: 'Revisi' })).body;
    github.options.checks = checks;
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).not.toBe(200);
    expect(parseContent(github.get(PATH), PATH).judul).toBe('Contoh');
  });
  test('check dari aplikasi lain, konflik merge, dan perubahan kode tidak boleh diterbitkan', async () => {
    for (const option of [{ app: 'fake-app' }, { mergeable: false }, { unexpectedFile: 'functions/api/auth.js' }]) {
      const { save, call, github } = setup(); const saved = (await save({ ...DATA, judul: 'Revisi' })).body;
      Object.assign(github.options, option);
      expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).not.toBe(200);
      expect(parseContent(github.get(PATH), PATH).judul).toBe('Contoh');
    }
  });
  test.each(['success', 'pending', 'failure'])('token tanpa Checks membaca CI publik dan tetap memvalidasi hasil %s', async (checks) => {
    const checkRequests = [];
    const { save, call, github } = setup(undefined, (input, init) => {
      if (new URL(input).pathname.endsWith('/check-runs')) {
        const authenticated = new Headers(init.headers).has('authorization');
        checkRequests.push({ method: init.method, authenticated });
        if (authenticated) return new Response('{}', { status: 403 });
      } else expect(new Headers(init.headers).has('authorization')).toBe(true);
      return null;
    });
    const saved = (await save({ ...DATA, judul: 'Revisi publik' })).body;
    github.options.checks = checks;
    const result = await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST');
    expect(result.status === 200).toBe(checks === 'success');
    expect(checkRequests).toEqual([{ method: 'GET', authenticated: true }, { method: 'GET', authenticated: false }]);
    expect(parseContent(github.get(PATH), PATH).judul).toBe(checks === 'success' ? 'Revisi publik' : DATA.judul);
  });
  test('hasil CI yang tetap tidak dapat dibaca tidak mengizinkan penerbitan', async () => {
    const { save, call, github } = setup(undefined, (input) => new URL(input).pathname.endsWith('/check-runs') ? new Response('{}', { status: 403 }) : null);
    const saved = (await save({ ...DATA, judul: 'Revisi belum diperiksa' })).body;
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(502);
    expect(parseContent(github.get(PATH), PATH).judul).toBe(DATA.judul);
    expect(github.requests.some((request) => request.path.endsWith('/merge') && request.method === 'PUT')).toBe(false);
  });
  test('penerbitan berhasil setelah check lulus dan draf hilang dari daftar', async () => {
    const { save, call, github } = setup(); const saved = (await save({ ...DATA, judul: 'Revisi' })).body;
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
    expect(parseContent(github.get(PATH), PATH).judul).toBe('Revisi');
    expect((await call('list')).body.entries[0].status).toBe('published');
    expect((await save({ ...DATA, judul: 'Revisi kedua' })).status).toBe(200);
  });
  test('buang draf mempertahankan versi terbit', async () => {
    const { save, call, github } = setup(); const before = github.get(PATH), saved = (await save({ ...DATA, judul: 'Revisi' })).body;
    expect((await call('discard', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get(PATH)).toBe(before); expect((await call('list')).body.entries[0].status).toBe('published');
  });
  test('penyimpanan bersamaan dilindungi pembaruan ref tanpa force', async () => {
    const { save, call, github } = setup(); const saved = (await save()).body;
    const input = { revision: saved.revision, publishedSha: saved.publishedSha };
    const results = await Promise.all(['A', 'B'].map((judul) => call('save', { ...input, data: { ...DATA, judul } }, 'POST')));
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(github.requests.filter((r) => r.method === 'PATCH').every((r) => r.body.force === false)).toBe(true);
  });
  test('buang draf tidak menghapus ref dan bersaing aman dengan penyimpanan', async () => {
    const { save, call, github } = setup(); const saved = (await save()).body;
    const input = { revision: saved.revision, publishedSha: saved.publishedSha };
    const results = await Promise.all([call('discard', input, 'POST'), call('save', { ...input, data: { ...DATA, judul: 'Perubahan lain' } }, 'POST')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(github.requests.some((r) => r.method === 'DELETE')).toBe(false);
    expect(github.get(PATH)).toBe(serializeContent(DATA, PATH));
  });
  test('riwayat yang terbit atau dibuang tidak muncul sebagai draf setelah main berubah', async () => {
    for (const action of ['publish', 'discard']) {
      const { save, call, github } = setup(); const saved = (await save({ ...DATA, judul: 'Revisi' })).body;
      expect((await call(action, { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
      github.advanceMain({ [PATH]: serializeContent({ ...DATA, judul: 'Versi main terbaru' }, PATH) });
      const current = (await call('entry', { slug: 'contoh' })).body;
      expect(current.status).toBe('published'); expect(current.data.judul).toBe('Versi main terbaru');
      expect((await call('list')).body.entries[0].status).toBe('published');
      expect((await save({ ...DATA, judul: 'Draf berikutnya' })).status).toBe(200);
    }
  });
  test('draf tetap dapat dibuka dan dicoba ulang ketika pembuatan PR gagal', async () => {
    let unavailable = true;
    const { save, call, github } = setup(undefined, (input, init) => unavailable && new URL(input).pathname.endsWith('/pulls') && init.method === 'POST' ? new Response('{}', { status: 503 }) : null);
    const saved = await save({ ...DATA, judul: 'Draf belum diperiksa' });
    expect(saved.status).toBe(200); expect(saved.body.warning).toBeDefined(); expect(github.get(PATH)).toBe(serializeContent(DATA, PATH));
    expect((await call('entry', { slug: 'contoh' })).body.warning).toBeDefined();
    unavailable = false; const retried = await save({ ...DATA, judul: 'Draf belum diperiksa' });
    expect(retried.body.warning).toBeUndefined(); expect(github.pulls).toHaveLength(1);
  });
  test('draf lama harus diperiksa ulang dengan kode main terbaru sebelum terbit', async () => {
    const { save, call, github } = setup(); const saved = (await save({ ...DATA, judul: 'Draf' })).body;
    github.advanceMain({ 'src/schema-baru.js': 'kontrak terbaru' });
    const first = await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST');
    expect(first.status).toBe(409); expect(first.body.error).toContain('Simpan draf');
    const updated = (await save({ ...DATA, judul: 'Draf' })).body;
    expect((await call('publish', { revision: updated.revision, publishedSha: updated.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get('src/schema-baru.js')).toBe('kontrak terbaru');
  });
  test('foto draf tetap ada setelah penyimpanan ulang mengikuti main terbaru', async () => {
    const { save, call, github } = setup();
    const content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
    await save({ ...DATA, body: '/uploads/foto.png' }, { uploads: [{ path: 'public/uploads/foto.png', content }] });
    github.advanceMain({ 'src/baru.js': 'baru' });
    const updated = (await save({ ...DATA, body: '/uploads/foto.png' })).body;
    expect(github.get('public/uploads/foto.png', 'cms/layanan/contoh')).not.toBeNull();
    expect((await call('publish', { revision: updated.revision, publishedSha: updated.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get('public/uploads/foto.png')).not.toBeNull();
  });
  test('penghapusan konten terbit disimpan sebagai draf sampai diterbitkan', async () => {
    const { call, github } = setup(); const current = (await call('entry', { slug: 'contoh' })).body;
    const saved = (await call('delete', { publishedSha: current.publishedSha }, 'POST')).body;
    expect(saved.deleted).toBe(true); expect(github.get(PATH)).not.toBeNull();
    expect((await call('list')).body.entries[0].deleted).toBe(true);
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get(PATH)).toBeNull(); expect((await call('list')).body.entries).toHaveLength(0);
  });
  test('file pengaturan tidak dapat dihapus', async () => {
    const { call } = setup(); expect((await call('delete', { collection: 'pengaturan', slug: 'situs' }, 'POST')).status).toBe(403);
  });
  test('penarikan mempertahankan revisi draf setelah terhapus dari main dan dapat diterbitkan ulang', async () => {
    const { save, call, github } = setup();
    const revision = (await save({ ...DATA, judul: 'Revisi yang disimpan' })).body;
    const pending = await call('withdraw', { revision: revision.revision, publishedSha: revision.publishedSha }, 'POST');
    expect(pending.status).toBe(200); expect(pending.body.deleted).toBe(true);
    expect(pending.body.withdrawal).toBe(true); expect(pending.body.data.judul).toBe('Revisi yang disimpan');
    expect(github.get(PATH)).not.toBeNull();
    github.options.checks = 'pending';
    expect((await call('publish', { revision: pending.body.revision, publishedSha: pending.body.publishedSha }, 'POST')).status).toBe(409);
    expect(github.get(PATH)).not.toBeNull();
    github.options.checks = 'success';
    expect((await call('publish', { revision: pending.body.revision, publishedSha: pending.body.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get(PATH)).toBeNull();
    github.advanceMain({ 'src/perubahan.js': 'baru' });
    const withdrawn = (await call('entry', { slug: 'contoh' })).body;
    expect(withdrawn.published).toBe(false); expect(withdrawn.status).toBe('draft'); expect(withdrawn.deleted).toBe(false);
    expect(withdrawn.withdrawn).toBe(true); expect(withdrawn.data.judul).toBe('Revisi yang disimpan');
    expect((await call('list')).body.entries[0].data).toEqual(withdrawn.data);
    const saved = await save(withdrawn.data);
    expect(saved.status).toBe(200); expect(saved.body.withdrawn).toBe(false);
    expect((await call('publish', { revision: saved.body.revision, publishedSha: saved.body.publishedSha }, 'POST')).status).toBe(200);
    expect(parseContent(github.get(PATH), PATH).judul).toBe('Revisi yang disimpan');
    expect(github.get('src/perubahan.js')).toBe('baru');
  });
  test('penarikan tanpa revisi tetap menyimpan isi dan pembatalan mempertahankan versi terbit', async () => {
    const { call, github } = setup();
    const current = (await call('entry', { slug: 'contoh' })).body;
    const pending = (await call('withdraw', { publishedSha: current.publishedSha }, 'POST')).body;
    expect(pending.data.judul).toBe(DATA.judul);
    expect((await call('discard', { revision: pending.revision, publishedSha: pending.publishedSha }, 'POST')).status).toBe(200);
    expect(github.get(PATH)).toBe(serializeContent(DATA, PATH));
    expect((await call('list')).body.entries[0].status).toBe('published');
  });
  test('draf hasil penarikan dapat dihapus dan tidak muncul lagi di daftar', async () => {
    const { call, github } = setup();
    const current = (await call('entry', { slug: 'contoh' })).body;
    const pending = (await call('withdraw', { publishedSha: current.publishedSha }, 'POST')).body;
    await call('publish', { revision: pending.revision, publishedSha: pending.publishedSha }, 'POST');
    const withdrawn = (await call('entry', { slug: 'contoh' })).body;
    expect((await call('discard', { revision: withdrawn.revision }, 'POST')).status).toBe(200);
    expect((await call('list')).body.entries).toHaveLength(0);
    expect(github.get(PATH)).toBeNull();
  });
  test('penarikan tidak boleh menimpa perubahan editor lain atau menghapus file pengaturan', async () => {
    const { call, save } = setup();
    const before = (await call('entry', { slug: 'contoh' })).body;
    await save({ ...DATA, judul: 'Editor lain' });
    expect((await call('withdraw', { publishedSha: before.publishedSha }, 'POST')).status).toBe(409);
    expect((await call('withdraw', { collection: 'pengaturan', slug: 'situs' }, 'POST')).status).toBe(403);
  });
  test('GitHub yang belum menghitung kesiapan merge memberikan arahan coba lagi tanpa kehilangan draf', async () => {
    const { call, save, github } = setup();
    const saved = (await save({ ...DATA, judul: 'Siap' })).body;
    github.options.mergeable = null;
    const pending = await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST');
    expect(pending.status).toBe(409); expect(pending.body.error).toContain('Tunggu sebentar');
    expect(pending.body.error).not.toContain('Hubungi'); expect(github.get(PATH)).toBe(serializeContent(DATA, PATH));
    github.options.mergeable = true;
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
  });
  test('kesiapan merge yang selesai saat percobaan ulang otomatis dapat diterbitkan', async () => {
    let details = 0;
    const { call, save, github } = setup(undefined, (input, init) => {
      if (/\/pulls\/\d+$/.test(new URL(input).pathname) && init.method === 'GET' && ++details === 1) {
        return github.fetch(input, init).then(async (result) => new Response(JSON.stringify({ ...await result.json(), mergeable: null, mergeable_state: 'unknown' })));
      }
      return null;
    });
    const saved = (await save({ ...DATA, judul: 'Siap diterbitkan' })).body;
    expect((await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST')).status).toBe(200);
    expect(details).toBe(2); expect(parseContent(github.get(PATH), PATH).judul).toBe('Siap diterbitkan');
  });
  test('versi yang diterbitkan pengelola setelah penarikan tidak tertutup isi draf lama', async () => {
    const { call, github } = setup();
    const current = (await call('entry', { slug: 'contoh' })).body;
    const pending = (await call('withdraw', { publishedSha: current.publishedSha }, 'POST')).body;
    await call('publish', { revision: pending.revision, publishedSha: pending.publishedSha }, 'POST');
    github.advanceMain({ [PATH]: serializeContent({ ...DATA, judul: 'Versi pengelola terbaru' }, PATH) });
    const latest = (await call('entry', { slug: 'contoh' })).body;
    expect(latest.status).toBe('published'); expect(latest.data.judul).toBe('Versi pengelola terbaru');
    expect((await call('list')).body.entries[0].title).toBe('Versi pengelola terbaru');
  });
  test('riwayat PR yang branch-nya sudah dihapus tidak merusak daftar konten terbit', async () => {
    const { call, save, github } = setup();
    const saved = (await save({ ...DATA, judul: 'Terbit' })).body;
    await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha }, 'POST');
    github.refs.delete('cms/layanan/contoh');
    const list = await call('list');
    expect(list.status).toBe(200); expect(list.body.entries[0].title).toBe('Terbit');
    expect(list.body.entries[0].status).toBe('published');
  });
  test('unggahan foto dan konten berada di commit draf yang sama', async () => {
    const { save, github } = setup();
    const content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
    const result = await save(DATA, { uploads: [{ path: 'public/uploads/contoh.png', content }] });
    expect(result.status).toBe(200); expect(github.get('public/uploads/contoh.png')).toBeNull();
    expect(github.get('public/uploads/contoh.png', 'cms/layanan/contoh')).not.toBeNull();
  });
  test('foto tidak valid dan path kode ditolak', async () => {
    for (const upload of [{ path: 'public/uploads/contoh.png', content: btoa('bukan gambar') }, { path: 'functions/api/auth.js', content: 'AA==' }]) {
      const { save, github } = setup(); expect((await save(DATA, { uploads: [upload] })).status).toBe(400);
      expect(github.refs.has('cms/layanan/contoh')).toBe(false);
    }
  });
  test.each([false, true])('perubahan versi terbit saat penyimpanan tidak tertimpa, draf aktif: %s', async (hasDraft) => {
    let advance = false;
    const { save, github } = setup(undefined, (input) => {
      if (advance && new URL(input).pathname.endsWith('/git/ref/heads/main')) {
        advance = false;
        github.advanceMain({ [PATH]: serializeContent({ ...DATA, judul: 'Perubahan pengelola' }, PATH) });
      }
      return null;
    });
    if (hasDraft) await save({ ...DATA, judul: 'Draf awal' });
    const before = github.refs.get('cms/layanan/contoh');
    advance = true;
    expect((await save({ ...DATA, judul: 'Isian lama' })).status).toBe(409);
    expect(parseContent(github.get(PATH), PATH).judul).toBe('Perubahan pengelola');
    expect(github.refs.get('cms/layanan/contoh')).toBe(before);
  });
  test.each([false, true])('foto yang sudah ada di main tidak tertimpa, draf aktif: %s', async (hasDraft) => {
    const { save, github } = setup();
    if (hasDraft) await save({ ...DATA, judul: 'Draf awal' });
    github.advanceMain({ 'public/uploads/bersama.png': 'foto pengelola lain' });
    const before = github.refs.get('cms/layanan/contoh');
    const content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString('base64');
    expect((await save(DATA, { uploads: [{ path: 'public/uploads/bersama.png', content }] })).status).toBe(409);
    expect(github.get('public/uploads/bersama.png')).toBe('foto pengelola lain');
    expect(github.refs.get('cms/layanan/contoh')).toBe(before);
  });
});
