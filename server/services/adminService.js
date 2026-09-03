'use strict';

const crypto = require('crypto');
const adminAuth = require('../lib/adminAuth');
const Admin = require('../models/Admin');
const { logConnectedAdmins } = require('../lib/telegramAdminLog');

const TELEGRAM_LINK_TOKEN_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه

async function listAdmins() {
  return Admin.find().sort({ createdAt: 1 });
}

async function createAdmin({ name, permissions }) {
  if (!name) return { ok: false, error: 'invalid_input' };
  const rawToken = adminAuth.generateRawToken();
  const admin = await Admin.create({
    name: String(name).trim(),
    tokenHash: adminAuth.hashToken(rawToken),
    permissions: Array.isArray(permissions) ? permissions.filter(p => Admin.SECTIONS.includes(p)) : [],
  });
  // توکن خام فقط همین یک‌بار برگردونده می‌شه؛ جایی ذخیره نمی‌شه
  return { ok: true, admin, token: rawToken };
}

async function updateAdmin(id, { name, permissions }) {
  const update = {};
  if (typeof name === 'string') update.name = name.trim();
  if (Array.isArray(permissions)) update.permissions = permissions.filter(p => Admin.SECTIONS.includes(p));
  return Admin.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
}

async function deleteAdmin(id, requestingAdminId) {
  if (id === requestingAdminId) return { ok: false, error: 'cannot_delete_self' };
  const target = await Admin.findById(id);
  if (target && target.isSuperAdmin) {
    const superAdminCount = await Admin.countDocuments({ isSuperAdmin: true });
    if (superAdminCount <= 1) return { ok: false, error: 'cannot_delete_last_super_admin' };
  }
  await Admin.deleteOne({ _id: id });
  return { ok: true };
}

/* ---------- اتصال حساب تلگرام (deep-link یک‌بارمصرف از پنل وب) ---------- */

async function generateTelegramLinkToken(adminId) {
  const admin = await Admin.findById(adminId);
  if (!admin) return { ok: false, error: 'not_found' };

  const token = crypto.randomBytes(16).toString('hex');
  admin.telegramLinkToken = token;
  admin.telegramLinkTokenExpiresAt = new Date(Date.now() + TELEGRAM_LINK_TOKEN_TTL_MS);
  await admin.save();

  return {
    ok: true,
    token,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
    expiresInSeconds: TELEGRAM_LINK_TOKEN_TTL_MS / 1000,
  };
}

/* صدا زده می‌شه از هندلر /start ربات؛ توکن یک‌بارمصرف رو با یک ادمین موجود مچ می‌کنه
   و chatId رو به همون ادمین وصل می‌کنه. */
async function consumeTelegramLinkToken(rawToken, chatId) {
  const admin = await Admin.findOne({
    telegramLinkToken: rawToken,
    telegramLinkTokenExpiresAt: { $gt: new Date() },
  });
  if (!admin) return null;

  const chatIdStr = String(chatId);
  const alreadyLinked = await Admin.findOne({ telegramChatId: chatIdStr, _id: { $ne: admin.id } });
  if (alreadyLinked) return null;

  admin.telegramChatId = chatIdStr;
  admin.telegramLinkToken = null;
  admin.telegramLinkTokenExpiresAt = null;
  await admin.save();

  console.log(`[telegram] admin "${admin.name}" connected (chatId=${chatIdStr})`);
  logConnectedAdmins();

  return admin;
}

async function unlinkTelegram(adminId) {
  const admin = await Admin.findByIdAndUpdate(adminId, { telegramChatId: null });
  if (admin) {
    console.log(`[telegram] admin "${admin.name}" disconnected (was chatId=${admin.telegramChatId})`);
    logConnectedAdmins();
  }
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  generateTelegramLinkToken,
  consumeTelegramLinkToken,
  unlinkTelegram,
};
