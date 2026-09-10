# Sistema de Gestión y Registro de Reclamos

Sistema web corporativo para el registro, seguimiento, auditoría y reporte de interacciones con clientes, diseñado para reemplazar planillas de cálculo compartidas por un entorno relacional seguro, concurrente y auditable.

---

## 🏗️ Arquitectura del Sistema

- **Base de Datos**: PostgreSQL 16 (Contenedor Docker aislado con volumen persistente).
- **Backend**: Node.js + Express (API RESTful, JWT, bcrypt, Multer, PDFKit).
- **Frontend**: Single Page Application (SPA) en HTML5 semántico, CSS3 corporativo y Vanilla JavaScript modular.
- **Auditoría**: Registro inmutable de cada creación, modificación o eliminación con estado anterior y autor de la acción.

---

## 👥 Matriz de Roles y Permisos

| Módulo / Pestaña | Admin | Supervisor | Asesor | Espectador |
| :--- | :---: | :---: | :---: | :---: |
| **Gestión de Reclamos** | Carga completa | Carga completa | Carga completa | Sin acceso |
| **Historial (Consulta)** | Ver y filtrar | Ver y filtrar | Ver y filtrar | Solo lectura |
| **Historial (Edición)** | Permitido | Permitido | Permitido | No permitido |
| **Historial (Eliminación)** | **Permitido** | No permitido | No permitido | No permitido |
| **Historial (Reporte PDF)** | Descargar | Descargar | Descargar | Sin acceso |
| **Registros (Auditoría)** | **Acceso total (Paginación x20)** | Sin acceso | Sin acceso | Sin acceso |
| **Edición (Estructura y Sucursales)** | Crear, editar y borrar | Crear y editar | Sin acceso | Sin acceso |
| **Perfil Propio** | Datos, clave y foto | Datos, clave y foto | Datos, clave y foto | Datos, clave y foto |
| **Gestión de Usuarios** | Total (todos los roles) | Crear solo 'Asesor' | Sin acceso | Sin acceso |

---

## 🔑 Credenciales de Acceso Inicial

- **Usuario Administrador**: `admin`
- **Contraseña**: `admin123`
*(Se recomienda cambiar la contraseña desde la pestaña **Perfil** una vez ingresado)*.

---

## 🚀 Puesta en Marcha (Paso a Paso)

### Opción 1: Ejecución 100% Contenedorizada con Docker (Recomendado para Producción)

1. Abre tu terminal en la carpeta del proyecto:
   ```bash
   cd c:\Users\Mauro\Desktop\Proyecto\registro_de_reclamos
   ```
2. Levanta los servicios con Docker Compose:
   ```bash
   docker compose up --build -d
   ```
3. Abre tu navegador e ingresa a:
   ```
   http://localhost:3000
   ```

### Opción 2: Ejecución en Desarrollo (PostgreSQL en Docker + Backend en Node Local)

1. Levanta únicamente el contenedor de la base de datos:
   ```bash
   docker compose up -d postgres
   ```
2. Instala dependencias e inicia el servidor Node con recarga automática:
   ```bash
   npm install
   npm run dev
   ```
3. Ingresa a `http://localhost:3000`.

---

## 🌐 Cómo Montar el Proyecto para Uso en Red Local (Oficina)

Para que tus compañeros de trabajo en la oficina puedan ingresar desde sus computadoras:

1. Obtén la dirección IP local de tu computadora ejecutando en PowerShell:
   ```powershell
   ipconfig
   ```
   *(Busca la dirección IPv4, por ejemplo: `192.168.1.50`)*.
2. Asegúrate de permitir el puerto `3000` en el Firewall de Windows:
   ```powershell
   New-NetFirewallRule -DisplayName "Sistema Reclamos" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
3. Tus compañeros de trabajo podrán ingresar directamente escribiendo en su navegador:
   ```
   http://192.168.1.50:3000
   ```

---

## ☁️ Cómo Montarlo en Línea (Internet / Servidor en la Nube)

Para tener el sistema disponible las 24 horas accesible desde cualquier lugar:
1. **Contratar un VPS** (Servidor Privado Virtual en DigitalOcean, AWS, Hetzner, etc. con Ubuntu).
2. **Instalar Docker y Git** en el servidor VPS.
3. **Clonar el proyecto** en el servidor y crear el archivo `.env` con credenciales de producción.
4. **Ejecutar**:
   ```bash
   docker compose up -d
   ```
5. **Configurar un Reverse Proxy (Nginx / Caddy)** para apuntar un dominio (ej: `reclamos.tuempresa.com`) y habilitar certificado SSL gratuito con Let's Encrypt (HTTPS seguro).

---

## 🗄️ Árbol de Base de Datos y Clasificación de Reclamos

El sistema cuenta con la estructura jerárquica exacta de la planilla de trabajo precargada:
- **Tipos de Consulta**: *Reclamos Técnicos, Facturación, Venta, Baja, Consultas Generales, Baja Parcial*.
- **Características de la Consulta**: Filtra dinámicamente según el Tipo.
- **Definición**: Filtra dinámicamente según la Característica.
- **Finalización**: Opciones predefinidas por flujo (*Resuelto, OT, Pendiente, Informado, Reclamo pendiente, Retenido, No retenido*).
