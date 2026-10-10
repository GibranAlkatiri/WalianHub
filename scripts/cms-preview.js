import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { load } from 'js-yaml';
import { createCmsHandler } from '../functions/api/cms.js';
import { fakeGithub } from '../tests/helpers/cms-github.js';
import { sqliteD1 } from '../tests/helpers/d1-sqlite.js';
import { onRequestGet, onRequestPost, onRequestDelete } from '../functions/api/auth.js';
import { sha256 } from '../server/cms-session.js';

const repo = resolve(import.meta.dir, '..');
const files = {};
for await (const path of new Bun.Glob('src/content/**/*.{md,json}').scan({ cwd: repo })) files[path.replaceAll('\\', '/')] = await readFile(resolve(repo, path), 'utf8');
const config = await readFile(resolve(repo, 'public/admin/config.yml'), 'utf8');
const github = fakeGithub(files, load(config).backend.repo);
const handler = createCmsHandler(github.fetch);
const sessions = sqliteD1(await readFile(resolve(repo, 'migrations/0002_sessions.sql'), 'utf8'));
const env = { CMS_SESSION_AUTH: process.env.CMS_PREVIEW_AUTH === 'legacy' ? '0' : '1', CMS_DB: sessions, CMS_USERNAME: 'walian', CMS_PASSWORD_HASH: await sha256('demo'), GITHUB_TOKEN: 'local-preview-only', ASSETS: { fetch: async () => new Response(config) } };
const types = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.yml': 'text/yaml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = Bun.serve({
  hostname: '127.0.0.1', port: Number(process.env.CMS_PREVIEW_PORT || 54584),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cms') return handler({ request, env });
    if (url.pathname === '/api/auth') {
      const route = { GET: onRequestGet, POST: onRequestPost, DELETE: onRequestDelete }[request.method];
      return route ? route({ request, env }) : new Response(null, { status: 405 });
    }
    const path = resolve(repo, 'public', '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!path.startsWith(resolve(repo, 'public') + (process.platform === 'win32' ? '\\' : '/'))) return new Response('Not found', { status: 404 });
    try {
      let data = await readFile(path);
      if (url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
        const preview = '<script>window.WALIAN_DEMO=true;</script>';
        data = Buffer.from(data.toString().replace('<body>', '<body>' + preview).replace('Khusus pengelola konten kelurahan.', 'Pratinjau lokal: username walian, password demo.'));
      }
      return new Response(data, { headers: { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' } });
    } catch { return new Response('Not found', { status: 404 }); }
  },
});
console.log(`PREVIEW ${server.url}admin/`);
