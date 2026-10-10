import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { load, JSON_SCHEMA } from 'js-yaml';
import { createCmsHandler, parseContent } from '../../functions/api/cms.js';

export const gitBlobSha = (bytes) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const jsonResponse = (data) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const imagePath = (path) => /^(public\/(uploads|images)\/|src\/assets\/).+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(path);
const contentPath = (path) => /^src\/content\/.+\.(md|json)$/.test(path);
const entryPath = (collection, slug) => collection.files?.find((file) => file.name === slug)?.file || `${collection.folder}/${slug}.${collection.extension || 'md'}`;
const localImages = (value) => {
  if (typeof value === 'string') return [...value.matchAll(/(?:^|[\s("'=])(\/(?:uploads|images)\/[a-zA-Z0-9_./% -]+\.(?:png|jpe?g|webp|gif|svg|avif))/gi)].map(([, path]) => `public${decodeURIComponent(path)}`);
  if (value && typeof value === 'object') return Object.values(value).flatMap(localImages);
  return [];
};

// GET-only, immutable main/draft SHAs. Use the existing CMS handler so merged,
// discarded and withdrawn drafts have exactly the same meaning as in the CMS.
export async function captureSnapshot(repo, main = 'main', fetchGitHub = fetch, token = '') {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[\w/-]+$/.test(main)) throw new Error('Repository atau branch tidak valid.');
  const base = `https://api.github.com/repos/${repo}/`;
  const cache = new Map();
  const get = async (path, optional = false) => {
    const res = await fetchGitHub(base + path, { method: 'GET', headers: {
      Accept: 'application/vnd.github+json', 'User-Agent': 'WalianHub-Backup',
      'X-GitHub-Api-Version': '2026-03-10', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } });
    if (optional && res.status === 404) return null;
    if (!res.ok) throw new Error(`Pembacaan cadangan gagal (HTTP ${res.status}).`);
    return res.json();
  };
  const immutable = (path) => {
    if (!cache.has(path)) cache.set(path, get(path));
    return cache.get(path);
  };
  const paginate = async (path) => {
    const result = [];
    for (let page = 1; page <= 100; page++) {
      const rows = await get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(rows)) throw new Error('Daftar sumber cadangan tidak valid.');
      result.push(...rows);
      if (rows.length < 100) return result;
    }
    throw new Error('Daftar cadangan melampaui batas; ekspor dihentikan.');
  };
  const refs = await paginate('git/matching-refs/heads/');
  const mainRef = refs.find((ref) => ref.ref === `refs/heads/${main}`);
  if (!mainRef) throw new Error('Branch utama tidak ditemukan.');
  const mainSha = mainRef.object.sha;
  const pulls = await paginate(`pulls?state=all&base=${encodeURIComponent(main)}`);
  const sourceRefs = new Map(refs.map((ref) => [ref.ref.replace('refs/heads/', ''), ref.object.sha]));
  const tree = async (sha) => {
    const commit = await immutable(`git/commits/${sha}`);
    const result = await immutable(`git/trees/${commit.tree.sha}?recursive=1`);
    if (result.truncated) throw new Error('Pohon sumber terpotong; cadangan tidak lengkap.');
    return result.tree.filter((file) => file.type === 'blob');
  };
  const blobs = new Map();
  const blob = async (sha) => {
    if (!blobs.has(sha)) {
      const value = await immutable(`git/blobs/${sha}`);
      if (value.encoding !== 'base64') throw new Error('Encoding objek cadangan tidak dikenali.');
      const bytes = Buffer.from(value.content, 'base64');
      if (gitBlobSha(bytes) !== sha) throw new Error('Integritas objek Git tidak cocok.');
      blobs.set(sha, bytes);
    }
    return blobs.get(sha);
  };
  const mainTree = await tree(mainSha);
  const configFile = mainTree.find((file) => file.path === 'public/admin/config.yml');
  if (!configFile) throw new Error('Konfigurasi CMS tidak ditemukan.');
  const configText = (await blob(configFile.sha)).toString('utf8');
  const config = load(configText, { schema: JSON_SCHEMA });
  if (config.backend.repo !== repo || config.backend.branch !== main) throw new Error('Tujuan CMS berbeda dari sumber cadangan.');
  const pinnedFetch = async (input, init = {}) => {
    if (init.method && init.method !== 'GET') throw new Error('Cadangan tidak boleh menulis ke GitHub.');
    const url = new URL(input);
    if (!url.href.startsWith(base)) throw new Error('Sumber pembacaan di luar repository.');
    const path = decodeURIComponent(url.pathname.slice(new URL(base).pathname.length));
    if (path === 'pulls') {
      const page = Number(url.searchParams.get('page') || 1);
      return jsonResponse(pulls.slice((page - 1) * 100, page * 100));
    }
    if (path.startsWith('git/matching-refs/heads/')) return jsonResponse(refs.filter((ref) => ref.ref.startsWith('refs/heads/' + path.slice(24))));
    if (path.startsWith('git/ref/heads/')) {
      const ref = refs.find((ref) => ref.ref === 'refs/heads/' + path.slice(14));
      return ref ? jsonResponse(ref) : new Response(null, { status: 404 });
    }
    if (path.startsWith('contents/')) {
      const branch = url.searchParams.get('ref');
      if (!sourceRefs.has(branch)) throw new Error('Branch cadangan tidak dikenali.');
      url.searchParams.set('ref', sourceRefs.get(branch));
      const value = await get(url.pathname.slice(new URL(base).pathname.length) + url.search, true);
      return value ? jsonResponse(value) : new Response(null, { status: 404 });
    }
    return jsonResponse(await immutable(url.pathname.slice(new URL(base).pathname.length) + url.search));
  };
  const handler = createCmsHandler(pinnedFetch);
  const entries = [], activeRefs = new Set([main]);
  for (const collection of config.collections) {
    const request = new Request(`http://localhost/api/cms?action=list&collection=${encodeURIComponent(collection.name)}`, { headers: { authorization: 'Bearer snapshot-reader' } });
    const res = await handler({ request, env: { GITHUB_TOKEN: 'snapshot-reader', ASSETS: { fetch: async () => new Response(configText) } } });
    if (!res.ok) throw new Error(`Inventaris ${collection.name} gagal (HTTP ${res.status}).`);
    for (const item of (await res.json()).entries) {
      const path = entryPath(collection, item.slug);
      const publishedFile = mainTree.find((file) => file.path === path);
      const version = async (sha) => sha ? { sha, data: parseContent((await blob(sha)).toString('utf8'), path) } : null;
      const published = await version(publishedFile?.sha);
      let draft = null;
      if (item.revision) {
        const branch = `cms/${collection.name}/${item.slug}`;
        activeRefs.add(branch);
        const draftTree = await tree(item.revision);
        const commit = await immutable(`git/commits/${item.revision}`);
        const retainedSha = item.withdrawal ? commit.message.match(/\n\nKonten-draf: ([a-f0-9]{40})$/)?.[1] : null;
        const fileSha = draftTree.find((file) => file.path === path)?.sha;
        const chosen = await version(fileSha || retainedSha || publishedFile?.sha);
        draft = { ...chosen, action: item.withdrawal ? 'withdraw' : item.deleted ? 'delete' : 'edit', revision: item.revision };
        if (JSON.stringify(chosen?.data || {}) !== JSON.stringify(item.data)) throw new Error('Isi draf berbeda dari hasil inventaris CMS.');
      }
      entries.push({ collection: collection.name, slug: item.slug, path, published, draft });
    }
  }
  const files = [];
  // Preserve all published content, including files outside configured menus.
  for (const file of mainTree.filter((file) => contentPath(file.path))) {
    await blob(file.sha); files.push({ source: main, path: file.path, sha: file.sha, kind: 'content' });
  }
  for (const branch of activeRefs) {
    const sourceTree = branch === main ? mainTree : await tree(sourceRefs.get(branch));
    for (const file of sourceTree.filter((file) => imagePath(file.path))) {
      const bytes = await blob(file.sha);
      files.push({ source: branch, path: file.path, sha: file.sha, kind: 'media', size: bytes.length });
    }
  }
  for (const entry of entries) {
    for (const [version, source] of [[entry.published, main], [entry.draft, `cms/${entry.collection}/${entry.slug}`]]) {
      for (const path of localImages(version?.data)) {
        if (!files.some((file) => file.kind === 'media' && file.source === source && file.path === path)) throw new Error('Foto yang dirujuk konten tidak ditemukan; cadangan belum lengkap.');
      }
    }
  }
  // Never certify a mixed snapshot while somebody is saving/publishing.
  const after = await paginate('git/matching-refs/heads/');
  const relevant = (rows) => rows.filter((ref) => ref.ref === `refs/heads/${main}` || ref.ref.startsWith('refs/heads/cms/')).map((ref) => [ref.ref, ref.object.sha]).sort();
  if (JSON.stringify(relevant(refs)) !== JSON.stringify(relevant(after))) throw new Error('Konten berubah selama cadangan. Jalankan ulang agar konsisten.');
  return { manifest: { format: 1, repository: repo, main, mainSha, capturedAt: new Date().toISOString(), configSha: configFile.sha, refs: Object.fromEntries([...activeRefs].map((branch) => [branch, sourceRefs.get(branch)])), entries, files }, blobs };
}

export async function writeSnapshot(snapshot, directory) {
  await mkdir(directory, { recursive: false });
  await mkdir(join(directory, 'objects'));
  for (const [sha, bytes] of snapshot.blobs) await writeFile(join(directory, 'objects', sha), bytes, { flag: 'wx' });
  const bytes = Buffer.from(JSON.stringify(snapshot.manifest, null, 2) + '\n');
  await writeFile(join(directory, 'manifest.json'), bytes, { flag: 'wx' });
  // Completion marker is written last; unfinished exports never pass verify.
  await writeFile(join(directory, 'manifest.sha256'), hash(bytes) + '\n', { flag: 'wx' });
}

export async function readSnapshot(directory) {
  const raw = await readFile(join(directory, 'manifest.json'));
  if ((await readFile(join(directory, 'manifest.sha256'), 'utf8')).trim() !== hash(raw)) throw new Error('Manifest cadangan rusak atau belum selesai.');
  const manifest = JSON.parse(raw);
  if (manifest.format !== 1 || !/^[a-f0-9]{40}$/.test(manifest.mainSha)) throw new Error('Format cadangan tidak dikenali.');
  const blobs = new Map();
  const verify = async (sha) => {
    if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Identitas objek cadangan tidak valid.');
    if (!blobs.has(sha)) {
      const bytes = await readFile(join(directory, 'objects', sha));
      if (gitBlobSha(bytes) !== sha) throw new Error('Objek cadangan rusak.');
      blobs.set(sha, bytes);
    }
    return blobs.get(sha);
  };
  await verify(manifest.configSha);
  const identities = new Set();
  for (const entry of manifest.entries) {
    const key = entry.collection + '/' + entry.slug;
    if (identities.has(key)) throw new Error('Identitas konten ganda.');
    identities.add(key);
    for (const version of [entry.published, entry.draft]) {
      if (version?.sha) {
        const data = parseContent((await verify(version.sha)).toString('utf8'), entry.path);
        if (JSON.stringify(data) !== JSON.stringify(version.data)) throw new Error('Isian cadangan berbeda dari objek asli.');
      }
    }
  }
  for (const file of manifest.files) {
    const bytes = await verify(file.sha);
    if (file.kind === 'media' && bytes.length !== file.size) throw new Error('Ukuran foto cadangan tidak cocok.');
  }
  return { manifest, blobs };
}

const sqlValue = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
export function snapshotSql(manifest) {
  const id = hash(JSON.stringify(manifest));
  const statements = [
    // One-time seed of an empty staging database. No overwrite/upsert.
    `INSERT INTO cms_imports(snapshot_id, repository, main_sha, captured_at) VALUES (CASE WHEN EXISTS (SELECT 1 FROM cms_content) OR EXISTS (SELECT 1 FROM cms_imports) THEN NULL ELSE ${sqlValue(id)} END,${[manifest.repository, manifest.mainSha, manifest.capturedAt].map(sqlValue).join(',')});`,
  ];
  for (const entry of manifest.entries) {
    const values = [entry.collection, entry.slug, entry.path, entry.published ? JSON.stringify(entry.published.data) : null, entry.published?.sha, entry.draft?.data ? JSON.stringify(entry.draft.data) : null, entry.draft?.sha, entry.draft?.action, entry.draft?.revision, id];
    statements.push(`INSERT INTO cms_content(collection,slug,source_path,published_json,published_blob_sha,draft_json,draft_blob_sha,draft_action,draft_revision,snapshot_id) VALUES (${values.map(sqlValue).join(',')});`);
  }
  for (const file of manifest.files.filter((file) => file.kind === 'media')) statements.push(`INSERT INTO cms_media_sources(source_ref,source_path,blob_sha,byte_length,snapshot_id) VALUES (${[file.source, file.path, file.sha, file.size, id].map(sqlValue).join(',')});`);
  return statements.join('\n') + '\n';
}
