const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

const getTareas = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.usuario_id,
        u.nombre_completo AS usuario_nombre,
        u.usuario AS usuario_login,
        u.rol AS usuario_rol,
        u.foto_perfil AS usuario_foto,
        t.sucursal_1_id,
        s1.nombre AS sucursal_1_nombre,
        t.sucursal_2_id,
        s2.nombre AS sucursal_2_nombre,
        t.tarea,
        t.completada,
        t.completada_at,
        t.activo,
        t.created_at,
        t.updated_at,
        cp.nombre_completo AS creado_por_nombre
      FROM tareas_asignadas t
      JOIN usuarios u ON t.usuario_id = u.id
      JOIN usuarios cp ON t.creado_por_id = cp.id
      JOIN sucursales s1 ON t.sucursal_1_id = s1.id
      LEFT JOIN sucursales s2 ON t.sucursal_2_id = s2.id
      WHERE t.activo = true
      ORDER BY t.created_at DESC, t.id DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener tareas asignadas:', error);
    res.status(500).json({ error: 'Error al consultar tareas asignadas.' });
  }
};

const crearTarea = async (req, res) => {
  try {
    const { usuario_id, sucursal_1_id, sucursal_2_id, tarea } = req.body;

    if (!usuario_id || !sucursal_1_id || !tarea || !tarea.trim()) {
      return res.status(400).json({
        error: 'El usuario, la primera sucursal y la descripción de la tarea son obligatorios.'
      });
    }

    if (tarea.trim().length > 50) {
      return res.status(400).json({
        error: 'La tarea no puede superar los 50 caracteres.'
      });
    }

    const checkUser = await pool.query('SELECT id, usuario, rol FROM usuarios WHERE id = $1', [usuario_id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (checkUser.rows[0].usuario.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'No se pueden asignar tareas al usuario admin.' });
    }

    const query = `
      INSERT INTO tareas_asignadas 
        (usuario_id, creado_por_id, sucursal_1_id, sucursal_2_id, tarea, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `;

    const values = [
      usuario_id,
      req.user.id,
      sucursal_1_id,
      sucursal_2_id || null,
      tarea.trim()
    ];

    const result = await pool.query(query, values);
    const nuevoId = result.rows[0].id;

    const fullResult = await pool.query(`
      SELECT 
        t.id,
        t.usuario_id,
        u.nombre_completo AS usuario_nombre,
        u.usuario AS usuario_login,
        u.rol AS usuario_rol,
        u.foto_perfil AS usuario_foto,
        t.sucursal_1_id,
        s1.nombre AS sucursal_1_nombre,
        t.sucursal_2_id,
        s2.nombre AS sucursal_2_nombre,
        t.tarea,
        t.completada,
        t.completada_at,
        t.activo,
        t.created_at,
        t.updated_at,
        cp.nombre_completo AS creado_por_nombre
      FROM tareas_asignadas t
      JOIN usuarios u ON t.usuario_id = u.id
      JOIN usuarios cp ON t.creado_por_id = cp.id
      JOIN sucursales s1 ON t.sucursal_1_id = s1.id
      LEFT JOIN sucursales s2 ON t.sucursal_2_id = s2.id
      WHERE t.id = $1
    `, [nuevoId]);

    const tareaCompleta = fullResult.rows[0];

    await registrarAuditoria({
      accion: `Se asignó la tarea "${tarea.trim()}" al usuario ${tareaCompleta.usuario_nombre}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'tareas_asignadas',
      registro_id: nuevoId,
      datos_nuevos: tareaCompleta
    });

    res.status(201).json({
      message: 'Tarea asignada exitosamente.',
      tarea: tareaCompleta
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al asignar la tarea.' });
  }
};

const actualizarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, sucursal_1_id, sucursal_2_id, tarea, activo, completada } = req.body;

    const originalRes = await pool.query('SELECT * FROM tareas_asignadas WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const tareaOriginal = originalRes.rows[0];

    if (usuario_id) {
      const checkUser = await pool.query('SELECT id, usuario FROM usuarios WHERE id = $1', [usuario_id]);
      if (checkUser.rows.length > 0 && checkUser.rows[0].usuario.toLowerCase() === 'admin') {
        return res.status(400).json({ error: 'No se puede asignar tareas al usuario admin.' });
      }
    }

    if (tarea && tarea.trim().length > 50) {
      return res.status(400).json({ error: 'La tarea no puede superar los 50 caracteres.' });
    }

    const updateQuery = `
      UPDATE tareas_asignadas
      SET
        usuario_id = COALESCE($1, usuario_id),
        sucursal_1_id = COALESCE($2, sucursal_1_id),
        sucursal_2_id = $3,
        tarea = COALESCE($4, tarea),
        activo = COALESCE($5, activo),
        completada = COALESCE($6, completada),
        completada_at = CASE 
          WHEN $6 = true AND completada = false THEN CURRENT_TIMESTAMP 
          WHEN $6 = false THEN NULL 
          ELSE completada_at 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const updateValues = [
      usuario_id || null,
      sucursal_1_id || null,
      sucursal_2_id !== undefined ? sucursal_2_id : tareaOriginal.sucursal_2_id,
      tarea ? tarea.trim() : null,
      activo !== undefined ? activo : null,
      completada !== undefined ? completada : null,
      id
    ];

    await pool.query(updateQuery, updateValues);

    const fullResult = await pool.query(`
      SELECT 
        t.id,
        t.usuario_id,
        u.nombre_completo AS usuario_nombre,
        u.usuario AS usuario_login,
        u.rol AS usuario_rol,
        u.foto_perfil AS usuario_foto,
        t.sucursal_1_id,
        s1.nombre AS sucursal_1_nombre,
        t.sucursal_2_id,
        s2.nombre AS sucursal_2_nombre,
        t.tarea,
        t.completada,
        t.completada_at,
        t.activo,
        t.created_at,
        t.updated_at,
        cp.nombre_completo AS creado_por_nombre
      FROM tareas_asignadas t
      JOIN usuarios u ON t.usuario_id = u.id
      JOIN usuarios cp ON t.creado_por_id = cp.id
      JOIN sucursales s1 ON t.sucursal_1_id = s1.id
      LEFT JOIN sucursales s2 ON t.sucursal_2_id = s2.id
      WHERE t.id = $1
    `, [id]);

    const tareaActualizada = fullResult.rows[0];

    await registrarAuditoria({
      accion: `Se modificó la tarea asignada ID ${id} (${tareaActualizada.tarea})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'tareas_asignadas',
      registro_id: id,
      datos_anteriores: tareaOriginal,
      datos_nuevos: tareaActualizada
    });

    res.json({
      message: 'Tarea actualizada exitosamente.',
      tarea: tareaActualizada
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error al actualizar la tarea.' });
  }
};

const eliminarTarea = async (req, res) => {
  try {
    const { id } = req.params;

    const originalRes = await pool.query('SELECT * FROM tareas_asignadas WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const tareaOriginal = originalRes.rows[0];

    await pool.query('DELETE FROM tareas_asignadas WHERE id = $1', [id]);

    await registrarAuditoria({
      accion: `Se eliminó la tarea asignada ID ${id} ("${tareaOriginal.tarea}")`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'tareas_asignadas',
      registro_id: id,
      datos_anteriores: tareaOriginal
    });

    res.json({ message: 'Tarea eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: 'Error al eliminar la tarea.' });
  }
};

const getMisTareas = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.usuario_id,
        t.sucursal_1_id,
        s1.nombre AS sucursal_1_nombre,
        t.sucursal_2_id,
        s2.nombre AS sucursal_2_nombre,
        t.tarea,
        t.completada,
        t.completada_at,
        t.activo,
        t.created_at,
        t.updated_at,
        cp.nombre_completo AS creado_por_nombre
      FROM tareas_asignadas t
      JOIN sucursales s1 ON t.sucursal_1_id = s1.id
      LEFT JOIN sucursales s2 ON t.sucursal_2_id = s2.id
      JOIN usuarios cp ON t.creado_por_id = cp.id
      WHERE t.usuario_id = $1 AND t.activo = true
      ORDER BY t.created_at DESC, t.id DESC
    `;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar mis tareas:', error);
    res.status(500).json({ error: 'Error al consultar tareas asignadas.' });
  }
};

const marcarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { completada } = req.body;

    const originalRes = await pool.query('SELECT * FROM tareas_asignadas WHERE id = $1', [id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const tareaOriginal = originalRes.rows[0];

    if (req.user.rol !== 'Admin' && req.user.rol !== 'Supervisor' && tareaOriginal.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No tiene permiso para modificar esta tarea.' });
    }

    const estaCompletada = completada === true || completada === 'true';

    const updateQuery = `
      UPDATE tareas_asignadas
      SET 
        completada = $1,
        completada_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [estaCompletada, id]);
    const tareaActualizada = result.rows[0];

    await registrarAuditoria({
      accion: `El usuario ${req.user.usuario} marcó como ${estaCompletada ? 'completada' : 'pendiente'} la tarea "${tareaOriginal.tarea}" (ID ${id})`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'tareas_asignadas',
      registro_id: id,
      datos_anteriores: tareaOriginal,
      datos_nuevos: tareaActualizada
    });

    res.json({
      message: 'Estado de la tarea actualizado con éxito.',
      tarea: tareaActualizada
    });
  } catch (error) {
    console.error('Error al marcar tarea:', error);
    res.status(500).json({ error: 'Error al cambiar estado de la tarea.' });
  }
};

module.exports = {
  getTareas,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
  getMisTareas,
  marcarTarea
};
