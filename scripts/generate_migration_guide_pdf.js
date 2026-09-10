const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateMigrationGuidePDF() {
  const outputPath = path.join(__dirname, '../Guia_de_Migracion_Docker_Base_de_Datos.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Paleta corporativa
  const PRIMARY = '#0F172A';    // Slate oscuro
  const BLUE = '#2563EB';       // Azul acento
  const GREEN = '#059669';      // Verde éxito
  const TEXT = '#1E293B';       // Texto principal
  const TEXT_MUTED = '#64748B'; // Gris texto
  const BG_LIGHT = '#F8FAFC';   // Fondo cajas
  const CODE_BG = '#1E293B';    // Fondo comandos
  const CODE_TEXT = '#38BDF8';  // Texto comandos
  const BORDER = '#CBD5E1';

  // --- ENCABEZADO / HEADER BANNER ---
  doc.rect(40, 35, 515, 70).fill(PRIMARY);
  doc.fillColor('#FFFFFF')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('GUÍA DE MIGRACIÓN: DOCKER Y POSTGRESQL', 55, 48);
  doc.fontSize(11)
     .font('Helvetica')
     .text('Traslado del Sistema de Gestión de Reclamos (PC Casa → PC Oficina)', 55, 70);
  doc.fontSize(8.5)
     .fillColor('#94A3B8')
     .text('Manual operativo paso a paso para despliegue y restauración de datos', 55, 87);

  let y = 120;

  // --- INTRODUCCIÓN ---
  doc.fillColor(TEXT).fontSize(9).font('Helvetica');
  doc.text(
    'Al trabajar con Docker y PostgreSQL, los datos se almacenan en un volumen persistente dentro de tu equipo. ' +
    'Para trasladar el proyecto desde tu computadora de casa a la de tu oficina, dispones de dos alternativas según tu objetivo:',
    40, y, { width: 515, align: 'justify', lineGap: 2.5 }
  );
  y += 35;

  // ==========================================================
  // OPCIÓN A: INICIALIZACIÓN LIMPIA
  // ==========================================================
  drawSectionBox(doc, 40, y, 515, 'OPCIÓN A: Inicialización Limpia (Recomendada para iniciar en el trabajo)', GREEN);
  y += 24;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.5);
  doc.text(
    'Ideal si en tu casa realizaste pruebas y quieres comenzar en la oficina de cero, pero con todos los catálogos listos ' +
    '(las 5 sucursales, el usuario administrador y las 105 combinaciones de clasificación de consultas). ' +
    'No requiere exportar ningún archivo previo, ya que el archivo database/init.sql contiene toda la definición.',
    40, y, { width: 515, lineGap: 2, align: 'justify' }
  );
  y += 35;

  drawStep(doc, 40, y, 'Paso 1: Copiar la carpeta del proyecto', [
    'Copia la carpeta completa "registro_de_reclamos" a la PC de escritorio mediante un pendrive, Google Drive, OneDrive o Git.'
  ]);
  y += 30;

  drawStep(doc, 40, y, 'Paso 2: Iniciar Docker Desktop en la PC de destino', [
    'Asegúrate de que Docker Desktop esté abierto y en ejecución en la computadora de la oficina.'
  ]);
  y += 30;

  drawStep(doc, 40, y, 'Paso 3: Ejecutar Docker Compose en la terminal', [
    'Abre PowerShell o CMD en la carpeta del proyecto y ejecuta el siguiente comando:'
  ]);
  y += 25;

  drawCodeBlock(doc, 40, y, 515, 24, 'docker compose up -d', CODE_BG, CODE_TEXT);
  y += 32;

  drawStep(doc, 40, y, '¿Qué sucede automáticamente?', [
    '• Docker descarga la imagen oficial de PostgreSQL 16 y crea el volumen local seguro.',
    '• Al detectar que la base de datos es nueva, ejecuta automáticamente database/init.sql.',
    '• Se crean las 8 tablas, los índices, las 5 sucursales, el usuario admin (clave: admin123) y todo el árbol.',
    '• El sistema queda disponible de inmediato para iniciar la app con "npm start" o "docker compose up".'
  ]);
  y += 55;

  // ==========================================================
  // OPCIÓN B: MIGRACIÓN COMPLETA CON BACKUP
  // ==========================================================
  drawSectionBox(doc, 40, y, 515, 'OPCIÓN B: Migración Completa con Datos Cargados (Backup & Restore)', BLUE);
  y += 24;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.5);
  doc.text(
    'Utiliza este método si en tu casa ya cargaste reclamos de prueba, nuevos usuarios o registros que no deseas perder. ' +
    'Consiste en exportar un archivo de respaldo (dump SQL) en casa e importarlo en la oficina.',
    40, y, { width: 515, lineGap: 2, align: 'justify' }
  );
  y += 30;

  drawStep(doc, 40, y, 'Fase 1 (En tu PC de Casa) - Exportar la Base de Datos:', [
    'Abre PowerShell en la carpeta del proyecto con el contenedor de Docker encendido y ejecuta:'
  ]);
  y += 25;

  drawCodeBlock(doc, 40, y, 515, 24, 'docker exec -t reclamos_postgres pg_dump -U postgres -d reclamos_db > backup_reclamos.sql', CODE_BG, CODE_TEXT);
  y += 32;

  doc.fillColor(TEXT_MUTED).fontSize(8).text(
    'Esto creará en la carpeta el archivo "backup_reclamos.sql" con la foto exacta de todos tus datos.',
    55, y
  );
  y += 18;

  drawStep(doc, 40, y, 'Fase 2 (Traslado) - Llevar los archivos a la Oficina:', [
    'Copia la carpeta "registro_de_reclamos" asegurándote de incluir el archivo "backup_reclamos.sql".'
  ]);
  y += 28;

  drawStep(doc, 40, y, 'Fase 3 (En la PC de la Oficina) - Levantar y Restaurar:', [
    '1. Abre PowerShell en la carpeta del proyecto y levanta el contenedor:',
  ]);
  y += 18;

  drawCodeBlock(doc, 40, y, 515, 22, 'docker compose up -d', CODE_BG, CODE_TEXT);
  y += 28;

  doc.fillColor(TEXT).fontSize(8.5).text('2. Restaura los datos ejecutando el comando correspondiente según tu terminal:', 55, y);
  y += 16;

  drawCodeBlock(doc, 40, y, 515, 22, 'Get-Content backup_reclamos.sql | docker exec -i reclamos_postgres psql -U postgres -d reclamos_db', CODE_BG, CODE_TEXT);
  y += 28;

  doc.fillColor(TEXT_MUTED).fontSize(8).text(
    '* En caso de utilizar CMD tradicional en lugar de PowerShell, el comando es: ' +
    'docker exec -i reclamos_postgres psql -U postgres -d reclamos_db < backup_reclamos.sql',
    55, y, { width: 500 }
  );
  y += 28;

  // ==========================================================
  // CONFIGURACIÓN DE PUERTOS Y COMPROBACIÓN
  // ==========================================================
  drawSectionBox(doc, 40, y, 515, 'Configuración de Puertos y Verificación', PRIMARY);
  y += 24;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.5);
  doc.text(
    '• Puerto en Casa vs Oficina: En tu casa configuramos el puerto 5433 para evitar colisiones con otro PostgreSQL existente. ' +
    'En la oficina puedes dejar exactamente la misma configuración (5433) y funcionará perfectamente sin modificar nada.\n' +
    '• Comprobación de funcionamiento: Abre tu navegador en http://localhost:3000 e inicia sesión con usuario "admin" y contraseña "admin123".\n' +
    '• Acceso en red local (para compañeros): Consulta tu IP en PowerShell con "ipconfig" (ej: 192.168.1.50) y comparte el enlace http://192.168.1.50:3000.',
    40, y, { width: 515, lineGap: 3, align: 'justify' }
  );

  // Pie de página
  doc.fontSize(8).fillColor(TEXT_MUTED).text(
    `Documento de Soporte Operativo - Proyecto Registro de Reclamos - ${new Date().toLocaleDateString('es-AR')}`,
    40, 790, { align: 'center', width: 515 }
  );

  doc.end();

  stream.on('finish', () => {
    console.log(`Guía de Migración en PDF generada en: ${outputPath}`);
  });
}

function drawSectionBox(doc, x, y, w, title, color) {
  doc.rect(x, y, w, 20).fill('#F1F5F9');
  doc.rect(x, y, 4, 20).fill(color);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(9.5).text(title, x + 10, y + 5);
}

function drawStep(doc, x, y, title, bullets) {
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5).text(title, x, y);
  let currentY = y + 12;
  doc.font('Helvetica').fontSize(8).fillColor('#334155');
  bullets.forEach(b => {
    doc.text(b, x + 12, currentY, { width: 490, lineGap: 1.5 });
    currentY += 12;
  });
}

function drawCodeBlock(doc, x, y, w, h, code, bg, textCol) {
  doc.rect(x + 10, y, w - 20, h).fill(bg);
  doc.rect(x + 10, y, w - 20, h).stroke('#334155');
  doc.fillColor(textCol).font('Courier-Bold').fontSize(8.5).text(code, x + 18, y + 6, { width: w - 36 });
}

generateMigrationGuidePDF();
