'use strict';

const express = require('express');
const adminAuth = require('../lib/adminAuth');
const { uploadProductImage, saveProductImageWebp, uploadHeroImage, saveHeroImageWebp } = require('../lib/upload');
const userService = require('../services/userService');
const orderService = require('../services/orderService');
const productService = require('../services/productService');
const categoryService = require('../services/categoryService');
const colorService = require('../services/colorService');
const couponService = require('../services/couponService');
const bannerService = require('../services/bannerService');
const heroService = require('../services/heroService');
const settingsService = require('../services/settingsService');
const adminService = require('../services/adminService');
const reportService = require('../services/reportService');
const { REPORTS_ENABLED } = require('../lib/reportsFlag');
const { buildWorkbookResponse } = require('../lib/xlsxExport');

const router = express.Router();

/* ---------- ورود/خروج ادمین (توکن ثابت، جدا از سشن کاربر عادی) ---------- */
router.post('/login', async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (!token) return res.status(400).json({ error: 'invalid_input' });

  const admin = await adminAuth.findAdminByToken(token);
  if (!admin) return res.status(401).json({ error: 'invalid_token' });

  const session = await adminAuth.createAdminSession(admin.id);
  res.cookie(adminAuth.ADMIN_SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: adminAuth.ADMIN_SESSION_MAX_AGE_MS,
  });
  res.json({ admin });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies[adminAuth.ADMIN_SESSION_COOKIE];
  if (token) await adminAuth.destroyAdminSession(token);
  res.clearCookie(adminAuth.ADMIN_SESSION_COOKIE);
  res.json({ ok: true });
});

router.get('/me', adminAuth.requireAdminAuth, (req, res) => {
  res.json({ admin: req.admin, reportsEnabled: REPORTS_ENABLED });
});

/* از این‌جا به بعد همه‌ی مسیرها حتماً نیاز به لاگین ادمین دارن */
router.use(adminAuth.requireAdminAuth);

/* ---------- اتصال حساب تلگرام («اتصال تلگرام» در پنل وب) ---------- */
router.post('/telegram/link-token', async (req, res) => {
  const result = await adminService.generateTelegramLinkToken(req.admin.id);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json({
    token: result.token,
    deepLink: `https://t.me/${result.botUsername}?start=${result.token}`,
    expiresInSeconds: result.expiresInSeconds,
  });
});

router.post('/telegram/unlink', async (req, res) => {
  await adminService.unlinkTelegram(req.admin.id);
  res.json({ ok: true });
});

/* ---------- کاربران ---------- */
router.get('/users', adminAuth.requirePermission('users'), async (req, res) => {
  res.json(await userService.listUsers());
});

router.put('/users/:id', adminAuth.requirePermission('users'), async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json(user);
});

router.delete('/users/:id', adminAuth.requirePermission('users'), async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.json({ ok: true });
});

/* ---------- سفارشات ---------- */
router.get('/orders', adminAuth.requirePermission('orders'), async (req, res) => {
  res.json(await orderService.listOrders());
});

router.patch('/orders/:id', adminAuth.requirePermission('orders'), async (req, res) => {
  const result = await orderService.changeOrderStatus(req.params.id, req.body.status);
  if (!result.ok) return res.status(result.error === 'not_found' ? 404 : 400).json({ error: result.error });
  res.json(result.order);
});

/* لینک صفحه‌ی محصول از داخل جزئیات سفارش — فقط category/code لازمه که آدرس عمومی
   محصول (/دسته‌بندی/کد) از روش ساخته بشه؛ زیر مجوز «orders» چون فقط همون‌جا استفاده می‌شه. */
router.get('/orders/product-link/:productId', adminAuth.requirePermission('orders'), async (req, res) => {
  const product = await productService.getProductById(req.params.productId);
  if (!product) return res.status(404).json({ error: 'not_found' });
  res.json({ category: product.category, code: product.code });
});

/* ---------- محصولات و دسته‌بندی‌ها ---------- */
router.get('/products', adminAuth.requirePermission('products'), async (req, res) => {
  res.json(await productService.listProducts());
});

