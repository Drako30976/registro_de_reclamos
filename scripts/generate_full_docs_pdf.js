const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateFullDocsPDF() {
  const outputPath = path.join(__dirname, '../Documentacion_Tecnica_Completa_Sistema_Reclamos.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const PRIMARY = '#0F172A';
  const BLUE = '#1E40AF';
  const TEXT = '#1E293B';
  const TEXT_MUTED = '#64748B';
  const BG_LIGHT = '#F8FAFC';
  const BORDER = '#CBD5E1';

  function headerBanner(title, subtitle) {
    doc.rect(40, 35, 515, 65).fill(PRIMARY);
    doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text(title, 55, 48);
    doc.fontSize(10).font('Helvetica').text(subtitle, 55, 68);
    doc.fontSize(8).fillColor('#94A3B8').text('Autor: Mauro | Sistema de Gestión y Registro de Reclamos | Septiembre 2026', 55, 83);
  }

  function section(title, y) {
    doc.rect(40, y, 515, 20).fill('#EFF6FF');
    doc.rect(40, y, 4, 20).fill(BLUE);
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(10).text(title, 52, y + 5);
  }

  // --- PÁGINA 1: PORTADA, STACK Y ARQUITECTURA ---
  headerBanner('DOCUMENTACIÓN TÉCNICA COMPLETA DEL SISTEMA', 'Arquitectura, Docker, PostgreSQL, Backend REST y Frontend SPA');

  let y = 115;
  section('1. Introducción y Stack Tecnológico', y);
  y += 26;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.5);
  doc.text(
    'Este proyecto sustituye una planilla compartida de Excel online por una solución web profesional, segura y concurrente. ' +
    'A continuación se detallan las tecnologías y programas utilizados en su construcción:',
    40, y, { width: 515, align: 'justify', lineGap: 2 }
  );
  y += 28;

  const stack = [
    { cat: 'Motor de Base de Datos', desc: 'PostgreSQL 16 (Alpine Linux) en contenedor Docker con volumen persistente.' },
    { cat: 'Virtualización / Contenedores', desc: 'Docker Desktop y Docker Compose para empaquetado y orquestación multi-servicio.' },
    { cat: 'Entorno de Ejecución Backend', desc: 'Node.js v22 LTS con arquitectura RESTful modular en capas.' },
    { cat: 'Framework de Servidor Web', desc: 'Express v5.x con middlewares de CORS, JSON, static files y enrutamiento.' },
    { cat: 'Criptografía y Seguridad', desc: 'Bcryptjs (hashing con 10 rondas de salt) y JSON Web Tokens (JWT) con caducidad.' },
    { cat: 'Conexión a Base de Datos', desc: 'pg (node-postgres) con Connection Pooling optimizado.' },
    { cat: 'Procesamiento Multimedia', desc: 'Multer para subida de fotos de perfil almacenadas en disco local.' },
    { cat: 'Generador de Reportes', desc: 'PDFKit para maquetación vectorial y descarga de reportes filtrados en PDF.' },
    { cat: 'Frontend', desc: 'Single Page Application (SPA) en HTML5 semántico, CSS3 corporativo y Vanilla JS modular.' }
  ];

  stack.forEach((s, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
    doc.rect(40, y, 515, 17).fill(bg);
    doc.rect(40, y, 515, 17).stroke(BORDER);
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(8).text(s.cat, 48, y + 4, { width: 145 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(7.8).text(s.desc, 195, y + 4, { width: 350, lineBreak: false });
    y += 17;
  });

  y += 12;
  section('2. Arquitectura de Red y Contenedorización con Docker', y);
  y += 26;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    '• Aislamiento de Puertos: En la máquina de desarrollo ya existía un PostgreSQL en el puerto estándar 5432. ' +
    'Para evitar conflictos, en docker-compose.yml se configuró el mapeo "5433:5432" (host:contenedor).\n' +
    '• Persistencia de Datos: Se definió el volumen "reclamos_pgdata" para que los datos nunca se borren al apagar el contenedor.\n' +
    '• Inicialización Automatizada: Se vinculó el archivo "database/init.sql" al directorio "/docker-entrypoint-initdb.d/". ' +
    'Al crearse el contenedor por primera vez, PostgreSQL ejecuta automáticamente todas las tablas, relaciones y catálogos iniciales.\n' +
    '• Producción: Se creó el Dockerfile con imagen liviana Node 22-alpine para empaquetar toda la aplicación.',
    40, y, { width: 515, lineGap: 2.5, align: 'justify' }
  );

  // --- PÁGINA 2: MODELO RELACIONAL Y ROLES ---
  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  y = 35;
  section('3. Modelo de Datos Relacional (PostgreSQL)', y);
  y += 26;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'La base de datos modela la jerarquía en cascada de las consultas de clientes: ' +
    'Tipo de Consulta -> Características -> Definición (Opcional) -> Finalización (Opcional). Consta de 8 tablas relacionales:',
    40, y, { width: 515, lineGap: 2 }
  );
  y += 22;

  const tablas = [
    { t: 'usuarios', d: 'id, nombre_completo, documento (UQ), usuario (UQ), password_hash, rol, activo, foto_perfil, created_at.' },
    { t: 'sucursales', d: 'id, nombre, activo, created_at (5 sucursales precargadas).' },
    { t: 'tipos_consulta', d: 'id, contenido, descripcion, activo (6 tipos: Técnicos, Facturación, Venta, Baja, Generales, Baja Parcial).' },
    { t: 'caracteristicas_consulta', d: 'id, tipo_consulta_id (FK), contenido, descripcion, activo (29 características vinculadas).' },
    { t: 'definiciones_consulta', d: 'id, caracteristica_id (FK), contenido, descripcion, activo (61 definiciones cargadas).' },
    { t: 'finalizaciones', d: 'id, definicion_id (FK), contenido, descripcion, activo (105 opciones en cascada).' },
    { t: 'reclamos', d: 'id, fecha, sucursal_id (FK), usuario_id (FK), numero_cliente, tipo_id, car_id, def_id, fin_id, timestamps.' },
    { t: 'auditoria_logs', d: 'id, fecha, accion, usuario_id, usuario_nombre, entidad, registro_id, datos_anteriores (JSONB), datos_nuevos.' }
  ];

  tablas.forEach((tb, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
    doc.rect(40, y, 515, 17).fill(bg);
    doc.rect(40, y, 515, 17).stroke(BORDER);
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(8).text(tb.t, 48, y + 4, { width: 130 });
    doc.fillColor(TEXT).font('Helvetica').fontSize(7.8).text(tb.d, 180, y + 4, { width: 365, lineBreak: false });
    y += 17;
  });

  y += 14;
  section('4. Matriz de Seguridad y Permisos por Jerarquía (RBAC)', y);
  y += 24;

  doc.rect(40, y, 515, 16).fill(PRIMARY);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
  doc.text('PESTAÑA / FUNCIONALIDAD', 45, y + 4, { width: 170 });
  doc.text('ADMIN', 225, y + 4, { width: 65, align: 'center' });
  doc.text('SUPERVISOR', 295, y + 4, { width: 75, align: 'center' });
  doc.text('ASESOR', 375, y + 4, { width: 65, align: 'center' });
  doc.text('ESPECTADOR', 445, y + 4, { width: 100, align: 'center' });
  y += 16;

  const rbac = [
    { f: 'Gestión de Reclamos (Carga)', ad: 'Completo', su: 'Completo', as: 'Completo', es: 'Sin acceso' },
    { f: 'Historial (Filtros y Consulta)', ad: 'Completo', su: 'Completo', as: 'Completo', es: 'Solo lectura' },
    { f: 'Historial (Editar Reclamo)', ad: 'Sí', su: 'Sí', as: 'Sí', es: 'No' },
    { f: 'Historial (Eliminar Reclamo)', ad: 'Sí (Exclusivo)', su: 'No', as: 'No', es: 'No' },
    { f: 'Historial (Emitir Reporte PDF)', ad: 'Sí', su: 'Sí', as: 'Sí', es: 'No' },
    { f: 'Registros (Auditoría Paginada x20)', ad: 'Total (Exclusivo)', su: 'Sin acceso', as: 'Sin acceso', es: 'Sin acceso' },
    { f: 'Edición (Estructura y Sucursales)', ad: 'Crear/Editar/Borrar', su: 'Crear/Editar', as: 'Sin acceso', es: 'Sin acceso' },
    { f: 'Perfil Propio (Clave y Foto)', ad: 'Sí', su: 'Sí', as: 'Sí', es: 'Sí' },
    { f: 'Gestión Usuarios (En Perfil)', ad: 'Total (Todos)', su: 'Solo Asesores', as: 'Sin acceso', es: 'Sin acceso' },
    { f: 'Activar / Suspender Cuentas', ad: 'Sí (Exclusivo)', su: 'No', as: 'No', es: 'No' }
  ];

  rbac.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
    doc.rect(40, y, 515, 15).fill(bg);
    doc.rect(40, y, 515, 15).stroke(BORDER);
    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(7.3).text(r.f, 45, y + 3.5, { width: 175 });
    doc.font('Helvetica').fontSize(7.3);
    doc.text(r.ad, 225, y + 3.5, { width: 65, align: 'center' });
    doc.text(r.su, 295, y + 3.5, { width: 75, align: 'center' });
    doc.text(r.as, 375, y + 3.5, { width: 65, align: 'center' });
    doc.text(r.es, 445, y + 3.5, { width: 100, align: 'center' });
    y += 15;
  });

  y += 14;
  section('5. Pestañas y Experiencia del Frontend (SPA)', y);
  y += 24;

  doc.fillColor(TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    '1. Gestión de Reclamos: Selects dinámicos en cascada, auto-asignación de fecha del sistema y asesor en sesión. Ancho completo.\n' +
    '2. Historial: Filtros combinados por fecha exacta, rango, sucursal, tipo, asesor y cliente. Tabla con acciones y botón PDF.\n' +
    '3. Registros: Paginación estricta de 20 logs por página. Muestra fecha, acción, responsable y snapshot exacto del dato anterior.\n' +
    '4. Edición: Vista de árbol jerárquico para crear, modificar o eliminar nodos de consulta y catálogo de sucursales.\n' +
    '5. Perfil: Modificación de clave validando la actual, subida de foto de perfil y panel de administración de cuentas para Admin.',
    40, y, { width: 515, lineGap: 2.5, align: 'justify' }
  );

  // --- PÁGINA 3: BITÁCORA Y COMANDOS DE APRENDIZAJE ---
  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  y = 35;
  section('6. Cronograma de Desarrollo Realizado (Paso a Paso)', y);
  y += 26;

  const pasos = [
    '1. Diagnóstico de puerto y configuración de docker-compose.yml con puerto 5433:5432 y volumen local persistente.',
    '2. Creación del script database/init.sql con DDL relacional y carga completa del árbol jerárquico extraído del Excel.',
    '3. Despliegue de PostgreSQL con "docker compose up -d" y verificación de conectividad y recuentos mediante psql.',
    '4. Implementación del Backend en Express con autenticación JWT, hashing bcrypt y middleware interceptor de auditoría.',
    '5. Desarrollo de controladores y rutas para reclamos, catálogos, usuarios, auditoría paginada y reportes PDF con pdfkit.',
    '6. Construcción del frontend SPA modular: api.js, auth.js, reclamos.js, historial.js, registros.js, edicion.js, perfil.js y app.js.',
    '7. Ejecución de suite de 10 pruebas automatizadas end-to-end con Node.js verificando todas las operaciones CRUD y PDF.',
    '8. Generación del Dockerfile para empaquetado del frontend/backend listo para despliegue productivo.',
    '9. Generación de las guías formales en PDF del Plan de Implementación y de Migración de Docker entre computadoras.',
    '10. Ajustes requeridos: retiro de rol en header, formulario en ancho completo, sección de usuarios en perfil para Admin.',
    '11. Retiro de la opción "Legajo" en toda la base de datos, backend y frontend.',
    '12. Implementación de suspensión/activación inmediata con mensaje estricto "Usuario suspendido" en caso de bloqueo de acceso.',
    '13. Ajuste de jerarquía flexbox y scroll vertical en los modales modal-crear-usuario y modal-editar-usuario.',
    '14. Limpieza total de comentarios en el código y adición de firma de autoría de Mauro al final de index.html.',
    '15. Aplicación del rediseño estético profesional y corporativo de alta eficiencia.'
  ];

  doc.fillColor(TEXT).font('Helvetica').fontSize(7.7);
  pasos.forEach(p => {
    doc.text(p, 45, y, { width: 505, lineGap: 1.5 });
    y += 15;
  });

  y += 8;
  section('7. Comandos Esenciales para Operación y Estudio', y);
  y += 24;

  const cmds = [
    { c: 'docker compose up -d', u: 'Inicia los contenedores en segundo plano.' },
    { c: 'docker ps', u: 'Muestra los contenedores en ejecución y sus puertos mapeados.' },
    { c: 'docker logs -f reclamos_postgres', u: 'Muestra los registros en vivo del motor de base de datos.' },
    { c: 'docker exec -it reclamos_postgres psql -U postgres -d reclamos_db', u: 'Abre la consola SQL dentro del contenedor.' },
    { c: 'docker exec -t reclamos_postgres pg_dump -U postgres -d reclamos_db > backup.sql', u: 'Exporta una copia de seguridad completa.' },
    { c: 'Get-Content backup.sql | docker exec -i reclamos_postgres psql -U postgres -d reclamos_db', u: 'Restaura una copia en PowerShell.' },
    { c: 'node src/server.js', u: 'Inicia el servidor Node.js de la aplicación.' }
  ];

  cmds.forEach((cmd, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
    doc.rect(40, y, 515, 17).fill(bg);
    doc.rect(40, y, 515, 17).stroke(BORDER);
    doc.fillColor(PRIMARY).font('Courier-Bold').fontSize(7.5).text(cmd.c, 48, y + 4, { width: 250, lineBreak: false });
    doc.fillColor(TEXT).font('Helvetica').fontSize(7.5).text(cmd.u, 305, y + 4, { width: 240, lineBreak: false });
    y += 17;
  });

  doc.fontSize(7.5).fillColor(TEXT_MUTED).text(
    `Documentación Técnica Oficial - Sistema de Gestión y Registro de Reclamos - Generado para Mauro - 2026`,
    40, 790, { align: 'center', width: 515 }
  );

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF de Documentación Completa generado en: ${outputPath}`);
  });
}

generateFullDocsPDF();
