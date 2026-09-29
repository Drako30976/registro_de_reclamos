const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

const getMasivosVigentes = async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.fecha_inicio,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        m.sucursal_id,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        COALESCE(m.zona_afectada, 'No especificada') AS zona_afectada,
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
      WHERE (m.estado = 'Activo' AND m.created_at >= NOW() - INTERVAL '14 hours')
         OR (m.estado = 'Finalizado' AND m.updated_at >= NOW() - INTERVAL '14 hours' AND m.created_at >= NOW() - INTERVAL '14 hours')
      ORDER BY CASE WHEN m.estado = 'Activo' THEN 0 ELSE 1 END, m.fecha_inicio DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener masivos vigentes:', error);
    res.status(500).json({ error: 'Error al consultar inconvenientes masivos vigentes.' });
  }
};

const getMasivosActivos = async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.fecha_inicio,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD"T"HH24:MI') AS fecha_inicio_input,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        m.sucursal_id,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        COALESCE(m.zona_afectada, '') AS zona_afectada,
        m.servicio_afectado,
        COALESCE(m.caracteristicas_dano, '') AS caracteristicas_dano,
        COALESCE(m.tiempo_resolucion, '') AS tiempo_resolucion,
        m.estado,
        u.nombre_completo AS creado_por_nombre
      FROM inconvenientes_masivos m
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      LEFT JOIN usuarios u ON m.creado_por_id = u.id
      WHERE m.estado = 'Activo'
      ORDER BY m.fecha_inicio DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener masivos activos:', error);
    res.status(500).json({ error: 'Error al consultar inconvenientes masivos activos.' });
  }
};

