// Script to copy essential assets to dist folder
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run build first.');
  process.exit(1);
}

// Function to copy directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Get all files and directories in source
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Copy netlify.toml to dist
try {
  const netlifySource = path.join(__dirname, 'netlify.toml');
  const netlifyTarget = path.join(distDir, 'netlify.toml');
  fs.copyFileSync(netlifySource, netlifyTarget);
  console.log('Successfully copied netlify.toml to dist folder');
} catch (err) {
  console.error('Error copying netlify.toml:', err);
}

// Copy textures directory to dist
try {
  const texturesSource = path.join(publicDir, 'textures');
  const texturesTarget = path.join(distDir, 'textures');
  
  if (fs.existsSync(texturesSource)) {
    copyDir(texturesSource, texturesTarget);
    console.log('Successfully copied textures directory to dist folder');
  } else {
    console.warn('Warning: textures directory not found in public folder');
  }
} catch (err) {
  console.error('Error copying textures directory:', err);
}

// Create a critical CSS file in dist
try {
  const criticalCssContent = `
/* Critical CSS to ensure theme consistency */
:root {
  --background: 0 0% 100%;  /* Pure white */
  --foreground: 0 0% 20%;   /* Dark grey text */

  --card: 0 0% 100%;        /* White card background */
  --card-foreground: 0 0% 20%;  /* Dark grey text */

  --popover: 0 0% 100%;     /* White popover */
  --popover-foreground: 0 0% 20%;  /* Dark grey text */

  --primary: 0 0% 66%;      /* Silver primary color (#A9A9A9) */
  --primary-foreground: 0 0% 100%; /* White text on primary */

  --secondary: 0 0% 83%;    /* Light silver secondary color (#D3D3D3) */
  --secondary-foreground: 0 0% 20%; /* Dark grey text on secondary */

  --muted: 0 0% 96%;        /* Very light grey for muted bg */
  --muted-foreground: 0 0% 45%; /* Medium grey for muted text */

  --accent: 0 0% 75%;       /* Silver accent (#C0C0C0) */
  --accent-foreground: 0 0% 20%; /* Dark grey on accent */

  --destructive: 0 0% 50%;  /* Medium grey destructive button */
  --destructive-foreground: 0 0% 100%; /* White text on destructive */

  --border: 0 0% 83%;       /* Light silver border (#D3D3D3) */
  --input: 0 0% 83%;        /* Light silver input border */
  --ring: 0 0% 75%;         /* Silver ring (#C0C0C0) */

  --radius: 0.5rem;
}

.dark {
  --background: 0 0% 10%;    /* Very dark grey background */
  --foreground: 0 0% 95%;    /* Very light grey text */

  --card: 0 0% 15%;          /* Dark grey card */
  --card-foreground: 0 0% 95%; /* Light grey text */

  --popover: 0 0% 15%;       /* Dark grey popover */
  --popover-foreground: 0 0% 95%; /* Light grey text */

  --primary: 0 0% 75%;       /* Silver primary color (#C0C0C0) */
  --primary-foreground: 0 0% 10%; /* Very dark grey text on primary */

  --secondary: 0 0% 30%;     /* Dark grey secondary */
  --secondary-foreground: 0 0% 95%; /* Light grey text on secondary */

  --muted: 0 0% 20%;         /* Dark grey muted background */
  --muted-foreground: 0 0% 70%; /* Light grey muted text */

  --accent: 0 0% 30%;        /* Dark grey accent */
  --accent-foreground: 0 0% 95%; /* Light text on accent */

  --destructive: 0 0% 50%;   /* Grey destructive */
  --destructive-foreground: 0 0% 95%; /* Light text on destructive */

  --border: 0 0% 30%;        /* Dark grey border */
  --input: 0 0% 30%;         /* Dark grey input border */
  --ring: 0 0% 75%;          /* Silver ring */
}
`;

  const criticalCssPath = path.join(distDir, 'critical.css');
  fs.writeFileSync(criticalCssPath, criticalCssContent);
  console.log('Successfully created critical.css in dist folder');

  // Update index.html to include critical CSS
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Add critical CSS link if not already present
    if (!indexHtml.includes('critical.css')) {
      indexHtml = indexHtml.replace(
        '</head>',
        '  <link rel="stylesheet" href="/critical.css">\n  </head>'
      );
      fs.writeFileSync(indexHtmlPath, indexHtml);
      console.log('Successfully updated index.html to include critical CSS');
    }
  } else {
    console.warn('Warning: index.html not found in dist folder');
  }
} catch (err) {
  console.error('Error creating critical CSS:', err);
}

console.log('Asset copying completed successfully!');
