const pool = require('../config/db');

// Obtener logs de auditoría con paginación de a 20 registros
const getAuditoriaLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = 20; // Requisito estricto: 20 registros por página
    const offset = (page - 1) * limit;

    const totalResult = await pool.query('SELECT COUNT(*) FROM auditoria_logs');
    const totalRecords = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const query = `
      SELECT 
        id,
        fecha,
        accion,
        usuario_nombre AS realizado_por,
        entidad,
        registro_id,
        datos_anteriores,
        datos_nuevos
      FROM auditoria_logs
      ORDER BY fecha DESC, id DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      page,
      limit,
      total_records: totalRecords,
      total_pages: totalPages,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener registros de auditoría:', error);
    res.status(500).json({ error: 'Error al consultar los registros de auditoría.' });
  }
};

module.exports = {
  getAuditoriaLogs
};
