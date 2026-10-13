const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateZeusDocsPDF() {
  const outputPath = path.join(__dirname, '../Documentacion_Oficial_Zeus.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const C_NAVY = '#0427C4';
  const C_CYAN = '#0487C4';
  const C_INDIGO = '#4104C4';
  const C_DARK = '#0A0F1D';
  const C_TEXT = '#0F172A';
  const C_MUTED = '#64748B';
  const C_BG_LIGHT = '#F1F5F8';
  const C_BORDER = '#CBD5E1';

  function headerBanner(title, subtitle, pageNum) {
    doc.rect(40, 35, 515, 60).fill(C_DARK);
    doc.rect(40, 93, 515, 3).fill(C_CYAN);
    doc.fillColor('#FFFFFF').fontSize(13.5).font('Helvetica-Bold').text(title, 55, 47);
    doc.fillColor('#38BDF8').fontSize(8.5).font('Helvetica').text(subtitle, 55, 66);
    doc.fontSize(7.2).fillColor('#94A3B8').text(`Zeus Suite Empresarial | Documentación Oficial | Pág. ${pageNum} de 5`, 55, 80);
  }

  function section(title, y) {
    doc.rect(40, y, 515, 20).fill('#EBF3FC');
    doc.rect(40, y, 4, 20).fill(C_NAVY);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(9.5).text(title, 52, y + 5);
  }

  function footer(pageNum) {
    doc.fontSize(7.2).fillColor(C_MUTED).text(
      `Zeus - Sistema de Gestión, Reporte de Red, Dinámica y Calidad | Documento Confidencial Empresarial | ${pageNum} de 5`,
      40, 792, { align: 'center', width: 515 }
    );
  }

  headerBanner('ZEUS: GESTIÓN Y REPORTE DE RED', 'Documentación Técnica y Funcional de Arquitectura Corporativa', 1);

  let y = 108;
  section('1. Resumen Ejecutivo y Visión del Sistema', y);
  y += 25;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'Zeus es una plataforma empresarial orientada a la centralización operativa, trazabilidad, dinamismo de métricas ' +
    'y control de calidad en las áreas de Atención al Cliente, Gestión de Reclamos de Red, Soporte Telefónico (0810), ' +
    'Auditoría Operativa, Inteligencia de Negocios y Administración de Grillas de Canales por sucursal. ' +
    'Reemplaza entornos manuales propensos a colisiones concurrentes (como hojas de cálculo compartidas) por una arquitectura ' +
    'relacional robusta, segura, auditada y desplegada íntegramente mediante contenedores Docker con cero comentarios de código.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );
  y += 42;

  section('2. Stack Tecnológico Empresarial', y);
  y += 24;

  const stack = [
    { mod: 'Base de Datos Relacional', desc: 'PostgreSQL 16 en contenedor Alpine con volúmenes montados para persistencia absoluta.' },
    { mod: 'Virtualización y Aislamiento', desc: 'Docker Desktop & Docker Compose (servicios app y db desacoplados en red bridge interna).' },
    { mod: 'Servidor y Runtime Backend', desc: 'Node.js v22 LTS y Express v5 modularizado en controladores, servicios y middlewares de seguridad.' },
    { mod: 'Criptografía y Sesiones', desc: 'Bcryptjs (hashing irreversible de 10 rondas) y JSON Web Tokens (JWT) para sesiones con expiración.' },
    { mod: 'Hardening y Ciberseguridad', desc: 'Protección Helmet (cabeceras HTTP), Rate Limiting (express-rate-limit), RBAC estricto y escape XSS.' },
    { mod: 'Frontend SPA Corporativo', desc: 'Single Page Application pura sin dependencias pesadas: Vanilla JS modular, HTML5 semántico y CSS3.' },
    { mod: 'Reportes y Emisión Gráfica', desc: 'PDFKit para exportación en caliente de auditorías y dinámica; html2canvas para emisión de grillas.' },
    { mod: 'Paleta Visual y Accesibilidad', desc: 'Motor Light / Dark Mode nativo con paleta tech (#0487C4, #0427C4, #4104C4, #F1F5F8).' }
  ];

  stack.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 16).fill(bg);
    doc.rect(40, y, 515, 16).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(item.mod, 48, y + 4, { width: 165, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(item.desc, 218, y + 4, { width: 330, lineBreak: false });
    y += 16;
  });
  y += 10;

  section('3. Arquitectura del Sistema y Flujo de Datos', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'La arquitectura se organiza bajo el patrón de separación cliente-servidor sin estado (Stateless REST API). ' +
    'Toda petición HTTP viaja con el encabezado Authorization: Bearer <token>. El middleware de autenticación valida la firma criptográfica, ' +
    'extrae la identidad y verifica el estado activo del usuario; ante suspensiones, se revoca el acceso de forma inmediata. ' +
    'Asimismo, el sistema registra cada evento en una bitácora central inmutable para cumplimiento y auditorías.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 38;

  const boxes = [
    { title: 'Frontend SPA (Cliente)', desc: 'Gestión de vistas DOM, validaciones numéricas estrictas, tablas reactivas y menú Zeus.' },
    { title: 'API Gateway & Middleware', desc: 'Control de acceso JWT, verificación de roles RBAC, subida de archivos Multer y CORS.' },
    { title: 'PostgreSQL Relacional', desc: '14 tablas con claves foráneas en cascada, transacciones atómicas y migraciones iniciales.' }
  ];

  boxes.forEach((b, idx) => {
    const bx = 40 + idx * 175;
    doc.rect(bx, y, 165, 46).fill(C_BG_LIGHT);
    doc.rect(bx, y, 165, 46).stroke(C_CYAN);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(b.title, bx + 8, y + 5);
    doc.fillColor(C_MUTED).font('Helvetica').fontSize(7).text(b.desc, bx + 8, y + 17, { width: 150, lineGap: 1.4 });
  });

  footer(1);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: MÓDULOS OPERATIVOS I', 'Atención al Cliente, Inconvenientes Masivos y Auditoría de Calidad', 2);

  y = 108;
  section('4. Módulo: Atención al Cliente (Reclamos y Llamadas)', y);
  y += 25;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Es el núcleo operativo principal para la carga, clasificación y trazabilidad de incidencias y contactos con abonados.',
    40, y, { width: 515 }
  );
  y += 14;

  const submods = [
    {
      tit: 'A. Registro de Reclamos (Atención por Chat)',
      f1: '• Nuevo Reclamo: Entrada de incidencias canalizadas por mensajería. Incluye selección dinámica jerárquica obligatoria (Tipo, Característica, Definición y Finalización), validación numérica estricta de abonado y detección en vivo de masivos activos.',
      f2: '• Historial de Reclamos: Consulta optimizada con filtros avanzados (DNI, Teléfono, Tipo, Asesor, Sucursal, Fechas). La tabla de datos permanece oculta por defecto para evitar sobrecargas y se despliega con paginación reactiva tras filtrar.'
    },
    {
      tit: 'B. Registro de Llamadas (Atención Telefónica 0810)',
      f1: '• Nueva Llamada: Formulario estricto de campos jerárquicos adaptado específicamente a la canalización telefónica 0810, con alerta de afectaciones masivas concurrentes y validación numérica pura.',
      f2: '• Historial de Llamadas: Registro independiente que audita exclusivamente las comunicaciones de voz, con visualización detallada, exportación y trazabilidad del operador interviniente.'
    }
  ];

  submods.forEach(sm => {
    doc.rect(40, y, 515, 46).fill(C_BG_LIGHT);
    doc.rect(40, y, 515, 46).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(sm.tit, 48, y + 5);
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.3).text(sm.f1, 48, y + 16, { width: 498, lineGap: 1.4 });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.3).text(sm.f2, 48, y + 29, { width: 498, lineGap: 1.4 });
    y += 50;
  });

  y += 4;
  section('5. Módulo: Inconvenientes Masivos', y);
  y += 23;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Permite registrar afectaciones de red de gran escala (cortes de fibra troncal, cabecera de enlace o nodos caídos). ' +
    'Dispone de formulario de impacto zonal, tipo de servicio y descripción técnica, junto a un acordeón interactivo para consultar ' +
    'eventos en estado "Activo" o "Resuelto" con tiempos de resolución y registro de intervención técnica.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 36;

  section('6. Módulo: Auditoría de Calidad (Evaluación 360°)', y);
  y += 23;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Herramienta de control de calidad sobre la gestión de los asesores. Se divide en:' +
    '\n• Nueva Auditoría: Proceso guiado en etapas (Etapa 1: Abonado, Teléfono de contacto, Asesor, Sucursal, Comentarios; Etapa 2: Evaluación ponderada con cálculo de puntaje en vivo por categorías de comunicación y resolución técnica).' +
    '\n• Historial de Auditorías: Listado de auditorías realizadas con acciones rápidas: Ver Detalles, Exportar en PDF maquetado, Editar auditoría existente (con registro automático en bitácora de auditoría) y Eliminar registro.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 44;

  section('7. Módulo: Tareas Asignadas y Seguimiento', y);
  y += 23;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Gestión de compromisos diarios asignados a los asesores con estados "Pendiente", "En Progreso" y "Completada". ' +
    'Permite derivar gestiones especiales con fecha límite, observaciones y trazabilidad de avance.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );

  footer(2);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: MÓDULOS OPERATIVOS II', 'Dinámica de Sucursales y Grilla de Canales con Emisión', 3);

  y = 108;
  section('8. Módulo: Reportes y Dinámica de Sucursales', y);
  y += 25;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Pestaña orientada a mandos medios y directivos (Roles Admin y Supervisor) inspirada en los tableros analíticos de CRM líderes. ' +
    'Procesa y consolida en tiempo real la totalidad de reclamos y llamadas telefónicas para brindar métricas fieles del estado de la empresa.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 28;

  const kpisDinamica = [
    { kpi: 'Reclamos y Llamadas Totales', desc: 'Volumen global acumulado y participación porcentual por canal de contacto.' },
    { kpi: 'Bajas Totales y por Sucursal', desc: 'Detección inmediata de fuga de clientes con desglose específico por localidad y motivo.' },
    { kpi: 'Consultas de Disponibilidad', desc: 'Monitoreo de prospectos y demanda comercial en zonas cubiertas y no cubiertas.' },
    { kpi: 'Cobranzas y Pagos Registrados', desc: 'Actividad transaccional registrada a través de la mesa de soporte por sede.' },
    { kpi: 'Filtro Cruzado por Asesor', desc: 'Evaluación de productividad individual: volumen gestionado y tipos de finalización logradas.' },
    { kpi: 'Emisión Ejecutiva en PDF', desc: 'Generación vectorial de informe con gráficos de barras de progreso listo para presentar.' }
  ];

  kpisDinamica.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 16).fill(bg);
    doc.rect(40, y, 515, 16).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(item.kpi, 48, y + 4, { width: 170, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(item.desc, 225, y + 4, { width: 325, lineBreak: false });
    y += 16;
  });
  y += 12;

  section('9. Módulo: Grilla de Canales y Emisión para Clientes', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Pestaña universal disponible para todos los usuarios (Asesor, Supervisor, Admin y Espectador) para consulta, emisión ' +
    'y mantenimiento del listado de canales de televisión por sucursal, basada en la estructura del proyecto Guia_Providers.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 26;

  const canalesFeatures = [
    { tit: 'Barra Compacta de Sucursales', desc: 'Selector de sedes (Providers, Tafí Cable, Valle Medios, Salta, Intersas, Tartagal, Las Talitas, La Cocha, CCC) con z-index elevado y desbordamiento visible.' },
    { tit: 'Grillas Multiformato', desc: 'Acceso inmediato a modalidades Digital, Analógica y Aire Digital según la plaza operativa, con badge de conteo.' },
    { tit: 'Búsqueda en Tiempo Real', desc: 'Filtrado dinámico por número de canal sintonizado, nombre de señal o categoría temática.' },
    { tit: 'Emisión de Imagen (Captura PNG)', desc: 'Motor html2canvas integrado para generar y descargar instantáneamente una imagen nítida en alta resolución de la grilla actual para enviar al cliente por mensajería.' },
    { tit: 'Suite "Editar" (CRUD Completo)', desc: 'Mantenimiento integral: crear, editar y borrar sucursales, grillas y canales con catálogo de más de 130 logos precargados y subida de nuevas imágenes.' }
  ];

  canalesFeatures.forEach((cf, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 18).fill(bg);
    doc.rect(40, y, 515, 18).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(cf.tit, 48, y + 5, { width: 165, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.4).text(cf.desc, 218, y + 3, { width: 330 });
    y += 18;
  });

  footer(3);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: SEGURIDAD, ROLES Y MODELO DE DATOS', 'Gobernanza de Acceso, Tablas Relacionales e Integridad', 4);

  y = 108;
  section('10. Matriz de Roles y Control de Acceso (RBAC)', y);
  y += 25;

  const roles = [
    { rol: 'Administrador (Admin)', perm: 'Acceso total: gestión y suspensión de usuarios, configuración del árbol de catálogos, auditorías, masivos, dinámica gerencial y suite de edición de grillas.' },
    { rol: 'Supervisor (Supervisor)', perm: 'Control operativo: visualización de todos los reclamos y llamadas, auditorías de calidad de su equipo, asignación de tareas, reportes/dinámica y edición de canales.' },
    { rol: 'Asesor (Asesor)', perm: 'Operador de atención: carga de reclamos y llamadas, consulta de masivos, consulta y emisión de grilla de canales para clientes y perfil personal.' },
    { rol: 'Espectador (Espectador)', perm: 'Acceso de solo lectura: consulta de registros, consulta de grillas de canales y emisión sin permisos de edición ni carga.' }
  ];

  roles.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 18).fill(bg);
    doc.rect(40, y, 515, 18).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(r.rol, 48, y + 4, { width: 135 });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.4).text(r.perm, 185, y + 3, { width: 360 });
    y += 18;
  });
  y += 10;

  section('11. Modelo Entidad-Relación (14 Tablas PostgreSQL)', y);
  y += 24;

  const tablas = [
    { t: 'sucursales', d: 'Identificador y nombre de cada sede física u operativa de atención.' },
    { t: 'usuarios', d: 'Credenciales (hash bcrypt), rol, foto_perfil y flag activo (suspensión inmediata).' },
    { t: 'tipos_consulta', d: 'Nivel 1 del catálogo jerárquico de atención (Técnico, Administrativo, Comercial, Baja).' },
    { t: 'caracteristicas_consulta', d: 'Nivel 2 dependiente de tipo_id (CATV, Fibra, Facturación, Débito, etc.).' },
    { t: 'definiciones_consulta', d: 'Nivel 3 con el detalle específico del motivo de contacto del cliente.' },
    { t: 'finalizaciones', d: 'Nivel 4 que califica el resultado de la gestión (Solucionado, Derivado a Guardia, Baja).' },
    { t: 'reclamos', d: 'Registros de atención por Chat con número de abonado validado y asesor responsable.' },
    { t: 'llamadas', d: 'Registros independientes del canal telefónico 0810 con trazabilidad propia.' },
    { t: 'inconvenientes_masivos', d: 'Incidentes de gran envergadura que afectan múltiples abonados simultáneamente.' },
    { t: 'auditorias_calidad', d: 'Evaluaciones 360° de atención con ponderaciones por subcriterio y puntaje final.' },
    { t: 'tareas_asignadas', d: 'Compromisos operativos asignados a asesores con estado y fecha límite.' },
    { t: 'canales_sucursales', d: 'Sedes operativas de provisión de grillas de canales con localidad y provincia.' },
    { t: 'canales_grillas', d: 'Tipos de grilla por sede (Digital, Analógica, Aire Digital) con relación a sucursal.' },
    { t: 'canales_items', d: 'Canales individuales con número de sintonía, nombre, logo oficial y categoría.' }
  ];

  tablas.forEach((tb, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 14).fill(bg);
    doc.rect(40, y, 515, 14).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Courier-Bold').fontSize(7.3).text(tb.t, 48, y + 3, { width: 140, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.2).text(tb.d, 195, y + 3, { width: 350, lineBreak: false });
    y += 14;
  });
  y += 10;

  section('12. Mecanismos de Integridad y Rendimiento', y);
  y += 23;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    '• Índices B-Tree optimizados en columnas de alta demanda: numero_cliente, fecha, asesor_id y grilla_id.' +
    '\n• Paginación y filtrado en servidor que aseguran tiempos de respuesta menores a 50ms aun con alta volumetría.' +
    '\n• Inicialización y siembra automática de catálogos y canales en el arranque del servidor Node.js sin bloqueos.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );

  footer(4);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: GUÍA DE DESPLIEGUE Y OPERACIÓN', 'Procedimiento de Actualización y Mantenimiento Corporativo', 5);

  y = 108;
  section('13. Actualización Rápida en PC del Trabajo (Docker & Git)', y);
  y += 25;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'El despliegue está completamente automatizado y no requiere modificaciones manuales en Docker ni en archivos de configuración. ' +
    'Tanto la definición de Docker Compose como los scripts de inicialización de base de datos se encuentran versionados en Git.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );
  y += 26;

  const pasosActualizacion = [
    { paso: 'Paso 1: Abrir Terminal', cmd: 'cd C:\\Users\\Mauro\\Desktop\\Proyecto\\registro_de_reclamos', desc: 'Posicionarse en el directorio principal del proyecto en la PC del trabajo.' },
    { paso: 'Paso 2: Descargar Cambios', cmd: 'git pull origin main', desc: 'Descarga todas las nuevas rutas, grillas de canales, reportes y vistas desde GitHub.' },
    { paso: 'Paso 3: Reconstruir y Levantar', cmd: 'docker compose up -d --build app', desc: 'Reconstruye el contenedor Node.js e inicia las nuevas tablas automáticamente.' },
    { paso: 'Paso 4: Ingresar al Sistema', cmd: 'http://localhost:3000', desc: 'Acceso web inmediato en el navegador con todos los módulos y pestañas actualizados.' }
  ];

  pasosActualizacion.forEach(pa => {
    doc.rect(40, y, 515, 27).fill(C_BG_LIGHT);
    doc.rect(40, y, 515, 27).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(7.8).text(pa.paso, 48, y + 4);
    doc.fillColor(C_INDIGO).font('Courier-Bold').fontSize(7.4).text(pa.cmd, 185, y + 4);
    doc.fillColor(C_MUTED).font('Helvetica').fontSize(7.2).text(pa.desc, 48, y + 16, { width: 495 });
    y += 30;
  });
  y += 8;

  section('14. Comandos Operativos y de Mantenimiento', y);
  y += 24;

  const cmds = [
    { c: 'docker compose up -d', d: 'Inicia todos los contenedores en segundo plano.' },
    { c: 'docker compose down', d: 'Detiene los servicios resguardando todos los datos en el volumen persistente.' },
    { c: 'docker logs -f reclamos_app', d: 'Inspecciona en tiempo real las peticiones y respuestas del servidor.' },
    { c: 'docker exec -t reclamos_postgres pg_dump -U postgres reclamos_db > backup.sql', d: 'Genera un backup completo de la base de datos PostgreSQL.' },
    { c: 'Get-Content backup.sql | docker exec -i reclamos_postgres psql -U postgres reclamos_db', d: 'Restaura una copia de seguridad en PowerShell.' }
  ];

  cmds.forEach((cm, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 17).fill(bg);
    doc.rect(40, y, 515, 17).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Courier-Bold').fontSize(7.1).text(cm.c, 46, y + 5, { width: 285, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.1).text(cm.d, 335, y + 5, { width: 215, lineBreak: false });
    y += 17;
  });
  y += 14;

  section('15. Conformidad y Conclusión Técnica', y);
  y += 23;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Zeus cumple rigurosamente con los estándares empresariales de modularidad, trazabilidad, seguridad criptográfica, ' +
    'cero comentarios residuales en código y alta concurrencia. Su arquitectura en contenedores garantiza portabilidad total ' +
    'y una operación continua, robusta y eficiente para todos los roles de la organización.',
    40, y, { width: 515, align: 'justify', lineGap: 2.1 }
  );

  footer(5);

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF Oficial de Zeus generado exitosamente en: ${outputPath}`);
  });
}

generateZeusDocsPDF();
