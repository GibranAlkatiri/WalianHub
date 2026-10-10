import { describe, test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fakeGithub } from './helpers/cms-github.js';
import { createCmsHandler, serializeContent } from '../functions/api/cms.js';
import { captureSnapshot, writeSnapshot, readSnapshot, snapshotSql } from '../scripts/lib/cms-snapshot.js';
import { onRequest } from '../functions/api/migration-preview.js';
import { onRequest as renderPreview } from '../functions/migration-preview.js';

const repo = 'GibranAlkatiri/WalianHub';
const path = 'src/content/layanan/contoh.md';
const data = { judul: "Surat warga 'Walian'", persyaratan: ['KTP'], body: 'Catatan\n' };
const config = `backend:\n  repo: ${repo}\n  branch: main\ncollections:\n  - name: layanan\n    folder: src/content/layanan\n    fields:\n      - {name: judul}\n      - {name: persyaratan}\n      - {name: body}\n`;
function setup() {
  const github = fakeGithub({ 'public/admin/config.yml': config, [path]: serializeContent(data, path), 'public/images/foto.svg': '<svg/>', 'src/content/arsip/lama.json': '{"catatan":"tetap dicadangkan"}' }, repo);
  const handler = createCmsHandler(github.fetch);
  const call = async (action, extra = {}) => {
    const res = await handler({ env: { GITHUB_TOKEN: 'test', ASSETS: { fetch: async () => new Response(config) } }, request: new Request('http://localhost/api/cms', { method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, body: JSON.stringify({ action, collection: 'layanan', slug: 'contoh', ...extra }) }) });
    expect(res.status).toBe(200); return res.json();
  };
  const capture = () => captureSnapshot(repo, 'main', github.fetch);
  return { github, call, capture };
}
function sqliteBinding(db) {
  return { prepare: (sql) => ({ bind: (...args) => ({ all: async () => ({ results: db.query(sql).all(...args) }) }) }) };
}
const seed = (db, manifest) => db.transaction(() => {
  for (const statement of snapshotSql(manifest).trim().split('\n')) db.query(statement).run();
})();
const probe = (db, url = 'http://localhost/api/migration-preview', env = {}, method = 'GET') => onRequest({ request: new Request(url, { method }), env: { CMS_MIGRATION_PREVIEW: '1', CMS_DB: sqliteBinding(db), ...env } });

