'use strict';

const couponService = require('../../services/couponService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { paginate, paginationRow, backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');
const { toman } = require('../lib/format');
const couponWizard = require('../wizards/couponWizard');

async function showCouponsRoot(ctx, page = 1) {
  const coupons = await couponService.listCoupons();
  const { pageItems, page: safePage, totalPages } = paginate(coupons, page, 6);

  const rows = pageItems.map(c => ([{
    text: `${c.active ? '🟢' : '⚪️'} ${c.code} — ${c.type === 'percent' ? c.value + '٪' : toman(c.value)}`,
    callback_data: `coupon:view:${c.id}`,
  }]));
  rows.push(...paginationRow(safePage, totalPages, p => `coupons:list:${p}`));
  rows.push([{ text: '➕ افزودن کد تخفیف', callback_data: 'coupon:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));

  await editOrReply(ctx, `🏷 کدهای تخفیف — صفحه ${safePage} از ${totalPages}`, { inline_keyboard: rows });
}

function couponDetailKeyboard(coupon) {
  const rows = [
    [{ text: coupon.active ? '⛔ غیرفعال کن' : '✅ فعال کن', callback_data: `coupon:toggle:${coupon.id}` }],
    [{ text: '✏️ ویرایش مقدار', callback_data: `coupon:editValue:${coupon.id}` }],
    [{ text: '✏️ ویرایش سقف استفاده', callback_data: `coupon:editMaxUses:${coupon.id}` }],
    [{ text: '✏️ ویرایش تاریخ انقضا', callback_data: `coupon:editExpiry:${coupon.id}` }],
    [{ text: '🗑 حذف', callback_data: `coupon:delete:${coupon.id}` }],
  ];
  rows.push(...backRow('menu:coupons'));
  return { inline_keyboard: rows };
}

async function showCouponDetail(ctx, id) {
  const coupons = await couponService.listCoupons();
  const coupon = coupons.find(c => c.id === id);
  if (!coupon) return showCouponsRoot(ctx);

  const text = [
    `🏷 ${coupon.code}`,
    `نوع: ${coupon.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'} — مقدار: ${coupon.type === 'percent' ? coupon.value + '٪' : toman(coupon.value)}`,
    `فقط اولین سفارش: ${coupon.firstOrderOnly ? 'بله' : 'خیر'}`,
    `استفاده‌شده: ${coupon.usesCount} از ${coupon.maxUses || 'نامحدود'}`,
    `وضعیت: ${coupon.active ? 'فعال' : 'غیرفعال'}`,
  ].join('\n');

  await editOrReply(ctx, text, couponDetailKeyboard(coupon));
}

function register(bot) {
  bot.action('menu:coupons', requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    await showCouponsRoot(ctx);
  });

  bot.action(/^coupons:list:(\d+)$/, requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    await showCouponsRoot(ctx, Number(ctx.match[1]));
  });

  bot.action(/^coupon:view:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    await showCouponDetail(ctx, ctx.match[1]);
  });

  bot.action(/^coupon:toggle:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    const coupons = await couponService.listCoupons();
    const coupon = coupons.find(c => c.id === ctx.match[1]);
    if (coupon) await couponService.updateCoupon(coupon.id, { active: !coupon.active });
    await ctx.answerCbQuery('وضعیت به‌روزرسانی شد');
    await showCouponDetail(ctx, ctx.match[1]);
  });

  bot.action(/^coupon:delete:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    await couponService.deleteCoupon(ctx.match[1]);
    await ctx.answerCbQuery('کد تخفیف حذف شد');
    await showCouponsRoot(ctx);
  });

  bot.action('coupon:add', requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    await couponWizard.start(ctx);
  });

  bot.action(/^coupon:editValue:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `couponEditValue:${ctx.match[1]}`;
    await editOrReply(ctx, 'مقدار جدید تخفیف رو بفرست (درصدی: عدد بین ۱ تا ۱۰۰ / مبلغ ثابت: تومان):', { inline_keyboard: backRow(`coupon:view:${ctx.match[1]}`) });
  });

  bot.action(/^coupon:editMaxUses:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `couponEditMaxUses:${ctx.match[1]}`;
    await editOrReply(ctx, 'سقف کل تعداد استفاده رو بفرست (عدد؛ برای نامحدود «0» بفرست):', { inline_keyboard: backRow(`coupon:view:${ctx.match[1]}`) });
  });

  bot.action(/^coupon:editExpiry:(.+)$/, requireTelegramPermission('coupons'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `couponEditExpiry:${ctx.match[1]}`;
    await editOrReply(ctx, 'تا چند روز دیگه منقضی بشه؟ (عدد؛ برای حذف انقضا «0» بفرست):', { inline_keyboard: backRow(`coupon:view:${ctx.match[1]}`) });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session.step?.startsWith('couponEditValue:')) {
      const id = ctx.session.step.split(':')[1];
      const value = Number(ctx.message.text.trim());
      if (!(value > 0)) return ctx.reply('مقدار باید عدد مثبت باشه. دوباره بفرست:');
      await couponService.updateCoupon(id, { value });
      ctx.session.step = null;
      await ctx.reply('✅ مقدار تخفیف به‌روزرسانی شد.');
      return showCouponDetail(ctx, id);
    }
    if (ctx.session.step?.startsWith('couponEditMaxUses:')) {
      const id = ctx.session.step.split(':')[1];
      const num = Number(ctx.message.text.trim());
      await couponService.updateCoupon(id, { maxUses: num > 0 ? num : null });
      ctx.session.step = null;
      await ctx.reply('✅ سقف استفاده به‌روزرسانی شد.');
      return showCouponDetail(ctx, id);
    }
    if (ctx.session.step?.startsWith('couponEditExpiry:')) {
      const id = ctx.session.step.split(':')[1];
      const days = Number(ctx.message.text.trim());
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000) : null;
      await couponService.updateCoupon(id, { expiresAt });
      ctx.session.step = null;
      await ctx.reply('✅ تاریخ انقضا به‌روزرسانی شد.');
      return showCouponDetail(ctx, id);
    }
    return next();
  });
}

module.exports = { register, showCouponsRoot };
