const pool = require('../config/db');

/**
 * Registra una acción en la tabla auditoria_logs
 * @param {Object} params
 * @param {string} params.accion - Texto descriptivo (ej: 'se eliminó al usuario "user1"')
 * @param {number} params.usuario_id - ID del usuario que ejecutó la acción
 * @param {string} params.usuario_nombre - Nombre o usuario de quien realizó la acción
 * @param {string} params.entidad - Tipo de entidad ('reclamos', 'usuarios', 'sucursales', etc.)
 * @param {number} [params.registro_id] - ID del registro afectado
 * @param {Object|string} [params.datos_anteriores] - Datos previos (para borrados o ediciones)
 * @param {Object|string} [params.datos_nuevos] - Nuevos datos cargados
 */
const registrarAuditoria = async ({
  accion,
  usuario_id,
  usuario_nombre,
  entidad,
  registro_id = null,
  datos_anteriores = null,
  datos_nuevos = null
}) => {
  try {
    await pool.query(
      `INSERT INTO auditoria_logs 
        (accion, usuario_id, usuario_nombre, entidad, registro_id, datos_anteriores, datos_nuevos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        accion,
        usuario_id,
        usuario_nombre || 'Sistema',
        entidad,
        registro_id,
        datos_anteriores ? JSON.stringify(datos_anteriores) : null,
        datos_nuevos ? JSON.stringify(datos_nuevos) : null
      ]
    );
  } catch (error) {
    console.error('Error al registrar auditoría:', error);
  }
};

module.exports = {
  registrarAuditoria
};
