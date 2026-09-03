'use strict';

const bot = require('./bot');

const WEBHOOK_PATH = `/telegram/webhook/${process.env.TELEGRAM_WEBHOOK_SECRET || 'unset-secret'}`;

if (bot) {
  const sessionMiddleware = require('./middlewares/sessionMiddleware');
  const authMiddleware = require('./middlewares/authMiddleware');
  const adminService = require('../services/adminService');
  const mainMenu = require('./menus/mainMenu');

  bot.use(sessionMiddleware);
  bot.use(authMiddleware);

  bot.start(async ctx => {
    const token = ctx.startPayload;
    if (!token) {
      if (!ctx.state.admin) {
        return ctx.reply('برای اتصال حساب، از پنل ادمین وب روی «اتصال تلگرام» بزن.');
      }
      return mainMenu.showMainMenu(ctx);
    }
    const admin = await adminService.consumeTelegramLinkToken(token, ctx.chat.id);
    if (!admin) {
      return ctx.reply('لینک نامعتبر یا منقضی‌شده است. یک لینک جدید از پنل ادمین وب بساز.');
    }
    ctx.state.admin = admin;
    await ctx.reply(`سلام ${admin.name} 👋\nحساب تلگرامت با موفقیت به پنل ادمین وصل شد.`);
    await mainMenu.showMainMenu(ctx);
  });

  mainMenu.register(bot);
  require('./menus/ordersMenu').register(bot);
  require('./menus/productsMenu').register(bot);
  require('./menus/categoriesMenu').register(bot);
  require('./menus/colorsMenu').register(bot);
  require('./menus/couponsMenu').register(bot);
  require('./menus/bannersMenu').register(bot);
  require('./menus/heroSlidesMenu').register(bot);
  require('./menus/usersMenu').register(bot);
  require('./menus/settingsMenu').register(bot);
  require('./menus/adminsMenu').register(bot);
  require('./wizards/productWizard').register(bot);
  require('./wizards/couponWizard').register(bot);
  require('./wizards/bannerWizard').register(bot);
  require('./wizards/heroSlideWizard').register(bot);
  require('./wizards/adminWizard').register(bot);

  bot.catch((err, ctx) => {
    console.error(`[telegram] Unhandled error for update ${ctx.updateType}: ${err.message}`);
  });
}

module.exports = { bot, webhookPath: WEBHOOK_PATH };
