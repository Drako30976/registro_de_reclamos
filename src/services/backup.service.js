const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const backupsDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

/**
 * Comprime un archivo utilizando gzip (compresión máxima nivel 9).
 */
function comprimirArchivo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip({ level: 9 });

    readStream
      .pipe(gzip)
      .pipe(writeStream)
      .on('finish', () => {
        const stats = fs.statSync(outputPath);
        resolve(stats.size);
      })
      .on('error', reject);
  });
}

/**
 * Ejecuta pg_dump utilizando el cliente local o el contenedor postgres.
 */
async function ejecutarPgDump(sqlPath) {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres_password_2026';
  const dbName = process.env.DB_NAME || 'reclamos_db';

  // 1. Intentar pg_dump directo (disponible dentro del contenedor app con postgresql-client)
  try {
    const env = { ...process.env, PGPASSWORD: dbPassword };
    const cmd = `pg_dump -h "${dbHost}" -p ${dbPort} -U "${dbUser}" -d "${dbName}" --clean --if-exists --no-owner --no-privileges -f "${sqlPath}"`;
    await execPromise(cmd, { env });
    return;
  } catch (err) {
    // 2. Si pg_dump no está en PATH (ejecutado desde el host Windows sin postgres en PATH), usar docker exec
    try {
      const dockerCmd = `docker exec reclamos_postgres pg_dump -U ${dbUser} -d ${dbName} --clean --if-exists --no-owner --no-privileges`;
      const { stdout } = await execPromise(dockerCmd, { maxBuffer: 100 * 1024 * 1024 });
      fs.writeFileSync(sqlPath, stdout, 'utf8');
      return;
    } catch (dockerErr) {
      throw new Error(`pg_dump falló: ${err.message} | docker exec falló: ${dockerErr.message}`);
    }
  }
}

/**
 * Envía el archivo comprimido por correo electrónico vía SMTP.
 */
async function enviarBackupPorEmail(gzPath, filename, fileSize) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;
  const destino = process.env.BACKUP_EMAIL_TO || 'mauroa.soto1702@gmail.com';

  if (!smtpUser || !smtpPass) {
    console.log(`[Backup] AVISO: Archivo generado en ${gzPath} (${(fileSize / (1024 * 1024)).toFixed(2)} MB).`);
    console.log(`[Backup] Para habilitar el envío automático por correo a ${destino}, configure las variables SMTP_USER y SMTP_PASS en el archivo .env.`);
    return {
      enviado: false,
      motivo: 'SMTP no configurado (complete SMTP_USER y SMTP_PASS en .env)'
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    family: 4, // Fuerza el uso de IPv4 para evitar errores de ruteo IPv6 (ENETUNREACH)
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const fechaStr = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const pesoMB = (fileSize / (1024 * 1024)).toFixed(2);

  const mailOptions = {
    from: `"Sistema de Reclamos" <${smtpUser}>`,
    to: destino,
    subject: `[Backup Diario] Base de Datos Reclamos - ${fechaStr}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0;">Respaldo de Base de Datos</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Gestión de Reclamos, Llamadas y Mensajería</p>
        </div>
        
        <p style="color: #334155; font-size: 15px;">Se ha generado exitosamente el respaldo programado de la base de datos.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">Fecha y Hora:</td>
            <td style="padding: 10px; color: #1e293b;">${fechaStr} hs</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">Base de Datos:</td>
            <td style="padding: 10px; color: #1e293b;">reclamos_db (PostgreSQL)</td>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">Archivo Adjunto:</td>
            <td style="padding: 10px; color: #1e293b; font-family: monospace;">${filename}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">Tamaño Comprimido:</td>
            <td style="padding: 10px; color: #1e293b;"><strong>${pesoMB} MB</strong></td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; color: #475569;">Destinatario:</td>
            <td style="padding: 10px; color: #1e293b;">${destino}</td>
          </tr>
        </table>

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin-top: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-size: 13px;">
            <strong>Nota de restauración:</strong> Para restaurar este archivo, descomprima el archivo <code>.gz</code> y ejecute el archivo <code>.sql</code> sobre PostgreSQL.
          </p>
        </div>

        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
          Correo automático generado por el Sistema de Reclamos.
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        path: gzPath
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Backup] Correo enviado exitosamente a ${destino} (Message ID: ${info.messageId})`);
  return {
    enviado: true,
    destinatario: destino,
    messageId: info.messageId
  };
}

/**
 * Elimina backups locales con más de X días de antigüedad para proteger el espacio en disco.
 */
function limpiarBackupsAntiguos(dias = 15) {
  try {
    const now = Date.now();
    const maxAgeMs = dias * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(backupsDir);

    for (const file of files) {
      if (!file.startsWith('backup_reclamos_') || !file.endsWith('.sql.gz')) continue;
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`[Backup] Archivo de backup antiguo eliminado por rotación: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Error al depurar backups antiguos:', err.message);
  }
}

/**
 * Función principal que genera el dump, lo comprime, lo envía por correo y depura los antiguos.
 */
async function ejecutarBackupCompleto() {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const baseName = `backup_reclamos_${timestamp}`;
  const sqlPath = path.join(backupsDir, `${baseName}.sql`);
  const gzPath = path.join(backupsDir, `${baseName}.sql.gz`);

  console.log(`[Backup] Iniciando volcado de PostgreSQL a: ${sqlPath}`);
  await ejecutarPgDump(sqlPath);

  console.log(`[Backup] Comprimiendo volcado SQL con gzip...`);
  const fileSize = await comprimirArchivo(sqlPath, gzPath);

  // Eliminar el archivo .sql plano para ahorrar espacio en disco, conservando solo el .sql.gz
  if (fs.existsSync(sqlPath)) {
    fs.unlinkSync(sqlPath);
  }

  console.log(`[Backup] Volcado comprimido creado: ${baseName}.sql.gz (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

  const resultadoEmail = await enviarBackupPorEmail(gzPath, `${baseName}.sql.gz`, fileSize);

  limpiarBackupsAntiguos(15);

  return {
    archivo: `${baseName}.sql.gz`,
    ruta: gzPath,
    peso_bytes: fileSize,
    peso_mb: (fileSize / (1024 * 1024)).toFixed(2),
    email: resultadoEmail
  };
}

/**
 * Inicializa la tarea programada con node-cron para ejecutarse todos los días a las 00:00 hs.
 */
function iniciarCronBackup() {
  const cronExpression = process.env.BACKUP_CRON || '0 0 * * *';
  const timezone = process.env.BACKUP_TIMEZONE || 'America/Argentina/Buenos_Aires';

  console.log(`[Backup] Tarea automática programada: cron "${cronExpression}" (Zona horaria: ${timezone})`);

  cron.schedule(cronExpression, async () => {
    console.log(`[Backup] Ejecutando respaldo automático diario de las 00:00 hs...`);
    try {
      const res = await ejecutarBackupCompleto();
      console.log(`[Backup] Respaldo finalizado con éxito:`, res.archivo);
    } catch (err) {
      console.error('[Backup] Error durante el respaldo programado:', err);
    }
  }, {
    timezone
  });
}

// Permite ejecución manual por CLI: node src/services/backup.service.js manual
if (require.main === module) {
  require('dotenv').config();
  ejecutarBackupCompleto()
    .then(res => {
      console.log('[Backup] Proceso completado exitosamente:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Backup] Error en proceso de backup:', err);
      process.exit(1);
    });
}

module.exports = {
  ejecutarBackupCompleto,
  iniciarCronBackup
};
