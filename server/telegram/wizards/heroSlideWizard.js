'use strict';

const heroService = require('../../services/heroService');
const { saveHeroImageWebp } = require('../../lib/upload');
const { downloadTelegramFile } = require('../lib/telegramImage');
const { backRow } = require('../lib/keyboards');
const { editOrReply } = require('../menus/mainMenu');
const bot = require('../bot');

/* ویزارد افزودن اسلاید هیرو — همون فیلدهای فرم وب (hsf-*): تصویر (اجباری) → تصویر
   تم تیره (اختیاری) → eyebrow/title/subtitle/ctaLabel/ctaLink (همه اختیاری) → ترتیب. */
function skipRow(action) {
  return [{ text: '⏭ رد شدن', callback_data: action }];
}

async function start(ctx) {
  ctx.session.data.heroDraft = { eyebrow: '', title: '', subtitle: '', ctaLabel: '', ctaLink: '', order: 0 };
  ctx.session.step = 'hero:image';
  await editOrReply(ctx, '🎞 افزودن اسلاید هیرو\n\n📷 عکس اصلی اسلاید رو بفرست:', { inline_keyboard: backRow('menu:heroSlides') });
}

async function askImageDark(ctx) {
  ctx.session.step = 'hero:imageDark';
  await editOrReply(ctx, '📷 عکس اختصاصی تم تیره (اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:imageDark'), ...backRow('menu:heroSlides')],
  });
}

async function askEyebrow(ctx) {
  ctx.session.step = 'hero:eyebrow';
  await editOrReply(ctx, '📝 متن کوچک بالای عنوان (eyebrow، اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:eyebrow'), ...backRow('menu:heroSlides')],
  });
}

async function askTitle(ctx) {
  ctx.session.step = 'hero:title';
  await editOrReply(ctx, '📝 عنوان اصلی (اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:title'), ...backRow('menu:heroSlides')],
  });
}

async function askSubtitle(ctx) {
  ctx.session.step = 'hero:subtitle';
  await editOrReply(ctx, '📝 زیرعنوان (اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:subtitle'), ...backRow('menu:heroSlides')],
  });
}

async function askCtaLabel(ctx) {
  ctx.session.step = 'hero:ctaLabel';
  await editOrReply(ctx, '🔘 متن دکمه (مثلاً «مشاهده محصولات»، اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:ctaLabel'), ...backRow('menu:heroSlides')],
  });
}

async function askCtaLink(ctx) {
  ctx.session.step = 'hero:ctaLink';
  await editOrReply(ctx, '🔗 لینک دکمه (اختیاری) رو بفرست یا رد شو:', {
    inline_keyboard: [skipRow('hsw:skip:ctaLink'), ...backRow('menu:heroSlides')],
  });
}

async function askOrder(ctx) {
  ctx.session.step = 'hero:order';
  await editOrReply(ctx, '🔢 ترتیب نمایش (عدد، هرچه کمتر زودتر) رو بفرست یا رد شو (پیش‌فرض ۰):', {
    inline_keyboard: [skipRow('hsw:skip:order'), ...backRow('menu:heroSlides')],
  });
}

function summaryText(draft) {
  return [
    '🎞 خلاصه‌ی اسلاید:',
    `تصویر: ${draft.imageUrl ? '✅ دریافت شد' : '❌ ثبت نشده'}`,
    `تصویر تم تیره: ${draft.imageUrlDark ? '✅ دریافت شد' : '— (از تصویر اصلی استفاده می‌شه)'}`,
    `eyebrow: ${draft.eyebrow || '—'}`,
    `عنوان: ${draft.title || '—'}`,
    `زیرعنوان: ${draft.subtitle || '—'}`,
    `دکمه: ${draft.ctaLabel || '—'} ${draft.ctaLink ? `→ ${draft.ctaLink}` : ''}`,
    `ترتیب: ${draft.order}`,
  ].join('\n');
}

async function goToConfirm(ctx) {
  ctx.session.step = 'hero:confirm';
  await editOrReply(ctx, summaryText(ctx.session.data.heroDraft), {
    inline_keyboard: [
      [{ text: '✅ ثبت اسلاید', callback_data: 'hsw:confirm' }],
      [{ text: '❌ انصراف', callback_data: 'menu:heroSlides' }],
    ],
  });
}

