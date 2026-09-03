'use strict';

const Admin = require('../../models/Admin');
const adminService = require('../../services/adminService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');
const adminWizard = require('../wizards/adminWizard');

const SECTION_LABELS = {
  users: 'کاربران', orders: 'سفارشات', products: 'محصولات',
  coupons: 'کدهای تخفیف', appearance: 'ظاهر سایت', admins: 'مدیریت ادمین‌ها',
};

async function showAdminsRoot(ctx) {
  const admins = await adminService.listAdmins();
  const rows = admins.map(a => ([{
    text: `${a.isSuperAdmin ? '👑 ' : ''}${a.name}${a.telegramChatId ? ' 📱' : ''}`,
    callback_data: `admin:view:${a.id}`,
  }]));
  rows.push([{ text: '➕ افزودن ادمین', callback_data: 'admin:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, '🛡 مدیریت ادمین‌ها:', { inline_keyboard: rows });
}

function adminDetailKeyboard(admin) {
  const rows = admin.isSuperAdmin ? [] : Admin.SECTIONS.map(section => ([{
    text: `${admin.permissions.includes(section) ? '✅' : '⬜️'} ${SECTION_LABELS[section] || section}`,
    callback_data: `admin:togglePerm:${admin.id}:${section}`,
  }]));
  rows.push([{ text: '✏️ ویرایش نام', callback_data: `admin:editName:${admin.id}` }]);
  if (!admin.isSuperAdmin) rows.push([{ text: '🗑 حذف ادمین', callback_data: `admin:delete:${admin.id}` }]);
  rows.push(...backRow('menu:admins'));
  return { inline_keyboard: rows };
}

async function showAdminDetail(ctx, id) {
  const admins = await adminService.listAdmins();
  const admin = admins.find(a => a.id === id);
  if (!admin) return showAdminsRoot(ctx);
  const text = [
    `🛡 ${admin.name}${admin.isSuperAdmin ? ' (سوپرادمین — همه‌ی دسترسی‌ها)' : ''}`,
    `تلگرام: ${admin.telegramChatId ? 'متصل' : 'متصل نیست'}`,
  ].join('\n');
  await editOrReply(ctx, text, adminDetailKeyboard(admin));
}

function register(bot) {
  bot.action('menu:admins', requireTelegramPermission('admins'), async ctx => {
    await ctx.answerCbQuery();
    await showAdminsRoot(ctx);
  });

  bot.action(/^admin:view:([\w-]+)$/, requireTelegramPermission('admins'), async ctx => {
    await ctx.answerCbQuery();
    await showAdminDetail(ctx, ctx.match[1]);
  });

  bot.action(/^admin:togglePerm:([\w-]+):(\w+)$/, requireTelegramPermission('admins'), async ctx => {
    const [, id, section] = ctx.match;
    const admins = await adminService.listAdmins();
    const admin = admins.find(a => a.id === id);
    if (admin) {
      const permissions = admin.permissions.includes(section)
        ? admin.permissions.filter(p => p !== section)
        : [...admin.permissions, section];
      await adminService.updateAdmin(id, { permissions });
    }
    await ctx.answerCbQuery('دسترسی به‌روزرسانی شد');
    await showAdminDetail(ctx, id);
  });

  bot.action(/^admin:delete:([\w-]+)$/, requireTelegramPermission('admins'), async ctx => {
    const result = await adminService.deleteAdmin(ctx.match[1], ctx.state.admin.id);
    if (!result.ok) {
      await ctx.answerCbQuery(
        result.error === 'cannot_delete_self' ? 'نمی‌تونی خودت رو حذف کنی' : 'نمی‌تونی آخرین سوپرادمین رو حذف کنی',
        { show_alert: true },
      );
      return;
    }
    await ctx.answerCbQuery('ادمین حذف شد');
    await showAdminsRoot(ctx);
  });

  bot.action('admin:add', requireTelegramPermission('admins'), async ctx => {
    await ctx.answerCbQuery();
    await adminWizard.start(ctx);
  });

  bot.action(/^admin:editName:([\w-]+)$/, requireTelegramPermission('admins'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `adminEditName:${ctx.match[1]}`;
    await editOrReply(ctx, 'نام جدید ادمین رو بفرست:', { inline_keyboard: backRow(`admin:view:${ctx.match[1]}`) });
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('adminEditName:')) return next();
    const id = ctx.session.step.split(':')[1];
    await adminService.updateAdmin(id, { name: ctx.message.text.trim() });
    ctx.session.step = null;
    await ctx.reply('✅ نام ادمین به‌روزرسانی شد.');
    await showAdminDetail(ctx, id);
  });
}

module.exports = { register, showAdminsRoot };
