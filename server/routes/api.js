'use strict';

const crypto = require('crypto');
const express = require('express');
const auth = require('../lib/auth');
const { uploadAvatar, uploadReceipt } = require('../lib/upload');
const { notifyOrderCustomer } = require('../lib/notifier');
const { ORDER_STATUS_LABELS } = require('../lib/orderStatus');
const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const { REPORTS_ENABLED } = require('../lib/reportsFlag');
const colorService = require('../services/colorService');
const SizeProfile = require('../models/SizeProfile');
const Order = require('../models/Order');
const SiteSettings = require('../models/SiteSettings');
const Banner = require('../models/Banner');
const { validateCoupon } = require('../lib/coupons');
const telegramNotify = require('../telegram/notify');
const heroService = require('../services/heroService');
const { SHIPPING_FEE_TOMAN } = require('../lib/shipping');

const router = express.Router();

/* ---------- تنظیمات ظاهری سایت (پریست رنگی) ---------- */
router.get('/settings', async (req, res) => {
  const settings = await SiteSettings.getSingleton();
  res.json({
    colorPreset: settings.colorPreset,
    cardToCardNumber: settings.cardToCardNumber,
    cardToCardHolder: settings.cardToCardHolder,
    cardToCardBank: settings.cardToCardBank,
  });
});

/* ---------- بنر شناور بالای سایت ---------- */
router.get('/banners', async (req, res) => {
  res.json(await Banner.find({ active: true }).sort({ order: 1, createdAt: 1 }));
});

/* ---------- اسلایدهای هیرو سکشن لندینگ ---------- */
router.get('/hero-slides', async (req, res) => {
  res.json(await heroService.listActiveSlides());
});

/* ---------- دسته‌بندی‌ها و محصولات ---------- */
router.get('/categories', async (req, res) => {
  res.json(await Category.find().sort({ createdAt: 1 }));
});

/* پالت رنگی کامل — برای فیلتر رنگ در سمت مشتری، مستقل از این‌که الان کدوم رنگ‌ها
   روی محصولات بارگذاری‌شده استفاده شده باشن (تا فیلتر رنگ همیشه کامل باشه). */
router.get('/colors', async (req, res) => {
  res.json(await colorService.listColors());
});

router.get('/products', async (req, res) => {
  const { category, search } = req.query;
  const filter = {};
  if (category && category !== 'all') filter.category = category;
  if (search) filter.name = new RegExp(String(search).trim(), 'i');
  const products = await Product.find(filter).sort({ createdAt: 1 });
  res.json(products.map(p => p.getPublicView()));
});

/* کد محصول یکتاست (unique در مدل)، پس دسته‌بندی توی مسیر لازم نیست */
router.get('/products/:code', async (req, res) => {
  const product = await Product.findOne({ code: req.params.code });
  if (!product) return res.status(404).json({ error: 'not_found' });
  res.json(product.getPublicView());
});

/* ---------- ورود سریع با شماره تلفن/کد تایید (بیس، بدون اتصال واقعی پنل پیامک) ---------- */
router.post('/auth/otp/request', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!auth.isValidIranianPhone(phone)) {
    return res.status(400).json({ error: 'invalid_phone' });
  }
  await auth.generateOtp(phone);
  res.json({ ok: true });
});

router.post('/auth/otp/verify', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const code = String(req.body.code || '').trim();
  if (!auth.isValidIranianPhone(phone) || !code) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  if (!auth.verifyOtpCode(phone, code)) {
    return res.status(401).json({ error: 'invalid_code' });
  }
  const user = await auth.findOrCreateUser(phone);
  const token = await auth.createSession(user.id);
  res.cookie(auth.SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: auth.SESSION_MAX_AGE_MS,
  });

  if (REPORTS_ENABLED) {
    const now = new Date();
    LoginEvent.create({ userId: user.id, phone: user.phone, createdAt: now }).catch(err => console.error('[login-event] Error:', err.message));
    User.updateOne({ _id: user.id }, { $set: { lastLoginAt: now } }).catch(err => console.error('[login-event] lastLoginAt update failed:', err.message));
  }

  res.json({ user });
});

router.post('/auth/logout', async (req, res) => {
  const token = req.cookies[auth.SESSION_COOKIE];
  if (token) await auth.destroySession(token);
  res.clearCookie(auth.SESSION_COOKIE);
  res.json({ ok: true });
});

router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ---------- پروفایل کاربری ---------- */
router.put('/me/profile', auth.requireAuth, async (req, res) => {
  const fields = ['firstName', 'lastName', 'address', 'postalCode', 'province', 'city'];
  fields.forEach(f => {
    if (typeof req.body[f] === 'string') req.user[f] = req.body[f].trim();
  });
  await req.user.save();
  res.json({ user: req.user });
});

