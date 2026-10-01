const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/pdf', checkRole('Admin', 'Supervisor', 'Asesor'), reportesController.emitirReportePDF);
router.get('/tareas-pdf', checkRole('Admin', 'Supervisor'), reportesController.emitirReporteTareasPDF);
router.get('/masivos-pdf', checkRole('Admin', 'Supervisor', 'Asesor'), reportesController.emitirReporteMasivosPDF);
router.get('/auditorias-pdf', checkRole('Admin', 'Supervisor'), reportesController.emitirReporteAuditoriasPDF);
router.get('/auditoria-individual-pdf', checkRole('Admin', 'Supervisor'), reportesController.emitirReporteAuditoriaIndividualPDF);

module.exports = router;
