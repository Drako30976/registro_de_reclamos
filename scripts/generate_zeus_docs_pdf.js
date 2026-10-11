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
  const C_CARD = '#131B2E';
  const C_TEXT = '#0F172A';
  const C_MUTED = '#64748B';
  const C_BG_LIGHT = '#F1F5F8';
  const C_BORDER = '#CBD5E1';

  function headerBanner(title, subtitle, pageNum) {
    doc.rect(40, 35, 515, 60).fill(C_DARK);
    doc.rect(40, 93, 515, 3).fill(C_CYAN);
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text(title, 55, 47);
    doc.fillColor('#38BDF8').fontSize(9).font('Helvetica').text(subtitle, 55, 66);
    doc.fontSize(7.5).fillColor('#94A3B8').text(`Zeus Suite Empresarial | Documentación Oficial | Pág. ${pageNum}`, 55, 80);
  }

  function section(title, y) {
    doc.rect(40, y, 515, 20).fill('#EBF3FC');
    doc.rect(40, y, 4, 20).fill(C_NAVY);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(10).text(title, 52, y + 5);
  }

  function footer(pageNum, totalPages = 4) {
    doc.fontSize(7.5).fillColor(C_MUTED).text(
      `Zeus - Sistema de Gestión, Reporte de Red y Calidad | Documento Confidencial Empresarial | ${pageNum} de ${totalPages}`,
      40, 792, { align: 'center', width: 515 }
    );
  }

  headerBanner('ZEUS: GESTIÓN Y REPORTE DE RED', 'Documentación Técnica y Funcional de Arquitectura Corporativa', 1);

  let y = 110;
  section('1. Resumen Ejecutivo y Visión del Sistema', y);
  y += 26;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.5);
  doc.text(
    'Zeus es una plataforma empresarial orientada a la centralización operativa, trazabilidad y control de calidad ' +
    'en las áreas de Atención al Cliente, Gestión de Reclamos de Red, Soporte Telefónico (0810) y Auditoría Operativa. ' +
    'Reemplaza entornos manuales propensos a colisiones concurrentes (como hojas de cálculo compartidas) por una arquitectura ' +
    'relacional robusta, segura, auditada y desplegada íntegramente mediante contenedores Docker.',
    40, y, { width: 515, align: 'justify', lineGap: 2.5 }
  );
  y += 42;

  section('2. Stack Tecnológico Empresarial', y);
  y += 25;

  const stack = [
    { mod: 'Base de Datos Relacional', desc: 'PostgreSQL 16 en contenedor Alpine con volúmenes montados para persistencia absoluta.' },
    { mod: 'Virtualización y Aislamiento', desc: 'Docker Desktop & Docker Compose (servicios app y db desacoplados en red bridge).' },
    { mod: 'Servidor y Runtime Backend', desc: 'Node.js v22 LTS y framework Express estructurado en controladores, servicios y middlewares.' },
    { mod: 'Criptografía y Seguridad', desc: 'Bcryptjs (hashing irreversible de credenciales) y JSON Web Tokens (JWT) para sesiones seguras.' },
    { mod: 'Frontend SPA', desc: 'Single Page Application pura sin dependencias pesadas: Vanilla JS modular, HTML5 y CSS3 corporativo.' },
    { mod: 'Generación de Reportes', desc: 'PDFKit para exportación en caliente de auditorías e informes de gestión en formato PDF.' },
    { mod: 'Sistema de Temas y UI', desc: 'Motor dinámico Light / Dark con paleta tech (#0487C4, #0427C4, #4104C4, #F1F5F8).' }
  ];

  stack.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 17).fill(bg);
    doc.rect(40, y, 515, 17).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(8).text(item.mod, 48, y + 4, { width: 165, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.8).text(item.desc, 218, y + 4, { width: 330, lineBreak: false });
    y += 17;
  });
  y += 12;

  section('3. Arquitectura del Sistema y Flujo de Datos', y);
  y += 25;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'La arquitectura se organiza bajo el patrón de separación cliente-servidor sin estado (Stateless REST API). ' +
    'Toda petición HTTP viaja con el encabezado Authorization: Bearer <token>. El middleware de autenticación valida la firma, ' +
    'extrae la identidad del usuario y verifica el estado de activación en tiempo real; ante cualquier suspensión, se rechaza la ' +
    'petición de forma inmediata. Asimismo, el interceptor de base de datos registra de forma automática cada acción de creación, ' +
    'edición o eliminación en la tabla central de auditoría del sistema.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );
  y += 44;

  const boxes = [
    { title: 'Frontend SPA (Cliente)', desc: 'Gestión de vistas DOM, validaciones en vivo, tablas reactivas y menú desplegable Zeus.' },
    { title: 'API Gateway & Middleware', desc: 'Control de acceso JWT, verificación de roles, carga de imágenes Multer y CORS.' },
    { title: 'PostgreSQL Relacional', desc: 'Árbol jerárquico de catálogos, integridad referencial (FKs ON DELETE CASCADE/RESTRICT).' }
  ];

  boxes.forEach((b, idx) => {
    const bx = 40 + idx * 175;
    doc.rect(bx, y, 165, 48).fill(C_BG_LIGHT);
    doc.rect(bx, y, 165, 48).stroke(C_CYAN);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(8).text(b.title, bx + 8, y + 6);
    doc.fillColor(C_MUTED).font('Helvetica').fontSize(7.2).text(b.desc, bx + 8, y + 18, { width: 150, lineGap: 1.5 });
  });

  footer(1, 4);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: MÓDULOS FUNCIONALES Y OPERATORIA', 'Detalle de Módulos Operativos y Flujos de Atención', 2);

  y = 110;
  section('4. Módulo: Atención al Cliente', y);
  y += 26;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'Es el núcleo operativo principal para la carga y seguimiento de incidencias, consultas comerciales y reportes técnicos.',
    40, y, { width: 515 }
  );
  y += 16;

  const submods = [
    {
      tit: 'A. Registro de Reclamos (Atención por Chat)',
      f1: '• Nuevo Reclamo: Entrada de incidencias canalizadas por mensajería. Incluye selección dinámica jerárquica obligatoria (Tipo, Característica, Definición y Finalización), detección en vivo de Inconvenientes Masivos activos y visualización de tareas asignadas.',
      f2: '• Historial de Reclamos: Consulta optimizada con filtros avanzados (DNI, Teléfono, Tipo, Asesor, Sucursal, Rango de Fechas). La tabla de datos permanece oculta por defecto para evitar sobrecargas y se despliega con paginación reactiva tras filtrar.'
    },
    {
      tit: 'B. Registro de Llamadas (Atención Telefónica 0810)',
      f1: '• Nueva Llamada: Mismo estándar estructural estricto de campos jerárquicos adaptado específicamente a la canalización telefónica 0810, con alerta de afectaciones masivas concurrentes.',
      f2: '• Historial de Llamadas: Registro independiente que audita exclusivamente las comunicaciones de voz, con visualización detallada, exportación y trazabilidad del operador interviniente.'
    }
  ];

  submods.forEach(sm => {
    doc.rect(40, y, 515, 48).fill(C_BG_LIGHT);
    doc.rect(40, y, 515, 48).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(8).text(sm.tit, 48, y + 5);
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(sm.f1, 48, y + 17, { width: 498, lineGap: 1.5 });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(sm.f2, 48, y + 31, { width: 498, lineGap: 1.5 });
    y += 54;
  });

  y += 6;
  section('5. Módulo: Inconvenientes Masivos', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'Permite registrar afectaciones de red de gran escala (cortes de fibra, fallas de cabecera, nodos sin suministro eléctrico). ' +
    'Cuenta con 2 subpestañas: Nuevo Masivo (con formulario de impacto zonal, tipo de servicio y descripción) y Registro de Masivos ' +
    '(acordeón interactivo para consultar estado "Activo" o "Resuelto", tiempos de afectación y cierre de incidencias).',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );
  y += 38;

  section('6. Módulo: Auditoría de Calidad (Evaluación 360°)', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'Herramienta de control de calidad sobre la gestión de los asesores. Se divide en:' +
    '\n• Nueva Auditoría: Proceso guiado en etapas (Etapa 1: Abonado, Teléfono de contacto, Asesor, Sucursal, Comentarios; Etapa 2: Evaluación ponderada con cálculo de puntaje en vivo por categorías de comunicación y resolución).' +
    '\n• Historial de Auditorías: Listado de auditorías realizadas con acciones rápidas: Ver Detalles, Exportar en PDF maquetado, Editar auditoría existente (con registro automático de modificaciones en auditoría) y Eliminar registro.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );
  y += 46;

  section('7. Módulos Auxiliares: Tareas Asignadas y Registros de Auditoría', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    '• Mis Tareas: Gestión de compromisos diarios asignados a asesores con estados "Pendiente", "En Progreso" y "Completada".' +
    '\n• Registros (Audit Log): Bitácora inmutable de seguridad que graba cada inserción, edición o baja de datos con IP, fecha/hora y usuario responsable, disponible para supervisiones y auditorías externas.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );

  footer(2, 4);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: SEGURIDAD, ROLES Y MODELO DE DATOS', 'Gobernanza de Acceso, Tablas Relacionales e Integridad', 3);

  y = 110;
  section('8. Matriz de Roles y Control de Acceso (RBAC)', y);
  y += 26;

  const roles = [
    { rol: 'Administrador (admin)', perm: 'Acceso irrestricto: gestión de usuarios (alta, edición, suspensión inmediata), catálogo jerárquico, configuración, auditorías, masivos y eliminación de registros.' },
    { rol: 'Supervisor (supervisor)', perm: 'Visualización total de reclamos y llamadas, auditorías de calidad de su equipo, gestión de masivos y asignación de tareas operativas.' },
    { rol: 'Asesor (asesor)', perm: 'Carga de reclamos y llamadas, consulta de masivos activos, gestión de sus propias tareas asignadas y edición de perfil personal.' }
  ];

  roles.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 20).fill(bg);
    doc.rect(40, y, 515, 20).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(8).text(r.rol, 48, y + 5, { width: 130 });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(r.perm, 185, y + 4, { width: 360, lineGap: 1.5 });
    y += 20;
  });
  y += 12;

  section('9. Modelo Entidad-Relación y Estructura de Tablas', y);
  y += 25;

  const tablas = [
    { t: 'sucursales', d: 'Identificador y nombre de cada sede física u operativa de la empresa.' },
    { t: 'usuarios', d: 'Credenciales (hash bcrypt), rol, sucursal_id, foto_perfil y flag activo (suspensión).' },
    { t: 'tipos_consulta', d: 'Nivel 1 del catálogo jerárquico (Técnico, Facturación, Venta, Baja, etc.).' },
    { t: 'caracteristicas_consulta', d: 'Nivel 2 dependiente de tipo_id (Conexión, CATV, Pendiente, Débito, etc.).' },
    { t: 'definiciones_consulta', d: 'Nivel 3 con descripción detallada de la causa o motivo de la consulta.' },
    { t: 'finalizaciones_consulta', d: 'Nivel 4 que califica el cierre del reclamo (Solucionado, Derivado a Guardia, etc.).' },
    { t: 'reclamos', d: 'Incidencias con fecha, DNI, teléfono, abonado, sucursal, asesor, observaciones y origen canal.' },
    { t: 'inconvenientes_masivos', d: 'Incidentes de gran envergadura que afectan múltiples clientes simultáneamente.' },
    { t: 'auditorias_calidad', d: 'Evaluaciones de asesores con notas obtenidas por subcriterios y puntaje final.' },
    { t: 'tareas_asignadas', d: 'Compromisos de seguimiento técnico/comercial con fecha límite y estado.' },
    { t: 'registros_auditoria', d: 'Log inmutable con tabla_afectada, accion, registro_id, usuario_id y timestamp.' }
  ];

  tablas.forEach((tb, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 14.5).fill(bg);
    doc.rect(40, y, 515, 14.5).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Courier-Bold').fontSize(7.5).text(tb.t, 48, y + 3, { width: 140, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.4).text(tb.d, 195, y + 3, { width: 350, lineBreak: false });
    y += 14.5;
  });
  y += 12;

  section('10. Mecanismos de Integridad y Resiliencia', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    '• Índices B-Tree optimizados sobre columnas de búsqueda masiva: dni_cliente, telefono, fecha, asesor_id y tipo_id.' +
    '\n• Paginación en servidor (LIMIT / OFFSET) que garantiza rendimiento uniforme aun con millones de registros.' +
    '\n• Aislamiento en transacciones SQL (BEGIN ... COMMIT / ROLLBACK) en procesos de alta concurrencia.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );

  footer(3, 4);

  doc.addPage({ size: 'A4', margins: { top: 35, bottom: 35, left: 40, right: 40 } });
  headerBanner('ZEUS: GUÍA DE OPERACIÓN Y DESPLIEGUE', 'Manual de Despliegue en Entorno de Producción y Mantenimiento', 4);

  y = 110;
  section('11. Puesta en Marcha en Nuevos Equipos o Servidores', y);
  y += 26;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'El despliegue está 100% automatizado mediante contenedores Docker. Pasos para iniciar en cualquier equipo corporativo:',
    40, y, { width: 515 }
  );
  y += 18;

  const pasosDeploy = [
    { n: '1. Clonar o Actualizar', c: 'git pull origin main', d: 'Descarga las últimas mejoras del repositorio oficial.' },
    { n: '2. Compilar y Levantar', c: 'docker compose up -d --build', d: 'Construye la imagen Node.js y levanta Postgres en segundo plano.' },
    { n: '3. Verificar Servicios', c: 'docker ps', d: 'Comprueba que reclamos_app y reclamos_postgres estén en estado UP.' },
    { n: '4. Ingreso al Sistema', c: 'http://localhost:3000', d: 'Acceso web inmediato. Credenciales iniciales: admin / admin123.' }
  ];

  pasosDeploy.forEach(pd => {
    doc.rect(40, y, 515, 26).fill(C_BG_LIGHT);
    doc.rect(40, y, 515, 26).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Helvetica-Bold').fontSize(8).text(pd.n, 48, y + 4);
    doc.fillColor(C_INDIGO).font('Courier-Bold').fontSize(7.5).text(pd.c, 175, y + 4);
    doc.fillColor(C_MUTED).font('Helvetica').fontSize(7.3).text(pd.d, 48, y + 15, { width: 495 });
    y += 29;
  });
  y += 8;

  section('12. Comandos Operativos y de Mantenimiento', y);
  y += 24;

  const cmds = [
    { c: 'docker compose up -d', d: 'Inicia todos los contenedores de Zeus en segundo plano.' },
    { c: 'docker compose down', d: 'Detiene los servicios preservando todos los datos en el volumen persistente.' },
    { c: 'docker logs -f reclamos_app', d: 'Monitorea en tiempo real las peticiones y registros del servidor Express.' },
    { c: 'docker exec -t reclamos_postgres pg_dump -U postgres reclamos_db > backup.sql', d: 'Genera un backup completo de la base de datos SQL.' },
    { c: 'Get-Content backup.sql | docker exec -i reclamos_postgres psql -U postgres reclamos_db', d: 'Restaura una copia de seguridad en PowerShell.' }
  ];

  cmds.forEach((cm, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : C_BG_LIGHT;
    doc.rect(40, y, 515, 18).fill(bg);
    doc.rect(40, y, 515, 18).stroke(C_BORDER);
    doc.fillColor(C_NAVY).font('Courier-Bold').fontSize(7.2).text(cm.c, 46, y + 5, { width: 285, lineBreak: false });
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.2).text(cm.d, 335, y + 5, { width: 215, lineBreak: false });
    y += 18;
  });
  y += 16;

  section('13. Conclusión y Conformidad Técnica', y);
  y += 24;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.2);
  doc.text(
    'Zeus cumple con los estándares empresariales de modularidad, trazabilidad, seguridad criptográfica y diseño de alta ' +
    'disponibilidad. Su arquitectura en contenedores garantiza portabilidad inmediata y su estética profesional asegura una ' +
    'adopción ágil y eficiente por parte de asesores, supervisores y directores de área.',
    40, y, { width: 515, align: 'justify', lineGap: 2.2 }
  );

  footer(4, 4);

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF Oficial de Zeus generado exitosamente en: ${outputPath}`);
  });
}

generateZeusDocsPDF();
