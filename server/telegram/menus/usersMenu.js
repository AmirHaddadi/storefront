'use strict';

const userService = require('../../services/userService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { paginate, paginationRow, backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');

async function showUsersRoot(ctx, page = 1) {
  const all = await userService.listUsers();
  const search = ctx.session.data.userSearch;
  const users = search ? all.filter(u => u.phone.includes(search)) : all;
  const { pageItems, page: safePage, totalPages } = paginate(users, page, 6);

  const rows = pageItems.map(u => ([{
    text: `${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.phone}`,
    callback_data: `user:view:${u.id}`,
  }]));
  rows.push(...paginationRow(safePage, totalPages, p => `users:list:${p}`));
  rows.push([{ text: '🔎 جستجو با شماره موبایل', callback_data: 'users:search' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));

  await editOrReply(ctx, `👥 کاربران — صفحه ${safePage} از ${totalPages}`, { inline_keyboard: rows });
}

function userDetailKeyboard(user) {
  const rows = [
    [{ text: '✏️ ویرایش نام', callback_data: `user:editName:${user.id}` }],
    [{ text: '✏️ ویرایش آدرس', callback_data: `user:editAddress:${user.id}` }],
    [{ text: '✏️ ویرایش شهر', callback_data: `user:editCity:${user.id}` }],
    [{ text: '✏️ ویرایش استان', callback_data: `user:editProvince:${user.id}` }],
    [{ text: '✏️ ویرایش کدپستی', callback_data: `user:editPostalCode:${user.id}` }],
    [{ text: '🗑 حذف کاربر', callback_data: `user:delete:${user.id}` }],
  ];
  rows.push(...backRow('menu:users'));
  return { inline_keyboard: rows };
}

async function showUserDetail(ctx, id) {
  const user = await userService.getUserById(id);
  if (!user) return showUsersRoot(ctx);
  const text = [
    `👤 ${[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}`,
    `موبایل: ${user.phone}`,
    `آدرس: ${user.address || '—'}`,
    `شهر/استان: ${user.city || '—'} / ${user.province || '—'}`,
    `کدپستی: ${user.postalCode || '—'}`,
  ].join('\n');
  await editOrReply(ctx, text, userDetailKeyboard(user));
}

const PROFILE_FIELD_STEPS = {
  editAddress: { field: 'address', prompt: 'آدرس جدید رو بفرست:' },
  editCity: { field: 'city', prompt: 'نام شهر جدید رو بفرست:' },
  editProvince: { field: 'province', prompt: 'نام استان جدید رو بفرست:' },
  editPostalCode: { field: 'postalCode', prompt: 'کدپستی جدید رو بفرست:' },
};

function register(bot) {
  bot.action('menu:users', requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.data.userSearch = null;
    await showUsersRoot(ctx);
  });

  bot.action(/^users:list:(\d+)$/, requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    await showUsersRoot(ctx, Number(ctx.match[1]));
  });

  bot.action('users:search', requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'userSearch:query';
    await editOrReply(ctx, '🔎 شماره موبایل یا بخشی از آن رو بفرست:', { inline_keyboard: backRow('menu:users') });
  });

  bot.action(/^user:view:([\w-]+)$/, requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    await showUserDetail(ctx, ctx.match[1]);
  });

  bot.action(/^user:editName:([\w-]+)$/, requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `userEditName:${ctx.match[1]}`;
    await editOrReply(ctx, 'نام و نام‌خانوادگی جدید رو بفرست (مثلاً: مریم جمالی):', { inline_keyboard: backRow(`user:view:${ctx.match[1]}`) });
  });

  bot.action(/^user:(editAddress|editCity|editProvince|editPostalCode):([\w-]+)$/, requireTelegramPermission('users'), async ctx => {
    await ctx.answerCbQuery();
    const [, action, id] = ctx.match;
    ctx.session.step = `userEditField:${action}:${id}`;
    await editOrReply(ctx, PROFILE_FIELD_STEPS[action].prompt, { inline_keyboard: backRow(`user:view:${id}`) });
  });

  bot.action(/^user:delete:([\w-]+)$/, requireTelegramPermission('users'), async ctx => {
    const rows = [
      [{ text: '✅ بله، حذف کن', callback_data: `user:deleteConfirm:${ctx.match[1]}` }],
      [{ text: '❌ انصراف', callback_data: `user:view:${ctx.match[1]}` }],
    ];
    await ctx.answerCbQuery();
    await editOrReply(ctx, 'از حذف این کاربر مطمئنی؟', { inline_keyboard: rows });
  });

  bot.action(/^user:deleteConfirm:([\w-]+)$/, requireTelegramPermission('users'), async ctx => {
    await userService.deleteUser(ctx.match[1]);
    await ctx.answerCbQuery('کاربر حذف شد');
    await showUsersRoot(ctx);
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session.step === 'userSearch:query') {
      ctx.session.data.userSearch = ctx.message.text.trim();
      ctx.session.step = null;
      return showUsersRoot(ctx, 1);
    }
    if (ctx.session.step?.startsWith('userEditName:')) {
      const id = ctx.session.step.split(':')[1];
      const [firstName, ...rest] = ctx.message.text.trim().split(' ');
      await userService.updateUser(id, { firstName, lastName: rest.join(' ') });
      ctx.session.step = null;
      await ctx.reply('✅ نام کاربر به‌روزرسانی شد.');
      return showUserDetail(ctx, id);
    }
    if (ctx.session.step?.startsWith('userEditField:')) {
      const [, action, id] = ctx.session.step.split(':');
      const { field } = PROFILE_FIELD_STEPS[action];
      await userService.updateUser(id, { [field]: ctx.message.text.trim() });
      ctx.session.step = null;
      await ctx.reply('✅ اطلاعات کاربر به‌روزرسانی شد.');
      return showUserDetail(ctx, id);
    }
    return next();
  });
}

module.exports = { register, showUsersRoot };
