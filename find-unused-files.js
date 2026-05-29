#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// Configuration
const projectRoot = __dirname;
const frontendSrcDir = path.join(projectRoot, 'frontend/src');
const frontendPublicDir = path.join(projectRoot, 'frontend/public');
const backendDir = path.join(projectRoot, 'backend');

const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.vscode', '.github', '__pycache__'];
const ignorePatterns = ['.test.', '.spec.', '.d.ts', '.old', '.bak', '.sample', 'example'];
const ignoreFileNames = ['.env', 'package.json', 'tsconfig.json', 'vite.config.ts', 'eslint.config.js', 'manifest.webmanifest'];

// Track all files and their references
const allSourceFiles = new Map(); // filePath -> { type, baseDir }
const allPublicFiles = new Map(); // filePath -> { type, baseDir }
const referencedSourceFiles = new Set();
const referencedPublicFiles = new Set();
const fileContent = new Map(); // cache for file content

// Extensions to check for code analysis
const codeExtensions = ['.js', '.jsx', '.ts', '.tsx'];
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
const staticExtensions = [...imageExtensions, '.mp3', '.mp4', '.json', '.html'];
const allExtensions = [...codeExtensions, ...staticExtensions];

/**
 * Recursively get all files in directory
 */
function getAllFilesInDir(dir, baseDir = dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip ignored directories and files
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          files.push(...getAllFilesInDir(fullPath, baseDir));
        }
        return;
      }

      // Skip ignored files
      if (ignoreFileNames.includes(entry.name) || ignorePatterns.some(p => relativePath.includes(p))) {
        return;
      }

      // Include files with relevant extensions
      const ext = path.extname(entry.name).toLowerCase();
      if (allExtensions.includes(ext)) {
        files.push(relativePath);
      }
    });
  } catch (e) {
    // Silently skip inaccessible directories
  }

  return files;
}

/**
 * Extract all references from a file
 */
