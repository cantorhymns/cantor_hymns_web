import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, getBytes } from 'firebase/storage';
import { firebaseConfig } from '../firebase/config';
import * as fs from 'fs';
import * as path from 'path';

export async function backupStorageFiles(targetDir: string, folders: string[] = ['markers', 'lyrics', 'genres', 'tracks']) {
  console.log(`\n📦 Starting Firebase Storage backup to: ${targetDir}`);
  const app = initializeApp(firebaseConfig);
  const storage = getStorage(app);

  let totalDownloaded = 0;
  let totalBytes = 0;
  let skipped = 0;

  async function syncRef(storageRef: any, relativeDir: string) {
    const listRes = await listAll(storageRef);
    const localDir = path.join(targetDir, relativeDir);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    for (const item of listRes.items) {
      const localFilePath = path.join(localDir, item.name);
      
      // Skip if already exists with matching non-zero size
      if (fs.existsSync(localFilePath)) {
        const stats = fs.statSync(localFilePath);
        if (stats.size > 0) {
          skipped++;
          continue;
        }
      }

      try {
        const buffer = await getBytes(item);
        fs.writeFileSync(localFilePath, Buffer.from(buffer));
        totalDownloaded++;
        totalBytes += buffer.byteLength;
        console.log(`  ✓ Downloaded: ${relativeDir}/${item.name} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        console.error(`  ✗ Failed downloading ${relativeDir}/${item.name}:`, err.message || err);
      }
    }

    for (const prefix of listRes.prefixes) {
      await syncRef(prefix, path.join(relativeDir, prefix.name));
    }
  }

  for (const folder of folders) {
    console.log(`\n📂 Syncing storage folder: "${folder}"...`);
    const rootFolderRef = ref(storage, folder);
    await syncRef(rootFolderRef, folder);
  }

  console.log(`\n🎉 Storage backup complete!`);
  console.log(`- Downloaded: ${totalDownloaded} files (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`- Already up to date: ${skipped} files`);
}

// Allow direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith('backup-storage.ts')) {
  const gdriveBase = path.resolve(process.cwd(), '../../backups/storage');
  const target = process.argv[2] ? path.resolve(process.argv[2]) : gdriveBase;
  backupStorageFiles(target).catch(console.error);
}
