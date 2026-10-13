const list=document.getElementById('staff-list'), message=document.getElementById('staff-message');
const labels={unverified:'Email belum terverifikasi',pending:'Menunggu persetujuan',approved:'Akses aktif',rejected:'Ditolak',revoked:'Akses dicabut'};
const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let busy=false;
function showError(error){
 message.replaceChildren(el('span',error.message));
 if([401,403].includes(error.status)){const link=el('a','Masuk ulang sebagai pengelola');link.href='./?reauth=staff';link.style.display='block';message.append(link);}
}
async function load(){if(busy)return;busy=true;try{
 const res=await fetch('/api/staff',{credentials:'same-origin',cache:'no-store'}), data=await res.json();if(!res.ok){const error=new Error(data.error||'Daftar belum tersedia.');error.status=res.status;throw error;}
 list.replaceChildren();if(!data.users.length)list.append(el('p','Belum ada pendaftaran staf.'));
 for(const user of data.users){const card=el('section','');card.className='staff-card';card.append(el('h2',user.name),el('p',user.email),el('p',labels[user.status]||user.status));
  const actions=el('div','');actions.className='staff-actions';
  const options=user.status==='pending'?[['approve','Setujui'],['reject','Tolak']]:user.status==='approved'?[['invite','Kirim tautan password'],['revoke','Cabut akses']]:user.status==='unverified'?[['reject','Tolak']]:[];
  for(const[action,label]of options){const button=el('button',label);button.type='button';button.dataset.action=action;button.addEventListener('click',()=>change(user,action));actions.append(button);}
  card.append(actions);list.append(card);
 }
 }catch(error){showError(error);}finally{busy=false;}}
async function change(user,action){if(busy)return;if(['reject','revoke'].includes(action)&&!confirm(`${action==='revoke'?'Cabut akses':'Tolak pendaftaran'} ${user.email}?`))return;
 busy=true;document.querySelectorAll('button').forEach(n=>n.disabled=true);
 try{const res=await fetch('/api/staff',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({action,id:user.id,version:user.version})}),data=await res.json();if(!res.ok){const error=new Error(data.error||'Perubahan belum berhasil.');error.status=res.status;throw error;}message.textContent=data.message;}
 catch(error){showError(error);}
 finally{busy=false;document.querySelectorAll('button').forEach(n=>n.disabled=false);await load();}
}
document.getElementById('staff-reload').addEventListener('click',load);load();
