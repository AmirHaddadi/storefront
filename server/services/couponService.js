'use strict';

const Coupon = require('../models/Coupon');

async function listCoupons() {
  return Coupon.find().sort({ createdAt: -1 });
}

async function createCoupon({ code, type, value, firstOrderOnly, maxUses, expiresAt }) {
  if (!code || !['percent', 'fixed'].includes(type) || !(Number(value) > 0)) {
    return { ok: false, error: 'invalid_input' };
  }
  try {
    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      type,
      value: Number(value),
      firstOrderOnly: Boolean(firstOrderOnly),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
    });
    return { ok: true, coupon };
  } catch (err) {
    return { ok: false, error: 'invalid_input', message: err.message };
  }
}

async function updateCoupon(id, { type, value, firstOrderOnly, maxUses, expiresAt, active }) {
  const update = {};
  if (['percent', 'fixed'].includes(type)) update.type = type;
  if (Number(value) > 0) update.value = Number(value);
  if (typeof firstOrderOnly === 'boolean') update.firstOrderOnly = firstOrderOnly;
  if (maxUses !== undefined) update.maxUses = maxUses ? Number(maxUses) : null;
  if (expiresAt !== undefined) update.expiresAt = expiresAt || null;
  if (typeof active === 'boolean') update.active = active;

  return Coupon.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
}

async function deleteCoupon(id) {
  await Coupon.deleteOne({ _id: id });
}

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon };
