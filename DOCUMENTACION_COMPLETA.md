# DOCUMENTACIÓN TÉCNICA Y OPERATIVA COMPLETA
## Sistema de Gestión y Registro de Reclamos
**Autor del Proyecto:** Mauro  
**Entorno:** PostgreSQL 16 · Docker · Node.js · Express · SPA Frontend  
**Fecha:** Septiembre 2026  

---

## 1. INTRODUCCIÓN Y OBJETIVO DEL PROYECTO

El objetivo fundamental de este proyecto fue reemplazar una planilla compartida de Excel online utilizada para registrar las interacciones y reclamos de clientes en un entorno laboral, transformándola en una **aplicación web empresarial local y escalable en línea**.

### Problemática de la planilla anterior:
- Concurrencia débil (bloqueos o conflictos de guardado simultáneo).
- Cero control de acceso granular (cualquier usuario podía alterar o borrar registros de otros sin dejar rastro).
- Inexistencia de auditoría histórica.
- Dependencia de tipeo manual proclive a errores tipográficos.

### Solución implementada:
Una arquitectura moderna cliente-servidor con base de datos relacional robusta (PostgreSQL en Docker), una API REST segura (Node.js/Express) con autenticación basada en roles, y una interfaz de usuario ágil y responsiva (HTML5, CSS3 y JavaScript Vanilla modular).

---

## 2. STACK TECNOLÓGICO Y RECURSOS UTILIZADOS

### A. Programas y Motores del Sistema
1. **Docker Desktop & Docker Engine**: Plataforma de virtualización a nivel de sistema operativo para ejecutar entornos aislados (contenedores).
2. **Docker Compose (v2.x)**: Herramienta de orquestación para definir y ejecutar aplicaciones Docker multi-contenedor mediante archivos declarativos YAML.
3. **PostgreSQL 16 (Alpine Linux)**: Motor de base de datos relacional de clase empresarial, elegido por su integridad referencial estricta, soporte nativo de tipos `JSONB`, transacciones ACID y velocidad.
4. **Node.js (v22 LTS)**: Entorno de ejecución de JavaScript del lado del servidor, asíncrono y orientado a eventos.
5. **NPM (Node Package Manager)**: Gestor de paquetes y dependencias del ecosistema Node.js.

### B. Lenguajes de Programación y Marcado
- **SQL (Dialecto PostgreSQL)**: Para la definición de esquemas DDL (tablas, restricciones, índices, claves foráneas) y manipulación DML (consultas filtradas, inserciones y uniones con `JOIN`).
- **JavaScript (ES6+)**: Utilizado tanto en el backend (Node.js) como en el frontend para programación asíncrona (`async/await`, `fetch`, manipulación del DOM, closures y modularización).
- **HTML5 Semántico**: Para la estructuración accesible de vistas, modales, formularios y tablas.
- **CSS3 Corporativo**: Con variables CSS (`:root`), Flexbox, CSS Grid, microinteracciones y scrollbars personalizadas.

### C. Librerías y Frameworks del Backend (npm)
- **`express` (v5.x)**: Framework minimalista y flexible para la creación de la API REST, enrutamiento modular y manejo de middlewares.
- **`pg` (node-postgres)**: Cliente oficial de PostgreSQL para Node.js con soporte de Connection Pooling (reutilización eficiente de conexiones a la base de datos).
- **`bcryptjs`**: Algoritmo criptográfico de derivación de claves para hashing unidireccional de contraseñas con salting (10 rondas), evitando el almacenamiento de texto plano.
- **`jsonwebtoken` (JWT)**: Estándar RFC 7519 para la emisión y verificación de tokens de sesión firmados criptográficamente (con 12 horas de caducidad).
- **`multer`**: Middleware para manejo de peticiones `multipart/form-data`, utilizado para la carga y almacenamiento de fotos de perfil en disco.
- **`pdfkit`**: Motor de bajo nivel para la generación y maquetación vectorial de documentos PDF descargables en memoria.
- **`cors`**: Middleware para habilitar el intercambio de recursos de origen cruzado de manera segura.
- **`dotenv`**: Carga automática de variables de entorno desde el archivo `.env` hacia `process.env`.

