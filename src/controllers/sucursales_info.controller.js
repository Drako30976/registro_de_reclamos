const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { registrarAuditoria } = require('../middlewares/audit');

const uploadDir = path.join(__dirname, '../../uploads/sucursales');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `sucursal-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const getSucursalesInfo = async (req, res) => {
  try {
    const { todas } = req.query;
    const whereClause = todas === 'true' ? '' : 'WHERE s.activo = true';

    const result = await pool.query(`
      SELECT 
        s.id,
        s.nombre,
        s.localidad,
        s.direccion,
        s.horario_atencion,
        s.logo,
        s.coordenadas_link,
        s.activo,
        (SELECT COUNT(*) FROM sucursales_precios sp WHERE sp.sucursal_id = s.id AND sp.activo = true) AS total_precios,
        (SELECT COUNT(*) FROM sucursales_promociones spr WHERE spr.sucursal_id = s.id AND spr.estado = 'Activo') AS total_promos
      FROM sucursales s
      ${whereClause}
      ORDER BY s.nombre ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener sucursales info:', error);
    res.status(500).json({ error: 'Error al consultar sucursales.' });
  }
};

const getSucursalDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const sucRes = await pool.query('SELECT * FROM sucursales WHERE id = $1', [id]);
    if (sucRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    const preciosRes = await pool.query(`
      SELECT * 
      FROM sucursales_precios 
      WHERE sucursal_id = $1 AND activo = true 
      ORDER BY tipo_servicio ASC, codigo ASC
    `, [id]);

    const promosRes = await pool.query(`
      SELECT 
        pr.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'precio_id', c.precio_id,
              'nombre_concepto', c.nombre_concepto,
              'precio_base', c.precio_base,
              'bonificacion', c.bonificacion,
              'precio_final', c.precio_final,
              'orden', c.orden
            ) ORDER BY c.orden ASC
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS conceptos
      FROM sucursales_promociones pr
      LEFT JOIN sucursales_promociones_conceptos c ON pr.id = c.promocion_id
      WHERE pr.sucursal_id = $1
      GROUP BY pr.id
      ORDER BY pr.estado ASC, pr.created_at DESC
    `, [id]);

    res.json({
      sucursal: sucRes.rows[0],
      precios: preciosRes.rows,
      promociones: promosRes.rows
    });
  } catch (error) {
    console.error('Error al obtener detalle de sucursal:', error);
    res.status(500).json({ error: 'Error al consultar detalle de sucursal.' });
  }
};

const crearSucursal = async (req, res) => {
  try {
    const { nombre, localidad, direccion, horario_atencion, coordenadas_link } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio.' });
    }

    let logoRuta = null;
    if (req.file) {
      logoRuta = `/uploads/sucursales/${req.file.filename}`;
    }

    const result = await pool.query(`
      INSERT INTO sucursales (nombre, localidad, direccion, horario_atencion, logo, coordenadas_link, activo)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [
      nombre.trim(),
      localidad ? localidad.trim() : null,
      direccion ? direccion.trim() : null,
      horario_atencion ? horario_atencion.trim() : null,
      logoRuta,
      coordenadas_link ? coordenadas_link.trim() : null
    ]);

    await registrarAuditoria({
      accion: `Se creó la sucursal "${nombre.trim()}" con ficha completa`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'sucursales',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear sucursal info:', error);
    res.status(500).json({ error: 'Error al crear la sucursal.' });
  }
};

const actualizarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, localidad, direccion, horario_atencion, coordenadas_link, activo } = req.body;

    const actual = await pool.query('SELECT * FROM sucursales WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    let logoRuta = actual.rows[0].logo;
    if (req.file) {
      logoRuta = `/uploads/sucursales/${req.file.filename}`;
    }

    const result = await pool.query(`
      UPDATE sucursales 
      SET nombre = COALESCE($1, nombre),
          localidad = COALESCE($2, localidad),
          direccion = COALESCE($3, direccion),
          horario_atencion = COALESCE($4, horario_atencion),
          logo = COALESCE($5, logo),
          coordenadas_link = COALESCE($6, coordenadas_link),
          activo = COALESCE($7, activo)
      WHERE id = $8
      RETURNING *
    `, [
      nombre ? nombre.trim() : null,
      localidad !== undefined ? (localidad ? localidad.trim() : null) : null,
      direccion !== undefined ? (direccion ? direccion.trim() : null) : null,
      horario_atencion !== undefined ? (horario_atencion ? horario_atencion.trim() : null) : null,
      logoRuta,
      coordenadas_link !== undefined ? (coordenadas_link ? coordenadas_link.trim() : null) : null,
      activo !== undefined ? (activo === 'true' || activo === true) : null,
      id
    ]);

    await registrarAuditoria({
      accion: `Se actualizó la información de la sucursal "${actual.rows[0].nombre}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'sucursales',
      registro_id: id,
      datos_anteriores: actual.rows[0],
      datos_nuevos: result.rows[0]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar sucursal info:', error);
    res.status(500).json({ error: 'Error al actualizar la sucursal.' });
  }
};

