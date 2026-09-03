'use strict';

const { hasPermission } = require('../../lib/adminAuth');

const SECTIONS = [
  { section: 'orders', label: '📦 سفارشات', action: 'menu:orders' },
  { section: 'products', label: '🛍 محصولات', action: 'menu:products' },
  { section: 'products', label: '🗂 دسته‌بندی‌ها', action: 'menu:categories' },
  { section: 'products', label: '🎨 پالت رنگ‌ها', action: 'menu:colors' },
  { section: 'coupons', label: '🏷 کدهای تخفیف', action: 'menu:coupons' },
  { section: 'appearance', label: '🖼 بنرها', action: 'menu:banners' },
  { section: 'appearance', label: '🎞 اسلایدهای هیرو', action: 'menu:heroSlides' },
  { section: 'users', label: '👥 کاربران', action: 'menu:users' },
  { section: 'appearance', label: '⚙️ تنظیمات ظاهری', action: 'menu:settings' },
  { section: 'admins', label: '🛡 مدیریت ادمین‌ها', action: 'menu:admins' },
];

function mainMenuKeyboard(admin) {
  const rows = [];
  let row = [];
  SECTIONS.forEach(item => {
    if (!hasPermission(admin, item.section)) return;
    row.push({ text: item.label, callback_data: item.action });
    if (row.length === 2) { rows.push(row); row = []; }
  });
  if (row.length) rows.push(row);
  return { inline_keyboard: rows };
}

async function editOrReply(ctx, text, keyboard) {
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: keyboard }).catch(() => ctx.reply(text, { reply_markup: keyboard }));
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

async function showMainMenu(ctx) {
  ctx.session.step = null;
  ctx.session.data = {};
  ctx.session.menuStack = [];
  const text = `سلام ${ctx.state.admin.name} 👋\nپنل ادمین استورفرانت — از منوی زیر بخش موردنظر رو انتخاب کن:`;
  await editOrReply(ctx, text, mainMenuKeyboard(ctx.state.admin));
}

function register(bot) {
  bot.action('menu:main', async ctx => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx);
  });
  bot.action('noop', ctx => ctx.answerCbQuery());
  bot.command('menu', async ctx => showMainMenu(ctx));
}

module.exports = { mainMenuKeyboard, showMainMenu, editOrReply, register };
