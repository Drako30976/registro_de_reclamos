const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

const crearReclamo = async (req, res) => {
  try {
    const {
      sucursal_id,
      numero_cliente,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id
    } = req.body;

    const asesor_id = req.user.id;

    if (!sucursal_id || !numero_cliente || !tipo_consulta_id || !caracteristica_id) {
      return res.status(400).json({
        error: 'Los campos Sucursal, Número de Cliente, Tipo de Consulta y Características son obligatorios.'
      });
    }

    if (numero_cliente.trim().length > 15) {
      return res.status(400).json({
        error: 'El número de cliente no puede superar los 15 caracteres.'
      });
    }

    const checkExistente = await pool.query(`
      SELECT 
        r.id,
        TO_CHAR(r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') as fecha_fmt,
        TO_CHAR(r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') as hora_fmt,
        u.nombre_completo as asesor,
        s.nombre as sucursal
      FROM reclamos r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN sucursales s ON r.sucursal_id = s.id
      WHERE LOWER(TRIM(r.numero_cliente)) = LOWER(TRIM($1))
        AND r.sucursal_id = $2
        AND (r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      LIMIT 1
    `, [numero_cliente, sucursal_id]);

    if (checkExistente.rows.length > 0) {
      const reg = checkExistente.rows[0];
      return res.status(400).json({
        error: `Ya existe un reclamo registrado para el abonado "${numero_cliente.trim()}" en la sucursal ${reg.sucursal} en el día de hoy (${reg.fecha_fmt} a las ${reg.hora_fmt} hs por ${reg.asesor}). Solo se permite un reclamo por abonado al día por sucursal.`
      });
    }

    const query = `
      INSERT INTO reclamos 
        (sucursal_id, usuario_id, numero_cliente, tipo_consulta_id, caracteristica_id, definicion_id, finalizacion_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      sucursal_id,
      asesor_id,
      numero_cliente.trim(),
      tipo_consulta_id,
      caracteristica_id,
      definicion_id || null,
      finalizacion_id || null
    ];

    const result = await pool.query(query, values);
    const nuevoId = result.rows[0].id;

    const fullQuery = `
      SELECT 
        r.id,
        r.fecha,
        r.numero_cliente,
        r.created_at,
        r.updated_at,
        s.id AS sucursal_id,
        s.nombre AS sucursal,
        u.id AS asesor_id,
        u.nombre_completo AS asesor,
        u.usuario AS asesor_usuario,
        tc.id AS tipo_consulta_id,
        tc.contenido AS tipo_consulta,
        cc.id AS caracteristica_id,
        cc.contenido AS caracteristica,
        dc.id AS definicion_id,
        dc.contenido AS definicion,
        f.id AS finalizacion_id,
        f.contenido AS finalizacion
      FROM reclamos r
      JOIN sucursales s ON r.sucursal_id = s.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN tipos_consulta tc ON r.tipo_consulta_id = tc.id
      JOIN caracteristicas_consulta cc ON r.caracteristica_id = cc.id
      LEFT JOIN definiciones_consulta dc ON r.definicion_id = dc.id
      LEFT JOIN finalizaciones f ON r.finalizacion_id = f.id
      WHERE r.id = $1
    `;
    const fullResult = await pool.query(fullQuery, [nuevoId]);
    const reclamoCompleto = fullResult.rows[0];

    await registrarAuditoria({
      accion: `Se cargó reclamo para el abonado ${numero_cliente.trim()}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'reclamos',
      registro_id: nuevoId,
      datos_nuevos: reclamoCompleto
    });

    res.status(201).json({
      message: 'Reclamo guardado exitosamente.',
      reclamo: reclamoCompleto
    });
  } catch (error) {
    console.error('Error al crear reclamo:', error);
    res.status(500).json({ error: 'Error al registrar el reclamo.' });
  }
};

const getReclamos = async (req, res) => {
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
        r.created_at,
        r.updated_at,
        s.id AS sucursal_id,
        s.nombre AS sucursal,
        u.id AS asesor_id,
        u.nombre_completo AS asesor,
        u.usuario AS asesor_usuario,
        tc.id AS tipo_consulta_id,
        tc.contenido AS tipo_consulta,
        cc.id AS caracteristica_id,
        cc.contenido AS caracteristica,
        dc.id AS definicion_id,
        dc.contenido AS definicion,
        f.id AS finalizacion_id,
        f.contenido AS finalizacion
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial de reclamos:', error);
    res.status(500).json({ error: 'Error al obtener reclamos.' });
  }
};

const getReclamoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        r.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM reclamos r
      JOIN sucursales s ON r.sucursal_id = s.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN tipos_consulta tc ON r.tipo_consulta_id = tc.id
      JOIN caracteristicas_consulta cc ON r.caracteristica_id = cc.id
      LEFT JOIN definiciones_consulta dc ON r.definicion_id = dc.id
      LEFT JOIN finalizaciones f ON r.finalizacion_id = f.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reclamo no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener reclamo:', error);
    res.status(500).json({ error: 'Error al consultar el reclamo.' });
  }
};

