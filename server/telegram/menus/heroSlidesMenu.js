'use strict';

const fs = require('fs');
const path = require('path');
const heroService = require('../../services/heroService');
const { UPLOADS_ROOT } = require('../../lib/upload');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');

async function showHeroSlidesRoot(ctx) {
  const slides = await heroService.listSlides();
  const rows = slides.map(s => ([{
    text: `${s.active ? '🟢' : '⚪️'} ${s.title || s.eyebrow || '(بدون عنوان)'} — ترتیب ${s.order}`,
    callback_data: `heroSlide:view:${s.id}`,
  }]));
  rows.push([{ text: '➕ افزودن اسلاید', callback_data: 'heroSlide:add' }]);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  await editOrReply(ctx, '🎞 اسلایدهای هیرو:', { inline_keyboard: rows });
}

function heroSlideDetailKeyboard(slide) {
  const rows = [
    [{ text: slide.active ? '⛔ غیرفعال کن' : '✅ فعال کن', callback_data: `heroSlide:toggle:${slide.id}` }],
    [
      { text: '⬆️ بالاتر', callback_data: `heroSlide:move:up:${slide.id}` },
      { text: '⬇️ پایین‌تر', callback_data: `heroSlide:move:down:${slide.id}` },
    ],
    [{ text: '🗑 حذف', callback_data: `heroSlide:delete:${slide.id}` }],
  ];
  rows.push(...backRow('menu:heroSlides'));
  return { inline_keyboard: rows };
}

async function findSlide(id) {
  const slides = await heroService.listSlides();
  return slides.find(s => s.id === id);
}

async function showHeroSlideDetail(ctx, id) {
  const slide = await findSlide(id);
  if (!slide) return showHeroSlidesRoot(ctx);

  const text = [
    `🎞 ${slide.title || slide.eyebrow || '(بدون عنوان)'}`,
    slide.subtitle ? `زیرعنوان: ${slide.subtitle}` : '',
    slide.ctaLabel ? `دکمه: ${slide.ctaLabel} → ${slide.ctaLink || '—'}` : '',
    `ترتیب: ${slide.order}`,
    `وضعیت: ${slide.active ? 'فعال' : 'غیرفعال'}`,
    slide.imageUrlDark ? 'تصویر تم تیره: دارد' : '',
  ].filter(Boolean).join('\n');

  const filePath = path.join(UPLOADS_ROOT, 'hero', path.basename(slide.imageUrl));
  if (fs.existsSync(filePath)) {
    await ctx.replyWithPhoto(
      { source: fs.createReadStream(filePath) },
      { caption: text, reply_markup: heroSlideDetailKeyboard(slide) },
    );
  } else {
    await editOrReply(ctx, text, heroSlideDetailKeyboard(slide));
  }
}

async function moveSlide(ctx, id, direction) {
  const slides = await heroService.listSlides();
  const index = slides.findIndex(s => s.id === id);
  if (index === -1) return;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= slides.length) return;
  [slides[index], slides[swapWith]] = [slides[swapWith], slides[index]];
  await heroService.reorderSlides(slides.map(s => s.id));
}

function register(bot) {
  bot.action('menu:heroSlides', requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await showHeroSlidesRoot(ctx);
  });

  bot.action(/^heroSlide:view:([\w-]+)$/, requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    await showHeroSlideDetail(ctx, ctx.match[1]);
  });

  bot.action(/^heroSlide:toggle:([\w-]+)$/, requireTelegramPermission('appearance'), async ctx => {
    const slide = await findSlide(ctx.match[1]);
    if (slide) await heroService.updateSlide(slide.id, { active: !slide.active });
    await ctx.answerCbQuery('وضعیت به‌روزرسانی شد');
    await showHeroSlidesRoot(ctx);
  });

  bot.action(/^heroSlide:move:(up|down):([\w-]+)$/, requireTelegramPermission('appearance'), async ctx => {
    await moveSlide(ctx, ctx.match[2], ctx.match[1]);
    await ctx.answerCbQuery('ترتیب به‌روزرسانی شد');
    await showHeroSlidesRoot(ctx);
  });

  bot.action(/^heroSlide:delete:([\w-]+)$/, requireTelegramPermission('appearance'), async ctx => {
    const rows = [
      [{ text: '✅ بله، حذف کن', callback_data: `heroSlide:deleteConfirm:${ctx.match[1]}` }],
      [{ text: '❌ انصراف', callback_data: `heroSlide:view:${ctx.match[1]}` }],
    ];
    await ctx.answerCbQuery();
    await editOrReply(ctx, 'از حذف این اسلاید مطمئنی؟', { inline_keyboard: rows });
  });

  bot.action(/^heroSlide:deleteConfirm:([\w-]+)$/, requireTelegramPermission('appearance'), async ctx => {
    await heroService.deleteSlide(ctx.match[1]);
    await ctx.answerCbQuery('اسلاید حذف شد');
    await showHeroSlidesRoot(ctx);
  });

  bot.action('heroSlide:add', requireTelegramPermission('appearance'), async ctx => {
    await ctx.answerCbQuery();
    const heroSlideWizard = require('../wizards/heroSlideWizard');
    await heroSlideWizard.start(ctx);
  });
}

module.exports = { register, showHeroSlidesRoot, showHeroSlideDetail, findSlide };
