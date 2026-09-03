'use strict';

const settingsService = require('../../services/settingsService');
const SiteSettings = require('../../models/SiteSettings');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');

const PRESET_LABELS = { violet: '🟣 بنفش', rose: '🌹 صورتی', emerald: '💚 سبز زمردی', sunset: '🌇 نارنجی غروب' };

async function showSettingsRoot(ctx) {
  const settings = await settingsService.getSettings();
  const rows = SiteSettings.COLOR_PRESETS.map(preset => ([{
    text: `${preset === settings.colorPreset ? '✅ ' : ''}${PRESET_LABELS[preset] || preset}`,
    callback_data: `settings:setPreset:${preset}`,
  }]));
  rows.push([{ text: '💳 اطلاعات کارت‌به‌کارت', callback_data: 'settings:cardToCard' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, `⚙️ تنظیمات ظاهری سایت\nپالت رنگی فعلی: ${PRESET_LABELS[settings.colorPreset]}`, { inline_keyboard: rows });
}

/* اطلاعات کارت‌به‌کارت تنها روش پرداخت فعال سایته؛ در وب زیر پرمیشن «orders» گیت
   شده (adminApi.js: /admin/api/card-settings)، پس اینجا هم دقیقاً همون پرمیشن. */
async function showCardToCard(ctx) {
  const settings = await settingsService.getSettings();
  const text = [
    '💳 اطلاعات کارت‌به‌کارت',
    `شماره کارت: ${settings.cardToCardNumber || '—'}`,
    `به نام: ${settings.cardToCardHolder || '—'}`,
    `بانک: ${settings.cardToCardBank || '—'}`,
  ].join('\n');
  const rows = [[{ text: '✏️ ویرایش', callback_data: 'settings:cardToCard:edit' }]];
  rows.push(...backRow('menu:settings', { withMainMenu: false }));
  await editOrReply(ctx, text, { inline_keyboard: rows });
}

async function askCardNumber(ctx) {
  ctx.session.step = 'cardToCard:number';
  await editOrReply(ctx, 'شماره کارت جدید (۱۶ رقم) رو بفرست:', { inline_keyboard: backRow('settings:cardToCard') });
}
async function askCardHolder(ctx) {
  ctx.session.step = 'cardToCard:holder';
  await editOrReply(ctx, 'نام صاحب کارت رو بفرست:', { inline_keyboard: backRow('settings:cardToCard') });
}
async function askCardBank(ctx) {
  ctx.session.step = 'cardToCard:bank';
  await editOrReply(ctx, 'نام بانک رو بفرست:', { inline_keyboard: backRow('settings:cardToCard') });
}

function register(bot) {
  bot.action('menu:settings', requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await showSettingsRoot(ctx);
  });

  bot.action(/^settings:setPreset:(\w+)$/, requireTelegramPermission('appearance'), async ctx => {
    const result = await settingsService.updateColorPreset(ctx.match[1]);
    await ctx.answerCbQuery(result.ok ? 'پالت رنگی تغییر کرد' : 'خطا در تغییر پالت', { show_alert: !result.ok });
    await showSettingsRoot(ctx);
  });

  bot.action('settings:cardToCard', requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    await showCardToCard(ctx);
  });

  bot.action('settings:cardToCard:edit', requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.data.cardToCardDraft = {};
    await askCardNumber(ctx);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('cardToCard:')) return next();
    const draft = ctx.session.data.cardToCardDraft || {};
    const value = ctx.message.text.trim();

    if (ctx.session.step === 'cardToCard:number') {
      draft.number = value;
      ctx.session.data.cardToCardDraft = draft;
      return askCardHolder(ctx);
    }
    if (ctx.session.step === 'cardToCard:holder') {
      draft.holder = value;
      ctx.session.data.cardToCardDraft = draft;
      return askCardBank(ctx);
    }
    if (ctx.session.step === 'cardToCard:bank') {
      draft.bank = value;
      ctx.session.step = null;
      ctx.session.data.cardToCardDraft = null;
      await settingsService.updateCardToCard(draft);
      await ctx.reply('✅ اطلاعات کارت‌به‌کارت به‌روزرسانی شد.');
      await showCardToCard(ctx);
    }
  });
}

module.exports = { register, showSettingsRoot };
