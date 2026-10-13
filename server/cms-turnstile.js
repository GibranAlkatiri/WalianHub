export async function verifyHuman(env,request,token,action) {
  if(!env.CMS_TURNSTILE_SECRET || typeof token!=='string'||!token||token.length>2048)return false;
  const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({secret:env.CMS_TURNSTILE_SECRET,response:token,remoteip:request.headers.get('cf-connecting-ip')||undefined}),signal:AbortSignal.timeout(10000)});
  const data=await res.json();
  return res.ok && data.success===true && data.action===action && data.hostname===new URL(env.CMS_AUTH_ORIGIN).hostname;
}