router.post('/products/upload-images', adminAuth.requirePermission('products'), (req, res) => {
  uploadProductImage.array('images', 10)(req, res, async err => {
    if (err) return res.status(400).json({ error: 'upload_failed', message: err.message });
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'no_file' });
    try {
      const urls = [];
      for (const file of req.files) urls.push(await saveProductImageWebp(file.buffer));
      res.json({ urls });
    } catch (convertErr) {
      console.error('[upload] product image webp conversion failed:', convertErr.message);
      res.status(400).json({ error: 'upload_failed', message: 'invalid image data' });
    }
  });
});

/* آپلود تک‌تصویری (مثلاً برای تصویر دسته‌بندی) — همون مسیر تبدیل به webp که تصاویر محصول استفاده می‌کنن */
router.post('/products/upload-image', adminAuth.requirePermission('products'), (req, res) => {
  uploadProductImage.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: 'upload_failed', message: err.message });
    if (!req.file) return res.status(400).json({ error: 'no_file' });
    try {
      const url = await saveProductImageWebp(req.file.buffer);
      res.json({ url });
    } catch (convertErr) {
      console.error('[upload] category image webp conversion failed:', convertErr.message);
      res.status(400).json({ error: 'upload_failed', message: 'invalid image data' });
    }
  });
});

router.post('/products', adminAuth.requirePermission('products'), async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'invalid_input', message: err.message });
  }
});

router.put('/products/:id', adminAuth.requirePermission('products'), async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  if (!product) return res.status(404).json({ error: 'not_found' });
  res.json(product);
});

router.delete('/products/:id', adminAuth.requirePermission('products'), async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.json({ ok: true });
});

/* اطلاع‌رسانی دستی تخفیف: ادمین از پنل برای این محصول یک پیامک تبلیغاتی به همه‌ی کاربران ثبت‌نامی می‌فرسته */
router.post('/products/:id/notify-discount', adminAuth.requirePermission('products'), async (req, res) => {
  const result = await productService.notifyDiscount(req.params.id);
  if (!result.ok && result.error) {
    return res.status(result.error === 'not_found' ? 404 : 400).json({ error: result.error });
  }
  res.json({ ok: result.ok, recipients: result.recipients });
});

router.get('/products/next-code', adminAuth.requirePermission('products'), async (req, res) => {
  res.json({ code: await productService.getNextCode() });
});

/* ---------- پالت رنگی مشترک (۲۴ رنگ پایه + هر رنگ سفارشی که ادمین با RGB بسازه) ---------- */
router.get('/colors', adminAuth.requirePermission('products'), async (req, res) => {
  res.json(await colorService.listColors());
});

router.post('/colors', adminAuth.requirePermission('products'), async (req, res) => {
  try {
    const color = await colorService.upsertColor(req.body);
    res.status(201).json(color);
  } catch (err) {
    res.status(400).json({ error: 'invalid_input', message: err.message });
  }
});

router.get('/categories', adminAuth.requirePermission('products'), async (req, res) => {
  res.json(await categoryService.listCategories());
});

router.post('/categories', adminAuth.requirePermission('products'), async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: 'invalid_input', message: err.message });
  }
});

router.put('/categories/:id', adminAuth.requirePermission('products'), async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  if (!category) return res.status(404).json({ error: 'not_found' });
  res.json(category);
});

router.delete('/categories/:id', adminAuth.requirePermission('products'), async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.json({ ok: true });
});

/* ---------- کدهای تخفیف ---------- */
router.get('/coupons', adminAuth.requirePermission('coupons'), async (req, res) => {
  res.json(await couponService.listCoupons());
});

router.post('/coupons', adminAuth.requirePermission('coupons'), async (req, res) => {
  const result = await couponService.createCoupon(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error, message: result.message });
  res.status(201).json(result.coupon);
});

router.put('/coupons/:id', adminAuth.requirePermission('coupons'), async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  if (!coupon) return res.status(404).json({ error: 'not_found' });
  res.json(coupon);
});

router.delete('/coupons/:id', adminAuth.requirePermission('coupons'), async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  res.json({ ok: true });
});

