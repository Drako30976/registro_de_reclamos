const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { registrarAuditoria } = require('../middlewares/audit');

// Listar todos los usuarios (Admin y Supervisor)
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre_completo, documento, usuario, legajo, rol, foto_perfil, activo, created_at 
       FROM usuarios 
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al consultar el listado de usuarios.' });
  }
};

// Crear nuevo usuario (Admin: cualquier rol / Supervisor: solo 'Asesor')
const crearUsuario = async (req, res) => {
  try {
    const { nombre_completo, documento, usuario, contrasena, legajo, rol } = req.body;

    if (!nombre_completo || !documento || !usuario || !contrasena || !rol) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados.' });
    }

    // Regla de jerarquía para creación de roles
    if (req.user.rol === 'Supervisor' && rol !== 'Asesor') {
      return res.status(403).json({ error: 'Como Supervisor sólo tiene permitido crear usuarios con rol "Asesor".' });
    }

    if (req.user.rol !== 'Admin' && req.user.rol !== 'Supervisor') {
      return res.status(403).json({ error: 'No tiene permisos para crear usuarios.' });
    }

    // Validar duplicados
    const existe = await pool.query(
      'SELECT usuario, documento FROM usuarios WHERE usuario = $1 OR documento = $2',
      [usuario.trim(), documento.trim()]
    );

    if (existe.rows.length > 0) {
      if (existe.rows[0].usuario === usuario.trim()) {
        return res.status(400).json({ error: 'El nombre de usuario ya se encuentra registrado.' });
      }
      return res.status(400).json({ error: 'El documento ya se encuentra registrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(contrasena, salt);

    const result = await pool.query(
      `INSERT INTO usuarios 
        (nombre_completo, documento, usuario, password_hash, legajo, rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre_completo, documento, usuario, legajo, rol, foto_perfil, activo, created_at`,
      [
        nombre_completo.trim(),
        documento.trim(),
        usuario.trim(),
        password_hash,
        legajo ? legajo.trim() : null,
        rol
      ]
    );

    await registrarAuditoria({
      accion: `Se creó al usuario "${usuario.trim()}" con rol ${rol}`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'usuarios',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente.',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al registrar el usuario.' });
  }
};

// Editar usuario (Admin o Supervisor)
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, documento, contrasena, legajo, rol, activo } = req.body;

    const actual = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuarioObjetivo = actual.rows[0];

    // Reglas de jerarquía
    if (req.user.rol === 'Supervisor') {
      if (usuarioObjetivo.rol === 'Admin' || (usuarioObjetivo.rol === 'Supervisor' && usuarioObjetivo.id !== req.user.id)) {
        return res.status(403).json({ error: 'No puede modificar a un usuario de su mismo rango o superior.' });
      }
      if (rol && rol !== 'Asesor' && rol !== usuarioObjetivo.rol) {
        return res.status(403).json({ error: 'Como Supervisor sólo puede asignar rol "Asesor".' });
      }
    }

    let password_hash = usuarioObjetivo.password_hash;
    if (contrasena && contrasena.trim()) {
      const salt = await bcrypt.genSalt(10);
      password_hash = await bcrypt.hash(contrasena.trim(), salt);
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET nombre_completo = COALESCE($1, nombre_completo),
           documento = COALESCE($2, documento),
           password_hash = $3,
           legajo = COALESCE($4, legajo),
           rol = COALESCE($5, rol),
           activo = COALESCE($6, activo)
       WHERE id = $7
       RETURNING id, nombre_completo, documento, usuario, legajo, rol, foto_perfil, activo, created_at`,
      [
        nombre_completo ? nombre_completo.trim() : null,
        documento ? documento.trim() : null,
        password_hash,
        legajo !== undefined ? legajo : null,
        rol || null,
        activo !== undefined ? activo : null,
        id
      ]
    );

    await registrarAuditoria({
      accion: `Se editó al usuario "${usuarioObjetivo.usuario}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'usuarios',
      registro_id: id,
      datos_anteriores: {
        id: usuarioObjetivo.id,
        nombre_completo: usuarioObjetivo.nombre_completo,
        usuario: usuarioObjetivo.usuario,
        documento: usuarioObjetivo.documento,
        rol: usuarioObjetivo.rol,
        activo: usuarioObjetivo.activo
      },
      datos_nuevos: result.rows[0]
    });

    res.json({
      message: 'Usuario actualizado exitosamente.',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
};

// Eliminar usuario (Admin)
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'Admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden eliminar usuarios.' });
    }

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'No puede eliminarse a sí mismo.' });
    }

    const actual = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuarioObjetivo = actual.rows[0];

    // Verificar si tiene reclamos asociados
    const tieneReclamos = await pool.query('SELECT 1 FROM reclamos WHERE usuario_id = $1 LIMIT 1', [id]);
    if (tieneReclamos.rows.length > 0) {
      // Si tiene reclamos vinculados, para no romper claves foráneas desactivamos lógicamente
      await pool.query('UPDATE usuarios SET activo = false WHERE id = $1', [id]);
    } else {
      await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    }

    // Formato exacto solicitado en especificación:
    // Fecha │ se eliminó al usuario “user1” │ realizado por Admin │ -
    await registrarAuditoria({
      accion: `se eliminó al usuario "${usuarioObjetivo.usuario}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'usuarios',
      registro_id: id,
      datos_anteriores: {
        id: usuarioObjetivo.id,
        nombre_completo: usuarioObjetivo.nombre_completo,
        usuario: usuarioObjetivo.usuario,
        documento: usuarioObjetivo.documento,
        rol: usuarioObjetivo.rol
      }
    });

    res.json({ message: `Usuario "${usuarioObjetivo.usuario}" eliminado exitosamente.` });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
};

// Cambiar contraseña propia (valida la contraseña actual primero)
const cambiarPasswordPropio = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
    }

    if (password_nueva.length < 4 || password_nueva.length > 20) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener entre 4 y 20 caracteres.' });
    }

    const user = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(password_actual, user.rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password_nueva, salt);

    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id]);

    await registrarAuditoria({
      accion: `El usuario "${req.user.usuario}" cambió su contraseña`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'usuarios',
      registro_id: req.user.id
    });

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña.' });
  }
};

// Subir y actualizar foto de perfil
const actualizarFotoPerfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo de imagen.' });
    }

    const fotoUrl = `/uploads/profiles/${req.file.filename}`;

    await pool.query('UPDATE usuarios SET foto_perfil = $1 WHERE id = $2', [fotoUrl, req.user.id]);

    await registrarAuditoria({
      accion: `El usuario "${req.user.usuario}" actualizó su foto de perfil`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'usuarios',
      registro_id: req.user.id
    });

    res.json({
      message: 'Foto de perfil actualizada correctamente.',
      foto_perfil: fotoUrl
    });
  } catch (error) {
    console.error('Error al actualizar foto de perfil:', error);
    res.status(500).json({ error: 'Error al subir la foto de perfil.' });
  }
};

module.exports = {
  getUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarPasswordPropio,
  actualizarFotoPerfil
};
