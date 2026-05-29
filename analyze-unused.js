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
const ignoreFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', '.env'];
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
        // Source code
        if (['.js', '.jsx', '.ts', '.tsx', '.json'].includes(ext)) {
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
    const dirname = path.dirname(baseDir);
    
    // Import patterns
    const patterns = [
      /import\s+(?:{[^}]*}|[^'"`]+?)\s+from\s+['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /export\s+(?:{[^}]*}|[^'"`]+?)\s+from\s+['"`]([^'"`]+)['"`]/g,
      /src\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      /href\s*=\s*['"`]([^'"`]+)['"`]/g,
      /path\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
      /['"`]([^'"`]*\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4|json))['"`]/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const ref = match[1].trim();
        if (ref && !ref.startsWith('http') && ref !== '.') {
          resolveReference(ref, baseDir);
        }
      }
    });
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
  const exts = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
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

// Mark entry points
usedSourceFiles.add('main.tsx');
usedSourceFiles.add('App.tsx');
usedSourceFiles.add('Intro.tsx');

console.log(`${colors.blue}🔗 Analyzing references...${colors.reset}\n`);

// Analyze all source files
sourceFiles.forEach(file => {
  const fullPath = path.join(srcDir, file);
  analyzeFile(fullPath);
});

// Find unused
const unusedSource = Array.from(sourceFiles).filter(f => !usedSourceFiles.has(f)).sort();
const unusedPublic = Array.from(publicFiles).filter(f => !usedPublicFiles.has(f)).sort();

// Output
console.log('\n' + '═'.repeat(80));
console.log(`${colors.bold}${colors.blue}📋 UNUSED FILES REPORT${colors.reset}`);
console.log('═'.repeat(80) + '\n');

console.log(`${colors.green}✅ Used Source Files: ${usedSourceFiles.size}/${sourceFiles.size}${colors.reset}`);
console.log(`${colors.red}❌ Unused Source Files: ${unusedSource.length}${colors.reset}\n`);
console.log(`${colors.green}✅ Used Asset Files: ${usedPublicFiles.size}/${publicFiles.size}${colors.reset}`);
console.log(`${colors.red}❌ Unused Asset Files: ${unusedPublic.length}${colors.reset}\n`);

if (unusedSource.length > 0) {
  console.log(`${colors.bold}${colors.yellow}📁 UNUSED SOURCE CODE FILES:${colors.reset}\n`);
  unusedSource.forEach(f => {
    console.log(`  ${colors.red}●${colors.reset} ${f}`);
  });
  console.log();
}

if (unusedPublic.length > 0) {
  console.log(`${colors.bold}${colors.yellow}🖼️  UNUSED ASSET FILES:${colors.reset}\n`);
  // Group by type for easier review
  const byExt = {};
  unusedPublic.forEach(f => {
    const ext = path.extname(f) || 'other';
    if (!byExt[ext]) byExt[ext] = [];
    byExt[ext].push(f);
  });
  
  Object.keys(byExt).sort().forEach(ext => {
    console.log(`  ${colors.yellow}${ext || 'Other'}:${colors.reset}`);
    byExt[ext].forEach(f => {
      console.log(`    ${colors.red}●${colors.reset} ${f}`);
    });
  });
  console.log();
}

if (unusedSource.length === 0 && unusedPublic.length === 0) {
  console.log(`${colors.green}✨ All files appear to be in use!${colors.reset}\n`);
}

console.log('═'.repeat(80));
