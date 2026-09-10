require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const reclamosRoutes = require('./routes/reclamos.routes');
const catalogosRoutes = require('./routes/catalogos.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const reportesRoutes = require('./routes/reportes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos (fotos de perfil)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir archivos del frontend estático (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../')));

// Montar rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/reclamos', reclamosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);

// Endpoint de verificación de salud (Healthcheck)
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      timestamp: new Date(),
      database_time: dbCheck.rows[0].now
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: error.message });
  }
});

// Manejador centralizado de errores
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({
    error: 'Ocurrió un error inesperado en el servidor.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` Servidor de Reclamos ejecutándose en http://localhost:${PORT}`);
  console.log(` Base de datos conectada a puerto ${process.env.DB_PORT || 5433}`);
  console.log(`====================================================`);
  
  try {
    const res = await pool.query('SELECT current_database(), current_user');
    console.log(` Conexión a PostgreSQL confirmada: BD '${res.rows[0].current_database}' con usuario '${res.rows[0].current_user}'`);
  } catch (err) {
    console.error(` Error conectando a PostgreSQL:`, err.message);
  }
});
