'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');
const cookieParser = require('cookie-parser');
const auth = require('./lib/auth');
const { CLIENT_ROOT, sendNotFound } = require('./lib/pages');
const { UPLOADS_ROOT } = require('./lib/upload');
const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminApiRouter = require('./routes/adminApi');
const devApiRouter = require('./routes/devApi');
const telegram = require('./telegram');
const { REPORTS_ENABLED } = require('./lib/reportsFlag');
const { pageViewTracker } = require('./lib/pageViewTracker');

const app = express();
app.use(express.json());
app.use(cookieParser());

/* ربات تلگرام پنل ادمین: روی همین Express app (بدون سرویس/پورت جدا) به‌صورت
   webhook مانت می‌شه. اگر TELEGRAM_BOT_TOKEN تنظیم نشده باشه، telegram.bot
   خالیه و این بخش کاملاً غیرفعال می‌مونه. باید قبل از میدلور بستن *.html و
   قبل از auth.attachUser بیاد چون مسیرش با بقیه‌ی سایت فرق داره. */
if (telegram.bot) {
  app.use(telegram.webhookPath, telegram.bot.webhookCallback(telegram.webhookPath));
}

app.use(auth.attachUser);

/* هیچ endpoint ای در کل سایت نباید پسوند فایل داشته باشد؛
   دسترسی مستقیم به *.html همیشه باید 404 بدهد (فقط از طریق روت‌های تمیز زیر سرو می‌شود). */
app.use((req, res, next) => {
  if (req.path.toLowerCase().endsWith('.html')) {
    return sendNotFound(res);
  }
  next();
});

/* فایل‌های آپلودی (اَواتار/رسید/عکس محصول) از UPLOADS_ROOT سرو می‌شن — که ممکنه (روی هاست ابری)
   خارج از مسیر کد باشه (یک Volume پایدار)، پس باید جدا از استاتیک زیر mount بشه، نه زیرمجموعه‌ش. */
app.use('/assets/uploads', express.static(UPLOADS_ROOT, { index: false }));

/* فایل‌های استاتیک (css/js/تصاویر/فونت) — با پسوند خودشان سرو می‌شوند، این خارج از قید بالاست */
app.use(express.static(CLIENT_ROOT, { index: false }));

/* ثبت بازدید صفحات فقط وقتی بخش گزارش‌گیری فعاله mount می‌شه — طبق نکته‌ی صریح تسک:
   وقتی REPORTS_ENABLED خاموشه این فیچر باید کاملاً بی‌اثر باشه (حتی هزینه‌ی نوشتن دیتابیس). */
if (REPORTS_ENABLED) {
  app.use(pageViewTracker);
}

app.use('/api', apiRouter);
app.use('/admin/api', adminApiRouter);
app.use('/dev/api/db-backup', devApiRouter);
app.use('/', pagesRouter);

/* ---------- 404 نهایی ---------- */
app.use((req, res) => sendNotFound(res));

module.exports = app;
