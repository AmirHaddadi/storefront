'use strict';

const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const dbBackup = require('../lib/dbBackup');

const router = express.Router();

const MAX_RESTORE_UPLOAD_BYTES = 500 * 1024 * 1024; // ۵۰۰ مگابایت — سقف بالا چون کل دیتابیس‌ه
const uploadBackupFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESTORE_UPLOAD_BYTES },
});

function timingSafeTokenMatch(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/* این صفحه/API کاملاً پشت DB_BACKUP_TOKEN است — یک توکن ثابت جدا از سیستم لاگین ادمین/کاربر
   (طبق تسک: "با رمز عبور توکن درون env"). اگر این env ست نشده باشه، کل فیچر غیرفعاله و هر
   درخواستی ۴۰۴ می‌گیره؛ همون الگوی REPORTS_ENABLED/TELEGRAM_BOT_TOKEN توی این پروژه. */
function requireBackupToken(req, res, next) {
  const configuredToken = process.env.DB_BACKUP_TOKEN;
  if (!configuredToken) return res.status(404).json({ error: 'not_found' });

  const suppliedToken = req.get('x-backup-token') || (req.body && req.body.token) || '';
  if (!timingSafeTokenMatch(suppliedToken, configuredToken)) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  next();
}

router.post('/verify', requireBackupToken, (req, res) => res.json({ ok: true }));

router.get('/list', requireBackupToken, (req, res) => {
  res.json({ backups: dbBackup.listBackups(), maxBackups: dbBackup.MAX_BACKUPS });
});

router.post('/create', requireBackupToken, async (req, res) => {
  try {
    const backup = await dbBackup.createBackup();
    res.json({ backup, backups: dbBackup.listBackups() });
  } catch (err) {
    console.error('[dev-api] خطا در ساخت بکاپ:', err);
    res.status(500).json({ error: 'backup_failed' });
  }
});

router.get('/download/:fileName', requireBackupToken, (req, res) => {
  const filePath = dbBackup.getBackupFilePath(req.params.fileName);
  if (!filePath) return res.status(404).json({ error: 'not_found' });
  res.download(filePath, req.params.fileName);
});

router.delete('/:fileName', requireBackupToken, (req, res) => {
  const deleted = dbBackup.deleteBackup(req.params.fileName);
  if (!deleted) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, backups: dbBackup.listBackups() });
});

/* ریستور کامل: کاملاً مخرب و برگشت‌ناپذیره (drop + جایگزینی هر کالکشن)، تاییدش سمت کلاینت
   با یک پرامپت صریح گرفته می‌شه، نه اینجا. */
router.post('/restore', requireBackupToken, uploadBackupFile.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'invalid_input' });
  try {
    const result = await dbBackup.restoreFromFile(req.file.buffer);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[dev-api] خطا در ریستور بکاپ:', err);
    res.status(400).json({ error: 'restore_failed', message: err.message });
  }
});

module.exports = router;
