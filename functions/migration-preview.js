import { onRequest as readServices } from './api/migration-preview.js';

const escape = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Server-rendered proof of runtime reads. This uses the same preview-only gate
// as the API and never replaces the public Astro pages.
export async function onRequest(context) {
  const result = await readServices(context);
  if (!result.ok) return result;
  const { entries } = await result.json();
  const cards = entries.map(({ slug, data }) => `<li data-slug="${escape(slug)}"><h2>${escape(data.judul)}</h2><p>${escape(data.ringkasan)}</p></li>`).join('');
  return new Response(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Pratinjau layanan</title>
<style>body{margin:0;background:#f5f7fa;color:#152c38;font:16px/1.6 system-ui,sans-serif}main{max-width:48rem;margin:auto;padding:clamp(1rem,4vw,3rem)}h1{font-size:clamp(1.75rem,4vw,2.5rem);line-height:1.2}h2{font-size:1.125rem;margin:0}ul{list-style:none;padding:0;display:grid;gap:1rem}li{background:white;border:1px solid #dce3e8;border-radius:.75rem;padding:1.25rem;overflow-wrap:anywhere}p{margin:.5rem 0}a{color:#126548;font-weight:600}a:focus-visible{outline:3px solid #126548;outline-offset:4px}</style>
</head><body><main><h1>Pratinjau layanan</h1><p>${entries.length} layanan terbit</p><a href="/migration-preview">Muat ulang layanan</a><ul>${cards}</ul>${entries.length ? '' : '<p>Belum ada layanan terbit.</p>'}</main></body></html>`, { headers: {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  } });
}
