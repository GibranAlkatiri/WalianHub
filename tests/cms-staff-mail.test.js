import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {sendCmsEmail} from '../server/cms-mail.js';
import {createStaffHandler} from '../server/cms-staff.js';
import {sqliteD1} from './helpers/d1-sqlite.js';
test('mail bridge accepts signed messages, rejects forged signatures and repeated requests',async()=>{
 const secret='test-secret-for-mail-bridge-only-123456789',sent=[],cache=new Map();let locked=false;
 const context={Utilities:{computeHmacSha256Signature:(text,key)=>[...createHmac('sha256',key).update(text).digest()]},PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({value,setMimeType(){return this;}})},LockService:{getScriptLock:()=>({waitLock(){locked=true;},hasLock:()=>locked,releaseLock(){locked=false;}})},CacheService:{getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:message=>sent.push(message)}};
 runInNewContext(readFileSync(new URL('../scripts/cms-mail-google.gs',import.meta.url),'utf8'),context);
 let body;
 const env={CMS_MAIL_ENDPOINT:'https://script.google.com/macros/s/example/exec',CMS_MAIL_SECRET:secret};
 await sendCmsEmail(env,{to:'staff@example.com',subject:'Uji email — WalianHub',text:'Isi pengujian: nama François ✓'},async(_url,options)=>{body=options.body;expect(body).not.toContain('—');const result=context.doPost({postData:{contents:body}});return new Response(result.value);});
 expect(sent[0].subject).toBe('Uji email — WalianHub');expect(sent[0].body).toBe('Isi pengujian: nama François ✓');
 expect(sent).toHaveLength(1);expect(JSON.parse(context.doPost({postData:{contents:body}}).value).ok).toBe(false);
 const forged=JSON.parse(body);forged.signature='0'.repeat(64);expect(JSON.parse(context.doPost({postData:{contents:JSON.stringify(forged)}}).value).ok).toBe(false);expect(sent).toHaveLength(1);
 await expect(sendCmsEmail({...env,CMS_MAIL_ENDPOINT:'https://evil.example'},{to:'staff@example.com',subject:'x',text:'x'})).rejects.toThrow();
});
test('missing anti-bot verification denies public registration before creating an account or email',async()=>{
 const schema=['0002_sessions.sql','0005_staff_auth.sql'].map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n'),db=sqliteD1(schema);let mails=0;
 try{const handler=createStaffHandler(async()=>{mails++;},async()=>false),origin='https://preview.example';const result=await handler({env:{CMS_DB:db,CMS_STAFF_AUTH:'1',CMS_SESSION_AUTH:'1',CMS_OWNER_EMAIL:'owner@example.com',CMS_AUTH_ORIGIN:origin},request:new Request(origin+'/api/staff',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'register',email:'staff@example.com',name:'Staf'})})});expect(result.status).toBe(403);expect(mails).toBe(0);expect(db.raw.query('SELECT count(*) n FROM cms_users').get().n).toBe(0);}finally{db.close();}
});
