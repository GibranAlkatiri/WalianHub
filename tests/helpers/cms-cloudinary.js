import { createHash } from 'node:crypto';
export const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCFkAAAAASUVORK5CYII=','base64'));
// Deterministic provider for API tests; never uses external credentials or data.
export function fakeCloudinary() {
  const objects = new Map(),requests = [],options = {outage:false,loseResponse:false};
  const fetch = async (input,init = {}) => {
    const url = new URL(input); requests.push({url:url.origin + url.pathname,method:init.method || 'GET'});
    if (options.outage) return new Response('provider-test-secret',{status:500});
    if (url.hostname === 'api.cloudinary.com' && url.pathname.endsWith('/image/upload')) {
      if (init.headers.authorization !== 'Basic ' + btoa('123456:provider-test-secret')) return new Response(null,{status:401});
      const form = init.body;
      if (form.get('type') !== 'authenticated' || form.get('overwrite') !== 'false') return new Response(null,{status:400});
      const key = form.get('public_id'),file = form.get('file'),format = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
      if (!objects.has(key)) objects.set(key,{bytes:new Uint8Array(await file.arrayBuffer()),type:file.type,format});
      const asset = objects.get(key);
      if (options.loseResponse) {options.loseResponse = false;throw new Error('provider-test-secret');}
      return Response.json({public_id:key,type:'authenticated',resource_type:'image',format:asset.format,bytes:asset.bytes.length});
    }
    const match = url.pathname.match(/^\/test-cloud\/image\/authenticated\/s--([a-zA-Z0-9_-]{8})--\/v1\/(walianhub\/[a-f0-9-]+)\.(jpg|png|webp)$/);
    if (!match) return new Response(null,{status:404});
    const [,signature,key,format] = match;
    const expected = createHash('sha1').update(key + '.' + format + 'provider-test-secret').digest('base64url').slice(0,8);
    const asset = objects.get(key);
    if (signature !== expected || !asset || asset.format !== format) return new Response(null,{status:401});
    return new Response(asset.bytes,{headers:{'content-type':asset.type}});
  };
  return {fetch,objects,requests,options};
}
