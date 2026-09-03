'use strict';

const categoryService = require('../../services/categoryService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');

async function showCategoriesRoot(ctx) {
  const categories = await categoryService.listCategories();
  const rows = categories.map(c => ([{ text: `${c.name} (${c.id})`, callback_data: `category:view:${c.id}` }]));
  rows.push([{ text: '➕ افزودن دسته‌بندی', callback_data: 'category:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, '🗂 دسته‌بندی‌ها:', { inline_keyboard: rows });
}

function categoryDetailKeyboard(category) {
  const rows = [
    [{ text: '✏️ ویرایش نام', callback_data: `category:editName:${category.id}` }],
    [{ text: '🗑 حذف', callback_data: `category:delete:${category.id}` }],
  ];
  rows.push(...backRow('menu:categories'));
  return { inline_keyboard: rows };
}

async function showCategoryDetail(ctx, id) {
  const categories = await categoryService.listCategories();
  const category = categories.find(c => c.id === id);
  if (!category) return showCategoriesRoot(ctx);
  await editOrReply(ctx, `🗂 ${category.name}\nشناسه: ${category.id}\nتصویر: ${category.image}`, categoryDetailKeyboard(category));
}

function register(bot) {
  bot.action('menu:categories', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showCategoriesRoot(ctx);
  });

  bot.action(/^category:view:(.+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showCategoryDetail(ctx, ctx.match[1]);
  });

  bot.action(/^category:delete:(.+)$/, requireTelegramPermission('products'), async ctx => {
    const rows = [
      [{ text: '✅ بله، حذف کن', callback_data: `category:deleteConfirm:${ctx.match[1]}` }],
      [{ text: '❌ انصراف', callback_data: `category:view:${ctx.match[1]}` }],
    ];
    await ctx.answerCbQuery();
    await editOrReply(ctx, 'از حذف این دسته‌بندی مطمئنی؟ (زیرمجموعه‌ها جدا باقی می‌مونن)', { inline_keyboard: rows });
  });

  bot.action(/^category:deleteConfirm:(.+)$/, requireTelegramPermission('products'), async ctx => {
    await categoryService.deleteCategory(ctx.match[1]);
    await ctx.answerCbQuery('دسته‌بندی حذف شد');
    await showCategoriesRoot(ctx);
  });

  bot.action(/^category:editName:(.+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = `categoryEditName:${ctx.match[1]}`;
    await editOrReply(ctx, 'نام جدید دسته‌بندی رو بفرست:', { inline_keyboard: backRow(`category:view:${ctx.match[1]}`) });
  });

  bot.action('category:add', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'category:add:id';
    ctx.session.data.categoryDraft = {};
    await editOrReply(ctx, 'شناسه‌ی یکتای دسته‌بندی (لاتین، بدون فاصله) رو بفرست:', { inline_keyboard: backRow('menu:categories') });
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session.step?.startsWith('categoryEditName:')) {
      const id = ctx.session.step.split(':')[1];
      await categoryService.updateCategory(id, { name: ctx.message.text.trim() });
      ctx.session.step = null;
      await ctx.reply('✅ نام دسته‌بندی به‌روزرسانی شد.');
      return showCategoryDetail(ctx, id);
    }
    if (!ctx.session.step?.startsWith('category:add:')) return next();
    const draft = ctx.session.data.categoryDraft || {};
    const value = ctx.message.text.trim();

    if (ctx.session.step === 'category:add:id') {
      draft.id = value;
      ctx.session.step = 'category:add:name';
      ctx.session.data.categoryDraft = draft;
      return ctx.reply('نام نمایشی دسته‌بندی رو بفرست:');
    }
    if (ctx.session.step === 'category:add:name') {
      draft.name = value;
      ctx.session.step = 'category:add:image';
      ctx.session.data.categoryDraft = draft;
      return ctx.reply('آدرس (URL) تصویر دسته‌بندی رو بفرست:');
    }
    if (ctx.session.step === 'category:add:image') {
      draft.image = value;
      try {
        await categoryService.createCategory(draft);
        ctx.session.step = null;
        ctx.session.data.categoryDraft = null;
        await ctx.reply('✅ دسته‌بندی ساخته شد.');
        await showCategoriesRoot(ctx);
      } catch (err) {
        await ctx.reply(`خطا در ساخت دسته‌بندی: ${err.message}`);
      }
    }
  });
}

module.exports = { register, showCategoriesRoot };