const crearPrecio = async (req, res) => {
  try {
    const { sucursal_id, tipo_servicio, codigo, nombre_concepto, costo } = req.body;

    if (!sucursal_id || !tipo_servicio || !codigo || !nombre_concepto || costo === undefined) {
      return res.status(400).json({ error: 'Todos los campos de precio son obligatorios.' });
    }

    const result = await pool.query(`
      INSERT INTO sucursales_precios (sucursal_id, tipo_servicio, codigo, nombre_concepto, costo, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [
      parseInt(sucursal_id, 10),
      tipo_servicio.trim(),
      codigo.trim().toUpperCase(),
      nombre_concepto.trim(),
      parseFloat(costo)
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear precio:', error);
    res.status(500).json({ error: 'Error al registrar precio.' });
  }
};

const actualizarPrecio = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_servicio, codigo, nombre_concepto, costo, activo } = req.body;

    const result = await pool.query(`
      UPDATE sucursales_precios
      SET tipo_servicio = COALESCE($1, tipo_servicio),
          codigo = COALESCE($2, codigo),
          nombre_concepto = COALESCE($3, nombre_concepto),
          costo = COALESCE($4, costo),
          activo = COALESCE($5, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      tipo_servicio ? tipo_servicio.trim() : null,
      codigo ? codigo.trim().toUpperCase() : null,
      nombre_concepto ? nombre_concepto.trim() : null,
      costo !== undefined ? parseFloat(costo) : null,
      activo !== undefined ? activo : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Precio no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar precio:', error);
    res.status(500).json({ error: 'Error al actualizar precio.' });
  }
};

const eliminarPrecio = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM sucursales_precios WHERE id = $1', [id]);
    res.json({ message: 'Precio eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar precio:', error);
    res.status(500).json({ error: 'Error al eliminar precio.' });
  }
};

const crearPromocion = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      sucursal_id,
      nombre,
      estado,
      zona_barrio,
      duracion,
      instalacion_bonificada,
      costo_instalacion,
      fecha_vencimiento,
      observaciones,
      conceptos
    } = req.body;

    if (!sucursal_id || !nombre || !zona_barrio || !duracion) {
      return res.status(400).json({ error: 'Los datos principales de la promoción son requeridos.' });
    }

    await client.query('BEGIN');

    const promoRes = await client.query(`
      INSERT INTO sucursales_promociones (
        sucursal_id, nombre, estado, zona_barrio, duracion,
        instalacion_bonificada, costo_instalacion, fecha_vencimiento, observaciones
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      parseInt(sucursal_id, 10),
      nombre.trim(),
      estado || 'Activo',
      zona_barrio.trim(),
      duracion.trim(),
      instalacion_bonificada !== undefined ? Boolean(instalacion_bonificada) : true,
      costo_instalacion ? parseFloat(costo_instalacion) : 0,
      fecha_vencimiento || null,
      observaciones ? observaciones.trim() : null
    ]);

    const nuevaPromo = promoRes.rows[0];

    const conceptosGuardados = [];
    if (Array.isArray(conceptos) && conceptos.length > 0) {
      for (let i = 0; i < conceptos.length; i++) {
        const c = conceptos[i];
        const pBase = parseFloat(c.precio_base) || 0;
        const bonif = parseFloat(c.bonificacion) || 0;
        const pFinal = c.precio_final !== undefined ? parseFloat(c.precio_final) : (pBase - bonif);

        const cRes = await client.query(`
          INSERT INTO sucursales_promociones_conceptos (
            promocion_id, precio_id, nombre_concepto, precio_base, bonificacion, precio_final, orden
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          nuevaPromo.id,
          c.precio_id ? parseInt(c.precio_id, 10) : null,
          c.nombre_concepto.trim(),
          pBase,
          bonif,
          pFinal,
          i + 1
        ]);
        conceptosGuardados.push(cRes.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...nuevaPromo,
      conceptos: conceptosGuardados
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear promoción:', error);
    res.status(500).json({ error: 'Error al registrar promoción.' });
  } finally {
    client.release();
  }
};

