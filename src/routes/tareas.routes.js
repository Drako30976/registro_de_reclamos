const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.get('/mis-tareas', tareasController.getMisTareas);
router.patch('/:id/marcar', tareasController.marcarTarea);
router.put('/:id/marcar', tareasController.marcarTarea);

router.use(checkRole('Admin', 'Supervisor'));

router.get('/', tareasController.getTareas);
router.post('/', tareasController.crearTarea);
router.put('/:id', tareasController.actualizarTarea);
router.delete('/:id', tareasController.eliminarTarea);

module.exports = router;
