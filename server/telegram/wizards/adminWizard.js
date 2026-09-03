'use strict';

const Admin = require('../../models/Admin');
const adminService = require('../../services/adminService');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('../menus/mainMenu');

const SECTION_LABELS = {
  users: 'کاربران', orders: 'سفارشات', products: 'محصولات',
  coupons: 'کدهای تخفیف', appearance: 'ظاهر سایت', admins: 'مدیریت ادمین‌ها',
};

function permissionsKeyboard(selected) {
  const rows = Admin.SECTIONS.map(section => ([{
    text: `${selected.includes(section) ? '✅' : '⬜️'} ${SECTION_LABELS[section] || section}`,
    callback_data: `aw:togglePerm:${section}`,
  }]));
  rows.push([{ text: '✅ تایید و ساخت ادمین', callback_data: 'aw:confirm' }]);
  rows.push(...backRow('menu:admins'));
  return { inline_keyboard: rows };
}

async function start(ctx) {
  ctx.session.data.adminDraft = { permissions: [] };
  ctx.session.step = 'admin:add:name';
  await editOrReply(ctx, '🛡 افزودن ادمین جدید\n\nنام ادمین رو بفرست:', { inline_keyboard: backRow('menu:admins') });
}

async function handleText(ctx) {
  if (ctx.session.step !== 'admin:add:name') return;
  const draft = ctx.session.data.adminDraft || { permissions: [] };
  draft.name = ctx.message.text.trim();
  ctx.session.data.adminDraft = draft;
  ctx.session.step = 'admin:add:permissions';
  await ctx.reply('دسترسی‌های این ادمین رو انتخاب کن (هر بار روی یکی بزن تا تیک بخوره)، بعد «تایید»:', permissionsKeyboard(draft.permissions));
}

function register(bot) {
  bot.action(/^aw:togglePerm:(\w+)$/, async ctx => {
    const draft = ctx.session.data.adminDraft || { permissions: [] };
    const section = ctx.match[1];
    draft.permissions = draft.permissions.includes(section)
      ? draft.permissions.filter(p => p !== section)
      : [...draft.permissions, section];
    ctx.session.data.adminDraft = draft;
    await ctx.answerCbQuery();
    await editOrReply(ctx, 'دسترسی‌های این ادمین رو انتخاب کن، بعد «تایید»:', permissionsKeyboard(draft.permissions));
  });

  bot.action('aw:confirm', async ctx => {
    const draft = ctx.session.data.adminDraft || {};
    const result = await adminService.createAdmin(draft);
    ctx.session.step = null;
    ctx.session.data.adminDraft = null;
    if (!result.ok) {
      await ctx.answerCbQuery('خطا در ساخت ادمین', { show_alert: true });
      return;
    }
    await ctx.answerCbQuery('ادمین ساخته شد');
    await ctx.reply(`✅ ادمین «${result.admin.name}» ساخته شد.\n\n🔑 توکن ورود (فقط همین یک‌بار نمایش داده می‌شه، جایی ذخیره‌اش کن):\n\`${result.token}\``, { parse_mode: 'Markdown' });
    const adminsMenu = require('../menus/adminsMenu');
    await adminsMenu.showAdminsRoot(ctx);
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session.step !== 'admin:add:name') return next();
    await handleText(ctx);
  });
}

module.exports = { start, register };