const actualizarPromocion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      nombre,
      estado,
      zona_barrio,
      duracion,
      instalacion_bonificada,
      costo_instalacion,
      fecha_vencimiento,
      observaciones,
      conceptos
    } = req.body;

    await client.query('BEGIN');

    const promoRes = await client.query(`
      UPDATE sucursales_promociones
      SET nombre = COALESCE($1, nombre),
          estado = COALESCE($2, estado),
          zona_barrio = COALESCE($3, zona_barrio),
          duracion = COALESCE($4, duracion),
          instalacion_bonificada = COALESCE($5, instalacion_bonificada),
          costo_instalacion = COALESCE($6, costo_instalacion),
          fecha_vencimiento = COALESCE($7, fecha_vencimiento),
          observaciones = COALESCE($8, observaciones),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      nombre ? nombre.trim() : null,
      estado || null,
      zona_barrio ? zona_barrio.trim() : null,
      duracion ? duracion.trim() : null,
      instalacion_bonificada !== undefined ? Boolean(instalacion_bonificada) : null,
      costo_instalacion !== undefined ? parseFloat(costo_instalacion) : null,
      fecha_vencimiento !== undefined ? fecha_vencimiento : null,
      observaciones !== undefined ? observaciones : null,
      id
    ]);

    if (promoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Promoción no encontrada.' });
    }

    if (Array.isArray(conceptos)) {
      await client.query('DELETE FROM sucursales_promociones_conceptos WHERE promocion_id = $1', [id]);
      for (let i = 0; i < conceptos.length; i++) {
        const c = conceptos[i];
        const pBase = parseFloat(c.precio_base) || 0;
        const bonif = parseFloat(c.bonificacion) || 0;
        const pFinal = c.precio_final !== undefined ? parseFloat(c.precio_final) : (pBase - bonif);

        await client.query(`
          INSERT INTO sucursales_promociones_conceptos (
            promocion_id, precio_id, nombre_concepto, precio_base, bonificacion, precio_final, orden
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          id,
          c.precio_id ? parseInt(c.precio_id, 10) : null,
          c.nombre_concepto.trim(),
          pBase,
          bonif,
          pFinal,
          i + 1
        ]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Promoción actualizada con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar promoción:', error);
    res.status(500).json({ error: 'Error al actualizar promoción.' });
  } finally {
    client.release();
  }
};

const eliminarPromocion = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM sucursales_promociones WHERE id = $1', [id]);
    res.json({ message: 'Promoción eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar promoción:', error);
    res.status(500).json({ error: 'Error al eliminar promoción.' });
  }
};

module.exports = {
  upload,
  getSucursalesInfo,
  getSucursalDetalle,
  crearSucursal,
  actualizarSucursal,
  crearPrecio,
  actualizarPrecio,
  eliminarPrecio,
  crearPromocion,
  actualizarPromocion,
  eliminarPromocion
};
