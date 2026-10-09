import { load, dump, JSON_SCHEMA } from 'js-yaml';

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: HEADERS });
class CmsError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const fail = (message, status) => { throw new CmsError(message, status); };
const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');
const validSlug = (slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
const bytes64 = (value) => Uint8Array.from(atob(value.replace(/\s/g, '')), (c) => c.charCodeAt(0));
const text64 = (value) => new TextDecoder().decode(bytes64(value));

export function parseContent(raw, path) {
  if (path.endsWith('.json')) return JSON.parse(raw);
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) fail('Format konten tidak dikenali.', 422);
  return { ...load(match[1], { schema: JSON_SCHEMA }), body: match[2].replace(/^\r?\n/, '') };
}

export function serializeContent(data, path) {
  if (!data || Array.isArray(data) || typeof data !== 'object') fail('Isian konten tidak valid.');
  if (path.endsWith('.json')) return JSON.stringify(data, null, 2) + '\n';
  const { body = '', ...frontmatter } = data;
  return '---\n' + dump(frontmatter, { schema: JSON_SCHEMA, lineWidth: -1, noRefs: true }) + '---\n\n' + String(body).replace(/\s+$/, '') + '\n';
}

function target(config, collectionName, slug) {
  const collection = config.collections.find((item) => item.name === collectionName);
  if (!collection || !validSlug(slug)) fail('Konten tidak dikenali.', 404);
  const file = collection.files?.find((item) => item.name === slug);
  if (collection.files && !file) fail('Konten tidak dikenali.', 404);
  const path = file?.file || `${collection.folder}/${slug}.${collection.extension || 'md'}`;
  if (!/^src\/content\/[a-z0-9-]+\/[a-z0-9-]+\.(md|json)$/.test(path)) fail('Lokasi konten tidak diperbolehkan.', 403);
  return { collection, fields: file?.fields || collection.fields, path, branch: `cms/${collectionName}/${slug}`, slug, collectionName, label: file?.label };
}

function publicConfig(config) {
  return { collections: config.collections, site_url: config.site_url, media_folder: config.media_folder, public_folder: config.public_folder };
}

