#!/usr/bin/env node

/**
 * Image Cleanup Script
 * 
 * Finds orphaned images in the images/ directory that are no longer
 * referenced by any posts or books.
 * 
 * Usage:
 *   node scripts/cleanup-images.js          # Dry-run (informational)
 *   node scripts/cleanup-images.js --delete # Interactive deletion with confirmation
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Protected images that should never be deleted
const PROTECTED_IMAGES = [
  'ben-smiling-pic.png',
  'benstanfieldio-opengraph.png',
  'left-chevron.svg',
];

// Grace period - don't delete images newer than this (in days)
const GRACE_PERIOD_DAYS = 7;

const IMAGES_DIR = 'images';
const POSTS_DIR = 'posts';
const BOOKS_FILE = 'books/books.json';

function getAllImages() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  
  return fs.readdirSync(IMAGES_DIR)
    .filter(file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
    .map(file => ({
      name: file,
      path: path.join(IMAGES_DIR, file),
      mtime: fs.statSync(path.join(IMAGES_DIR, file)).mtime,
    }));
}

function getReferencedImages() {
  const referenced = new Set();
  
  // Scan posts
  if (fs.existsSync(POSTS_DIR)) {
    const posts = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
    for (const postFile of posts) {
      const content = fs.readFileSync(path.join(POSTS_DIR, postFile), 'utf-8');
      // Match both local paths and raw GitHub URLs
      const matches = content.match(/images\/[^"'\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi) || [];
      matches.forEach(m => {
        const filename = m.split('/').pop();
        referenced.add(filename);
      });
    }
  }
  
  // Scan books
  if (fs.existsSync(BOOKS_FILE)) {
    const content = fs.readFileSync(BOOKS_FILE, 'utf-8');
    const matches = content.match(/images\/[^"'\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi) || [];
    matches.forEach(m => {
      const filename = m.split('/').pop();
      referenced.add(filename);
    });
  }
  
  return referenced;
}

function findOrphans() {
  const allImages = getAllImages();
  const referenced = getReferencedImages();
  const now = new Date();
  const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  
  return allImages.filter(img => {
    // Skip protected images
    if (PROTECTED_IMAGES.includes(img.name)) return false;
    
    // Skip if referenced
    if (referenced.has(img.name)) return false;
    
    // Skip if within grace period
    const age = now - img.mtime;
    if (age < gracePeriodMs) return false;
    
    return true;
  });
}

function formatAge(mtime) {
  const days = Math.floor((Date.now() - mtime) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

async function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const deleteMode = process.argv.includes('--delete');
  const orphans = findOrphans();
  
  if (orphans.length === 0) {
    console.log('✅ No orphaned images found.');
    return;
  }
  
  console.log(`\n🔍 Found ${orphans.length} orphaned image(s):\n`);
  orphans.forEach(img => {
    console.log(`   - ${img.name} (uploaded ${formatAge(img.mtime)})`);
  });
  console.log('');
  
  if (!deleteMode) {
    console.log('ℹ️  Run with --delete flag to remove these images.');
    console.log('   Example: npm run cleanup:images\n');
    return;
  }
  
  // Interactive confirmation
  const confirmed = await promptConfirmation('Delete these images? [y/N]: ');
  
  if (!confirmed) {
    console.log('Cancelled.');
    return;
  }
  
  // Delete orphans
  let deleted = 0;
  for (const img of orphans) {
    try {
      fs.unlinkSync(img.path);
      console.log(`   🗑️  Deleted: ${img.name}`);
      deleted++;
    } catch (err) {
      console.error(`   ❌ Failed to delete ${img.name}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Deleted ${deleted} image(s).`);
  console.log('   Remember to commit these changes!\n');
}

main().catch(console.error);

