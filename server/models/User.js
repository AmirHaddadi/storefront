'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  address: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  province: { type: String, default: '' },
  city: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  // آخرین ورود موفق (OTP verify) — برای لوکاپ سریع در بخش گزارش‌گیری؛ تاریخچه‌ی کامل ورودها
  // در مدل جدا LoginEvent ذخیره می‌شه.
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

applyIdJson(userSchema);

module.exports = mongoose.model('User', userSchema);
