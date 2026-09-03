'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const ADMIN_SECTIONS = ['users', 'orders', 'products', 'coupons', 'appearance', 'admins', 'reports'];

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tokenHash: { type: String, required: true, unique: true },
  permissions: { type: [String], enum: ADMIN_SECTIONS, default: [] },
  isSuperAdmin: { type: Boolean, default: false },

  // اتصال حساب تلگرام برای مدیریت پنل از ربات — از طریق دکمه‌ی «اتصال تلگرام» در پنل وب
  telegramChatId: { type: String, default: null, index: true, unique: true, sparse: true },
  telegramLinkToken: { type: String, default: null },
  telegramLinkTokenExpiresAt: { type: Date, default: null },
}, { timestamps: true });

applyIdJson(adminSchema, ['tokenHash', 'telegramLinkToken', 'telegramLinkTokenExpiresAt']);

const Admin = mongoose.model('Admin', adminSchema);
Admin.SECTIONS = ADMIN_SECTIONS;

module.exports = Admin;
