'use strict';

const express = require('express');
const Category = require('../models/Category');
const { sendPage, sendNotFound } = require('../lib/pages');
const { ADMIN_SESSION_COOKIE, getAdminBySession } = require('../lib/adminAuth');
const { REPORTS_ENABLED } = require('../lib/reportsFlag');

const router = express.Router();

/* صفحات پنل ادمین سمت سرور محافظت می‌شن: بدون سشن معتبر، مستقیم به /admin/login ریدایرکت می‌شن
   (سخت‌گیرتر از صفحات حساب کاربری چون این بخش حساس‌تره) */
async function requireAdminPage(req, res, next) {
  const token = req.cookies[ADMIN_SESSION_COOKIE];
  const admin = token ? await getAdminBySession(token) : null;
  if (!admin) return res.redirect('/admin/login');
  next();
}

/* پنل ادمین: سفارشات/محصولات/کاربران/ادمین‌ها همه یک فایل مشترک (admin-panel.html) سرو
   می‌کنن؛ کلاینت (admin.js) بر اساس location.pathname تب/سکشن درست رو فعال می‌کنه. */
/* اگر سشن ادمین همین دستگاه هنوز معتبره، دیگه نیازی به نمایش دوباره‌ی فرم لاگین نیست
   و مستقیم به پنل هدایت می‌شه */
router.get('/admin/login', async (req, res) => {
  const token = req.cookies[ADMIN_SESSION_COOKIE];
  const admin = token ? await getAdminBySession(token) : null;
  if (admin) return res.redirect('/admin');
  sendPage(res, 'admin-login.html');
});
router.get('/admin', (req, res) => res.redirect('/admin/orders'));
router.get('/admin/orders', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin/products', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin/coupons', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin/users', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin/appearance', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
router.get('/admin/admins', requireAdminPage, (req, res) => sendPage(res, 'admin-panel.html'));
/* بخش گزارش‌گیری پشت REPORTS_ENABLED است — وقتی خاموشه این مسیر باید دقیقاً مثل یک مسیر
   ناموجود رفتار کنه (۴۰۴ خام، نه ریدایرکت که وجود فیچر رو لو بده)، حتی برای ادمین لاگین‌کرده. */
router.get('/admin/reports', requireAdminPage, (req, res) => {
  if (!REPORTS_ENABLED) return sendNotFound(res);
  sendPage(res, 'admin-panel.html');
});

/* ابزار داخلی بکاپ/ریستور دیتابیس: کاملاً جدا از سیستم لاگین ادمین، فقط پشت DB_BACKUP_TOKEN
   (در server/routes/devApi.js چک می‌شه). اگر توکن ست نشده باشه، صفحه هم مثل API مربوطه ۴۰۴
   می‌ده — انگار این مسیر اصلاً وجود نداره. */
router.get('/dev/db/backup', (req, res) => {
  if (!process.env.DB_BACKUP_TOKEN) return sendNotFound(res);
  sendPage(res, 'dev-db-backup.html');
});

/* ---------- صفحات مشتری با روت تمیز (بدون پسوند) ---------- */
router.get('/', (req, res) => sendPage(res, 'index.html'));
router.get('/faq', (req, res) => sendPage(res, 'faq.html'));
router.get('/contact', (req, res) => sendPage(res, 'contact.html'));
/* ثبت سفارش یک صفحه‌ی کاملاً مجزاست (نه پاپ‌آپ)، چون از دکمه‌ی سبد خرید در تب جدید
   باز می‌شه؛ این‌طوری اگه کاربر برای وارد کردن اطلاعات بانکی به اپ بانک سوییچ کنه،
   تب اصلی فروشگاه دست‌نخورده می‌مونه. */
router.get('/checkout', (req, res) => sendPage(res, 'checkout.html'));

/* صفحه‌ی اختصاصی هر دسته‌بندی: فهرست کامل محصولات همون دسته (+ زیرمجموعه‌هاش) با شرح/فیلتر/صفحه‌بندی */
router.get('/category/:id', (req, res) => sendPage(res, 'category.html'));

/* حساب کاربری: پروفایل/سفارش‌ها/پیگیری هم یک فایل مشترک (account-panel.html) با تب سرو
   می‌کنن؛ script.js بر اساس location.pathname تب درست رو فعال می‌کنه. سایزهای تنظیم‌شده
   جدا مونده (account-sizes.html) چون در دامنه‌ی این یکپارچه‌سازی نبود. */
router.get('/track', (req, res) => sendPage(res, 'account-panel.html'));
router.get('/account/orders', (req, res) => sendPage(res, 'account-panel.html'));
router.get('/account/sizes', (req, res) => sendPage(res, 'account-sizes.html'));
router.get('/account/profile', (req, res) => sendPage(res, 'account-panel.html'));

/* صفحه‌ی جزئیات محصول: /دسته‌بندی/کد-محصول — فقط اگر دسته‌بندی شناخته‌شده باشد
   (باید بعد از همه‌ی روت‌های تک/دوسگمنتی بالا ثبت بشه، چون هر مسیر دوسگمنتی رو می‌گیرد) */
router.get('/:category/:code', async (req, res, next) => {
  const isKnownCategory = await Category.exists({ id: req.params.category });
  if (!isKnownCategory) return next();
  sendPage(res, 'product.html');
});

module.exports = router;
