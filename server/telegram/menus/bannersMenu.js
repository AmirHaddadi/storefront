'use strict';

const bannerService = require('../../services/bannerService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');
const bannerWizard = require('../wizards/bannerWizard');

async function showBannersRoot(ctx) {
  const banners = await bannerService.listBanners();
  const rows = banners.map(b => ([{
    text: `${b.active ? '🟢' : '⚪️'} ${b.text.slice(0, 30)}`,
    callback_data: `banner:view:${b.id}`,
  }]));
  rows.push([{ text: '➕ افزودن بنر', callback_data: 'banner:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, '🖼 بنرهای شناور سایت:', { inline_keyboard: rows });
}

function bannerDetailKeyboard(banner) {
  const rows = [
    [{ text: banner.active ? '⛔ غیرفعال کن' : '✅ فعال کن', callback_data: `banner:toggle:${banner.id}` }],
    [{ text: '✏️ ویرایش متن', callback_data: `banner:editText:${banner.id}` }],
    [{ text: '✏️ ویرایش لینک', callback_data: `banner:editLink:${banner.id}` }],
    [{ text: '✏️ ویرایش ترتیب', callback_data: `banner:editOrder:${banner.id}` }],
    [{ text: '🗑 حذف', callback_data: `banner:delete:${banner.id}` }],
  ];
  rows.push(...backRow('menu:banners'));
  return { inline_keyboard: rows };
}

async function showBannerDetail(ctx, id) {
  const banners = await bannerService.listBanners();
  const banner = banners.find(b => b.id === id);
  if (!banner) return showBannersRoot(ctx);
  const text = `🖼 ${banner.text}\nلینک: ${banner.link || '—'}\nترتیب: ${banner.order}\nوضعیت: ${banner.active ? 'فعال' : 'غیرفعال'}`;
  await editOrReply(ctx, text, bannerDetailKeyboard(banner));
}

function register(bot) {
  bot.action('menu:banners', requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await showBannersRoot(ctx);
  });

  bot.action(/^banner:view:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await showBannerDetail(ctx, ctx.match[1]);
  });

  bot.action(/^banner:toggle:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    const banners = await bannerService.listBanners();
    const banner = banners.find(b => b.id === ctx.match[1]);
    if (banner) await bannerService.updateBanner(banner.id, { active: !banner.active });
    await ctx.answerCbQuery('وضعیت به‌روزرسانی شد');
    await showBannerDetail(ctx, ctx.match[1]);
  });

  bot.action(/^banner:delete:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    await bannerService.deleteBanner(ctx.match[1]);
    await ctx.answerCbQuery('بنر حذف شد');
    await showBannersRoot(ctx);
  });

  bot.action('banner:add', requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await bannerWizard.start(ctx);
  });

  bot.action(/^banner:editText:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `bannerEditText:${ctx.match[1]}`;
    await editOrReply(ctx, 'متن جدید بنر رو بفرست:', { inline_keyboard: backRow(`banner:view:${ctx.match[1]}`) });
  });

  bot.action(/^banner:editLink:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `bannerEditLink:${ctx.match[1]}`;
    await editOrReply(ctx, 'لینک جدید رو بفرست (برای حذف لینک «-» بفرست):', { inline_keyboard: backRow(`banner:view:${ctx.match[1]}`) });
  });

  bot.action(/^banner:editOrder:(.+)$/, requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `bannerEditOrder:${ctx.match[1]}`;
    await editOrReply(ctx, 'ترتیب جدید رو بفرست (عدد):', { inline_keyboard: backRow(`banner:view:${ctx.match[1]}`) });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session.step?.startsWith('bannerEditText:')) {
      const id = ctx.session.step.split(':')[1];
      await bannerService.updateBanner(id, { text: ctx.message.text.trim() });
      ctx.session.step = null;
      await ctx.reply('✅ متن بنر به‌روزرسانی شد.');
      return showBannerDetail(ctx, id);
    }
    if (ctx.session.step?.startsWith('bannerEditLink:')) {
      const id = ctx.session.step.split(':')[1];
      const value = ctx.message.text.trim();
      await bannerService.updateBanner(id, { link: value === '-' ? '' : value });
      ctx.session.step = null;
      await ctx.reply('✅ لینک بنر به‌روزرسانی شد.');
      return showBannerDetail(ctx, id);
    }
    if (ctx.session.step?.startsWith('bannerEditOrder:')) {
      const id = ctx.session.step.split(':')[1];
      await bannerService.updateBanner(id, { order: Number(ctx.message.text.trim()) || 0 });
      ctx.session.step = null;
      await ctx.reply('✅ ترتیب بنر به‌روزرسانی شد.');
      return showBannerDetail(ctx, id);
    }
    return next();
  });
}

module.exports = { register, showBannersRoot };
