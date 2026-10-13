const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function initCanalesTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canales_sucursales (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(100) UNIQUE NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      localidad VARCHAR(150) DEFAULT '',
      provincia VARCHAR(150) DEFAULT '',
      orden INT DEFAULT 0,
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canales_grillas (
      id SERIAL PRIMARY KEY,
      sucursal_id INT NOT NULL REFERENCES canales_sucursales(id) ON DELETE CASCADE,
      tipo VARCHAR(50) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      imagen_url TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sucursal_id, tipo)
    );

    CREATE TABLE IF NOT EXISTS canales_items (
      id SERIAL PRIMARY KEY,
      grilla_id INT NOT NULL REFERENCES canales_grillas(id) ON DELETE CASCADE,
      numero INT NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      logo TEXT DEFAULT '',
      categoria VARCHAR(100) DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_canales_items_grilla ON canales_items(grilla_id);
  `);

  const check = await pool.query('SELECT COUNT(*) FROM canales_sucursales');
  const count = parseInt(check.rows[0].count, 10);
  if (count === 0) {
    await seedFromGuiaProviders();
  }
}

async function seedFromGuiaProviders() {
  const localJsonPath = path.join(__dirname, '../../data_canales_seed.json');
  const hostJsonPath = 'C:/Users/Mauro/Desktop/Proyecto/Guia_Providers/data/data.json';
  const jsonPath = fs.existsSync(localJsonPath) ? localJsonPath : hostJsonPath;
  if (!fs.existsSync(jsonPath)) return;

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  let sucursalOrder = 0;
  for (const key of Object.keys(data)) {
    const s = data[key];
    sucursalOrder++;

    const sucRes = await pool.query(`
      INSERT INTO canales_sucursales (codigo, nombre, localidad, provincia, orden)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [s.id, s.nombre, s.localidad || '', s.provincia || '', sucursalOrder]);

    const sucursalId = sucRes.rows[0].id;
    const grillas = s.grillasDisponibles || [];

    for (const tipo of grillas) {
      let nombreTipo = 'Digital';
      if (tipo === 'analogica') nombreTipo = 'Analógica';
      else if (tipo === 'aire-digital') nombreTipo = 'Aire Digital';

      const grillaRes = await pool.query(`
        INSERT INTO canales_grillas (sucursal_id, tipo, nombre, imagen_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [sucursalId, tipo, nombreTipo, '']);

      const grillaId = grillaRes.rows[0].id;
      const channels = s[tipo] || [];

      for (const ch of channels) {
        let logo = ch.logo || '';
        if (logo.startsWith('assets/')) {
          logo = logo.replace(/^assets\//, 'assets/canales/');
        }

        await pool.query(`
          INSERT INTO canales_items (grilla_id, numero, nombre, logo, categoria)
          VALUES ($1, $2, $3, $4, $5)
        `, [grillaId, ch.canal, ch.nombre, logo, ch.categoria || '']);
      }
    }
  }
}

module.exports = {
  initCanalesTables,
  seedFromGuiaProviders
};