---

## 3. ARQUITECTURA Y TOPOLOGÍA DE DOCKER

### ¿Por qué se utilizó Docker?
Docker permite empaquetar la base de datos con su versión exacta, configuración y extensiones dentro de una "caja negra" idéntica en cualquier computadora, eliminando el problema clásico de *"en mi máquina funciona pero en la otra no"*.

### Diseño del archivo `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: reclamos_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-reclamos_db}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres_password_2026}
    ports:
      - "${DB_PORT:-5433}:5432"
    volumes:
      - reclamos_pgdata:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - reclamos_net

  app:
    build: .
    container_name: reclamos_app
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-reclamos_db}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres_password_2026}
      JWT_SECRET: ${JWT_SECRET:-reclamos_jwt_super_secret_key_2026}
      NODE_ENV: production
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
    networks:
      - reclamos_net

volumes:
  reclamos_pgdata:
    driver: local

networks:
  reclamos_net:
    driver: bridge
```

### Conceptos Clave Implementados:
1. **Resolución de Colisión de Puertos (`5433:5432`)**:
   - En tu computadora de casa ya existía una instancia de PostgreSQL en ejecución en el puerto por defecto `5432` (`eventos_rrhh_postgres`).
   - Si intentábamos usar `5432`, Docker arrojaba error de puerto ocupado.
   - Se mapeó el puerto `5433` en tu máquina host apuntando al `5432` dentro del contenedor.
2. **Volumen Persistente (`reclamos_pgdata`)**:
   - Los contenedores Docker son efímeros por defecto (si se borra el contenedor, se pierden los datos creados dentro).
   - Para evitar esto, se configuró un volumen Docker nombrado (`reclamos_pgdata`) montado en `/var/lib/postgresql/data`. De esta manera, aunque apagues o borres el contenedor, los registros nunca se pierden.
3. **Auto-inicialización con `/docker-entrypoint-initdb.d/`**:
   - La imagen oficial de PostgreSQL ejecuta automáticamente cualquier archivo `.sql` presente en esta carpeta en el momento en que se crea el volumen por primera vez.
   - Montamos `./database/init.sql` allí para que la base nazca 100% configurada.

---

## 4. MODELO RELACIONAL DE DATOS (POSTGRESQL)

El modelo fue diseñado respetando las formas normales y la jerarquía exacta de la planilla Excel:

```
[Tipos de Consulta] (1:N)
        │
        └──> [Características] (1:N)
                     │
                     └──> [Definiciones] (1:N)
                                  │
                                  └──> [Finalizaciones]
