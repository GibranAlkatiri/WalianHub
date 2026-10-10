import { createHash } from 'node:crypto';
const sql = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

// Import only the Layanan collection. Existing identical, untouched seeds are
// retained; any changed row aborts the import rather than replacing an edit.
export function layananImportSql(manifest) {
  const entries = manifest.entries.filter((entry) => entry.collection === 'layanan');
  if (!entries.length) throw new Error('Cadangan tidak memuat layanan untuk diimpor.');
  const id = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const marker = 'layanan:' + id;
  const values = (entry) => [entry.collection, entry.slug, entry.path, entry.published ? JSON.stringify(entry.published.data) : null, entry.published?.sha, entry.draft?.data ? JSON.stringify(entry.draft.data) : null, entry.draft?.sha, entry.draft?.action, entry.draft?.revision];
  const columns = ['collection', 'slug', 'source_path', 'published_json', 'published_blob_sha', 'draft_json', 'draft_blob_sha', 'draft_action', 'draft_revision'];
  const identical = entries.map((entry) => '(' + columns.map((column, index) => `${column} IS ${sql(values(entry)[index])}`).join(' AND ') + ' AND version = 1)').join(' OR ');
  const statements = [
    `INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[id, manifest.repository, manifest.mainSha, manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`,
    // A NOT NULL guard also runs when this snapshot was imported previously.
    `UPDATE cms_imports SET main_sha = CASE WHEN EXISTS (SELECT 1 FROM cms_content WHERE collection='layanan' AND NOT (${identical})) OR EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id LIKE 'layanan:%' AND snapshot_id != ${sql(marker)}) THEN NULL ELSE main_sha END WHERE snapshot_id = ${sql(id)};`,
  ];
  for (const entry of entries) statements.push(`INSERT INTO cms_content(${columns.join(',')},snapshot_id) SELECT ${[...values(entry), id].map(sql).join(',')} WHERE NOT EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id = ${sql(marker)}) ON CONFLICT(collection,slug) DO NOTHING;`);
  statements.push(`INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[marker, manifest.repository, manifest.mainSha, manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`);
  return statements.join('\n') + '\n';
}
