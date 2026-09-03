'use strict';

const fs = require('fs');
const path = require('path');
const bot = require('./bot');
const Admin = require('../models/Admin');
const { UPLOADS_ROOT } = require('../lib/upload');
const { toman, statusLabel, nextStatus, STATUS_ACTION_LABELS } = require('./lib/format');

/* اتصال حساب تلگرام از پنل وب (دکمه‌ی «اتصال تلگرام») فعلاً موقتاً غیرفعاله؛ تا حل
   کامل مشکل، شناسه چت ادمین‌ها دستی در TELEGRAM_ADMIN_CHAT_IDS (جدا با کاما) در .env
   تنظیم می‌شه و اعلان مستقیم به همون‌ها می‌ره — بدون توجه به رکورد Admin/RBAC پنل وب.
   نکته: دکمه‌های اکشن سریع زیر پیام (تغییر وضعیت سفارش) برای این ادمین‌های دستی کار
   نمی‌کنه چون authMiddleware ربات هنوز chatId رو به یک Admin واقعی در DB مچ می‌کنه. */
const ENV_ADMIN_CHAT_IDS = String(process.env.TELEGRAM_ADMIN_CHAT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

/* ادمین‌های واجد شرایط دریافت اعلان یک سکشن: حساب تلگرام‌شان وصل باشد و
   دسترسی آن سکشن را داشته باشند (یا سوپرادمین باشند) — همان RBAC پنل وب. */
async function findNotifiableAdmins(section, excludeAdminId) {
  const query = {
    telegramChatId: { $ne: null },
    $or: [{ isSuperAdmin: true }, { permissions: section }],
  };
  if (excludeAdminId) query._id = { $ne: excludeAdminId };
  return Admin.find(query);
}

async function resolveNotifyChatIds(section, excludeAdminId) {
  if (ENV_ADMIN_CHAT_IDS.length) return ENV_ADMIN_CHAT_IDS;
  const admins = await findNotifiableAdmins(section, excludeAdminId);
  return admins.map(admin => admin.telegramChatId);
}

function orderQuickActionsKeyboard(order) {
  const rows = [[{ text: '📋 مشاهده جزئیات', callback_data: `order:view:${order.id}` }]];
  const next = nextStatus(order.status);
  if (next) {
    rows.push([{ text: `✅ ${STATUS_ACTION_LABELS[next]}`, callback_data: `order:setStatus:${next}:${order.id}` }]);
  }
  if (order.status === 'awaiting_payment_confirmation') {
    rows.push([{ text: '❌ رد پرداخت', callback_data: `order:setStatus:payment_rejected:${order.id}` }]);
  }
  return { inline_keyboard: rows };
}

/* fire-and-forget، دقیقاً مثل الگوی sms.sendSms/sendOrderSms فعلی — خطای ارسال
   نباید مسیر اصلی ثبت سفارش/تغییر وضعیت را متوقف کند. */
async function notifyNewOrder(order) {
  if (!bot) return;
  try {
    const chatIds = await resolveNotifyChatIds('orders');
    const text = [
      '🛎 سفارش جدید ثبت شد',
      `کد سفارش: ${order.code}`,
      `مشتری: ${order.customer?.name || '—'} (${order.customer?.phone})`,
      `تعداد اقلام: ${order.items.length}`,
      `مبلغ نهایی: ${toman(order.total)}`,
    ].join('\n');
    const keyboard = orderQuickActionsKeyboard(order);
    await Promise.all(chatIds.map(chatId =>
      bot.telegram.sendMessage(chatId, text, { reply_markup: keyboard }).catch(err => {
        console.error(`[telegram] notifyNewOrder failed for chatId ${chatId}: ${err.message}`);
      })
    ));
  } catch (err) {
    console.error(`[telegram] notifyNewOrder error: ${err.message}`);
  }
}

/* وقتی مشتری رسید کارت‌به‌کارت رو آپلود کرد، مستقیم عکس رسید + دکمه‌ی تایید/رد سریع
   برای ادمین فرستاده می‌شه (نه فقط لینک توی پنل وب) تا تاییدش سریع‌تر انجام بشه. */
async function notifyReceiptUploaded(order) {
  if (!bot || !order.receiptImageUrl) return;
  try {
    const chatIds = await resolveNotifyChatIds('orders');
    const filePath = path.join(UPLOADS_ROOT, 'receipts', path.basename(order.receiptImageUrl));
    if (!fs.existsSync(filePath)) return;
    const caption = [
      '🧾 رسید پرداخت کارت‌به‌کارت آپلود شد',
      `کد سفارش: ${order.code}`,
      `مشتری: ${order.customer?.name || '—'} (${order.customer?.phone})`,
      `مبلغ نهایی: ${toman(order.total)}`,
    ].join('\n');
    const extra = { reply_markup: orderQuickActionsKeyboard(order) };
    await Promise.all(chatIds.map(chatId =>
      bot.telegram.sendPhoto(chatId, { source: fs.createReadStream(filePath) }, { caption, ...extra }).catch(err => {
        console.error(`[telegram] notifyReceiptUploaded failed for chatId ${chatId}: ${err.message}`);
      })
    ));
  } catch (err) {
    console.error(`[telegram] notifyReceiptUploaded error: ${err.message}`);
  }
}

async function notifyOrderStatusChanged(order, status, excludeAdminId) {
  if (!bot) return;
  try {
    const chatIds = await resolveNotifyChatIds('orders', excludeAdminId);
    const text = `🔄 وضعیت سفارش ${order.code} تغییر کرد\nوضعیت جدید: ${statusLabel(status)}`;
    const keyboard = orderQuickActionsKeyboard(order);
    await Promise.all(chatIds.map(chatId =>
      bot.telegram.sendMessage(chatId, text, { reply_markup: keyboard }).catch(err => {
        console.error(`[telegram] notifyOrderStatusChanged failed for chatId ${chatId}: ${err.message}`);
      })
    ));
  } catch (err) {
    console.error(`[telegram] notifyOrderStatusChanged error: ${err.message}`);
  }
}

module.exports = { notifyNewOrder, notifyOrderStatusChanged, notifyReceiptUploaded };
