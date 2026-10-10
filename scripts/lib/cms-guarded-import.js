import {createHash} from 'node:crypto';
const sql = (value)=>value==null?'NULL':`'${String(value).replaceAll("'","''")}'`;
const columns=['collection','slug','source_path','published_json','published_blob_sha','draft_json','draft_blob_sha','draft_action','draft_revision'];
const values=(entry)=>[entry.collection,entry.slug,entry.path,entry.published?JSON.stringify(entry.published.data):null,entry.published?.sha,entry.draft?.data?JSON.stringify(entry.draft.data):null,entry.draft?.sha,entry.draft?.action,entry.draft?.revision];
// Refresh untouched seeds atomically. Exact baseline checks reject concurrent
// changes; the completion marker makes re-running an import a no-op.
export function guardedImportSql(manifest,baseline,entries,names,prefix) {
  const rows=baseline.filter((row)=>names.includes(row.collection));
  if(rows.some((row)=>row.version!==1||/^d1:/.test(row.published_blob_sha||'')||/^d1:/.test(row.draft_revision||'')))throw new Error('Konten D1 telah diedit; impor tidak boleh menimpanya.');
  const id=createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),marker=prefix+id;
  const exact=rows.map((row)=>'('+[...columns,'version','snapshot_id','updated_at'].map((key)=>`${key} IS ${sql(row[key])}`).join(' AND ')+')').join(' OR ')||'0';
  const scope=`collection IN (${names.map(sql).join(',')})`,completed=`EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id = ${sql(marker)})`;
  return [
    `INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[id,manifest.repository,manifest.mainSha,manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`,
    `UPDATE cms_imports SET main_sha = CASE WHEN NOT (${completed}) AND ((SELECT COUNT(*) FROM cms_content WHERE ${scope}) != ${rows.length} OR EXISTS (SELECT 1 FROM cms_content WHERE ${scope} AND NOT (${exact})) OR EXISTS (SELECT 1 FROM cms_imports WHERE snapshot_id LIKE ${sql(prefix+'%')})) THEN NULL ELSE main_sha END WHERE snapshot_id = ${sql(id)};`,
    `DELETE FROM cms_content WHERE ${scope} AND NOT (${completed});`,
    ...entries.map((entry)=>`INSERT INTO cms_content(${columns.join(',')},snapshot_id) SELECT ${[...values(entry),id].map(sql).join(',')} WHERE NOT (${completed});`),
    `INSERT INTO cms_imports(snapshot_id,repository,main_sha,captured_at) VALUES (${[marker,manifest.repository,manifest.mainSha,manifest.capturedAt].map(sql).join(',')}) ON CONFLICT(snapshot_id) DO NOTHING;`,
  ].join('\n')+'\n';
}
