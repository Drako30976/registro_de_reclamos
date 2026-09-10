const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

// ==========================================
// SUCURSALES
// ==========================================
const getSucursales = async (req, res) => {
  try {
    const { todas } = req.query;
    const query = todas === 'true'
      ? 'SELECT * FROM sucursales ORDER BY id ASC'
      : 'SELECT * FROM sucursales WHERE activo = true ORDER BY nombre ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener sucursales:', error);
    res.status(500).json({ error: 'Error al consultar sucursales.' });
  }
};

const crearSucursal = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la sucursal es obligatorio.' });
    }

    const result = await pool.query(
      'INSERT INTO sucursales (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );

    await registrarAuditoria({
      accion: `Se creó la sucursal "${nombre.trim()}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'sucursales',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear sucursal:', error);
    res.status(500).json({ error: 'Error al registrar la sucursal.' });
  }
};

const actualizarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    const actual = await pool.query('SELECT * FROM sucursales WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    const result = await pool.query(
      `UPDATE sucursales 
       SET nombre = COALESCE($1, nombre), 
           activo = COALESCE($2, activo) 
       WHERE id = $3 RETURNING *`,
      [nombre ? nombre.trim() : null, activo !== undefined ? activo : null, id]
    );

    await registrarAuditoria({
      accion: `Se modificó la sucursal "${actual.rows[0].nombre}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'sucursales',
      registro_id: id,
      datos_anteriores: actual.rows[0],
      datos_nuevos: result.rows[0]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar sucursal:', error);
    res.status(500).json({ error: 'Error al actualizar la sucursal.' });
  }
};

const eliminarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const actual = await pool.query('SELECT * FROM sucursales WHERE id = $1', [id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    // Verificar si está en uso en reclamos
    const enUso = await pool.query('SELECT 1 FROM reclamos WHERE sucursal_id = $1 LIMIT 1', [id]);
    if (enUso.rows.length > 0) {
      // Si está en uso, se desactiva lógicamente para no romper integridad histórica
      await pool.query('UPDATE sucursales SET activo = false WHERE id = $1', [id]);
    } else {
      await pool.query('DELETE FROM sucursales WHERE id = $1', [id]);
    }

    await registrarAuditoria({
      accion: `Se eliminó la sucursal "${actual.rows[0].nombre}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'sucursales',
      registro_id: id,
      datos_anteriores: actual.rows[0]
    });

    res.json({ message: 'Sucursal eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar sucursal:', error);
    res.status(500).json({ error: 'Error al eliminar la sucursal.' });
  }
};

// ==========================================
// ESTRUCTURA JERÁRQUICA (ÁRBOL COMPLETO)
// ==========================================
const getArbolEstructura = async (req, res) => {
  try {
    // Obtenemos todos los elementos activos
    const tipos = await pool.query('SELECT * FROM tipos_consulta WHERE activo = true ORDER BY id ASC');
    const caracteristicas = await pool.query('SELECT * FROM caracteristicas_consulta WHERE activo = true ORDER BY id ASC');
    const definiciones = await pool.query('SELECT * FROM definiciones_consulta WHERE activo = true ORDER BY id ASC');
    const finalizaciones = await pool.query('SELECT * FROM finalizaciones WHERE activo = true ORDER BY id ASC');

    // Indexamos finalizaciones por definicion_id
    const finPorDef = {};
    finalizaciones.rows.forEach(f => {
      const defId = f.definicion_id || 0;
      if (!finPorDef[defId]) finPorDef[defId] = [];
      finPorDef[defId].push(f);
    });

    // Indexamos definiciones por caracteristica_id y les añadimos sus finalizaciones
    const defPorCaract = {};
    definiciones.rows.forEach(d => {
      d.finalizaciones = finPorDef[d.id] || [];
      if (!defPorCaract[d.caracteristica_id]) defPorCaract[d.caracteristica_id] = [];
      defPorCaract[d.caracteristica_id].push(d);
    });

    // Indexamos características por tipo_consulta_id y les añadimos sus definiciones
    const carPorTipo = {};
    caracteristicas.rows.forEach(c => {
      c.definiciones = defPorCaract[c.id] || [];
      if (!carPorTipo[c.tipo_consulta_id]) carPorTipo[c.tipo_consulta_id] = [];
      carPorTipo[c.tipo_consulta_id].push(c);
    });

    // Armamos el árbol final con tipos
    const arbol = tipos.rows.map(t => ({
      ...t,
      caracteristicas: carPorTipo[t.id] || []
    }));

    res.json(arbol);
  } catch (error) {
    console.error('Error al obtener árbol de estructura:', error);
    res.status(500).json({ error: 'Error al consultar la estructura de consultas.' });
  }
};

// ==========================================
// CRUD MANUAL DE NODOS DE ESTRUCTURA
// ==========================================
const guardarElementoEstructura = async (req, res) => {
  try {
    const { nivel, parent_id, contenido, descripcion } = req.body;
    if (!nivel || !contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'Nivel y contenido son obligatorios.' });
    }

    let result;
    const cleanContent = contenido.trim();
    const cleanDesc = descripcion ? descripcion.trim() : '';

    if (nivel === 'tipo') {
      result = await pool.query(
        'INSERT INTO tipos_consulta (contenido, descripcion) VALUES ($1, $2) RETURNING *',
        [cleanContent, cleanDesc]
      );
    } else if (nivel === 'caracteristica') {
      if (!parent_id) return res.status(400).json({ error: 'Falta tipo_consulta_id (parent_id).' });
      result = await pool.query(
        'INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido, descripcion) VALUES ($1, $2, $3) RETURNING *',
        [parent_id, cleanContent, cleanDesc]
      );
    } else if (nivel === 'definicion') {
      if (!parent_id) return res.status(400).json({ error: 'Falta caracteristica_id (parent_id).' });
      result = await pool.query(
        'INSERT INTO definiciones_consulta (caracteristica_id, contenido, descripcion) VALUES ($1, $2, $3) RETURNING *',
        [parent_id, cleanContent, cleanDesc]
      );
    } else if (nivel === 'finalizacion') {
      if (!parent_id) return res.status(400).json({ error: 'Falta definicion_id (parent_id).' });
      result = await pool.query(
        'INSERT INTO finalizaciones (definicion_id, contenido, descripcion) VALUES ($1, $2, $3) RETURNING *',
        [parent_id, cleanContent, cleanDesc]
      );
    } else {
      return res.status(400).json({ error: 'Nivel no válido.' });
    }

    await registrarAuditoria({
      accion: `Se creó en estructura [${nivel}]: "${cleanContent}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'estructura',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al guardar elemento de estructura:', error);
    res.status(500).json({ error: 'Error al registrar el elemento.' });
  }
};

const actualizarElementoEstructura = async (req, res) => {
  try {
    const { nivel, id } = req.params;
    const { contenido, descripcion, activo } = req.body;

    const tablas = {
      tipo: 'tipos_consulta',
      caracteristica: 'caracteristicas_consulta',
      definicion: 'definiciones_consulta',
      finalizacion: 'finalizaciones'
    };

    const tabla = tablas[nivel];
    if (!tabla) return res.status(400).json({ error: 'Nivel no válido.' });

    const prev = await pool.query(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);
    if (prev.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado.' });

    const result = await pool.query(
      `UPDATE ${tabla}
       SET contenido = COALESCE($1, contenido),
           descripcion = COALESCE($2, descripcion),
           activo = COALESCE($3, activo)
       WHERE id = $4 RETURNING *`,
      [
        contenido ? contenido.trim() : null,
        descripcion !== undefined ? descripcion.trim() : null,
        activo !== undefined ? activo : null,
        id
      ]
    );

    await registrarAuditoria({
      accion: `Se modificó en estructura [${nivel}]: "${prev.rows[0].contenido}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'estructura',
      registro_id: id,
      datos_anteriores: prev.rows[0],
      datos_nuevos: result.rows[0]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar elemento de estructura:', error);
    res.status(500).json({ error: 'Error al actualizar.' });
  }
};

const eliminarElementoEstructura = async (req, res) => {
  try {
    const { nivel, id } = req.params;
    const tablas = {
      tipo: 'tipos_consulta',
      caracteristica: 'caracteristicas_consulta',
      definicion: 'definiciones_consulta',
      finalizacion: 'finalizaciones'
    };

    const tabla = tablas[nivel];
    if (!tabla) return res.status(400).json({ error: 'Nivel no válido.' });

    const prev = await pool.query(`SELECT * FROM ${tabla} WHERE id = $1`, [id]);
    if (prev.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado.' });

    // Desactivación lógica o borrado en cascada
    await pool.query(`DELETE FROM ${tabla} WHERE id = $1`, [id]);

    await registrarAuditoria({
      accion: `Se eliminó en estructura [${nivel}]: "${prev.rows[0].contenido}"`,
      usuario_id: req.user.id,
      usuario_nombre: req.user.usuario,
      entidad: 'estructura',
      registro_id: id,
      datos_anteriores: prev.rows[0]
    });

    res.json({ message: 'Elemento eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar elemento de estructura:', error);
    res.status(500).json({ error: 'Error al eliminar. Es posible que existan reclamos vinculados.' });
  }
};

module.exports = {
  getSucursales,
  crearSucursal,
  actualizarSucursal,
  eliminarSucursal,
  getArbolEstructura,
  guardarElementoEstructura,
  actualizarElementoEstructura,
  eliminarElementoEstructura
};