```

### Estructura de las 8 Tablas:

1. **`usuarios`**:
   - `id SERIAL PRIMARY KEY`
   - `nombre_completo VARCHAR(100) NOT NULL`
   - `documento VARCHAR(20) UNIQUE NOT NULL`
   - `usuario VARCHAR(30) UNIQUE NOT NULL`
   - `password_hash VARCHAR(255) NOT NULL`
   - `foto_perfil VARCHAR(255)`
   - `rol VARCHAR(20) CHECK (rol IN ('Admin', 'Supervisor', 'Asesor', 'Espectador'))`
   - `activo BOOLEAN DEFAULT TRUE` (control de habilitación/suspensión)
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

2. **`sucursales`**:
   - `id SERIAL PRIMARY KEY`
   - `nombre VARCHAR(50) NOT NULL`
   - `activo BOOLEAN DEFAULT TRUE`
   - `created_at TIMESTAMP WITH TIME ZONE`

3. **`tipos_consulta`**:
   - `id SERIAL PRIMARY KEY`
   - `contenido VARCHAR(50) NOT NULL` (6 tipos iniciales cargados)
   - `descripcion VARCHAR(150)`
   - `activo BOOLEAN DEFAULT TRUE`

4. **`caracteristicas_consulta`**:
   - `id SERIAL PRIMARY KEY`
   - `tipo_consulta_id INT REFERENCES tipos_consulta(id) ON DELETE CASCADE`
   - `contenido VARCHAR(50) NOT NULL` (29 características iniciales)
   - `descripcion VARCHAR(150)`
   - `activo BOOLEAN DEFAULT TRUE`

5. **`definiciones_consulta`**:
   - `id SERIAL PRIMARY KEY`
   - `caracteristica_id INT REFERENCES caracteristicas_consulta(id) ON DELETE CASCADE`
   - `contenido VARCHAR(50) NOT NULL` (61 definiciones iniciales)
   - `descripcion VARCHAR(150)`
   - `activo BOOLEAN DEFAULT TRUE`

6. **`finalizaciones`**:
   - `id SERIAL PRIMARY KEY`
   - `definicion_id INT REFERENCES definiciones_consulta(id) ON DELETE CASCADE`
   - `contenido VARCHAR(50) NOT NULL` (105 combinaciones de finalización)
   - `descripcion VARCHAR(150)`
   - `activo BOOLEAN DEFAULT TRUE`

7. **`reclamos` (Tabla Principal Transaccional)**:
   - `id SERIAL PRIMARY KEY`
   - `fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `sucursal_id INT REFERENCES sucursales(id) ON DELETE RESTRICT`
   - `usuario_id INT REFERENCES usuarios(id) ON DELETE RESTRICT` (asesor)
   - `numero_cliente VARCHAR(15) NOT NULL`
   - `tipo_consulta_id INT REFERENCES tipos_consulta(id) ON DELETE RESTRICT`
   - `caracteristica_id INT REFERENCES caracteristicas_consulta(id) ON DELETE RESTRICT`
   - `definicion_id INT REFERENCES definiciones_consulta(id) ON DELETE SET NULL`
   - `finalizacion_id INT REFERENCES finalizaciones(id) ON DELETE SET NULL`
   - `created_at TIMESTAMP`, `updated_at TIMESTAMP`

