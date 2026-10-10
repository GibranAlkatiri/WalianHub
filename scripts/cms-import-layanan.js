import { readSnapshot } from './lib/cms-snapshot.js';
import { layananImportSql } from './lib/cms-layanan-import.js';
import { resolve, join } from 'node:path';
import { writeFile } from 'node:fs/promises';

try {
  const target = process.argv[2];
  if (!target) throw new Error('Berikan direktori cadangan yang sudah diverifikasi.');
  const directory = resolve(target);
  const snapshot = await readSnapshot(directory);
  const path = join(directory, 'layanan-import.sql');
  await writeFile(path, layananImportSql(snapshot.manifest), { flag: 'wx' });
  console.log(JSON.stringify({ path, sourceSha: snapshot.manifest.mainSha, layanan: snapshot.manifest.entries.filter((entry) => entry.collection === 'layanan').length, verified:true }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
