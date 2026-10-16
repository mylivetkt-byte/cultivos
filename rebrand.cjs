const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  { match: /SAS Agrícolas/g, replace: 'AgroPaccioli' },
  { match: /SAS AGRÍCOLAS/g, replace: 'AGROPACCIOLI' },
  { match: /SAS Agricolas/g, replace: 'AgroPaccioli' },
  { match: /SAS AGRICOLAS/g, replace: 'AGROPACCIOLI' },
  { match: /sas-agricolas/g, replace: 'agropaccioli' }
];

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        if (dirFile.match(/\.(js|jsx|html|json)$/)) {
          filelist.push(dirFile);
        }
      }
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EPERM') {
        // Skip
      } else {
        throw err;
      }
    }
  });
  return filelist;
}

const targetDirs = [
  path.join(__dirname, 'src'),
  path.join(__dirname, 'server')
];
let filesToProcess = [];
targetDirs.forEach(dir => {
  filesToProcess = filesToProcess.concat(walkSync(dir));
});
filesToProcess.push(path.join(__dirname, 'index.html'));
filesToProcess.push(path.join(__dirname, 'package.json')); // Because it changes name/description

let replacedFilesCount = 0;

filesToProcess.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  REPLACEMENTS.forEach(r => {
    content = content.replace(r.match, r.replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    replacedFilesCount++;
    console.log(`Replaced in: ${file}`);
  }
});

console.log(`Rebranding completo. ${replacedFilesCount} archivos modificados.`);
