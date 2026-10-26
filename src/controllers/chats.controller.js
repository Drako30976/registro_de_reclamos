const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../uploads/chats');
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
  limits: { fileSize: 15 * 1024 * 1024 }
});

const getContactos = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await pool.query(`
      SELECT 
        u.id, 
        u.nombre_completo, 
        u.usuario, 
        u.rol,
        (
          SELECT cm.contenido
          FROM chats_mensajes cm
          WHERE ((cm.emisor_id = $1 AND cm.receptor_id = u.id) OR (cm.emisor_id = u.id AND cm.receptor_id = $1))
            AND cm.eliminado = false
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS ultimo_mensaje,
        (
          SELECT cm.created_at
          FROM chats_mensajes cm
          WHERE ((cm.emisor_id = $1 AND cm.receptor_id = u.id) OR (cm.emisor_id = u.id AND cm.receptor_id = $1))
            AND cm.eliminado = false
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS ultimo_mensaje_fecha,
        (
          SELECT COUNT(*)
          FROM chats_mensajes cm
          WHERE cm.emisor_id = u.id AND cm.receptor_id = $1 AND cm.leido = false AND cm.eliminado = false
        ) AS no_leidos
      FROM usuarios u
      WHERE u.activo = true 
        AND LOWER(TRIM(u.usuario)) != 'admin' 
        AND u.id != $1
      ORDER BY ultimo_mensaje_fecha DESC NULLS LAST, u.nombre_completo ASC
    `, [currentUserId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener contactos para chat:', error);
    res.status(500).json({ error: 'Error al consultar contactos de chat.' });
  }
};

const getHistorial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactoId } = req.params;
    const { desde_id } = req.query;

    const cId = parseInt(contactoId, 10);
    if (isNaN(cId)) {
      return res.status(400).json({ error: 'ID de contacto inválido.' });
    }

    let query = `
      SELECT 
        cm.id,
        cm.emisor_id,
        cm.receptor_id,
        cm.contenido,
        cm.editado,
        cm.eliminado,
        cm.leido,
        cm.created_at,
        cm.updated_at,
        u_emisor.nombre_completo AS emisor_nombre,
        u_receptor.nombre_completo AS receptor_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ca.id,
              'tipo', ca.tipo,
              'nombre_original', ca.nombre_original,
              'nombre_archivo', ca.nombre_archivo,
              'ruta', ca.ruta,
              'tipo_mime', ca.tipo_mime,
              'peso_bytes', ca.peso_bytes
            )
          ) FILTER (WHERE ca.id IS NOT NULL), '[]'
        ) AS adjuntos
      FROM chats_mensajes cm
      JOIN usuarios u_emisor ON cm.emisor_id = u_emisor.id
      JOIN usuarios u_receptor ON cm.receptor_id = u_receptor.id
      LEFT JOIN chats_adjuntos ca ON cm.id = ca.chat_id
      WHERE ((cm.emisor_id = $1 AND cm.receptor_id = $2) OR (cm.emisor_id = $2 AND cm.receptor_id = $1))
        AND cm.eliminado = false
    `;

    const values = [userId, cId];

    if (desde_id) {
      values.push(parseInt(desde_id, 10));
      query += ` AND cm.id > $3`;
    }

    query += `
      GROUP BY cm.id, u_emisor.nombre_completo, u_receptor.nombre_completo
      ORDER BY cm.created_at ASC
    `;

    const result = await pool.query(query, values);

    await pool.query(`
      UPDATE chats_mensajes 
      SET leido = true 
      WHERE emisor_id = $1 AND receptor_id = $2 AND leido = false
    `, [cId, userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial de chat:', error);
    res.status(500).json({ error: 'Error al consultar historial de chat.' });
  }
};

