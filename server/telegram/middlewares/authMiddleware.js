'use strict';

const Admin = require('../../models/Admin');

/* اتصال حساب تلگرام از پنل وب («اتصال تلگرام») فعلاً موقتاً غیرفعاله. تا حلش کنیم،
   هر chatId که در TELEGRAM_ADMIN_CHAT_IDS (جدا با کاما) در .env باشه، بدون نیاز به
   لینک‌شدن به یک رکورد Admin در دیتابیس، به‌عنوان یک سوپرادمین کامل (دسترسی به همه‌ی
   بخش‌ها) شناخته می‌شه — دقیقاً همون سطح دسترسی یک ادمین DB با isSuperAdmin:true. */
const ENV_ADMIN_CHAT_IDS = String(process.env.TELEGRAM_ADMIN_CHAT_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

function envVirtualAdmin(chatId) {
  return {
    id: null,
    name: 'ادمین (env)',
    permissions: Admin.SECTIONS,
    isSuperAdmin: true,
    telegramChatId: chatId,
  };
}

function isStartCommand(ctx) {
  return ctx.updateType === 'message' && Boolean(ctx.message?.text?.startsWith('/start'));
}

/* پیدا کردن Admin مرتبط با ctx.chat.id و attach کردنش به ctx.state.admin —
   دقیقاً هم‌عرض adminAuth.requireAdminAuth در سمت REST API. */
module.exports = async function authMiddleware(ctx, next) {
  const chatId = String(ctx.chat?.id || ctx.from?.id || '');
  if (!chatId) return;

  let admin = await Admin.findOne({ telegramChatId: chatId });
  if (!admin && ENV_ADMIN_CHAT_IDS.includes(chatId)) {
    admin = envVirtualAdmin(chatId);
  }

  if (!admin && !isStartCommand(ctx)) {
    if (ctx.callbackQuery) return ctx.answerCbQuery('حساب تلگرامت وصل نیست', { show_alert: true });
    return ctx.reply('حساب تلگرامت به هیچ ادمینی وصل نیست.\nاز پنل ادمین وب روی «اتصال تلگرام» بزن.');
  }

  ctx.state.admin = admin;
  return next();
};
