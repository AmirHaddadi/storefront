'use strict';

const TelegramBotSession = require('../../models/TelegramBotSession');

/* state مراحل چندمرحله‌ای (ویزاردها) رو قبل از هندلر از Mongo لود و روی
   ctx.session می‌ذاره، و بعد از هندلر دوباره ذخیره می‌کنه — عمداً در دیتابیس
   نگه‌داری می‌شه چون بیشتر هاست‌ها پروسه را با هر دیپلوی/ری‌استارت از نو می‌سازند. */
module.exports = async function sessionMiddleware(ctx, next) {
  const chatId = String(ctx.chat?.id || ctx.from?.id || '');
  if (!chatId) return next();

  let doc = await TelegramBotSession.findOne({ chatId });
  if (!doc) doc = await TelegramBotSession.create({ chatId });

  ctx.session = {
    step: doc.step,
    data: doc.data || {},
    menuStack: doc.menuStack || [],
  };

  await next();

  doc.step = ctx.session.step;
  doc.data = ctx.session.data;
  doc.menuStack = ctx.session.menuStack;
  if (ctx.state.admin) doc.adminId = ctx.state.admin.id;
  await doc.save();
};
