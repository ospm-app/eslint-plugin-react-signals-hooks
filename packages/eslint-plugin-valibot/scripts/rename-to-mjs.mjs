/* eslint-disable optimize-regex/optimize-regex */
/* eslint-disable security/detect-non-literal-fs-filename */
import {
  statSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const __dirname = process.cwd();
console.info('Current working directory:', __dirname);

const esmDir = join(__dirname, 'dist/esm');
console.info('Looking for ESM directory at:', esmDir);

function createMjsCopies(dir) {
  console.info('Scanning directory:', dir);
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively process subdirectories
      createMjsCopies(fullPath);
    } else if (file.endsWith('.js')) {
      // Only process .js files, not .d.ts or other extensions
      const mjsPath = fullPath.replace(/\.js$/, '.mjs');

      // Skip if .mjs file already exists
      if (existsSync(mjsPath)) {
        console.info(`Skipping, file already exists: ${relative(__dirname, mjsPath)}`);
        continue;
      }

      // Create a copy of the .js file as .mjs
      copyFileSync(fullPath, mjsPath);
      console.info(`Created: ${relative(__dirname, mjsPath)}`);

      // If there's a corresponding .d.ts file, create a copy and update its references
      const dtsPath = fullPath.replace(/\.js$/, '.d.ts');
      const dtsMjsPath = dtsPath.replace(/\.d\.ts$/, '.d.mts');

      if (existsSync(dtsPath) && !existsSync(dtsMjsPath)) {
        copyFileSync(dtsPath, dtsMjsPath);

        let content = readFileSync(dtsMjsPath, 'utf8');

        content = content.replace(/\.js(['"])/g, '.mjs$1');

        writeFileSync(dtsMjsPath, content, 'utf8');

        console.info(`Created and updated: ${relative(__dirname, dtsMjsPath)}`);
      }
    }
  }
}

createMjsCopies(esmDir);

console.info('Renaming .js files to .mjs in ESM output...');

console.info('Done renaming files.');

// Ensure tools treat dist/esm/*.js as ESM (sourceType: module)
try {
  const pkgPath = join(esmDir, 'package.json');
  const desired = `${JSON.stringify({ type: 'module' }, null, 2)}\n`;
  let needsWrite = true;

  if (existsSync(pkgPath)) {
    try {
      const current = readFileSync(pkgPath, 'utf8');
      needsWrite = current !== desired;
    } catch {}
  }

  if (needsWrite) {
    writeFileSync(pkgPath, desired, 'utf8');
    console.info(`Wrote: ${relative(__dirname, pkgPath)} with { type: 'module' }`);
  } else {
    console.info(`Exists and up-to-date: ${relative(__dirname, pkgPath)}`);
  }
} catch (err) {
  console.warn('Warning: failed to ensure dist/esm/package.json type module:', err);
}
