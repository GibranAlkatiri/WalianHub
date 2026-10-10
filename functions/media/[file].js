import { load, JSON_SCHEMA } from 'js-yaml';
import { mediaEnabled, mediaPaths, downloadMedia, UUID, MediaError } from '../../server/cms-media.js';
import { readSession, SessionError } from '../../server/cms-session.js';
import { PUBLIC_HEADERS } from '../../server/published-layanan.js';
import { target, parseContent } from '../api/cms.js';

// Until each content menu migrates, read its publication from the current main.
// Only text metadata uses GitHub; image bytes always come from Cloudinary.
async function published(row,request,env,fetchGitHub) {
  if (row.collection === 'layanan' && env.CMS_LAYANAN_D1 === '1') {
    const content = await env.CMS_DB.prepare('SELECT published_json FROM cms_content WHERE collection = ? AND slug = ?').bind(row.collection,row.slug).first();
    return !!content?.published_json && mediaPaths(JSON.parse(content.published_json)).includes(row.public_path);
  }
  const asset = await env.ASSETS.fetch(new Request(new URL('/admin/config.yml',request.url)));
  if (!asset.ok) throw new MediaError('Foto belum dapat dimuat.');
  const config = load(await asset.text(),{schema:JSON_SCHEMA});
  if (target(config,row.collection,row.slug).path !== row.source_path || !/^[\w.-]+\/[\w.-]+$/.test(config.backend?.repo) || !/^[\w/-]+$/.test(config.backend?.branch || '') || !env.GITHUB_TOKEN) throw new MediaError('Foto belum dapat dimuat.');
  const url = `https://api.github.com/repos/${config.backend.repo}/contents/${row.source_path}?ref=${encodeURIComponent(config.backend.branch)}`;
  const response = await fetchGitHub(url,{headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','User-Agent':'WalianHub-CMS'},signal:AbortSignal.timeout(10000)});
  if (response.status === 404) return false;
  if (!response.ok) throw new MediaError('Foto belum dapat dimuat.');
  const content = await response.json();
  if (content.encoding !== 'base64' || typeof content.content !== 'string') throw new MediaError('Foto belum dapat dimuat.');
  const raw = new TextDecoder().decode(Uint8Array.from(atob(content.content.replace(/\s/g,'')),(char)=>char.charCodeAt(0)));
  return mediaPaths(parseContent(raw,row.source_path)).includes(row.public_path);
}
export function createImageHandler(fetchProvider = fetch, fetchGitHub = fetch) {
  return async ({request,env}) => {
    const path = new URL(request.url).pathname;
    if (!mediaEnabled(env) || !new RegExp('^/media/' + UUID + '\\.(jpg|png|webp)$').test(path)) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...PUBLIC_HEADERS,allow:'GET, HEAD'}});
    try {
      const row = await env.CMS_DB.prepare('SELECT * FROM cms_media WHERE public_path = ? AND ready = 1').bind(path).first();
      if (!row) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
      let authenticated = false;
      if (request.headers.has('cookie')) {
        try { await readSession(request,env);authenticated = true; }
        catch (error) { if (!(error instanceof SessionError) || error.status !== 401) throw error; }
      }
      if (!authenticated && !await published(row,request,env,fetchGitHub)) return new Response(null,{status:404,headers:PUBLIC_HEADERS});
      const headers = {...PUBLIC_HEADERS,'content-type':row.content_type,'content-disposition':'inline','cross-origin-resource-policy':'same-origin','x-robots-tag':'noindex'};
      if (request.method === 'HEAD') return new Response(null,{headers});
      const response = await downloadMedia(row,env,fetchProvider);
      return new Response(response.body,{headers});
    } catch { return new Response(null,{status:503,headers:PUBLIC_HEADERS}); }
  };
}
export const onRequest = createImageHandler();