8. **`auditoria_logs` (Libro Mayor Inmutable de Cambios)**:
   - `id SERIAL PRIMARY KEY`
   - `fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
   - `accion VARCHAR(255) NOT NULL`
   - `usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL`
   - `usuario_nombre VARCHAR(100) NOT NULL`
   - `entidad VARCHAR(50) NOT NULL` (`'reclamos'`, `'usuarios'`, `'sucursales'`, etc.)
   - `registro_id INT`
   - `datos_anteriores JSONB` (guarda el registro completo anterior al modificar o borrar)
   - `datos_nuevos JSONB`

---

## 5. MATRIZ DE SEGURIDAD Y CONTROL DE ACCESO (RBAC)

El sistema opera bajo un modelo estricto de **Control de Acceso Basado en Roles (Role-Based Access Control)** con 4 niveles jerárquicos:

| Módulo / Función | Admin | Supervisor | Asesor | Espectador |
| :--- | :---: | :---: | :---: | :---: |
| **Gestión de Reclamos (Carga)** | Permitido | Permitido | Permitido | **Bloqueado** |
| **Historial (Consultar y Filtrar)** | Permitido | Permitido | Permitido | Solo lectura |
| **Historial (Editar Reclamos)** | Permitido | Permitido | Permitido | **Bloqueado** |
| **Historial (Eliminar Reclamos)** | **Exclusivo** | **Bloqueado** | **Bloqueado** | **Bloqueado** |
| **Historial (Emitir Reporte PDF)**| Permitido | Permitido | Permitido | **Bloqueado** |
| **Registros (Auditoría Paginada x20)**| **Exclusivo** | **Bloqueado** | **Bloqueado** | **Bloqueado** |
| **Edición (Estructura y Sucursales)**| Total | Crear y Editar | **Bloqueado** | **Bloqueado** |
| **Perfil Propio (Clave y Foto)** | Permitido | Permitido | Permitido | Permitido |
| **Gestión de Usuarios (En Perfil)**| Total (Todos los roles)| Solo crea 'Asesor'| **Bloqueado** | **Bloqueado** |
| **Activar / Suspender Cuentas** | **Exclusivo** | **Bloqueado** | **Bloqueado** | **Bloqueado** |

---

## 6. ESTRUCTURA Y LÓGICA DEL BACKEND (NODE.JS + EXPRESS)

La arquitectura sigue el patrón de diseño por capas:

```
registro_de_reclamos/
├── .env                  # Variables secretas locales
├── .env.example          # Plantilla de variables de entorno
├── .gitignore            # Exclusión de archivos sensibles y node_modules
├── docker-compose.yml    # Orquestación de contenedores
├── Dockerfile            # Imagen de producción Node.js
├── database/
│   └── init.sql          # Script de inicialización de PostgreSQL
├── src/
│   ├── config/
│   │   └── db.js         # Connection Pool con 'pg'
│   ├── middlewares/
│   │   ├── auth.js       # Verificación JWT, estado activo y RBAC
│   │   └── audit.js      # Interceptor de auditoría histórica
│   ├── controllers/
│   │   ├── auth.controller.js       # Login y verificación de sesión
│   │   ├── reclamos.controller.js   # CRUD y filtros de reclamos
│   │   ├── catalogos.controller.js  # Sucursales y árbol en cascada
│   │   ├── usuarios.controller.js   # ABM usuarios, contraseñas y fotos
│   │   ├── auditoria.controller.js  # Paginación estricta de 20 logs
│   │   └── reportes.controller.js   # Generación de reportes PDF vectoriales
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── reclamos.routes.js
│   │   ├── catalogos.routes.js
│   │   ├── usuarios.routes.js
│   │   ├── auditoria.routes.js
│   │   └── reportes.routes.js
│   └── server.js         # Entrada principal y montaje de rutas
├── uploads/              # Fotos de perfil cargadas por usuarios
└── public/               # (Servido directamente en la raíz)
    ├── index.html        # Estructura SPA y modales
    ├── css/style.css     # Hoja de estilos corporativa
    └── js/               # Lógica modular frontend
