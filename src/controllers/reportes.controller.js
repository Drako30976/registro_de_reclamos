const PDFDocument = require('pdfkit');
const pool = require('../config/db');

const emitirReportePDF = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      fecha,
      asesor_id,
      sucursal_id,
      tipo_consulta_id,
      numero_cliente
    } = req.query;

    let query = `
      SELECT 
        r.id,
        r.fecha,
        r.numero_cliente,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        COALESCE(dc.contenido, '-') AS definicion,
        COALESCE(f.contenido, '-') AS finalizacion,
        COALESCE(r.comentario, '-') AS comentario
      FROM reclamos r
      JOIN sucursales s ON r.sucursal_id = s.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN tipos_consulta tc ON r.tipo_consulta_id = tc.id
      JOIN caracteristicas_consulta cc ON r.caracteristica_id = cc.id
      LEFT JOIN definiciones_consulta dc ON r.definicion_id = dc.id
      LEFT JOIN finalizaciones f ON r.finalizacion_id = f.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha) {
      query += ` AND DATE(r.fecha) = $${paramIndex++}`;
      values.push(fecha);
    }
    if (fecha_desde) {
      query += ` AND DATE(r.fecha) >= $${paramIndex++}`;
      values.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND DATE(r.fecha) <= $${paramIndex++}`;
      values.push(fecha_hasta);
    }
    if (asesor_id) {
      query += ` AND r.usuario_id = $${paramIndex++}`;
      values.push(asesor_id);
    }
    if (sucursal_id) {
      query += ` AND r.sucursal_id = $${paramIndex++}`;
      values.push(sucursal_id);
    }
    if (tipo_consulta_id) {
      query += ` AND r.tipo_consulta_id = $${paramIndex++}`;
      values.push(tipo_consulta_id);
    }
    if (numero_cliente) {
      query += ` AND r.numero_cliente ILIKE $${paramIndex++}`;
      values.push(`%${numero_cliente.trim()}%`);
    }

    query += ` ORDER BY r.fecha DESC, r.id DESC`;

    const result = await pool.query(query, values);
    const reclamos = result.rows;

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    const filename = `Reporte_Reclamos_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.rect(30, 25, 782, 50).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('REPORTE DE GESTIÓN Y REGISTRO DE RECLAMOS', 45, 38);
    doc.fontSize(9).font('Helvetica').text(`Generado por: ${req.user.nombre_completo} (${req.user.rol}) | Fecha: ${new Date().toLocaleString()}`, 45, 56);

    let filtrosTexto = [];
    if (fecha) filtrosTexto.push(`Fecha: ${fecha}`);
    if (fecha_desde) filtrosTexto.push(`Desde: ${fecha_desde}`);
    if (fecha_hasta) filtrosTexto.push(`Hasta: ${fecha_hasta}`);
    if (numero_cliente) filtrosTexto.push(`Abonado: ${numero_cliente}`);
    const filtrosResumen = filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Todos los registros (Sin filtros específicos)';

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(`Filtros aplicados: `, 30, 85, { continued: true });
    doc.font('Helvetica').text(`${filtrosResumen}  —  Total de reclamos: ${reclamos.length}`);

    const tableTop = 105;
    const rowHeight = 22;
    const colX = [30, 95, 175, 255, 325, 435, 555, 680];
    const colW = [65, 80, 80, 70, 110, 120, 125, 100];

    doc.rect(30, tableTop, 782, rowHeight).fill('#3B82F6');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');

    doc.text('FECHA', colX[0] + 4, tableTop + 6, { width: colW[0] });
    doc.text('SUCURSAL', colX[1] + 4, tableTop + 6, { width: colW[1] });
    doc.text('ASESOR', colX[2] + 4, tableTop + 6, { width: colW[2] });
    doc.text('CLIENTE', colX[3] + 4, tableTop + 6, { width: colW[3] });
    doc.text('TIPO CONSULTA', colX[4] + 4, tableTop + 6, { width: colW[4] });
    doc.text('CARACTERÍSTICA', colX[5] + 4, tableTop + 6, { width: colW[5] });
    doc.text('DEFINICIÓN', colX[6] + 4, tableTop + 6, { width: colW[6] });
    doc.text('FINALIZACIÓN', colX[7] + 4, tableTop + 6, { width: colW[7] });

    let currentY = tableTop + rowHeight;
    let zebra = false;

    if (reclamos.length === 0) {
      doc.rect(30, currentY, 782, rowHeight).fill('#F8FAFC');
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Oblique').text('No se encontraron registros con los filtros seleccionados.', 30, currentY + 6, {
        align: 'center',
        width: 782
      });
    } else {
      reclamos.forEach((r, idx) => {

        if (currentY + rowHeight > 540) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          currentY = 40;

          doc.rect(30, currentY, 782, rowHeight).fill('#3B82F6');
          doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
          doc.text('FECHA', colX[0] + 4, currentY + 6, { width: colW[0] });
          doc.text('SUCURSAL', colX[1] + 4, currentY + 6, { width: colW[1] });
          doc.text('ASESOR', colX[2] + 4, currentY + 6, { width: colW[2] });
          doc.text('CLIENTE', colX[3] + 4, currentY + 6, { width: colW[3] });
          doc.text('TIPO CONSULTA', colX[4] + 4, currentY + 6, { width: colW[4] });
          doc.text('CARACTERÍSTICA', colX[5] + 4, currentY + 6, { width: colW[5] });
          doc.text('DEFINICIÓN', colX[6] + 4, currentY + 6, { width: colW[6] });
          doc.text('FINALIZACIÓN', colX[7] + 4, currentY + 6, { width: colW[7] });
          currentY += rowHeight;
        }

        const bg = zebra ? '#F1F5F9' : '#FFFFFF';
        doc.rect(30, currentY, 782, rowHeight).fill(bg);
        doc.rect(30, currentY, 782, rowHeight).stroke('#CBD5E1');

        doc.fillColor('#1E293B').fontSize(8).font('Helvetica');

        const fechaStr = new Date(r.fecha).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        doc.text(fechaStr, colX[0] + 4, currentY + 6, { width: colW[0] });
        doc.text(r.sucursal, colX[1] + 4, currentY + 6, { width: colW[1], lineBreak: false });
        doc.text(r.asesor, colX[2] + 4, currentY + 6, { width: colW[2], lineBreak: false });
        doc.text(r.numero_cliente, colX[3] + 4, currentY + 6, { width: colW[3] });
        doc.text(r.tipo_consulta, colX[4] + 4, currentY + 6, { width: colW[4], lineBreak: false });
        doc.text(r.caracteristica, colX[5] + 4, currentY + 6, { width: colW[5], lineBreak: false });
        doc.text(r.definicion, colX[6] + 4, currentY + 6, { width: colW[6], lineBreak: false });
        doc.text(r.finalizacion, colX[7] + 4, currentY + 6, { width: colW[7], lineBreak: false });

        currentY += rowHeight;
        zebra = !zebra;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte en PDF.' });
  }
};

const emitirReporteTareasPDF = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      asesor_id,
      sucursal_id
    } = req.query;

    let query = `
      SELECT 
        t.id,
        t.created_at,
        TO_CHAR(t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') AS fecha_fmt,
        TO_CHAR(t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') AS hora_fmt,
        t.usuario_id,
        u.nombre_completo AS asesor_nombre,
        u.usuario AS asesor_usuario,
        u.rol AS asesor_rol,
        t.sucursal_1_id,
        s1.nombre AS sucursal_1_nombre,
        t.sucursal_2_id,
        s2.nombre AS sucursal_2_nombre,
        COALESCE(t.tarea, '-') AS tarea,
        t.completada,
        (t.activo = true AND t.created_at >= NOW() - INTERVAL '14 hours') AS vigente,
        cp.nombre_completo AS creado_por_nombre
      FROM tareas_asignadas t
      JOIN usuarios u ON t.usuario_id = u.id
      JOIN sucursales s1 ON t.sucursal_1_id = s1.id
      LEFT JOIN sucursales s2 ON t.sucursal_2_id = s2.id
      JOIN usuarios cp ON t.creado_por_id = cp.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha_desde) {
      query += ` AND (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $${paramIndex++}::date`;
      values.push(fecha_desde);
    }
    if (fecha_hasta) {
      query += ` AND (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $${paramIndex++}::date`;
      values.push(fecha_hasta);
    }
    if (asesor_id) {
      query += ` AND t.usuario_id = $${paramIndex++}`;
      values.push(parseInt(asesor_id, 10));
    }
    if (sucursal_id) {
      const sucId = parseInt(sucursal_id, 10);
      query += ` AND (t.sucursal_1_id = $${paramIndex} OR t.sucursal_2_id = $${paramIndex})`;
      paramIndex++;
      values.push(sucId);
    }

    query += ` ORDER BY t.created_at DESC, t.id DESC`;

    const result = await pool.query(query, values);
    const tareas = result.rows;

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    const filename = `Reporte_Tareas_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.rect(30, 25, 782, 50).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('REPORTE DE HISTORIAL DE TAREAS ASIGNADAS', 45, 38);
    doc.fontSize(9).font('Helvetica').text(`Generado por: ${req.user.nombre_completo} (${req.user.rol}) | Fecha: ${new Date().toLocaleString()}`, 45, 56);

    let filtrosTexto = [];
    if (fecha_desde) filtrosTexto.push(`Desde: ${fecha_desde}`);
    if (fecha_hasta) filtrosTexto.push(`Hasta: ${fecha_hasta}`);
    if (asesor_id && tareas.length > 0) filtrosTexto.push(`Asesor: ${tareas[0].asesor_nombre}`);
    const filtrosResumen = filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Todos los registros (Sin filtros específicos)';

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(`Filtros aplicados: `, 30, 85, { continued: true });
    doc.font('Helvetica').text(`${filtrosResumen}  —  Total de tareas: ${tareas.length}`);

    const tableTop = 105;
    const rowHeight = 22;
    const colX = [30, 110, 235, 320, 405, 550, 615, 680];
    const colW = [76, 120, 80, 80, 140, 60, 60, 100];

    doc.rect(30, tableTop, 782, rowHeight).fill('#3B82F6');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');

    doc.text('FECHA Y HORA', colX[0] + 4, tableTop + 6, { width: colW[0] });
    doc.text('ASESOR', colX[1] + 4, tableTop + 6, { width: colW[1] });
    doc.text('SUCURSAL 1', colX[2] + 4, tableTop + 6, { width: colW[2] });
    doc.text('SUCURSAL 2', colX[3] + 4, tableTop + 6, { width: colW[3] });
    doc.text('TAREA DIARIA', colX[4] + 4, tableTop + 6, { width: colW[4] });
    doc.text('ESTADO', colX[5] + 4, tableTop + 6, { width: colW[5] });
    doc.text('VIGENCIA', colX[6] + 4, tableTop + 6, { width: colW[6] });
    doc.text('ASIGNÓ', colX[7] + 4, tableTop + 6, { width: colW[7] });

    let currentY = tableTop + rowHeight;
    let zebra = false;

    if (tareas.length === 0) {
      doc.rect(30, currentY, 782, rowHeight).fill('#F8FAFC');
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Oblique').text('No se encontraron registros de tareas con los filtros seleccionados.', 30, currentY + 6, {
        align: 'center',
        width: 782
      });
    } else {
      tareas.forEach((t) => {
        if (currentY + rowHeight > 540) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          currentY = 40;

          doc.rect(30, currentY, 782, rowHeight).fill('#3B82F6');
          doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
          doc.text('FECHA Y HORA', colX[0] + 4, currentY + 6, { width: colW[0] });
          doc.text('ASESOR', colX[1] + 4, currentY + 6, { width: colW[1] });
          doc.text('SUCURSAL 1', colX[2] + 4, currentY + 6, { width: colW[2] });
          doc.text('SUCURSAL 2', colX[3] + 4, currentY + 6, { width: colW[3] });
          doc.text('TAREA DIARIA', colX[4] + 4, currentY + 6, { width: colW[4] });
          doc.text('ESTADO', colX[5] + 4, currentY + 6, { width: colW[5] });
          doc.text('VIGENCIA', colX[6] + 4, currentY + 6, { width: colW[6] });
          doc.text('ASIGNÓ', colX[7] + 4, currentY + 6, { width: colW[7] });
          currentY += rowHeight;
        }

        const bg = zebra ? '#F1F5F9' : '#FFFFFF';
        doc.rect(30, currentY, 782, rowHeight).fill(bg);
        doc.rect(30, currentY, 782, rowHeight).stroke('#CBD5E1');

        doc.fillColor('#1E293B').fontSize(8).font('Helvetica');

        const fechaHoraStr = `${t.fecha_fmt} ${t.hora_fmt}`;
        const estadoStr = t.tarea !== '-' ? (t.completada ? 'Marcada' : 'Pendiente') : '-';
        const vigenciaStr = t.vigente ? 'Activa' : 'Finalizada';

        doc.text(fechaHoraStr, colX[0] + 4, currentY + 6, { width: colW[0] });
        doc.text(t.asesor_nombre, colX[1] + 4, currentY + 6, { width: colW[1], lineBreak: false });
        doc.text(t.sucursal_1_nombre, colX[2] + 4, currentY + 6, { width: colW[2], lineBreak: false });
        doc.text(t.sucursal_2_nombre || '-', colX[3] + 4, currentY + 6, { width: colW[3], lineBreak: false });
        doc.text(t.tarea, colX[4] + 4, currentY + 6, { width: colW[4], lineBreak: false });
        doc.text(estadoStr, colX[5] + 4, currentY + 6, { width: colW[5], lineBreak: false });
        doc.text(vigenciaStr, colX[6] + 4, currentY + 6, { width: colW[6], lineBreak: false });
        doc.text(t.creado_por_nombre, colX[7] + 4, currentY + 6, { width: colW[7], lineBreak: false });

        currentY += rowHeight;
        zebra = !zebra;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar reporte de tareas en PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte de tareas en PDF.' });
  }
};

const emitirReporteMasivosPDF = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, sucursal_id } = req.query;

    let query = `
      SELECT 
        m.id,
        m.fecha_inicio,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        m.sucursal_id,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        COALESCE(m.zona_afectada, '-') AS zona_afectada,
        m.servicio_afectado,
        COALESCE(m.caracteristicas_dano, '-') AS caracteristicas_dano,
        COALESCE(m.tiempo_resolucion, '-') AS tiempo_resolucion,
        m.estado,
        m.fecha_fin,
        TO_CHAR(m.fecha_fin AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fin_fmt,
        COALESCE(m.responsable_solucion, '-') AS responsable_solucion,
        COALESCE(m.arreglo, '-') AS arreglo,
        u.nombre_completo AS creado_por_nombre,
        uf.nombre_completo AS finalizado_por_nombre
      FROM inconvenientes_masivos m
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      LEFT JOIN usuarios u ON m.creado_por_id = u.id
      LEFT JOIN usuarios uf ON m.finalizado_por_id = uf.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha_desde) {
      query += ` AND (m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $${paramIndex++}::date`;
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND (COALESCE(m.fecha_fin, m.fecha_inicio) AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $${paramIndex++}::date`;
      values.push(fecha_hasta);
    }

    if (sucursal_id) {
      if (sucursal_id === 'todas') {
        query += ` AND m.sucursal_id IS NULL`;
      } else {
        query += ` AND m.sucursal_id = $${paramIndex++}`;
        values.push(parseInt(sucursal_id, 10));
      }
    }

    query += ` ORDER BY m.fecha_inicio DESC, m.id DESC`;

    const result = await pool.query(query, values);
    const masivos = result.rows;

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    const filename = `Reporte_Masivos_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.rect(30, 25, 782, 50).fill('#B91C1C');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('REPORTE DE INCONVENIENTES MASIVOS', 45, 38);
    doc.fontSize(9).font('Helvetica').text(`Generado por: ${req.user.nombre_completo} (${req.user.rol}) | Fecha: ${new Date().toLocaleString()}`, 45, 56);

    let filtrosTexto = [];
    if (fecha_desde) filtrosTexto.push(`Fecha Inicio Desde: ${fecha_desde}`);
    if (fecha_hasta) filtrosTexto.push(`Fecha Fin Hasta: ${fecha_hasta}`);
    if (sucursal_id) {
      if (sucursal_id === 'todas') {
        filtrosTexto.push('Sucursal: Todas las sucursales');
      } else {
        const sucRow = await pool.query('SELECT nombre FROM sucursales WHERE id = $1', [sucursal_id]);
        filtrosTexto.push(`Sucursal: ${sucRow.rows[0]?.nombre || sucursal_id}`);
      }
    }

    doc.rect(30, 85, 782, 35).fill('#F8FAFC');
    doc.rect(30, 85, 782, 35).stroke('#E2E8F0');
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('Filtros aplicados:', 40, 93);
    doc.font('Helvetica').text(filtrosTexto.length > 0 ? filtrosTexto.join('   |   ') : 'Sin filtros (Todos los registros históricos)', 125, 93);
    doc.font('Helvetica-Bold').text(`Total de inconvenientes masivos: ${masivos.length}`, 40, 107);

    const headers = [
      'Inicio',
      'Sucursal',
      'Servicio',
      'Daño / Causa',
      'Zona',
      'Tiempo',
      'Estado',
      'Creado por',
      'Finalizado',
      'Fin. por',
      'Responsable',
      'Arreglo'
    ];
    const colW = [58, 58, 62, 90, 62, 42, 44, 65, 58, 65, 55, 123];
    const colX = [30];
    for (let i = 0; i < colW.length - 1; i++) {
      colX.push(colX[i] + colW[i]);
    }

    let startY = 130;
    const rowHeight = 24;

    const drawTableHeader = (y) => {
      doc.rect(30, y, 782, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + 4, y + 6, { width: colW[i] - 8, lineBreak: false });
      });
    };

    drawTableHeader(startY);
    let currentY = startY + 22;
    let zebra = false;

    if (masivos.length === 0) {
      doc.rect(30, currentY, 782, 30).fill('#FFFFFF');
      doc.rect(30, currentY, 782, 30).stroke('#CBD5E1');
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Oblique').text('No se encontraron registros con los criterios seleccionados.', 30, currentY + 10, { align: 'center', width: 782 });
    } else {
      masivos.forEach((m) => {
        if (currentY + rowHeight > 550) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          currentY = 30;
          drawTableHeader(currentY);
          currentY += 22;
          zebra = false;
        }

        doc.rect(30, currentY, 782, rowHeight).fill(zebra ? '#F8FAFC' : '#FFFFFF');
        doc.rect(30, currentY, 782, rowHeight).stroke('#E2E8F0');

        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica');

        const estadoColor = m.estado === 'Activo' ? '#DC2626' : '#16A34A';

        doc.text(m.fecha_inicio_fmt, colX[0] + 4, currentY + 6, { width: colW[0] - 8, lineBreak: false });
        doc.text(m.sucursal_nombre, colX[1] + 4, currentY + 6, { width: colW[1] - 8, lineBreak: false });
        doc.text(m.servicio_afectado, colX[2] + 4, currentY + 6, { width: colW[2] - 8, lineBreak: false });
        doc.text(m.caracteristicas_dano, colX[3] + 4, currentY + 6, { width: colW[3] - 8, lineBreak: false });
        doc.text(m.zona_afectada, colX[4] + 4, currentY + 6, { width: colW[4] - 8, lineBreak: false });
        doc.text(m.tiempo_resolucion, colX[5] + 4, currentY + 6, { width: colW[5] - 8, lineBreak: false });

        doc.fillColor(estadoColor).font('Helvetica-Bold');
        doc.text(m.estado, colX[6] + 4, currentY + 6, { width: colW[6] - 8, lineBreak: false });

        doc.fillColor('#0F172A').font('Helvetica');
        doc.text(m.creado_por_nombre || '-', colX[7] + 4, currentY + 6, { width: colW[7] - 8, lineBreak: false });
        doc.text(m.fecha_fin_fmt || '-', colX[8] + 4, currentY + 6, { width: colW[8] - 8, lineBreak: false });
        doc.text(m.finalizado_por_nombre || '-', colX[9] + 4, currentY + 6, { width: colW[9] - 8, lineBreak: false });
        doc.text(m.responsable_solucion, colX[10] + 4, currentY + 6, { width: colW[10] - 8, lineBreak: false });
        doc.text(m.arreglo, colX[11] + 4, currentY + 6, { width: colW[11] - 8, lineBreak: false });

        currentY += rowHeight;
        zebra = !zebra;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar reporte de masivos en PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte de masivos en PDF.' });
  }
};

const emitirReporteAuditoriasPDF = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      auditor_id,
      asesor_id,
      canal_id,
      resultado
    } = req.query;

    let query = `
      SELECT 
        ac.id,
        ac.fecha,
        TO_CHAR(ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fmt,
        ac.asesor_id,
        u_ase.nombre_completo AS asesor_nombre,
        ac.auditor_id,
        u_aud.nombre_completo AS auditor_nombre,
        ac.canal_id,
        ca.nombre AS canal_nombre,
        ac.referencia,
        ac.puntaje_maximo::float AS puntaje_maximo,
        ac.puntaje_obtenido::float AS puntaje_obtenido,
        ac.porcentaje_calidad::float AS porcentaje_calidad,
        ac.resultado,
        ac.error_critico,
        ac.comentario_error_critico,
        ac.observaciones_generales,
        ac.created_at
      FROM auditorias_calidad ac
      JOIN usuarios u_ase ON ac.asesor_id = u_ase.id
      JOIN usuarios u_aud ON ac.auditor_id = u_aud.id
      JOIN canales_atencion ca ON ac.canal_id = ca.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha_desde) {
      query += ` AND (ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $${paramIndex++}::date`;
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND (ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $${paramIndex++}::date`;
      values.push(fecha_hasta);
    }

    if (auditor_id) {
      query += ` AND ac.auditor_id = $${paramIndex++}`;
      values.push(parseInt(auditor_id, 10));
    }

    if (asesor_id) {
      query += ` AND ac.asesor_id = $${paramIndex++}`;
      values.push(parseInt(asesor_id, 10));
    }

    if (canal_id) {
      query += ` AND ac.canal_id = $${paramIndex++}`;
      values.push(parseInt(canal_id, 10));
    }

    if (resultado) {
      query += ` AND ac.resultado = $${paramIndex++}`;
      values.push(resultado);
    }

    query += ` ORDER BY ac.fecha DESC, ac.id DESC`;

    const result = await pool.query(query, values);
    const auditorias = result.rows;

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    const filename = `Reporte_Auditorias_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.rect(30, 25, 782, 50).fill('#1E3A8A');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('REPORTE GENERAL DE AUDITORÍAS DE CALIDAD', 45, 38);
    doc.fontSize(9).font('Helvetica').text(`Generado por: ${req.user.nombre_completo} (${req.user.rol}) | Fecha: ${new Date().toLocaleString()}`, 45, 56);

    let filtrosTexto = [];
    if (fecha_desde) filtrosTexto.push(`Desde: ${fecha_desde}`);
    if (fecha_hasta) filtrosTexto.push(`Hasta: ${fecha_hasta}`);
    if (asesor_id) {
      const uRes = await pool.query('SELECT nombre_completo FROM usuarios WHERE id = $1', [asesor_id]);
      if (uRes.rows[0]) filtrosTexto.push(`Asesor: ${uRes.rows[0].nombre_completo}`);
    }
    if (auditor_id) {
      const uRes = await pool.query('SELECT nombre_completo FROM usuarios WHERE id = $1', [auditor_id]);
      if (uRes.rows[0]) filtrosTexto.push(`Auditor: ${uRes.rows[0].nombre_completo}`);
    }
    if (canal_id) {
      const cRes = await pool.query('SELECT nombre FROM canales_atencion WHERE id = $1', [canal_id]);
      if (cRes.rows[0]) filtrosTexto.push(`Canal: ${cRes.rows[0].nombre}`);
    }
    if (resultado) {
      filtrosTexto.push(`Nivel: ${resultado}`);
    }

    doc.rect(30, 85, 782, 35).fill('#F8FAFC');
    doc.rect(30, 85, 782, 35).stroke('#E2E8F0');
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('Filtros aplicados:', 40, 93);
    doc.font('Helvetica').text(filtrosTexto.length > 0 ? filtrosTexto.join('   |   ') : 'Todos los registros', 125, 93);

    let totalCalidad = 0;
    auditorias.forEach(a => { totalCalidad += parseFloat(a.porcentaje_calidad) || 0; });
    const promedioCalidad = auditorias.length > 0 ? Math.round(totalCalidad / auditorias.length) : 0;

    doc.font('Helvetica-Bold').text(`Total auditorías: ${auditorias.length}   |   Promedio general de calidad: ${promedioCalidad}%`, 40, 107);

    const headers = [
      'Fecha',
      'Asesor',
      'Auditor',
      'Canal',
      'ID / Ref',
      'Máx',
      'Obt',
      '% Calidad',
      'Resultado',
      'Error Crítico'
    ];
    const colW = [75, 125, 125, 85, 75, 45, 45, 55, 75, 77];
    const colX = [30];
    for (let i = 0; i < colW.length - 1; i++) {
      colX.push(colX[i] + colW[i]);
    }

    let startY = 130;
    const rowHeight = 22;

    const drawTableHeader = (y) => {
      doc.rect(30, y, 782, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + 4, y + 6, { width: colW[i] - 8, lineBreak: false });
      });
    };

    drawTableHeader(startY);
    let currentY = startY + 22;
    let zebra = false;

    if (auditorias.length === 0) {
      doc.rect(30, currentY, 782, 30).fill('#FFFFFF');
      doc.rect(30, currentY, 782, 30).stroke('#CBD5E1');
      doc.fillColor('#64748B').fontSize(10).font('Helvetica-Oblique').text('No se encontraron auditorías con los filtros seleccionados.', 30, currentY + 10, { align: 'center', width: 782 });
    } else {
      auditorias.forEach((a) => {
        if (currentY + rowHeight > 550) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          currentY = 30;
          drawTableHeader(currentY);
          currentY += 22;
          zebra = false;
        }

        doc.rect(30, currentY, 782, rowHeight).fill(zebra ? '#F8FAFC' : '#FFFFFF');
        doc.rect(30, currentY, 782, rowHeight).stroke('#E2E8F0');
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica');

        doc.text(a.fecha_fmt, colX[0] + 4, currentY + 6, { width: colW[0] - 8, lineBreak: false });
        doc.text(a.asesor_nombre, colX[1] + 4, currentY + 6, { width: colW[1] - 8, lineBreak: false });
        doc.text(a.auditor_nombre, colX[2] + 4, currentY + 6, { width: colW[2] - 8, lineBreak: false });
        doc.text(a.canal_nombre, colX[3] + 4, currentY + 6, { width: colW[3] - 8, lineBreak: false });
        doc.text(a.referencia, colX[4] + 4, currentY + 6, { width: colW[4] - 8, lineBreak: false });
        doc.text(String(a.puntaje_maximo), colX[5] + 4, currentY + 6, { width: colW[5] - 8, lineBreak: false });
        doc.text(String(a.puntaje_obtenido), colX[6] + 4, currentY + 6, { width: colW[6] - 8, lineBreak: false });
        doc.text(`${a.porcentaje_calidad}%`, colX[7] + 4, currentY + 6, { width: colW[7] - 8, lineBreak: false });

        let resColor = '#16A34A';
        if (a.resultado === 'CRÍTICO') resColor = '#DC2626';
        else if (a.resultado === 'A MEJORAR') resColor = '#EA580C';
        else if (a.resultado === 'BUENO') resColor = '#D97706';
        else if (a.resultado === 'MUY BUENO') resColor = '#2563EB';

        doc.fillColor(resColor).font('Helvetica-Bold');
        doc.text(a.resultado, colX[8] + 4, currentY + 6, { width: colW[8] - 8, lineBreak: false });

        if (a.error_critico) {
          doc.fillColor('#DC2626').font('Helvetica-Bold').text('SÍ', colX[9] + 4, currentY + 6, { width: colW[9] - 8, lineBreak: false });
        } else {
          doc.fillColor('#64748B').font('Helvetica').text('No', colX[9] + 4, currentY + 6, { width: colW[9] - 8, lineBreak: false });
        }

        currentY += rowHeight;
        zebra = !zebra;
      });
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar reporte de auditorías en PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte de auditorías en PDF.' });
  }
};

const emitirReporteAuditoriaIndividualPDF = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Debe especificar el ID de la auditoría.' });
    }

    const queryHeader = `
      SELECT 
        ac.id,
        ac.fecha,
        TO_CHAR(ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fmt,
        ac.asesor_id,
        u_ase.nombre_completo AS asesor_nombre,
        ac.auditor_id,
        u_aud.nombre_completo AS auditor_nombre,
        ac.canal_id,
        ca.nombre AS canal_nombre,
        ac.referencia,
        ac.puntaje_maximo::float AS puntaje_maximo,
        ac.puntaje_obtenido::float AS puntaje_obtenido,
        ac.porcentaje_calidad::float AS porcentaje_calidad,
        ac.resultado,
        ac.error_critico,
        ac.comentario_error_critico,
        ac.observaciones_generales,
        ac.created_at
      FROM auditorias_calidad ac
      JOIN usuarios u_ase ON ac.asesor_id = u_ase.id
      JOIN usuarios u_aud ON ac.auditor_id = u_aud.id
      JOIN canales_atencion ca ON ac.canal_id = ca.id
      WHERE ac.id = $1
    `;

    const headerRes = await pool.query(queryHeader, [id]);
    if (headerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada.' });
    }

    const auditoria = headerRes.rows[0];

    const detallesQuery = `
      SELECT 
        d.id,
        d.criterio_id,
        d.subcriterio_id,
        d.criterio_nombre,
        d.subcriterio_nombre,
        d.puntaje_maximo::float AS puntaje_maximo,
        d.evaluacion,
        d.puntaje_obtenido::float AS puntaje_obtenido,
        d.observacion
      FROM auditorias_calidad_detalle d
      WHERE d.auditoria_id = $1
      ORDER BY d.criterio_id ASC, d.id ASC;
    `;

    const detallesRes = await pool.query(detallesQuery, [id]);
    const detalles = detallesRes.rows;

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 30
    });

    const filename = `Auditoria_${auditoria.id}_${auditoria.asesor_nombre.replace(/\s+/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.rect(30, 25, 535, 45).fill('#1E3A8A');
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('INFORME DE AUDITORÍA DE CALIDAD', 45, 36);
    doc.fontSize(8.5).font('Helvetica').text(`Auditoría N°: ${auditoria.id}   |   Fecha: ${auditoria.fecha_fmt}`, 45, 53);

    doc.rect(30, 78, 535, 60).fill('#F8FAFC');
    doc.rect(30, 78, 535, 60).stroke('#CBD5E1');

    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold').text('DATOS DE LA EVALUACIÓN', 40, 85);
    
    doc.font('Helvetica-Bold').text('Asesor Evaluado:', 40, 100);
    doc.font('Helvetica').text(auditoria.asesor_nombre, 130, 100);

    doc.font('Helvetica-Bold').text('Auditor / Evaluador:', 40, 116);
    doc.font('Helvetica').text(auditoria.auditor_nombre, 130, 116);

    doc.font('Helvetica-Bold').text('Canal de Atención:', 310, 100);
    doc.font('Helvetica').text(auditoria.canal_nombre, 405, 100);

    doc.font('Helvetica-Bold').text('ID / Referencia:', 310, 116);
    doc.font('Helvetica').text(auditoria.referencia, 405, 116);

    let resColor = '#16A34A';
    if (auditoria.resultado === 'CRÍTICO') resColor = '#DC2626';
    else if (auditoria.resultado === 'A MEJORAR') resColor = '#EA580C';
    else if (auditoria.resultado === 'BUENO') resColor = '#D97706';
    else if (auditoria.resultado === 'MUY BUENO') resColor = '#2563EB';

    doc.rect(30, 146, 535, 42).fill('#F1F5F9');
    doc.rect(30, 146, 535, 42).stroke('#CBD5E1');

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold');
    doc.text(`Puntaje: ${auditoria.puntaje_obtenido} / ${auditoria.puntaje_maximo}`, 45, 161);
    doc.text(`Calidad: ${auditoria.porcentaje_calidad}%`, 210, 161);

    doc.fillColor(resColor).fontSize(10).font('Helvetica-Bold');
    doc.text(`Resultado: ${auditoria.resultado}`, 340, 161);

    let currentY = 196;

    if (auditoria.error_critico) {
      doc.rect(30, currentY, 535, 28).fill('#FEE2E2');
      doc.rect(30, currentY, 535, 28).stroke('#EF4444');
      doc.fillColor('#B91C1C').fontSize(8.5).font('Helvetica-Bold');
      doc.text(`¡ERROR CRÍTICO DETECTADO!`, 40, currentY + 6);
      doc.font('Helvetica').text(`Motivo: ${auditoria.comentario_error_critico || 'Sin detalle'}`, 40, currentY + 16, { width: 515, lineBreak: false });
      currentY += 36;
    }

    const tableHeaders = ['Criterio / Indicador', 'Máx', 'Evaluación', 'Obt', 'Observación'];
    const colW = [205, 35, 65, 35, 195];
    const colX = [30];
    for (let i = 0; i < colW.length - 1; i++) {
      colX.push(colX[i] + colW[i]);
    }

    const drawGridHeader = (y) => {
      doc.rect(30, y, 535, 18).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      tableHeaders.forEach((h, i) => {
        doc.text(h, colX[i] + 4, y + 5, { width: colW[i] - 8, lineBreak: false });
      });
    };

    drawGridHeader(currentY);
    currentY += 18;

    let currentCategoria = '';

    detalles.forEach((d) => {
      if (d.criterio_nombre !== currentCategoria) {
        currentCategoria = d.criterio_nombre;
        if (currentY + 36 > 760) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 30 });
          currentY = 30;
          drawGridHeader(currentY);
          currentY += 18;
        }

        doc.rect(30, currentY, 535, 16).fill('#E2E8F0');
        doc.rect(30, currentY, 535, 16).stroke('#CBD5E1');
        doc.fillColor('#1E293B').fontSize(8).font('Helvetica-Bold');
        doc.text(currentCategoria.toUpperCase(), 36, currentY + 4, { width: 520, lineBreak: false });
        currentY += 16;
      }

      if (currentY + 18 > 760) {
        doc.addPage({ size: 'A4', layout: 'portrait', margin: 30 });
        currentY = 30;
        drawGridHeader(currentY);
        currentY += 18;
      }

      doc.rect(30, currentY, 535, 18).fill('#FFFFFF');
      doc.rect(30, currentY, 535, 18).stroke('#F1F5F9');

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
      doc.text(d.subcriterio_nombre, colX[0] + 4, currentY + 5, { width: colW[0] - 8, lineBreak: false });
      doc.text(String(d.puntaje_maximo), colX[1] + 4, currentY + 5, { width: colW[1] - 8, lineBreak: false });

      let evalColor = '#16A34A';
      if (d.evaluacion === 'No cumple') evalColor = '#DC2626';
      else if (d.evaluacion === 'No aplica') evalColor = '#64748B';

      doc.fillColor(evalColor).font('Helvetica-Bold');
      doc.text(d.evaluacion, colX[2] + 4, currentY + 5, { width: colW[2] - 8, lineBreak: false });

      doc.fillColor('#0F172A').font('Helvetica');
      doc.text(String(d.puntaje_obtenido), colX[3] + 4, currentY + 5, { width: colW[3] - 8, lineBreak: false });

      doc.fillColor('#475569');
      doc.text(d.observacion || '-', colX[4] + 4, currentY + 5, { width: colW[4] - 8, lineBreak: false });

      currentY += 18;
    });

    if (currentY + 130 > 760) {
      doc.addPage({ size: 'A4', layout: 'portrait', margin: 30 });
      currentY = 30;
    } else {
      currentY += 10;
    }

    doc.rect(30, currentY, 535, 18).fill('#0F172A');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text('RESUMEN POR CATEGORÍAS', 40, currentY + 5);
    currentY += 18;

    const catHeaders = ['Categoría', 'Puntaje Máx.', 'Puntaje Obt.', '% Cumplimiento'];
    const catW = [240, 95, 100, 100];
    const catX = [30, 270, 365, 465];

    doc.rect(30, currentY, 535, 16).fill('#F1F5F9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    catHeaders.forEach((h, i) => {
      doc.text(h, catX[i] + 4, currentY + 4, { width: catW[i] - 8, lineBreak: false });
    });
    currentY += 16;

    const catStats = {};
    detalles.forEach(d => {
      if (!catStats[d.criterio_nombre]) {
        catStats[d.criterio_nombre] = { max: 0, obt: 0 };
      }
      if (d.evaluacion !== 'No aplica') {
        catStats[d.criterio_nombre].max += d.puntaje_maximo;
        catStats[d.criterio_nombre].obt += d.puntaje_obtenido;
      }
    });

    Object.keys(catStats).forEach(cName => {
      const row = catStats[cName];
      const pct = row.max > 0 ? Math.round((row.obt / row.max) * 100) : 0;

      doc.rect(30, currentY, 535, 16).fill('#FFFFFF');
      doc.rect(30, currentY, 535, 16).stroke('#F1F5F9');
      doc.fillColor('#1E293B').fontSize(7.5).font('Helvetica');
      doc.text(cName, catX[0] + 4, currentY + 4, { width: catW[0] - 8, lineBreak: false });
      doc.text(String(row.max), catX[1] + 4, currentY + 4, { width: catW[1] - 8, lineBreak: false });
      doc.text(String(row.obt), catX[2] + 4, currentY + 4, { width: catW[2] - 8, lineBreak: false });
      doc.font('Helvetica-Bold').text(`${pct}%`, catX[3] + 4, currentY + 4, { width: catW[3] - 8, lineBreak: false });
      currentY += 16;
    });

    if (currentY + 110 > 760) {
      doc.addPage({ size: 'A4', layout: 'portrait', margin: 30 });
      currentY = 30;
    } else {
      currentY += 12;
    }

    doc.rect(30, currentY, 535, 18).fill('#0F172A');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text('OBSERVACIONES GENERALES Y FEEDBACK / DEVOLUCIÓN', 40, currentY + 5);
    currentY += 18;

    doc.rect(30, currentY, 535, 45).fill('#F8FAFC');
    doc.rect(30, currentY, 535, 45).stroke('#CBD5E1');
    doc.fillColor('#334155').fontSize(8).font('Helvetica');
    doc.text(auditoria.observaciones_generales || 'Sin observaciones generales registradas.', 38, currentY + 6, {
      width: 518,
      height: 35,
      ellipsis: true
    });
    currentY += 55;

    if (currentY + 50 > 760) {
      doc.addPage({ size: 'A4', layout: 'portrait', margin: 30 });
      currentY = 60;
    }

    doc.strokeColor('#94A3B8');
    doc.moveTo(60, currentY + 25).lineTo(230, currentY + 25).stroke();
    doc.moveTo(330, currentY + 25).lineTo(500, currentY + 25).stroke();

    doc.fillColor('#64748B').fontSize(8).font('Helvetica');
    doc.text('Firma y Aclaración del Asesor', 60, currentY + 30, { width: 170, align: 'center' });
    doc.text('Firma y Aclaración del Evaluador', 330, currentY + 30, { width: 170, align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error al generar reporte individual de auditoría en PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte individual de auditoría en PDF.' });
  }
};

module.exports = {
  emitirReportePDF,
  emitirReporteTareasPDF,
  emitirReporteMasivosPDF,
  emitirReporteAuditoriasPDF,
  emitirReporteAuditoriaIndividualPDF
};
