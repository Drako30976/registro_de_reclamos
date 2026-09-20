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

-- Índices para optimización de consultas y filtros
CREATE INDEX IF NOT EXISTS idx_reclamos_fecha ON reclamos (fecha);
CREATE INDEX IF NOT EXISTS idx_reclamos_sucursal ON reclamos (sucursal_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_usuario ON reclamos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_tipo ON reclamos (tipo_consulta_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_logs (fecha DESC);

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
