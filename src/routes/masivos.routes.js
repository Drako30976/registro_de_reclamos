const express = require('express');
const router = express.Router();
const masivosController = require('../controllers/masivos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/vigentes', masivosController.getMasivosVigentes);

router.use(checkRole('Admin', 'Supervisor', 'Asesor'));

router.get('/activos', masivosController.getMasivosActivos);
router.get('/historial', masivosController.getHistorialMasivos);
router.post('/', masivosController.crearMasivo);
router.put('/:id', masivosController.modificarMasivo);
router.patch('/:id/finalizar', masivosController.finalizarMasivo);
router.put('/:id/finalizar', masivosController.finalizarMasivo);
router.delete('/:id', masivosController.eliminarMasivo);

module.exports = router;
