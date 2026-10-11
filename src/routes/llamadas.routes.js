const express = require('express');
const router = express.Router();
const llamadasController = require('../controllers/llamadas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.post('/', checkRole('Admin', 'Supervisor', 'Asesor'), llamadasController.crearLlamada);

router.get('/', llamadasController.getLlamadas);

router.get('/:id', llamadasController.getLlamadaPorId);

router.put('/:id', checkRole('Admin', 'Supervisor', 'Asesor'), llamadasController.actualizarLlamada);

router.delete('/:id', checkRole('Admin'), llamadasController.eliminarLlamada);

module.exports = router;
