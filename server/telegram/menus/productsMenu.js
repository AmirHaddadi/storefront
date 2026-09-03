'use strict';

const productService = require('../../services/productService');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { paginate, paginationRow, backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');
const { toman } = require('../lib/format');
const productWizard = require('../wizards/productWizard');

async function showProductsRoot(ctx) {
  const rows = [
    [{ text: '📄 لیست محصولات', callback_data: 'products:list:1' }],
    [{ text: '🔎 جستجوی محصول', callback_data: 'products:search' }],
    [{ text: '➕ افزودن محصول جدید', callback_data: 'product:add' }],
    ...backRow('menu:main', { withMainMenu: false }),
  ];
  await editOrReply(ctx, '🛍 محصولات — یکی از گزینه‌ها رو انتخاب کن:', { inline_keyboard: rows });
}

async function showProductsList(ctx, page, { search } = {}) {
  const products = search ? await productService.searchProducts({ search }) : await productService.listProducts();
  const { pageItems, page: safePage, totalPages } = paginate(products, page, 6);

  if (!pageItems.length) {
    return editOrReply(ctx, 'محصولی پیدا نشد.', { inline_keyboard: backRow('menu:products') });
  }

  const rows = pageItems.map(p => ([{
    text: `${p.name} — ${toman(p.price)}${p.inStock ? '' : ' (ناموجود)'}`,
    callback_data: `product:view:${p.id}`,
  }]));
  rows.push(...paginationRow(safePage, totalPages, pg => `products:list:${pg}`));
  rows.push(...backRow('menu:products'));

  await editOrReply(ctx, `🛍 محصولات — صفحه ${safePage} از ${totalPages}`, { inline_keyboard: rows });
}

function productDetailKeyboard(product) {
  const rows = [
    [{ text: '✏️ ویرایش', callback_data: `product:edit:${product.id}` }],
    [{ text: '🗑 حذف', callback_data: `product:delete:${product.id}` }],
  ];
  if (product.discountType && product.discountValue) {
    rows.push([{ text: '📢 اطلاع‌رسانی تخفیف (پیامک به همه)', callback_data: `product:notifyDiscount:${product.id}` }]);
  }
  rows.push(...backRow('menu:products'));
  return { inline_keyboard: rows };
}

async function showProductDetail(ctx, productId) {
  const product = await productService.getProductById(productId);
  if (!product) return editOrReply(ctx, 'محصول پیدا نشد.', { inline_keyboard: backRow('menu:products') });

  const stockLine = product.stockQty != null
    ? `موجودی: ${product.stockQty - product.stockSold} از ${product.stockQty}`
    : `موجود است: ${product.inStock ? 'بله' : 'خیر'}`;

  const text = [
    `🛍 ${product.name}`,
    `کد: ${product.code}`,
    `دسته‌بندی: ${product.category}`,
    `قیمت: ${toman(product.price)}${product.oldPrice ? ` (قیمت قبلی: ${toman(product.oldPrice)})` : ''}`,
    stockLine,
    product.discountType ? `تخفیف: ${product.discountType === 'percent' ? product.discountValue + '٪' : toman(product.discountValue)}` : '',
  ].filter(Boolean).join('\n');

  await editOrReply(ctx, text, productDetailKeyboard(product));
}

function register(bot) {
  bot.action('menu:products', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showProductsRoot(ctx);
  });

  bot.action(/^products:list:(\d+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showProductsList(ctx, Number(ctx.match[1]), { search: ctx.session.data.productSearch });
  });

  bot.action('products:search', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    ctx.session.step = 'productSearch:query';
    await editOrReply(ctx, '🔎 عبارت جستجو (نام محصول) رو بفرست:', { inline_keyboard: backRow('menu:products') });
  });

  bot.action(/^product:view:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await showProductDetail(ctx, ctx.match[1]);
  });

  bot.action(/^product:delete:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    const rows = [
      [{ text: '✅ بله، حذف کن', callback_data: `product:deleteConfirm:${ctx.match[1]}` }],
      [{ text: '❌ انصراف', callback_data: `product:view:${ctx.match[1]}` }],
    ];
    await editOrReply(ctx, 'از حذف این محصول مطمئنی؟', { inline_keyboard: rows });
  });

  bot.action(/^product:deleteConfirm:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    await productService.deleteProduct(ctx.match[1]);
    await ctx.answerCbQuery('محصول حذف شد');
    await showProductsRoot(ctx);
  });

  bot.action(/^product:notifyDiscount:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    const result = await productService.notifyDiscount(ctx.match[1]);
    await ctx.answerCbQuery(result.ok ? `پیامک برای ${result.recipients} نفر ارسال شد` : 'خطا در ارسال', { show_alert: true });
  });

  bot.action('product:add', requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await productWizard.start(ctx);
  });

  bot.action(/^product:edit:([\w-]+)$/, requireTelegramPermission('products'), async ctx => {
    await ctx.answerCbQuery();
    await productWizard.start(ctx, { editId: ctx.match[1] });
  });

  /* بدون requireTelegramPermission روی متن: چون session.step فقط از دکمه‌ای ست می‌شه
     که خودش قبلاً پشت requireTelegramPermission بوده، و اگر این middleware اینجا هم
     باشه، برای ادمین‌هایی که دسترسی «products» ندارن ولی در حال تایپ برای یک ویزارد
     دیگه‌ن (مثلاً کوپن) زنجیره‌ی bot.on('text', ...) را قطع می‌کنه. */
  bot.on('text', async (ctx, next) => {
    if (ctx.session.step !== 'productSearch:query') return next();
    ctx.session.data.productSearch = ctx.message.text.trim();
    ctx.session.step = null;
    await showProductsList(ctx, 1, { search: ctx.session.data.productSearch });
  });
}

module.exports = { register, showProductsRoot, showProductDetail };
