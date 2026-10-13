import { copyFile, readFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute, join } from 'node:path';

// Only acquisition differs from npm; extraction, activation and rollback use the same deployment transaction.
export function createLocalReleaseSource(archive) {
  if (typeof archive !== 'string' || !isAbsolute(archive)) throw new Error('Local archive requires an absolute path');
  return {
    async download(release, directory) {
      if (typeof release.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(release.integrity)) throw new Error('Invalid local release integrity');
      await mkdir(directory, { recursive: true, mode: 0o700 });
      if ((await stat(archive)).size > 256 * 1024 * 1024) throw new Error('Local release is too large');
      const destination = join(directory, 'release.tgz'); await copyFile(archive, destination);
      const bytes = await readFile(destination);
      if (bytes.length > 256 * 1024 * 1024 || `sha512-${createHash('sha512').update(bytes).digest('base64')}` !== release.integrity)
        throw new Error('Local release integrity mismatch');
      return destination;
    },
  };
}