const crearMasivo = async (req, res) => {
  try {
    const { fecha_inicio, sucursal_id, zona_afectada, servicio_afectado, caracteristicas_dano, tiempo_resolucion } = req.body;

    if (!fecha_inicio) {
      return res.status(400).json({ error: 'La fecha de inicio es obligatoria.' });
    }

    if (!servicio_afectado || servicio_afectado.trim().length === 0) {
      return res.status(400).json({ error: 'El servicio afectado es obligatorio.' });
    }

    if (servicio_afectado.trim().length > 50) {
      return res.status(400).json({ error: 'El servicio afectado no puede superar los 50 caracteres.' });
    }

    if (zona_afectada && zona_afectada.trim().length > 100) {
      return res.status(400).json({ error: 'La zona afectada no puede superar los 100 caracteres.' });
    }

    if (caracteristicas_dano && caracteristicas_dano.trim().length > 255) {
      return res.status(400).json({ error: 'Las características del daño no pueden superar los 255 caracteres.' });
    }

    if (tiempo_resolucion && tiempo_resolucion.trim().length > 20) {
      return res.status(400).json({ error: 'El tiempo de resolución no puede superar los 20 caracteres.' });
    }

    const sucId = sucursal_id ? parseInt(sucursal_id, 10) : null;

    let fechaInicioVal = fecha_inicio;
    if (typeof fechaInicioVal === 'string' && !fechaInicioVal.includes('T') && !fechaInicioVal.includes(' ')) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      fechaInicioVal = `${fechaInicioVal}T${hh}:${mm}:${ss}`;
    }

    const servUpper = servicio_afectado.trim().toUpperCase();
    const zonaUpper = (zona_afectada && zona_afectada.trim()) ? zona_afectada.trim().toUpperCase() : null;

    const insertQuery = `
      INSERT INTO inconvenientes_masivos (
        fecha_inicio,
        sucursal_id,
        zona_afectada,
        servicio_afectado,
        caracteristicas_dano,
        tiempo_resolucion,
        estado,
        creado_por_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Activo', $7)
      RETURNING id;
    `;

    const result = await pool.query(insertQuery, [
      fechaInicioVal,
      sucId,
      zonaUpper,
      servUpper,
      caracteristicas_dano ? caracteristicas_dano.trim() : null,
      tiempo_resolucion ? tiempo_resolucion.trim() : null,
      req.user.id
    ]);

    const nuevoId = result.rows[0].id;

    const fullRes = await pool.query(`
      SELECT 
        m.*,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        u.nombre_completo AS creado_por_nombre
      FROM inconvenientes_masivos m
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      LEFT JOIN usuarios u ON m.creado_por_id = u.id
      WHERE m.id = $1
    `, [nuevoId]);

    const nuevoMasivo = fullRes.rows[0];

    await registrarAuditoria({
      accion: `Se registró nuevo inconveniente masivo para el servicio "${nuevoMasivo.servicio_afectado}" (${nuevoMasivo.sucursal_nombre})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'inconvenientes_masivos',
      registro_id: nuevoId,
      datos_nuevos: nuevoMasivo
    });

    res.status(201).json({
      message: 'Inconveniente masivo registrado con éxito.',
      masivo: nuevoMasivo
    });
  } catch (error) {
    console.error('Error al crear inconveniente masivo:', error);
    res.status(500).json({ error: 'Error al registrar el inconveniente masivo.' });
  }
};

const modificarMasivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, sucursal_id, zona_afectada, servicio_afectado, caracteristicas_dano, tiempo_resolucion } = req.body;

    const checkRes = await pool.query('SELECT * FROM inconvenientes_masivos WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Inconveniente masivo no encontrado.' });
    }

    const masivoOriginal = checkRes.rows[0];

    if (!fecha_inicio) {
      return res.status(400).json({ error: 'La fecha de inicio es obligatoria.' });
    }

    if (!servicio_afectado || servicio_afectado.trim().length === 0) {
      return res.status(400).json({ error: 'El servicio afectado es obligatorio.' });
    }

    if (servicio_afectado.trim().length > 50) {
      return res.status(400).json({ error: 'El servicio afectado no puede superar los 50 caracteres.' });
    }

    if (zona_afectada && zona_afectada.trim().length > 100) {
      return res.status(400).json({ error: 'La zona afectada no puede superar los 100 caracteres.' });
    }

    if (caracteristicas_dano && caracteristicas_dano.trim().length > 255) {
      return res.status(400).json({ error: 'Las características del daño no pueden superar los 255 caracteres.' });
    }

    if (tiempo_resolucion && tiempo_resolucion.trim().length > 20) {
      return res.status(400).json({ error: 'El tiempo de resolución no puede superar los 20 caracteres.' });
    }

    const sucId = sucursal_id ? parseInt(sucursal_id, 10) : null;
    const servUpper = servicio_afectado.trim().toUpperCase();
    const zonaUpper = (zona_afectada && zona_afectada.trim()) ? zona_afectada.trim().toUpperCase() : null;

    await pool.query(`
      UPDATE inconvenientes_masivos
      SET 
        fecha_inicio = $1,
        sucursal_id = $2,
        zona_afectada = $3,
        servicio_afectado = $4,
        caracteristicas_dano = $5,
        tiempo_resolucion = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      fecha_inicio,
      sucId,
      zonaUpper,
      servUpper,
      caracteristicas_dano ? caracteristicas_dano.trim() : null,
      tiempo_resolucion ? tiempo_resolucion.trim() : null,
      id
    ]);

    const fullRes = await pool.query(`
      SELECT 
        m.*,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        u.nombre_completo AS creado_por_nombre
      FROM inconvenientes_masivos m
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      LEFT JOIN usuarios u ON m.creado_por_id = u.id
      WHERE m.id = $1
    `, [id]);

    const masivoActualizado = fullRes.rows[0];

    await registrarAuditoria({
      accion: `Se modificó el inconveniente masivo ID ${id} (${masivoActualizado.servicio_afectado})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'inconvenientes_masivos',
      registro_id: id,
      datos_anteriores: masivoOriginal,
      datos_nuevos: masivoActualizado
    });

    res.json({
      message: 'Inconveniente masivo modificado con éxito.',
      masivo: masivoActualizado
    });
  } catch (error) {
    console.error('Error al modificar inconveniente masivo:', error);
    res.status(500).json({ error: 'Error al modificar el inconveniente masivo.' });
  }
};

const finalizarMasivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_fin, responsable_solucion, arreglo } = req.body;

    const checkRes = await pool.query('SELECT * FROM inconvenientes_masivos WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Inconveniente masivo no encontrado.' });
    }

    const masivoOriginal = checkRes.rows[0];

    if (!fecha_fin) {
      return res.status(400).json({ error: 'La fecha de finalización es obligatoria.' });
    }

    if (responsable_solucion && responsable_solucion.trim().length > 20) {
      return res.status(400).json({ error: 'El responsable no puede superar los 20 caracteres.' });
    }

    if (arreglo && arreglo.trim().length > 50) {
      return res.status(400).json({ error: 'El detalle del arreglo no puede superar los 50 caracteres.' });
    }

    await pool.query(`
      UPDATE inconvenientes_masivos
      SET 
        estado = 'Finalizado',
        fecha_fin = $1,
        responsable_solucion = $2,
        arreglo = $3,
        finalizado_por_id = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      fecha_fin,
      responsable_solucion ? responsable_solucion.trim() : null,
      arreglo ? arreglo.trim() : null,
      req.user.id,
      id
    ]);

    const fullRes = await pool.query(`
      SELECT 
        m.*,
        COALESCE(s.nombre, 'Todas las sucursales') AS sucursal_nombre,
        TO_CHAR(m.fecha_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_inicio_fmt,
        TO_CHAR(m.fecha_fin AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fin_fmt,
        u.nombre_completo AS creado_por_nombre,
        uf.nombre_completo AS finalizado_por_nombre
      FROM inconvenientes_masivos m
      LEFT JOIN sucursales s ON m.sucursal_id = s.id
      LEFT JOIN usuarios u ON m.creado_por_id = u.id
      LEFT JOIN usuarios uf ON m.finalizado_por_id = uf.id
      WHERE m.id = $1
    `, [id]);

    const masivoFinalizado = fullRes.rows[0];

    await registrarAuditoria({
      accion: `Se finalizó el inconveniente masivo ID ${id} (${masivoFinalizado.servicio_afectado})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'inconvenientes_masivos',
      registro_id: id,
      datos_anteriores: masivoOriginal,
      datos_nuevos: masivoFinalizado
    });

    res.json({
      message: 'Inconveniente masivo finalizado con éxito.',
      masivo: masivoFinalizado
    });
  } catch (error) {
    console.error('Error al finalizar inconveniente masivo:', error);
    res.status(500).json({ error: 'Error al finalizar el inconveniente masivo.' });
  }
};

const getHistorialMasivos = async (req, res) => {
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial de masivos:', error);
    res.status(500).json({ error: 'Error al consultar historial de masivos.' });
  }
};

const eliminarMasivo = async (req, res) => {
  try {
    const { id } = req.params;
    const checkRes = await pool.query('SELECT * FROM inconvenientes_masivos WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Inconveniente masivo no encontrado.' });
    }

    const masivoOriginal = checkRes.rows[0];

    await pool.query('DELETE FROM inconvenientes_masivos WHERE id = $1', [id]);

    await registrarAuditoria({
      accion: `Se eliminó el inconveniente masivo ID ${id} (${masivoOriginal.servicio_afectado})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'inconvenientes_masivos',
      registro_id: id,
      datos_anteriores: masivoOriginal
    });

    res.json({ message: 'Inconveniente masivo eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar inconveniente masivo:', error);
    res.status(500).json({ error: 'Error al eliminar el inconveniente masivo.' });
  }
};

module.exports = {
  getMasivosVigentes,
  getMasivosActivos,
  crearMasivo,
  modificarMasivo,
  finalizarMasivo,
  getHistorialMasivos,
  eliminarMasivo
};
