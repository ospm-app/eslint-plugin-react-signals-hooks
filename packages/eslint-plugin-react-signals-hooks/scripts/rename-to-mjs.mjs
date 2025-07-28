/* eslint-disable optimize-regex/optimize-regex */
/* eslint-disable security/detect-non-literal-fs-filename */
import {
  statSync,
  renameSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const __dirname = process.cwd();
console.info('Current working directory:', __dirname);

const esmDir = join(__dirname, 'dist/esm');
console.info('Looking for ESM directory at:', esmDir);

function renameJsToMjs(dir) {
  console.info('Scanning directory:', dir);
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively process subdirectories
      renameJsToMjs(fullPath);
    } else if (file.endsWith('.js')) {
      // Only rename .js files, not .d.ts or other extensions
      const newPath = fullPath.replace(/\.js$/, '.mjs');

      // Rename the file
      renameSync(fullPath, newPath);

      console.info(`Renamed: ${relative(__dirname, fullPath)} -> ${relative(__dirname, newPath)}`);

      // If there's a corresponding .d.ts file, update its references
      const dtsPath = fullPath.replace(/\.js$/, '.d.ts');

      if (existsSync(dtsPath)) {
        let content = readFileSync(dtsPath, 'utf8');

        content = content.replace(/\.js(['"])/g, '.mjs$1');

        writeFileSync(dtsPath, content, 'utf8');

        console.info(`Updated references in: ${relative(__dirname, dtsPath)}`);
      }
    }
  }
}

console.info('Renaming .js files to .mjs in ESM output...');
renameJsToMjs(esmDir);
console.info('Done renaming files.');