describe('Fondasi migrasi CMS', () => {
  test('cadangan mempertahankan versi terbit, draf, foto dan konten di luar menu, tanpa menulis GitHub', async () => {
    const { github, call, capture } = setup();
    await call('save', { publishedSha: [...github.blobs].find(([, value]) => value === serializeContent(data, path))[0], data: { ...data, judul: 'Revisi rahasia' }, uploads: [{ path: 'public/uploads/baru.png', content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64') }] });
    github.requests.length = 0;
    const { manifest } = await capture();
    expect(manifest.entries[0].published.data.judul).toBe(data.judul);
    expect(manifest.entries[0].draft.data.judul).toBe('Revisi rahasia');
    expect(manifest.files.some((file) => file.path === 'public/uploads/baru.png')).toBe(true);
    expect(manifest.files.some((file) => file.path === 'src/content/arsip/lama.json')).toBe(true);
    expect(github.requests.every((request) => request.method === 'GET')).toBe(true);
  });
  test('draf yang sudah terbit atau dibuang tidak dihidupkan kembali', async () => {
    const { call, capture } = setup();
    let snapshot = await capture();
    let saved = await call('save', { publishedSha: snapshot.manifest.entries[0].published.sha, data: { ...data, judul: 'Terbit baru' } });
    await call('publish', { revision: saved.revision, publishedSha: saved.publishedSha });
    snapshot = await capture();
    expect(snapshot.manifest.entries[0].draft).toBeNull();
    saved = await call('save', { publishedSha: snapshot.manifest.entries[0].published.sha, data });
    await call('discard', { revision: saved.revision, publishedSha: saved.publishedSha });
    expect((await capture()).manifest.entries[0].draft).toBeNull();
  });
  test('konten yang ditarik tetap menjadi draf setelah PR penghapusan digabung', async () => {
    const { call, capture } = setup();
    const publishedSha = (await capture()).manifest.entries[0].published.sha;
    const withdrawn = await call('withdraw', { publishedSha });
    await call('publish', { revision: withdrawn.revision, publishedSha });
    const entry = (await capture()).manifest.entries[0];
    expect(entry.published).toBeNull();
    expect(entry.draft.action).toBe('withdraw');
    expect(entry.draft.data).toEqual(data);
  });
  test('gagal jika GitHub memotong pohon, objek rusak, atau sumber berubah saat ekspor', async () => {
    for (const mode of ['truncated', 'corrupt', 'changed']) {
      const { github } = setup(); let refs = 0;
      const fetch = async (url, init) => {
        const response = await github.fetch(url, init); const body = await response.json();
        if (mode === 'truncated' && url.includes('git/trees/')) body.truncated = true;
        if (mode === 'corrupt' && url.includes('git/blobs/')) body.content = Buffer.from('rusak').toString('base64');
        if (mode === 'changed' && url.endsWith('git/matching-refs/heads/?per_page=100&page=1') && ++refs > 1) body[0].object.sha = 'a'.repeat(40);
        return new Response(JSON.stringify(body), { status: response.status });
      };
      await expect(captureSnapshot(repo, 'main', fetch)).rejects.toThrow();
    }
  });
  test('foto lokal yang dirujuk tetapi hilang tidak dianggap sudah dicadangkan', async () => {
    const { call, capture } = setup();
    const publishedSha = (await capture()).manifest.entries[0].published.sha;
    const saved = await call('save', { publishedSha, data: { ...data, body: '![Foto](https://contoh.invalid/images/eksternal.png)' } });
    expect((await capture()).manifest.entries[0].draft.data.body).toContain('https://contoh.invalid');
    await call('save', { publishedSha, revision: saved.revision, data: { ...data, body: '![Foto](/uploads/hilang.png)' } });
    await expect(capture()).rejects.toThrow('Foto yang dirujuk konten tidak ditemukan');
  });
  test('verifikasi mendeteksi foto rusak dan cadangan yang belum selesai', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'walianhub-migration-'));
    try {
      const snapshot = await setup().capture(); const target = join(directory, 'snapshot');
      await writeSnapshot(snapshot, target);
      expect((await readSnapshot(target)).manifest.mainSha).toBe(snapshot.manifest.mainSha);
      const media = snapshot.manifest.files.find((file) => file.kind === 'media');
      await writeFile(join(target, 'objects', media.sha), 'rusak');
      await expect(readSnapshot(target)).rejects.toThrow('Objek cadangan rusak');
      await rm(join(target, 'manifest.sha256'));
      await expect(readSnapshot(target)).rejects.toThrow();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  test('schema mempertahankan draf, endpoint hanya membaca versi terbit dan langsung melihat update', async () => {
    const { call, capture } = setup();
    const publishedSha = (await capture()).manifest.entries[0].published.sha;
    await call('save', { publishedSha, data: { ...data, judul: 'Draf pribadi' } });
    const snapshot = await capture(); const db = new Database(':memory:');
    try {
      db.exec('PRAGMA foreign_keys=ON;');
      db.exec(await readFile(new URL('../migrations/0001_content.sql', import.meta.url), 'utf8'));
      seed(db, snapshot.manifest);
      expect(JSON.parse(db.query('SELECT draft_json FROM cms_content').get().draft_json).judul).toBe('Draf pribadi');
      expect((await (await probe(db)).json()).entries[0].data.judul).toBe(data.judul);
      db.query('UPDATE cms_content SET published_json = ?, version = version + 1').run(JSON.stringify({ ...data, judul: 'Perubahan langsung' }));
      const response = await probe(db); expect(response.headers.get('cache-control')).toBe('no-store');
      expect((await response.json()).entries[0].data.judul).toBe('Perubahan langsung');
      const html = await renderPreview({ request: new Request('http://localhost/migration-preview'), env: { CMS_MIGRATION_PREVIEW: '1', CMS_DB: sqliteBinding(db) } });
      expect(await html.text()).toContain('Perubahan langsung');
      expect(html.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      db.query('UPDATE cms_content SET published_json = ?').run(JSON.stringify({ judul: '<script>alert(1)</script>' }));
      const unsafe = await renderPreview({ request: new Request('http://localhost/migration-preview'), env: { CMS_MIGRATION_PREVIEW: '1', CMS_DB: sqliteBinding(db) } });
      expect(await unsafe.text()).toContain('&lt;script&gt;');
      expect(() => seed(db, snapshot.manifest)).toThrow();
      db.exec('UPDATE cms_content SET published_json=NULL, published_blob_sha=NULL;');
      expect((await (await probe(db)).json()).entries).toHaveLength(0);
    } finally { db.close(); }
  });
  test('probe tertutup di produksi, tanpa flag, tanpa binding, dan menolak penulisan', async () => {
    const db = new Database(':memory:');
    try {
      expect((await probe(db, 'https://walianhub-8ib.pages.dev/api/migration-preview', { CF_PAGES_BRANCH: 'feature' })).status).toBe(404);
      expect((await probe(db, 'https://abc.walianhub-8ib.pages.dev/api/migration-preview', { CF_PAGES_BRANCH: 'main' })).status).toBe(404);
      expect((await probe(db, undefined, { CMS_MIGRATION_PREVIEW: '0' })).status).toBe(404);
      expect((await probe(db, undefined, { CMS_DB: undefined })).status).toBe(503);
      expect((await probe(db, undefined, {}, 'POST')).status).toBe(405);
      expect((await probe(db, 'https://abc.walianhub-8ib.pages.dev/api/migration-preview', { CF_PAGES_BRANCH: 'backend/cms-migration-foundation' })).status).toBe(503);
      expect((await renderPreview({ request: new Request('https://walianhub-8ib.pages.dev/migration-preview'), env: { CMS_MIGRATION_PREVIEW: '1', CMS_DB: sqliteBinding(db) } })).status).toBe(404);
    } finally { db.close(); }
  });
});
