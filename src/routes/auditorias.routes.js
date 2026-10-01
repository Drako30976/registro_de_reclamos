const express = require('express');
const router = express.Router();
const auditoriasController = require('../controllers/auditorias.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(checkRole('Admin', 'Supervisor'));

router.get('/canales', auditoriasController.getCanales);
router.get('/canales/admin', auditoriasController.getCanalesAdmin);
router.post('/canales', auditoriasController.crearCanal);
router.put('/canales/:id', auditoriasController.modificarCanal);
router.delete('/canales/:id', auditoriasController.eliminarCanal);

router.get('/criterios', auditoriasController.getCriterios);
router.get('/criterios/admin', auditoriasController.getCriteriosAdmin);

router.post('/criterios', auditoriasController.crearCriterio);
router.put('/criterios/:id', auditoriasController.modificarCriterio);
router.delete('/criterios/:id', auditoriasController.eliminarCriterio);

router.post('/subcriterios', auditoriasController.crearSubcriterio);
router.put('/subcriterios/:id', auditoriasController.modificarSubcriterio);
router.delete('/subcriterios/:id', auditoriasController.eliminarSubcriterio);

router.post('/', auditoriasController.crearAuditoria);
router.get('/historial', auditoriasController.getHistorialAuditorias);
router.get('/:id', auditoriasController.getAuditoriaById);

router.delete('/:id', checkRole('Admin'), auditoriasController.eliminarAuditoria);

module.exports = router;
