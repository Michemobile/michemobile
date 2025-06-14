// Script to copy netlify.toml to dist folder
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const sourceFile = path.join(__dirname, 'netlify.toml');
const targetFile = path.join(__dirname, 'dist', 'netlify.toml');

// Ensure dist directory exists
if (!fs.existsSync(path.join(__dirname, 'dist'))) {
  console.error('Error: dist directory does not exist. Run build first.');
  process.exit(1);
}

// Copy the file
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log('Successfully copied netlify.toml to dist folder');
} catch (err) {
  console.error('Error copying netlify.toml:', err);
  process.exit(1);
}
