-- ==========================================================
-- SISTEMA DE GESTIÓN Y REGISTRO DE RECLAMOS
-- Script de Inicialización de Base de Datos PostgreSQL
-- ==========================================================

-- Asegurar codificación UTF-8
SET client_encoding = 'UTF8';

-- 1. TABLA: Sucursales
CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA: Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    documento VARCHAR(20) UNIQUE NOT NULL,
    usuario VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    foto_perfil VARCHAR(255) DEFAULT NULL,
    descripcion VARCHAR(255) DEFAULT '',
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('Admin', 'Supervisor', 'Asesor', 'Espectador')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: Tipos de Consulta
CREATE TABLE IF NOT EXISTS tipos_consulta (
    id SERIAL PRIMARY KEY,
    contenido VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) DEFAULT '',
    activo BOOLEAN DEFAULT TRUE
);

-- 4. TABLA: Características de la Consulta
CREATE TABLE IF NOT EXISTS caracteristicas_consulta (
    id SERIAL PRIMARY KEY,
    tipo_consulta_id INT NOT NULL REFERENCES tipos_consulta(id) ON DELETE CASCADE,
    contenido VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) DEFAULT '',
    activo BOOLEAN DEFAULT TRUE
);

-- 5. TABLA: Definición de la Consulta
CREATE TABLE IF NOT EXISTS definiciones_consulta (
    id SERIAL PRIMARY KEY,
    caracteristica_id INT NOT NULL REFERENCES caracteristicas_consulta(id) ON DELETE CASCADE,
    contenido VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) DEFAULT '',
    activo BOOLEAN DEFAULT TRUE
);

-- 6. TABLA: Finalización de la Consulta
CREATE TABLE IF NOT EXISTS finalizaciones (
    id SERIAL PRIMARY KEY,
    definicion_id INT REFERENCES definiciones_consulta(id) ON DELETE CASCADE,
    contenido VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) DEFAULT '',
    activo BOOLEAN DEFAULT TRUE
);

