#!/usr/bin/env node

/**
 * Sync script to copy files from web/ to public/web/
 * This ensures both directories stay in sync for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'web');
const targetDir = path.join(__dirname, 'public', 'web');

// Files to sync (excluding node_modules and other unnecessary files)
const filesToSync = [
  'index.html',
  'app.js',
  'styles.css',
  'api.js',
  'auth.js',
  'config.js',
  'analytics.js',
];

// Ensure target directory exists
if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
}
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('🔄 Syncing web/ → public/web/...\n');

let syncedCount = 0;
let skippedCount = 0;

// Sync each file
filesToSync.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  Skipping ${file} (not found in web/)`);
    skippedCount++;
    return;
  }

  // Read source file
  const content = fs.readFileSync(sourcePath, 'utf8');
  
  // Write to target
  fs.writeFileSync(targetPath, content, 'utf8');
  
  console.log(`✅ Synced ${file}`);
  syncedCount++;
});

// Copy vercel.json if it exists in web/
const vercelJsonSource = path.join(sourceDir, 'vercel.json');
const vercelJsonTarget = path.join(targetDir, 'vercel.json');
if (fs.existsSync(vercelJsonSource)) {
  const content = fs.readFileSync(vercelJsonSource, 'utf8');
  fs.writeFileSync(vercelJsonTarget, content, 'utf8');
  console.log(`✅ Synced vercel.json`);
  syncedCount++;
}

console.log(`\n✨ Done! Synced ${syncedCount} file(s), skipped ${skippedCount} file(s).`);

