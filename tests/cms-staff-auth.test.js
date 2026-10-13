import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {sqliteD1} from './helpers/d1-sqlite.js';
import {createStaffHandler} from '../server/cms-staff.js';
import {hashPassword,verifyPassword} from '../server/cms-password.js';
import {readSession,revokeSession} from '../server/cms-session.js';
import {createCmsHandler} from '../functions/api/cms.js';
import {onRequestPost as loginEndpoint} from '../functions/api/auth.js';
const origin='https://preview.example', password='kalimat sandi pengujian panjang';
const schema=['0001_content.sql','0002_sessions.sql','0003_media.sql','0004_media_cleanup.sql','0005_staff_auth.sql'].map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n');
const ownerHash=await hashPassword(password);
async function setup(){
 const db=sqliteD1(schema),mail=[];
 const env={CMS_DB:db,CMS_STAFF_AUTH:'1',CMS_SESSION_AUTH:'1',CMS_OWNER_EMAIL:'owner@example.com',CMS_AUTH_ORIGIN:origin,CMS_LAYANAN_D1:'1',ASSETS:{fetch:async()=>new Response(readFileSync(new URL('../public/admin/config.yml',import.meta.url),'utf8'))}};
 db.raw.query("INSERT INTO cms_users(id,email,name,role,status,email_verified_at,password_hash,created_at) VALUES ('owner','owner@example.com','Pengelola','owner','approved',?,?,?)").run(Date.now(),ownerHash,Date.now());
 const handler=createStaffHandler(async(_env,message)=>{mail.push(message);},async()=>true);
 const call=(action,data={},cookie='',extra={})=>handler({env,request:new Request(origin+'/api/staff',{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{}),...extra},body:JSON.stringify({action,...data})})});
 const token=()=>mail.at(-1).text.match(/#token=([a-f0-9]{64})/)[1];
 const latestUser=()=>db.raw.query("SELECT * FROM cms_users WHERE role='staff'").get();
 const ownerLogin=async()=>{const challenge=await call('login',{email:env.CMS_OWNER_EMAIL,password});expect((await challenge.json()).challenge).toBe(true);const result=await call('owner-login',{token:token()});expect(result.status).toBe(200);return result.headers.get('set-cookie').split(';')[0];};
 const pending=async()=>{await call('register',{email:'staff@example.com',name:'Staf Uji',role:'owner',status:'approved'});const t=token();const result=await call('verify',{token:t});expect(result.status).toBe(200);return latestUser();};
 const approved=async(owner)=>{const user=await pending();expect((await call('approve',{id:user.id,version:user.version},owner)).status).toBe(200);const result=await call('password',{token:token(),password});expect(result.status).toBe(200);return latestUser();};
 return {db,env,mail,call,token,ownerLogin,pending,approved,latestUser,close:()=>db.close()};
}
test('password uses unique salted scrypt hashes and validates without storing plaintext',async()=>{
 const a=await hashPassword(password),b=await hashPassword(password);expect(a).not.toBe(b);expect(a).not.toContain(password);expect(await verifyPassword(password,a)).toBe(true);expect(await verifyPassword('password yang salah',a)).toBe(false);expect(await verifyPassword(password,'bad')).toBe(false);await expect(hashPassword('pendek')).rejects.toThrow();
});
test('registration cannot grant owner role; verification is single-use and cannot open CMS before approval',async()=>{
 const s=await setup();try{
  await s.call('register',{email:' STAFF@example.com ',name:'Staf Uji',role:'owner',status:'approved'});let user=s.latestUser();expect(user.role).toBe('staff');expect(user.status).toBe('unverified');expect(user.password_hash).toBeNull();
  const t=s.token();expect((await s.call('verify',{token:t})).status).toBe(200);expect(s.latestUser().status).toBe('pending');expect((await s.call('verify',{token:t})).status).toBe(400);expect(s.mail.at(-1).to).toBe('owner@example.com');
  expect((await s.call('login',{email:user.email,password})).status).toBe(401);
  expect((await s.call('approve',{id:user.id,version:s.latestUser().version})).status).toBe(401);
  const cms=createCmsHandler(()=>{throw new Error('GitHub must not be used');});expect((await cms({env:s.env,request:new Request(origin+'/api/cms?action=config')})).status).toBe(401);
 }finally{s.close();}
});
test('owner login requires password then a single-use email confirmation',async()=>{
 const s=await setup();try{
  const first=await s.call('login',{email:'owner@example.com',password});expect(first.headers.get('set-cookie')).toBeNull();expect((await first.json()).challenge).toBe(true);
  const t=s.token();const result=await s.call('owner-login',{token:t});const cookie=result.headers.get('set-cookie').split(';')[0];
  expect(result.headers.get('set-cookie')).toContain('HttpOnly');expect(result.headers.get('set-cookie')).toContain('Secure');expect(result.headers.get('set-cookie')).toContain('SameSite=Strict');
  expect((await readSession(new Request(origin,{headers:{cookie}}),s.env)).role).toBe('owner');expect((await s.call('owner-login',{token:t})).status).toBe(400);
 }finally{s.close();}
});
test('approved staff create their own password; next login needs no new approval; staff cannot manage access',async()=>{
 const s=await setup();try{
  const owner=await s.ownerLogin(),user=await s.approved(owner),result=await s.call('login',{email:user.email,password},owner),cookie=result.headers.get('set-cookie').split(';')[0];
  await expect(readSession(new Request(origin,{headers:{cookie:owner}}),s.env)).rejects.toThrow();
  expect((await result.json()).role).toBe('staff');expect((await readSession(new Request(origin,{headers:{cookie}}),s.env)).email).toBe(user.email);
  const list=await createStaffHandler()({env:s.env,request:new Request(origin+'/api/staff',{headers:{cookie}})});expect(list.status).toBe(403);
  expect((await s.call('revoke',{id:user.id,version:user.version},cookie)).status).toBe(403);
  expect((await s.call('login',{email:user.email,password})).status).toBe(200);
  const cms=createCmsHandler(()=>{throw new Error('GitHub must not be used');});expect((await cms({env:s.env,request:new Request(origin+'/api/cms?action=config',{headers:{cookie}})})).status).toBe(200);
 }finally{s.close();}
});
test('revocation invalidates active sessions, password links and future logins immediately',async()=>{
 const s=await setup();try{
  const owner=await s.ownerLogin(),user=await s.approved(owner),result=await s.call('login',{email:user.email,password}),cookie=result.headers.get('set-cookie').split(';')[0];
  await s.call('reset',{email:user.email});const t=s.token();expect((await s.call('revoke',{id:user.id,version:user.version},owner)).status).toBe(200);
  await expect(readSession(new Request(origin,{headers:{cookie}}),s.env)).rejects.toThrow();expect((await s.call('password',{token:t,password})).status).toBe(400);expect((await s.call('login',{email:user.email,password})).status).toBe(401);
 }finally{s.close();}
});
test('password reset consumes the link once and invalidates all older sessions',async()=>{
 const s=await setup();try{
  const owner=await s.ownerLogin(),user=await s.approved(owner),result=await s.call('login',{email:user.email,password}),cookie=result.headers.get('set-cookie').split(';')[0];
  await s.call('reset',{email:user.email});const t=s.token();expect((await s.call('password',{token:t,password:'kalimat sandi baru yang berbeda'})).status).toBe(200);
  await expect(readSession(new Request(origin,{headers:{cookie}}),s.env)).rejects.toThrow();expect((await s.call('password',{token:t,password})).status).toBe(400);expect((await s.call('login',{email:user.email,password})).status).toBe(401);
 }finally{s.close();}
});
test('stale and competing approval requests cannot both change a registration',async()=>{
 const s=await setup();try{const owner=await s.ownerLogin(),user=await s.pending();const results=await Promise.all(['approve','reject'].map(action=>s.call(action,{id:user.id,version:user.version},owner)));expect(results.map(r=>r.status).sort()).toEqual([200,409]);expect(s.db.raw.query('SELECT count(*) n FROM cms_access_audit').get().n).toBe(1);}finally{s.close();}
});
test('cross-origin requests, expired links, wrong purposes, and role spoofing are rejected',async()=>{
 const s=await setup();try{
  expect((await s.call('register',{email:'staff@example.com',name:'Staf'},{},{origin:'https://evil.example'})).status).toBe(403);
  await s.call('register',{email:'staff@example.com',name:'Staf'});const t=s.token();expect((await s.call('password',{token:t,password})).status).toBe(400);
  s.db.raw.query('UPDATE cms_auth_links SET expires_at=0').run();expect((await s.call('verify',{token:t})).status).toBe(400);
  expect((await s.call('register',{email:'owner@example.com',name:'Palsu'})).status).toBe(200);expect(s.db.raw.query("SELECT count(*) n FROM cms_users WHERE role='owner'").get().n).toBe(1);
 }finally{s.close();}
});
test('account and IP attempt limits block repeated guesses; missing staff configuration cannot fall back to legacy token mode',async()=>{
 const s=await setup();try{
  for(let i=0;i<10;i++)expect((await s.call('login',{email:'unknown@example.com',password:'x'})).status).toBe(401);
  expect((await s.call('login',{email:'unknown@example.com',password:'x'})).status).toBe(429);
  const result=await loginEndpoint({env:{...s.env,CMS_SESSION_AUTH:'0',GITHUB_TOKEN:'must-never-leak'},request:new Request(origin+'/api/auth',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'walian',password})})});expect(result.status).toBe(503);expect(await result.text()).not.toContain('must-never-leak');
 }finally{s.close();}
});
test('mail failure never verifies an email or enables an unapproved account',async()=>{
 const s=await setup();try{const handler=createStaffHandler(async()=>{throw new Error('provider failed');},async()=>true);const result=await handler({env:s.env,request:new Request(origin+'/api/staff',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'register',email:'staff@example.com',name:'Staf'})})});expect(result.status).toBe(503);expect(s.latestUser().status).toBe('unverified');expect(s.db.raw.query('SELECT count(*) n FROM cms_auth_links').get().n).toBe(0);}finally{s.close();}
});
test('logout removes the server session; owner identity changes invalidate owner sessions',async()=>{
 const s=await setup();try{const owner=await s.ownerLogin(),request=new Request(origin,{headers:{cookie:owner}});await expect(readSession(request,{...s.env,CMS_OWNER_EMAIL:'other@example.com'})).rejects.toThrow();await revokeSession(request,s.env);await expect(readSession(request,s.env)).rejects.toThrow();}finally{s.close();}
});