// The session token already issued by /api/auth is validated on the server.
// No repository or GitHub API URL is accepted from the browser.
export function createCmsHandler(fetchGitHub = fetch) {
  return async function onRequest({ request, env }) {
    try {
      if (!['GET', 'POST'].includes(request.method)) return response({ error: 'Metode tidak didukung.' }, 405);
      const secret = String(env.GITHUB_TOKEN || '').trim();
      const supplied = request.headers.get('authorization') || '';
      let mismatch = supplied.length ^ (`Bearer ${secret}`).length;
      for (let i = 0; i < Math.max(supplied.length, secret.length + 7); i++) mismatch |= (supplied.charCodeAt(i) || 0) ^ ((`Bearer ${secret}`).charCodeAt(i) || 0);
      if (!secret || mismatch) fail('Sesi berakhir. Silakan masuk kembali.', 401);
      const url = new URL(request.url);
      if (request.method === 'POST' && request.headers.has('origin') && request.headers.get('origin') !== url.origin) fail('Permintaan harus berasal dari panel ini.', 403);
      const asset = await env.ASSETS.fetch(new Request(new URL('/admin/config.yml', url)));
      if (!asset.ok) fail('Konfigurasi panel tidak tersedia.', 503);
      const config = load(await asset.text(), { schema: JSON_SCHEMA });
      if (!/^[\w.-]+\/[\w.-]+$/.test(config.backend?.repo) || !/^[\w/-]+$/.test(config.backend?.branch || '')) fail('Konfigurasi repository tidak valid.', 503);
      const repo = config.backend.repo;
      const main = config.backend.branch;
      const gh = async (path, method = 'GET', body, allow404 = false, publicReadFallback = false) => {
        const headers = { Authorization: `Bearer ${secret}`, Accept: 'application/vnd.github+json', 'User-Agent': 'WalianHub-CMS', 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'content-type': 'application/json' } : {}) };
        const send = (requestHeaders) => fetchGitHub(`https://api.github.com/repos/${repo}/${path}`, {
          method,
          headers: requestHeaders,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }).catch(() => fail('GitHub belum dapat dihubungi. Coba kembali.', 502));
        let res = await send(headers);
        if (res.status === 403 && method === 'GET' && publicReadFallback) {
          // Fine-grained PATs cannot grant Checks access. Public repositories
          // expose read-only check results anonymously; never retry writes.
          const { Authorization, ...publicHeaders } = headers;
          res = await send(publicHeaders);
        }
        if (res.status === 404 && allow404) return null;
        if (!res.ok) {
          if ([409, 422].includes(res.status)) fail('Konten berubah atau mengalami konflik. Muat ulang sebelum menyimpan.', 409);
          fail([401, 403].includes(res.status) ? 'Akses GitHub ditolak. Hubungi pengelola panel.' : 'GitHub belum dapat dihubungi. Coba kembali.', 502);
        }
        return res.status === 204 ? null : res.json();
      };
      const all = async (path) => {
        const result = [];
        for (let page = 1; page <= 10; page++) {
          const items = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
          result.push(...items);
          if (items.length < 100) return result;
        }
        fail('Daftar terlalu besar untuk dimuat sekaligus.', 503);
      };
      const ref = (branch, optional = false) => gh(`git/ref/heads/${encodePath(branch)}`, 'GET', undefined, optional);
      const content = (path, branch) => gh(`contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, 'GET', undefined, true);
      const pulls = (state = 'open') => all(`pulls?state=${state}&base=${encodeURIComponent(main)}`);
      const pullFor = async (branch) => (await pulls()).find((pr) => pr.head.ref === branch && pr.head.repo?.full_name === repo);
      const allowedChange = (file, t) => [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])].every((path) => path === t.path || /^public\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(path));
      const draftState = async (t, published, draftRef, history) => {
        const draft = draftRef ? await content(t.path, t.branch) : null;
        const related = history.filter((pr) => pr.head.ref === t.branch && pr.head.repo?.full_name === repo);
        const pr = related.find((pr) => pr.state === 'open');
        const draftCommit = draftRef ? await gh(`git/commits/${draftRef.object.sha}`) : null;
        const retired = related.some((pr) => pr.merged_at && pr.head.sha === draftRef?.object.sha) || draftCommit?.message === `Buang draf ${t.collectionName}: ${t.slug}`;
        // The immutable blob preserves the editable content after withdrawal,
        // including after the removal PR is merged or main changes again.
        const withdrawalBlob = draftCommit?.message?.match(new RegExp(`^Tarik ke draf ${t.collectionName}: ${t.slug}\\n\\nKonten-draf: ([a-f0-9]{40})$`))?.[1];
        const withdrawn = !!withdrawalBlob && !published;
        const hasDraft = withdrawn || (!!draftRef && !retired && (!!pr || (draft?.sha || null) !== (published?.sha || null)));
        const retained = hasDraft && withdrawalBlob ? await gh(`git/blobs/${withdrawalBlob}`) : null;
        const chosen = hasDraft ? draft || retained || published : published;
        return {
          slug: t.slug, collection: t.collectionName, label: t.label,
          status: hasDraft ? 'draft' : 'published', published: !!published, deleted: hasDraft && !draft && !withdrawn,
          withdrawal: hasDraft && !!withdrawalBlob, withdrawn,
          revision: hasDraft ? draftRef.object.sha : null, publishedSha: published?.sha || null,
          data: chosen ? parseContent(text64(chosen.content), t.path) : {},
          ...(hasDraft && !pr && !withdrawn ? { warning: 'Draf sudah tersimpan. Pemeriksaan belum dimulai; buka konten lalu klik Simpan draf lagi. Jika tetap gagal, hubungi pengelola panel.' } : {}),
        };
      };
      const entry = async (t) => {
        const [published, draftRef] = await Promise.all([content(t.path, main), ref(t.branch, true)]);
        return draftState(t, published, draftRef, draftRef ? await pulls('all') : []);
      };
      if (request.method === 'GET') {
        const action = url.searchParams.get('action') || 'list';
        if (action === 'config') return response(publicConfig(config));
        const collectionName = url.searchParams.get('collection');
        const collection = config.collections.find((item) => item.name === collectionName);
        if (!collection) fail('Menu tidak dikenali.', 404);
        if (action === 'entry') return response(await entry(target(config, collectionName, url.searchParams.get('slug'))));
        if (action === 'asset') {
          const t = target(config, collectionName, url.searchParams.get('slug'));
          const path = url.searchParams.get('path') || '';
          if (!/^\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(path)) fail('Gambar tidak dikenali.', 404);
          const file = await content(`public${path}`, url.searchParams.get('draft') === '1' ? t.branch : main);
          if (!file) fail('Gambar belum tersedia.', 404);
          return new Response(bytes64(file.content), { headers: { 'content-type': path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
        }
        if (action !== 'list') fail('Tindakan tidak dikenali.', 404);
        const [listing, draftRefs, openPulls] = await Promise.all([
          collection.files ? Promise.resolve([]) : content(collection.folder, main),
          gh(`git/matching-refs/heads/cms/${encodeURIComponent(collectionName)}/`), pulls('all'),
        ]);
        const slugs = new Set(collection.files ? collection.files.map((item) => item.name) : (listing || []).filter((item) => item.type === 'file' && item.name.endsWith(`.${collection.extension || 'md'}`)).map((item) => item.name.replace(/\.[^.]+$/, '')));
        for (const branch of draftRefs) {
          const slug = branch.ref.split('/').at(-1);
          if (validSlug(slug) && (!collection.files || collection.files.some((f) => f.name === slug))) slugs.add(slug);
        }
        const entries = await Promise.all([...slugs].map(async (slug) => {
          const t = target(config, collectionName, slug);
          const [published, draftRef] = await Promise.all([content(t.path, main), Promise.resolve(draftRefs.find((r) => r.ref === `refs/heads/${t.branch}`))]);
          const item = await draftState(t, published, draftRef, openPulls);
          if (!item.published && !item.revision) return null;
          return { ...item, title: t.label || item.data[collection.identifier_field || 'judul'] || item.data.nama || slug, summary: item.data.ringkasan || '' };
        }));
        return response({ entries: entries.filter(Boolean) });
      }
      if (!request.headers.get('content-type')?.includes('application/json')) fail('Format permintaan tidak valid.', 415);
      const text = await request.text();
      if (text.length > 36 * 1024 * 1024) fail('Ukuran unggahan terlalu besar.', 413);
      const body = JSON.parse(text);
      const t = target(config, body.collection, body.slug);
      const current = await entry(t);
      if (current.revision !== (body.revision || null) || current.publishedSha !== (body.publishedSha || null)) fail('Konten telah berubah. Muat ulang agar perubahan lain tidak tertimpa.', 409);
      if (body.action === 'discard') {
        if (!current.revision) fail('Tidak ada draf untuk dibuang.', 404);
        const mainRef = await ref(main);
        const publishedCommit = await gh(`git/commits/${mainRef.object.sha}`);
        const discarded = await gh('git/commits', 'POST', { message: `Buang draf ${body.collection}: ${body.slug}`, tree: publishedCommit.tree.sha, parents: [...new Set([current.revision, mainRef.object.sha])] });
        // A simultaneous save cannot be overwritten by this fast-forward CAS.
        await gh(`git/refs/heads/${encodePath(t.branch)}`, 'PATCH', { sha: discarded.sha, force: false });
        return response({ ok: true });
      }
      if (body.action === 'publish') {
        if (!current.revision) fail('Simpan draf terlebih dahulu.', 409);
        const pr = await pullFor(t.branch);
        if (!pr) fail('Draf belum siap diterbitkan. Simpan kembali.', 409);
        let detail = await gh(`pulls/${pr.number}`);
        for (let attempt = 0; attempt < 2 && (detail.mergeable == null || detail.mergeable_state === 'unknown'); attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          detail = await gh(`pulls/${pr.number}`);
        }
        if (detail.head.sha !== current.revision || detail.base.ref !== main) fail('Draf berubah. Muat ulang.', 409);
        const changed = await all(`pulls/${pr.number}/files`);
        if (!changed.length || changed.some((file) => !allowedChange(file, t))) fail('Draf memuat perubahan di luar konten ini. Hubungi pengelola.', 409);
        const latestMain = (await ref(main)).object.sha;
        const comparison = await gh(`compare/${latestMain}...${current.revision}`);
        if (comparison.behind_by > 0) fail('Versi website baru tersedia. Klik Simpan draf untuk memperbarui pemeriksaan, lalu coba Terbitkan kembali.', 409);
        const checks = await gh(`commits/${current.revision}/check-runs?filter=latest&per_page=100`, 'GET', undefined, false, true);
        const check = checks.check_runs.find((run) => run.name === 'check' && run.app?.slug === 'github-actions' && run.head_sha === current.revision);
        if (!check || check.status !== 'completed') fail('Konten sedang diperiksa. Draf sudah tersimpan; coba Terbitkan kembali sebentar lagi.', 409);
        if (check.conclusion !== 'success') fail('Pemeriksaan konten belum berhasil. Perbaiki isian sebelum menerbitkan.', 422);
        if (detail.mergeable == null || detail.mergeable_state === 'unknown') fail('Kesiapan penerbitan masih diperiksa. Tunggu sebentar, lalu coba lagi. Draf sudah tersimpan.', 409);
        if (detail.mergeable === false || detail.mergeable_state === 'dirty') fail('Draf berbenturan dengan versi website terbaru. Muat ulang konten, simpan draf, lalu coba lagi.', 409);
        if (detail.mergeable_state !== 'clean') fail('Penerbitan masih tertahan oleh pemeriksaan atau persetujuan GitHub. Draf sudah tersimpan; coba lagi setelah pemeriksaan selesai.', 409);
        const merged = await gh(`pulls/${pr.number}/merge`, 'PUT', { sha: current.revision, merge_method: 'squash', commit_title: `${current.withdrawal ? 'Tarik ke draf' : current.deleted ? 'Hapus' : 'Terbitkan'} ${body.collection}: ${body.slug}` });
        if (!merged.merged) fail('Penerbitan belum berhasil. Draf tetap tersimpan.', 409);
        // Keep the merged branch as history. Identical branches are ignored in
        // lists and reused for the next draft; never delete a live edit.
        return response({ ok: true, message: current.withdrawal ? 'Konten ditarik ke draf. Isinya tetap tersimpan; website diperbarui setelah deployment selesai.' : current.deleted ? 'Konten dihapus. Website diperbarui setelah deployment selesai.' : 'Konten berhasil diterbitkan. Website diperbarui setelah deployment selesai.' });
      }
      if (!['save', 'delete', 'withdraw'].includes(body.action)) fail('Tindakan tidak dikenali.');
      const removing = ['delete', 'withdraw'].includes(body.action);
      if (removing && (t.collection.delete === false || t.collection.files)) fail('Konten ini tidak boleh dihapus atau ditarik dari website.', 403);
      if (removing && !current.published) fail('Konten ini belum terbit. Gunakan Hapus untuk membuang draf.');
      if (body.action === 'withdraw' && current.deleted) fail('Selesaikan atau batalkan penghapusan terlebih dahulu.', 409);
      const retained = body.action === 'withdraw' ? await content(t.path, current.revision ? t.branch : main) : null;
      const uploads = body.uploads || [];
      if (!Array.isArray(uploads) || uploads.length > 5) fail('Unggah maksimal 5 foto dalam satu penyimpanan.');
      const preparedUploads = uploads.map((upload) => {
        if (!/^public\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp)$/.test(upload.path || '')) fail('Lokasi foto tidak diperbolehkan.');
        let bytes; try { bytes = bytes64(upload.content || ''); } catch { fail('Foto tidak valid.'); }
        if (!bytes.length || bytes.length > 5 * 1024 * 1024) fail('Setiap foto maksimal 5 MB.');
        const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
        const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
        if (!(upload.path.endsWith('.png') ? png : upload.path.endsWith('.webp') ? webp : jpg)) fail('Foto harus berupa JPEG, PNG, atau WebP yang valid.');
        return { path: upload.path, content: upload.content };
      });
      const oldRef = await ref(t.branch, true);
      const mainHead = (await ref(main)).object.sha;
      if ((await content(t.path, mainHead))?.sha !== (body.publishedSha || undefined)) fail('Versi terbit baru berubah. Muat ulang sebelum menyimpan.', 409);
      const parent = current.revision || oldRef?.object.sha || mainHead;
      const commit = await gh(`git/commits/${mainHead}`);
      const changes = [];
      if (current.revision) {
        const pr = await pullFor(t.branch);
        // Carry forward draft photos while basing the new snapshot on current
        // main, so the CI check uses the latest schema and website code.
        let previous;
        if (pr) previous = await all(`pulls/${pr.number}/files`);
        else {
          const tree = await gh(`git/trees/${(await gh(`git/commits/${current.revision}`)).tree.sha}?recursive=1`);
          if (tree.truncated) fail('Draf terlalu besar untuk diperbarui. Hubungi pengelola.', 503);
          previous = tree.tree.filter((item) => item.path.startsWith('public/uploads/')).map((item) => ({ filename: item.path, sha: item.sha }));
        }
        if (previous.some((file) => !allowedChange(file, t))) fail('Draf memuat perubahan di luar konten ini. Hubungi pengelola.', 409);
        for (const file of previous) if (file.filename !== t.path && file.status !== 'removed') changes.push({ path: file.filename, mode: '100644', type: 'blob', sha: file.sha });
      }
      if (removing) changes.push({ path: t.path, mode: '100644', type: 'blob', sha: null });
      else {
        const allowed = new Set(t.fields.map((field) => field.name));
        const data = Object.fromEntries(Object.entries(body.data || {}).filter(([key]) => allowed.has(key)));
        if (allowed.has('diperbarui') && !data.diperbarui) data.diperbarui = new Date().toISOString().slice(0, 10);
        if (data.lokasi && typeof data.lokasi.alamat === 'string') {
          let address = data.lokasi.alamat;
          try { address = decodeURIComponent(address); } catch { /* literal address */ }
          const coordinate = /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(address) || /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i.exec(address) || /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(address);
          if (coordinate && Math.abs(Number(coordinate[1])) <= 90 && Math.abs(Number(coordinate[2])) <= 180) Object.assign(data.lokasi, { lat: Number(coordinate[1]), lng: Number(coordinate[2]) });
        }
        const raw = serializeContent(data, t.path);
        const blob = await gh('git/blobs', 'POST', { content: raw, encoding: 'utf-8' });
        changes.push({ path: t.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      for (const upload of preparedUploads) {
        const [publishedPhoto, draftPhoto] = await Promise.all([
          content(upload.path, mainHead),
          current.revision ? content(upload.path, current.revision) : Promise.resolve(null),
        ]);
        if (publishedPhoto || draftPhoto) fail('Nama foto sudah digunakan. Pilih ulang foto agar tidak menimpa gambar lain.', 409);
        const blob = await gh('git/blobs', 'POST', { content: upload.content, encoding: 'base64' });
        changes.push({ path: upload.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const tree = await gh('git/trees', 'POST', { base_tree: commit.tree.sha, tree: changes });
      const saved = await gh('git/commits', 'POST', { message: retained ? `Tarik ke draf ${body.collection}: ${body.slug}\n\nKonten-draf: ${retained.sha}` : `Simpan draf ${body.collection}: ${body.slug}`, tree: tree.sha, parents: [...new Set([parent, ...(mainHead ? [mainHead] : [])])] });
      if (oldRef) await gh(`git/refs/heads/${encodePath(t.branch)}`, 'PATCH', { sha: saved.sha, force: false });
      else await gh('git/refs', 'POST', { ref: `refs/heads/${t.branch}`, sha: saved.sha });
      try {
        if (!(await pullFor(t.branch))) await gh('pulls', 'POST', { title: `Konten ${body.collection}: ${body.slug}`, head: t.branch, base: main, body: 'Draf konten CMS. Penerbitan dilakukan melalui panel setelah pemeriksaan berhasil.' });
      } catch (error) {
        return response({ ...await entry(t), warning: 'Draf sudah tersimpan. Pemeriksaan belum dimulai; coba Simpan draf lagi. Jika tetap gagal, hubungi pengelola panel.' });
      }
      return response(await entry(t));
    } catch (error) {
      return response({ error: error instanceof CmsError ? error.message : 'Permintaan tidak dapat diproses. Periksa isian lalu coba kembali.' }, error instanceof CmsError ? error.status : 400);
    }
  };
}

export const onRequest = createCmsHandler();
