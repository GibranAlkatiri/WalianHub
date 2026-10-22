import { createHash } from 'node:crypto';
// Native DigestStream tersedia di workerd; padanan ini hanya untuk Bun/local QA.
export function createVideoDigest() {
  const hash=createHash('sha256');let resolve,reject;
  const digest=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const stream=new WritableStream({write(bytes){hash.update(bytes);},close(){resolve(hash.digest());},abort(){reject(new Error('Digest dibatalkan.'));}});
  stream.digest=digest;return stream;
}
