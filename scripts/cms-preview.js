import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createCmsHandler } from '../functions/api/cms.js';
import { fakeGithub } from '../tests/helpers/cms-github.js';

const repo = resolve(import.meta.dir, '..');
const files = {};
for await (const path of new Bun.Glob('src/content/**/*.{md,json}').scan({ cwd: repo })) files[path.replaceAll('\\', '/')] = await readFile(resolve(repo, path), 'utf8');
const config = await readFile(resolve(repo, 'public/admin/config.yml'), 'utf8');
const github = fakeGithub(files);
const handler = createCmsHandler(github.fetch);
const env = { GITHUB_TOKEN: 'local-preview-only', ASSETS: { fetch: async () => new Response(config) } };
const types = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.yml': 'text/yaml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = Bun.serve({
  hostname: '127.0.0.1', port: Number(process.env.CMS_PREVIEW_PORT || 54584),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cms') return handler({ request, env });
    if (url.pathname === '/api/auth' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      return Response.json(body.username === 'walian' && body.password === 'demo' ? { ok: true, token: env.GITHUB_TOKEN } : { error: 'Mode uji: gunakan username walian dan password demo.' }, { status: body.username === 'walian' && body.password === 'demo' ? 200 : 401 });
    }
    const path = resolve(repo, 'public', '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!path.startsWith(resolve(repo, 'public') + (process.platform === 'win32' ? '\\' : '/'))) return new Response('Not found', { status: 404 });
    try {
      let data = await readFile(path);
      if (url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
        const preview = `<script>window.WALIAN_DEMO=true;if(!sessionStorage.getItem('cms-demo-visited')){localStorage.setItem('decap-cms-user',JSON.stringify({token:'local-preview-only',backendName:'github'}));sessionStorage.setItem('cms-demo-visited','1');}</script>`;
        data = Buffer.from(data.toString().replace('<body>', '<body>' + preview).replace('Khusus pengelola konten kelurahan.', 'Pratinjau lokal: username walian, password demo.'));
      }
      return new Response(data, { headers: { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } });
    } catch { return new Response('Not found', { status: 404 }); }
  },
});
console.log(`PREVIEW ${server.url}admin/`);
