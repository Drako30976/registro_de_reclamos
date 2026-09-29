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

module.exports = {
  emitirReportePDF,
  emitirReporteTareasPDF,
  emitirReporteMasivosPDF
};
