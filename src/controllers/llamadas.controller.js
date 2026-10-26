const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

const normalizarFecha = (val) => {
  if (!val || typeof val !== 'string') return val;
  const match = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return val.trim();
};

const crearLlamada = async (req, res) => {
  try {
    const {
      sucursal_id,
      numero_cliente,
      telefono_contacto,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id,
      comentario
    } = req.body;

    const asesor_id = req.user.id;

    if (!sucursal_id || !numero_cliente || !tipo_consulta_id || !caracteristica_id || !definicion_id || !finalizacion_id) {
      return res.status(400).json({
        error: 'Los campos Sucursal, Número de Cliente, Tipo de Consulta, Características, Definición y Finalización son obligatorios.'
      });
    }

    if (numero_cliente.trim().length > 15) {
      return res.status(400).json({
        error: 'El número de cliente no puede superar los 15 caracteres.'
      });
    }

    const telContacto = telefono_contacto && typeof telefono_contacto === 'string' ? telefono_contacto.trim() : '';
    if (telContacto.length > 30) {
      return res.status(400).json({
        error: 'El teléfono de contacto no puede superar los 30 caracteres.'
      });
    }

    const comentarioTexto = comentario && typeof comentario === 'string' && comentario.trim().length > 0
      ? comentario.trim()
      : null;

    if (comentarioTexto && comentarioTexto.length > 500) {
      return res.status(400).json({
        error: 'El comentario no puede superar los 500 caracteres.'
      });
    }



    const query = `
      INSERT INTO llamadas 
        (sucursal_id, usuario_id, numero_cliente, telefono_contacto, tipo_consulta_id, caracteristica_id, definicion_id, finalizacion_id, comentario)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      sucursal_id,
      asesor_id,
      numero_cliente.trim(),
      telContacto,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id,
      comentarioTexto
    ];

    const result = await pool.query(query, values);
    const nuevoId = result.rows[0].id;

    const fullQuery = `
      SELECT 
        l.id,
        l.fecha,
        l.numero_cliente,
        l.telefono_contacto,
        l.comentario,
        l.created_at,
        l.updated_at,
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
      FROM llamadas l
      JOIN sucursales s ON l.sucursal_id = s.id
      JOIN usuarios u ON l.usuario_id = u.id
      JOIN tipos_llamada tc ON l.tipo_consulta_id = tc.id
      JOIN caracteristicas_llamada cc ON l.caracteristica_id = cc.id
      LEFT JOIN definiciones_llamada dc ON l.definicion_id = dc.id
      LEFT JOIN finalizaciones_llamada f ON l.finalizacion_id = f.id
      WHERE l.id = $1
    `;
    const fullResult = await pool.query(fullQuery, [nuevoId]);
    const llamadaCompleta = fullResult.rows[0];

    await registrarAuditoria({
      accion: `Se cargó llamada telefónica para el abonado ${numero_cliente.trim()}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'llamadas',
      registro_id: nuevoId,
      datos_nuevos: llamadaCompleta
    });

    res.status(201).json({
      message: 'Llamada guardada exitosamente.',
      llamada: llamadaCompleta
    });
  } catch (error) {
    console.error('Error al crear llamada:', error);
    res.status(500).json({ error: error.message || 'Error al registrar la llamada.' });
  }
};