/* ---------- تنظیمات کارت‌به‌کارت اختصاصی (تنها روش پرداخت فعال سایت) ---------- */
router.get('/card-settings', adminAuth.requirePermission('orders'), async (req, res) => {
  const settings = await settingsService.getSettings();
  res.json({
    cardToCardNumber: settings.cardToCardNumber,
    cardToCardHolder: settings.cardToCardHolder,
    cardToCardBank: settings.cardToCardBank,
  });
});

router.put('/card-settings', adminAuth.requirePermission('orders'), async (req, res) => {
  const { number, holder, bank } = req.body;
  const result = await settingsService.updateCardToCard({ number, holder, bank });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({
    cardToCardNumber: result.settings.cardToCardNumber,
    cardToCardHolder: result.settings.cardToCardHolder,
    cardToCardBank: result.settings.cardToCardBank,
  });
});

/* ---------- بنر شناور بالای سایت ---------- */
router.get('/banners', adminAuth.requirePermission('appearance'), async (req, res) => {
  res.json(await bannerService.listBanners());
});

router.post('/banners', adminAuth.requirePermission('appearance'), async (req, res) => {
  const result = await bannerService.createBanner(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json(result.banner);
});

router.put('/banners/:id', adminAuth.requirePermission('appearance'), async (req, res) => {
  const banner = await bannerService.updateBanner(req.params.id, req.body);
  if (!banner) return res.status(404).json({ error: 'not_found' });
  res.json(banner);
});

router.delete('/banners/:id', adminAuth.requirePermission('appearance'), async (req, res) => {
  await bannerService.deleteBanner(req.params.id);
  res.json({ ok: true });
});

/* ---------- اسلایدهای هیرو سکشن لندینگ ---------- */
router.get('/hero-slides', adminAuth.requirePermission('appearance'), async (req, res) => {
  res.json(await heroService.listSlides());
});

router.post('/hero-slides/upload-image', adminAuth.requirePermission('appearance'), (req, res) => {
  uploadHeroImage.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: 'upload_failed', message: err.message });
    if (!req.file) return res.status(400).json({ error: 'no_file' });
    try {
      const url = await saveHeroImageWebp(req.file.buffer);
      res.json({ url });
    } catch (convertErr) {
      console.error('[upload] hero image webp conversion failed:', convertErr.message);
      res.status(400).json({ error: 'upload_failed', message: 'invalid image data' });
    }
  });
});

