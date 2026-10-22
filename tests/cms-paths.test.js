import { expect, test } from 'bun:test';
import { onRequest } from '../functions/_middleware.js';

test('variasi URL CMS diarahkan ke jalur kanonis sebelum aset atau API diproses', async () => {
  const cases = [
    ['/admin%2f', '/admin/'],
    ['/admin%2fauth-client.js', '/admin/auth-client.js'],
    ['/admin%2Fconfig.yml', '/admin/config.yml'],
    ['/ad%6din%2fconfig.yml', '/admin/config.yml'],
    ['/%61dmin/', '/admin/'],
    ['/admin%5cconfig.yml', '/admin/config.yml'],
    ['//admin//config.yml', '/admin/config.yml'],
    ['/api%2fauth', '/api/auth'],
    ['/api%2fcms', '/api/cms'],
    ['/api%2fmedia', '/api/media'],
    ['/api%2fvideo', '/api/video'],
    ['/api/video%2f', '/api/video/'],
    ['/api/auth%2f', '/api/auth/'],
  ];
  for (const [path, canonical] of cases) {
    const response = await onRequest({
      request: new Request('https://cms.example' + path + '?action=config'), env: {},
      next() { throw new Error('URL alternatif tidak boleh mencapai aset atau API.'); },
    });
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://cms.example' + canonical + '?action=config');
    expect(response.headers.get('cache-control')).toContain('no-store');
  }
});

test('POST alternatif CMS tidak memproses kredensial sebelum pengalihan', async () => {
  const response = await onRequest({
    request: new Request('https://cms.example/api%2fauth', { method:'POST', body:'{}' }), env: {},
    next() { throw new Error('Login tidak boleh diproses.'); },
  });
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe('https://cms.example/api/auth');
});

test('jalur kanonis, halaman publik, API publik, media dan layanan cleanup tetap diteruskan', async () => {
  for (const path of ['/admin', '/admin/', '/admin/config.yml', '/api/auth', '/api/cms', '/api/media', '/api/video', '/videos/video.mp4', '/', '/profil', '/layanan', '/wisata', '/api/pengaturan', '/api/media-cleanup', '/media/foto.jpg', '/images/nama%20foto.jpg']) {
    const response = await onRequest({
      request: new Request('https://cms.example' + path), env: {},
      next() { return new Response('diteruskan'); },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('diteruskan');
  }
});

test('escape persen yang rusak ditolak sebelum memuat aset', async () => {
  const response = await onRequest({
    request: new Request('https://cms.example/admin%xx'), env: {},
    next() { throw new Error('Escape rusak tidak boleh mencapai aset.'); },
  });
  expect(response.status).toBe(400);
});
