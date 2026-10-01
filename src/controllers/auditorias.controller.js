const pool = require('../config/db');
const { registrarAuditoria } = require('../middlewares/audit');

const getCanales = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, activo FROM canales_atencion WHERE activo = true ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener canales de atención:', error);
    res.status(500).json({ error: 'Error al obtener los canales de atención.' });
  }
};

const getCriterios = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, 
        c.nombre, 
        c.descripcion, 
        c.orden, 
        c.activo,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'nombre', s.nombre,
              'puntaje_maximo', s.puntaje_maximo::float,
              'orden', s.orden,
              'activo', s.activo
            ) ORDER BY s.orden, s.id
          ) FILTER (WHERE s.id IS NOT NULL AND s.activo = true),
          '[]'
        ) AS subcriterios
      FROM auditoria_criterios c
      LEFT JOIN auditoria_subcriterios s ON c.id = s.criterio_id AND s.activo = true
      WHERE c.activo = true
      GROUP BY c.id, c.nombre, c.descripcion, c.orden, c.activo
      ORDER BY c.orden, c.id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener criterios de auditoría:', error);
    res.status(500).json({ error: 'Error al obtener los criterios de auditoría.' });
  }
};

const getCriteriosAdmin = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, 
        c.nombre, 
        c.descripcion, 
        c.orden, 
        c.activo,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'nombre', s.nombre,
              'puntaje_maximo', s.puntaje_maximo::float,
              'orden', s.orden,
              'activo', s.activo
            ) ORDER BY s.orden, s.id
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) AS subcriterios
      FROM auditoria_criterios c
      LEFT JOIN auditoria_subcriterios s ON c.id = s.criterio_id
      GROUP BY c.id, c.nombre, c.descripcion, c.orden, c.activo
      ORDER BY c.orden, c.id;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener administración de criterios:', error);
    res.status(500).json({ error: 'Error al obtener criterios y subcriterios.' });
  }
};

