const pool = require('../config/db');

async function migrateDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_llamada (
          id SERIAL PRIMARY KEY,
          contenido VARCHAR(50) NOT NULL,
          descripcion VARCHAR(150) DEFAULT '',
          activo BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS caracteristicas_llamada (
          id SERIAL PRIMARY KEY,
          tipo_llamada_id INT NOT NULL REFERENCES tipos_llamada(id) ON DELETE CASCADE,
          contenido VARCHAR(50) NOT NULL,
          descripcion VARCHAR(150) DEFAULT '',
          activo BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS definiciones_llamada (
          id SERIAL PRIMARY KEY,
          caracteristica_id INT NOT NULL REFERENCES caracteristicas_llamada(id) ON DELETE CASCADE,
          contenido VARCHAR(50) NOT NULL,
          descripcion VARCHAR(150) DEFAULT '',
          activo BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS finalizaciones_llamada (
          id SERIAL PRIMARY KEY,
          definicion_id INT REFERENCES definiciones_llamada(id) ON DELETE CASCADE,
          contenido VARCHAR(50) NOT NULL,
          descripcion VARCHAR(150) DEFAULT '',
          activo BOOLEAN DEFAULT TRUE
      );

      DO $$
      BEGIN
        IF (SELECT COUNT(*) FROM tipos_llamada) = 0 THEN
          INSERT INTO tipos_llamada (id, contenido, descripcion, activo)
          SELECT id, contenido, descripcion, activo FROM tipos_consulta
          ON CONFLICT (id) DO NOTHING;
          PERFORM setval(pg_get_serial_sequence('tipos_llamada', 'id'), COALESCE((SELECT MAX(id) FROM tipos_llamada), 1));

          INSERT INTO caracteristicas_llamada (id, tipo_llamada_id, contenido, descripcion, activo)
          SELECT id, tipo_consulta_id, contenido, descripcion, activo FROM caracteristicas_consulta
          ON CONFLICT (id) DO NOTHING;
          PERFORM setval(pg_get_serial_sequence('caracteristicas_llamada', 'id'), COALESCE((SELECT MAX(id) FROM caracteristicas_llamada), 1));

          INSERT INTO definiciones_llamada (id, caracteristica_id, contenido, descripcion, activo)
          SELECT id, caracteristica_id, contenido, descripcion, activo FROM definiciones_consulta
          ON CONFLICT (id) DO NOTHING;
          PERFORM setval(pg_get_serial_sequence('definiciones_llamada', 'id'), COALESCE((SELECT MAX(id) FROM definiciones_llamada), 1));

          INSERT INTO finalizaciones_llamada (id, definicion_id, contenido, descripcion, activo)
          SELECT id, definicion_id, contenido, descripcion, activo FROM finalizaciones
          ON CONFLICT (id) DO NOTHING;
          PERFORM setval(pg_get_serial_sequence('finalizaciones_llamada', 'id'), COALESCE((SELECT MAX(id) FROM finalizaciones_llamada), 1));
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS llamadas (
          id SERIAL PRIMARY KEY,
          fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
          usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
          numero_cliente VARCHAR(15),
          telefono_contacto VARCHAR(30) DEFAULT '',
          tipo_consulta_id INT NOT NULL REFERENCES tipos_llamada(id) ON DELETE RESTRICT,
          caracteristica_id INT NOT NULL REFERENCES caracteristicas_llamada(id) ON DELETE RESTRICT,
          definicion_id INT REFERENCES definiciones_llamada(id) ON DELETE SET NULL,
          finalizacion_id INT REFERENCES finalizaciones_llamada(id) ON DELETE SET NULL,
          comentario VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE llamadas ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(30) DEFAULT '';
      ALTER TABLE llamadas ALTER COLUMN numero_cliente DROP NOT NULL;

      DO $$
      BEGIN
        ALTER TABLE llamadas DROP CONSTRAINT IF EXISTS llamadas_tipo_consulta_id_fkey;
        ALTER TABLE llamadas DROP CONSTRAINT IF EXISTS llamadas_caracteristica_id_fkey;
        ALTER TABLE llamadas DROP CONSTRAINT IF EXISTS llamadas_definicion_id_fkey;
        ALTER TABLE llamadas DROP CONSTRAINT IF EXISTS llamadas_finalizacion_id_fkey;

        ALTER TABLE llamadas ADD CONSTRAINT llamadas_tipo_consulta_id_fkey FOREIGN KEY (tipo_consulta_id) REFERENCES tipos_llamada(id) ON DELETE RESTRICT;
        ALTER TABLE llamadas ADD CONSTRAINT llamadas_caracteristica_id_fkey FOREIGN KEY (caracteristica_id) REFERENCES caracteristicas_llamada(id) ON DELETE RESTRICT;
        ALTER TABLE llamadas ADD CONSTRAINT llamadas_definicion_id_fkey FOREIGN KEY (definicion_id) REFERENCES definiciones_llamada(id) ON DELETE SET NULL;
        ALTER TABLE llamadas ADD CONSTRAINT llamadas_finalizacion_id_fkey FOREIGN KEY (finalizacion_id) REFERENCES finalizaciones_llamada(id) ON DELETE SET NULL;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_llamadas_fecha ON llamadas(fecha DESC);
      CREATE INDEX IF NOT EXISTS idx_llamadas_cliente ON llamadas(numero_cliente);
      CREATE INDEX IF NOT EXISTS idx_llamadas_telefono ON llamadas(telefono_contacto);
      CREATE INDEX IF NOT EXISTS idx_llamadas_sucursal ON llamadas(sucursal_id);
      CREATE INDEX IF NOT EXISTS idx_llamadas_usuario ON llamadas(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_reclamos_fecha_ar ON reclamos (((fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date));
      CREATE INDEX IF NOT EXISTS idx_llamadas_fecha_ar ON llamadas (((fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date));

      CREATE TABLE IF NOT EXISTS mensajes_internos (
          id SERIAL PRIMARY KEY,
          remitente_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          asunto VARCHAR(150) NOT NULL DEFAULT '(Sin asunto)',
          cuerpo TEXT NOT NULL,
          eliminado_remitente BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mensajes_destinatarios (
          id SERIAL PRIMARY KEY,
          mensaje_id INT NOT NULL REFERENCES mensajes_internos(id) ON DELETE CASCADE,
          destinatario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          tipo VARCHAR(10) NOT NULL DEFAULT 'para',
          leido BOOLEAN DEFAULT FALSE,
          leido_at TIMESTAMP WITH TIME ZONE,
          favorito BOOLEAN DEFAULT FALSE,
          eliminado BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mensajes_adjuntos (
          id SERIAL PRIMARY KEY,
          mensaje_id INT NOT NULL REFERENCES mensajes_internos(id) ON DELETE CASCADE,
          nombre_original VARCHAR(255) NOT NULL,
          nombre_archivo VARCHAR(255) NOT NULL,
          ruta VARCHAR(255) NOT NULL,
          tipo_mime VARCHAR(100),
          peso_bytes BIGINT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats_mensajes (
          id SERIAL PRIMARY KEY,
          emisor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          receptor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          contenido VARCHAR(200) NOT NULL,
          editado BOOLEAN DEFAULT FALSE,
          eliminado BOOLEAN DEFAULT FALSE,
          leido BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats_adjuntos (
          id SERIAL PRIMARY KEY,
          chat_id INT NOT NULL REFERENCES chats_mensajes(id) ON DELETE CASCADE,
          tipo VARCHAR(20) NOT NULL DEFAULT 'imagen',
          nombre_original VARCHAR(255) NOT NULL,
          nombre_archivo VARCHAR(255) NOT NULL,
          ruta VARCHAR(255) NOT NULL,
          tipo_mime VARCHAR(100),
          peso_bytes BIGINT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON mensajes_internos(remitente_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_mensajes_dest_usuario ON mensajes_destinatarios(destinatario_id, eliminado, leido, favorito);
      CREATE INDEX IF NOT EXISTS idx_mensajes_dest_mensaje ON mensajes_destinatarios(mensaje_id);
      CREATE INDEX IF NOT EXISTS idx_mensajes_adjuntos_mensaje ON mensajes_adjuntos(mensaje_id);
      CREATE INDEX IF NOT EXISTS idx_chats_conversacion ON chats_mensajes(emisor_id, receptor_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_chats_adjuntos_chat ON chats_adjuntos(chat_id);
    `);
    console.log('Migración de tablas de llamadas y jerarquías completada exitosamente.');
  } catch (err) {
    console.error('Error en migración de tablas de llamadas:', err.message);
  }
}

module.exports = { migrateDatabase };
