const express = require('express');
const router = express.Router();
const reclamosController = require('../controllers/reclamos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.post('/', checkRole('Admin', 'Supervisor', 'Asesor'), reclamosController.crearReclamo);

router.get('/', reclamosController.getReclamos);

router.get('/:id', reclamosController.getReclamoPorId);

router.put('/:id', checkRole('Admin', 'Supervisor', 'Asesor'), reclamosController.actualizarReclamo);

router.delete('/:id', checkRole('Admin'), reclamosController.eliminarReclamo);

module.exports = router;
