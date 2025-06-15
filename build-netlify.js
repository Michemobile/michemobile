#!/usr/bin/env node

// Comprehensive build script for Netlify deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Netlify build process...');

// Step 1: Clean previous build
console.log('🧹 Cleaning previous build...');
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✅ Previous build cleaned');
}

// Step 2: Run Vite build
console.log('🔨 Building with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Vite build completed');
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify essential files exist
console.log('🔍 Verifying build output...');
const essentialFiles = [
  'dist/index.html',
  'dist/netlify.toml',
  'dist/critical.css'
];

const missingFiles = essentialFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('❌ Missing essential files:', missingFiles);
  process.exit(1);
}

// Step 4: Optimize index.html for production
console.log('⚡ Optimizing index.html...');
const indexHtmlPath = path.join(distDir, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Add meta tags for better SEO and performance
const metaTags = `
  <meta name="description" content="MicheMobile - Premium mobile beauty services delivered to your location. Book professional makeup, hair styling, and beauty treatments.">
  <meta name="keywords" content="mobile beauty, makeup artist, hair stylist, beauty services, on-demand beauty">
  <meta name="author" content="MicheMobile">
  <meta property="og:title" content="MicheMobile - Mobile Beauty Services">
  <meta property="og:description" content="Premium mobile beauty services delivered to your location">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://michemobile.online">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="MicheMobile - Mobile Beauty Services">
  <meta name="twitter:description" content="Premium mobile beauty services delivered to your location">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="/critical.css" as="style">
  <link rel="dns-prefetch" href="https://api.stripe.com">
  <link rel="dns-prefetch" href="https://connect.stripe.com">
  <link rel="dns-prefetch" href="https://ik.imagekit.io">`;

// Insert meta tags before closing head tag
if (!indexHtml.includes('meta name="description"')) {
  indexHtml = indexHtml.replace('</head>', `${metaTags}\n  </head>`);
}

// Add performance optimizations
const performanceScript = `
<script>
  // Preload critical resources
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
    });
  }
  
  // Critical CSS loading optimization
  const criticalCSS = document.querySelector('link[href="/critical.css"]');
  if (criticalCSS) {
    criticalCSS.onload = function() {
      this.media = 'all';
    };
  }
</script>`;

// Add performance script before closing body tag
if (!indexHtml.includes('serviceWorker')) {
  indexHtml = indexHtml.replace('</body>', `${performanceScript}\n  </body>`);
}

fs.writeFileSync(indexHtmlPath, indexHtml);
console.log('✅ index.html optimized');

// Step 5: Create optimized service worker
console.log('🔧 Creating service worker...');
const serviceWorkerContent = `
// Service Worker for MicheMobile
const CACHE_NAME = 'michemobile-v1';
const urlsToCache = [
  '/',
  '/critical.css',
  '/textures/silver-texture-light.svg',
  '/textures/silver-texture-dark.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`;

fs.writeFileSync(path.join(distDir, 'service-worker.js'), serviceWorkerContent);
console.log('✅ Service worker created');

// Step 6: Create robots.txt
console.log('🤖 Creating robots.txt...');
const robotsContent = `User-agent: *
Allow: /

Sitemap: https://michemobile.online/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /auth/
Disallow: /_netlify/
`;

fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent);
console.log('✅ robots.txt created');

// Step 7: Verify all assets are properly included
console.log('📦 Verifying assets...');
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const assets = fs.readdirSync(assetsDir);
  const cssFiles = assets.filter(file => file.endsWith('.css'));
  const jsFiles = assets.filter(file => file.endsWith('.js'));
  
  console.log(`✅ Found ${cssFiles.length} CSS files and ${jsFiles.length} JS files`);
  
  // Verify CSS contains our custom styles
  if (cssFiles.length > 0) {
    const mainCss = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf8');
    if (mainCss.includes('--brand-bronze') || mainCss.includes('gradient-text')) {
      console.log('✅ Custom CSS styles included');
    } else {
      console.warn('⚠️  Custom CSS styles may be missing');
    }
  }
} else {
  console.error('❌ Assets directory not found');
  process.exit(1);
}

// Step 8: Verify texture files
console.log('🎨 Verifying texture files...');
const texturesDir = path.join(distDir, 'textures');
if (fs.existsSync(texturesDir)) {
  const textures = fs.readdirSync(texturesDir);
  console.log(`✅ Found ${textures.length} texture files:`, textures);
} else {
  console.warn('⚠️  Textures directory not found');
}

// Step 9: Calculate build size
console.log('📊 Calculating build size...');
function getDirectorySize(dirPath) {
  let totalSize = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += fs.statSync(filePath).size;
    }
  }
  
  return totalSize;
}

const buildSize = getDirectorySize(distDir);
const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);
console.log(`📦 Total build size: ${buildSizeMB} MB`);

// Step 10: Final verification
console.log('🔍 Final verification...');
const requiredFiles = [
  'index.html',
  'netlify.toml',
  'critical.css',
  'service-worker.js',
  'robots.txt'
];

const missingRequired = requiredFiles.filter(file => !fs.existsSync(path.join(distDir, file)));
if (missingRequired.length > 0) {
  console.error('❌ Missing required files:', missingRequired);
  process.exit(1);
}

console.log('🎉 Netlify build completed successfully!');
console.log('📁 Build output ready in ./dist directory');
console.log('🚀 Ready for deployment to Netlify');

// Output summary
console.log('\n📋 Build Summary:');
console.log(`   • Build size: ${buildSizeMB} MB`);
console.log(`   • CSS files: ${fs.readdirSync(assetsDir).filter(f => f.endsWith('.css')).length}`);
console.log(`   • JS files: ${fs.readdirSync(assetsDir).filter(f => f.endsWith('.js')).length}`);
console.log(`   • Texture files: ${fs.existsSync(texturesDir) ? fs.readdirSync(texturesDir).length : 0}`);
console.log('   • Service worker: ✅');
console.log('   • SEO optimization: ✅');
console.log('   • Performance optimization: ✅'); 