router.post('/hero-slides', adminAuth.requirePermission('appearance'), async (req, res) => {
  const result = await heroService.createSlide(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json(result.slide);
});

router.put('/hero-slides/reorder', adminAuth.requirePermission('appearance'), async (req, res) => {
  const result = await heroService.reorderSlides(req.body.order);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

router.put('/hero-slides/:id', adminAuth.requirePermission('appearance'), async (req, res) => {
  const slide = await heroService.updateSlide(req.params.id, req.body);
  if (!slide) return res.status(404).json({ error: 'not_found' });
  res.json(slide);
});

router.delete('/hero-slides/:id', adminAuth.requirePermission('appearance'), async (req, res) => {
  await heroService.deleteSlide(req.params.id);
  res.json({ ok: true });
});

/* ---------- تنظیمات ظاهری سایت ---------- */
router.get('/settings', adminAuth.requirePermission('appearance'), async (req, res) => {
  res.json(await settingsService.getSettings());
});

router.put('/settings', adminAuth.requirePermission('appearance'), async (req, res) => {
  const result = await settingsService.updateColorPreset(req.body.colorPreset);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result.settings);
});

/* ---------- مدیریت ادمین‌ها (فقط با permission «admins») ---------- */
router.get('/admins', adminAuth.requirePermission('admins'), async (req, res) => {
  res.json(await adminService.listAdmins());
});

router.post('/admins', adminAuth.requirePermission('admins'), async (req, res) => {
  const result = await adminService.createAdmin(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json({ admin: result.admin, token: result.token });
});

router.put('/admins/:id', adminAuth.requirePermission('admins'), async (req, res) => {
  const admin = await adminService.updateAdmin(req.params.id, req.body);
  if (!admin) return res.status(404).json({ error: 'not_found' });
  res.json(admin);
});

router.delete('/admins/:id', adminAuth.requirePermission('admins'), async (req, res) => {
  const result = await adminService.deleteAdmin(req.params.id, req.admin.id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

/* ---------- گزارش‌گیری/نمودار (پشت REPORTS_ENABLED) ----------
   وقتی فیچر خاموشه، این میدل‌ور همه‌ی زیرمسیرهای /reports رو با ۴۰۴ خام جواب می‌ده — نه
   یک خطای JSON قابل‌تشخیص — تا حتی وجود این بخش هم برای کسی که مستقیم درخواست بزنه لو نره. */
function requireReportsEnabled(req, res, next) {
  if (!REPORTS_ENABLED) return res.status(404).end();
  next();
}
router.use('/reports', requireReportsEnabled);

function parseRange(req) {
  return { from: req.query.from, to: req.query.to };
}

router.get('/reports/overview', adminAuth.requirePermission('reports'), async (req, res) => {
  const range = parseRange(req);
  const [visits, logins, purchases, newProducts, topProducts] = await Promise.all([
    reportService.getVisitStats(range),
    reportService.getLoginStats(range),
    reportService.getPurchaseStats(range),
    reportService.getNewProductsCount(range),
    reportService.getTopSellingProducts({ ...range, limit: 10 }),
  ]);
  res.json({ visits, logins, purchases, newProductsCount: newProducts, topProducts });
});

router.get('/reports/discounts', adminAuth.requirePermission('reports'), async (req, res) => {
  res.json(await reportService.getDiscountedProducts());
});

router.get('/reports/top-products', adminAuth.requirePermission('reports'), async (req, res) => {
  const range = parseRange(req);
  res.json(await reportService.getTopSellingProducts({ ...range, limit: Number(req.query.limit) || 10 }));
});

/* ---------- خروجی اکسل هر یک از گزارش‌های بالا ---------- */
const REPORT_EXPORTERS = {
  visits: async range => {
    const { daily } = await reportService.getVisitStats(range);
    return {
      rows: daily,
      columns: [
        { header: 'تاریخ', key: 'day' },
        { header: 'بازدید کل', key: 'views' },
        { header: 'بازدیدکننده‌ی یکتا', key: 'uniqueVisitors' },
      ],
    };
  },
  logins: async range => {
    const { rows } = await reportService.getLoginStats(range);
    return {
      rows,
      columns: [
        { header: 'شماره تلفن', key: 'phone' },
        { header: 'تعداد ورود', key: 'loginCount' },
        { header: 'آخرین ورود', key: 'lastLoginAt' },
      ],
    };
  },
  purchases: async range => {
    const { rows } = await reportService.getPurchaseStats(range);
    return {
      rows,
      columns: [
        { header: 'نام', key: 'name' },
        { header: 'شماره تلفن', key: 'phone' },
        { header: 'تعداد سفارش', key: 'orders' },
        { header: 'مجموع خرید (تومان)', key: 'totalSpent' },
      ],
    };
  },
  discounts: async () => {
    const rows = await reportService.getDiscountedProducts();
    return {
      rows,
      columns: [
        { header: 'کد محصول', key: 'code' },
        { header: 'نام محصول', key: 'name', width: 30 },
        { header: 'نوع تخفیف', key: 'discountType' },
        { header: 'مقدار تخفیف', key: 'discountValue' },
        { header: 'مبنا', key: 'discountBasis' },
        { header: 'فعال', key: 'discountActive' },
        { header: 'باقی‌مانده', key: 'remainingLabel', width: 26 },
      ],
    };
  },
  'top-products': async range => {
    const rows = await reportService.getTopSellingProducts({ ...range, limit: 100 });
    return {
      rows,
      columns: [
        { header: 'کد محصول', key: 'code' },
        { header: 'نام محصول', key: 'name', width: 30 },
        { header: 'تعداد فروخته‌شده', key: 'qtySold' },
        { header: 'مجموع فروش (تومان)', key: 'revenue' },
      ],
    };
  },
};

router.get('/reports/:type/export.xlsx', adminAuth.requirePermission('reports'), async (req, res) => {
  const exporter = REPORT_EXPORTERS[req.params.type];
  if (!exporter) return res.status(404).json({ error: 'unknown_report_type' });
  const { rows, columns } = await exporter(parseRange(req));
  await buildWorkbookResponse(res, `report-${req.params.type}`, rows, columns);
});

module.exports = router;
