'use strict';

const { hasPermission } = require('../../lib/adminAuth');

/* دقیقا معادل adminAuth.requirePermission ولی برای Telegraf — هردو از یک
   تابع hasPermission مشترک استفاده می‌کنن (بدون تکرار منطق RBAC). */
function requireTelegramPermission(section) {
  return (ctx, next) => {
    if (hasPermission(ctx.state.admin, section)) return next();
    if (ctx.callbackQuery) return ctx.answerCbQuery('دسترسی نداری', { show_alert: true });
    return ctx.reply('دسترسی به این بخش برای شما فعال نیست.');
  };
}

module.exports = { requireTelegramPermission };