const enviarMensaje = async (req, res) => {
  const client = await pool.connect();
  try {
    const emisorId = req.user.id;
    const { receptor_id, contenido } = req.body;

    if (!receptor_id) {
      return res.status(400).json({ error: 'El receptor del chat es obligatorio.' });
    }

    const receptorId = parseInt(receptor_id, 10);
    if (isNaN(receptorId) || receptorId === emisorId) {
      return res.status(400).json({ error: 'Receptor inválido.' });
    }

    const texto = contenido && typeof contenido === 'string' ? contenido.trim() : '';

    const files = req.files || [];
    if (!texto && files.length === 0) {
      return res.status(400).json({ error: 'El mensaje de chat no puede estar vacío.' });
    }

    if (texto.length > 200) {
      return res.status(400).json({ error: 'El chat no puede superar los 200 caracteres.' });
    }

    const imagenes = files.filter(f => f.mimetype.startsWith('image/'));
    const videos = files.filter(f => f.mimetype.startsWith('video/'));

    if (imagenes.length > 5) {
      return res.status(400).json({ error: 'Se permite adjuntar un máximo de 5 imágenes por mensaje.' });
    }

    if (videos.length > 1) {
      return res.status(400).json({ error: 'Se permite adjuntar un máximo de 1 video por mensaje.' });
    }

    await client.query('BEGIN');

    const msgRes = await client.query(`
      INSERT INTO chats_mensajes (emisor_id, receptor_id, contenido)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [emisorId, receptorId, texto]);

    const nuevoChat = msgRes.rows[0];

    const adjuntosGuardados = [];

    if (files.length > 0) {
      for (const file of files) {
        let tipo = 'archivo';
        if (file.mimetype.startsWith('image/')) tipo = 'imagen';
        else if (file.mimetype.startsWith('video/')) tipo = 'video';

        const rutaRelativa = `/uploads/chats/${file.filename}`;
        const adjRes = await client.query(`
          INSERT INTO chats_adjuntos (chat_id, tipo, nombre_original, nombre_archivo, ruta, tipo_mime, peso_bytes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          nuevoChat.id,
          tipo,
          file.originalname,
          file.filename,
          rutaRelativa,
          file.mimetype,
          file.size
        ]);
        adjuntosGuardados.push(adjRes.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...nuevoChat,
      adjuntos: adjuntosGuardados,
      emisor_nombre: req.user.nombre_completo || req.user.usuario
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al enviar chat:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje de chat.' });
  } finally {
    client.release();
  }
};

const editarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { contenido } = req.body;

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido editado no puede estar vacío.' });
    }

    if (contenido.trim().length > 200) {
      return res.status(400).json({ error: 'El mensaje de chat no puede superar los 200 caracteres.' });
    }

    const check = await pool.query('SELECT * FROM chats_mensajes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje de chat no encontrado.' });
    }

    const msg = check.rows[0];

    if (msg.emisor_id !== userId) {
      return res.status(403).json({ error: 'Solo el emisor puede editar este mensaje.' });
    }

    if (msg.eliminado) {
      return res.status(400).json({ error: 'No es posible editar un mensaje eliminado.' });
    }

    const diferenciaMs = Date.now() - new Date(msg.created_at).getTime();
    if (diferenciaMs > 60 * 60 * 1000) {
      return res.status(400).json({ error: 'No es posible editar mensajes con más de 1 hora de antigüedad.' });
    }

    const result = await pool.query(`
      UPDATE chats_mensajes 
      SET contenido = $1, editado = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [contenido.trim(), id]);

    res.json({ message: 'Mensaje editado con éxito.', chat: result.rows[0] });
  } catch (error) {
    console.error('Error al editar chat:', error);
    res.status(500).json({ error: 'Error al editar el mensaje de chat.' });
  }
};

const eliminarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const check = await pool.query('SELECT * FROM chats_mensajes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Mensaje de chat no encontrado.' });
    }

    const msg = check.rows[0];

    if (msg.emisor_id !== userId) {
      return res.status(403).json({ error: 'Solo el emisor puede eliminar este mensaje.' });
    }

    const diferenciaMs = Date.now() - new Date(msg.created_at).getTime();
    if (diferenciaMs > 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Los chats con más de 1 hora de antigüedad no pueden ser borrados.' });
    }

    await pool.query(`
      UPDATE chats_mensajes 
      SET eliminado = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Mensaje de chat eliminado.' });
  } catch (error) {
    console.error('Error al eliminar chat:', error);
    res.status(500).json({ error: 'Error al eliminar el mensaje de chat.' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT COUNT(*) AS unread_count 
      FROM chats_mensajes 
      WHERE receptor_id = $1 AND leido = false AND eliminado = false
    `, [userId]);
    res.json({ unread_count: parseInt(result.rows[0].unread_count, 10) });
  } catch (error) {
    console.error('Error al contar chats no leídos:', error);
    res.status(500).json({ error: 'Error al consultar chats no leídos.' });
  }
};

module.exports = {
  upload,
  getContactos,
  getHistorial,
  enviarMensaje,
  editarMensaje,
  eliminarMensaje,
  getUnreadCount
};
