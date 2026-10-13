import {readSession,sameOrigin,sha256,staffEnabled,sessionEnabled,cookieHeader,cookieToken,SESSION_SECONDS,SessionError} from './cms-session.js';
import {hashPassword,verifyPassword,passwordAcceptable} from './cms-password.js';
import {sendCmsEmail} from './cms-mail.js';
import {verifyHuman} from './cms-turnstile.js';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(data,status=200,cookie)=>new Response(JSON.stringify({mode:'session',staffAuth:true,...data}),{status,headers:{...HEADERS,...(cookie?{'set-cookie':cookie}:{})}});
const fail=(message,status=422)=>{throw new SessionError(message,status);};
const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
const emailOf=(value)=>{
  const email=typeof value==='string'?value.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))fail('Isi alamat email yang valid.');
  return email;
};
export async function limit(db,label,maximum,windowMs,now=Date.now()) {
  const key=await sha256(label);
  const row=await db.prepare(`INSERT INTO cms_auth_limits(key_hash,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END WHERE expires_at<=? OR attempts<? RETURNING attempts`).bind(key,now+windowMs,now,now,now,maximum).first();
  if(!row)fail('Terlalu banyak percobaan. Coba kembali nanti.',429);
}
function originFor(request,env) {
  const configured=new URL(env.CMS_AUTH_ORIGIN||'https://invalid.invalid');
  if(configured.origin!==new URL(request.url).origin || (configured.protocol!=='https:'&&configured.hostname!=='127.0.0.1'))fail('Alamat login belum dikonfigurasi.',503);
  return configured.origin;
}
async function bodyOf(request) {
  if(!request.headers.get('content-type')?.includes('application/json'))fail('Format permintaan tidak didukung.',415);
  if(Number(request.headers.get('content-length')||0)>8192)fail('Isian terlalu panjang.',413);
  const reader=request.body?.getReader(),decoder=new TextDecoder();let size=0,text='';
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();fail('Isian terlalu panjang.',413);}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();
  let body;try{body=JSON.parse(text);}catch{fail('Isian tidak valid.',400);}
  if(!body||Array.isArray(body)||typeof body!=='object')fail('Isian tidak valid.',400);
  return body;
}
async function issueLink(db,user,purpose,origin,env,mail,now=Date.now()) {
  await limit(db,'mail-global',80,24*3600000,now);
  const token=randomToken();
  await db.prepare('INSERT INTO cms_auth_links(token_hash,user_id,purpose,credential_version,expires_at) VALUES (?,?,?,?,?)').bind(await sha256(token),user.id,purpose,user.credential_version,now+(purpose==='owner-login'?10:30)*60000).run();
  const flow=purpose==='password'?'password':purpose;
  const title=purpose==='verify'?'Verifikasi email WalianHub':purpose==='owner-login'?'Konfirmasi masuk pengelola WalianHub':'Buat atau pulihkan password WalianHub';
  try { await mail(env,{to:user.email,subject:title,text:`${title}\n\nBuka tautan ini, lalu lanjutkan pada halaman WalianHub:\n${origin}/admin/?flow=${flow}#token=${token}\n\nTautan hanya bisa dipakai sekali dan kedaluwarsa dalam ${purpose==='owner-login'?10:30} menit. Jika Anda tidak meminta ini, abaikan email ini.`}); }
  catch {await db.prepare('DELETE FROM cms_auth_links WHERE token_hash=?').bind(await sha256(token)).run();fail('Email belum terkirim. Coba kembali nanti.',503);}
}
async function linkOf(db,token,purpose,now) {
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))fail('Tautan tidak valid atau sudah kedaluwarsa.',400);
  const row=await db.prepare(`SELECT u.*,l.token_hash FROM cms_auth_links l JOIN cms_users u ON u.id=l.user_id WHERE l.token_hash=? AND l.purpose=? AND l.consumed_at IS NULL AND l.expires_at>? AND l.credential_version=u.credential_version`).bind(await sha256(token),purpose,now).first();
  if(!row)fail('Tautan tidak valid atau sudah kedaluwarsa.',400);
  return row;
}
async function staffSession(db,user,now,request) {
  const token=randomToken(), expiresAt=now+SESSION_SECONDS*1000;
  const result=await db.prepare(`INSERT INTO cms_staff_sessions(token_hash,user_id,credential_version,created_at,expires_at) SELECT ?,id,credential_version,?,? FROM cms_users WHERE id=? AND status='approved' AND credential_version=?`).bind(await sha256(token),now,expiresAt,user.id,user.credential_version).run();
  if(result.meta.changes!==1)fail('Akses akun telah berubah. Masuk kembali.',401);
  const old=cookieToken(request);
  if(old)await db.prepare('DELETE FROM cms_staff_sessions WHERE token_hash=?').bind(await sha256(old)).run();
  await db.prepare('DELETE FROM cms_staff_sessions WHERE expires_at<=?').bind(now).run();
  return json({ok:true,username:user.email,name:user.name,role:user.role,expiresAt},200,cookieHeader(token,SESSION_SECONDS));
}
async function ownerOf(request,env,now) {
  const owner=await readSession(request,env,now);
  if(owner.role!=='owner')fail('Hanya pengelola utama yang dapat mengatur akses staf.',403);
  if(now-owner.createdAt>15*60000)fail('Masuk kembali untuk mengatur akses staf.',401);
  return owner;
}
export function createStaffHandler(mail=sendCmsEmail,human=verifyHuman) {
 return async function handle({request,env},fixedAction) {
  try {
   if(!staffEnabled(env))return json({ok:false,error:'Fitur akun staf belum diaktifkan.'},404);
   if(env.CMS_SESSION_AUTH!=='1'||!env.CMS_DB||!env.CMS_OWNER_EMAIL)fail('Konfigurasi akun staf belum lengkap.',503);
   const db=env.CMS_DB, now=Date.now(), origin=originFor(request,env);
   if(request.method==='GET' && !fixedAction) {
    await ownerOf(request,env,now);
    const rows=await db.prepare("SELECT id,email,name,status,version,created_at,approved_at FROM cms_users WHERE role='staff' ORDER BY created_at DESC LIMIT 200").all();
    return json({ok:true,users:rows.results});
   }
   if(request.method!=='POST')fail('Metode tidak didukung.',405);
   sameOrigin(request);
   const body=await bodyOf(request), action=fixedAction||body.action;
   const ip=request.headers.get('cf-connecting-ip')||'local';
   if(['register','reset','verify','password','owner-login','login'].includes(action))await limit(db,'ip:'+ip+':'+action,action==='login'?20:10,15*60000,now);
   if(['register','reset'].includes(action)&&!await human(env,request,body.challenge,action))fail('Verifikasi keamanan belum berhasil. Coba kembali.',403);
   if(action==='register') {
    const email=emailOf(body.email), name=typeof body.name==='string'?body.name.trim():'';
    if(!name||name.length>80||/[\r\n]/.test(name))fail('Isi nama lengkap, maksimal 80 karakter.');
    await limit(db,'email:register:'+email,3,3600000,now);
    if(email===emailOf(env.CMS_OWNER_EMAIL))return json({ok:true,message:'Jika pendaftaran dapat dilanjutkan, tautan verifikasi akan dikirim ke email Anda.'});
    await db.prepare("INSERT INTO cms_users(id,email,name,created_at) VALUES (?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(),email,name,now).run();
    const user=await db.prepare('SELECT * FROM cms_users WHERE email=?').bind(email).first();
    if(user.status==='unverified')await issueLink(db,user,'verify',origin,env,mail,now);
    return json({ok:true,message:'Jika pendaftaran dapat dilanjutkan, tautan verifikasi akan dikirim ke email Anda.'});
   }
   if(action==='verify') {
    const user=await linkOf(db,body.token,'verify',now);
    const results=await db.batch([
     db.prepare("UPDATE cms_users SET status='pending',email_verified_at=?,version=version+1 WHERE id=? AND status='unverified' AND EXISTS(SELECT 1 FROM cms_auth_links WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?)").bind(now,user.id,user.token_hash,now),
     db.prepare('UPDATE cms_auth_links SET consumed_at=? WHERE user_id=? AND purpose=? AND consumed_at IS NULL').bind(now,user.id,'verify')
    ]);
    if(results[0].meta.changes!==1)fail('Tautan sudah dipakai atau status akun berubah.',400);
    // Notification does not grant access; approval always needs an owner session.
    try{await limit(db,'mail-global',80,24*3600000,now);await mail(env,{to:emailOf(env.CMS_OWNER_EMAIL),subject:'Permintaan akses staf WalianHub',text:`${user.name} (${user.email}) telah memverifikasi email dan meminta akses.\n\nMasuk sebagai pengelola untuk Setujui atau Tolak:\n${origin}/admin/staf.html\n\nPendaftaran ini belum memberikan akses CMS.`});}catch{}
    return json({ok:true,message:'Email terverifikasi. Pendaftaran menunggu persetujuan pengelola.'});
   }
   if(action==='reset') {
    const email=emailOf(body.email);await limit(db,'email:reset:'+email,3,3600000,now);
    const user=await db.prepare("SELECT * FROM cms_users WHERE email=? AND status='approved' AND email_verified_at IS NOT NULL").bind(email).first();
    if(user)await issueLink(db,user,'password',origin,env,mail,now);
    return json({ok:true,message:'Jika akun memenuhi syarat, tautan pembuatan password akan dikirim ke email Anda.'});
   }
   if(action==='password') {
    const user=await linkOf(db,body.token,'password',now);
    if(user.status!=='approved')fail('Akun belum memiliki akses.',403);
    if(!passwordAcceptable(body.password))fail('Gunakan password 15–128 karakter.');
    const hash=await hashPassword(body.password);
    const results=await db.batch([
     db.prepare("UPDATE cms_users SET password_hash=?,credential_version=credential_version+1,version=version+1 WHERE id=? AND status='approved' AND credential_version=? AND EXISTS(SELECT 1 FROM cms_auth_links WHERE token_hash=? AND consumed_at IS NULL AND expires_at>?)").bind(hash,user.id,user.credential_version,user.token_hash,Date.now()),
     db.prepare('UPDATE cms_auth_links SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now,user.id),
     db.prepare('DELETE FROM cms_staff_sessions WHERE user_id=?').bind(user.id)
    ]);
    if(results[0].meta.changes!==1)fail('Tautan sudah dipakai atau akses telah berubah.',400);
    return json({ok:true,message:'Password tersimpan. Silakan masuk dengan email dan password Anda.'});
   }
   if(action==='login') {
    const email=emailOf(body.username||body.email);await limit(db,'email:login:'+email,10,15*60000,now);
    const user=await db.prepare("SELECT * FROM cms_users WHERE email=? AND status='approved' AND email_verified_at IS NOT NULL").bind(email).first();
    const dummy='scrypt$32768$8$3$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
    const valid=await verifyPassword(body.password,user?.password_hash||dummy);
    if(!user||!valid)fail('Email atau password salah, atau akun belum memiliki akses.',401);
    if(user.role==='owner') {
     if(user.email!==emailOf(env.CMS_OWNER_EMAIL))fail('Akses pengelola tidak sesuai konfigurasi.',403);
     await limit(db,'email:owner-login:'+email,3,15*60000,now);
     await issueLink(db,user,'owner-login',origin,env,mail,now);
     return json({ok:true,challenge:true,message:'Konfirmasi masuk telah dikirim ke email pengelola. Buka tautan untuk melanjutkan.'});
    }
    return await staffSession(db,user,now,request);
   }
   if(action==='owner-login') {
    const user=await linkOf(db,body.token,'owner-login',now);
    if(user.role!=='owner'||user.status!=='approved'||user.email!==emailOf(env.CMS_OWNER_EMAIL))fail('Akses pengelola tidak valid.',403);
    const consumed=await db.prepare('UPDATE cms_auth_links SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING token_hash').bind(now,user.token_hash,now).first();
    if(!consumed)fail('Tautan sudah dipakai.',400);
    return await staffSession(db,user,now,request);
   }
   if(['approve','reject','revoke','invite'].includes(action)) {
    const owner=await ownerOf(request,env,now);
    if(typeof body.id!=='string'||!Number.isInteger(body.version))fail('Pilih akun yang valid.');
    const user=await db.prepare("SELECT * FROM cms_users WHERE id=? AND role='staff'").bind(body.id).first();
    if(!user||user.version!==body.version)fail('Daftar staf sudah berubah. Muat ulang.',409);
    if(action==='invite') {
     if(user.status!=='approved')fail('Akun belum disetujui.',409);
     await limit(db,'invite:'+user.id,3,3600000,now);await issueLink(db,user,'password',origin,env,mail,now);
     return json({ok:true,message:'Tautan pembuatan password dikirim.'});
    }
    if(action==='approve' && (user.status!=='pending'||!user.email_verified_at))fail('Hanya pendaftaran terverifikasi yang dapat disetujui.',409);
    if(action==='reject' && !['pending','unverified'].includes(user.status))fail('Pendaftaran sudah diproses.',409);
    if(action==='revoke' && user.status!=='approved')fail('Akses akun sudah tidak aktif.',409);
    const status={approve:'approved',reject:'rejected',revoke:'revoked'}[action];
    const result=await db.prepare(`UPDATE cms_users SET status=?,version=version+1,credential_version=credential_version+1,approved_at=?,approved_by=? WHERE id=? AND role='staff' AND version=? RETURNING *`).bind(status,action==='approve'?now:user.approved_at,owner.userId,user.id,user.version).first();
    if(!result)fail('Daftar staf sudah berubah. Muat ulang.',409);
    await db.batch([
     db.prepare('DELETE FROM cms_staff_sessions WHERE user_id=?').bind(user.id),
     db.prepare('UPDATE cms_auth_links SET consumed_at=? WHERE user_id=? AND consumed_at IS NULL').bind(now,user.id),
     db.prepare('INSERT INTO cms_access_audit(id,actor_id,subject_id,action,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),owner.userId,user.id,action,now)
    ]);
    if(action==='approve') {
     try{await issueLink(db,result,'password',origin,env,mail,now);}catch{return json({ok:true,message:'Akun disetujui, tetapi email belum terkirim. Gunakan Kirim tautan password untuk mencoba lagi.'});}
    }
    return json({ok:true,message:{approve:'Akun disetujui. Tautan pembuatan password dikirim.',reject:'Pendaftaran ditolak.',revoke:'Akses dicabut. Sesi akun tidak berlaku lagi.'}[action]});
   }
   fail('Tindakan tidak dikenali.',404);
  }catch(error){return json({ok:false,error:error instanceof SessionError?error.message:'Permintaan belum dapat diproses. Coba kembali.'},error instanceof SessionError?error.status:503);}
 };
}
