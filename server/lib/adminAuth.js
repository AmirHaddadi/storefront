'use strict';

const crypto = require('crypto');
const Admin = require('../models/Admin');
const AdminSession = require('../models/AdminSession');

const ADMIN_SESSION_COOKIE = 'sf_admin_session';
const ADMIN_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ۳۰ روز، جدا از سشن کاربر عادی

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function findAdminByToken(rawToken) {
  return Admin.findOne({ tokenHash: hashToken(rawToken) });
}

async function createAdminSession(adminId) {
  const token = crypto.randomUUID();
  await AdminSession.create({ token, adminId, expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS) });
  return token;
}

async function destroyAdminSession(token) {
  await AdminSession.deleteOne({ token });
}

async function getAdminBySession(token) {
  const session = await AdminSession.findOne({ token });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await AdminSession.deleteOne({ token });
    return null;
  }
  return Admin.findById(session.adminId);
}

/* میدل‌ور: احراز هویت ادمین (کاملاً جدا از سشن کاربر عادی — کوکی/namespace مجزا) */
async function requireAdminAuth(req, res, next) {
  const token = req.cookies[ADMIN_SESSION_COOKIE];
  const admin = token ? await getAdminBySession(token) : null;
  if (!admin) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.admin = admin;
  next();
}

/* منطق خام RBAC — سوپرادمین همه‌جا مجاز، بقیه فقط طبق permissions تیک‌خورده.
   هم requirePermission (اکسپرس) و هم requireTelegramPermission (ربات تلگرام) از
   همین یک تابع استفاده می‌کنن تا قانون دسترسی هیچ‌جا دوبار نوشته نشه. */
function hasPermission(admin, section) {
  return Boolean(admin) && (admin.isSuperAdmin || admin.permissions.includes(section));
}

/* میدل‌ور RBAC اکسپرس */
function requirePermission(section) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'unauthorized' });
    if (hasPermission(req.admin, section)) return next();
    return res.status(403).json({ error: 'forbidden', section });
  };
}

module.exports = {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_MS,
  hashToken,
  generateRawToken,
  findAdminByToken,
  createAdminSession,
  destroyAdminSession,
  getAdminBySession,
  requireAdminAuth,
  hasPermission,
  requirePermission,
};
