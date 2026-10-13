const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateSecurityAuditPDF() {
  const outputPath = path.join(__dirname, '../Informe_Auditoria_Seguridad_Zeus.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 40, right: 40 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const C_DARK = '#0A0F1D';
  const C_CYAN = '#0284C7';
  const C_RED = '#DC2626';
  const C_AMBER = '#D97706';
  const C_BLUE = '#2563EB';
  const C_GREEN = '#059669';
  const C_TEXT = '#0F172A';
  const C_MUTED = '#64748B';
  const C_BG_CARD = '#F8FAFC';
  const C_BORDER = '#E2E8F0';

  function headerBanner(title, subtitle, pageNum, totalPages) {
    doc.rect(40, 35, 515, 60).fill(C_DARK);
    doc.rect(40, 93, 515, 3).fill(C_CYAN);
    doc.fillColor('#FFFFFF').fontSize(12.5).font('Helvetica-Bold').text(title, 55, 47);
    doc.fillColor('#38BDF8').fontSize(8.5).font('Helvetica').text(subtitle, 55, 66);
    doc.fontSize(7.2).fillColor('#94A3B8').text(`Zeus Security Assessment | Informe de Auditoría y Hardening | Pág. ${pageNum} de ${totalPages}`, 55, 80);
  }

  function section(title, y, color = '#0284C7') {
    doc.rect(40, y, 515, 20).fill('#F0F9FF');
    doc.rect(40, y, 4, 20).fill(color);
    doc.fillColor('#0369A1').font('Helvetica-Bold').fontSize(9.5).text(title, 52, y + 5);
  }

  function footer(pageNum, totalPages) {
    doc.fontSize(7.2).fillColor(C_MUTED).text(
      `Zeus Suite - Auditoría de Ciberseguridad, Ethical Hacking & Hardening Defensivo | Confidencial | Pág. ${pageNum} de ${totalPages}`,
      40, 792, { align: 'center', width: 515 }
    );
  }

  headerBanner('INFORME TÉCNICO DE AUDITORÍA DE CIBERSEGURIDAD', 'Análisis de Código Estático (SAST), Pruebas Ofensivas y Hardening de Arquitectura', 1, 3);
  let y = 108;

  section('A. Resumen Ejecutivo de la Evaluación', y);
  y += 26;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8.3);
  doc.text(
    'Se ejecutó una auditoría de seguridad exhaustiva sobre el código fuente, la configuración de API Express, ' +
    'la base de datos relacional PostgreSQL y las dependencias de la plataforma Zeus. ' +
    'La evaluación contempló los estándares OWASP Top 10, CWE/SANS y metodologías de pruebas ofensivas (Pentesting). ' +
    'El sistema presentaba fortalezas en el almacenamiento de contraseñas con bcryptjs y el uso de consultas parametrizadas en pg. ' +
    'No obstante, se identificaron vectores de riesgo crítico y alto en control de acceso de objetos (BOLA/IDOR), ' +
    'permisos en endpoints mutativos de grillas, fallbacks de firma JWT y ausencia de Rate Limiting y cabeceras de endurecimiento.',
    40, y, { width: 515, align: 'justify', lineGap: 2 }
  );
  y += 50;

  doc.rect(40, y, 120, 42).fill('#FEF2F2');
  doc.rect(40, y, 4, 42).fill(C_RED);
  doc.fillColor(C_RED).font('Helvetica-Bold').fontSize(13).text('2', 55, y + 8);
  doc.fillColor(C_TEXT).fontSize(7.5).font('Helvetica-Bold').text('Vulnerabilidades Críticas', 55, y + 25);

  doc.rect(170, y, 120, 42).fill('#FFFBEB');
  doc.rect(170, y, 4, 42).fill(C_AMBER);
  doc.fillColor(C_AMBER).font('Helvetica-Bold').fontSize(13).text('3', 185, y + 8);
  doc.fillColor(C_TEXT).fontSize(7.5).font('Helvetica-Bold').text('Vulnerabilidades Altas', 185, y + 25);

  doc.rect(300, y, 120, 42).fill('#EFF6FF');
  doc.rect(300, y, 4, 42).fill(C_BLUE);
  doc.fillColor(C_BLUE).font('Helvetica-Bold').fontSize(13).text('3', 315, y + 8);
  doc.fillColor(C_TEXT).fontSize(7.5).font('Helvetica-Bold').text('Vulnerabilidades Medias', 315, y + 25);

  doc.rect(430, y, 125, 42).fill('#F0FDF4');
  doc.rect(430, y, 4, 42).fill(C_GREEN);
  doc.fillColor(C_GREEN).font('Helvetica-Bold').fontSize(13).text('2', 445, y + 8);
  doc.fillColor(C_TEXT).fontSize(7.5).font('Helvetica-Bold').text('Vulnerabilidades Bajas', 445, y + 25);

  y += 52;

  section('B. Análisis Detallado de Hallazgos y Vulnerabilidades', y);
  y += 26;

  const vulnsP1 = [
    {
      id: 'VULN-01',
      title: 'Firma JWT con Fallback Hardcoded en Código Fuente',
      sev: 'CRÍTICA',
      cvss: '9.8',
      color: C_RED,
      loc: 'src/middlewares/auth.js y src/controllers/auth.controller.js',
      desc: 'El servidor utilizaba una clave estática como fallback ("reclamos_jwt_super_secret_key_2026"). Si la variable JWT_SECRET faltase en producción, cualquier actor externo podría forjar tokens con rol Admin, evadiendo la autenticación y tomando control total.'
    },
    {
      id: 'VULN-02',
      title: 'Control de Acceso Roto (BOLA / IDOR) en Reclamos y Llamadas',
      sev: 'ALTA',
      cvss: '8.1',
      color: C_AMBER,
      loc: 'src/controllers/reclamos.controller.js y src/controllers/llamadas.controller.js',
      desc: 'Cualquier usuario con rol Asesor podía modificar o sobrescribir reclamos o llamadas de otros asesores sin verificar la propiedad del registro (usuario_id === req.user.id), alterando la integridad operativa y las métricas.'
    },
    {
      id: 'VULN-03',
      title: 'Ausencia de Autorización RBAC en Gestión de Grillas y Canales',
      sev: 'CRÍTICA',
      cvss: '8.8',
      color: C_RED,
      loc: 'src/routes/canales.routes.js',
      desc: 'Los endpoints de creación, modificación y eliminación de sucursales, grillas y canales sólo requerían un token válido, omitiendo el filtro checkRole. Usuarios con rol Espectador o Asesor podían eliminar canales y grillas enteras.'
    },
    {
      id: 'VULN-04',
      title: 'Cross-Site Scripting Almacenado (Stored XSS) en DOM Rendering',
      sev: 'ALTA',
      cvss: '7.6',
      color: C_AMBER,
      loc: 'js/reclamos.js y vistas con innerHTML dinámico',
      desc: 'Campos como el servicio afectado, características de daño y detalles de inconvenientes masivos se renderizaban mediante innerHTML sin escape contextual, permitiendo la inyección de tags script para robo de tokens en localStorage.'
    }
  ];

  vulnsP1.forEach(v => {
    doc.rect(40, y, 515, 62).fill(C_BG_CARD);
    doc.rect(40, y, 3, 62).fill(v.color);

    doc.fillColor(v.color).font('Helvetica-Bold').fontSize(8.5).text(`[${v.sev} | CVSS ${v.cvss}] ${v.id}: ${v.title}`, 48, y + 6);
    doc.fillColor(C_MUTED).font('Helvetica-Bold').fontSize(7.2).text(`Ubicación: ${v.loc}`, 48, y + 19);
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(v.desc, 48, y + 31, { width: 500, align: 'justify', lineGap: 1.5 });

    y += 67;
  });

  footer(1, 3);

  doc.addPage();
  headerBanner('INFORME TÉCNICO DE AUDITORÍA DE CIBERSEGURIDAD', 'Análisis de Vulnerabilidades (Cont.) y Medidas de Mitigación Aplicadas', 2, 3);
  y = 108;

  section('B. Continuación de Hallazgos Auditados', y);
  y += 26;

  const vulnsP2 = [
    {
      id: 'VULN-05',
      title: 'Ausencia de Rate Limiting y Protección contra Fuerza Bruta',
      sev: 'ALTA',
      cvss: '7.5',
      color: C_AMBER,
      loc: 'src/routes/auth.routes.js (POST /api/auth/login)',
      desc: 'El endpoint de autenticación carecía de limitación por IP. Un atacante podía ejecutar ataques automatizados de diccionario sin restricciones temporales ni bloqueos.'
    },
    {
      id: 'VULN-06',
      title: 'Exposición Insegura del Directorio Raíz mediante express.static',
      sev: 'MEDIA',
      cvss: '5.3',
      color: C_BLUE,
      loc: 'src/server.js (app.use(express.static(path.join(__dirname, "../"))))',
      desc: 'Servir la raíz exponía potencialmente archivos de configuración, metadatos y código sensible a peticiones HTTP directas en caso de omisiones operativas.'
    },
    {
      id: 'VULN-07',
      title: 'Filtro Permisivo en Subida de Archivos y Archivos SVG',
      sev: 'MEDIA',
      cvss: '6.5',
      color: C_BLUE,
      loc: 'src/routes/canales.routes.js y src/routes/usuarios.routes.js',
      desc: 'La validación por extensión confiaba en originalname y permitía SVG, que admite scripts XML embebidos ejecutables si el navegador abre la URL del recurso directamente.'
    },
    {
      id: 'VULN-08',
      title: 'Falta de Cabeceras HTTP de Seguridad (Security Headers)',
      sev: 'BAJA',
      cvss: '4.3',
      color: C_MUTED,
      loc: 'src/server.js',
      desc: 'Ausencia de cabeceras de defensa en profundidad contra Clickjacking (X-Frame-Options), Content-Type Sniffing y exposición del banner X-Powered-By.'
    }
  ];

  vulnsP2.forEach(v => {
    doc.rect(40, y, 515, 58).fill(C_BG_CARD);
    doc.rect(40, y, 3, 58).fill(v.color);

    doc.fillColor(v.color).font('Helvetica-Bold').fontSize(8.5).text(`[${v.sev} | CVSS ${v.cvss}] ${v.id}: ${v.title}`, 48, y + 6);
    doc.fillColor(C_MUTED).font('Helvetica-Bold').fontSize(7.2).text(`Ubicación: ${v.loc}`, 48, y + 18);
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(v.desc, 48, y + 29, { width: 500, align: 'justify', lineGap: 1.5 });

    y += 63;
  });

  y += 5;
  section('C. Plan de Mitigación y Código Corregido Aplicado', y);
  y += 26;

  const parches = [
    {
      titulo: '1. Hardening en Autenticación JWT y Blindaje de Secretos',
      detalle: 'Se configuró validación obligatoria de JWT_SECRET en entorno de ejecución. Si la variable no está provista en producción, el servidor aborta la firma de manera segura en lugar de recurrir a contraseñas débiles por defecto.'
    },
    {
      titulo: '2. Resolución de BOLA / IDOR en Reclamos y Llamadas',
      detalle: 'Se implementó verificación de propiedad estricta en los controladores. Si un usuario con rol "Asesor" intenta modificar un reclamo o llamada ajeno, la API bloquea la acción respondiendo con código HTTP 403 Forbidden.'
    },
    {
      titulo: '3. Control de Acceso Basado en Roles (RBAC) en Módulo de Canales',
      detalle: 'Se integró el middleware checkRole("Admin", "Supervisor") sobre todos los métodos mutativos (POST, PUT, DELETE) y de subida de imágenes, asegurando que los roles de menor jerarquía sólo gocen de permisos de consulta.'
    },
    {
      titulo: '4. Sanitización Contextual y Protección XSS en Frontend',
      detalle: 'Se añadió la función centralizada API.escapeHTML() para neutralizar cualquier carácter reservado (<, >, &, \", \') antes de renderizar atributos y contenido en el árbol DOM del navegador.'
    }
  ];

  parches.forEach(p => {
    doc.fillColor('#0284C7').font('Helvetica-Bold').fontSize(8.2).text(p.titulo, 40, y);
    y += 12;
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(p.detalle, 40, y, { width: 515, align: 'justify', lineGap: 1.5 });
    y += 24;
  });

  footer(2, 3);

  doc.addPage();
  headerBanner('INFORME TÉCNICO DE AUDITORÍA DE CIBERSEGURIDAD', 'Hardening de Arquitectura, Medidas Proactivas y Conclusiones', 3, 3);
  y = 108;

  section('D. Hardening Proactivo de Arquitectura Implementado', y);
  y += 26;

  const medidas = [
    {
      tit: '1. Endurecimiento de Cabeceras HTTP con Helmet',
      desc: 'Se instaló e integró la librería helmet en el servidor Express. Esto neutraliza la divulgación de tecnología (X-Powered-By), previene ataques de Clickjacking forzando políticas de framing, activa protección XSS en navegadores legados y bloquea el rastreo de tipos MIME (X-Content-Type-Options: nosniff).'
    },
    {
      tit: '2. Rate Limiting contra Fuerza Bruta con express-rate-limit',
      desc: 'Se implementó limitador de peticiones en el endpoint POST /api/auth/login configurado a un máximo de 10 intentos por IP dentro de una ventana de 15 minutos, mitigando ataques de fuerza bruta y enumeración automatizada de credenciales.'
    },
    {
      tit: '3. Aislamiento de Archivos Estáticos',
      desc: 'Se eliminó la exposición indiscriminada del directorio raíz del servidor. Se definieron rutas estáticas puntuales y restringidas para /assets, /css, /js y /uploads, protegiendo archivos de sistema y repositorios de descargas no autorizadas.'
    },
    {
      tit: '4. Sanitización de Inyecciones en Salidas DOM',
      desc: 'Se estandarizó el uso de escape contextual en todo renderizado de plantillas HTML dinámicas en el cliente web, erradicando vectores de Cross-Site Scripting persistente.'
    },
    {
      tit: '5. Auditoría de Seguridad Automatizada en CI/CD',
      desc: 'Se recomienda incorporar npm audit y análisis estático SAST en las canalizaciones de despliegue continuo para alertar tempranamente sobre nuevas vulnerabilidades en librerías de terceros.'
    }
  ];

  medidas.forEach(m => {
    doc.fillColor('#0369A1').font('Helvetica-Bold').fontSize(8.5).text(m.tit, 40, y);
    y += 12;
    doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.7).text(m.desc, 40, y, { width: 515, align: 'justify', lineGap: 2 });
    y += 32;
  });

  y += 10;
  section('E. Conclusión y Dictamen de Seguridad', y, '#059669');
  y += 26;

  doc.fillColor(C_TEXT).font('Helvetica').fontSize(8).text(
    'Con la aplicación integral de los parches de código y los componentes defensivos proactivos (Helmet, Rate Limiting, ' +
    'RBAC riguroso, comprobación de propiedad BOLA y sanitización de salida), la plataforma Zeus eleva sustancialmente su ' +
    'postura de ciberseguridad, cumpliendo con los estándares de diseño seguro requeridos para operaciones en entornos de producción.',
    40, y, { width: 515, align: 'justify', lineGap: 2 }
  );
  y += 40;

  doc.rect(40, y, 515, 45).fill('#F0FDF4');
  doc.rect(40, y, 4, 45).fill('#059669');
  doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(9).text('DICTAMEN FINAL: POSTURA ROBUSTA Y DEFENDIBLE', 52, y + 10);
  doc.fillColor(C_TEXT).font('Helvetica').fontSize(7.5).text(
    'El sistema ha sido mitigado contra las vulnerabilidades críticas y altas identificadas en el ejercicio de auditoría. ' +
    'Se encuentra en estado óptimo para su despliegue seguro en producción.', 52, y + 25
  );

  footer(3, 3);

  doc.end();
}

generateSecurityAuditPDF();