function extractReferences(filePath) {
  try {
    let content;
    if (fileContent.has(filePath)) {
      content = fileContent.get(filePath);
    } else {
      content = fs.readFileSync(filePath, 'utf8');
      fileContent.set(filePath, content);
    }

    // Better import/require patterns - specifically for code files
    const importPatterns = [
      // ES6 imports: import X from 'path'
      /import\s+(?:(?:\{[^}]*\})|(?:[^'"`]+?))\s+from\s+['"`]([^'"`]+)['"`]/g,
      // CommonJS: require('path')  
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // Dynamic imports: import('path')
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      // Export from: export ... from 'path'
      /export\s+(?:(?:\{[^}]*\})|[^'"`]+?)\s+from\s+['"`]([^'"`]+)['"`]/g,
    ];

    const assetPatterns = [
      // Image/media src attributes - src: or src = 
      /src\s*[:=]\s*['"`]([^'"`]+\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4))['"`]/gi,
      // Img src: src="path"
      /src\s*=\s*['"`]([^'"`]+)['"`]/g,
      // Import images/assets directly in code
      /['"`]([^'"`]*\.(png|jpg|jpeg|gif|svg|webp|mp3|mp4))['"`]/gi,
      // Href/path attributes
      /href\s*=\s*['"`]([^'"`]+)['"`]/g,
      // Data source references
      /path\s*[:=]\s*['"`]([^'"`]+)['"`]/g,
    ];

    // Extract imports
    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const modulePath = match[1].trim();
        if (modulePath && !modulePath.startsWith('http') && modulePath !== '.') {
          resolveAndMarkAsReferenced(modulePath, filePath);
        }
      }
    });

    // Extract asset references
    assetPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const assetPath = match[1].trim();
        if (assetPath && (imageExtensions.some(ext => assetPath.toLowerCase().endsWith(ext)) ||
            assetPath.endsWith('.mp3') || assetPath.endsWith('.mp4'))) {
          resolveAssetPath(assetPath, filePath);
        }
      }
    });
  } catch (e) {
    // Silently skip files that can't be read
  }
}

/**
 * Resolve a module path and mark it as referenced
 */
function resolveAndMarkAsReferenced(modulePath, fromPath) {
  // Skip external packages
  if (modulePath.startsWith('@') || modulePath.startsWith('http')) {
    return;
  }

  // Remove query strings and fragments
  modulePath = modulePath.split('?')[0].split('#')[0];

  const fromDir = path.dirname(fromPath);
  let basePath;

  if (modulePath.startsWith('.')) {
    // Relative import
    basePath = path.normalize(path.join(fromDir, modulePath));
  } else if (modulePath.startsWith('/')) {
    // Absolute import (from src root)
    basePath = path.normalize(path.join(frontendSrcDir, modulePath));
  } else {
    // Module name - skip
    return;
  }

  // Try all possible variations
  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.json', '.html'];
  const possibilities = [];

  extensions.forEach(ext => {
    possibilities.push(basePath + ext);
  });

  // Also try as directory with index
  ['', '.js', '.jsx', '.ts', '.tsx'].forEach(ext => {
    possibilities.push(path.join(basePath, 'index' + ext));
  });

  // Try to find the file
  for (const tryPath of possibilities) {
    try {
      if (fs.existsSync(tryPath) && fs.statSync(tryPath).isFile()) {
        // Find relative path from source dir
        let relPath;
        if (tryPath.includes(frontendSrcDir)) {
          relPath = path.relative(frontendSrcDir, tryPath).replace(/\\/g, '/');
          referencedSourceFiles.add(relPath);
        } else if (tryPath.includes(frontendPublicDir)) {
          relPath = path.relative(frontendPublicDir, tryPath).replace(/\\/g, '/');
          referencedPublicFiles.add(relPath);
        }
        return;
      }
    } catch (e) {
      // Continue to next option
    }
  }
}

/**
 * Resolve asset paths
 */
function resolveAssetPath(assetPath, fromPath) {
  assetPath = assetPath.split('?')[0].split('#')[0];

  // Try in public directory
  const publicPath = path.join(frontendPublicDir, assetPath);
  try {
    if (fs.existsSync(publicPath)) {
      const relPath = path.relative(frontendPublicDir, publicPath).replace(/\\/g, '/');
      referencedPublicFiles.add(relPath);
      return;
    }
  } catch (e) {
    // Continue
  }

  // Try relative to current file
  const fromDir = path.dirname(fromPath);
  const relativeAssetPath = path.normalize(path.join(fromDir, assetPath));
  try {
    if (fs.existsSync(relativeAssetPath)) {
      if (relativeAssetPath.includes(frontendSrcDir)) {
        const relPath = path.relative(frontendSrcDir, relativeAssetPath).replace(/\\/g, '/');
        referencedSourceFiles.add(relPath);
      } else if (relativeAssetPath.includes(frontendPublicDir)) {
        const relPath = path.relative(frontendPublicDir, relativeAssetPath).replace(/\\/g, '/');
        referencedPublicFiles.add(relPath);
      }
      return;
    }
  } catch (e) {
    // Continue
  }
}

/**
 * Main execution
 */
console.log(`${colors.blue}🔍 Scanning project files...${colors.reset}\n`);

// Get all frontend src files
const frontendSrcFiles = getAllFilesInDir(frontendSrcDir);
frontendSrcFiles.forEach(f => {
  allFiles.set(f, { type: 'src', baseDir: frontendSrcDir });
});

// Get all frontend public files
const frontendPublicFiles = getAllFilesInDir(frontendPublicDir);
frontendPublicFiles.forEach(f => {
  allFiles.set(f, { type: 'public', baseDir: frontendPublicDir });
});

// Get all backend files
const backendFiles = getAllFilesInDir(backendDir);
backendFiles.forEach(f => {
  allFiles.set(f, { type: 'backend', baseDir: backendDir });
});

console.log(`${colors.blue}📊 Found ${allFiles.size} files total${colors.reset}`);
console.log(`  - Frontend src: ${frontendSrcFiles.length}`);
console.log(`  - Frontend public: ${frontendPublicFiles.length}`);
console.log(`  - Backend: ${backendFiles.length}\n`);

console.log(`${colors.blue}🔗 Analyzing imports and references...${colors.reset}\n`);

// Add entry points as referenced
const entryPoints = [
  path.relative(frontendSrcDir, path.join(frontendSrcDir, 'main.tsx')),
  path.relative(frontendPublicDir, path.join(frontendPublicDir, 'index.html')),
];
entryPoints.forEach(ep => {
  referencedFiles.add(ep.replace(/\\/g, '/'));
});

// Analyze all files for references
allFiles.forEach((info, filePath) => {
  const fullPath = path.join(info.baseDir, filePath);
  extractReferences(fullPath, path.dirname(fullPath));
});

// Mark entry components as used
const importantComponents = [
  'App.tsx',
  'main.tsx',
  'Intro.tsx',
  'index.html',
];
importantComponents.forEach(comp => {
  allFiles.forEach((info, filePath) => {
    if (filePath.endsWith(comp)) {
      referencedFiles.add(filePath.replace(/\\/g, '/'));
    }
  });
});

// Separate used and unused files
const usedFiles = [];
const unusedFiles = [];

allFiles.forEach((info, filePath) => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (referencedFiles.has(normalizedPath)) {
    usedFiles.push({ path: filePath, type: info.type });
  } else {
    unusedFiles.push({ path: filePath, type: info.type });
  }
});

// Sort for better display
usedFiles.sort((a, b) => a.path.localeCompare(b.path));
unusedFiles.sort((a, b) => a.path.localeCompare(b.path));

// Output results
console.log('\n' + '═'.repeat(70));
console.log(`${colors.bold}${colors.blue}📋 ANALYSIS RESULTS${colors.reset}`);
console.log('═'.repeat(70) + '\n');

console.log(`${colors.green}✅ USED FILES: ${usedFiles.length}${colors.reset}`);
console.log(`${colors.red}❌ UNUSED FILES: ${unusedFiles.length}${colors.reset}\n`);

if (unusedFiles.length > 0) {
  console.log(`${colors.bold}${colors.red}🚨 POTENTIALLY UNUSED FILES:${colors.reset}\n`);
  
  // Group by type
  const byType = {
    src: [],
    public: [],
    backend: [],
  };
  
  unusedFiles.forEach(file => {
    if (byType[file.type]) {
      byType[file.type].push(file);
    }
  });
  
  if (byType.src.length > 0) {
    console.log(`${colors.yellow}📁 Frontend Source Files:${colors.reset}`);
    byType.src.forEach(file => {
      console.log(`  ${colors.red}●${colors.reset} ${file.path}`);
    });
    console.log();
  }
  
  if (byType.public.length > 0) {
    console.log(`${colors.yellow}🖼️  Frontend Public Files (Images/Assets):${colors.reset}`);
    byType.public.forEach(file => {
      console.log(`  ${colors.red}●${colors.reset} ${file.path}`);
    });
    console.log();
  }
  
  if (byType.backend.length > 0) {
    console.log(`${colors.yellow}⚙️  Backend Files:${colors.reset}`);
    byType.backend.forEach(file => {
      console.log(`  ${colors.red}●${colors.reset} ${file.path}`);
    });
    console.log();
  }
} else {
  console.log(`${colors.green}✨ All files appear to be in use!${colors.reset}\n`);
}

// Show used files summary
console.log(`${colors.bold}${colors.green}✅ USED FILES SUMMARY:${colors.reset}\n`);
const usedByType = {
  src: usedFiles.filter(f => f.type === 'src').length,
  public: usedFiles.filter(f => f.type === 'public').length,
  backend: usedFiles.filter(f => f.type === 'backend').length,
};
console.log(`  ${colors.green}●${colors.reset} Frontend Source: ${usedByType.src}`);
console.log(`  ${colors.green}●${colors.reset} Frontend Public: ${usedByType.public}`);
console.log(`  ${colors.green}●${colors.reset} Backend: ${usedByType.backend}\n`);

console.log('═'.repeat(70));
console.log(`${colors.gray}ℹ️  Note: Files might be used via:${colors.reset}`);
console.log(`${colors.gray}  - Dynamic imports that script cannot detect${colors.reset}`);
console.log(`${colors.gray}  - Vite/Webpack configuration${colors.reset}`);
console.log(`${colors.gray}  - Environment variables or external config${colors.reset}`);
console.log('═'.repeat(70));