const actualizarReclamo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sucursal_id,
      numero_cliente,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id
    } = req.body;

    const originalQuery = `
      SELECT 
        r.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM reclamos r
      JOIN sucursales s ON r.sucursal_id = s.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN tipos_consulta tc ON r.tipo_consulta_id = tc.id
      JOIN caracteristicas_consulta cc ON r.caracteristica_id = cc.id
      LEFT JOIN definiciones_consulta dc ON r.definicion_id = dc.id
      LEFT JOIN finalizaciones f ON r.finalizacion_id = f.id
      WHERE r.id = $1
    `;
    const originalRes = await pool.query(originalQuery, [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reclamo no encontrado.' });
    }
    const clienteAValidar = numero_cliente ? numero_cliente.trim() : registroOriginal.numero_cliente;
    const sucursalAValidar = sucursal_id ? parseInt(sucursal_id, 10) : registroOriginal.sucursal_id;
    const checkExistente = await pool.query(`
      SELECT 
        r.id,
        TO_CHAR(r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') as fecha_fmt,
        TO_CHAR(r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') as hora_fmt,
        u.nombre_completo as asesor,
        s.nombre as sucursal
      FROM reclamos r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN sucursales s ON r.sucursal_id = s.id
      WHERE LOWER(TRIM(r.numero_cliente)) = LOWER(TRIM($1))
        AND r.sucursal_id = $2
        AND (r.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = (registroOriginal.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        AND r.id != $3
      LIMIT 1
    `, [clienteAValidar, sucursalAValidar, id]);

    if (checkExistente.rows.length > 0) {
      const reg = checkExistente.rows[0];
      return res.status(400).json({
        error: `Ya existe otro reclamo registrado para el abonado "${clienteAValidar}" en la sucursal ${reg.sucursal} en dicha fecha (${reg.fecha_fmt} a las ${reg.hora_fmt} hs por ${reg.asesor}).`
      });
    }

    const updateQuery = `
      UPDATE reclamos
      SET 
        sucursal_id = COALESCE($1, sucursal_id),
        numero_cliente = COALESCE($2, numero_cliente),
        tipo_consulta_id = COALESCE($3, tipo_consulta_id),
        caracteristica_id = COALESCE($4, caracteristica_id),
        definicion_id = $5,
        finalizacion_id = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const updateValues = [
      sucursal_id || null,
      numero_cliente ? numero_cliente.trim() : null,
      tipo_consulta_id || null,
      caracteristica_id || null,
      definicion_id !== undefined ? definicion_id : registroOriginal.definicion_id,
      finalizacion_id !== undefined ? finalizacion_id : registroOriginal.finalizacion_id,
      id
    ];

    const result = await pool.query(updateQuery, updateValues);

    const resumenOriginal = `Fecha: ${new Date(registroOriginal.fecha).toLocaleString()} | Sucursal: ${registroOriginal.sucursal} | Asesor: ${registroOriginal.asesor} | Abonado: ${registroOriginal.numero_cliente} | Tipo: ${registroOriginal.tipo_consulta} | Característica: ${registroOriginal.caracteristica} | Definición: ${registroOriginal.definicion || 'N/A'} | Finalización: ${registroOriginal.finalizacion || 'N/A'}`;

    await registrarAuditoria({
      accion: `Se modificó registro del abonado ${registroOriginal.numero_cliente}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'reclamos',
      registro_id: id,
      datos_anteriores: {
        resumen: resumenOriginal,
        detalle: registroOriginal
      },
      datos_nuevos: result.rows[0]
    });

    res.json({
      message: 'Reclamo actualizado exitosamente.',
      reclamo: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar reclamo:', error);
    res.status(500).json({ error: 'Error al actualizar el reclamo.' });
  }
};

const eliminarReclamo = async (req, res) => {
  try {
    const { id } = req.params;

    const originalQuery = `
      SELECT 
        r.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM reclamos r
      JOIN sucursales s ON r.sucursal_id = s.id
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN tipos_consulta tc ON r.tipo_consulta_id = tc.id
      JOIN caracteristicas_consulta cc ON r.caracteristica_id = cc.id
      LEFT JOIN definiciones_consulta dc ON r.definicion_id = dc.id
      LEFT JOIN finalizaciones f ON r.finalizacion_id = f.id
      WHERE r.id = $1
    `;
    const originalRes = await pool.query(originalQuery, [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Reclamo no encontrado.' });
    }
    const registroOriginal = originalRes.rows[0];

    await pool.query('DELETE FROM reclamos WHERE id = $1', [id]);

    const resumenOriginal = `Fecha: ${new Date(registroOriginal.fecha).toLocaleString()} | Sucursal: ${registroOriginal.sucursal} | Asesor: ${registroOriginal.asesor} | Abonado: ${registroOriginal.numero_cliente} | Tipo: ${registroOriginal.tipo_consulta} | Característica: ${registroOriginal.caracteristica} | Definición: ${registroOriginal.definicion || 'N/A'} | Finalización: ${registroOriginal.finalizacion || 'N/A'}`;

    await registrarAuditoria({
      accion: `Se borró registro del abonado ${registroOriginal.numero_cliente}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'reclamos',
      registro_id: id,
      datos_anteriores: {
        resumen: resumenOriginal,
        detalle: registroOriginal
      }
    });

    res.json({ message: 'Reclamo eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar reclamo:', error);
    res.status(500).json({ error: 'Error al eliminar el reclamo.' });
  }
};

module.exports = {
  crearReclamo,
  getReclamos,
  getReclamoPorId,
  actualizarReclamo,
  eliminarReclamo
};