const crearCriterio = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del criterio es obligatorio.' });
    }

    const maxOrdenRes = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM auditoria_criterios');
    const orden = maxOrdenRes.rows[0].next_orden;

    const result = await pool.query(
      `INSERT INTO auditoria_criterios (nombre, descripcion, orden, activo)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [nombre.trim(), descripcion ? descripcion.trim() : '', orden]
    );

    await registrarAuditoria({
      accion: 'CREAR_CRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_criterios',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear criterio:', error);
    res.status(500).json({ error: 'Error al crear el criterio.' });
  }
};

const modificarCriterio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del criterio es obligatorio.' });
    }

    const anteriorRes = await pool.query('SELECT * FROM auditoria_criterios WHERE id = $1', [id]);
    if (anteriorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio no encontrado.' });
    }

    const result = await pool.query(
      `UPDATE auditoria_criterios 
       SET nombre = $1, 
           descripcion = $2, 
           activo = COALESCE($3, activo)
       WHERE id = $4 
       RETURNING *`,
      [
        nombre.trim(),
        descripcion !== undefined ? descripcion.trim() : anteriorRes.rows[0].descripcion,
        activo !== undefined ? activo : anteriorRes.rows[0].activo,
        id
      ]
    );

    await registrarAuditoria({
      accion: 'MODIFICAR_CRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_criterios',
      registro_id: id,
      datos_anteriores: anteriorRes.rows[0],
      datos_nuevos: result.rows[0]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al modificar criterio:', error);
    res.status(500).json({ error: 'Error al actualizar el criterio.' });
  }
};

const eliminarCriterio = async (req, res) => {
  try {
    const { id } = req.params;

    const anteriorRes = await pool.query('SELECT * FROM auditoria_criterios WHERE id = $1', [id]);
    if (anteriorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio no encontrado.' });
    }

    const enUsoRes = await pool.query('SELECT 1 FROM auditorias_calidad_detalle WHERE criterio_id = $1 LIMIT 1', [id]);
    
    if (enUsoRes.rows.length > 0) {
      await pool.query('UPDATE auditoria_criterios SET activo = false WHERE id = $1', [id]);
      await pool.query('UPDATE auditoria_subcriterios SET activo = false WHERE criterio_id = $1', [id]);
      
      await registrarAuditoria({
        accion: 'DESACTIVAR_CRITERIO_AUDITORIA',
        usuario_id: req.user.id,
        usuario_nombre: req.user.nombre_completo,
        entidad: 'auditoria_criterios',
        registro_id: id,
        datos_anteriores: anteriorRes.rows[0],
        datos_nuevos: { activo: false }
      });

      return res.json({ 
        mensaje: 'El criterio posee auditorías históricas asociadas. Se ha desactivado para conservar la integridad de los reportes anteriores.',
        desactivado: true 
      });
    }

    await pool.query('DELETE FROM auditoria_criterios WHERE id = $1', [id]);

    await registrarAuditoria({
      accion: 'ELIMINAR_CRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_criterios',
      registro_id: id,
      datos_anteriores: anteriorRes.rows[0]
    });

    res.json({ mensaje: 'Criterio y sus subcriterios eliminados correctamente.' });
  } catch (error) {
    console.error('Error al eliminar criterio:', error);
    res.status(500).json({ error: 'Error al eliminar el criterio.' });
  }
};

const crearSubcriterio = async (req, res) => {
  try {
    const { criterio_id, nombre, puntaje_maximo } = req.body;

    if (!criterio_id || !nombre || !nombre.trim() || puntaje_maximo === undefined) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios (criterio, nombre y puntaje máximo).' });
    }

    const numPuntaje = parseFloat(puntaje_maximo);
    if (isNaN(numPuntaje) || numPuntaje <= 0) {
      return res.status(400).json({ error: 'El puntaje máximo debe ser un número mayor a cero.' });
    }

    const maxOrdenRes = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM auditoria_subcriterios WHERE criterio_id = $1',
      [criterio_id]
    );
    const orden = maxOrdenRes.rows[0].next_orden;

    const result = await pool.query(
      `INSERT INTO auditoria_subcriterios (criterio_id, nombre, puntaje_maximo, orden, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [criterio_id, nombre.trim(), numPuntaje, orden]
    );

    await registrarAuditoria({
      accion: 'CREAR_SUBCRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_subcriterios',
      registro_id: result.rows[0].id,
      datos_nuevos: result.rows[0]
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear subcriterio:', error);
    res.status(500).json({ error: 'Error al crear el subcriterio.' });
  }
};

const modificarSubcriterio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, puntaje_maximo, activo } = req.body;

    if (!nombre || !nombre.trim() || puntaje_maximo === undefined) {
      return res.status(400).json({ error: 'El nombre y puntaje máximo son obligatorios.' });
    }

    const numPuntaje = parseFloat(puntaje_maximo);
    if (isNaN(numPuntaje) || numPuntaje <= 0) {
      return res.status(400).json({ error: 'El puntaje máximo debe ser un número mayor a cero.' });
    }

    const anteriorRes = await pool.query('SELECT * FROM auditoria_subcriterios WHERE id = $1', [id]);
    if (anteriorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subcriterio no encontrado.' });
    }

    const result = await pool.query(
      `UPDATE auditoria_subcriterios 
       SET nombre = $1, 
           puntaje_maximo = $2,
           activo = COALESCE($3, activo)
       WHERE id = $4 
       RETURNING *`,
      [
        nombre.trim(),
        numPuntaje,
        activo !== undefined ? activo : anteriorRes.rows[0].activo,
        id
      ]
    );

    await registrarAuditoria({
      accion: 'MODIFICAR_SUBCRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_subcriterios',
      registro_id: id,
      datos_anteriores: anteriorRes.rows[0],
      datos_nuevos: result.rows[0]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al modificar subcriterio:', error);
    res.status(500).json({ error: 'Error al actualizar el subcriterio.' });
  }
};

