// Install in your own Google Apps Script account. Store the secret in Script
// Properties as CMS_MAIL_SECRET; never put it in source or a public URL.
function autorizarEmail() { return MailApp.getRemainingDailyQuota(); }
function doPost(event) {
  function reply(ok) { return ContentService.createTextOutput(JSON.stringify({ok:ok})).setMimeType(ContentService.MimeType.JSON); }
  var lock;
  try {
    if(!event.postData || event.postData.contents.length>16000) return reply(false);
    var envelope=JSON.parse(event.postData.contents);
    var secret=PropertiesService.getScriptProperties().getProperty('CMS_MAIL_SECRET');
    if(!secret || secret.length<32 || typeof envelope.payload!=='string' || !/^[a-f0-9]{64}$/.test(envelope.signature||'')) return reply(false);
    var signature=Utilities.computeHmacSha256Signature(envelope.payload,secret).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
    var difference=0;for(var i=0;i<64;i++)difference|=signature.charCodeAt(i)^envelope.signature.charCodeAt(i);
    if(difference!==0)return reply(false);
    var data=JSON.parse(envelope.payload);
    if(!Number.isFinite(data.timestamp)||Math.abs(Date.now()-data.timestamp)>120000||!/^[a-f0-9-]{36}$/.test(data.id||''))return reply(false);
    if(!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(data.to||'')||typeof data.subject!=='string'||data.subject.length>160||typeof data.text!=='string'||data.text.length>10000)return reply(false);
    lock=LockService.getScriptLock();lock.waitLock(10000);
    var cache=CacheService.getScriptCache();
    if(cache.get(data.id))return reply(false);
    if(MailApp.getRemainingDailyQuota()<1)return reply(false);
    cache.put(data.id,'used',300);
    MailApp.sendEmail({to:data.to,subject:data.subject,body:data.text,name:'WalianHub'});
    return reply(true);
  } catch(error) { return reply(false); }
  finally { if(lock && lock.hasLock())lock.releaseLock(); }
}
