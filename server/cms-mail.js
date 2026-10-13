const encoder=new TextEncoder();
export async function sendCmsEmail(env,{to,subject,text},send=fetch) {
  const endpoint=String(env.CMS_MAIL_ENDPOINT||'');
  const secret=String(env.CMS_MAIL_SECRET||'');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint)||secret.length<32) throw new Error('Pengiriman email belum dikonfigurasi.');
  // Keep the signed JSON ASCII on the wire; Apps Script and intermediaries may
  // otherwise decode a non-ASCII POST differently before checking its HMAC.
  const payload=JSON.stringify({id:crypto.randomUUID(),timestamp:Date.now(),to,subject,text}).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload)))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const res=await send(endpoint,{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(20000)});
  const result=await res.json();
  if(!res.ok||result.ok!==true)throw new Error('Email belum terkirim. Coba kembali.');
}
