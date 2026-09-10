const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Configuración de almacenamiento para fotos de perfil con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpg, png, gif, webp).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB máx
});

router.use(verifyToken);

// Acciones sobre el propio perfil
router.post('/perfil/cambiar-password', usuariosController.cambiarPasswordPropio);
router.post('/perfil/foto', upload.single('foto'), usuariosController.actualizarFotoPerfil);

// Gestión de usuarios por Admin y Supervisor
router.get('/', checkRole('Admin', 'Supervisor'), usuariosController.getUsuarios);
router.post('/', checkRole('Admin', 'Supervisor'), usuariosController.crearUsuario);
router.put('/:id', checkRole('Admin', 'Supervisor'), usuariosController.actualizarUsuario);
router.delete('/:id', checkRole('Admin'), usuariosController.eliminarUsuario);

module.exports = router;
