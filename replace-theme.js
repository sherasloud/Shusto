const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('emerald')) {
    content = content.replace(/emerald/g, 'sky');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      replaceInFile(fullPath);
    }
  }
}

traverseDir('./src');
traverseDir('./'); // to cover index.html or anything else, but limited
