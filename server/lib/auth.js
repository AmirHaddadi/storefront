'use strict';

const crypto = require('crypto');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const notifier = require('./notifier');

const SESSION_COOKIE = 'sf_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ۳۰ روز
const OTP_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه

/* کد تایید OTP یک راز کوتاه‌عمره (۵ دقیقه) است؛ نیازی به ماندگاری در دیتابیس ندارد
   و در حافظه نگه داشته می‌شود. سشن‌ها برخلاف فاز اول در Mongo پایدار هستند (UserSession). */
const otpStore = new Map(); // phone -> { code, expiresAt }

function isValidIranianPhone(phone) {
  return /^0\d{10}$/.test(String(phone || '').trim());
}

async function generateOtp(phone) {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
  await notifier.sendOtp(phone, code);
  return code;
}

function verifyOtpCode(phone, code) {
  const entry = otpStore.get(phone);
  if (!entry || entry.expiresAt < Date.now() || entry.code !== String(code)) {
    return false;
  }
  otpStore.delete(phone);
  return true;
}

/* ثبت‌نام اولیه (اگر شماره جدید بود) یا ورود مجدد به همون رکورد (اگر شماره قبلاً ثبت‌نام کرده) */
async function findOrCreateUser(phone) {
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone });
  }
  return user;
}

async function createSession(userId) {
  const token = crypto.randomUUID();
  await UserSession.create({ token, userId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS) });
  return token;
}

async function destroySession(token) {
  await UserSession.deleteOne({ token });
}

async function getUserBySession(token) {
  const session = await UserSession.findOne({ token });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await UserSession.deleteOne({ token });
    return null;
  }
  return User.findById(session.userId);
}

/* میدل‌ور: فقط برای مسیرهایی که حتماً باید کاربر لاگین باشد */
async function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  const user = token ? await getUserBySession(token) : null;
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = user;
  next();
}

/* میدل‌ور نرم: کاربر رو در صورت وجود سشن ست می‌کند ولی مسدود نمی‌کند */
async function attachUser(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  req.user = token ? await getUserBySession(token) : null;
  next();
}

module.exports = {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  isValidIranianPhone,
  generateOtp,
  verifyOtpCode,
  findOrCreateUser,
  createSession,
  destroySession,
  getUserBySession,
  requireAuth,
  attachUser,
};
