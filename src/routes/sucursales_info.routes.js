const express = require('express');
const router = express.Router();
const sucursalesInfoController = require('../controllers/sucursales_info.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', sucursalesInfoController.getSucursalesInfo);
router.get('/:id', sucursalesInfoController.getSucursalDetalle);

router.post('/', checkRole('Admin', 'Supervisor'), sucursalesInfoController.upload.single('logo'), sucursalesInfoController.crearSucursal);
router.put('/:id', checkRole('Admin', 'Supervisor'), sucursalesInfoController.upload.single('logo'), sucursalesInfoController.actualizarSucursal);

router.post('/precios', checkRole('Admin', 'Supervisor'), sucursalesInfoController.crearPrecio);
router.put('/precios/:id', checkRole('Admin', 'Supervisor'), sucursalesInfoController.actualizarPrecio);
router.delete('/precios/:id', checkRole('Admin', 'Supervisor'), sucursalesInfoController.eliminarPrecio);

router.post('/promociones', checkRole('Admin', 'Supervisor'), sucursalesInfoController.crearPromocion);
router.put('/promociones/:id', checkRole('Admin', 'Supervisor'), sucursalesInfoController.actualizarPromocion);
router.delete('/promociones/:id', checkRole('Admin', 'Supervisor'), sucursalesInfoController.eliminarPromocion);

module.exports = router;
