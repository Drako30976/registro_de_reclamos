const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generatePlanPDF() {
  const outputPath = path.join(__dirname, '../Plan_de_Implementacion_Sistema_Reclamos.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 45, right: 45 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Colores corporativos
  const PRIMARY = '#1E3A8A';    // Azul marino oscuro
  const SECONDARY = '#2563EB';  // Azul vibrante
  const TEXT = '#1E293B';       // Pizarra oscuro
  const TEXT_MUTED = '#64748B'; // Gris medio
  const BG_LIGHT = '#F8FAFC';   // Gris claro
  const LINE_COLOR = '#E2E8F0';

  // --- PORTADA / ENCABEZADO ---
  doc.rect(45, 40, 505, 75).fill(PRIMARY);
  doc.fillColor('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('PLAN DE IMPLEMENTACIÓN', 65, 55);
  doc.fontSize(12)
     .font('Helvetica')
     .text('Sistema de Gestión y Registro de Reclamos', 65, 78);
  doc.fontSize(9)
     .fillColor('#93C5FD')
     .text('PostgreSQL 16 · Docker · Node.js · Express · SPA Frontend', 65, 96);

  doc.moveDown(3);

  // --- INTRODUCCIÓN ---
  doc.fillColor(TEXT).fontSize(10).font('Helvetica');
  doc.text(
    'Este documento establece el diseño de arquitectura, el modelo relacional de datos, la matriz de seguridad por roles y el plan de ejecución paso a paso para el reemplazo del registro en planillas por una aplicación web corporativa local y en línea.',
    45, 135, { width: 505, align: 'justify', lineGap: 3 }
  );

  // --- SECCIÓN 1: ARQUITECTURA ---
  let y = 180;
  drawSectionHeader(doc, '1. Visión General de la Arquitectura', y, SECONDARY);
  y += 28;

  doc.fillColor(TEXT).fontSize(9.5).font('Helvetica');
  doc.text(
    'El sistema está concebido bajo una arquitectura desacoplada y contenerizada:\n' +
    '• Base de Datos: PostgreSQL 16 ejecutándose en un contenedor Docker con persistencia en volumen local.\n' +
    '• Backend: API REST en Node.js/Express con autenticación JWT, hashing bcrypt y módulo de auditoría.\n' +
    '• Frontend: Aplicación web de página única (SPA) con navegación por 5 pestañas protegidas según jerarquía.\n' +
    '• Aislamiento de Red: Mapeo de puertos en host (5433:5432) para evitar colisiones con otros entornos.',
    45, y, { width: 505, lineGap: 4 }
  );

  // --- SECCIÓN 2: MODELO DE DATOS ---
  y += 85;
  drawSectionHeader(doc, '2. Modelo de Datos Relacional (PostgreSQL)', y, SECONDARY);
  y += 28;

  doc.fillColor(TEXT).fontSize(9).font('Helvetica');
  doc.text(
    'La clasificación de consultas sigue una estructura jerárquica en cascada dinámica:\n' +
    'Tipo de Consulta  -->  Características  -->  Definición (Opcional)  -->  Finalización (Opcional)',
    45, y, { width: 505, lineGap: 3 }
  );
  y += 30;

  const tablas = [
    { nombre: 'usuarios', desc: 'id, nombre_completo, documento (UQ), usuario (UQ), password_hash, legajo, rol, foto_perfil, activo' },
    { nombre: 'sucursales', desc: 'id, nombre, activo, created_at' },
    { nombre: 'tipos_consulta', desc: 'id, contenido (6 tipos cargados), descripcion, activo' },
    { nombre: 'caracteristicas_consulta', desc: 'id, tipo_consulta_id (FK), contenido (29 registradas), descripcion' },
    { nombre: 'definiciones_consulta', desc: 'id, caracteristica_id (FK), contenido (61 registradas), descripcion' },
    { nombre: 'finalizaciones', desc: 'id, definicion_id (FK), contenido (105 registradas), descripcion' },
    { nombre: 'reclamos', desc: 'id, fecha, sucursal_id (FK), usuario_id (FK), numero_cliente, tipo_id, car_id, def_id, fin_id' },
    { nombre: 'auditoria_logs', desc: 'id, fecha, accion, usuario_id, usuario_nombre, entidad, registro_id, datos_anteriores, datos_nuevos' }
  ];

  tablas.forEach((t) => {
    doc.rect(45, y, 505, 18).fill(BG_LIGHT);
    doc.rect(45, y, 505, 18).stroke(LINE_COLOR);
    doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(8.5).text(t.nombre, 50, y + 5, { width: 130 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(t.desc, 185, y + 5, { width: 360, lineBreak: false });
    y += 20;
  });

  // --- SECCIÓN 3: MATRIZ DE ROLES Y PERMISOS ---
  y += 15;
  drawSectionHeader(doc, '3. Matriz de Roles y Jerarquías', y, SECONDARY);
  y += 28;

  // Cabecera tabla permisos
  doc.rect(45, y, 505, 18).fill(PRIMARY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
  doc.text('MÓDULO / PESTAÑA', 50, y + 5, { width: 180 });
  doc.text('ADMIN', 240, y + 5, { width: 65, align: 'center' });
  doc.text('SUPERVISOR', 310, y + 5, { width: 75, align: 'center' });
  doc.text('ASESOR', 390, y + 5, { width: 65, align: 'center' });
  doc.text('ESPECTADOR', 460, y + 5, { width: 85, align: 'center' });
  y += 18;

  const matriz = [
    { mod: 'Gestión de Reclamos (Carga)', a: 'Completo', s: 'Completo', as: 'Completo', e: 'Sin acceso' },
    { mod: 'Historial (Consulta y Filtros)', a: 'Completo', s: 'Completo', as: 'Completo', e: 'Solo lectura' },
    { mod: 'Historial (Editar Reclamo)', a: 'Sí', s: 'Sí', as: 'Sí', e: 'No' },
    { mod: 'Historial (Eliminar Reclamo)', a: 'Sí (Exclusivo)', s: 'No', as: 'No', e: 'No' },
    { mod: 'Historial (Emitir Reporte PDF)', a: 'Sí', s: 'Sí', as: 'Sí', e: 'No' },
    { mod: 'Registros (Auditoría Paginada x20)', a: 'Total', s: 'Sin acceso', as: 'Sin acceso', e: 'Sin acceso' },
    { mod: 'Edición (Estructura y Sucursales)', a: 'Total', s: 'Crear / Editar', as: 'Sin acceso', e: 'Sin acceso' },
    { mod: 'Perfil Propio (Clave y Foto)', a: 'Sí', s: 'Sí', as: 'Sí', e: 'Sí' },
    { mod: 'Gestión Usuarios en Perfil', a: 'Todos los roles', s: 'Solo Asesores', as: 'Sin acceso', e: 'Sin acceso' }
  ];

  matriz.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
    doc.rect(45, y, 505, 16).fill(bg);
    doc.rect(45, y, 505, 16).stroke(LINE_COLOR);

    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(7.5).text(row.mod, 50, y + 4, { width: 185 });
    doc.font('Helvetica').fontSize(7.5);
    doc.text(row.a, 240, y + 4, { width: 65, align: 'center' });
    doc.text(row.s, 310, y + 4, { width: 75, align: 'center' });
    doc.text(row.as, 390, y + 4, { width: 65, align: 'center' });
    doc.text(row.e, 460, y + 4, { width: 85, align: 'center' });
    y += 16;
  });

  // --- NUEVA PÁGINA: HOJA DE RUTA Y DESPLIEGUE ---
  doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 45, right: 45 } });
  y = 40;

  drawSectionHeader(doc, '4. Hoja de Ruta Ejecutada (Fases de Desarrollo)', y, SECONDARY);
  y += 28;

  const fases = [
    {
      titulo: 'Fase 1: Infraestructura y Base de Datos con Docker',
      desc: 'Configuración de docker-compose.yml con puerto 5433:5432 y volumen persistente. Creación de init.sql con todas las tablas e inserción de las ramas de la planilla Excel (6 tipos, 29 características, 61 definiciones y 105 finalizaciones).'
    },
    {
      titulo: 'Fase 2: Backend y API REST (Node.js + Express)',
      desc: 'Conexión por Connection Pool a PostgreSQL. Autenticación JWT y hashing bcrypt. Middleware RBAC de control jerárquico. Middleware de auditoría automática que guarda el registro previo al modificar o borrar. Generación de PDF con pdfkit y subida de fotos con multer.'
    },
    {
      titulo: 'Fase 3: Frontend Dinámico (SPA)',
      desc: 'Diseño modular con 5 pestañas protegidas. Formulario en cascada automática. Panel de filtros en historial con exportación a PDF. Panel de auditoría inmutable con paginación estricta de 20 registros. Administración de árbol jerárquico y sucursales. Perfil con cambio de clave y administración de usuarios.'
    },
    {
      titulo: 'Fase 4: Verificación y Pruebas Automatizadas',
      desc: 'Ejecución exitosa de suite de 10 pruebas integrales cubriendo autenticación, carga de reclamos, cascade selects, filtros, auditoría, paginación, edición y generación de PDF.'
    },
    {
      titulo: 'Fase 5: Contenedorización y Puesta en Producción',
      desc: 'Creación del Dockerfile para el servidor Node.js y configuración multi-servicio para despliegue local o remoto con un solo comando.'
    }
  ];

  fases.forEach(f => {
    doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(9.5).text(f.titulo, 45, y);
    y += 14;
    doc.fillColor(TEXT).font('Helvetica').fontSize(8.5).text(f.desc, 45, y, { width: 505, lineGap: 2.5, align: 'justify' });
    y += 38;
  });

  // --- SECCIÓN 5: GUÍA DE MIGRACIÓN ENTRE COMPUTADORAS ---
  y += 10;
  drawSectionHeader(doc, '5. Guía de Migración de Docker y Base de Datos (PC Casa a PC Oficina)', y, SECONDARY);
  y += 28;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.5).text(
    'Para trasladar la solución de tu computadora de casa a la oficina existen dos métodos según la necesidad:',
    45, y, { width: 505 }
  );
  y += 20;

  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(9).text('Método A: Inicialización Limpia (Recomendado para empezar a usar)', 45, y);
  y += 13;
  doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(
    'Basta con copiar la carpeta completa del proyecto "registro_de_reclamos" a la PC de escritorio. Como el archivo database/init.sql contiene toda la estructura, sucursales y opciones precargadas, al ejecutar en la terminal de la nueva PC:\n' +
    '    docker compose up -d\n' +
    'Docker creará el contenedor y ejecutará automáticamente todo el esquema. El sistema quedará listo en http://localhost:3000.',
    55, y, { width: 495, lineGap: 2 }
  );
  y += 45;

  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(9).text('Método B: Migración Completa con Datos Cargados (Backup & Restore)', 45, y);
  y += 13;
  doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(
    'Si en tu casa ya cargaste reclamos de prueba o nuevos usuarios y quieres llevarlos tal cual a la oficina:\n' +
    '1. En tu PC de casa, exporta el dump de la base de datos con Docker:\n' +
    '    docker exec -t reclamos_postgres pg_dump -U postgres -d reclamos_db > backup_reclamos.sql\n' +
    '2. Copia la carpeta del proyecto y el archivo backup_reclamos.sql a la PC de la oficina.\n' +
    '3. En la PC de la oficina, levanta el contenedor con: docker compose up -d\n' +
    '4. Restaura los datos ejecutando:\n' +
    '    docker exec -i reclamos_postgres psql -U postgres -d reclamos_db < backup_reclamos.sql',
    55, y, { width: 495, lineGap: 2 }
  );

  // Pie de página
  doc.fontSize(8).fillColor(TEXT_MUTED).text(
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-AR')} - Proyecto Registro de Reclamos`,
    45, 785, { align: 'center', width: 505 }
  );

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF generado exitosamente en: ${outputPath}`);
  });
}

function drawSectionHeader(doc, title, y, color) {
  doc.rect(45, y, 505, 20).fill('#EFF6FF');
  doc.rect(45, y, 4, 20).fill(color);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(10.5).text(title, 55, y + 5);
}

generatePlanPDF();
