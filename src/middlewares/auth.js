const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'reclamos_jwt_super_secret_key_2026');

    // Consultar usuario en la base de datos para asegurar que sigue activo
    const result = await pool.query(
      'SELECT id, nombre_completo, documento, usuario, legajo, rol, foto_perfil, activo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido o desactivado.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.', details: error.message });
  }
};

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole
};
