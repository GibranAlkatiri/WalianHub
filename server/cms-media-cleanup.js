import { mediaPaths, UUID, downloadMedia, MEDIA_LIMIT } from './cms-media.js';

export const MEDIA_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ROWS = 5000, DELETE_LIMIT = 10, SOURCE_CHECK_LIMIT = 3;
export const CLEANUP_SCHEMA = ['cms_media_cleanup','cms_media_cleanup_run','cms_media_current_references','cms_media_cleanup_claim_insert','cms_media_cleanup_claim_update','cms_media_cleanup_upload','cms_media_cleanup_uploaded','cms_media_cleanup_content_insert','cms_media_cleanup_content_update','cms_media_cleanup_used_insert','cms_media_cleanup_used_update','cms_media_cleanup_unused_delete'];
export async function cloudIdentity(cloud) {
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cloud)));
  return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}
const rows = async (db, sql, ...args) => {
  let result;
  try {const statement=db.prepare(sql);result=await(args.length?statement.bind(...args):statement).all();}
  catch {throw new Error('CLEANUP_DATABASE');}
  if (!result.success || !Array.isArray(result.results) || result.results.length > MAX_ROWS) throw new Error('CLEANUP_DATABASE');
  return result.results;
};
const run = async (db, sql, ...args) => {
  const result = await db.prepare(sql).bind(...args).run();
  if (!result.success) throw new Error('CLEANUP_DATABASE');
  return result;
};

async function inventory(databases) {
  // Read every database before doing any mutation. Missing schema or bad data
  // aborts the whole run; a missing Preview must never become an empty Preview.
  const snapshots = await Promise.all(databases.map(async db => ({
    db,
    schema: await rows(db, 'SELECT name FROM sqlite_master'),
    media: await rows(db, 'SELECT * FROM cms_media ORDER BY COALESCE(provider_cloud_checked_at,0),id LIMIT 5001'),
    content: await rows(db, 'SELECT published_json,draft_json FROM cms_content LIMIT 5001'),
    cleanup: await rows(db, 'SELECT * FROM cms_media_cleanup LIMIT 5001'),
  })));
  const used = new Set(), groups = new Map();
  for (const snapshot of snapshots) {
    if (CLEANUP_SCHEMA.some(name=>!snapshot.schema.some(object=>object.name===name))) throw new Error('CLEANUP_SCHEMA');
    for (const content of snapshot.content) for (const value of [content.published_json, content.draft_json]) {
      if (value !== null) for (const path of mediaPaths(JSON.parse(value))) used.add(path);
    }
    for (const media of snapshot.media) {
      if (!new RegExp('^' + UUID + '$').test(media.id) || !/^[a-f0-9]{64}$/.test(media.sha256)
        || media.provider_key !== `walianhub/${media.id}-${media.sha256}`
        || !['jpg','png','webp'].includes(media.format) || media.public_path !== `/media/${media.id}.${media.format}`
        || !Number.isFinite(Date.parse(media.created_at))) throw new Error('CLEANUP_MEDIA_DATA');
      if (!groups.has(media.provider_key)) groups.set(media.provider_key, []);
      groups.get(media.provider_key).push(media);
    }
  }
  return { snapshots, used, groups };
}

async function destroy(key, auth, fetchProvider, now) {
  const timestamp = String(Math.floor(now / 1000));
  const signed = `invalidate=true&public_id=${key}&timestamp=${timestamp}&type=authenticated`;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(signed + auth.secret)));
  const signature = [...bytes].map(value => value.toString(16).padStart(2,'0')).join('');
  const body = new URLSearchParams({public_id:key,type:'authenticated',invalidate:'true',timestamp,api_key:auth.key,signature});
  const response = await fetchProvider(`https://api.cloudinary.com/v1_1/${auth.cloud}/image/destroy`, {
    method:'POST', body, signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) { await response.body?.cancel(); return false; }
  try { return ['ok','not found'].includes((await response.json()).result); }
  catch { return false; }
}

