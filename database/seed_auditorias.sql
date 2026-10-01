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

SELECT setval('auditoria_criterios_id_seq', (SELECT MAX(id) FROM auditoria_criterios));

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
