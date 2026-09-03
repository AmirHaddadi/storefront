'use strict';

const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

/* اعتبارسنجی یک کد تخفیف برای شماره و مبلغ مشخص — هم توی روت validate (پیش‌نمایش چک‌اوت)
   و هم لحظه‌ی ثبت نهایی سفارش (که باید دوباره سمت سرور چک بشه، نه فقط تکیه به کلاینت) استفاده می‌شه. */
async function validateCoupon(code, phone, subtotal) {
  if (!code) return { ok: false, reason: 'no_code' };
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  if (!coupon) return { ok: false, reason: 'not_found' };
  if (!coupon.active) return { ok: false, reason: 'inactive' };
  if (coupon.expiresAt && new Date() > coupon.expiresAt) return { ok: false, reason: 'expired' };
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return { ok: false, reason: 'max_uses_reached' };
  if (coupon.boundPhone && coupon.boundPhone !== phone) return { ok: false, reason: 'not_your_code' };

  if (coupon.firstOrderOnly) {
    const hasPriorOrder = await Order.exists({ 'customer.phone': phone });
    if (hasPriorOrder) return { ok: false, reason: 'first_order_only' };
  }
  const alreadyUsedByPhone = await Order.exists({ 'customer.phone': phone, discountCode: coupon.code });
  if (alreadyUsedByPhone) return { ok: false, reason: 'already_used' };

  const discountAmount = coupon.type === 'percent'
    ? Math.round(subtotal * (coupon.value / 100))
    : Math.min(Math.round(coupon.value), subtotal);

  return { ok: true, coupon, discountAmount };
}

module.exports = { validateCoupon };
