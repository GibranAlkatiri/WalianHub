import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
const params = { N:32768, r:8, p:3, maxmem:48 * 1024 * 1024 };
const derive = (password,salt) => new Promise((resolve,reject)=>scrypt(password,salt,32,params,(error,key)=>error?reject(error):resolve(key)));
export function passwordAcceptable(password) {
  return typeof password==='string' && [...password].length>=15 && [...password].length<=128 && Buffer.byteLength(password,'utf8')<=512;
}
export async function hashPassword(password) {
  if(!passwordAcceptable(password)) throw new Error('Gunakan password 15–128 karakter.');
  const salt=randomBytes(16).toString('hex');
  return `scrypt$32768$8$3$${salt}$${(await derive(password,salt)).toString('hex')}`;
}
export async function verifyPassword(password,stored) {
  if(typeof password!=='string'||Buffer.byteLength(password,'utf8')>512) return false;
  if(!/^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored||'')) return false;
  const [, , , ,salt,hash]=stored.split('$');
  return timingSafeEqual(await derive(password,salt),Buffer.from(hash,'hex'));
}
