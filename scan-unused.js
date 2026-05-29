#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const projectRoot = __dirname;
const srcDir = path.join(projectRoot, 'frontend/src');
const publicDir = path.join(projectRoot, 'frontend/public');

const ignoreDirs = ['node_modules', '.git', '.vscode', '__pycache__', 'dist'];
const ignoreFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', '.env', 'manifest.webmanifest'];
const ignorePatterns = ['.test.', '.spec.', '.d.ts', '.old'];

// Track all files
const sourceFiles = new Set();
const publicFiles = new Set();
const usedSourceFiles = new Set();
const usedPublicFiles = new Set();

// Get all files recursively
function getAllFiles(dir, isPublic = false) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(isPublic ? publicDir : srcDir, fullPath);
      
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          files.push(...getAllFiles(fullPath, isPublic));
        }
        return;
      }
      
      if (ignoreFiles.includes(entry.name) || ignorePatterns.some(p => entry.name.includes(p))) {
        return;
      }
      
      const ext = path.extname(entry.name).toLowerCase();
      
      if (isPublic) {
        // Public assets
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp3', '.mp4', '.json', '.html'].includes(ext)) {
          files.push(relativePath);
        }
      } else {
        // Source code + CSS
        if (['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html'].includes(ext)) {
          files.push(relativePath);
        }
      }
    });
  } catch (e) {
    // Skip
  }
  
  return files;
}

