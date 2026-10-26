const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../uploads/mensajes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const getContactos = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const result = await pool.query(`
      SELECT id, nombre_completo, usuario, rol 
      FROM usuarios 
      WHERE activo = true 
        AND LOWER(TRIM(usuario)) != 'admin' 
        AND id != $1 
      ORDER BY nombre_completo ASC
    `, [currentUserId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener contactos para mensajes:', error);
    res.status(500).json({ error: 'Error al consultar contactos.' });
  }
};

const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filtro } = req.query;

    let query = `
      SELECT 
        m.id,
        m.id AS mensaje_id,
        md.id AS destinatario_registro_id,
        m.asunto,
        m.cuerpo,
        m.created_at,
        u.id AS remitente_id,
        u.nombre_completo AS remitente_nombre,
        u.usuario AS remitente_usuario,
        md.tipo AS tipo_destinatario,
        md.leido,
        md.leido_at,
        md.favorito,
        (SELECT COUNT(*) FROM mensajes_adjuntos ma WHERE ma.mensaje_id = m.id) AS total_adjuntos
      FROM mensajes_destinatarios md
      JOIN mensajes_internos m ON md.mensaje_id = m.id
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE md.destinatario_id = $1 AND md.eliminado = false
    `;

    const values = [userId];

    if (filtro === 'leidos') {
      query += ` AND md.leido = true`;
    } else if (filtro === 'no_leidos') {
      query += ` AND md.leido = false`;
    } else if (filtro === 'favoritos') {
      query += ` AND md.favorito = true`;
    }

    query += ` ORDER BY m.created_at DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener bandeja de entrada:', error);
    res.status(500).json({ error: 'Error al consultar la bandeja de entrada.' });
  }
};

const getSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT 
        m.id,
        m.asunto,
        m.cuerpo,
        m.created_at,
        (SELECT COUNT(*) FROM mensajes_adjuntos ma WHERE ma.mensaje_id = m.id) AS total_adjuntos,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'nombre_completo', u.nombre_completo,
              'usuario', u.usuario,
              'tipo', md.tipo
            )
          ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS destinatarios
      FROM mensajes_internos m
      LEFT JOIN mensajes_destinatarios md ON m.id = md.mensaje_id
      LEFT JOIN usuarios u ON md.destinatario_id = u.id
      WHERE m.remitente_id = $1 AND m.eliminado_remitente = false
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener mensajes enviados:', error);
    res.status(500).json({ error: 'Error al consultar mensajes enviados.' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT COUNT(*) AS unread_count 
      FROM mensajes_destinatarios 
      WHERE destinatario_id = $1 AND eliminado = false AND leido = false
    `, [userId]);
    res.json({ unread_count: parseInt(result.rows[0].unread_count, 10) });
  } catch (error) {
    console.error('Error al contar mensajes no leídos:', error);
    res.status(500).json({ error: 'Error al obtener mensajes no leídos.' });
  }
};

const getMensajePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const msgRes = await pool.query(`
      SELECT 
        m.id,
        m.asunto,
        m.cuerpo,
        m.created_at,
        m.remitente_id,
        u.nombre_completo AS remitente_nombre,
        u.usuario AS remitente_usuario
      FROM mensajes_internos m
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (msgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado.' });
    }

    const mensaje = msgRes.rows[0];

    const destRes = await pool.query(`
      SELECT 
        md.id,
        md.destinatario_id,
        md.tipo,
        md.leido,
        md.leido_at,
        md.favorito,
        md.eliminado,
        u.nombre_completo,
        u.usuario
      FROM mensajes_destinatarios md
      JOIN usuarios u ON md.destinatario_id = u.id
      WHERE md.mensaje_id = $1
    `, [id]);

    const esRemitente = mensaje.remitente_id === userId;
    const registroDest = destRes.rows.find(d => d.destinatario_id === userId);

    if (!esRemitente && !registroDest) {
      return res.status(403).json({ error: 'No tiene autorización para visualizar este mensaje.' });
    }

    if (registroDest && !registroDest.leido) {
      await pool.query(`
        UPDATE mensajes_destinatarios 
        SET leido = true, leido_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [registroDest.id]);
      registroDest.leido = true;
      registroDest.leido_at = new Date();
    }

    const adjRes = await pool.query(`
      SELECT id, nombre_original, nombre_archivo, ruta, tipo_mime, peso_bytes, created_at
      FROM mensajes_adjuntos
      WHERE mensaje_id = $1
    `, [id]);

    res.json({
      ...mensaje,
      destinatarios: destRes.rows,
      adjuntos: adjRes.rows,
      es_remitente: esRemitente,
      estado_destinatario: registroDest || null
    });
  } catch (error) {
    console.error('Error al obtener mensaje por ID:', error);
    res.status(500).json({ error: 'Error al consultar el mensaje.' });
  }
};

