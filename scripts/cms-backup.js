import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { captureSnapshot, writeSnapshot, readSnapshot, snapshotSql } from './lib/cms-snapshot.js';

const [command = 'capture', target] = process.argv.slice(2);
const summary = (manifest) => ({ mainSha: manifest.mainSha, published: manifest.entries.filter((entry) => entry.published).length, drafts: manifest.entries.filter((entry) => entry.draft).length, mediaVersions: manifest.files.filter((file) => file.kind === 'media').length, uniqueMedia: new Set(manifest.files.filter((file) => file.kind === 'media').map((file) => file.sha)).size });
try {
  if (command === 'capture') {
    const directory = resolve('.cms-backups', target || new Date().toISOString().replaceAll(':', '-'));
    if (!directory.startsWith(resolve('.cms-backups') + '\\') && !directory.startsWith(resolve('.cms-backups') + '/')) throw new Error('Cadangan harus berada di .cms-backups/.');
    await mkdir(resolve('.cms-backups'), { recursive: true });
    const snapshot = await captureSnapshot('GibranAlkatiri/WalianHub', 'main', fetch, process.env.GITHUB_TOKEN || '');
    await writeSnapshot(snapshot, directory);
    const verified = await readSnapshot(directory);
    console.log(JSON.stringify({ directory, ...summary(verified.manifest), verified: true }, null, 2));
  } else if (command === 'verify' || command === 'sql') {
    if (!target) throw new Error('Berikan direktori cadangan yang akan diperiksa.');
    const snapshot = await readSnapshot(resolve(target));
    if (command === 'sql') {
      const path = join(resolve(target), 'staging.sql');
      await writeFile(path, snapshotSql(snapshot.manifest), { flag: 'wx' });
      console.log(JSON.stringify({ path, ...summary(snapshot.manifest) }, null, 2));
    } else console.log(JSON.stringify({ ...summary(snapshot.manifest), verified: true }, null, 2));
  } else throw new Error('Perintah tersedia: capture, verify, sql.');
} catch (error) {
  // GitHub bodies/credentials are never printed.
  console.error(error.message);
  process.exitCode = 1;
}
