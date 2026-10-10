function endpoint(value,env) {
  const url = new URL(value);
  if (url.protocol!=='https:' || url.pathname!=='/api/media-cleanup' || url.search || url.username || url.password
    || typeof env.CMS_MEDIA_CLEANUP_TOKEN!=='string' || env.CMS_MEDIA_CLEANUP_TOKEN.length<32) throw new Error('Cleanup scheduler configuration is incomplete.');
  return url;
}
export async function readPeerMetadata(env,fetchEndpoint=fetch) {
  const url=endpoint(env.CMS_MEDIA_CLEANUP_PEER_URL,env);
  const response=await fetchEndpoint(url.href,{headers:{authorization:'Bearer '+env.CMS_MEDIA_CLEANUP_TOKEN},redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok){await response.body?.cancel();throw new Error('Preview metadata unavailable: HTTP '+response.status);}
  const data=await response.json();
  if(data.ok!==true || data.schema!==1 || data.collectionsD1!==true || !/^[a-f0-9]{64}$/.test(data.cloudIdentity))throw new Error('Preview metadata is invalid.');
  return {ok:true,schema:1,collectionsD1:true,cloudIdentity:data.cloudIdentity,source:url.href,observedAt:Date.now()};
}
export async function scheduledCleanup(env,fetchEndpoint=fetch) {
  const url=endpoint(env.CMS_MEDIA_CLEANUP_URL,env);
  const peerMetadata=await readPeerMetadata(env,fetchEndpoint);
  const response=await fetchEndpoint(url.href,{method:'POST',headers:{authorization:'Bearer '+env.CMS_MEDIA_CLEANUP_TOKEN,'content-type':'application/json'},body:JSON.stringify({dryRun:false,peerMetadata}),redirect:'error',signal:AbortSignal.timeout(240000)});
  if (!response.ok) { await response.body?.cancel();throw new Error('Cleanup endpoint failed: HTTP '+response.status); }
  const data=await response.json();
  if (!data.ok || data.dryRun!==false) throw new Error('Cleanup endpoint returned an invalid report.');
  // Only counts are logged. Tokens, provider responses, paths and credentials
  // must never appear in the scheduler's logs.
  const result={};for(const key of ['total','protected','pending','eligible','deleted','failed','unknownSource','verifiedSources']){
    if(!Number.isSafeInteger(data[key])||data[key]<0)throw new Error('Cleanup endpoint returned an invalid report.');result[key]=data[key];
  }
  console.log(JSON.stringify({event:'cms_media_cleanup',busy:data.busy===true,...result}));
  if (result.failed) throw new Error('Some media deletions require retry.');
  return result;
}
export default {async scheduled(_controller,env){await scheduledCleanup(env);}};