-- 7. TABLA: Reclamos
CREATE TABLE IF NOT EXISTS reclamos (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    numero_cliente VARCHAR(15) NOT NULL,
    tipo_consulta_id INT NOT NULL REFERENCES tipos_consulta(id) ON DELETE RESTRICT,
    caracteristica_id INT NOT NULL REFERENCES caracteristicas_consulta(id) ON DELETE RESTRICT,
    definicion_id INT REFERENCES definiciones_consulta(id) ON DELETE SET NULL,
    finalizacion_id INT REFERENCES finalizaciones(id) ON DELETE SET NULL,
    comentario VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA: Registros de Auditoría
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accion VARCHAR(255) NOT NULL,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    registro_id INT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA: Tareas Asignadas
CREATE TABLE IF NOT EXISTS tareas_asignadas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_por_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    sucursal_1_id INT NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    sucursal_2_id INT REFERENCES sucursales(id) ON DELETE SET NULL,
    tarea VARCHAR(50),
    completada BOOLEAN DEFAULT FALSE,
    completada_at TIMESTAMP WITH TIME ZONE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA: Inconvenientes Masivos
CREATE TABLE IF NOT EXISTS inconvenientes_masivos (
    id SERIAL PRIMARY KEY,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    sucursal_id INT REFERENCES sucursales(id) ON DELETE SET NULL,
    zona_afectada VARCHAR(100),
    servicio_afectado VARCHAR(50) NOT NULL,
    caracteristicas_dano VARCHAR(255),
    tiempo_resolucion VARCHAR(20),
    estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Finalizado')),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    responsable_solucion VARCHAR(20),
    arreglo VARCHAR(50),
    creado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    finalizado_por_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canales_atencion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_criterios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) DEFAULT '',
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_subcriterios (
    id SERIAL PRIMARY KEY,
    criterio_id INT NOT NULL REFERENCES auditoria_criterios(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255) DEFAULT '',
    puntaje_maximo NUMERIC(5,2) NOT NULL DEFAULT 0,
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditorias_calidad (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asesor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    auditor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    canal_id INT NOT NULL REFERENCES canales_atencion(id) ON DELETE RESTRICT,
    referencia VARCHAR(15) NOT NULL,
    puntaje_maximo NUMERIC(5,2) NOT NULL DEFAULT 0,
    puntaje_obtenido NUMERIC(5,2) NOT NULL DEFAULT 0,
    porcentaje_calidad NUMERIC(5,2) NOT NULL DEFAULT 0,
    resultado VARCHAR(20) NOT NULL,
    error_critico BOOLEAN DEFAULT FALSE,
    comentario_error_critico VARCHAR(100),
    observaciones_generales TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditorias_calidad_detalle (
    id SERIAL PRIMARY KEY,
    auditoria_id INT NOT NULL REFERENCES auditorias_calidad(id) ON DELETE CASCADE,
    criterio_id INT NOT NULL REFERENCES auditoria_criterios(id) ON DELETE RESTRICT,
    subcriterio_id INT NOT NULL REFERENCES auditoria_subcriterios(id) ON DELETE RESTRICT,
    criterio_nombre VARCHAR(100) NOT NULL,
    subcriterio_nombre VARCHAR(150) NOT NULL,
    puntaje_maximo NUMERIC(5,2) NOT NULL,
    evaluacion VARCHAR(20) NOT NULL CHECK (evaluacion IN ('Cumple', 'No cumple', 'No aplica')),
    puntaje_obtenido NUMERIC(5,2) NOT NULL DEFAULT 0,
    observacion VARCHAR(250)
);

CREATE INDEX IF NOT EXISTS idx_reclamos_fecha ON reclamos (fecha);
CREATE INDEX IF NOT EXISTS idx_reclamos_sucursal ON reclamos (sucursal_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_usuario ON reclamos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_tipo ON reclamos (tipo_consulta_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_logs (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_masivos_estado ON inconvenientes_masivos(estado);
CREATE INDEX IF NOT EXISTS idx_masivos_fecha_inicio ON inconvenientes_masivos(fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_auditorias_fecha ON auditorias_calidad(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditorias_asesor ON auditorias_calidad(asesor_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_auditor ON auditorias_calidad(auditor_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_canal ON auditorias_calidad(canal_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_detalle_audit ON auditorias_calidad_detalle(auditoria_id);

-- ==========================================================
-- DATOS SEMILLA (SEED DATA)
-- ==========================================================

-- Usuario Administrador por defecto (Contraseña: admin123)
INSERT INTO usuarios (nombre_completo, documento, usuario, password_hash, rol)
VALUES (
    'Administrador del Sistema',
    '00000000',
    'admin',
    '$2b$10$rcp8okC6CuOm7fCWiOsTdeEWn3Q4MMm59/McX/eKZhSScR/wS/NWq',
    'Admin'
) ON CONFLICT (usuario) DO NOTHING;

-- Sucursales iniciales
INSERT INTO sucursales (nombre) VALUES
    ('San Miguel'),
    ('Central'),
    ('Norte'),
    ('Oeste'),
    ('Sur')
ON CONFLICT DO NOTHING;

-- Función de ayuda temporal para insertar el árbol jerárquico
DO $$
DECLARE
    -- Tipos
    t_tec INT;
    t_fac INT;
    t_ven INT;
    t_baj INT;
    t_gen INT;
    t_bpar INT;
    
    -- Características
    c_catv INT;
    c_con INT;
    c_mas INT;
    c_pen INT;
    
    c_app INT;
    c_tras INT;
    c_detfac INT;
    c_pago INT;
    c_fac INT;
    c_deb INT;
    c_med INT;
    c_bon INT;

    c_disp INT;
    c_inst INT;
    c_adic INT;
    c_plan INT;
    c_mud INT;

    c_eco INT;
    c_ite INT;
    c_otr INT;
    c_com INT;

    c_pass INT;
    c_cab INT;
    c_gotr INT;
    c_tit INT;

    c_bp_catv INT;
    c_bp_net INT;
    c_bp_dec INT;
    c_bp_app INT;

    -- Definiciones auxiliares
    d_id INT;
BEGIN
    -- Evitar duplicación si ya existen tipos
    IF NOT EXISTS (SELECT 1 FROM tipos_consulta WHERE contenido = 'Reclamos Tecnicos') THEN

        -- 1. RECLAMOS TECNICOS
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Reclamos Tecnicos', 'Reclamos técnicos del servicio') RETURNING id INTO t_tec;

        -- Inconveniente catv
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_tec, 'Inconveniente catv') RETURNING id INTO c_catv;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_catv, 'Sin señal') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_catv, 'Canal desfasado') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_catv, 'Deco') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');

        -- Inconveniente conexion
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_tec, 'Inconveniente conexion') RETURNING id INTO c_con;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_con, 'Los Rojo') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_con, 'Lentitud / Cortes') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_con, 'No Navega') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Resuelto'), (d_id, 'OT'), (d_id, 'Pendiente');

        -- Inconveniente Masivo
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_tec, 'Inconveniente Masivo') RETURNING id INTO c_mas;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_mas, 'Internet') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_mas, 'Cable') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_mas, 'Web') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_mas, 'Deco') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        -- Reclamo pendiente
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_tec, 'Reclamo pendiente') RETURNING id INTO c_pen;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pen, 'Internet') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Reclamo pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pen, 'Cable') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Reclamo pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pen, 'Deco') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Reclamo pendiente');


        -- 2. FACTURACION
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Facturacion', 'Consultas y reclamos de facturación') RETURNING id INTO t_fac;

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'App') RETURNING id INTO c_app;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_app, 'Particular') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Traslado de servicio') RETURNING id INTO c_tras;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_tras, 'Traslado de servicio') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Detalle de facturacion') RETURNING id INTO c_detfac;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_detfac, 'Consulta saldo anterior') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_detfac, 'Consulta vencimientos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Pago') RETURNING id INTO c_pago;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pago, 'Solicita Rehabilitacion por mora') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pago, 'Informe de pago') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pago, 'Informa pago no imputado') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Factura') RETURNING id INTO c_fac;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_fac, 'Se envia factura') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_fac, 'Se informa link de pagina') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Debito') RETURNING id INTO c_deb;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_deb, 'Informacion de debito') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_deb, 'Alta debito') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_deb, 'Baja debito') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Medios de pago') RETURNING id INTO c_med;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_med, 'Se informa medios de pago') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_fac, 'Bonificacion') RETURNING id INTO c_bon;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bon, 'Se aplica bonificacion') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');


        -- 3. VENTA
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Venta', 'Consultas comerciales y de ventas') RETURNING id INTO t_ven;

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_ven, 'Consulta disponibilidad') RETURNING id INTO c_disp;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_disp, 'Se verifica cobertura') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_disp, 'Se informa plazo de instalacion') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_ven, 'Consulta instalacion') RETURNING id INTO c_inst;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_inst, 'Reitera pedido') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_inst, 'Solicita cancelacion') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_ven, 'Adicionales') RETURNING id INTO c_adic;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_adic, 'App') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_adic, 'Boca adicional') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_adic, 'Decodificador') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_adic, 'Adiciona cable') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_adic, 'Adiciona internet') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_ven, 'Cambio de plan') RETURNING id INTO c_plan;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_plan, 'Consulta cambio de plan') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_plan, 'Solicita cambio de plan') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_ven, 'Mudanza') RETURNING id INTO c_mud;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_mud, 'Mudanza') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');


        -- 4. BAJA
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Baja', 'Gestión de bajas totales') RETURNING id INTO t_baj;

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_baj, 'Economico') RETURNING id INTO c_eco;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_eco, 'Disconformidad con costos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_baj, 'Inconveniente Tecnico') RETURNING id INTO c_ite;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_ite, 'Reiterados reclamos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_baj, 'Otros') RETURNING id INTO c_otr;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_otr, 'Problemas personales') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_baj, 'Competencia') RETURNING id INTO c_com;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_com, 'Mejor oferta de competencia') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');


        -- 5. CONSULTA GENERALES
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Consulta generales', 'Consultas administrativas y generales') RETURNING id INTO t_gen;

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_gen, 'Cambio de contraseña') RETURNING id INTO c_pass;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pass, 'Se envia condiciones de seguridad') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_pass, 'Se deriba a Whastapp') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_gen, 'Modiciacion de Cableado') RETURNING id INTO c_cab;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_cab, 'Se informan costo y demora') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_cab, 'Solicita modificacion') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_gen, 'Otros') RETURNING id INTO c_gotr;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_gotr, 'Otros') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');

        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_gen, 'Cambio de titularidad') RETURNING id INTO c_tit;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_tit, 'Detallar que consulta') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Informado');


        -- 6. BAJA PARCIAL
        INSERT INTO tipos_consulta (contenido, descripcion) VALUES ('Baja parcial', 'Gestión de bajas de servicios específicos') RETURNING id INTO t_bpar;

        -- Catv
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_bpar, 'Catv') RETURNING id INTO c_bp_catv;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_catv, 'Economicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_catv, 'Tecnicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_catv, 'personales') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        -- Internet
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_bpar, 'Internet') RETURNING id INTO c_bp_net;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_net, 'Economicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_net, 'Tecnicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_net, 'personales') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        -- Deco
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_bpar, 'Deco') RETURNING id INTO c_bp_dec;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_dec, 'Economicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_dec, 'Tecnicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_dec, 'personales') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

        -- App
        INSERT INTO caracteristicas_consulta (tipo_consulta_id, contenido) VALUES (t_bpar, 'App') RETURNING id INTO c_bp_app;
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_app, 'Economicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_app, 'Tecnicos') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');
        INSERT INTO definiciones_consulta (caracteristica_id, contenido) VALUES (c_bp_app, 'personales') RETURNING id INTO d_id;
        INSERT INTO finalizaciones (definicion_id, contenido) VALUES (d_id, 'Retenido'), (d_id, 'No retenido'), (d_id, 'Pendiente');

    END IF;