const crearMensaje = async (req, res) => {
  const client = await pool.connect();
  try {
    const remitenteId = req.user.id;
    const { destinatario_id, destinatarios_ids, asunto, cuerpo } = req.body;
    let { acc_ids } = req.body;

    if (!cuerpo || !cuerpo.trim()) {
      return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío.' });
    }

    if (cuerpo.trim().length > 10000) {
      return res.status(400).json({ error: 'El mensaje no puede superar los 10.000 caracteres.' });
    }

    let paraList = [];
    if (destinatarios_ids) {
      if (typeof destinatarios_ids === 'string') {
        try {
          paraList = JSON.parse(destinatarios_ids);
        } catch {
          paraList = destinatarios_ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        }
      } else if (Array.isArray(destinatarios_ids)) {
        paraList = destinatarios_ids.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
      }
    } else if (destinatario_id) {
      if (typeof destinatario_id === 'string' && destinatario_id.startsWith('[')) {
        try {
          paraList = JSON.parse(destinatario_id);
        } catch {
          const pId = parseInt(destinatario_id, 10);
          if (!isNaN(pId)) paraList = [pId];
        }
      } else {
        const pId = parseInt(destinatario_id, 10);
        if (!isNaN(pId)) paraList = [pId];
      }
    }

    paraList = [...new Set(paraList.filter(id => id && id !== remitenteId))];

    if (paraList.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un destinatario (Para).' });
    }

    let accList = [];
    if (acc_ids) {
      if (typeof acc_ids === 'string') {
        try {
          accList = JSON.parse(acc_ids);
        } catch {
          accList = acc_ids.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        }
      } else if (Array.isArray(acc_ids)) {
        accList = acc_ids.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
      }
    }

    accList = [...new Set(accList.filter(id => id && id !== remitenteId && !paraList.includes(id)))];

    const asuntoFinal = asunto && asunto.trim() ? asunto.trim().substring(0, 150) : '(Sin asunto)';

    await client.query('BEGIN');

    const msgInsert = await client.query(`
      INSERT INTO mensajes_internos (remitente_id, asunto, cuerpo)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [remitenteId, asuntoFinal, cuerpo.trim()]);

    const nuevoMensaje = msgInsert.rows[0];

    for (const paraId of paraList) {
      await client.query(`
        INSERT INTO mensajes_destinatarios (mensaje_id, destinatario_id, tipo)
        VALUES ($1, $2, 'para')
      `, [nuevoMensaje.id, paraId]);
    }

    for (const accId of accList) {
      await client.query(`
        INSERT INTO mensajes_destinatarios (mensaje_id, destinatario_id, tipo)
        VALUES ($1, $2, 'acc')
      `, [nuevoMensaje.id, accId]);
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const rutaRelativa = `/uploads/mensajes/${file.filename}`;
        await client.query(`
          INSERT INTO mensajes_adjuntos (mensaje_id, nombre_original, nombre_archivo, ruta, tipo_mime, peso_bytes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          nuevoMensaje.id,
          file.originalname,
          file.filename,
          rutaRelativa,
          file.mimetype,
          file.size
        ]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Mensaje enviado exitosamente.',
      mensaje: nuevoMensaje
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear mensaje:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje.' });
  } finally {
    client.release();
  }
};

const marcarLeido = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { leido } = req.body;

    const nuevoEstado = leido !== undefined ? Boolean(leido) : true;

    const result = await pool.query(`
      UPDATE mensajes_destinatarios 
      SET leido = $1, leido_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END 
      WHERE mensaje_id = $2 AND destinatario_id = $3
      RETURNING *
    `, [nuevoEstado, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado para este usuario.' });
    }

    res.json({ message: 'Estado de lectura actualizado.', registro: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar estado de lectura:', error);
    res.status(500).json({ error: 'Error al actualizar lectura.' });
  }
};

const marcarFavorito = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { favorito } = req.body;

    const nuevoEstado = favorito !== undefined ? Boolean(favorito) : true;

    const result = await pool.query(`
      UPDATE mensajes_destinatarios 
      SET favorito = $1 
      WHERE mensaje_id = $2 AND destinatario_id = $3
      RETURNING *
    `, [nuevoEstado, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje no encontrado para este usuario.' });
    }

    res.json({ message: 'Estado de favorito actualizado.', registro: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar favorito:', error);
    res.status(500).json({ error: 'Error al actualizar favorito.' });
  }
};

const eliminarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let modificado = false;

    const destRes = await pool.query(`
      UPDATE mensajes_destinatarios 
      SET eliminado = true 
      WHERE mensaje_id = $1 AND destinatario_id = $2
      RETURNING id
    `, [id, userId]);

    if (destRes.rows.length > 0) modificado = true;

    const remRes = await pool.query(`
      UPDATE mensajes_internos 
      SET eliminado_remitente = true 
      WHERE id = $1 AND remitente_id = $2
      RETURNING id
    `, [id, userId]);

    if (remRes.rows.length > 0) modificado = true;

    if (!modificado) {
      return res.status(404).json({ error: 'Mensaje no encontrado o sin permisos para eliminar.' });
    }

    res.json({ message: 'Mensaje eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ error: 'Error al eliminar el mensaje.' });
  }
};

module.exports = {
  upload,
  getContactos,
  getInbox,
  getSent,
  getUnreadCount,
  getMensajePorId,
  crearMensaje,
  marcarLeido,
  marcarFavorito,
  eliminarMensaje
};
