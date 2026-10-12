const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const canalesController = require('../controllers/canales.controller');
const { verifyToken } = require('../middlewares/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../assets/canales'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `canal-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no permitido.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(verifyToken);

router.get('/', canalesController.getEstructuraCompleta);
router.get('/sucursales', canalesController.getSucursales);
router.get('/grilla/:id', canalesController.getCanalesPorGrilla);
router.get('/logos', canalesController.getLogosDisponibles);
router.post('/upload', upload.single('imagen'), canalesController.uploadLogo);

router.post('/sucursales', canalesController.crearSucursal);
router.put('/sucursales/:id', canalesController.editarSucursal);
router.delete('/sucursales/:id', canalesController.eliminarSucursal);

router.post('/grillas', canalesController.crearGrilla);
router.put('/grillas/:id', canalesController.editarGrilla);
router.delete('/grillas/:id', canalesController.eliminarGrilla);

router.post('/items', canalesController.crearCanal);
router.put('/items/:id', canalesController.editarCanal);
router.delete('/items/:id', canalesController.eliminarCanal);

module.exports = router;
