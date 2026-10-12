const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateMindmapPDF() {
  const outputPath = path.join(__dirname, '../Mapa_Mental_Zeus.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 20, bottom: 20, left: 20, right: 20 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const C_DARK = '#0A0F1D';
  const C_NAVY = '#0427C4';
  const C_CYAN = '#0487C4';
  const C_TEXT = '#0F172A';
  const C_MUTED = '#64748B';

  doc.rect(20, 20, 802, 45).fill(C_DARK);
  doc.rect(20, 63, 802, 3).fill(C_CYAN);
  doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text('MAPA MENTAL DE ARQUITECTURA Y MÓDULOS - ZEUS', 35, 29);
  doc.fillColor('#38BDF8').fontSize(8.5).font('Helvetica').text('Ecosistema Empresarial de Gestión, Atención al Cliente, Calidad, Dinámica de Red y Grilla de Canales', 35, 47);

  const cx = 421;
  const cy = 290;
  const cw = 145;
  const ch = 65;

  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch).fill(C_NAVY);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch).lineWidth(2).stroke(C_CYAN);
  doc.fillColor('#FFFFFF').fontSize(13).font('Helvetica-Bold').text('⚡ ZEUS', cx - cw / 2, cy - 17, { width: cw, align: 'center' });
  doc.fontSize(8).font('Helvetica').text('Gestión & Reporte de Red', cx - cw / 2, cy + 2, { width: cw, align: 'center' });
  doc.fontSize(7).fillColor('#BAE6FD').text('PostgreSQL · Docker · Node.js', cx - cw / 2, cy + 14, { width: cw, align: 'center' });

  const branches = [
    {
      title: '1. ATENCIÓN AL CLIENTE',
      color: '#0427C4',
      bg: '#EBF3FC',
      border: '#0487C4',
      x: 25,
      y: 78,
      w: 235,
      h: 135,
      attachX: 260,
      attachY: 145,
      items: [
        { header: '• Reclamos (Chat)', desc: 'Validación en 4 niveles jerárquicos (Tipo, Característica, Definición, Finalización).' },
        { header: '• Historial de Reclamos', desc: 'Filtros por abonado, DNI, teléfono, asesor y sucursal. Paginación reactiva.' },
        { header: '• Llamadas (0810)', desc: 'Canal de telefonía de voz con trazabilidad y monitoreo simultáneo de red.' }
      ]
    },
    {
      title: '2. OPERACIONES Y RED',
      color: '#0D9488',
      bg: '#F0FDFA',
      border: '#14B8A6',
      x: 25,
      y: 223,
      w: 235,
      h: 135,
      attachX: 260,
      attachY: 290,
      items: [
        { header: '• Inconvenientes Masivos', desc: 'Registro de cortes de fibra, nodos caídos y cabecera con estado Activo / Resuelto.' },
        { header: '• Tareas Asignadas', desc: 'Gestión de compromisos diarios con estados Pendiente, En Progreso y Resuelta.' },
        { header: '• Alertas Concurrentes', desc: 'Notificación visual preventiva al cargar reclamos en zonas con fallas masivas.' }
      ]
    },
    {
      title: '3. GRILLA DE CANALES Y EMISIÓN',
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#38BDF8',
      x: 25,
      y: 368,
      w: 235,
      h: 148,
      attachX: 260,
      attachY: 440,
      items: [
        { header: '• Consulta por Sucursal y Grilla', desc: 'Soporte de guías Digital, Analógica y Aire Digital con buscador instantáneo.' },
        { header: '• Captura Dinámica (PNG)', desc: 'Generación y descarga de imagen en alta resolución para enviar al cliente.' },
        { header: '• Suite Editar (CRUD Total)', desc: 'Administración de Sucursales, Grillas y Canales con más de 130 logos precargados.' }
      ]
    },
    {
      title: '4. AUDITORÍA DE CALIDAD 360°',
      color: '#4104C4',
      bg: '#F5F3FF',
      border: '#8B5CF6',
      x: 582,
      y: 78,
      w: 235,
      h: 135,
      attachX: 582,
      attachY: 145,
      items: [
        { header: '• Nueva Auditoría Guiada', desc: 'Etapa 1: Datos de atención; Etapa 2: Ponderación de indicadores con nota en vivo.' },
        { header: '• Historial de Auditorías', desc: 'Visualización de detalles, edición controlada y exportación en PDF maquetado.' },
        { header: '• Bitácora Inmutable', desc: 'Grabación estricta de cada modificación o baja en el registro de auditoría.' }
      ]
    },
    {
      title: '5. REPORTES Y DINÁMICA',
      color: '#C026D3',
      bg: '#FDF4FF',
      border: '#E879F9',
      x: 582,
      y: 223,
      w: 235,
      h: 135,
      attachX: 582,
      attachY: 290,
      items: [
        { header: '• KPIs y Métricas Consolidadas', desc: 'Totales de reclamos, llamadas, bajas, consultas de cobertura y pagos por sucursal.' },
        { header: '• Análisis Cruzado por Asesor', desc: 'Filtro por operador para medir volumen gestionado y tipos de finalización.' },
        { header: '• Exportación en PDF', desc: 'Emisión ejecutiva de reportes con barras de progreso y ratios porcentuales.' }
      ]
    },
    {
      title: '6. SEGURIDAD Y GOBERNANZA',
      color: '#1E293B',
      bg: '#F8FAFC',
      border: '#64748B',
      x: 582,
      y: 368,
      w: 235,
      h: 148,
      attachX: 582,
      attachY: 440,
      items: [
        { header: '• Control de Acceso RBAC', desc: 'Roles diferenciados: Admin (total), Supervisor (control) y Asesor (operativo).' },
        { header: '• Criptografía y Sesiones', desc: 'Bcryptjs (hash de contraseñas), JWT con expiración y bloqueo de usuarios suspendidos.' },
        { header: '• Interfaz Zeus Adaptable', desc: 'Modo Claro y Oscuro corporativo, menú desplegable y diseño responsive.' }
      ]
    }
  ];

  branches.forEach(b => {
    doc.lineWidth(1.2).strokeColor(b.color);
    doc.moveTo(cx, cy).bezierCurveTo((cx + b.attachX) / 2, cy, (cx + b.attachX) / 2, b.attachY, b.attachX, b.attachY).stroke();

    doc.rect(b.x, b.y, b.w, b.h).fill(b.bg);
    doc.rect(b.x, b.y, b.w, b.h).lineWidth(1.1).stroke(b.border);

    doc.rect(b.x, b.y, b.w, 20).fill(b.color);
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(b.title, b.x + 8, b.y + 5, { width: b.w - 16 });

    let iy = b.y + 24;
    b.items.forEach(it => {
      doc.fillColor(C_TEXT).fontSize(7.4).font('Helvetica-Bold').text(it.header, b.x + 8, iy, { width: b.w - 16 });
      iy += 10;
      doc.fillColor(C_MUTED).fontSize(6.6).font('Helvetica').text(it.desc, b.x + 10, iy, { width: b.w - 18, lineGap: 1.1 });
      iy += 26;
    });
  });

  doc.rect(280, 488, 282, 45).fill('#FFFFFF');
  doc.rect(280, 488, 282, 45).lineWidth(1).stroke(C_CYAN);
  doc.fillColor(C_NAVY).fontSize(7.8).font('Helvetica-Bold').text('INFRAESTRUCTURA Y BASE DE DATOS', 280, 494, { width: 282, align: 'center' });
  doc.fillColor(C_TEXT).fontSize(6.8).font('Helvetica').text('PostgreSQL 16 · Docker Compose · Express v5 · 14 Tablas Relacionales', 280, 506, { width: 282, align: 'center' });
  doc.fillColor(C_MUTED).fontSize(6.3).font('Helvetica').text('Índices B-Tree · Migraciones automatizadas · 0 comentarios en código', 280, 517, { width: 282, align: 'center' });

  doc.lineWidth(1).strokeColor(C_CYAN);
  doc.moveTo(cx, cy + ch / 2).lineTo(cx, 488).stroke();

  doc.fontSize(7).fillColor(C_MUTED).text(
    'Zeus - Mapa Mental de Arquitectura y Módulos | Documento Confidencial Empresarial | Actualizado Octubre 2026',
    20, 568, { align: 'center', width: 802 }
  );

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF de Mapa Mental generado exitosamente en: ${outputPath}`);
  });
}

generateMindmapPDF();
