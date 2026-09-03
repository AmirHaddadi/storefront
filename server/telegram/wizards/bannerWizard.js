'use strict';

const bannerService = require('../../services/bannerService');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('../menus/mainMenu');

function skipKeyboard(skipAction) {
  return { inline_keyboard: [[{ text: '⏭ رد شدن', callback_data: skipAction }], ...backRow('menu:banners')] };
}

async function start(ctx) {
  ctx.session.data.bannerDraft = {};
  ctx.session.step = 'banner:text';
  await editOrReply(ctx, '🖼 افزودن بنر\n\nمتن بنر رو بفرست:', { inline_keyboard: backRow('menu:banners') });
}

async function handleText(ctx) {
  const draft = ctx.session.data.bannerDraft || {};
  const value = ctx.message.text.trim();

  if (ctx.session.step === 'banner:text') {
    draft.text = value;
    ctx.session.step = 'banner:link';
    ctx.session.data.bannerDraft = draft;
    return ctx.reply('لینک بنر (اختیاری) رو بفرست یا رد شو:', skipKeyboard('bw:skipLink'));
  }
  if (ctx.session.step === 'banner:link') {
    draft.link = value;
    ctx.session.step = 'banner:order';
    ctx.session.data.bannerDraft = draft;
    return ctx.reply('ترتیب نمایش (عدد، پیش‌فرض 0) رو بفرست یا رد شو:', skipKeyboard('bw:skipOrder'));
  }
  if (ctx.session.step === 'banner:order') {
    draft.order = Number(value) || 0;
    await finish(ctx, draft);
  }
}

async function finish(ctx, draft) {
  const result = await bannerService.createBanner(draft);
  ctx.session.step = null;
  ctx.session.data.bannerDraft = null;
  if (!result.ok) {
    await ctx.reply('خطا در ساخت بنر.');
    return;
  }
  await ctx.reply('✅ بنر ساخته شد.');
  const bannersMenu = require('../menus/bannersMenu');
  await bannersMenu.showBannersRoot(ctx);
}

function register(bot) {
  bot.action('bw:skipLink', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.bannerDraft || {};
    draft.link = '';
    ctx.session.data.bannerDraft = draft;
    ctx.session.step = 'banner:order';
    await editOrReply(ctx, 'ترتیب نمایش (عدد، پیش‌فرض 0) رو بفرست یا رد شو:', skipKeyboard('bw:skipOrder'));
  });

  bot.action('bw:skipOrder', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.bannerDraft || {};
    draft.order = 0;
    await finish(ctx, draft);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('banner:')) return next();
    await handleText(ctx);
  });
}

module.exports = { start, register };
