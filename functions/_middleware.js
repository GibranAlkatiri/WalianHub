import { publicLayananEnabled, publishedLayanan, PUBLIC_HEADERS } from '../server/published-layanan.js';
import { parseLayananTemplates, renderLayanan } from '../server/layanan-template.js';

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  const home = ['/', '/index.html'].includes(path);
  const services = ['/layanan', '/layanan/', '/layanan/index.html'].includes(path);
  if ((!home && !services) || !publicLayananEnabled(env)) return context.next();
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status:405, headers:{...PUBLIC_HEADERS, allow:'GET, HEAD'} });
  // Static validators must not turn a fresh D1 read into a stale 304 response.
  const headers = new Headers(request.headers);
  for (const name of ['if-none-match', 'if-modified-since', 'range', 'if-range', 'accept-encoding']) headers.delete(name);
  const asset = await env.ASSETS.fetch(new Request(request.url, { headers }));
  if (!asset.ok || !asset.headers.get('content-type')?.includes('text/html')) return asset;
  let content, status = 200, error = false;
  try {
    const [entries, template] = await Promise.all([
      publishedLayanan(env), env.ASSETS.fetch(new Request(new URL('/cms-templates/layanan', request.url))),
    ]);
    if (!template.ok) throw new Error('Template tidak tersedia.');
    content = renderLayanan(entries, parseLayananTemplates(await template.text()), home ? 'home' : 'list');
  } catch {
    // Never resurrect withdrawn services from the old build during an outage.
    content = { cards:'', items:'', total:0, featured:0, updated:'' };status = 503;error = true;
  }
  const visible = (element, show) => show ? element.removeAttribute('hidden') : element.setAttribute('hidden', '');
  const rewriter = new HTMLRewriter()
    .on('[data-cms-service-cards]', { element(element) { element.setInnerContent(content.cards, {html:true});visible(element, content.featured > 0); } })
    .on('[data-cms-service-list]', { element(element) { element.setInnerContent(content.items, {html:true});visible(element, content.total > 0); } })
    .on('[data-cms-services-empty]', { element(element) {
      visible(element, home ? content.featured === 0 : content.total === 0);
      element.setInnerContent(error ? 'Informasi layanan belum dapat dimuat. Silakan muat ulang.' : home && content.total > 0 ? 'Lihat daftar lengkap untuk informasi layanan kelurahan.' : 'Daftar layanan sedang disiapkan.');
      if (error) element.setAttribute('role', 'status');
    } })
    .on('[data-cms-all-services]', { element(element) { visible(element, !error && content.total > content.featured); } })
    .on('[data-cms-services-updated]', { element(element) {
      visible(element, !!content.updated);
      if (content.updated) element.setInnerContent('Terakhir diperbarui: ' + new Date(content.updated + 'T00:00:00Z').toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'}));
      else element.setInnerContent('');
    } });
  const dynamicHeaders = new Headers(asset.headers);
  for (const name of ['etag', 'last-modified', 'content-length', 'content-encoding']) dynamicHeaders.delete(name);
  for (const [name,value] of Object.entries(PUBLIC_HEADERS)) dynamicHeaders.set(name,value);
  dynamicHeaders.set('x-walian-layanan', 'd1');
  if (error) dynamicHeaders.set('retry-after', '5');
  if (request.method === 'HEAD') {
    await asset.body?.cancel();
    return new Response(null, {status, headers:dynamicHeaders});
  }
  return rewriter.transform(new Response(asset.body, {status, headers:dynamicHeaders}));
}
