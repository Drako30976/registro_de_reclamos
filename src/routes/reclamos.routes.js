const express = require('express');
const router = express.Router();
const reclamosController = require('../controllers/reclamos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

// Carga de reclamos (Gestión de Reclamos) - Todos excepto Espectador
router.post('/', checkRole('Admin', 'Supervisor', 'Asesor'), reclamosController.crearReclamo);

// Historial de reclamos (Consulta y filtros) - Todos los roles
router.get('/', reclamosController.getReclamos);

// Reclamo individual
router.get('/:id', reclamosController.getReclamoPorId);

// Modificación de reclamo (Admin, Supervisor, Asesor)
router.put('/:id', checkRole('Admin', 'Supervisor', 'Asesor'), reclamosController.actualizarReclamo);

// Eliminación de reclamo (Sólo Admin)
router.delete('/:id', checkRole('Admin'), reclamosController.eliminarReclamo);

module.exports = router;
