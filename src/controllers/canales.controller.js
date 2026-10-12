const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const canalesController = {
  async getEstructuraCompleta(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          s.id,
          s.codigo,
          s.nombre,
          s.localidad,
          s.provincia,
          s.orden,
          s.activo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', g.id,
                'tipo', g.tipo,
                'nombre', g.nombre,
                'imagen_url', g.imagen_url,
                'total_canales', (SELECT COUNT(*)::int FROM canales_items ci WHERE ci.grilla_id = g.id)
              ) ORDER BY g.id
            ) FILTER (WHERE g.id IS NOT NULL), '[]'
          ) as grillas
        FROM canales_sucursales s
        LEFT JOIN canales_grillas g ON g.sucursal_id = s.id
        WHERE s.activo = TRUE
        GROUP BY s.id
        ORDER BY s.orden ASC, s.nombre ASC
      `);

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener estructura de grillas de canales', details: error.message });
    }
  },

  async getSucursales(req, res) {
    try {
      const result = await pool.query('SELECT * FROM canales_sucursales ORDER BY orden ASC, nombre ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener sucursales', details: error.message });
    }
  },

  async getCanalesPorGrilla(req, res) {
    const { id } = req.params;
    try {
      const grillaRes = await pool.query(`
        SELECT g.*, s.nombre as sucursal_nombre, s.localidad, s.provincia, s.codigo as sucursal_codigo
        FROM canales_grillas g
        JOIN canales_sucursales s ON s.id = g.sucursal_id
        WHERE g.id = $1
      `, [id]);

      if (grillaRes.rows.length === 0) {
        return res.status(404).json({ error: 'Grilla no encontrada' });
      }

      const canalesRes = await pool.query(`
        SELECT * FROM canales_items
        WHERE grilla_id = $1
        ORDER BY numero ASC
      `, [id]);

      res.json({
        grilla: grillaRes.rows[0],
        canales: canalesRes.rows
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener canales de la grilla', details: error.message });
    }
  },

  async crearSucursal(req, res) {
    let { nombre, localidad, provincia, codigo } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio' });
    }

    if (!codigo) {
      codigo = nombre.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    }

    try {
      const maxOrden = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 as next_orden FROM canales_sucursales');
      const nextOrden = maxOrden.rows[0].next_orden;

      const result = await pool.query(`
        INSERT INTO canales_sucursales (codigo, nombre, localidad, provincia, orden)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [codigo, nombre.trim(), localidad || '', provincia || '', nextOrden]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe una sucursal con ese código identificador' });
      }
      res.status(500).json({ error: 'Error al crear sucursal', details: error.message });
    }
  },

  async editarSucursal(req, res) {
    const { id } = req.params;
    const { nombre, localidad, provincia, codigo, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio' });
    }

    try {
      const result = await pool.query(`
        UPDATE canales_sucursales
        SET nombre = $1,
            localidad = COALESCE($2, localidad),
            provincia = COALESCE($3, provincia),
            codigo = COALESCE($4, codigo),
            activo = COALESCE($5, activo)
        WHERE id = $6
        RETURNING *
      `, [nombre.trim(), localidad, provincia, codigo, activo, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sucursal no encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar sucursal', details: error.message });
    }
  },

  async eliminarSucursal(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM canales_sucursales WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sucursal no encontrada' });
      }
      res.json({ message: 'Sucursal eliminada exitosamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar sucursal', details: error.message });
    }
  },

  async crearGrilla(req, res) {
    const { sucursal_id, tipo, nombre, imagen_url } = req.body;
    if (!sucursal_id || !tipo || !nombre) {
      return res.status(400).json({ error: 'Sucursal, tipo y nombre de grilla son obligatorios' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO canales_grillas (sucursal_id, tipo, nombre, imagen_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [sucursal_id, tipo.trim().toLowerCase(), nombre.trim(), imagen_url || '']);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ya existe una grilla de ese tipo en la sucursal seleccionada' });
      }
      res.status(500).json({ error: 'Error al crear grilla', details: error.message });
    }
  },

  async editarGrilla(req, res) {
    const { id } = req.params;
    const { tipo, nombre, imagen_url } = req.body;

    if (!tipo || !nombre) {
      return res.status(400).json({ error: 'Tipo y nombre son requeridos' });
    }

    try {
      const result = await pool.query(`
        UPDATE canales_grillas
        SET tipo = $1,
            nombre = $2,
            imagen_url = COALESCE($3, imagen_url)
        WHERE id = $4
        RETURNING *
      `, [tipo.trim().toLowerCase(), nombre.trim(), imagen_url, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Grilla no encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar grilla', details: error.message });
    }
  },

  async eliminarGrilla(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM canales_grillas WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Grilla no encontrada' });
      }
      res.json({ message: 'Grilla eliminada exitosamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar grilla', details: error.message });
    }
  },

  async crearCanal(req, res) {
    const { grilla_id, numero, nombre, logo, categoria } = req.body;
    if (!grilla_id || numero === undefined || !nombre) {
      return res.status(400).json({ error: 'Grilla, número y nombre del canal son obligatorios' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO canales_items (grilla_id, numero, nombre, logo, categoria)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [grilla_id, parseInt(numero, 10), nombre.trim(), logo || '', categoria || '']);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error al crear canal', details: error.message });
    }
  },

  async editarCanal(req, res) {
    const { id } = req.params;
    const { numero, nombre, logo, categoria } = req.body;

    if (numero === undefined || !nombre) {
      return res.status(400).json({ error: 'Número y nombre del canal son obligatorios' });
    }

    try {
      const result = await pool.query(`
        UPDATE canales_items
        SET numero = $1,
            nombre = $2,
            logo = COALESCE($3, logo),
            categoria = COALESCE($4, categoria)
        WHERE id = $5
        RETURNING *
      `, [parseInt(numero, 10), nombre.trim(), logo, categoria, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar canal', details: error.message });
    }
  },

  async eliminarCanal(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM canales_items WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Canal no encontrado' });
      }
      res.json({ message: 'Canal eliminado exitosamente' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar canal', details: error.message });
    }
  },

  async getLogosDisponibles(req, res) {
    try {
      const dir = path.join(__dirname, '../../assets/canales');
      if (!fs.existsSync(dir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(dir);
      const imageFiles = files.filter(f => /\.(png|jpe?g|webp|svg)$/i.test(f)).sort();
      res.json(imageFiles.map(f => ({
        nombre: f,
        url: `assets/canales/${f}`
      })));
    } catch (error) {
      res.status(500).json({ error: 'Error al listar logos', details: error.message });
    }
  },

  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }
      const url = `assets/canales/${req.file.filename}`;
      res.json({
        url,
        filename: req.file.filename
      });
    } catch (error) {
      res.status(500).json({ error: 'Error al subir imagen', details: error.message });
    }
  }
};

module.exports = canalesController;