async function submit(ctx) {
  const draft = ctx.session.data.heroDraft;
  if (!draft.imageUrl) {
    await ctx.reply('تصویر اصلی ثبت نشده؛ دوباره از اول شروع کن.');
    return;
  }
  const result = await heroService.createSlide(draft);
  ctx.session.step = null;
  ctx.session.data.heroDraft = null;
  if (!result.ok) {
    await ctx.reply('خطا در ثبت اسلاید.');
    return;
  }
  await ctx.reply('✅ اسلاید ثبت شد.');
  const heroSlidesMenu = require('../menus/heroSlidesMenu');
  await heroSlidesMenu.showHeroSlidesRoot(ctx);
}

async function handleText(ctx) {
  const draft = ctx.session.data.heroDraft;
  if (!draft) return;
  const value = ctx.message.text.trim();

  if (ctx.session.step === 'hero:eyebrow') { draft.eyebrow = value; ctx.session.data.heroDraft = draft; return askTitle(ctx); }
  if (ctx.session.step === 'hero:title') { draft.title = value; ctx.session.data.heroDraft = draft; return askSubtitle(ctx); }
  if (ctx.session.step === 'hero:subtitle') { draft.subtitle = value; ctx.session.data.heroDraft = draft; return askCtaLabel(ctx); }
  if (ctx.session.step === 'hero:ctaLabel') { draft.ctaLabel = value; ctx.session.data.heroDraft = draft; return askCtaLink(ctx); }
  if (ctx.session.step === 'hero:ctaLink') { draft.ctaLink = value; ctx.session.data.heroDraft = draft; return askOrder(ctx); }
  if (ctx.session.step === 'hero:order') {
    draft.order = Number(value) || 0;
    ctx.session.data.heroDraft = draft;
    return goToConfirm(ctx);
  }
}

async function handlePhoto(ctx) {
  const draft = ctx.session.data.heroDraft;
  if (!draft) return;
  const fileId = ctx.message.photo.at(-1).file_id;
  try {
    const { buffer } = await downloadTelegramFile(bot, fileId);
    const url = await saveHeroImageWebp(buffer);
    if (ctx.session.step === 'hero:image') {
      draft.imageUrl = url;
      ctx.session.data.heroDraft = draft;
      await ctx.reply('✅ عکس اصلی دریافت شد.');
      await askImageDark(ctx);
    } else if (ctx.session.step === 'hero:imageDark') {
      draft.imageUrlDark = url;
      ctx.session.data.heroDraft = draft;
      await ctx.reply('✅ عکس تم تیره دریافت شد.');
      await askEyebrow(ctx);
    }
  } catch (err) {
    await ctx.reply(`خطا در دریافت عکس: ${err.message}. دوباره امتحان کن.`);
  }
}

function register(bot_) {
  bot_.action('hsw:skip:imageDark', async ctx => { await ctx.answerCbQuery(); await askEyebrow(ctx); });
  bot_.action('hsw:skip:eyebrow', async ctx => { await ctx.answerCbQuery(); await askTitle(ctx); });
  bot_.action('hsw:skip:title', async ctx => { await ctx.answerCbQuery(); await askSubtitle(ctx); });
  bot_.action('hsw:skip:subtitle', async ctx => { await ctx.answerCbQuery(); await askCtaLabel(ctx); });
  bot_.action('hsw:skip:ctaLabel', async ctx => { await ctx.answerCbQuery(); await askCtaLink(ctx); });
  bot_.action('hsw:skip:ctaLink', async ctx => { await ctx.answerCbQuery(); await askOrder(ctx); });
  bot_.action('hsw:skip:order', async ctx => { await ctx.answerCbQuery(); await goToConfirm(ctx); });
  bot_.action('hsw:confirm', async ctx => { await ctx.answerCbQuery(); await submit(ctx); });

  bot_.on('text', async (ctx, next) => {
    if (!ctx.session.step?.startsWith('hero:')) return next();
    await handleText(ctx);
  });

  bot_.on('photo', async (ctx, next) => {
    if (ctx.session.step !== 'hero:image' && ctx.session.step !== 'hero:imageDark') return next();
    await handlePhoto(ctx);
  });
}

module.exports = { start, register };
