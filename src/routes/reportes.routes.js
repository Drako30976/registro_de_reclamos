const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/pdf', checkRole('Admin', 'Supervisor', 'Asesor'), reportesController.emitirReportePDF);

module.exports = router;
