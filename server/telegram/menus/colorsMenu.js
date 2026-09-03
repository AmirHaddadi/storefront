'use strict';

const colorService = require('../../services/colorService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');

const HEX_PATTERN = /^#?[0-9A-Fa-f]{6}$/;

async function showColorsRoot(ctx) {
  const colors = await colorService.listColors();
  const rows = colors.map(c => ([{ text: `🎨 ${c.name} (${c.hex})`, callback_data: `color:delete:${c.id}` }]));
  rows.push([{ text: '➕ افزودن رنگ', callback_data: 'color:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, '🎨 پالت رنگ‌های محصولات — روی یک رنگ بزن تا حذفش کنی:', { inline_keyboard: rows });
}

function register(bot) {
  bot.action('menu:colors', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showColorsRoot(ctx);
  });

  bot.action('color:add', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'color:add:name';
    ctx.session.data.colorDraft = {};
    await editOrReply(ctx, 'نام رنگ رو بفرست (مثلاً: یاسی):', { inline_keyboard: backRow('menu:colors') });
  });

  bot.action(/^color:delete:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    const rows = [
      [{ text: '✅ بله، حذف کن', callback_data: `color:deleteConfirm:${ctx.match[1]}` }],
      [{ text: '❌ انصراف', callback_data: 'menu:colors' }],
    ];
    await ctx.answerCbQuery();
    await editOrReply(ctx, 'از حذف این رنگ از پالت مطمئنی؟', { inline_keyboard: rows });
  });

  bot.action(/^color:deleteConfirm:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    await colorService.deleteColor(ctx.match[1]);
    await ctx.answerCbQuery('رنگ حذف شد');
    await showColorsRoot(ctx);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('color:add:')) return next();
    const draft = ctx.session.data.colorDraft || {};
    const value = ctx.message.text.trim();

    if (ctx.session.step === 'color:add:name') {
      draft.name = value;
      ctx.session.step = 'color:add:hex';
      ctx.session.data.colorDraft = draft;
      return ctx.reply('کد رنگ hex رو بفرست (مثلاً: #7C4DFF یا 7C4DFF):');
    }
    if (ctx.session.step === 'color:add:hex') {
      if (!HEX_PATTERN.test(value)) return ctx.reply('کد رنگ نامعتبره. یه کد hex معتبر بفرست (مثلاً: #7C4DFF):');
      draft.hex = value.startsWith('#') ? value : `#${value}`;
      try {
        await colorService.upsertColor(draft);
        ctx.session.step = null;
        ctx.session.data.colorDraft = null;
        await ctx.reply('✅ رنگ به پالت اضافه شد.');
        await showColorsRoot(ctx);
      } catch (err) {
        await ctx.reply(`خطا در افزودن رنگ: ${err.message}`);
      }
    }
  });
}

module.exports = { register, showColorsRoot };