export async function cleanupMedia(env, { dryRun = true, now = Date.now(), fetchProvider = fetch, fetchPeer = fetch } = {}) {
  const auth = {cloud:String(env.CLOUDINARY_CLOUD_NAME || '').trim(),key:String(env.CLOUDINARY_API_KEY || '').trim(),secret:String(env.CLOUDINARY_API_SECRET || '').trim()};
  if (env.CMS_MEDIA_CLEANUP_ENABLED !== '1' || !env.CMS_DB || !env.CMS_MEDIA_CLEANUP_PEER_DB
    || env.CMS_DB === env.CMS_MEDIA_CLEANUP_PEER_DB || env.CMS_MEDIA_CLOUDINARY !== '1'
    || ['LAYANAN','DESTINASI','PENGUMUMAN','PENGATURAN'].some(name => env[`CMS_${name}_D1`] !== '1')
    || !/^[a-zA-Z0-9_-]+$/.test(auth.cloud) || auth.cloud !== env.CMS_MEDIA_CLEANUP_SHARED_CLOUD_NAME
    || !/^\d+$/.test(auth.key) || !auth.secret || !Number.isSafeInteger(now)) throw new Error('CLEANUP_CONFIGURATION');
  const peerURL=new URL(env.CMS_MEDIA_CLEANUP_PEER_URL);
  if(peerURL.protocol!=='https:' || peerURL.pathname!=='/api/media-cleanup' || peerURL.username || peerURL.password || peerURL.search
    || typeof env.CMS_MEDIA_CLEANUP_TOKEN!=='string' || env.CMS_MEDIA_CLEANUP_TOKEN.length<32) throw new Error('CLEANUP_CONFIGURATION');
  let peerResponse;
  try {peerResponse=await fetchPeer(peerURL.href,{headers:{authorization:'Bearer '+env.CMS_MEDIA_CLEANUP_TOKEN},redirect:'error',signal:AbortSignal.timeout(10000)});}
  catch {throw new Error('CLEANUP_PEER');}
  if(!peerResponse.ok){await peerResponse.body?.cancel();throw new Error('CLEANUP_PEER');}
  let peer;try{peer=await peerResponse.json();}catch{throw new Error('CLEANUP_PEER');}
  if(peer.ok!==true || peer.schema!==1 || peer.collectionsD1!==true || peer.cloudIdentity!==await cloudIdentity(auth.cloud))throw new Error('CLEANUP_PEER');
  const databases = [env.CMS_DB, env.CMS_MEDIA_CLEANUP_PEER_DB], token = crypto.randomUUID();
  const report = {dryRun,busy:false,total:0,protected:0,pending:0,eligible:0,deleted:0,failed:0,unknownSource:0,verifiedSources:0};
  let acquired = false, completed = false;
  try {
    if (!dryRun) {
      const lease = await env.CMS_DB.prepare(`INSERT INTO cms_media_cleanup_run(id,owner,expires_at) VALUES (1,?,?)
        ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at
        WHERE cms_media_cleanup_run.expires_at <= ? RETURNING owner`).bind(token,now + 15 * 60 * 1000,now).first();
      if (lease?.owner !== token) return {...report,busy:true};
      acquired = true;
    }
    const {snapshots,used,groups} = await inventory(databases);
    const cutoff = now - MEDIA_GRACE_MS;
    let attempted = 0, sourceChecks = 0;
    for (const [key,media] of groups) {
      const states = snapshots.map(snapshot => snapshot.cleanup.find(item => item.provider_key === key));
      if (states.every(state => state?.state === 'deleted')) continue;
      report.total++;
      // Verify old uploads through authenticated delivery and their original
      // checksum. Never guess the cloud from the current dashboard setting.
      if (!dryRun) for (const snapshot of snapshots) for (const item of media) {
        if (item.provider_cloud !== null || !snapshot.media.includes(item) || sourceChecks >= SOURCE_CHECK_LIMIT) continue;
        sourceChecks++;
        await run(snapshot.db,'UPDATE cms_media SET provider_cloud_checked_at=? WHERE id=? AND provider_cloud IS NULL',now,item.id);
        try {
          const response=await downloadMedia(item,env,fetchProvider);
          if(Number(response.headers.get('content-length'))>MEDIA_LIMIT){await response.body?.cancel();continue;}
          const bytes=await response.arrayBuffer();if(bytes.byteLength!==item.byte_length||bytes.byteLength>MEDIA_LIMIT)continue;
          const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
          if([...digest].map(value=>value.toString(16).padStart(2,'0')).join('')!==item.sha256)continue;
          const result=await run(snapshot.db,'UPDATE cms_media SET provider_cloud=? WHERE id=? AND provider_cloud IS NULL',auth.cloud,item.id);
          if(result.meta?.changes===1){item.provider_cloud=auth.cloud;report.verifiedSources++;}
        }catch{ /* Unverified objects stay protected. */ }
      }
      if(media.some(item=>item.provider_cloud!==auth.cloud)) {report.unknownSource++;continue;}
      if (media.some(item => used.has(item.public_path))) {
        report.protected++;
        if (!dryRun) for (const db of databases) await run(db,"DELETE FROM cms_media_cleanup WHERE provider_key=? AND state='pending'",key);
        continue;
      }
      const retry = states.some(state => ['deleting','deleted'].includes(state?.state));
      const mature = media.every(item => Date.parse(item.created_at) <= cutoff)
        && states.every(state => state && state.unused_since <= cutoff);
      if (!mature && !retry) {
        report.pending++;
        if (!dryRun) for (const db of databases) await run(db,`INSERT INTO cms_media_cleanup(provider_key,unused_since) VALUES (?,?) ON CONFLICT(provider_key) DO NOTHING`,key,now);
        continue;
      }
      report.eligible++;
      if (dryRun || attempted >= DELETE_LIMIT) continue;
      attempted++;
      let claimed = true;
      try {
        // Reservations also cover a database with no matching upload yet.
        // SQL triggers block concurrent content saves and upload-ID reuse.
        for (const db of databases) {
          const result = await run(db,`INSERT INTO cms_media_cleanup(provider_key,unused_since,state,claim_token,claimed_at)
            VALUES (?,?,'deleting',?,?) ON CONFLICT(provider_key) DO UPDATE SET
            state='deleting',claim_token=excluded.claim_token,claimed_at=excluded.claimed_at
            WHERE cms_media_cleanup.state <> 'deleted' AND cms_media_cleanup.unused_since <= ?`,key,cutoff,token,now,cutoff);
          const state = await db.prepare('SELECT state,claim_token FROM cms_media_cleanup WHERE provider_key=?').bind(key).first();
          if (!result.success || (state?.state !== 'deleted' && (state?.state !== 'deleting' || state.claim_token !== token))) throw new Error('CLEANUP_CLAIM');
        }
      } catch {
        claimed = false;
        // Before a provider call, a failed cross-database claim is reversible.
        // Keep previous deletion claims locked: a lost response may mean deleted.
        if (!retry) for (const db of databases) await run(db,`UPDATE cms_media_cleanup SET state='pending',unused_since=?,claim_token=NULL,claimed_at=NULL WHERE provider_key=? AND state='deleting' AND claim_token=?`,now,key,token);
      }
      if (!claimed) { report.failed++; continue; }
      let removed = false;
      try { removed = await destroy(key,auth,fetchProvider,now); } catch { /* Safe retry next day. */ }
      if (!removed) { report.failed++; continue; }
      // Keep tombstones and media metadata for retries and old-ID protection.
      for (const db of databases) await run(db,`UPDATE cms_media_cleanup SET state='deleted',deleted_at=?,claim_token=NULL WHERE provider_key=? AND state='deleting' AND claim_token=?`,now,key,token);
      report.deleted++;
    }
    completed = true;
    return report;
  } finally {
    if (acquired) await run(env.CMS_DB,`UPDATE cms_media_cleanup_run SET owner=NULL,expires_at=0,last_run_at=?,last_status=?,last_report=? WHERE id=1 AND owner=?`,now,!completed?'aborted':report.failed?'retry':'complete',JSON.stringify(report),token);
  }
}
