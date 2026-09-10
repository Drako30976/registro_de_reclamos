const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

// Sucursales
router.get('/sucursales', catalogosController.getSucursales);
router.post('/sucursales', checkRole('Admin', 'Supervisor'), catalogosController.crearSucursal);
router.put('/sucursales/:id', checkRole('Admin', 'Supervisor'), catalogosController.actualizarSucursal);
router.delete('/sucursales/:id', checkRole('Admin'), catalogosController.eliminarSucursal);

// Árbol jerárquico de consultas
router.get('/estructura', catalogosController.getArbolEstructura);
router.post('/estructura', checkRole('Admin', 'Supervisor'), catalogosController.guardarElementoEstructura);
router.put('/estructura/:nivel/:id', checkRole('Admin', 'Supervisor'), catalogosController.actualizarElementoEstructura);
router.delete('/estructura/:nivel/:id', checkRole('Admin'), catalogosController.eliminarElementoEstructura);

module.exports = router;