const getLlamadas = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      fecha,
      asesor_id,
      sucursal_id,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id,
      numero_cliente,
      telefono
    } = req.query;

    let query = `
      SELECT 
        l.id,
        l.fecha,
        l.numero_cliente,
        l.telefono_contacto,
        l.comentario,
        l.created_at,
        l.updated_at,
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
      FROM llamadas l
      JOIN sucursales s ON l.sucursal_id = s.id
      JOIN usuarios u ON l.usuario_id = u.id
      JOIN tipos_llamada tc ON l.tipo_consulta_id = tc.id
      JOIN caracteristicas_llamada cc ON l.caracteristica_id = cc.id
      LEFT JOIN definiciones_llamada dc ON l.definicion_id = dc.id
      LEFT JOIN finalizaciones_llamada f ON l.finalizacion_id = f.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha) {
      query += ` AND (l.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = $${paramIndex++}`;
      values.push(normalizarFecha(fecha));
    }
    if (fecha_desde) {
      query += ` AND (l.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $${paramIndex++}`;
      values.push(normalizarFecha(fecha_desde));
    }
    if (fecha_hasta) {
      query += ` AND (l.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $${paramIndex++}`;
      values.push(normalizarFecha(fecha_hasta));
    }
    if (asesor_id) {
      query += ` AND l.usuario_id = $${paramIndex++}`;
      values.push(asesor_id);
    }
    if (sucursal_id) {
      query += ` AND l.sucursal_id = $${paramIndex++}`;
      values.push(sucursal_id);
    }
    if (tipo_consulta_id) {
      query += ` AND l.tipo_consulta_id = $${paramIndex++}`;
      values.push(tipo_consulta_id);
    }
    if (caracteristica_id) {
      query += ` AND l.caracteristica_id = $${paramIndex++}`;
      values.push(caracteristica_id);
    }
    if (definicion_id) {
      query += ` AND l.definicion_id = $${paramIndex++}`;
      values.push(definicion_id);
    }
    if (finalizacion_id) {
      if (!isNaN(parseInt(finalizacion_id, 10)) && String(parseInt(finalizacion_id, 10)) === String(finalizacion_id).trim()) {
        query += ` AND l.finalizacion_id = $${paramIndex++}`;
        values.push(parseInt(finalizacion_id, 10));
      } else {
        query += ` AND f.contenido ILIKE $${paramIndex++}`;
        values.push(finalizacion_id.trim());
      }
    }
    if (numero_cliente) {
      query += ` AND l.numero_cliente ILIKE $${paramIndex++}`;
      values.push(`%${numero_cliente.trim()}%`);
    }
    if (telefono) {
      query += ` AND l.telefono_contacto ILIKE $${paramIndex++}`;
      values.push(`%${telefono.trim()}%`);
    }

    query += ` ORDER BY l.fecha DESC, l.id DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial de llamadas:', error);
    res.status(500).json({ error: 'Error al obtener llamadas.' });
  }
};

const getLlamadaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        l.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM llamadas l
      JOIN sucursales s ON l.sucursal_id = s.id
      JOIN usuarios u ON l.usuario_id = u.id
      JOIN tipos_llamada tc ON l.tipo_consulta_id = tc.id
      JOIN caracteristicas_llamada cc ON l.caracteristica_id = cc.id
      LEFT JOIN definiciones_llamada dc ON l.definicion_id = dc.id
      LEFT JOIN finalizaciones_llamada f ON l.finalizacion_id = f.id
      WHERE l.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Llamada no encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener llamada:', error);
    res.status(500).json({ error: 'Error al consultar la llamada.' });
  }
};

