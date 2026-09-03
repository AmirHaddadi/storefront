'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },

  // اگر true باشه فقط برای شماره‌ای قابل استفاده‌ست که تا حالا هیچ سفارشی ثبت نکرده
  firstOrderOnly: { type: Boolean, default: false },
  // اگر ست باشه فقط همین شماره می‌تونه استفاده کنه (کد اختصاصی، مثل کد خوش‌آمدگویی ثبت‌نام)
  boundPhone: { type: String, default: null },

  maxUses: { type: Number, default: null }, // null = نامحدود (سقف کلی تعداد استفاده در کل سایت)
  usesCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

applyIdJson(couponSchema);

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
