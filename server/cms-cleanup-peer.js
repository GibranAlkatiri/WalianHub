// Preview may be protected by Cloudflare Access in addition to the cleanup
// endpoint's own bearer token. Never forward these credentials to Production.
export function peerRequestHeaders(env) {
  const headers = { authorization: 'Bearer ' + env.CMS_MEDIA_CLEANUP_TOKEN };
  const id = String(env.CMS_MEDIA_CLEANUP_PEER_ACCESS_CLIENT_ID || '').trim();
  const secret = String(env.CMS_MEDIA_CLEANUP_PEER_ACCESS_CLIENT_SECRET || '').trim();
  if (!!id !== !!secret) throw new Error('CLEANUP_CONFIGURATION');
  if (id) {
    headers['CF-Access-Client-ID'] = id;
    headers['CF-Access-Client-Secret'] = secret;
  }
  return headers;
}
