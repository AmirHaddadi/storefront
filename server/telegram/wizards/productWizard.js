'use strict';

const productService = require('../../services/productService');
const categoryService = require('../../services/categoryService');
const colorService = require('../../services/colorService');
const { saveProductImageWebp } = require('../../lib/upload');
const { downloadTelegramFile } = require('../lib/telegramImage');
const { backRow } = require('../lib/keyboards');
const { toman } = require('../lib/format');
const { editOrReply } = require('../menus/mainMenu');
const bot = require('../bot');

function skipKeyboard(skipAction, backAction = 'menu:products') {
  return { inline_keyboard: [[{ text: '⏭ رد شدن', callback_data: skipAction }], ...backRow(backAction)] };
}

async function categoryKeyboard() {
  const categories = await categoryService.listCategories();
  const rows = categories.map(c => ([{ text: c.name, callback_data: `pw:category:${c.id}` }]));
  rows.push(...backRow('menu:products'));
  return { inline_keyboard: rows };
}

/* opts.editId: اگر ست باشه یعنی ویرایش محصول موجوده — draft با دیتای فعلی پیش‌پر می‌شه
   و هر مرحله دکمه‌ی «بدون تغییر» هم نشون داده می‌شه (skip از همون مقدار فعلی استفاده می‌کنه). */
async function start(ctx, opts = {}) {
  let draft = { colors: [], sizes: null };
  if (opts.editId) {
    const product = await productService.getProductById(opts.editId);
    if (!product) return editOrReply(ctx, 'محصول پیدا نشد.', { inline_keyboard: backRow('menu:products') });
    draft = {
      _editId: opts.editId,
      code: product.code, name: product.name, category: product.category,
      price: product.price, images: product.images || [],
      stockQty: product.stockQty, sizes: product.sizes, colors: product.colors,
    };
  }
  ctx.session.data.productDraft = draft;
  ctx.session.step = 'product:code';

  const skipBtn = opts.editId ? [[{ text: `⏭ بدون تغییر (${draft.code})`, callback_data: 'pw:skip:code' }]] : [];
  const nextCodeBtn = opts.editId ? [] : [[{ text: '🔢 پیشنهاد کد بعدی', callback_data: 'pw:nextCode' }]];
  await editOrReply(ctx, `🛍 ${opts.editId ? 'ویرایش' : 'افزودن'} محصول\n\nکد محصول رو بفرست:`, {
    inline_keyboard: [...skipBtn, ...nextCodeBtn, ...backRow('menu:products')],
  });
}

function summaryText(draft) {
  return [
    '🛍 خلاصه محصول:',
    `کد: ${draft.code}`,
    `نام: ${draft.name}`,
    `دسته‌بندی: ${draft.category}`,
    `قیمت: ${toman(draft.price)}`,
    `موجودی: ${draft.stockQty != null ? draft.stockQty : 'ردیابی نمی‌شه'}`,
    `سایزها: ${Array.isArray(draft.sizes) && draft.sizes.length ? draft.sizes.join('، ') : '—'}`,
    `رنگ‌ها: ${Array.isArray(draft.colors) && draft.colors.length ? draft.colors.map(c => c.name).join('، ') : '—'}`,
    `تصاویر: ${draft.images?.length ? `✅ ${draft.images.length} تصویر` : '❌ ثبت نشده'}`,
  ].join('\n');
}

function confirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ ثبت محصول', callback_data: 'pw:confirm' }],
      [{ text: '❌ انصراف', callback_data: 'menu:products' }],
    ],
  };
}

async function goToConfirm(ctx) {
  const draft = ctx.session.data.productDraft;
  ctx.session.step = 'product:confirm';
  await editOrReply(ctx, summaryText(draft), confirmKeyboard());
}

