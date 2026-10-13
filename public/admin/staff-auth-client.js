const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else n.setAttribute(k,v);}if(text)n.textContent=text;return n;};
async function send(data){const res=await fetch('/api/staff',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const result=await res.json();if(!res.ok)throw new Error(result.error||'Permintaan belum berhasil.');return result;}
export function setup({openPanel,settings}) {
 const box=document.getElementById('staff-auth'), login=document.getElementById('form-masuk'), error=document.getElementById('galat');
 if(settings.preview){const banner=el('p',{role:'status'},'Pratinjau keamanan — akun dan konten uji terpisah dari website produksi.');document.getElementById('masuk').prepend(banner);}
 let widget,scriptReady;
 const captchaReady=()=>scriptReady||(scriptReady=new Promise((resolve,reject)=>{if(window.turnstile){resolve();return;}const script=el('script',{src:'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'});script.onload=resolve;script.onerror=()=>reject(new Error('Verifikasi keamanan belum dapat dimuat.'));document.head.append(script);}));
 const username=login.elements.username;
 username.type='email';username.placeholder='nama@email.com';username.parentElement.firstChild.textContent='Email';
 document.querySelector('#masuk .sub').textContent='Masuk dengan akun staf yang telah disetujui pengelola.';
 const help=document.querySelector('.bantuan ol li');if(help)help.textContent='Daftar dengan email Anda, verifikasi email, lalu tunggu persetujuan pengelola.';
 const remember=el('input',{type:'checkbox',id:'ingat-email'});remember.style.width='auto';
 const rememberLabel=el('label',{class:'staff-remember'});rememberLabel.append(remember,document.createTextNode('Ingat email di perangkat ini'));login.insertBefore(rememberLabel,login.querySelector('button[type=submit]'));
 try{const saved=localStorage.getItem('walian-staff-email');if(saved){username.value=saved;remember.checked=true;login.elements.password.focus();}}catch{}
 window.addEventListener('walian:staff-login',event=>{try{if(remember.checked)localStorage.setItem('walian-staff-email',event.detail.email);else localStorage.removeItem('walian-staff-email');}catch{}});
 const token=new URLSearchParams(location.hash.slice(1)).get('token');
 const flow=new URLSearchParams(location.search).get('flow');
 if(token)history.replaceState(null,'',location.pathname);
 const nav=el('div',{class:'staff-auth-actions'});
 for(const[mode,label]of [['register','Daftar akun staf'],['reset','Lupa / buat password']]){const b=el('button',{type:'button'},label);b.addEventListener('click',()=>render(mode));nav.append(b);}
 box.hidden=false;box.append(nav);
 function render(mode) {
  if(widget!==undefined&&window.turnstile){window.turnstile.remove(widget);widget=undefined;}
  error.hidden=true;login.hidden=true;nav.hidden=true;
  box.querySelector('form')?.remove();
  const form=el('form'), title=el('h2',{}, {register:'Daftar akun staf',reset:'Pulihkan atau buat password',verify:'Verifikasi email',password:'Buat password Anda','owner-login':'Konfirmasi masuk pengelola'}[mode]);form.append(title);
  const fields=mode==='register'?[['name','Nama lengkap','text'],['email','Email','email']]:mode==='reset'?[['email','Email','email']]:mode==='password'?[['password','Password baru','password'],['confirm','Ulangi password','password']]:[];
  for(const[name,label,type]of fields){const wrapper=el('label',{},label), input=el('input',{name,type,required:'',autocomplete:type==='password'?'new-password':name==='email'?'email':'name'});if(type==='password'){input.minLength=15;input.maxLength=128;}wrapper.append(input);form.append(wrapper);}
  const info=el('p',{},mode==='password'?'Gunakan 15–128 karakter. Kalimat yang panjang lebih mudah diingat.':mode==='register'?'Pendaftaran belum memberi akses CMS. Pengelola akan menilai permintaan setelah email Anda terverifikasi.':mode==='verify'?'Klik lanjutkan untuk memverifikasi kepemilikan email Anda.':mode==='owner-login'?'Klik lanjutkan untuk menyelesaikan konfirmasi masuk pengelola.':'Tautan dikirim hanya ke email akun yang sudah disetujui.');form.append(info);
  const submit=el('button',{type:'submit'},mode==='password'?'Simpan password':mode==='register'?'Daftar':mode==='reset'?'Kirim tautan':'Lanjutkan');
  let challenge='';
  if(['register','reset'].includes(mode)){const captcha=el('div');form.append(captcha);submit.disabled=true;captchaReady().then(()=>{if(!form.isConnected)return;if(!settings.turnstileSiteKey)throw new Error('Pendaftaran belum siap. Hubungi pengelola.');widget=window.turnstile.render(captcha,{sitekey:settings.turnstileSiteKey,action:mode,size:'flexible',callback:token=>{challenge=token;submit.disabled=false;},'expired-callback':()=>{challenge='';submit.disabled=true;}});}).catch(e=>{error.textContent=e.message;error.hidden=false;});}
  const back=el('button',{type:'button'},'Kembali ke login');back.addEventListener('click',()=>{form.remove();login.hidden=false;nav.hidden=false;});form.append(submit,back);box.append(form);
  form.querySelector('input')?.focus();
  form.addEventListener('submit',async event=>{event.preventDefault();error.hidden=true;submit.disabled=true;back.disabled=true;
   try{const data=Object.fromEntries(new FormData(form));if(mode==='password'&&data.password!==data.confirm)throw new Error('Kedua password belum sama.');delete data.confirm;
    const result=await send({action:mode,...data,...(token?{token}:{}),...(['register','reset'].includes(mode)?{challenge}:{})});
    form.reset();
    if(mode==='owner-login'){window.WALIAN_CMS_AUTH='session';window.WALIAN_CMS_IDENTITY=result;openPanel();return;}
    form.replaceChildren(el('p',{role:'status'},result.message),back);
   }catch(e){error.textContent=e.message;error.hidden=false;}
   finally{submit.disabled=false;back.disabled=false;if(widget!==undefined&&window.turnstile){window.turnstile.reset(widget);challenge='';if(form.contains(submit))submit.disabled=true;}}
  });
 }
 if(['verify','password','owner-login'].includes(flow)&&token)render(flow);
}
