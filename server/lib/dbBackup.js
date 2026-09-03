'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const AdmZip = require('adm-zip');

/* مثل UPLOADS_ROOT (server/lib/upload.js): روی هاست ابری فضای فایل کانتینر ephemeral‌ه،
   پس مسیر بکاپ‌ها هم باید قابل تنظیم به یک Volume پایدار باشه. در نبود این متغیر محیطی
   رفتار قبلی (مسیر داخل ریپو، برای dev محلی) حفظ می‌شه. */
const BACKUP_ROOT = process.env.DB_BACKUP_ROOT
  ? path.resolve(process.env.DB_BACKUP_ROOT)
  : path.join(__dirname, '..', 'backups');
fs.mkdirSync(BACKUP_ROOT, { recursive: true });

const MAX_BACKUPS = 50;
const BATCH_SIZE = 500;

function backupFileName(date = new Date()) {
  const iso = date.toISOString().replace(/[:.]/g, '-');
  return `storefront-db-backup-${iso}.zip`;
}

function isSafeBackupFileName(name) {
  return typeof name === 'string' && /^storefront-db-backup-[0-9T-]+Z\.zip$/.test(name);
}

/* فول بکاپ: هر کالکشن دیتابیس رو با EJSON (سازگار با ObjectId/Date/... مونگو، برخلاف
   JSON.stringify خام) به یک فایل جدا داخل زیپ می‌ریزیم، به‌علاوه یک meta.json برای فهرست
   کالکشن‌ها/تعداد سندها/زمان گرفتن بکاپ. */
async function createBackup() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const zip = new AdmZip();
  const meta = { dbName: db.databaseName, createdAt: new Date().toISOString(), collections: [] };

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    zip.addFile(`collections/${name}.json`, Buffer.from(EJSON.stringify(docs), 'utf8'));
    meta.collections.push({ name, count: docs.length });
  }
  zip.addFile('meta.json', Buffer.from(JSON.stringify(meta, null, 2), 'utf8'));

  const fileName = backupFileName();
  const filePath = path.join(BACKUP_ROOT, fileName);
  zip.writeZip(filePath);

  await enforceRetention();
  return statForFile(fileName);
}

function statForFile(fileName) {
  const filePath = path.join(BACKUP_ROOT, fileName);
  const stat = fs.statSync(filePath);
  return { fileName, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
}

function listBackups() {
  return fs.readdirSync(BACKUP_ROOT)
    .filter(isSafeBackupFileName)
    .map(statForFile)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* وقتی تعداد بکاپ‌ها از ۵۰ رد بشه، قدیمی‌ترین‌ها حذف می‌شن تا فضای دیسک بی‌نهایت پر نشه. */
async function enforceRetention() {
  const backups = listBackups();
  const excess = backups.slice(MAX_BACKUPS);
  for (const backup of excess) {
    fs.unlinkSync(path.join(BACKUP_ROOT, backup.fileName));
  }
  return excess.length;
}

function getBackupFilePath(fileName) {
  if (!isSafeBackupFileName(fileName)) return null;
  const filePath = path.join(BACKUP_ROOT, fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

function deleteBackup(fileName) {
  const filePath = getBackupFilePath(fileName);
  if (!filePath) return false;
  fs.unlinkSync(filePath);
  return true;
}

/* ریستور کامل: هر کالکشن داخل زیپ جایگزین کالکشن فعلی هم‌نام می‌شه (drop + insert کامل)،
   نه merge؛ چون تسک صریحاً "ریستور کامل" خواسته، نه بازیابی جزئی/انتخابی. */
/* source می‌تونه یک مسیر فایل باشه یا یک Buffer (adm-zip از هر دو پشتیبانی می‌کنه) */
async function restoreFromFile(source) {
  const zip = new AdmZip(source);
  const metaEntry = zip.getEntry('meta.json');
  if (!metaEntry) throw new Error('invalid_backup_file');
  const meta = JSON.parse(zip.readAsText(metaEntry));

  const db = mongoose.connection.db;
  const restored = [];
  for (const { name } of meta.collections) {
    const entry = zip.getEntry(`collections/${name}.json`);
    if (!entry) continue;
    const docs = EJSON.parse(zip.readAsText(entry));

    const collection = db.collection(name);
    await collection.deleteMany({});
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      if (batch.length) await collection.insertMany(batch, { ordered: false });
    }
    restored.push({ name, count: docs.length });
  }
  return { dbName: meta.dbName, restoredAt: new Date().toISOString(), collections: restored };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/* زمان‌بندی خودکار هفتگی: مثل newArrivalSweep از setInterval ساده استفاده می‌کنیم، نه یک
   وابستگی جدید برای cron. برخلاف اون sweep، اینجا بلافاصله بعد از بالا اومدن سرور بکاپ
   نمی‌گیریم مگر بکاپ قبلی بیشتر از یک هفته قدیمی باشه (یا اصلاً بکاپی وجود نداشته باشه) —
   وگرنه هر ری‌استارت/دیپلوی یک بکاپ اضافه و بی‌فایده می‌ساخت. */
function startWeeklyBackupSchedule() {
  async function runIfDue() {
    const backups = listBackups();
    const last = backups[0];
    const isDue = !last || (Date.now() - new Date(last.createdAt).getTime()) >= WEEK_MS;
    if (!isDue) return;
    try {
      const result = await createBackup();
      console.log(`[db-backup] بکاپ هفتگی خودکار گرفته شد: ${result.fileName} (${result.sizeBytes} بایت)`);
    } catch (err) {
      console.error('[db-backup] خطا در بکاپ خودکار هفتگی:', err.message);
    }
  }
  runIfDue();
  setInterval(runIfDue, WEEK_MS);
}

module.exports = {
  BACKUP_ROOT,
  MAX_BACKUPS,
  createBackup,
  listBackups,
  getBackupFilePath,
  deleteBackup,
  restoreFromFile,
  startWeeklyBackupSchedule,
};