const actualizarLlamada = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sucursal_id,
      numero_cliente,
      telefono_contacto,
      tipo_consulta_id,
      caracteristica_id,
      definicion_id,
      finalizacion_id,
      comentario
    } = req.body;

    const originalQuery = `
      SELECT 
        l.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM llamadas l
      JOIN sucursales s ON l.sucursal_id = s.id
      JOIN usuarios u ON l.usuario_id = u.id
      JOIN tipos_llamada tc ON l.tipo_consulta_id = tc.id
      JOIN caracteristicas_llamada cc ON l.caracteristica_id = cc.id
      LEFT JOIN definiciones_llamada dc ON l.definicion_id = dc.id
      LEFT JOIN finalizaciones_llamada f ON l.finalizacion_id = f.id
      WHERE l.id = $1
    `;
    const originalRes = await pool.query(originalQuery, [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Llamada no encontrada.' });
    }
    const registroOriginal = originalRes.rows[0];

    if (req.user.rol === 'Asesor' && registroOriginal.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene autorización para modificar llamadas registradas por otro asesor.' });
    }



    const comentarioTexto = comentario !== undefined
      ? (typeof comentario === 'string' && comentario.trim().length > 0 ? comentario.trim() : null)
      : registroOriginal.comentario;

    if (comentarioTexto && comentarioTexto.length > 500) {
      return res.status(400).json({ error: 'El comentario no puede superar los 500 caracteres.' });
    }

    if (telefono_contacto !== undefined && typeof telefono_contacto === 'string' && telefono_contacto.trim().length > 30) {
      return res.status(400).json({ error: 'El teléfono de contacto no puede superar los 30 caracteres.' });
    }

    const definicionFinal = definicion_id !== undefined ? definicion_id : registroOriginal.definicion_id;
    const finalizacionFinal = finalizacion_id !== undefined ? finalizacion_id : registroOriginal.finalizacion_id;

    if (!definicionFinal || !finalizacionFinal) {
      return res.status(400).json({ error: 'Los campos Definición y Finalización son obligatorios.' });
    }

    const updateQuery = `
      UPDATE llamadas
      SET 
        sucursal_id = COALESCE($1, sucursal_id),
        numero_cliente = COALESCE($2, numero_cliente),
        telefono_contacto = COALESCE($3, telefono_contacto),
        tipo_consulta_id = COALESCE($4, tipo_consulta_id),
        caracteristica_id = COALESCE($5, caracteristica_id),
        definicion_id = $6,
        finalizacion_id = $7,
        comentario = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const updateValues = [
      sucursal_id || null,
      numero_cliente ? numero_cliente.trim() : null,
      telefono_contacto !== undefined ? telefono_contacto.trim() : null,
      tipo_consulta_id || null,
      caracteristica_id || null,
      definicionFinal,
      finalizacionFinal,
      comentarioTexto,
      id
    ];

    const result = await pool.query(updateQuery, updateValues);

    const resumenOriginal = `Fecha: ${new Date(registroOriginal.fecha).toLocaleString()} | Sucursal: ${registroOriginal.sucursal} | Asesor: ${registroOriginal.asesor} | Abonado: ${registroOriginal.numero_cliente} | Teléfono: ${registroOriginal.telefono_contacto || 'N/A'} | Tipo: ${registroOriginal.tipo_consulta} | Característica: ${registroOriginal.caracteristica} | Definición: ${registroOriginal.definicion || 'N/A'} | Finalización: ${registroOriginal.finalizacion || 'N/A'} | Comentario: ${registroOriginal.comentario || 'N/A'}`;

    await registrarAuditoria({
      accion: `Se modificó llamada telefónica del abonado ${registroOriginal.numero_cliente}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'llamadas',
      registro_id: id,
      datos_anteriores: {
        resumen: resumenOriginal,
        detalle: registroOriginal
      },
      datos_nuevos: result.rows[0]
    });

    res.json({
      message: 'Llamada actualizada exitosamente.',
      llamada: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar llamada:', error);
    res.status(500).json({ error: 'Error al actualizar la llamada.' });
  }
};

const eliminarLlamada = async (req, res) => {
  try {
    const { id } = req.params;

    const originalQuery = `
      SELECT 
        l.*,
        s.nombre AS sucursal,
        u.nombre_completo AS asesor,
        tc.contenido AS tipo_consulta,
        cc.contenido AS caracteristica,
        dc.contenido AS definicion,
        f.contenido AS finalizacion
      FROM llamadas l
      JOIN sucursales s ON l.sucursal_id = s.id
      JOIN usuarios u ON l.usuario_id = u.id
      JOIN tipos_llamada tc ON l.tipo_consulta_id = tc.id
      JOIN caracteristicas_llamada cc ON l.caracteristica_id = cc.id
      LEFT JOIN definiciones_llamada dc ON l.definicion_id = dc.id
      LEFT JOIN finalizaciones_llamada f ON l.finalizacion_id = f.id
      WHERE l.id = $1
    `;
    const originalRes = await pool.query(originalQuery, [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Llamada no encontrada.' });
    }
    const registroOriginal = originalRes.rows[0];

    await pool.query('DELETE FROM llamadas WHERE id = $1', [id]);

    const resumenOriginal = `Fecha: ${new Date(registroOriginal.fecha).toLocaleString()} | Sucursal: ${registroOriginal.sucursal} | Asesor: ${registroOriginal.asesor} | Abonado: ${registroOriginal.numero_cliente} | Teléfono: ${registroOriginal.telefono_contacto || 'N/A'} | Tipo: ${registroOriginal.tipo_consulta} | Característica: ${registroOriginal.caracteristica} | Definición: ${registroOriginal.definicion || 'N/A'} | Finalización: ${registroOriginal.finalizacion || 'N/A'} | Comentario: ${registroOriginal.comentario || 'N/A'}`;

    await registrarAuditoria({
      accion: `Se borró registro de llamada del abonado ${registroOriginal.numero_cliente}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'llamadas',
      registro_id: id,
      datos_anteriores: {
        resumen: resumenOriginal,
        detalle: registroOriginal
      }
    });

    res.json({ message: 'Llamada eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar llamada:', error);
    res.status(500).json({ error: 'Error al eliminar la llamada.' });
  }
};

module.exports = {
  crearLlamada,
  getLlamadas,
  getLlamadaPorId,
  actualizarLlamada,
  eliminarLlamada
};
