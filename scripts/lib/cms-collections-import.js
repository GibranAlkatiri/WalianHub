import {createHash} from 'node:crypto';
import {validateDestinasi,validatePengumuman} from '../../server/cms-collections.js';
const sql = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'","''")}'`;
const names = ['destinasi','pengumuman'];
const columns = ['collection','slug','source_path','published_json','published_blob_sha','draft_json','draft_blob_sha','draft_action','draft_revision'];
const values = (entry) => [entry.collection,entry.slug,entry.path,entry.published ? JSON.stringify(entry.published.data) : null,entry.published?.sha,entry.draft?.data ? JSON.stringify(entry.draft.data) : null,entry.draft?.sha,entry.draft?.action,entry.draft?.revision];
// Refresh only untouched staging seeds, from a verified, current GitHub backup.
// Exact baseline guards reject a concurrent edit; a completion marker prevents
// reimport from restoring deleted records or replacing later D1 drafts.
export function collectionsImportSql(manifest,baseline,config) {
  const entries = manifest.entries.filter((entry) => names.includes(entry.collection));
  if (!entries.some((entry) => entry.collection === 'pengumuman') || !/^[a-f0-9]{40}$/.test(manifest.mainSha)) throw new Error('Cadangan tahap 6 tidak lengkap.');
  const rows = baseline.filter((row) => names.includes(row.collection));
  if (rows.some((row) => row.version !== 1 || /^d1:/.test(row.published_blob_sha || '') || /^d1:/.test(row.draft_revision || ''))) throw new Error('Konten D1 telah diedit; impor tidak boleh menimpanya.');
  for (const entry of entries) {
    const collection = config.collections.find((item) => item.name === entry.collection);
    if (!collection || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) || entry.slug.length > 100 || entry.path !== (entry.collection === 'destinasi' ? `src/content/destinasi/${entry.slug}.md` : 'src/content/pengaturan/pengumuman.json') || (entry.collection === 'pengumuman' && entry.slug !== 'pengumuman')) throw new Error('Tujuan impor tidak sesuai konfigurasi.');
    const validate = entry.collection === 'destinasi' ? validateDestinasi : validatePengumuman;
    if (entry.published) validate(entry.published.data,collection,true);
    if (entry.draft?.data) validate(entry.draft.data,collection);
  }
  const id = createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),marker = 'collections:' + id;
  const exact = rows.map((row) => '(' + [...columns,'version','snapshot_id','updated_at'].map((key) => `${key} IS ${sql(row[key])}`).join(' AND ') + ')').join(' OR ') || '0';
  const scope = "collection IN ('destinasi','pengumuman')";
  const completed = `EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id = ${sql(marker)})`;
  const statements = [
    `INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[id,manifest.repository,manifest.mainSha,manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`,
    `UPDATE cms_imports SET main_sha = CASE WHEN NOT (${completed}) AND ((SELECT COUNT(*) FROM cms_content WHERE ${scope}) != ${rows.length} OR EXISTS (SELECT 1 FROM cms_content WHERE ${scope} AND NOT (${exact})) OR EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id LIKE 'collections:%')) THEN NULL ELSE main_sha END WHERE snapshot_id = ${sql(id)};`,
    `DELETE FROM cms_content WHERE ${scope} AND NOT (${completed});`,
    ...entries.map((entry) => `INSERT INTO cms_content(${columns.join(',')},snapshot_id) SELECT ${[...values(entry),id].map(sql).join(',')} WHERE NOT (${completed});`),
    `INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[marker,manifest.repository,manifest.mainSha,manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`,
  ];
  return statements.join('\n') + '\n';
}
