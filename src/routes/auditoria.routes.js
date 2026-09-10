const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoria.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

// Solo Admin tiene acceso a la pestaña Registros (Auditoría)
router.get('/', checkRole('Admin'), auditoriaController.getAuditoriaLogs);

module.exports = router;