```

### Aspectos Técnicos Destacados del Backend:
1. **Autenticación con Bcrypt y JWT**:
   - Al loguearse, `bcrypt.compare()` valida la contraseña contra el hash de la base de datos sin descifrarlo jamás.
   - Si la contraseña es válida y `activo === true`, se firma un JWT con `HS256` que viaja en la cabecera HTTP: `Authorization: Bearer <token>`.
2. **Bloqueo de Usuario Suspendido**:
   - Si el usuario tiene `activo === false`, el controlador responde con código HTTP `403 Forbidden` y el mensaje:
     `{"error": "Usuario suspendido"}`.
   - El middleware `verifyToken` consulta la base de datos en cada petición; si un usuario activo es suspendido por el Administrador mientras navegaba, su sesión queda invalidada en el siguiente clic.
3. **Mecanismo de Auditoría con Captura de Estado Original**:
   - En `reclamos.controller.js`, antes de ejecutar un `UPDATE` o `DELETE`, el sistema ejecuta una consulta `SELECT` para capturar el estado original del reclamo con todos sus nombres reales (*sucursal, asesor, cliente, tipo, etc.*).
   - Guarda este snapshot en `auditoria_logs` bajo el campo `datos_anteriores`, cumpliendo con el requerimiento de poder auditar el texto exacto que tenía el registro antes de ser modificado o borrado.
4. **Motor de Reportes PDF (`pdfkit`)**:
   - Toma los mismos filtros de búsqueda activos en la vista de historial (`fecha`, `asesor`, `sucursal`, `tipo_consulta`, `numero_cliente`).
   - Construye un documento A4 apaisado (*landscape*) en memoria, dibuja el encabezado, calcula paginación automática si supera los 540 puntos verticales y lo entrega por streaming al navegador.

---

## 7. ESTRUCTURA Y LÓGICA DEL FRONTEND (SPA MODULAR)

El frontend fue desarrollado bajo el paradigma **Single Page Application (SPA)** sin frameworks pesados (como React o Angular), garantizando velocidad absoluta, carga inmediata y máxima compatibilidad.

### Módulos JavaScript:
1. **`api.js`**:
   - Envuelve las llamadas `fetch()`.
   - Inyecta automáticamente el token JWT en las cabeceras.
   - Si recibe un código `401 Unauthorized`, cierra la sesión automáticamente y redirige al login.
2. **`auth.js`**:
   - Controla el formulario de login.
   - Administra el estado de la sesión en `localStorage`.
   - Aplica la matriz de roles ocultando o mostrando pestañas en el DOM.
3. **`reclamos.js` (Cascada Dinámica)**:
   - Al seleccionar un **Tipo**, filtra dinámicamente sus **Características**.
   - Al seleccionar una **Característica**, filtra dinámicamente sus **Definiciones**.
   - Al seleccionar una **Definición**, filtra las **Finalizaciones** correspondientes.
   - Fija la fecha actual y el nombre del asesor logueado en modo sólo lectura.
4. **`historial.js`**:
   - Renderiza la tabla de reclamos con badges de estado.
   - Procesa los filtros combinados.
   - Dispara la descarga del reporte PDF en memoria.
   - Controla los modales de edición y eliminación (según permisos).
5. **`registros.js` (Paginación Estricta de 20 Registros)**:
   - Solicita al backend paquetes de a 20 logs (`?page=X`).
   - Muestra la fecha formateada en horario local argentino, la acción realizada, el autor y el detalle anterior estructurado o en acordeón.
6. **`edicion.js`**:
   - Panel interactivo con árbol visual de las opciones de consulta y mantenimiento de sucursales.
7. **`perfil.js`**:
   - Muestra los datos de la cuenta.
   - Permite cambiar la contraseña exigiendo la confirmación de la clave actual.
   - Permite subir la foto de perfil desde la PC vía `FormData` y `multipart/form-data`.
   - **Panel de Administración de Usuarios**: Tabla con botones instantáneos de `Activar` y `Desactivar`, botones de `Editar` y `Eliminar`, y botón superior `+ Crear Nuevo Usuario`.
8. **`app.js`**:
   - Tab switcher principal que coordina la activación de vistas y ejecuta el método `init()` del módulo correspondiente.

### Solución del Problema de Scroll en Modales:
- En CSS, cuando un `<form>` se ubica dentro de un contenedor flex (`.modal-box`) con altura máxima (`max-height: 85vh`), el formulario debe tener obligatoriamente:
  `display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;`.
- De esta manera, el cuerpo del formulario (`.modal-body`) asume `overflow-y: auto`, la barra de desplazamiento se vuelve visible y funcional, y el pie con los botones de acción queda anclado de forma fija (`flex-shrink: 0`).

---

## 8. CRONOGRAMA DE DESARROLLO PASO A PASO (BITÁCORA)

1. **Fase de Análisis**: Lectura de los requerimientos de trabajo y extracción del árbol jerárquico a partir de la planilla adjunta (*Reclamos Técnicos, Facturación, Venta, Baja, Consultas Generales, Baja Parcial*).
2. **Inspección de Entorno**: Detección de Node.js v22 y Docker Compose v5.5.0 en el host. Identificación de colisión en el puerto 5432 y asignación del puerto 5433 en host.
3. **Diseño de Base de Datos**: Creación de `database/init.sql` con DDL completo y script PL/pgSQL para poblar el catálogo semilla (6 tipos, 29 características, 61 definiciones, 105 finalizaciones, 5 sucursales y el usuario admin con password hasheado con bcrypt).
4. **Despliegue de Docker**: Ejecución de `docker compose up -d` y verificación de tablas y recuentos mediante `psql` dentro del contenedor.
5. **Desarrollo del Backend**:
   - Configuración del Pool en `db.js`.
   - Middlewares de autenticación JWT y auditoría.
   - Controladores de autenticación, reclamos, catálogos, usuarios, auditoría y reportes PDF.
   - Creación de rutas protegidas y montaje en `server.js`.
6. **Desarrollo del Frontend**:
   - Maquetación de `index.html` con 5 vistas protegidas y modales.
   - Creación de `css/style.css` responsive.
   - Modularización de JavaScript en `api.js`, `auth.js`, `reclamos.js`, `historial.js`, `registros.js`, `edicion.js`, `perfil.js` y `app.js`.
7. **Pruebas de Integración Automatizadas**:
   - Creación y ejecución de script de pruebas (`test_flow.js`): healthcheck, login admin, consulta de catálogos, creación de reclamo abonado 8148, filtro en historial, edición de reclamo con registro en auditoría, creación de usuario asesor, verificación de paginación de auditoría y descarga de PDF. Todas pasaron con éxito.
8. **Contenedorización Total**: Creación de `Dockerfile` y actualización de `docker-compose.yml` para despliegue productivo de frontend + backend + base de datos.
9. **Emisión de Planes y Guías**:
   - Generación de `Plan_de_Implementacion_Sistema_Reclamos.pdf`.
   - Generación de `Guia_de_Migracion_Docker_Base_de_Datos.pdf`.
10. **Ajustes Solicitados**:
    - Retiro de etiqueta de rol en la cabecera.
    - Ancho completo de la tarjeta de carga de reclamos.
    - Activación y visualización prioritaria de usuarios en la pestaña Perfil para Admin.
    - Eliminación completa de la opción "Legajo" en base de datos, backend y frontend.
    - Implementación de estado Activar / Desactivar instantáneo con mensaje estricto `"Usuario suspendido"` en caso de bloqueo.
    - Corrección de tamaño y scroll en `modal-crear-usuario` y `modal-editar-usuario`.
11. **Limpieza y Firma de Autoría**:
    - Eliminación de comentarios en todo el código fuente del proyecto.
    - Adición del comentario de autoría al final de `index.html`:
      `<!-- Código desarrollado y realizado por Mauro -->`.
12. **Rediseño Estético Profesional**:
    - Aplicación de una estética corporativa de alta legibilidad, espaciado práctico y paleta sobria.

---

## 9. GUÍA DE COMANDOS ÚTILES PARA OPERACIÓN Y APRENDIZAJE

### Comandos de Docker:
- **Levantar los servicios en segundo plano**:
  ```bash
  docker compose up -d
  ```
- **Ver contenedores activos y puertos**:
  ```bash
  docker ps
  ```
- **Ver registros en tiempo real del contenedor de base de datos**:
  ```bash
  docker logs -f reclamos_postgres
  ```
- **Detener los servicios sin borrar datos**:
  ```bash
  docker compose stop
  ```
- **Detener y remover contenedores conservando los datos del volumen**:
  ```bash
  docker compose down
  ```

### Comandos de PostgreSQL dentro de Docker:
- **Ingresar a la consola interactiva SQL (psql)**:
  ```bash
  docker exec -it reclamos_postgres psql -U postgres -d reclamos_db
  ```
- **Hacer una copia de seguridad (Dump completo)**:
  ```bash
  docker exec -t reclamos_postgres pg_dump -U postgres -d reclamos_db > backup_reclamos.sql
  ```
- **Restaurar copia de seguridad en PowerShell**:
  ```powershell
  Get-Content backup_reclamos.sql | docker exec -i reclamos_postgres psql -U postgres -d reclamos_db
  ```

---

*Fin del documento de documentación técnica.*