// Read and parse file for references
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const baseDir = path.dirname(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Import patterns
    const importPatterns = [
      /import\s+(?:{[^}]*}|[^'"`]+?)\s+from\s+['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /export\s+(?:{[^}]*}|[^'"`]+?)\s+from\s+['"`]([^'"`]+)['"`]/g,
    ];
    
    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const ref = match[1].trim();
        if (ref && !ref.startsWith('http') && ref !== '.') {
          resolveReference(ref, baseDir);
        }
      }
    });
    
    // Asset patterns - more comprehensive
    const assetPatterns = [
      // Standard references
      /['"`]([^'"`]*\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4|json|html))['"`]/gi,
      // src= or src:
      /src\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      // href=
      /href\s*=\s*['"`]([^'"`]+)['"`]/g,
      // path: or path =
      /path\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      // image:, icon:, poster:
      /(image|icon|poster|picture|photo|url|background)\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      // CSS url()
      /url\s*\(\s*['"`]?([^'"`)\s]+\.(?:png|jpg|jpeg|gif|svg|webp|mp3|mp4))['"`]?\s*\)/gi,
    ];
    
    assetPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const ref = match[match.length - 1]; // Get last captured group
        if (ref && typeof ref === 'string') {
          const cleanRef = ref.trim().split('?')[0].split('#')[0];
          if (cleanRef.match(/\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4|json|html)$/i)) {
            resolveAssetReference(cleanRef, baseDir);
          }
        }
      }
    });
    
    // For JSON files, also check string values that look like paths
    if (ext === '.json') {
      try {
        const json = JSON.parse(content);
        const jsonStr = JSON.stringify(json);
        const assetMatches = jsonStr.match(/["']([^"']*\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4))["']/gi);
        if (assetMatches) {
          assetMatches.forEach(match => {
            const cleanPath = match.replace(/["']/g, '').split('?')[0].split('#')[0];
            resolveAssetReference(cleanPath, baseDir);
          });
        }
      } catch (e) {
        // Not valid JSON or parsing error
      }
    }
    
  } catch (e) {
    // Skip
  }
}

// Resolve a reference to actual file
function resolveReference(ref, fromDir) {
  ref = ref.split('?')[0].split('#')[0];
  
  if (ref.startsWith('@') || ref.startsWith('http')) {
    return;
  }
  
  let targetPath;
  
  if (ref.startsWith('.')) {
    // Relative path
    targetPath = path.normalize(path.join(fromDir, ref));
  } else if (ref.startsWith('/')) {
    // Absolute from src root
    targetPath = path.normalize(path.join(srcDir, ref));
  } else {
    // Module name - skip
    return;
  }
  
  // Try different extensions
  const exts = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp3', '.mp4', '.css'];
  for (const ext of exts) {
    const tryPath = targetPath + ext;
    if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
      markAsUsed(tryPath);
      return;
    }
  }
  
  // Try as directory with index
  for (const ext of ['', '.js', '.jsx', '.ts', '.tsx']) {
    const indexPath = path.join(targetPath, 'index' + ext);
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      markAsUsed(indexPath);
      return;
    }
  }
}

// Resolve asset reference
function resolveAssetReference(assetRef, fromDir) {
  assetRef = assetRef.split('?')[0].split('#')[0];
  
  if (!assetRef || assetRef.startsWith('http')) {
    return;
  }
  
  // Try in public directory first
  let tryPath = path.normalize(path.join(publicDir, assetRef));
  if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
    markAsUsed(tryPath);
    return;
  }
  
  // Try relative to current file
  tryPath = path.normalize(path.join(fromDir, assetRef));
  if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
    markAsUsed(tryPath);
    return;
  }
  
  // Try in src root
  tryPath = path.normalize(path.join(srcDir, assetRef));
  if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
    markAsUsed(tryPath);
    return;
  }
}

// Mark file as used
function markAsUsed(filePath) {
  if (filePath.includes(srcDir)) {
    const rel = path.relative(srcDir, filePath).replace(/\\/g, '/');
    usedSourceFiles.add(rel);
  } else if (filePath.includes(publicDir)) {
    const rel = path.relative(publicDir, filePath).replace(/\\/g, '/');
    usedPublicFiles.add(rel);
  }
}

// Main execution
console.log(`${colors.blue}🔍 Scanning files...${colors.reset}\n`);

// Get all source files
getAllFiles(srcDir, false).forEach(f => sourceFiles.add(f));
getAllFiles(publicDir, true).forEach(f => publicFiles.add(f));

console.log(`${colors.blue}📊 Found ${sourceFiles.size} source files and ${publicFiles.size} asset files${colors.reset}\n`);

// Mark entry points and important components
['main.tsx', 'App.tsx', 'Intro.tsx', 'index.html'].forEach(f => {
  sourceFiles.forEach(file => {
    if (file.endsWith(f)) {
      usedSourceFiles.add(file);
    }
  });
  publicFiles.forEach(file => {
    if (file.endsWith(f)) {
      usedPublicFiles.add(file);
    }
  });
});

console.log(`${colors.blue}🔗 Analyzing references from all files...${colors.reset}\n`);

// Analyze all source files
sourceFiles.forEach(file => {
  const fullPath = path.join(srcDir, file);
  analyzeFile(fullPath);
});

// Also analyze public JSON and HTML files
publicFiles.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.json' || ext === '.html') {
    const fullPath = path.join(publicDir, file);
    analyzeFile(fullPath);
  }
});

// Find unused
const unusedSource = Array.from(sourceFiles).filter(f => !usedSourceFiles.has(f)).sort();
const unusedPublic = Array.from(publicFiles).filter(f => !usedPublicFiles.has(f)).sort();

// Output
console.log('\n' + '═'.repeat(90));
console.log(`${colors.bold}${colors.blue}📋 UNUSED FILES ANALYSIS REPORT${colors.reset}`);
console.log('═'.repeat(90) + '\n');

const usedSourceCount = usedSourceFiles.size;
const totalSourceCount = sourceFiles.size;
const usedPublicCount = usedPublicFiles.size;
const totalPublicCount = publicFiles.size;

console.log(`${colors.green}✅ Used Source Files: ${usedSourceCount}/${totalSourceCount}${colors.reset}  [${((usedSourceCount / totalSourceCount) * 100).toFixed(1)}%]`);
console.log(`${colors.red}❌ Unused Source Files: ${unusedSource.length}${colors.reset}\n`);

console.log(`${colors.green}✅ Used Asset Files: ${usedPublicCount}/${totalPublicCount}${colors.reset}  [${((usedPublicCount / totalPublicCount) * 100).toFixed(1)}%]`);
console.log(`${colors.red}❌ Unused Asset Files: ${unusedPublic.length}${colors.reset}\n`);

if (unusedSource.length > 0) {
  console.log(`${colors.bold}${colors.yellow}📁 UNUSED SOURCE CODE FILES (${unusedSource.length}):${colors.reset}\n`);
  unusedSource.forEach(f => {
    console.log(`  ${colors.red}●${colors.reset} ${f}`);
  });
  console.log();
}

if (unusedPublic.length > 0) {
  console.log(`${colors.bold}${colors.yellow}🖼️  UNUSED ASSET FILES (${unusedPublic.length}):${colors.reset}\n`);
  
  // Group by type for easier review
  const byExt = {};
  unusedPublic.forEach(f => {
    const ext = path.extname(f) || 'other';
    if (!byExt[ext]) byExt[ext] = [];
    byExt[ext].push(f);
  });
  
  Object.keys(byExt).sort().forEach(ext => {
    const count = byExt[ext].length;
    console.log(`  ${colors.yellow}${ext || 'Other'} (${count}):${colors.reset}`);
    byExt[ext].slice(0, 20).forEach(f => {
      console.log(`    ${colors.red}●${colors.reset} ${f}`);
    });
    if (byExt[ext].length > 20) {
      console.log(`    ${colors.gray}... and ${byExt[ext].length - 20} more${colors.reset}`);
    }
  });
  console.log();
}

if (unusedSource.length === 0 && unusedPublic.length === 0) {
  console.log(`${colors.green}✨ All files appear to be in use!${colors.reset}\n`);
}

console.log('═'.repeat(90));
