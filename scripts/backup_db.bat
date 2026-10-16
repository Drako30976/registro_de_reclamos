@echo off
setlocal
:: Obtener fecha y hora en formato YYYYMMDD_HHMMSS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if defined datetime (
    set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
) else (
    set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set TIMESTAMP=%TIMESTAMP: =0%
)

if not exist "backups" mkdir backups
set BACKUP_FILE=backups\backup_reclamos_%TIMESTAMP%.sql

echo ========================================================
echo   GENERANDO BACKUP COMPLETO DE BASE DE DATOS (POSTGRESQL)
echo ========================================================
echo Archivo destino: %BACKUP_FILE%
echo.

docker exec reclamos_postgres pg_dump -U postgres -d reclamos_db --clean --if-exists --format=plain --encoding=UTF8 -f /tmp/backup_temp.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se pudo generar el dump dentro del contenedor.
    exit /b %ERRORLEVEL%
)

docker cp reclamos_postgres:/tmp/backup_temp.sql %BACKUP_FILE%
docker exec reclamos_postgres rm /tmp/backup_temp.sql

echo.
echo [EXITO] Backup completado exitosamente: %BACKUP_FILE%
echo ========================================================

