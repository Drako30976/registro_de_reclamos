const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Limpiar index.html
const indexPath = path.join(rootDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Eliminar todos los comentarios HTML existentes <!-- ... -->
indexContent = indexContent.replace(/<!--[\s\S]*?-->/g, '');

// Limpiar líneas en blanco excesivas
indexContent = indexContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

// Agregar al final los datos de Mauro como comentario de autoría
indexContent += '\n\n<!-- Código desarrollado y realizado por Mauro -->\n';
fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('index.html procesado con éxito.');

// 2. Limpiar css/style.css
const cssPath = path.join(rootDir, 'css/style.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');
cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
cssContent = cssContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
fs.writeFileSync(cssPath, cssContent + '\n', 'utf8');
console.log('css/style.css procesado con éxito.');

// 3. Función para limpiar archivos JS
function cleanJsFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remover comentarios de bloque /* ... */
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remover comentarios de línea // ..., cuidando de no alterar URLs http:// o https://
  const lines = content.split('\n');
  const cleanedLines = lines.map(line => {
    // Si la línea contiene http:// o https://, o regex con //, ser cuidadosos
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) {
      return '';
    }
    // Si hay un // más adelante en la línea
    const slashIndex = line.indexOf('//');
    if (slashIndex !== -1) {
      const before = line.slice(0, slashIndex);
      // Si el // forma parte de http:// o https://
      if (before.endsWith('http:') || before.endsWith('https:')) {
        return line;
      }
      // Si está dentro de comillas
      const doubleQuotes = (before.match(/"/g) || []).length;
      const singleQuotes = (before.match(/'/g) || []).length;
      const backticks = (before.match(/`/g) || []).length;
      if (doubleQuotes % 2 === 1 || singleQuotes % 2 === 1 || backticks % 2 === 1) {
        return line;
      }
      return before.trimEnd();
    }
    return line;
  });

  content = cleanedLines.join('\n');
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  fs.writeFileSync(filePath, content + '\n', 'utf8');
  console.log(`Archivo JS limpio: ${path.relative(rootDir, filePath)}`);
}

// Limpiar archivos frontend JS
const jsDir = path.join(rootDir, 'js');
fs.readdirSync(jsDir).forEach(file => {
  if (file.endsWith('.js')) {
    cleanJsFile(path.join(jsDir, file));
  }
});

// Limpiar archivos backend JS en src/
function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js')) {
      cleanJsFile(fullPath);
    }
  });
}

walkDir(path.join(rootDir, 'src'));
console.log('Todos los archivos fueron limpiados correctamente.');