async function askImage(ctx) {
  const draft = ctx.session.data.productDraft;
  ctx.session.step = 'product:image';
  const doneBtn = draft.images?.length ? [[{ text: `✅ پایان (${draft.images.length} تصویر) و ادامه`, callback_data: 'pw:images:done' }]] : [];
  await editOrReply(ctx, '📷 عکس‌های محصول رو یکی‌یکی بفرست (حداکثر ۱۰ تا)؛ وقتی تموم شد روی «پایان» بزن:', {
    inline_keyboard: [...doneBtn, ...backRow('menu:products')],
  });
}

async function askStockQty(ctx) {
  ctx.session.step = 'product:stockQty';
  await editOrReply(ctx, 'تعداد موجودی برای ردیابی خودکار رو بفرست (عدد) یا رد شو:', skipKeyboard('pw:skip:stockQty'));
}

async function askSizes(ctx) {
  ctx.session.step = 'product:sizes';
  await editOrReply(ctx, 'سایزها رو با کاما جدا کن (مثلاً: 36,38,40) یا رد شو:', skipKeyboard('pw:skip:sizes'));
}

async function colorsKeyboard(selectedIds) {
  const colors = await colorService.listColors();
  const rows = colors.map(c => ([{
    text: `${selectedIds.includes(c.name) ? '✅' : '⬜️'} ${c.name}`,
    callback_data: `pw:color:${c.name}`,
  }]));
  rows.push([{ text: '➡️ تایید و ادامه', callback_data: 'pw:colors:done' }]);
  rows.push(...backRow('menu:products'));
  return { inline_keyboard: rows };
}

async function askColors(ctx) {
  const draft = ctx.session.data.productDraft;
  ctx.session.step = 'product:colors';
  const selectedIds = (draft.colors || []).map(c => c.id);
  await editOrReply(ctx, '🎨 رنگ‌های موجود برای این محصول رو انتخاب کن:', await colorsKeyboard(selectedIds));
}

async function handleText(ctx) {
  const draft = ctx.session.data.productDraft || {};
  const value = ctx.message.text.trim();

  if (ctx.session.step === 'product:code') {
    draft.code = value;
    ctx.session.data.productDraft = draft;
    ctx.session.step = 'product:name';
    return ctx.reply(draft.name ? `⏭ بدون تغییر (${draft.name})` : 'نام محصول رو بفرست:', draft.name
      ? { inline_keyboard: [[{ text: `⏭ بدون تغییر (${draft.name})`, callback_data: 'pw:skip:name' }], ...backRow('menu:products')] }
      : { inline_keyboard: backRow('menu:products') });
  }
  if (ctx.session.step === 'product:name') {
    draft.name = value;
    ctx.session.data.productDraft = draft;
    ctx.session.step = 'product:category';
    return ctx.reply('دسته‌بندی رو انتخاب کن:', await categoryKeyboard());
  }
  if (ctx.session.step === 'product:price') {
    const num = Number(value);
    if (!(num >= 0)) return ctx.reply('قیمت باید عدد باشه. دوباره بفرست:');
    draft.price = num;
    ctx.session.data.productDraft = draft;
    return askImage(ctx);
  }
  if (ctx.session.step === 'product:stockQty') {
    draft.stockQty = Number(value) || null;
    ctx.session.data.productDraft = draft;
    return askSizes(ctx);
  }
  if (ctx.session.step === 'product:sizes') {
    draft.sizes = value.split(',').map(s => s.trim()).filter(Boolean);
    ctx.session.data.productDraft = draft;
    return askColors(ctx);
  }
}

async function handlePhoto(ctx) {
  const draft = ctx.session.data.productDraft || {};
  draft.images = draft.images || [];
  if (draft.images.length >= 10) {
    await ctx.reply('حداکثر ۱۰ تصویر مجازه؛ روی «پایان» بزن تا ادامه بدیم.');
    return;
  }
  const fileId = ctx.message.photo.at(-1).file_id;
  try {
    const { buffer } = await downloadTelegramFile(bot, fileId);
    const url = await saveProductImageWebp(buffer);
    draft.images.push(url);
    ctx.session.data.productDraft = draft;
    await askImage(ctx);
  } catch (err) {
    await ctx.reply(`خطا در دریافت عکس: ${err.message}. دوباره امتحان کن.`);
  }
}

