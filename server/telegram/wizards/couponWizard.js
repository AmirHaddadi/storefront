'use strict';

const crypto = require('crypto');
const couponService = require('../../services/couponService');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('../menus/mainMenu');

function cancel(ctx) {
  ctx.session.step = null;
  ctx.session.data.couponDraft = null;
}

async function start(ctx) {
  ctx.session.data.couponDraft = {};
  ctx.session.step = 'coupon:code';
  const rows = [
    [{ text: '🎲 تولید خودکار کد', callback_data: 'cw:autoCode' }],
    ...backRow('menu:coupons'),
  ];
  await editOrReply(ctx, '🏷 افزودن کد تخفیف\n\nکد تخفیف رو بفرست یا از تولید خودکار استفاده کن:', { inline_keyboard: rows });
}

function typeStepKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'درصدی (٪)', callback_data: 'cw:type:percent' }, { text: 'مبلغ ثابت (تومان)', callback_data: 'cw:type:fixed' }],
      ...backRow('menu:coupons'),
    ],
  };
}

function firstOrderOnlyKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'بله، فقط اولین سفارش', callback_data: 'cw:firstOrderOnly:yes' }, { text: 'خیر، همه', callback_data: 'cw:firstOrderOnly:no' }],
      ...backRow('menu:coupons'),
    ],
  };
}

function skipKeyboard(skipAction) {
  return { inline_keyboard: [[{ text: '⏭ رد شدن', callback_data: skipAction }], ...backRow('menu:coupons')] };
}

function confirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ ثبت کد تخفیف', callback_data: 'cw:confirm' }],
      [{ text: '❌ انصراف', callback_data: 'menu:coupons' }],
    ],
  };
}

function summaryText(draft) {
  return [
    '🏷 خلاصه کد تخفیف:',
    `کد: ${draft.code}`,
    `نوع: ${draft.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}`,
    `مقدار: ${draft.value}${draft.type === 'percent' ? '٪' : ' تومان'}`,
    `فقط اولین سفارش: ${draft.firstOrderOnly ? 'بله' : 'خیر'}`,
    `سقف تعداد استفاده: ${draft.maxUses || 'نامحدود'}`,
    `تاریخ انقضا: ${draft.expiresAt || 'ندارد'}`,
  ].join('\n');
}

async function handleText(ctx) {
  const draft = ctx.session.data.couponDraft || {};
  const value = ctx.message.text.trim();

  if (ctx.session.step === 'coupon:code') {
    draft.code = value.toUpperCase();
    ctx.session.step = 'coupon:type';
    ctx.session.data.couponDraft = draft;
    return ctx.reply('نوع تخفیف رو انتخاب کن:', typeStepKeyboard());
  }
  if (ctx.session.step === 'coupon:value') {
    const num = Number(value);
    if (!(num > 0)) return ctx.reply('مقدار باید عددی بزرگ‌تر از صفر باشه. دوباره بفرست:');
    draft.value = num;
    ctx.session.step = 'coupon:firstOrderOnly';
    ctx.session.data.couponDraft = draft;
    return ctx.reply('فقط برای اولین سفارش مشتری معتبر باشه؟', firstOrderOnlyKeyboard());
  }
  if (ctx.session.step === 'coupon:maxUses') {
    const num = Number(value);
    if (!(num > 0)) return ctx.reply('عدد نامعتبره. دوباره بفرست یا رد شو:', skipKeyboard('cw:skipMaxUses'));
    draft.maxUses = num;
    ctx.session.step = 'coupon:expiresAt';
    ctx.session.data.couponDraft = draft;
    return ctx.reply('تاریخ انقضا (مثلاً 1404-06-01) یا رد شو:', skipKeyboard('cw:skipExpiry'));
  }
  if (ctx.session.step === 'coupon:expiresAt') {
    draft.expiresAt = value;
    ctx.session.step = 'coupon:confirm';
    ctx.session.data.couponDraft = draft;
    return ctx.reply(summaryText(draft), confirmKeyboard());
  }
}

function register(bot) {
  bot.action('cw:autoCode', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.couponDraft || {};
    draft.code = `SF${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    ctx.session.data.couponDraft = draft;
    ctx.session.step = 'coupon:type';
    await editOrReply(ctx, `کد تولید شد: ${draft.code}\nنوع تخفیف رو انتخاب کن:`, typeStepKeyboard());
  });

  bot.action(/^cw:type:(percent|fixed)$/, async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.couponDraft || {};
    draft.type = ctx.match[1];
    ctx.session.data.couponDraft = draft;
    ctx.session.step = 'coupon:value';
    await editOrReply(ctx, `مقدار تخفیف رو بفرست (${draft.type === 'percent' ? 'عدد درصد' : 'مبلغ به تومان'}):`, { inline_keyboard: backRow('menu:coupons') });
  });

  bot.action(/^cw:firstOrderOnly:(yes|no)$/, async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.couponDraft || {};
    draft.firstOrderOnly = ctx.match[1] === 'yes';
    ctx.session.data.couponDraft = draft;
    ctx.session.step = 'coupon:maxUses';
    await editOrReply(ctx, 'سقف تعداد استفاده (عدد) رو بفرست یا رد شو:', skipKeyboard('cw:skipMaxUses'));
  });

  bot.action('cw:skipMaxUses', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'coupon:expiresAt';
    await editOrReply(ctx, 'تاریخ انقضا (مثلاً 1404-06-01) یا رد شو:', skipKeyboard('cw:skipExpiry'));
  });

  bot.action('cw:skipExpiry', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.couponDraft || {};
    ctx.session.step = 'coupon:confirm';
    await editOrReply(ctx, summaryText(draft), confirmKeyboard());
  });

  bot.action('cw:confirm', async ctx => {
    const draft = ctx.session.data.couponDraft || {};
    const result = await couponService.createCoupon(draft);
    if (!result.ok) {
      await ctx.answerCbQuery('خطا در ساخت کد تخفیف', { show_alert: true });
      return;
    }
    cancel(ctx);
    await ctx.answerCbQuery('کد تخفیف ساخته شد');
    const couponsMenu = require('../menus/couponsMenu');
    await couponsMenu.showCouponsRoot(ctx);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('coupon:')) return next();
    await handleText(ctx);
  });
}

module.exports = { start, register };