router.post('/me/avatar', auth.requireAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async err => {
    if (err) return res.status(400).json({ error: 'upload_failed', message: err.message });
    if (!req.file) return res.status(400).json({ error: 'no_file' });

    req.user.avatarUrl = `assets/uploads/avatars/${req.file.filename}`;
    await req.user.save();
    res.json({ user: req.user });
  });
});

/* ---------- پروفایل سایز (ماژول اختیاری «راهنمای سایز») ----------
   یک نمونه‌ی آماده برای فروشگاه‌های پوشاک/کفش: از دور سینه/کمر/باسن نزدیک‌ترین سایز
   پیشنهادی رو حساب می‌کنه. چارت زیر فقط داده‌ی نمونه‌ست و برای هر کسب‌وکاری قابل تغییره؛
   اگر دامنه‌ی فروشگاه به سایز ربطی نداره، این بخش و صفحه‌ی /account/sizes رو می‌شه حذف کرد. */
const SIZE_CHART = [
  { size: 'S', chest: [82, 86], waist: [62, 66], hip: [87, 91] },
  { size: 'M', chest: [86, 90], waist: [66, 70], hip: [91, 95] },
  { size: 'L', chest: [90, 94], waist: [70, 74], hip: [95, 99] },
  { size: 'XL', chest: [94, 100], waist: [74, 80], hip: [99, 105] },
  { size: '2XL', chest: [100, 106], waist: [80, 86], hip: [105, 111] },
];
// پارچه‌ی کشسان بدن بزرگ‌تر رو هم توی سایز کوچک‌تر جا می‌ده — تلورانس موقت به نفع سایز کوچک‌تر
// (منطق دقیق‌تر بعداً جایگزین می‌شه، طبق درخواست کارفرما)
const ELASTIC_TOLERANCE_CM = 3;

function nearestSizeForMeasurement(value, key, elastic) {
  const adjusted = elastic ? value - ELASTIC_TOLERANCE_CM : value;
  let best = SIZE_CHART[0].size;
  let bestDistance = Infinity;
  SIZE_CHART.forEach(row => {
    const [min, max] = row[key];
    const distance = adjusted < min ? min - adjusted : adjusted > max ? adjusted - max : 0;
    if (distance < bestDistance) { bestDistance = distance; best = row.size; }
  });
  return best;
}

function calcSuggestedSize({ chest, waist, hip, elastic = false }) {
  const order = SIZE_CHART.map(r => r.size);
  const candidates = [
    nearestSizeForMeasurement(Number(chest), 'chest', elastic),
    nearestSizeForMeasurement(Number(waist), 'waist', elastic),
    nearestSizeForMeasurement(Number(hip), 'hip', elastic),
  ].map(size => order.indexOf(size)).sort((a, b) => a - b);
  return order[candidates[1]]; // میانه‌ی سه نتیجه
}