const eliminarSubcriterio = async (req, res) => {
  try {
    const { id } = req.params;

    const anteriorRes = await pool.query('SELECT * FROM auditoria_subcriterios WHERE id = $1', [id]);
    if (anteriorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subcriterio no encontrado.' });
    }

    const enUsoRes = await pool.query('SELECT 1 FROM auditorias_calidad_detalle WHERE subcriterio_id = $1 LIMIT 1', [id]);

    if (enUsoRes.rows.length > 0) {
      await pool.query('UPDATE auditoria_subcriterios SET activo = false WHERE id = $1', [id]);

      await registrarAuditoria({
        accion: 'DESACTIVAR_SUBCRITERIO_AUDITORIA',
        usuario_id: req.user.id,
        usuario_nombre: req.user.nombre_completo,
        entidad: 'auditoria_subcriterios',
        registro_id: id,
        datos_anteriores: anteriorRes.rows[0],
        datos_nuevos: { activo: false }
      });

      return res.json({ 
        mensaje: 'El subcriterio tiene auditorías históricas asociadas. Se ha desactivado para proteger el historial.',
        desactivado: true 
      });
    }

    await pool.query('DELETE FROM auditoria_subcriterios WHERE id = $1', [id]);

    await registrarAuditoria({
      accion: 'ELIMINAR_SUBCRITERIO_AUDITORIA',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditoria_subcriterios',
      registro_id: id,
      datos_anteriores: anteriorRes.rows[0]
    });

    res.json({ mensaje: 'Subcriterio eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar subcriterio:', error);
    res.status(500).json({ error: 'Error al eliminar el subcriterio.' });
  }
};

const crearAuditoria = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      fecha,
      asesor_id,
      canal_id,
      referencia,
      error_critico,
      comentario_error_critico,
      observaciones_generales,
      detalles
    } = req.body;

    if (!asesor_id || !canal_id || !referencia || !referencia.trim()) {
      return res.status(400).json({ error: 'Asesor, Canal y Número/ID de referencia son obligatorios.' });
    }

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: 'Debe ingresar al menos un criterio evaluado.' });
    }

    if (error_critico && (!comentario_error_critico || !comentario_error_critico.trim())) {
      return res.status(400).json({ error: 'Si se marca Error Crítico, debe detallar el motivo (hasta 100 caracteres).' });
    }

    const auditor_id = req.user.id;
    const refLimpia = referencia.trim().substring(0, 15);

    let puntajeMaximoTotal = 0;
    let puntajeObtenidoTotal = 0;

    for (const item of detalles) {
      const pm = parseFloat(item.puntaje_maximo) || 0;
      if (item.evaluacion !== 'No aplica') {
        puntajeMaximoTotal += pm;
        if (item.evaluacion === 'Cumple') {
          puntajeObtenidoTotal += pm;
        }
      }
    }

    let porcentajeCalidad = 0;
    if (puntajeMaximoTotal > 0) {
      porcentajeCalidad = Math.ceil((puntajeObtenidoTotal / puntajeMaximoTotal) * 100);
    }

    let resultado = 'CRÍTICO';
    if (porcentajeCalidad >= 90) {
      resultado = 'EXCELENTE';
    } else if (porcentajeCalidad >= 80) {
      resultado = 'MUY BUENO';
    } else if (porcentajeCalidad >= 70) {
      resultado = 'BUENO';
    } else if (porcentajeCalidad >= 60) {
      resultado = 'A MEJORAR';
    }

    await client.query('BEGIN');

    const auditInsertQuery = `
      INSERT INTO auditorias_calidad 
        (fecha, asesor_id, auditor_id, canal_id, referencia, puntaje_maximo, puntaje_obtenido, 
         porcentaje_calidad, resultado, error_critico, comentario_error_critico, observaciones_generales)
      VALUES 
        (COALESCE($1::timestamptz, CURRENT_TIMESTAMP), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const auditRes = await client.query(auditInsertQuery, [
      fecha || null,
      asesor_id,
      auditor_id,
      canal_id,
      refLimpia,
      puntajeMaximoTotal,
      puntajeObtenidoTotal,
      porcentajeCalidad,
      resultado,
      !!error_critico,
      error_critico ? comentario_error_critico.trim().substring(0, 100) : null,
      observaciones_generales ? observaciones_generales.trim() : null
    ]);

    const auditoriaCreada = auditRes.rows[0];

    const detalleQuery = `
      INSERT INTO auditorias_calidad_detalle
        (auditoria_id, criterio_id, subcriterio_id, criterio_nombre, subcriterio_nombre, 
         puntaje_maximo, evaluacion, puntaje_obtenido, observacion)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `;

    for (const d of detalles) {
      const pm = parseFloat(d.puntaje_maximo) || 0;
      let po = 0;
      if (d.evaluacion === 'Cumple') {
        po = pm;
      }
      const obs = d.observacion ? d.observacion.toString().trim().substring(0, 250) : null;

      await client.query(detalleQuery, [
        auditoriaCreada.id,
        d.criterio_id,
        d.subcriterio_id,
        d.criterio_nombre,
        d.subcriterio_nombre,
        pm,
        d.evaluacion,
        po,
        obs
      ]);
    }

    await client.query('COMMIT');

    await registrarAuditoria({
      accion: 'REGISTRAR_AUDITORIA_CALIDAD',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditorias_calidad',
      registro_id: auditoriaCreada.id,
      datos_nuevos: {
        id: auditoriaCreada.id,
        asesor_id,
        referencia: refLimpia,
        porcentaje_calidad: porcentajeCalidad,
        resultado,
        error_critico: !!error_critico
      }
    });

    res.status(201).json(auditoriaCreada);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar auditoría de calidad:', error);
    res.status(500).json({ error: 'Error al registrar la auditoría de calidad.' });
  } finally {
    client.release();
  }
};

const getHistorialAuditorias = async (req, res) => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      auditor_id,
      asesor_id,
      canal_id,
      resultado
    } = req.query;

    let query = `
      SELECT 
        ac.id,
        ac.fecha,
        TO_CHAR(ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fmt,
        ac.asesor_id,
        u_ase.nombre_completo AS asesor_nombre,
        ac.auditor_id,
        u_aud.nombre_completo AS auditor_nombre,
        ac.canal_id,
        ca.nombre AS canal_nombre,
        ac.referencia,
        ac.puntaje_maximo::float AS puntaje_maximo,
        ac.puntaje_obtenido::float AS puntaje_obtenido,
        ac.porcentaje_calidad::float AS porcentaje_calidad,
        ac.resultado,
        ac.error_critico,
        ac.comentario_error_critico,
        ac.observaciones_generales,
        ac.created_at
      FROM auditorias_calidad ac
      JOIN usuarios u_ase ON ac.asesor_id = u_ase.id
      JOIN usuarios u_aud ON ac.auditor_id = u_aud.id
      JOIN canales_atencion ca ON ac.canal_id = ca.id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (fecha_desde) {
      query += ` AND (ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= $${paramIndex++}::date`;
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND (ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= $${paramIndex++}::date`;
      values.push(fecha_hasta);
    }

    if (auditor_id) {
      query += ` AND ac.auditor_id = $${paramIndex++}`;
      values.push(parseInt(auditor_id, 10));
    }

    if (asesor_id) {
      query += ` AND ac.asesor_id = $${paramIndex++}`;
      values.push(parseInt(asesor_id, 10));
    }

    if (canal_id) {
      query += ` AND ac.canal_id = $${paramIndex++}`;
      values.push(parseInt(canal_id, 10));
    }

    if (resultado) {
      query += ` AND ac.resultado = $${paramIndex++}`;
      values.push(resultado);
    }

    query += ` ORDER BY ac.fecha DESC, ac.id DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar historial de auditorías:', error);
    res.status(500).json({ error: 'Error al consultar el historial de auditorías.' });
  }
};

const getAuditoriaById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryHeader = `
      SELECT 
        ac.id,
        ac.fecha,
        TO_CHAR(ac.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS fecha_fmt,
        ac.asesor_id,
        u_ase.nombre_completo AS asesor_nombre,
        ac.auditor_id,
        u_aud.nombre_completo AS auditor_nombre,
        ac.canal_id,
        ca.nombre AS canal_nombre,
        ac.referencia,
        ac.puntaje_maximo::float AS puntaje_maximo,
        ac.puntaje_obtenido::float AS puntaje_obtenido,
        ac.porcentaje_calidad::float AS porcentaje_calidad,
        ac.resultado,
        ac.error_critico,
        ac.comentario_error_critico,
        ac.observaciones_generales,
        ac.created_at
      FROM auditorias_calidad ac
      JOIN usuarios u_ase ON ac.asesor_id = u_ase.id
      JOIN usuarios u_aud ON ac.auditor_id = u_aud.id
      JOIN canales_atencion ca ON ac.canal_id = ca.id
      WHERE ac.id = $1
    `;

    const headerRes = await pool.query(queryHeader, [id]);
    if (headerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada.' });
    }

    const detallesQuery = `
      SELECT 
        d.id,
        d.criterio_id,
        d.subcriterio_id,
        d.criterio_nombre,
        d.subcriterio_nombre,
        d.puntaje_maximo::float AS puntaje_maximo,
        d.evaluacion,
        d.puntaje_obtenido::float AS puntaje_obtenido,
        d.observacion
      FROM auditorias_calidad_detalle d
      WHERE d.auditoria_id = $1
      ORDER BY d.id ASC;
    `;

    const detallesRes = await pool.query(detallesQuery, [id]);

    const auditoria = headerRes.rows[0];
    auditoria.detalles = detallesRes.rows;

    res.json(auditoria);
  } catch (error) {
    console.error('Error al obtener detalle de auditoría:', error);
    res.status(500).json({ error: 'Error al obtener el detalle de la auditoría.' });
  }
};

const eliminarAuditoria = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol !== 'Admin') {
      return res.status(403).json({ error: 'Sólo los usuarios Administradores tienen permisos para eliminar auditorías.' });
    }

    const anteriorRes = await pool.query('SELECT * FROM auditorias_calidad WHERE id = $1', [id]);
    if (anteriorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada.' });
    }

    await pool.query('DELETE FROM auditorias_calidad WHERE id = $1', [id]);

    await registrarAuditoria({
      accion: 'ELIMINAR_AUDITORIA_CALIDAD',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      entidad: 'auditorias_calidad',
      registro_id: id,
      datos_anteriores: anteriorRes.rows[0]
    });

    res.json({ mensaje: 'Auditoría eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar auditoría:', error);
    res.status(500).json({ error: 'Error al eliminar la auditoría.' });
  }
};

module.exports = {
  getCanales,
  getCriterios,
  getCriteriosAdmin,
  crearCriterio,
  modificarCriterio,
  eliminarCriterio,
  crearSubcriterio,
  modificarSubcriterio,
  eliminarSubcriterio,
  crearAuditoria,
  getHistorialAuditorias,
  getAuditoriaById,
  eliminarAuditoria
};
