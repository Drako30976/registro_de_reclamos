const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Por favor, ingrese usuario y contraseña.' });
    }

    const result = await pool.query(
      'SELECT id, nombre_completo, documento, usuario, password_hash, rol, foto_perfil, activo FROM usuarios WHERE usuario = $1',
      [usuario.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario suspendido' });
    }

    const match = await bcrypt.compare(contrasena, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        nombre_completo: user.nombre_completo
      },
      process.env.JWT_SECRET || 'reclamos_jwt_super_secret_key_2026',
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      usuario: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        documento: user.documento,
        usuario: user.usuario,
        rol: user.rol,
        foto_perfil: user.foto_perfil
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

const getMe = async (req, res) => {
  return res.json({
    usuario: req.user
  });
};

module.exports = {
  login,
  getMe
};