router.get('/me/sizes', auth.requireAuth, async (req, res) => {
  res.json(await SizeProfile.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

router.post('/me/sizes', auth.requireAuth, async (req, res) => {
  const { label, height, weight, chest, waist, hip, fabricType } = req.body;
  if (!label || !chest || !waist || !hip) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const elastic = fabricType === 'elastic';
  const profile = await SizeProfile.create({
    userId: req.user.id,
    label: String(label).trim(),
    height: Number(height) || null,
    weight: Number(weight) || null,
    chest: Number(chest),
    waist: Number(waist),
    hip: Number(hip),
    fabricType: elastic ? 'elastic' : 'non-elastic',
    suggestedSize: calcSuggestedSize({ chest, waist, hip, elastic }),
  });
  res.status(201).json(profile);
});

router.delete('/me/sizes/:id', auth.requireAuth, async (req, res) => {
  await SizeProfile.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

/* ---------- کدهای تخفیف ---------- */
router.post('/coupons/validate', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const subtotal = Number(req.body.subtotal) || 0;
  if (!auth.isValidIranianPhone(phone) || !subtotal) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const result = await validateCoupon(req.body.code, phone, subtotal);
  if (!result.ok) return res.status(400).json({ error: 'invalid_coupon', reason: result.reason });
  res.json({ ok: true, discountAmount: result.discountAmount, code: result.coupon.code });
});

/* ---------- سفارش‌ها ---------- */
async function generateOrderCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (await Order.exists({ code }));
  return code;
}

router.post('/orders', auth.attachUser, async (req, res) => {
  const { items, total, customer, shippingMethod, shippingPayment, discountCode } = req.body;
  if (!Array.isArray(items) || !items.length || !customer?.phone) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  // موجودی هنوز کم نمی‌شه (این کار فقط موقع تایید پرداخت توسط ادمین انجام می‌شه)، ولی همین‌جا
  // چک می‌کنیم که مشتری بیشتر از موجودی واقعی سفارش نداده باشه.
  for (const item of items) {
    const available = await Product.getAvailableQty(item.productId, { colorId: item.colorId, size: item.size });
    if (available != null && Number(item.qty) > available) {
      return res.status(400).json({ error: 'insufficient_stock', productId: item.productId });
    }
  }

  // تنها روش پرداخت فعال سایت کارت‌به‌کارت اختصاصیه؛ صرف‌نظر از هر مقداری که سمت کلاینت
  // فرستاده بشه، همیشه همین مقدار اعمال می‌شه (درگاه بانکی مستقیم غیرفعال و پنهانه).
  const paymentMethod = 'card_to_card';
  const paymentDeadlineAt = new Date(Date.now() + 60 * 60 * 1000);

  const subtotal = Number(total) || 0;
  let finalTotal = subtotal;
  let appliedCoupon = null;
  let discountAmount = 0;
  if (discountCode) {
    const result = await validateCoupon(discountCode, customer.phone, subtotal);
    if (!result.ok) return res.status(400).json({ error: 'invalid_coupon', reason: result.reason });
    appliedCoupon = result.coupon;
    discountAmount = result.discountAmount;
    finalTotal = Math.max(0, subtotal - discountAmount);
  }

  // پست پیشتاز فقط پیش‌کرایه پشتیبانی می‌شه؛ هزینه‌ی ارسال هم فقط توی حالت پیش‌کرایه از
  // مشتری گرفته می‌شه، وگرنه (پس‌کرایه) هنگام تحویل به مأمور پرداخت می‌شه، نه توی جمع کل سایت.
  const finalShippingPayment = shippingMethod === 'post' ? 'prepaid' : (shippingPayment || 'postpaid');
  const finalShippingFee = finalShippingPayment === 'prepaid' ? SHIPPING_FEE_TOMAN : 0;
  finalTotal += finalShippingFee;

  // کارت‌به‌کارت هنوز به یک درگاه واقعی وصل نیست، پس سفارش تا تایید دستی رسید توسط ادمین
  // در انتظار تایید پرداخت می‌مونه.
  const order = await Order.create({
    code: await generateOrderCode(),
    userId: req.user ? req.user.id : null,
    customer: {
      name: customer.name || '',
      phone: customer.phone,
      address: customer.address || '',
      note: customer.note || '',
    },
    items,
    total: finalTotal,
    subtotal: appliedCoupon ? subtotal : null,
    discountCode: appliedCoupon ? appliedCoupon.code : '',
    discountAmount,
    shippingFee: finalShippingFee,
    status: 'awaiting_payment_confirmation',
    paymentMethod,
    paymentDeadlineAt,
    ...(shippingMethod && { shippingMethod }),
    shippingPayment: finalShippingPayment,
  });
  if (appliedCoupon) {
    appliedCoupon.usesCount += 1;
    await appliedCoupon.save();
  }
  notifyOrderCustomer(order.customer.phone, {
    name: order.customer.name,
    code: order.code,
    statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
  });
  telegramNotify.notifyNewOrder(order);
  res.status(201).json(order);
});

router.post('/orders/:id/receipt', (req, res) => {
  uploadReceipt.single('receipt')(req, res, async err => {
    if (err) return res.status(400).json({ error: 'upload_failed', message: err.message });
    if (!req.file) return res.status(400).json({ error: 'no_file' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found' });

    order.receiptImageUrl = `assets/uploads/receipts/${req.file.filename}`;
    await order.save();
    telegramNotify.notifyReceiptUploaded(order);
    res.json(order);
  });
});

const ORDER_STATUS_STEPS = ['registered', 'preparing', 'shipped', 'delivered'];

function buildOrderTimeline(order) {
  const timeline = [];
  if (order.status === 'awaiting_payment_confirmation') {
    timeline.push({ step: 'awaiting_payment_confirmation', label: ORDER_STATUS_LABELS.awaiting_payment_confirmation, done: true });
    ORDER_STATUS_STEPS.forEach(step => timeline.push({ step, label: ORDER_STATUS_LABELS[step], done: false }));
  } else if (order.status === 'payment_rejected') {
    timeline.push({ step: 'payment_rejected', label: ORDER_STATUS_LABELS.payment_rejected, done: true, rejected: true });
  } else {
    const currentIndex = ORDER_STATUS_STEPS.indexOf(order.status);
    ORDER_STATUS_STEPS.forEach((step, i) => timeline.push({ step, label: ORDER_STATUS_LABELS[step], done: i <= currentIndex }));
  }
  return timeline;
}

router.get('/me/orders', auth.requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(orders.map(order => ({ ...order.toJSON(), timeline: buildOrderTimeline(order) })));
});

router.get('/orders/track', async (req, res) => {
  const { code, phone } = req.query;
  if (!code || !phone) return res.status(400).json({ error: 'invalid_input' });

  const order = await Order.findOne({ code: String(code), 'customer.phone': String(phone) });
  if (!order) return res.status(404).json({ error: 'not_found' });

  const timeline = buildOrderTimeline(order);
  res.json({ order, timeline });
});

module.exports = router;
