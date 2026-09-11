const pool = require('../config/db');

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
