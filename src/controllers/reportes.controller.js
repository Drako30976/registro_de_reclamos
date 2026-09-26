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

module.exports = {
  emitirReportePDF,
  emitirReporteTareasPDF
};
