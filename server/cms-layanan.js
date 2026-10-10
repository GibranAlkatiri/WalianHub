export class LayananError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
export const layananD1Enabled = (env) => env.CMS_LAYANAN_D1 === '1';
const fail = (message, status) => { throw new LayananError(message, status); };
const conflict = () => fail('Konten telah berubah. Muat ulang agar perubahan lain tidak tertimpa.', 409);
const token = () => 'd1:' + crypto.randomUUID();
const fields = new Set(['judul', 'ringkasan', 'ikon', 'unggulan', 'urutan', 'persyaratan', 'alur', 'diperbarui', 'body']);

// Drafts may be unfinished; publishing enforces the website's data contract.
export function validateLayanan(value, collection, publish = false) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some((key) => !fields.has(key))) fail('Isian layanan tidak valid.');
  const data = { ikon: 'file-text', unggulan: false, urutan: 100, persyaratan: [], alur: [], body: '', ...value };
  for (const key of ['judul', 'ringkasan', 'ikon', 'diperbarui', 'body']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') fail(`Isian ${key} harus berupa teks.`);
    if (key !== 'body' && typeof data[key] === 'string') data[key] = data[key].trim();
  }
  if (typeof data.unggulan !== 'boolean' || typeof data.urutan !== 'number' || !Number.isFinite(data.urutan)) fail('Pilihan beranda atau urutan tidak valid.');
  for (const key of ['persyaratan', 'alur']) {
    if (!Array.isArray(data[key]) || data[key].some((item) => typeof item !== 'string')) fail(`Isian ${key} harus berupa daftar teks.`);
    data[key] = data[key].map((item) => item.trim());
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > 256 * 1024) fail('Isian layanan terlalu panjang.', 413);
  if (!publish) return data;
  if (!data.judul) fail('Judul perlu diisi sebelum diterbitkan.');
  if (!data.ringkasan || data.ringkasan.length > 120) fail('Ringkasan perlu diisi, maksimal 120 karakter.');
  const icons = collection.fields.find((field) => field.name === 'ikon')?.options?.map((option) => typeof option === 'string' ? option : option.value) || [];
  if (!icons.includes(data.ikon)) fail('Pilih ikon layanan yang tersedia.');
  for (const key of ['persyaratan', 'alur']) if (data[key].some((item) => !item)) fail(`Daftar ${key} tidak boleh berisi teks kosong.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.diperbarui || '')) fail('Tanggal diperbarui harus memakai YYYY-MM-DD.');
  const date = new Date(data.diperbarui + 'T00:00:00Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.diperbarui) fail('Tanggal diperbarui tidak valid.');
  return data;
}
function entry(row, slug) {
  const draft = !!row?.draft_action;
  const data = row?.draft_json || row?.published_json;
  return {
    collection: 'layanan', slug, status: draft ? 'draft' : 'published',
    published: !!row?.published_json, revision: row?.draft_revision || null,
    publishedSha: row?.published_blob_sha || null,
    deleted: draft && (row.draft_action === 'delete' || (row.draft_action === 'withdraw' && !!row.published_json)),
    withdrawal: row?.draft_action === 'withdraw', withdrawn: row?.draft_action === 'withdraw' && !row.published_json,
    data: data ? JSON.parse(data) : {},
  };
}

export async function layananOperation(db, collection, action, slug, body) {
  try {
    if (!db) fail('Penyimpanan layanan belum tersedia. Hubungi pengelola panel.', 503);
    if (action === 'list') {
      const rows = await db.prepare('SELECT * FROM cms_content WHERE collection = ? ORDER BY slug').bind('layanan').all();
      return { entries: rows.results.map((row) => { const item = entry(row, row.slug); return { ...item, title: item.data.judul || row.slug, summary: item.data.ringkasan || '' }; }) };
    }
    const row = await db.prepare('SELECT * FROM cms_content WHERE collection = ? AND slug = ?').bind('layanan', slug).first();
    if (action === 'entry') return entry(row, slug);
    if (!['save', 'publish', 'discard', 'withdraw', 'delete'].includes(action)) fail('Tindakan layanan tidak dikenali.', 404);
    if ((row?.draft_revision || null) !== (body.revision || null) || (row?.published_blob_sha || null) !== (body.publishedSha || null)) conflict();
    if (body.uploads !== undefined && (!Array.isArray(body.uploads) || body.uploads.length)) fail('Unggahan foto layanan belum tersedia pada tahap ini. Simpan isian teks terlebih dahulu.');
    const where = 'collection = ? AND slug = ? AND version = ? AND draft_revision IS ? AND published_blob_sha IS ?';
    const guard = ['layanan', slug, row?.version, row?.draft_revision || null, row?.published_blob_sha || null];
    const update = async (set, args) => {
      const result = await db.prepare(`UPDATE cms_content SET ${set}, version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ${where} RETURNING *`).bind(...args, ...guard).first();
      if (!result) conflict();
      return entry(result, slug);
    };
    const remove = async () => {
      const result = await db.prepare(`DELETE FROM cms_content WHERE ${where} RETURNING slug`).bind(...guard).first();
      if (!result) conflict();
      return { ok: true };
    };
    if (action === 'save') {
      if (row?.draft_action === 'delete' || (row?.draft_action === 'withdraw' && row.published_json)) fail('Selesaikan atau batalkan penarikan/penghapusan terlebih dahulu.', 409);
      const data = JSON.stringify(validateLayanan(body.data, collection));
      const revision = token();
      if (row) return update("draft_json = ?, draft_blob_sha = ?, draft_action = 'edit', draft_revision = ?", [data, revision, revision]);
      const source = await db.prepare('SELECT snapshot_id FROM cms_imports ORDER BY imported_at DESC LIMIT 1').first();
      if (!source) fail('Impor awal layanan belum selesai. Hubungi pengelola panel.', 503);
      const result = await db.prepare(`INSERT INTO cms_content(collection,slug,source_path,draft_json,draft_blob_sha,draft_action,draft_revision,snapshot_id)
        VALUES ('layanan', ?, ?, ?, ?, 'edit', ?, ?) ON CONFLICT(collection,slug) DO NOTHING RETURNING *`).bind(slug, `src/content/layanan/${slug}.md`, data, revision, revision, source.snapshot_id).first();
      if (!result) conflict();
      return entry(result, slug);
    }
    if (!row?.draft_revision && ['discard', 'publish'].includes(action)) fail(action === 'discard' ? 'Tidak ada draf untuk dibuang.' : 'Simpan draf terlebih dahulu.', 409);
    if (action === 'discard') {
      if (!row.published_json) return remove();
      await update('draft_json = NULL, draft_blob_sha = NULL, draft_action = NULL, draft_revision = NULL', []);
      return { ok: true };
    }
    if (action === 'delete' || action === 'withdraw') {
      if (collection.delete === false || !row?.published_json) fail('Layanan ini belum terbit atau tidak boleh dihapus/ditarik.', 409);
      if (action === 'withdraw' && row.draft_action === 'delete') fail('Batalkan penghapusan terlebih dahulu.', 409);
      const revision = token();
      const data = action === 'withdraw' ? (row.draft_json || row.published_json) : null;
      return update('draft_json = ?, draft_blob_sha = ?, draft_action = ?, draft_revision = ?', [data, data ? revision : null, action, revision]);
    }
    if (row.draft_action === 'delete') return { ...await remove(), message: 'Layanan berhasil dihapus dari penyimpanan D1.' };
    if (row.draft_action === 'withdraw') {
      if (!row.published_json) fail('Layanan sudah ditarik. Simpan draf sebelum menerbitkan kembali.', 409);
      await update('published_json = NULL, published_blob_sha = NULL, draft_revision = ?', [token()]);
      return { ok: true, message: 'Layanan ditarik ke draf. Isinya tetap tersimpan di D1.' };
    }
    const data = JSON.stringify(validateLayanan(JSON.parse(row.draft_json), collection, true));
    await update('published_json = ?, published_blob_sha = ?, draft_json = NULL, draft_blob_sha = NULL, draft_action = NULL, draft_revision = NULL', [data, token()]);
    return { ok: true, message: 'Layanan berhasil diterbitkan di D1.' };
  } catch (error) {
    if (error instanceof LayananError) throw error;
    throw new LayananError('Penyimpanan layanan belum dapat diproses. Coba kembali; isian Anda tetap ada.', 503);
  }
}
