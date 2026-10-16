@echo off
setlocal
if "%~1"=="" (
    echo.
    echo ========================================================
    echo   USO: scripts\restore_db.bat ^<ruta_al_archivo_backup.sql^>
    echo   Ejemplo: scripts\restore_db.bat backups\backup_reclamos_20261016.sql
    echo ========================================================
    exit /b 1
)

set BACKUP_FILE=%~1
if not exist "%BACKUP_FILE%" (
    echo [ERROR] El archivo "%BACKUP_FILE%" no fue encontrado.
    exit /b 1
)

echo ========================================================
echo   RESTAURANDO BASE DE DATOS DESDE: %BACKUP_FILE%
echo ========================================================
echo.
echo 1. Copiando archivo de backup al contenedor PostgreSQL...
docker cp "%BACKUP_FILE%" reclamos_postgres:/tmp/restore_temp.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se pudo copiar el archivo al contenedor.
    exit /b %ERRORLEVEL%
)

echo 2. Aplicando backup en la base de datos reclamos_db...
docker exec reclamos_postgres psql -U postgres -d reclamos_db -f /tmp/restore_temp.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Ocurrio un problema durante la restauracion.
    exit /b %ERRORLEVEL%
)

echo 3. Limpiando archivos temporales dentro del contenedor...
docker exec reclamos_postgres rm /tmp/restore_temp.sql

echo.
echo ========================================================
echo   [EXITO] RESTAURACION COMPLETADA CORRECTAMENTE
echo ========================================================

