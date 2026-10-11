const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generateMindmapPDF() {
  const outputPath = path.join(__dirname, '../Mapa_Mental_Zeus.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 25, bottom: 25, left: 25, right: 25 }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const C_DARK = '#0A0F1D';
  const C_NAVY = '#0427C4';
  const C_CYAN = '#0487C4';
  const C_PURPLE = '#4104C4';
  const C_BORDER = '#CBD5E1';
  const C_TEXT = '#0F172A';
  const C_MUTED = '#64748B';

  doc.rect(25, 25, 792, 48).fill(C_DARK);
  doc.rect(25, 71, 792, 3).fill(C_CYAN);
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('MAPA MENTAL DE ARQUITECTURA Y MÓDULOS - ZEUS', 40, 36);
  doc.fillColor('#38BDF8').fontSize(9).font('Helvetica').text('Ecosistema Empresarial de Gestión, Atención al Cliente, Auditoría de Calidad y Reporte de Red', 40, 55);

  const cx = 421;
  const cy = 295;
  const cw = 150;
  const ch = 68;

  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch).fill(C_NAVY);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch).lineWidth(2).stroke(C_CYAN);
  doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('⚡ ZEUS', cx - cw / 2, cy - 18, { width: cw, align: 'center' });
  doc.fontSize(8.5).font('Helvetica').text('Gestión & Reporte de Red', cx - cw / 2, cy + 2, { width: cw, align: 'center' });
  doc.fontSize(7.5).fillColor('#BAE6FD').text('PostgreSQL · Docker · Node.js', cx - cw / 2, cy + 15, { width: cw, align: 'center' });

  const branches = [
    {
      title: '1. ATENCIÓN AL CLIENTE',
      color: '#0427C4',
      bg: '#EBF3FC',
      border: '#0487C4',
      x: 35,
      y: 95,
      w: 220,
      h: 180,
      attachX: 255,
      attachY: 185,
      items: [
        { header: '• Registro de Reclamos (Chat)', desc: 'Validación obligatoria de 4 niveles: Tipo, Característica, Definición y Finalización. Alerta de masivos activos y tareas.' },
        { header: '• Historial de Reclamos', desc: 'Filtros dinámicos (DNI, Teléfono, Asesor, Sucursal). Tabla oculta por defecto para alta velocidad. Paginación reactiva.' },
        { header: '• Registro de Llamadas (0810)', desc: 'Formulario estricto para canal telefónico de voz con monitoreo de red concurrente.' },
        { header: '• Historial de Llamadas', desc: 'Registro independiente exclusivo para trazabilidad y auditoría de llamadas telefónicas.' }
      ]
    },
    {
      title: '2. OPERACIONES Y RED',
      color: '#0D9488',
      bg: '#F0FDFA',
      border: '#14B8A6',
      x: 35,
      y: 335,
      w: 220,
      h: 210,
      attachX: 255,
      attachY: 420,
      items: [
        { header: '• Inconvenientes Masivos', desc: 'Afectaciones de gran escala (cortes de fibra, nodos caídos, cabecera).' },
        { header: '• Formulario Nuevo Masivo', desc: 'Impacto zonal, tipo de servicio, fecha inicio y descripción técnica.' },
        { header: '• Registro de Masivos (Acordeón)', desc: 'Consulta en vivo de eventos Activos y Resueltos con tiempos de afectación.' },
        { header: '• Mis Tareas Asignadas', desc: 'Compromisos de seguimiento técnico y comercial con estados Pendiente, Progreso y Resuelta.' }
      ]
    },
    {
      title: '3. AUDITORÍA DE CALIDAD',
      color: '#4104C4',
      bg: '#F5F3FF',
      border: '#8B5CF6',
      x: 585,
      y: 95,
      w: 220,
      h: 180,
      attachX: 585,
      attachY: 185,
      items: [
        { header: '• Nueva Auditoría Guiada (Etapas)', desc: 'Etapa 1: Abonado, Teléfono de contacto, Asesor, Sucursal y Comentarios opcionales.' },
        { header: '• Evaluación Ponderada 360°', desc: 'Etapa 2: Criterios y subcriterios de calidad con cálculo reactivo de puntaje en vivo.' },
        { header: '• Historial de Auditorías', desc: 'Detalles de evaluación, exportación en PDF maquetado, edición de auditoría y borrado seguro.' },
        { header: '• Trazabilidad Total', desc: 'Cualquier modificación o baja queda grabada en la bitácora de auditoría.' }
      ]
    },
    {
      title: '4. SEGURIDAD Y SISTEMA',
      color: '#1E293B',
      bg: '#F8FAFC',
      border: '#64748B',
      x: 585,
      y: 335,
      w: 220,
      h: 210,
      attachX: 585,
      attachY: 420,
      items: [
        { header: '• Control de Acceso RBAC', desc: 'Administrador (total + gestión usuarios), Supervisor (control) y Asesor (operativo).' },
        { header: '• Seguridad y Criptografía', desc: 'Bcryptjs (hash 10 rondas), JWT con caducidad y bloqueo de suspensión inmediata.' },
        { header: '• Registros (Audit Log)', desc: 'Log inmutable: tabla afectada, acción, ID, IP y usuario responsable.' },
        { header: '• Interfaz y Menú Zeus', desc: 'Modo Claro / Oscuro empresarial, diseño responsive y menú comprimido con scroll.' }
      ]
    }
  ];

  branches.forEach(b => {
    doc.lineWidth(1.5).strokeColor(b.color);
    doc.moveTo(cx, cy).bezierCurveTo((cx + b.attachX) / 2, cy, (cx + b.attachX) / 2, b.attachY, b.attachX, b.attachY).stroke();

    doc.rect(b.x, b.y, b.w, b.h).fill(b.bg);
    doc.rect(b.x, b.y, b.w, b.h).lineWidth(1.2).stroke(b.border);

    doc.rect(b.x, b.y, b.w, 22).fill(b.color);
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text(b.title, b.x + 8, b.y + 6, { width: b.w - 16 });

    let iy = b.y + 27;
    b.items.forEach(it => {
      doc.fillColor(C_TEXT).fontSize(7.6).font('Helvetica-Bold').text(it.header, b.x + 8, iy, { width: b.w - 16 });
      iy += 11;
      doc.fillColor(C_MUTED).fontSize(6.8).font('Helvetica').text(it.desc, b.x + 12, iy, { width: b.w - 20, lineGap: 1.2 });
      iy += 26;
    });
  });

  const infraBoxY = 490;
  doc.rect(280, 505, 282, 45).fill('#FFFFFF');
  doc.rect(280, 505, 282, 45).lineWidth(1).stroke(C_CYAN);
  doc.fillColor(C_NAVY).fontSize(8).font('Helvetica-Bold').text('INFRAESTRUCTURA Y BASE DE DATOS', 280, 511, { width: 282, align: 'center' });
  doc.fillColor(C_TEXT).fontSize(7).font('Helvetica').text('PostgreSQL 16 · Docker Compose · Express v5 · 11 Tablas Relacionales', 280, 523, { width: 282, align: 'center' });
  doc.fillColor(C_MUTED).fontSize(6.5).font('Helvetica').text('Índices B-Tree optimizados · Paginación en servidor · 0 comentarios en código', 280, 535, { width: 282, align: 'center' });

  doc.lineWidth(1).strokeColor(C_CYAN);
  doc.moveTo(cx, cy + ch / 2).lineTo(cx, 505).stroke();

  doc.fontSize(7.5).fillColor(C_MUTED).text(
    'Zeus - Mapa Mental de Arquitectura y Módulos | Documento Confidencial Empresarial | Generado para Presentación Ejecutiva',
    25, 570, { align: 'center', width: 792 }
  );

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF de Mapa Mental generado exitosamente en: ${outputPath}`);
  });
}

generateMindmapPDF();
