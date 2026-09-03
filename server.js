'use strict';

const app = require('./server/app');
const { connectDB } = require('./server/lib/db');
const { migrateProductImages } = require('./server/scripts/migrateProductImages');
const { startNewArrivalSweep } = require('./server/lib/newArrivalSweep');
const { startWeeklyBackupSchedule } = require('./server/lib/dbBackup');
const { UPLOADS_ROOT } = require('./server/lib/upload');
const telegram = require('./server/telegram');
const { logConnectedAdmins } = require('./server/lib/telegramAdminLog');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function setupTelegramWebhook() {
  if (!telegram.bot) {
    console.log('[telegram] DISABLED — TELEGRAM_BOT_TOKEN is not set, admin bot will not run');
    return;
  }
  if (!process.env.PUBLIC_BASE_URL) {
    console.log('[telegram] INACTIVE — TELEGRAM_BOT_TOKEN is set but PUBLIC_BASE_URL is empty, webhook was NOT registered');
    return;
  }
  try {
    const webhookUrl = `${process.env.PUBLIC_BASE_URL}${telegram.webhookPath}`;
    await telegram.bot.telegram.setWebhook(webhookUrl);
    const info = await telegram.bot.telegram.getWebhookInfo();
    console.log(`[telegram] READY — webhook registered at ${webhookUrl} (confirmed by Telegram: ${info.url || 'n/a'})`);
    await logConnectedAdmins();
  } catch (err) {
    console.error(`[telegram] FAILED to set webhook: ${err.message} — bot is NOT active`);
  }
}

function checkUploadsStorage() {
  if (process.env.UPLOADS_ROOT) {
    console.log(`[uploads] UPLOADS_ROOT is set — serving/writing uploaded files from ${UPLOADS_ROOT}`);
  } else {
    console.warn(
      `[uploads] WARNING — UPLOADS_ROOT is NOT set; uploaded files (avatars/receipts/products) ` +
      `are being written inside the app directory (${UPLOADS_ROOT}). On most cloud hosts this path ` +
      `is wiped on every deploy/restart, causing 404s for previously uploaded images. Set UPLOADS_ROOT ` +
      `to a path on a persistent volume/disk to fix this permanently.`
    );
  }
}

function checkDbBackupSchedule() {
  if (!process.env.DB_BACKUP_TOKEN) {
    console.log('[db-backup] DISABLED — DB_BACKUP_TOKEN is not set, /dev/db/backup and its API return 404');
    return;
  }
  startWeeklyBackupSchedule();
  console.log('[db-backup] READY — /dev/db/backup is active, weekly auto-backup scheduled (max 50 kept)');
}

async function main() {
  checkUploadsStorage();
  await connectDB();
  await migrateProductImages();
  startNewArrivalSweep();
  checkDbBackupSchedule();
  app.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`[server] Storefront is running at http://${displayHost}:${PORT}`);
  });
  await setupTelegramWebhook();
}

main();