END $$;

INSERT INTO canales_atencion (nombre) VALUES
    ('Telefónico'),
    ('WhatsApp'),
    ('Presencial'),
    ('Correo Electrónico'),
    ('Redes Sociales')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO auditoria_criterios (id, nombre, descripcion, orden) VALUES
    (1, 'Inicio de la atención', 'Apertura y trato inicial con el cliente', 1),
    (2, 'Indagación', 'Identificación del motivo y necesidades de la consulta', 2),
    (3, 'Información brindada', 'Claridad, veracidad y conocimiento transmitido', 3),
    (4, 'Resolución y gestión', 'Efectividad en el tratamiento del caso y procedimientos', 4),
    (5, 'Cierre y experiencia', 'Conclusión del contacto y fidelización', 5),
    (6, 'Retención ante pedido de baja', 'Manejo de solicitudes de desvinculación o baja de servicio', 6)
ON CONFLICT (id) DO NOTHING;

SELECT setval('auditoria_criterios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auditoria_criterios));

INSERT INTO auditoria_subcriterios (criterio_id, nombre, puntaje_maximo, orden) VALUES
    (1, 'Saludo e identificación correcta', 2, 1),
    (1, 'Cordialidad y disposición', 2, 2),
    (1, 'Tono y lenguaje profesional', 2, 3),

    (2, 'Escucha activa sin interrumpir', 4, 1),
    (2, 'Realiza preguntas pertinentes', 4, 2),
    (2, 'Detecta correctamente la necesidad', 6, 3),
    (2, 'Evita preguntas innecesarias o repetitivas', 3, 4),
    (2, 'Demuestra comprensión del caso', 3, 5),

    (3, 'Información correcta y actualizada', 7, 1),
    (3, 'Explicación clara y comprensible', 6, 2),
    (3, 'Conocimiento del servicio/proceso', 5, 3),
    (3, 'No genera falsas expectativas/promesas', 4, 4),
    (3, 'Adapta la explicación al cliente', 3, 5),

    (4, 'Resuelve correctamente la consulta', 8, 1),
    (4, 'Aplica correctamente los procedimientos', 6, 2),
    (4, 'Ofrece alternativas cuando corresponde', 4, 3),
    (4, 'Gestiona la situación con autonomía', 4, 4),
    (4, 'Registra/deriva correctamente cuando corresponde', 3, 5),

    (5, 'Confirma que la necesidad fue resuelta', 5, 1),
    (5, 'Verifica si necesita algo más', 3, 2),
    (5, 'Cierre cordial y profesional', 4, 3),
    (5, 'Deja una experiencia positiva', 4, 4),

    (6, 'Indaga el motivo real del pedido de baja', 4, 1),
    (6, 'Escucha y demuestra empatía sin confrontar', 4, 2),
    (6, 'Presenta una propuesta acorde a la necesidad', 4, 3),
    (6, 'Informa alternativas y beneficios con claridad', 4, 4),
    (6, 'Respeta la decisión sin presionar ni obstaculizar', 4, 5),
    (6, 'Registra correctamente la gestión y su resultado', 4, 6)
ON CONFLICT DO NOTHING;