async function saveProduct(ctx) {
  const draft = ctx.session.data.productDraft;
  const payload = {
    code: draft.code, name: draft.name, category: draft.category,
    price: draft.price, images: draft.images?.length ? draft.images : [],
    stockQty: draft.stockQty ?? null, sizes: draft.sizes?.length ? draft.sizes : null,
    colors: draft.colors || [],
  };

  try {
    if (draft._editId) {
      await productService.updateProduct(draft._editId, payload);
    } else {
      await productService.createProduct(payload);
    }
    ctx.session.step = null;
    ctx.session.data.productDraft = null;
    await ctx.reply(`✅ محصول ${draft._editId ? 'ویرایش' : 'ثبت'} شد.`);
    const productsMenu = require('../menus/productsMenu');
    await productsMenu.showProductsRoot(ctx);
  } catch (err) {
    await ctx.reply(`خطا در ثبت محصول: ${err.message}`);
  }
}

function register(bot_) {
  bot_.action(/^pw:category:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.productDraft || {};
    draft.category = ctx.match[1];
    ctx.session.data.productDraft = draft;
    ctx.session.step = 'product:price';
    await editOrReply(ctx, 'قیمت محصول (تومان) رو بفرست:', { inline_keyboard: backRow('menu:products') });
  });

  bot_.action('pw:skip:code', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'product:name';
    const draft = ctx.session.data.productDraft || {};
    await editOrReply(ctx, `نام محصول رو بفرست:`, {
      inline_keyboard: [[{ text: `⏭ بدون تغییر (${draft.name})`, callback_data: 'pw:skip:name' }], ...backRow('menu:products')],
    });
  });

  bot_.action('pw:skip:name', async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'product:category';
    await editOrReply(ctx, 'دسته‌بندی رو انتخاب کن:', await categoryKeyboard());
  });

  bot_.action('pw:nextCode', async ctx => {
    await ctx.answerCbQuery();
    const code = await productService.getNextCode();
    const draft = ctx.session.data.productDraft || {};
    draft.code = code;
    ctx.session.data.productDraft = draft;
    ctx.session.step = 'product:name';
    await editOrReply(ctx, `کد ${code} انتخاب شد.\nنام محصول رو بفرست:`, { inline_keyboard: backRow('menu:products') });
  });

  bot_.action('pw:images:done', async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.productDraft || {};
    if (!draft.images?.length) return ctx.reply('حداقل یک تصویر لازمه.');
    return askStockQty(ctx);
  });

  bot_.action('pw:skip:stockQty', async ctx => {
    await ctx.answerCbQuery();
    return askSizes(ctx);
  });

  bot_.action('pw:skip:sizes', async ctx => {
    await ctx.answerCbQuery();
    return askColors(ctx);
  });

  bot_.action(/^pw:color:(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    const draft = ctx.session.data.productDraft || {};
    draft.colors = draft.colors || [];
    const name = ctx.match[1];
    const exists = draft.colors.some(c => c.id === name);
    if (exists) {
      draft.colors = draft.colors.filter(c => c.id !== name);
    } else {
      const colors = await colorService.listColors();
      const color = colors.find(c => c.name === name);
      if (color) draft.colors.push({ id: color.name, name: color.name, hex: color.hex });
    }
    ctx.session.data.productDraft = draft;
    await editOrReply(ctx, '🎨 رنگ‌های موجود برای این محصول رو انتخاب کن:', await colorsKeyboard(draft.colors.map(c => c.id)));
  });

  bot_.action('pw:colors:done', async ctx => {
    await ctx.answerCbQuery();
    await goToConfirm(ctx);
  });

  bot_.action('pw:confirm', async ctx => {
    await ctx.answerCbQuery();
    await saveProduct(ctx);
  });

  bot_.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('product:')) return next();
    await handleText(ctx);
  });

  bot_.on('photo', async (ctx, next) => {
    if (ctx.session.step !== 'product:image') return next();
    await handlePhoto(ctx);
  });
}

module.exports = { start, register };
