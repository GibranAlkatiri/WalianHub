import {validatePengaturan} from '../../server/cms-pengaturan.js';
import {guardedImportSql} from './cms-guarded-import.js';
export function pengaturanImportSql(manifest,baseline,config) {
  const entries=manifest.entries.filter((entry)=>entry.collection==='pengaturan'),collection=config.collections.find((item)=>item.name==='pengaturan');
  if(!collection||entries.length!==3||!['situs','beranda','profil'].every((name)=>entries.some((entry)=>entry.slug===name))||!/^[a-f0-9]{40}$/.test(manifest.mainSha))throw new Error('Cadangan Pengaturan tidak lengkap.');
  for(const entry of entries){
    if(entry.path!==`src/content/pengaturan/${entry.slug}.json`)throw new Error('Tujuan impor Pengaturan tidak sesuai.');
    if(entry.published)validatePengaturan(entry.published.data,collection,entry.slug,true);
    if(entry.draft?.data)validatePengaturan(entry.draft.data,collection,entry.slug);
  }
  return guardedImportSql(manifest,baseline,entries,['pengaturan'],'pengaturan:');
}
