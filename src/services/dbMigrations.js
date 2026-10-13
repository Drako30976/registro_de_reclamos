const pool = require('../config/db');

async function migrateDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS llamadas (
          id SERIAL PRIMARY KEY,
          fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
          usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
          numero_cliente VARCHAR(15) NOT NULL,
          tipo_consulta_id INT NOT NULL REFERENCES tipos_consulta(id) ON DELETE RESTRICT,
          caracteristica_id INT NOT NULL REFERENCES caracteristicas_consulta(id) ON DELETE RESTRICT,
          definicion_id INT REFERENCES definiciones_consulta(id) ON DELETE SET NULL,
          finalizacion_id INT REFERENCES finalizaciones(id) ON DELETE SET NULL,
          comentario VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_llamadas_fecha ON llamadas(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_llamadas_cliente ON llamadas(numero_cliente);
      CREATE INDEX IF NOT EXISTS idx_llamadas_sucursal ON llamadas(sucursal_id);
      CREATE INDEX IF NOT EXISTS idx_llamadas_usuario ON llamadas(usuario_id);
    `);
    console.log(' Migración de tabla llamadas verificada exitosamente.');
  } catch (err) {
    console.error(' Error en migración de tabla llamadas:', err.message);
  }
}

module.exports = { migrateDatabase };
