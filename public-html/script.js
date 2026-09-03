'use strict';

/* =========================================================
   Storefront — Storefront Logic
   دسته‌بندی‌ها/محصولات از API سمت سرور خونده می‌شن (server/data)؛
   سبد خرید و تم همچنان کلاینت‌ساید و در localStorage هستن.
   ========================================================= */

/* ---------- 1/2. دسته‌بندی‌ها و محصولات — از /api/categories و /api/products لود می‌شن ---------- */
let CATEGORIES = [];
let PRODUCTS = [];
let COLOR_PALETTE = [];

async function loadCatalog() {
  const [categoriesRes, productsRes, colorsRes] = await Promise.all([
    fetch('/api/categories'),
    fetch('/api/products'),
    fetch('/api/colors'),
  ]);
  CATEGORIES = await categoriesRes.json();
  PRODUCTS = await productsRes.json();
  COLOR_PALETTE = colorsRes.ok ? await colorsRes.json() : [];
}

function productUrl(p) {
  return `/${p.category}/${p.code}`;
}

/* ---------- 2b. داده‌ی سوالات متداول/راهنما/آموزش (placeholder، ساختار قابل‌گسترش) ---------- */
const FAQ_CATEGORIES = [
  { id: 'faq', name: 'سوالات متداول' },
  { id: 'guide', name: 'راهنما' },
  { id: 'tutorial', name: 'آموزش' },
];
let activeFaqCategory = 'faq';

const FAQ_ITEMS = [
  { category: 'faq', question: 'چطور می‌تونم سفارشم رو ثبت کنم؟', answer: 'محصول موردنظر رو انتخاب کن، رنگ و سایز رو مشخص کن و به سبد خرید اضافه کن. بعد از تکمیل سبد، روی «ثبت سفارش» بزن و اطلاعات تماس رو وارد کن.' },
  { category: 'faq', question: 'هزینه و زمان ارسال چقدره؟', answer: 'ارسال به سراسر ایران انجام می‌شه. پس از تایید سفارش توسط استورفرانت، محصول طی ۱ الی ۳ روز کاری به دست شما می‌رسه. زمان و هزینه‌ی دقیق بر اساس شهر شما، بعد از ثبت سفارش از طریق واتساپ/تلگرام هم به شما اطلاع داده می‌شه.' },
  { category: 'faq', question: 'امکان مرجوع کردن کالا وجود داره؟', answer: 'بله، در صورت وجود مغایرت یا عدم رضایت، تا ۷ روز پس از تحویل امکان مرجوعی طبق قوانین فروشگاه وجود داره.' },
  { category: 'guide', question: 'چطور سایز درست خودم رو انتخاب کنم؟', answer: 'از بخش «سایزهای تنظیم‌شده» در حساب کاربری می‌تونی با وارد کردن اندازه‌هات، سایز پیشنهادی رو بگیری و برای دفعات بعد ذخیره کنی.' },
  { category: 'guide', question: 'نحوه‌ی اندازه‌گیری دقیق سایز چطوره؟', answer: '<strong>دور کمر:</strong> باریک‌ترین قسمت کمر، تقریباً زیر سینه.<br><strong>دور شکم:</strong> دورتادورِ ناف.<br><strong>دور سینه:</strong> از زیر بغل تا بغل دیگر.<br><br>لطفاً اندازه‌ها را با دقت بگیرید؛ محصولات استورفرانت کشسانی دارند و در صورت اختلاف یک تا سه سانتی‌متر هم همچنان مناسب شما خواهند بود. با توجه به حساسیت سایزبندی و قواره‌ی محصولات، ثبت سفارش بدون درنظرگرفتن اندازه‌های دقیق امکان‌پذیر نیست.' },
  { category: 'guide', question: 'رنگ محصول در واقعیت با عکس فرق داره؟', answer: 'سعی می‌کنیم عکس‌ها نزدیک‌ترین حالت به رنگ واقعی باشن، ولی ممکنه بسته به نور صفحه‌نمایش شما کمی تفاوت جزئی وجود داشته باشه.' },
  { category: 'tutorial', question: 'چطور از طریق سایت با پشتیبانی در ارتباط باشم؟', answer: 'از پایین‌ترین بخش فوتر یا از منوی حساب کاربری، گزینه‌ی «پشتیبانی» رو بزن تا مستقیم به واتساپ یا تلگرام استورفرانت وصل بشی.' },
  { category: 'tutorial', question: 'چطور تم روشن/تیره‌ی سایت رو عوض کنم؟', answer: 'از آیکون خورشید/ماه در هدر سایت (کنار آیکون جستجو) استفاده کن؛ انتخابت برای بازدیدهای بعدی هم ذخیره می‌مونه.' },
];

const WHATSAPP_NUMBER = '989000000000';
const TELEGRAM_USERNAME = 'your_channel';
const SUPPORT_PHONE = '09000000000';
const SUPPORT_EMAIL = 'info@example.com';
const CART_STORAGE_KEY = 'brand_cart_v1';
const THEME_STORAGE_KEY = 'brand_theme_v1';
const COLOR_PRESET_STORAGE_KEY = 'brand_color_preset_v1';

/* ---------- 3. حالت سبد خرید ---------- */
let cart = loadCart();
let productFilters = loadProductFilters();

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed.filter(item => item && item.key && item.code && item.color);
  } catch {
    return [];
  }
}

function cartKey(productId, colorId, sizeId) {
  return `${productId}__${colorId}__${sizeId || 'onesize'}`;
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function formatPrice(n) {
  return n.toLocaleString('fa-IR') + ' تومان';
}

/* موجودی واقعاً قابل‌خرید یک ترکیب رنگ/سایز (یا کل محصول اگر variant نداره)؛ برای محصولات
   بدون ردیابی موجودی، null یعنی «بدون محدودیت اعلام‌شده» (نه صفر). */
function getAvailableStock(p, colorId, size) {
  if (p.variants && p.variants.length) {
    const variant = p.variants.find(v => (v.colorId || null) === (colorId || null) && (v.size || null) === (size || null));
    if (!variant) return 0;
    return Math.max(0, variant.stockQty - variant.stockSold);
  }
  if (p.stockQty == null) return null;
  return Math.max(0, p.stockQty - p.stockSold);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* توضیحات محصول رو به پاراگراف‌های واقعی (هر خط از تکست‌اریای ادمین = یک پاراگراف)
   تبدیل می‌کنه، نه یک <p> بزرگ با <br> بین خط‌ها. دلیلش صرفاً چیدمانی نیست: وقتی
   چند خط RTL/LTR مخلوط (فارسی + عدد/کلمه‌ی لاتین) همه زیر یک بافر بیدی مشترک با
   <br> کنار هم قرار بگیرن، مرورگر جهت کل بافر رو یک‌جا حساب می‌کنه و نقطه‌ی پایان
   یک پاراگراف می‌تونه بصری به ابتدای متن (لبه‌ی راست) پرت بشه. با <p> جدا برای هر
   خط + dir="rtl" صریح + unicode-bidi:plaintext (در CSS)، هر خط بافر بیدی مستقل خودش
   رو می‌گیره و این جابه‌جایی نادرست از بین می‌ره. */
function renderProductDescriptionHTML(description) {
  const paragraphs = String(description || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!paragraphs.length) return '';
  return paragraphs.map(p => `<p class="pd-description" dir="rtl">${escapeHTML(p)}</p>`).join('');
}

/* آدرس تصاویر آپلودی (محصول/دسته‌بندی) در دیتابیس بدون اسلش ابتدایی ذخیره شده بودن؛
   چون این صفحه ممکنه زیر مسیرهای تودرتو (مثلاً /دسته/کد-محصول) رندر بشه، بدون این
   نرمال‌سازی مسیر نسبی می‌شکست و تصویر برای کاربر نمایش داده نمی‌شد. */
function assetUrl(src) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) return src;
  return `/${src}`;
}

/* اگر تصویر از قبل در کش مرورگر لود شده، اسپینر رو بدون معطلی مخفی کن */
function markCachedImagesLoaded(scope) {
  scope.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.parentElement.classList.add('is-loaded');
    }
  });
}

/* ---------- 3b. اسلایدر تصویر هیرو ----------
   کاملاً داده‌محور و مدیریت‌شدنی از پنل ادمین (بخش appearance) — هیچ تصویر هاردکدی اینجا
   نمونده؛ لیست اسلایدها از /api/hero-slides (فقط اسلایدهای active) خونده می‌شه. */
const HERO_DEFAULT_TEXT = {
  eyebrow: 'خرید ساده، مطمئن و سریع',
  title: 'لباسی که داستان شما را روایت می‌کند',
  subtitle: 'مجموعه‌ای منتخب از محصولات با کیفیت، برای تجربه‌ی خریدی ساده و مطمئن.',
  ctaLabel: 'مشاهده محصولات',
  ctaLink: '#products',
};
const HERO_AUTOPLAY_MS = 5500;
let HERO_SLIDES = [];
let heroIndex = 0;
let heroTimer = null;

function heroImageForSlide(slide) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return (isDark && slide.imageUrlDark) ? slide.imageUrlDark : slide.imageUrl;
}

/* موقع سوییچ تم، اگه اسلاید فعلی نسخه‌ی مخصوص تم تیره داشته باشه، عکس‌ها رو زنده عوض می‌کنیم
   (بدون نیاز به رفرش کامل صفحه). */
function updateHeroImagesForTheme() {
  const slidesEl = document.getElementById('hero-slides');
  if (!slidesEl || !HERO_SLIDES.length) return;
  slidesEl.querySelectorAll('.hero-slide-item').forEach((item, i) => {
    const slide = HERO_SLIDES[i];
    if (!slide) return;
    const src = heroImageForSlide(slide);
    const img = item.querySelector('img.hero-img');
    const bg = item.querySelector('.hero-slide-bg');
    if (img && img.getAttribute('src') !== src) img.setAttribute('src', src);
    if (bg) bg.style.backgroundImage = `url('${src}')`;
  });
}

async function renderHeroSlider() {
  const media = document.getElementById('hero-media');
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl = document.getElementById('hero-dots');
  if (!media || !slidesEl || !dotsEl) return;

  try {
    const res = await fetch('/api/hero-slides');
    HERO_SLIDES = res.ok ? await res.json() : [];
  } catch {
    HERO_SLIDES = [];
  }

  const prevBtn = document.getElementById('hero-prev');
  const nextBtn = document.getElementById('hero-next');

  /* حالت خالی ظریف: تا وقتی ادمین هیچ اسلایدی ثبت نکرده، هیرو کرش نمی‌کنه یا تصویر شکسته
     نشون نمی‌ده — همون placeholder موجود + متن پیش‌فرض برند نمایش داده می‌شه. */
  if (!HERO_SLIDES.length) {
    slidesEl.innerHTML = '';
    dotsEl.innerHTML = '';
    media.classList.remove('is-loaded');
    media.classList.add('is-placeholder');
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    applyHeroSlideText(HERO_DEFAULT_TEXT);
    return;
  }

  if (prevBtn) prevBtn.hidden = false;
  if (nextBtn) nextBtn.hidden = false;
  media.classList.remove('is-placeholder');

  slidesEl.innerHTML = HERO_SLIDES.map((slide, i) => `
    <div class="hero-slide-item">
      <div class="hero-slide-bg" style="background-image:url('${heroImageForSlide(slide)}')"></div>
      <img src="${heroImageForSlide(slide)}" alt="${escapeHTML(slide.title || 'بنر اصلی Storefront')}" class="hero-img" loading="${i === 0 ? 'eager' : 'lazy'}"
           onload="this.closest('.hero-media').classList.add('is-loaded');"
           onerror="this.style.display='none'; if (${i === 0}) this.closest('.hero-media').classList.add('is-placeholder');">
    </div>
  `).join('');

  dotsEl.innerHTML = HERO_SLIDES.map((_, i) => `
    <button class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="نمایش اسلاید ${i + 1}"></button>
  `).join('');

  const heroImgs = slidesEl.querySelectorAll('img');
  if ([...heroImgs].some(img => img.complete && img.naturalWidth > 0)) {
    media.classList.add('is-loaded');
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToHeroSlide(heroIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToHeroSlide(heroIndex + 1));
  dotsEl.querySelectorAll('.hero-dot').forEach(dot => {
    dot.addEventListener('click', () => goToHeroSlide(Number(dot.dataset.index)));
  });

  media.addEventListener('mouseenter', stopHeroAutoplay);
  media.addEventListener('mouseleave', startHeroAutoplay);

  setHeroTrackPosition(slidesEl);
  applyHeroSlideText(HERO_SLIDES[0]);

  let touchStartX = 0;
  let dragDeltaPx = 0;
  let dragging = false;

  slidesEl.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    dragDeltaPx = 0;
    dragging = true;
    slidesEl.classList.add('dragging');
    stopHeroAutoplay();
  }, { passive: true });

  slidesEl.addEventListener('touchmove', e => {
    if (!dragging) return;
    dragDeltaPx = e.touches[0].clientX - touchStartX;
    setHeroTrackPosition(slidesEl, dragDeltaPx);
  }, { passive: true });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    slidesEl.classList.remove('dragging');
    const width = slidesEl.clientWidth || 1;
    if (Math.abs(dragDeltaPx) > width * 0.15) {
      goToHeroSlide(heroIndex + (dragDeltaPx < 0 ? 1 : -1));
    } else {
      setHeroTrackPosition(slidesEl);
      startHeroAutoplay();
    }
    dragDeltaPx = 0;
  };
  slidesEl.addEventListener('touchend', endDrag);
  slidesEl.addEventListener('touchcancel', endDrag);

  startHeroAutoplay();
}

/* متن هر اسلاید (eyebrow/title/subtitle/CTA) رو با fallback به متن پیش‌فرض برند سینک می‌کنه
   — اگه ادمین یه فیلد رو خالی گذاشته باشه، همون‌جا متن پیش‌فرض جایگزینش می‌شه تا هیرو هیچ‌وقت
   ناقص/خالی به نظر نرسه. */
function applyHeroSlideText(slide) {
  const eyebrowEl = document.getElementById('hero-eyebrow');
  const titleEl = document.getElementById('hero-title');
  const subtitleEl = document.getElementById('hero-subtitle');
  const ctaEl = document.getElementById('hero-cta');
  const ctaLabelEl = document.getElementById('hero-cta-label');
  if (!eyebrowEl || !titleEl || !subtitleEl || !ctaEl || !ctaLabelEl) return;

  eyebrowEl.textContent = slide.eyebrow || HERO_DEFAULT_TEXT.eyebrow;
  titleEl.textContent = slide.title || HERO_DEFAULT_TEXT.title;
  subtitleEl.textContent = slide.subtitle || HERO_DEFAULT_TEXT.subtitle;
  ctaLabelEl.textContent = slide.ctaLabel || HERO_DEFAULT_TEXT.ctaLabel;
  ctaEl.setAttribute('href', slide.ctaLink || HERO_DEFAULT_TEXT.ctaLink);
}

function setHeroTrackPosition(slidesEl, dragOffsetPx = 0) {
  const dragOffsetPercent = (dragOffsetPx / (slidesEl.clientWidth || 1)) * 100;
  slidesEl.style.transform = `translateX(${-heroIndex * 100 + dragOffsetPercent}%)`;
}

function goToHeroSlide(index) {
  if (!HERO_SLIDES.length) return;
  heroIndex = (index + HERO_SLIDES.length) % HERO_SLIDES.length;
  const slidesEl = document.getElementById('hero-slides');
  if (slidesEl) setHeroTrackPosition(slidesEl);
  document.querySelectorAll('.hero-dot').forEach((dot, i) => dot.classList.toggle('active', i === heroIndex));
  applyHeroSlideText(HERO_SLIDES[heroIndex]);
  startHeroAutoplay();
}

function startHeroAutoplay() {
  stopHeroAutoplay();
  if (!HERO_SLIDES.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer = setInterval(() => goToHeroSlide(heroIndex + 1), HERO_AUTOPLAY_MS);
}
function stopHeroAutoplay() {
  clearInterval(heroTimer);
}

/* ---------- 3c. ویژوالایزور دموی چندمرحله‌ای استورفرانت ----------
   کامپوننت اختصاصی و مستقل از اسلایدر تصویری بالا — هر مرحله یک قابلیت واقعی سایت رو
   با یک انیمیشن مخصوص خودش روایت می‌کنه (نه یک fade ساده). کاملاً استاتیک/فرانت‌اندی
   و مبتنی بر داده‌ست تا بعداً راحت بشه به بک‌اند وصلش کرد. */
const HERO_DEMO_AUTOPLAY_MS = 4800;
const HERO_DEMO_STEPS = [
  {
    id: 'discover',
    icon: 'fa-magnifying-glass',
    title: 'کشف محصول با فیلتر هوشمند',
    desc: 'بر اساس دسته‌بندی، رنگ، سایز و موجودی، دقیقاً همون چیزی که دنبالشی رو پیدا کن.',
    visual: 'discover',
  },
  {
    id: 'size',
    icon: 'fa-ruler-combined',
    title: 'راهنمای سایز هوشمند',
    desc: 'اندازه‌هاتو وارد کن؛ سایز پیشنهادی بر اساس چارت رسمی استورفرانت، جلوی چشمت محاسبه می‌شه.',
    visual: 'size',
  },
  {
    id: 'checkout',
    icon: 'fa-receipt',
    title: 'تسویه‌حساب شفاف',
    desc: 'جمع محصولات، هزینه ارسال و مبلغ نهایی قابل پرداخت، پیش از ثبت سفارش به‌روشنی نمایش داده می‌شه.',
    visual: 'receipt',
  },
  {
    id: 'tracking',
    icon: 'fa-truck-fast',
    title: 'پیگیری زنده‌ی سفارش',
    desc: 'از ثبت سفارش تا تحویل درِ خونه، مسیر سفارشت رو قدم‌به‌قدم دنبال کن.',
    visual: 'tracking',
  },
];
let heroDemoIndex = 0;
let heroDemoTimer = null;

function heroDemoVisualHTML(visual) {
  switch (visual) {
    case 'discover':
      return `
        <div class="hdv-chips">
          ${[['fa-layer-group', 'دسته‌بندی'], ['fa-palette', 'رنگ'], ['fa-ruler', 'سایز'], ['fa-box', 'موجودی']].map(([icon, label], i) => `
            <span class="hdv-chip" style="--d:${i}"><i class="fa-solid ${icon}"></i> ${label}</span>
          `).join('')}
        </div>
        <div class="hdv-cards">
          ${['fa-box', 'fa-tag', 'fa-star'].map((icon, i) => `
            <div class="hdv-card" style="--d:${i}">
              <i class="fa-solid ${icon}"></i>
              <span class="hdv-card-match"><i class="fa-solid fa-check"></i></span>
            </div>
          `).join('')}
        </div>
      `;
    case 'size':
      return `
        <div class="hdv-size-rows">
          ${[['سینه', 92], ['کمر', 70], ['باسن', 97]].map(([label, pct], i) => `
            <div class="hdv-size-row" style="--d:${i}">
              <span>${label}</span>
              <div class="hdv-size-bar-track"><div class="hdv-size-bar" style="--w:${pct}%"></div></div>
            </div>
          `).join('')}
        </div>
        <div class="hdv-size-result"><span>سایز پیشنهادی</span><strong>L</strong></div>
      `;
    case 'receipt':
      return `
        <div class="hdv-receipt">
          <div class="hdv-receipt-row" style="--d:0"><span>جمع محصولات</span><span>۱٬۲۵۰٬۰۰۰ تومان</span></div>
          <div class="hdv-receipt-row hdv-receipt-row--shipping" style="--d:1"><span><i class="fa-solid fa-truck-fast"></i> هزینه ارسال</span><span>۱۵۰٬۰۰۰ تومان</span></div>
          <div class="hdv-receipt-row hdv-receipt-row--total" style="--d:2"><span>جمع کل قابل پرداخت</span><span>۱٬۴۰۰٬۰۰۰ تومان</span></div>
        </div>
      `;
    case 'tracking':
      return `
        <div class="hdv-track">
          ${['ثبت سفارش', 'در حال آماده‌سازی', 'ارسال شد', 'تحویل داده شد'].map((label, i) => `
            <div class="hdv-track-step" style="--d:${i}">
              <span class="hdv-track-dot"><i class="fa-solid fa-check"></i></span>
              <span class="hdv-track-label">${label}</span>
            </div>
          `).join('')}
        </div>
      `;
    default:
      return '';
  }
}

function initHeroDemo() {
  const stage = document.getElementById('hero-demo-stage');
  const panelsEl = document.getElementById('hero-demo-panels');
  const progressEl = document.getElementById('hero-demo-progress');
  if (!stage || !panelsEl || !progressEl) return;

  panelsEl.innerHTML = HERO_DEMO_STEPS.map((step, i) => `
    <div class="hero-demo-panel ${i === 0 ? 'is-active' : ''}" data-index="${i}" role="group" aria-roledescription="مرحله" aria-label="${step.title}">
      <div class="hero-demo-panel-info">
        <div class="hero-demo-panel-icon"><i class="fa-solid ${step.icon}"></i></div>
        <h3>${step.title}</h3>
        <p>${step.desc}</p>
      </div>
      <div class="hero-demo-visual" data-visual="${step.visual}">${heroDemoVisualHTML(step.visual)}</div>
    </div>
  `).join('');

  progressEl.innerHTML = HERO_DEMO_STEPS.map((step, i) => `
    <button type="button" class="hero-demo-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="مرحله ${i + 1}: ${step.title}"></button>
  `).join('');

  progressEl.querySelectorAll('.hero-demo-dot').forEach(dot => {
    dot.addEventListener('click', () => goToHeroDemoStep(Number(dot.dataset.index)));
  });

  stage.addEventListener('mouseenter', stopHeroDemoAutoplay);
  stage.addEventListener('mouseleave', startHeroDemoAutoplay);
  stage.addEventListener('focusin', stopHeroDemoAutoplay);
  stage.addEventListener('focusout', startHeroDemoAutoplay);

  startHeroDemoAutoplay();
}

function goToHeroDemoStep(index) {
  heroDemoIndex = (index + HERO_DEMO_STEPS.length) % HERO_DEMO_STEPS.length;
  document.querySelectorAll('.hero-demo-panel').forEach((panel, i) => {
    panel.classList.toggle('is-active', i === heroDemoIndex);
  });
  document.querySelectorAll('.hero-demo-dot').forEach((dot, i) => dot.classList.toggle('active', i === heroDemoIndex));
  const liveEl = document.getElementById('hero-demo-live');
  if (liveEl) liveEl.textContent = `مرحله ${heroDemoIndex + 1} از ${HERO_DEMO_STEPS.length}: ${HERO_DEMO_STEPS[heroDemoIndex].title}`;
  startHeroDemoAutoplay();
}

function startHeroDemoAutoplay() {
  stopHeroDemoAutoplay();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroDemoTimer = setInterval(() => goToHeroDemoStep(heroDemoIndex + 1), HERO_DEMO_AUTOPLAY_MS);
}
function stopHeroDemoAutoplay() {
  clearInterval(heroDemoTimer);
}

/* ---------- 4. رندر دسته‌بندی‌ها ---------- */

/* دسته‌های اصلی (بدون parent) به همراه لیست زیرمجموعه‌های هرکدوم */
function getMainCategories() {
  const ids = new Set(CATEGORIES.map(c => c.id));
  // دسته‌ای که parent نداره، یا parentش به یک دسته‌ی موجود اشاره نمی‌کنه (داده‌ی
  // ناقص/یتیم)، به‌عنوان دسته‌ی اصلی نمایش داده می‌شه تا هیچ دسته‌ای از سایدبار غیب نشه.
  return CATEGORIES.filter(c => !c.parent || !ids.has(c.parent));
}
function getCategoryChildren(parentId) {
  const ids = new Set(CATEGORIES.map(c => c.id));
  return CATEGORIES.filter(c => c.parent === parentId && ids.has(c.parent));
}

function selectCategoryFilter(catId) {
  const children = getCategoryChildren(catId);
  productFilters.categories = children.length ? [catId, ...children.map(c => c.id)] : [catId];
  saveProductFilters();
  paginationState.products.page = 1;
  renderFilterSidebar();
  renderProducts();
  updateCategoryGridActiveState();
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

/* دسته‌ی مصنوعی «همه محصولات» فیلتر رو کامل خالی می‌کنه (نه انتخاب یک دسته‌ی خاص)
   تا کاربر با یک تپ برگرده به دیدن کل کاتالوگ، بدون نیاز به دکمه‌ی جدا. */
function selectAllProductsFilter() {
  productFilters = { categories: [], inStockOnly: false, colors: [], badges: [] };
  saveProductFilters();
  paginationState.products.page = 1;
  renderFilterSidebar();
  renderProducts();
  updateCategoryGridActiveState();
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

/* روی کارت دسته‌بندیِ در حال انتخاب (طبق فیلتر فعلی محصولات) یک حاشیه‌ی برجسته
   می‌ذاره تا همیشه مشخص باشه الان کدوم دسته فعاله — جابه‌جایی بین دسته‌ها رو با
   بازخورد بصری فوری راحت‌تر می‌کنه. */
function updateCategoryGridActiveState() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  const isAllActive = !productFilters.categories.length;
  grid.querySelectorAll('.category-card').forEach(card => {
    const isThisActive = card.dataset.category === 'all' ? isAllActive : productFilters.categories.includes(card.dataset.category);
    card.classList.toggle('is-active', isThisActive);
  });
}

function renderCategories() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;
  const mainCategories = getMainCategories();

  const allCardHTML = `
    <div class="category-card category-card--all" data-category="all" role="button" tabindex="0">
      <div class="category-overlay category-overlay--all"><h3>همه محصولات</h3></div>
    </div>
  `;
  const categoryCardsHTML = mainCategories.map(cat => `
    <div class="category-card" data-category="${cat.id}" role="button" tabindex="0">
      <img src="${assetUrl(cat.image)}" alt="${cat.name}" loading="lazy" onload="this.parentElement.classList.add('is-loaded');" onerror="this.style.display='none'; this.parentElement.classList.add('is-placeholder');">
      <div class="img-spinner"></div>
      <div class="img-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-4 2-4-2-5 3v2l3-1.5V21h12V7.5L21 9V7l-5-3z"></path></svg>
      </div>
      <div class="category-overlay"><h3>${cat.name}</h3></div>
    </div>
  `).join('');
  grid.innerHTML = allCardHTML + categoryCardsHTML;
  markCachedImagesLoaded(grid);
  applyScrollReveal(grid, '.category-card');
  updateCategoryGridActiveState();

  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.category === 'all') selectAllProductsFilter();
      else selectCategoryFilter(card.dataset.category);
    });
  });
}

/* ---------- 4b. دراپ‌داون دسته‌بندی‌ها در هدر (هاور دسکتاپ / آکاردئون موبایل) ---------- */
function isIndexPage() {
  return location.pathname === '/' || location.pathname === '' || /\/index\.html$/.test(location.pathname);
}

function renderHeaderCategoryMenu() {
  const dropdown = document.getElementById('nav-category-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = `
    <ul class="nav-dropdown-list">
      ${getMainCategories().map(cat => {
        const children = getCategoryChildren(cat.id);
        if (!children.length) {
          return `
            <li class="nav-dropdown-item">
              <a href="/category/${cat.id}" class="nav-dropdown-link" data-id="${cat.id}">
                <span class="nav-dropdown-link-label">${cat.name}</span>
              </a>
            </li>
          `;
        }
        return `
          <li class="nav-dropdown-item has-children" data-id="${cat.id}">
            <div class="nav-dropdown-link nav-dropdown-link--parent">
              <a href="/category/${cat.id}" class="nav-dropdown-link-label" data-id="${cat.id}">${cat.name}</a>
              <button type="button" class="nav-dropdown-sub-toggle" aria-label="نمایش زیرمجموعه‌های ${cat.name}">
                <i class="fa-solid fa-chevron-left nav-dropdown-sub-caret"></i>
              </button>
            </div>
            <ul class="nav-dropdown-sublist">
              ${children.map(child => `
                <li><a href="/category/${child.id}" class="nav-dropdown-sublink" data-id="${child.id}">${child.name}</a></li>
              `).join('')}
            </ul>
          </li>
        `;
      }).join('')}
    </ul>
  `;

  // کلیک روی هر دسته‌بندی/زیرمجموعه در دراپ‌داون هدر همیشه فوراً به صفحه‌ی اختصاصی
  // همون دسته‌بندی هدایت می‌شه (لینک واقعی /category/:id، قابل کپی/باز شدن در تب جدید)
  // — دیگه به‌جای اسکرول توی همون صفحه‌ی اصلی، ناوبری واقعی انجام می‌شه.
  dropdown.querySelectorAll('a[data-id]').forEach(link => {
    link.addEventListener('click', () => {
      closeHeaderCategoryDropdown();
      closeMobileMenu();
    });
  });

  dropdown.querySelectorAll('.nav-dropdown-sub-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.closest('.nav-dropdown-item').classList.toggle('is-expanded');
    });
  });
}

function closeHeaderCategoryDropdown() {
  const dropdown = document.getElementById('nav-category-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  document.querySelectorAll('.nav-dropdown-item.is-expanded').forEach(item => item.classList.remove('is-expanded'));
}

function initHeaderCategoryMenu() {
  const toggle = document.getElementById('nav-categories-toggle');
  const dropdown = document.getElementById('nav-category-dropdown');
  if (!toggle || !dropdown) return;

  /* فقط با کلیک باز/بسته می‌شه (نه هاور موس)، و تا کلیک بعدی (روی خودش یا بیرون از منو)
     باز می‌مونه — دیگه با رد شدن موس به‌طور تصادفی باز/بسته نمی‌شه. */
  toggle.addEventListener('click', e => {
    e.preventDefault();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!toggle.closest('.nav-item').contains(e.target)) closeHeaderCategoryDropdown();
  });
}

/* اگر با لینک دسته‌بندی از یک صفحه‌ی دیگه وارد صفحه‌ی اصلی شدیم (?cat=id)، فیلتر رو اعمال کن */
function applyCategoryFromQuery() {
  if (!isIndexPage()) return;
  const catId = new URLSearchParams(location.search).get('cat');
  if (!catId || !CATEGORIES.some(c => c.id === catId)) return;
  const children = getCategoryChildren(catId);
  productFilters.categories = children.length ? [catId, ...children.map(c => c.id)] : [catId];
  saveProductFilters();
  paginationState.products.page = 1;
  renderFilterSidebar();
  renderProducts();
  updateCategoryGridActiveState();
  history.replaceState(null, '', location.pathname + location.hash);
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
}

function renderBadges(p) {
  const pills = [];
  const hasDiscount = p.oldPrice && p.oldPrice > p.price;
  if (hasDiscount) {
    const percent = Math.round((1 - p.price / p.oldPrice) * 100);
    pills.push(`<span class="badge-pill badge-discount">${percent}٪ تخفیف</span>`);
  }
  if (p.badge && !(hasDiscount && p.badge === 'تخفیف')) pills.push(`<span class="badge-pill badge-promo">${p.badge}</span>`);
  if (p.bestseller) pills.push(`<span class="badge-pill badge-bestseller">پرطرفدار</span>`);
  return pills.length ? `<div class="product-badges">${pills.join('')}</div>` : '';
}

function renderImageColorSwatches(p) {
  if (!p.colors || !p.colors.length) return '';
  return `<div class="media-color-swatches">${p.colors.map(c => `<span class="media-color-swatch" style="background:${c.hex}" title="${c.name}"></span>`).join('')}</div>`;
}

function renderStockStatus(p) {
  return `<span class="stock-status ${p.inStock ? 'in-stock' : 'out-of-stock'}"><span class="stock-dot"></span>${p.inStock ? 'موجود' : 'ناموجود'}</span>`;
}

function renderCategoryIcon(p) {
  const icon = FILTER_ICONS[p.category] || 'fa-tag';
  const catName = CATEGORIES.find(c => c.id === p.category)?.name || '';
  return `<span class="product-category-icon" title="${catName}"><i class="fa-solid ${icon}"></i></span>`;
}

/* متریال/جنس یک ویژگی عمومی و اختیاری متنیه؛ اگر ادمین پرش کرده باشه به‌صورت یک بج
   ساده روی صفحه‌ی محصول نمایش داده می‌شه. */
function renderMaterialBadge(p) {
  if (!p.material) return '';
  return `<div class="pd-material-badge"><i class="fa-solid fa-layer-group"></i><span>${p.material}</span></div>`;
}

/* ---------- 5. فیلتر پیشرفته‌ی محصولات (سایدبار: دسته‌بندی/موجودی/رنگ) ---------- */
const FILTER_ICONS = { all: 'fa-layer-group', evening: 'fa-champagne-glasses', casual: 'fa-shirt', accessory: 'fa-gem', pants: 'fa-vest' };
const PRODUCT_FILTERS_KEY = 'product_filters_v1';
/* گروه‌های دسته‌بندی (زیرمجموعه‌دار) که در سایدبار باز/expanded نمایش داده بشن —
   وضعیتش در localStorage نگه داشته می‌شه تا بعد از رفرش هم حفظ بشه */
const EXPANDED_FILTER_GROUPS_KEY = 'filter_expanded_groups_v1';
function loadExpandedFilterGroups() {
  try {
    const arr = JSON.parse(localStorage.getItem(EXPANDED_FILTER_GROUPS_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function saveExpandedFilterGroups() {
  localStorage.setItem(EXPANDED_FILTER_GROUPS_KEY, JSON.stringify([...expandedFilterGroups]));
}
const expandedFilterGroups = loadExpandedFilterGroups();

const BADGE_FILTERS = [
  { id: 'discount', label: 'تخفیف‌ها', icon: 'fa-tags' },
  { id: 'new', label: 'محصولات جدید', icon: 'fa-certificate' },
  { id: 'bestseller', label: 'پرطرفدار', icon: 'fa-fire' },
  { id: 'picky', label: 'پیشنهاد استورفرانت', icon: 'fa-heart' },
];
function productMatchesBadge(p, badgeId) {
  switch (badgeId) {
    case 'discount': return Boolean(p.discountActive || (p.oldPrice && p.oldPrice > p.price));
    case 'new': return Boolean(p.isNewArrival);
    case 'bestseller': return Boolean(p.bestseller);
    case 'picky': return Boolean(p.pickyPick?.enabled);
    default: return false;
  }
}

let productFilterSearch = '';

function loadProductFilters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCT_FILTERS_KEY) || '{}');
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      inStockOnly: Boolean(parsed.inStockOnly),
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return { categories: [], inStockOnly: false, colors: [], badges: [] };
  }
}
function saveProductFilters() {
  localStorage.setItem(PRODUCT_FILTERS_KEY, JSON.stringify(productFilters));
}

function renderFilterSidebar() {
  const catList = document.getElementById('filter-category-list');
  const colorList = document.getElementById('filter-color-list');
  const badgeList = document.getElementById('filter-badge-list');
  const inStockInput = document.getElementById('filter-instock-only');
  if (!catList || !colorList || !inStockInput) return;

  const switchRow = (value, name, extraClass = '') => `
    <label class="filter-switch filter-switch-row ${extraClass}">
      <input type="checkbox" value="${value}" ${productFilters.categories.includes(value) ? 'checked' : ''}>
      <span class="filter-switch-track"></span>
      <span class="filter-switch-label">${name}</span>
    </label>
  `;

  catList.innerHTML = getMainCategories().map(cat => {
    const children = getCategoryChildren(cat.id);
    if (!children.length) return switchRow(cat.id, cat.name);

    const activeChild = children.find(c => productFilters.categories.includes(c.id));
    const isExpanded = expandedFilterGroups.has(cat.id) || Boolean(activeChild);
    return `
      <div class="filter-category-group ${isExpanded ? 'is-expanded' : ''}" data-id="${cat.id}">
        <button type="button" class="filter-category-group-toggle" data-id="${cat.id}">
          <span>${cat.name}${activeChild ? `<span class="filter-group-active-label"> — ${activeChild.name}</span>` : ''}</span>
          <i class="fa-solid fa-chevron-down filter-group-caret"></i>
        </button>
        <div class="filter-category-children">
          ${children.map(child => switchRow(child.id, child.name, 'filter-switch-row-child')).join('')}
        </div>
      </div>
    `;
  }).join('');

  colorList.innerHTML = COLOR_PALETTE.length
    ? COLOR_PALETTE.map(c => `
        <button type="button" class="filter-color-swatch ${productFilters.colors.includes(c.hex) ? 'active' : ''}" data-hex="${c.hex}" title="${c.name}" aria-label="رنگ ${c.name}">
          <span class="filter-color-swatch-dot" style="background:${c.hex};"></span>
          <span class="filter-color-swatch-name">${c.name}</span>
        </button>
      `).join('')
    : '<span class="filter-empty-hint">رنگی برای فیلتر موجود نیست</span>';

  if (badgeList) {
    badgeList.innerHTML = BADGE_FILTERS.map(b => `
      <label class="filter-switch filter-switch-row filter-badge-switch" data-badge="${b.id}">
        <input type="checkbox" ${productFilters.badges.includes(b.id) ? 'checked' : ''}>
        <span class="filter-switch-track"></span>
        <span class="filter-switch-label"><i class="fa-solid ${b.icon}"></i> ${b.label}</span>
      </label>
    `).join('');
    badgeList.querySelectorAll('.filter-badge-switch input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.closest('.filter-badge-switch').dataset.badge;
        productFilters.badges = input.checked
          ? [...productFilters.badges, id]
          : productFilters.badges.filter(b => b !== id);
        saveProductFilters();
        paginationState.products.page = 1;
        renderProducts();
      });
    });
  }

  inStockInput.checked = productFilters.inStockOnly;

  catList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      productFilters.categories = input.checked
        ? [...productFilters.categories, input.value]
        : productFilters.categories.filter(c => c !== input.value);
      saveProductFilters();
      paginationState.products.page = 1;
      renderProducts();
      updateCategoryGridActiveState();
    });
  });

  catList.querySelectorAll('.filter-category-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (expandedFilterGroups.has(id)) expandedFilterGroups.delete(id);
      else expandedFilterGroups.add(id);
      saveExpandedFilterGroups();
      renderFilterSidebar();
    });
  });

  colorList.querySelectorAll('.filter-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.hex;
      productFilters.colors = productFilters.colors.includes(hex)
        ? productFilters.colors.filter(c => c !== hex)
        : [...productFilters.colors, hex];
      btn.classList.toggle('active');
      saveProductFilters();
      paginationState.products.page = 1;
      renderProducts();
    });
  });
}

function openFilterSidebar() {
  document.getElementById('filter-sidebar').classList.add('open');
  document.getElementById('filter-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeFilterSidebar() {
  document.getElementById('filter-sidebar').classList.remove('open');
  document.getElementById('filter-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* کارت محصول به‌عنوان یک بلوک reusable — همه‌ی گریدهای محصول (کاتالوگ اصلی،
   محصولات جدید، پرطرفدارها، تخفیف‌ها) از همین یک تابع رندر می‌شن. */
function productCardHTML(p, extraInfoHTML = '', extraClass = '', mediaExtraHTML = '') {
  const catName = CATEGORIES.find(c => c.id === p.category)?.name || '';
  return `
    <article class="product-card ${p.inStock ? '' : 'is-out-of-stock'} ${extraClass}" data-code="${p.code}">
      <a class="product-media-link" href="${productUrl(p)}">
        <div class="product-media">
          ${mediaExtraHTML}
          <img src="${assetUrl(p.images?.[0])}" alt="${p.name}" loading="lazy" onload="this.parentElement.classList.add('is-loaded');" onerror="this.style.display='none'; this.parentElement.classList.add('is-placeholder');">
          <div class="img-spinner"></div>
          <div class="img-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-4 2-4-2-5 3v2l3-1.5V21h12V7.5L21 9V7l-5-3z"></path></svg>
            <span>تصویر محصول</span>
          </div>
          ${renderImageColorSwatches(p)}
          ${renderCategoryIcon(p)}
          ${!p.inStock ? '<div class="out-of-stock-overlay">ناموجود</div>' : ''}
        </div>
      </a>
      <div class="product-info">
        ${renderBadges(p)}
        <a href="/category/${p.category}" class="product-category">${catName}</a>
        <h3 class="product-name"><a href="${productUrl(p)}">${p.name}</a></h3>
        ${renderStockStatus(p)}
        <div class="product-price ${p.oldPrice ? 'has-discount' : ''}">
          <span class="current-price">${formatPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''}
        </div>
        ${discountUrgencyHTML(p)}
        ${extraInfoHTML}
        ${p.inStock
          ? `<a class="add-to-cart-btn" href="${productUrl(p)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              انتخاب سایز و رنگ
            </a>`
          : `<span class="add-to-cart-btn is-disabled" aria-disabled="true">ناموجود</span>`}
      </div>
    </article>
  `;
}

/* مرتب‌سازی اجباری «جدید به قدیم»: منبع اصلی سرور (createdAt نزولی) هست، این‌جا
   فقط برای اطمینان (مثلاً بعد از فیلتر/جابه‌جایی آرایه) دوباره تضمین می‌شه. */
function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.code) || 0) - (Number(a.code) || 0);
  });
}

/* ---------- 5b2. صفحه‌بندی عمومی برای گریدهای محصول ---------- */
const paginationState = {
  products: { page: 1, pageSize: 12 },
  newArrivals: { page: 1, pageSize: 8 },
  bestsellers: { page: 1, pageSize: 8 },
  deals: { page: 1, pageSize: 8 },
  categoryPage: { page: 1, pageSize: 12 },
};
const PAGE_SIZE_OPTIONS = [8, 12, 24, 48];

function paginateList(key, list) {
  const state = paginationState[key];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;
  const start = (state.page - 1) * state.pageSize;
  return { pageItems: list.slice(start, start + state.pageSize), totalItems, totalPages };
}

function pageNumbersWithGaps(current, total) {
  const keep = new Set([1, total, current, current - 1, current + 1]);
  const nums = [...keep].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

function renderPaginationBar(key, containerId, totalItems, totalPages, rerender) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const state = paginationState[key];

  if (totalItems <= state.pageSize) {
    el.innerHTML = '';
    return;
  }

  const pageBtnsHTML = pageNumbersWithGaps(state.page, totalPages).map(n => n === 'gap'
    ? `<span class="pagination-gap">…</span>`
    : `<button type="button" class="pagination-page-btn ${n === state.page ? 'is-active' : ''}" data-page="${n}">${n}</button>`
  ).join('');

  el.innerHTML = `
    <div class="pagination-rowsize">
      <label for="${containerId}-size">تعداد در هر صفحه</label>
      <input type="text" readonly id="${containerId}-size" class="pagination-rowsize-trigger"
             data-popup="list"
             data-popup-options='${JSON.stringify(PAGE_SIZE_OPTIONS.map(size => ({ value: size, label: String(size) })))}'
             data-selected-value="${state.pageSize}"
             value="${state.pageSize}">
    </div>
    <div class="pagination-controls">
      <button type="button" class="pagination-nav-btn" id="${containerId}-prev" ${state.page <= 1 ? 'disabled' : ''} aria-label="صفحه قبل">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
      <div class="pagination-pages">${pageBtnsHTML}</div>
      <button type="button" class="pagination-nav-btn" id="${containerId}-next" ${state.page >= totalPages ? 'disabled' : ''} aria-label="صفحه بعد">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    </div>
    <form class="pagination-jump" id="${containerId}-jump" novalidate>
      <label for="${containerId}-jump-input">برو به صفحه</label>
      <input type="number" id="${containerId}-jump-input" min="1" max="${totalPages}" placeholder="${state.page}">
      <span class="pagination-total">از ${totalPages}</span>
      <button type="submit" class="pagination-jump-btn">برو</button>
    </form>
  `;

  el.querySelector(`#${containerId}-size`).addEventListener('popup-select', e => {
    state.pageSize = Number(e.detail.value);
    state.page = 1;
    rerender();
  });
  el.querySelectorAll('.pagination-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = Number(btn.dataset.page);
      rerender();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  el.querySelector(`#${containerId}-prev`).addEventListener('click', () => {
    if (state.page > 1) { state.page -= 1; rerender(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  el.querySelector(`#${containerId}-next`).addEventListener('click', () => {
    if (state.page < totalPages) { state.page += 1; rerender(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  el.querySelector(`#${containerId}-jump`).addEventListener('submit', e => {
    e.preventDefault();
    const input = el.querySelector(`#${containerId}-jump-input`);
    const target = Math.min(totalPages, Math.max(1, Number(input.value) || state.page));
    state.page = target;
    input.value = '';
    rerender();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  let list = PRODUCTS;
  const q = productFilterSearch.trim();
  if (q) list = list.filter(p => p.name.includes(q));
  if (productFilters.categories.length) list = list.filter(p => productFilters.categories.includes(p.category));
  if (productFilters.inStockOnly) list = list.filter(p => p.inStock);
  if (productFilters.colors.length) list = list.filter(p => (p.colors || []).some(c => productFilters.colors.includes(c.hex)));
  if (productFilters.badges.length) list = list.filter(p => productFilters.badges.some(b => productMatchesBadge(p, b)));

  list = sortNewestFirst(list);

  if (!list.length) {
    grid.innerHTML = '<p class="no-results">محصولی با این فیلترها یافت نشد.</p>';
    const bar = document.getElementById('products-pagination');
    if (bar) bar.innerHTML = '';
    return;
  }

  const { pageItems, totalItems, totalPages } = paginateList('products', list);
  grid.innerHTML = pageItems.map(p => productCardHTML(p)).join('');
  markCachedImagesLoaded(grid);
  applyScrollReveal(grid, '.product-card');
  renderPaginationBar('products', 'products-pagination', totalItems, totalPages, renderProducts);
}

/* ---------- 5b2. صفحه‌ی اختصاصی دسته‌بندی (/category/:id) — فهرست کامل محصولات همون
   دسته + زیرمجموعه‌هاش با جستجو/فیلتر/صفحه‌بندی مستقل از فیلتر لندینگ (تا با فیلترهای
   ذخیره‌شده‌ی صفحه‌ی اصلی تداخل نکنه). ---------- */
const categoryPageState = { catId: null, search: '', subcategories: [], colors: [], inStockOnly: false };

function renderCategoryPage() {
  const heading = document.getElementById('category-page-heading');
  if (!heading) return;

  const catId = decodeURIComponent(location.pathname.split('/')[2] || '');
  const category = CATEGORIES.find(c => c.id === catId);
  const layout = document.getElementById('category-page-layout');
  const filterBtn = document.getElementById('cp-filter-mobile-open-btn');

  if (!category) {
    heading.innerHTML = `
      <p class="section-eyebrow">دسته‌بندی</p>
      <h2>دسته‌بندی پیدا نشد</h2>
      <p>این دسته‌بندی وجود نداره یا حذف شده. <a href="/#products">بازگشت به محصولات</a></p>
    `;
    layout.style.display = 'none';
    if (filterBtn) filterBtn.style.display = 'none';
    return;
  }

  document.title = `${category.name} | Storefront`;
  categoryPageState.catId = catId;
  layout.style.display = '';
  if (filterBtn) filterBtn.style.display = '';

  heading.innerHTML = `
    <p class="section-eyebrow">دسته‌بندی</p>
    <h2>${category.name}</h2>
    ${category.description ? `<p>${category.description}</p>` : ''}
  `;

  const children = getCategoryChildren(catId);
  const subGroup = document.getElementById('cp-subcategory-group');
  const subList = document.getElementById('cp-subcategory-list');
  if (children.length) {
    subGroup.hidden = false;
    subList.innerHTML = children.map(child => `
      <label class="filter-checkbox-row">
        <input type="checkbox" value="${child.id}" ${categoryPageState.subcategories.includes(child.id) ? 'checked' : ''}>
        ${child.name}
      </label>
    `).join('');
    subList.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        categoryPageState.subcategories = input.checked
          ? [...categoryPageState.subcategories, input.value]
          : categoryPageState.subcategories.filter(id => id !== input.value);
        paginationState.categoryPage.page = 1;
        renderCategoryProducts();
      });
    });
  } else {
    subGroup.hidden = true;
    subList.innerHTML = '';
  }

  const colorList = document.getElementById('cp-filter-color-list');
  colorList.innerHTML = COLOR_PALETTE.length
    ? COLOR_PALETTE.map(c => `
        <button type="button" class="filter-color-swatch ${categoryPageState.colors.includes(c.hex) ? 'active' : ''}" data-hex="${c.hex}" title="${c.name}" aria-label="رنگ ${c.name}">
          <span class="filter-color-swatch-dot" style="background:${c.hex};"></span>
          <span class="filter-color-swatch-name">${c.name}</span>
        </button>
      `).join('')
    : '<span class="filter-empty-hint">رنگی برای فیلتر موجود نیست</span>';
  colorList.querySelectorAll('.filter-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.hex;
      categoryPageState.colors = categoryPageState.colors.includes(hex)
        ? categoryPageState.colors.filter(h => h !== hex)
        : [...categoryPageState.colors, hex];
      btn.classList.toggle('active');
      paginationState.categoryPage.page = 1;
      renderCategoryProducts();
    });
  });

  document.getElementById('cp-filter-instock-only').checked = categoryPageState.inStockOnly;

  renderCategoryProducts();
}

function renderCategoryProducts() {
  const grid = document.getElementById('cp-product-grid');
  if (!grid || !categoryPageState.catId) return;

  const childIds = getCategoryChildren(categoryPageState.catId).map(c => c.id);
  const scopeIds = categoryPageState.subcategories.length
    ? categoryPageState.subcategories
    : [categoryPageState.catId, ...childIds];

  let list = PRODUCTS.filter(p => scopeIds.includes(p.category));
  const q = categoryPageState.search.trim();
  if (q) list = list.filter(p => p.name.includes(q));
  if (categoryPageState.inStockOnly) list = list.filter(p => p.inStock);
  if (categoryPageState.colors.length) list = list.filter(p => (p.colors || []).some(c => categoryPageState.colors.includes(c.hex)));
  list = sortNewestFirst(list);

  const pagBar = document.getElementById('cp-products-pagination');
  if (!list.length) {
    grid.innerHTML = '<p class="no-results">محصولی با این فیلترها یافت نشد.</p>';
    if (pagBar) pagBar.innerHTML = '';
    return;
  }

  const { pageItems, totalItems, totalPages } = paginateList('categoryPage', list);
  grid.innerHTML = pageItems.map(p => productCardHTML(p)).join('');
  markCachedImagesLoaded(grid);
  applyScrollReveal(grid, '.product-card');
  renderPaginationBar('categoryPage', 'cp-products-pagination', totalItems, totalPages, renderCategoryProducts);
}

function initCategoryPage() {
  const searchInput = document.getElementById('cp-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', e => {
    categoryPageState.search = e.target.value;
    paginationState.categoryPage.page = 1;
    renderCategoryProducts();
  });

  document.getElementById('cp-filter-instock-only').addEventListener('change', e => {
    categoryPageState.inStockOnly = e.target.checked;
    paginationState.categoryPage.page = 1;
    renderCategoryProducts();
  });

  document.getElementById('cp-filter-reset-btn').addEventListener('click', () => {
    categoryPageState.search = '';
    categoryPageState.subcategories = [];
    categoryPageState.colors = [];
    categoryPageState.inStockOnly = false;
    searchInput.value = '';
    paginationState.categoryPage.page = 1;
    renderCategoryPage();
  });

  const sidebar = document.getElementById('cp-filter-sidebar');
  const overlay = document.getElementById('cp-filter-overlay');
  const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; };
  document.getElementById('cp-filter-mobile-open-btn').addEventListener('click', openSidebar);
  document.getElementById('cp-filter-mobile-close-btn').addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
}

/* ---------- 5c. سکشن‌های داینامیک لندینگ (mock، بدون بک‌اند) ---------- */

/* محصولات جدید: بج «جدید» */
function renderNewArrivals() {
  const track = document.getElementById('new-arrivals-track');
  if (!track) return;
  const list = sortNewestFirst(PRODUCTS.filter(p => p.isNewArrival));
  const { pageItems, totalItems, totalPages } = paginateList('newArrivals', list);
  track.innerHTML = pageItems.map(p => productCardHTML(p)).join('');
  markCachedImagesLoaded(track);
  renderPaginationBar('newArrivals', 'new-arrivals-pagination', totalItems, totalPages, renderNewArrivals);
}

/* پرطرفدارها: + نشان اعتماد اجتماعی (امتیاز mock بر پایه‌ی id) + ریبون رتبه برای ۳ تای اول */
function renderBestsellers() {
  const grid = document.getElementById('bestsellers-grid');
  if (!grid) return;
  const list = sortNewestFirst(PRODUCTS.filter(p => p.bestseller));
  const { pageItems, totalItems, totalPages } = paginateList('bestsellers', list);
  const pageStart = (paginationState.bestsellers.page - 1) * paginationState.bestsellers.pageSize;
  grid.innerHTML = pageItems.map((p, i) => {
    const rating = 4 + (Number(p.code) % 10) / 10; // مقدار mock بین 4.0 تا 4.9
    const fullStars = Math.round(rating);
    const stars = Array.from({ length: 5 }, (_, i2) => `<i class="fa-solid fa-star ${i2 < fullStars ? '' : 'is-empty'}"></i>`).join('');
    const trust = `<div class="trust-badge"><i class="fa-solid fa-fire"></i><span class="stars">${stars}</span> ${rating.toFixed(1)} امتیاز از خریداران</div>`;
    const globalRank = pageStart + i;
    const isTopRank = globalRank < 3;
    const rankBadge = isTopRank ? `<div class="bestseller-rank-badge">${['۱', '۲', '۳'][globalRank]}</div>` : '';
    return productCardHTML(p, trust, isTopRank ? 'bestseller-top' : '', rankBadge);
  }).join('');
  markCachedImagesLoaded(grid);
  applyScrollReveal(grid, '.product-card');
  renderPaginationBar('bestsellers', 'bestsellers-pagination', totalItems, totalPages, renderBestsellers);
}

/* تخفیف‌های امروز/هفته: + نوار «درصد از موجودی فروخته‌شده» (واقعی، از stockQty/stockSold سمت سرور) */
function stockProgressHTML(p) {
  if (p.stockPercentSold == null) return '';
  return `
    <div class="stock-progress">
      <div class="stock-progress-bar"><span style="width:${p.stockPercentSold}%"></span></div>
      <span class="stock-progress-label">${p.stockPercentSold}٪ از موجودی فروخته شده</span>
    </div>`;
}
function renderDeals() {
  const grid = document.getElementById('deals-grid');
  if (!grid) return;
  const list = sortNewestFirst(PRODUCTS.filter(p => p.oldPrice));
  const { pageItems, totalItems, totalPages } = paginateList('deals', list);
  grid.innerHTML = pageItems.map(p => productCardHTML(p, stockProgressHTML(p))).join('');
  markCachedImagesLoaded(grid);
  applyScrollReveal(grid, '.product-card');
  renderPaginationBar('deals', 'deals-pagination', totalItems, totalPages, renderDeals);
}

/* شمارش‌معکوس تخفیف‌ها تا پایان امروز (mock، صرفاً حس فوریت) */
function startDealsCountdown() {
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  if (!hoursEl || !minutesEl || !secondsEl) return;

  function tick() {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const diff = Math.max(0, endOfDay - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    hoursEl.textContent = String(h).padStart(2, '0');
    minutesEl.textContent = String(m).padStart(2, '0');
    secondsEl.textContent = String(s).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

/* ---------- شمارش‌معکوس واقعی تخفیفِ زمان‌دار (کارت محصول در لندینگ/دسته‌بندی و صفحه‌ی خود محصول) ----------
   واحدها آبشاری‌ان: از بالاترین واحد غیرصفر (ماه) تا ثانیه نمایش داده می‌شن؛ اگر ماه صفر باشه از
   روز شروع می‌شه، اگر روز هم صفر باشه از ساعت، و به همین ترتیب — طبق نیازِ محصول. یک تایمر مشترک
   (نه یکی به‌ازای هر کارت) همه‌ی نمونه‌های [data-discount-deadline] رو هر ثانیه آپدیت می‌کنه، چون
   با صفحه‌بندی/رندر مجدد گریدها المان‌ها عوض می‌شن. */
const COUNTDOWN_UNIT_LABELS = [['months', 'ماه'], ['days', 'روز'], ['hours', 'ساعت'], ['minutes', 'دقیقه'], ['seconds', 'ثانیه']];

function countdownPartsFromMs(diffMs) {
  if (diffMs <= 0) return null;
  let totalSeconds = Math.floor(diffMs / 1000);
  const months = Math.floor(totalSeconds / (30 * 86400)); totalSeconds -= months * 30 * 86400;
  const days = Math.floor(totalSeconds / 86400); totalSeconds -= days * 86400;
  const hours = Math.floor(totalSeconds / 3600); totalSeconds -= hours * 3600;
  const minutes = Math.floor(totalSeconds / 60); totalSeconds -= minutes * 60;
  return { months, days, hours, minutes, seconds: totalSeconds };
}

function countdownUnitsHTML(parts) {
  let startIdx = COUNTDOWN_UNIT_LABELS.findIndex(([key]) => parts[key] > 0);
  if (startIdx === -1) startIdx = COUNTDOWN_UNIT_LABELS.length - 1;
  return COUNTDOWN_UNIT_LABELS.slice(startIdx).map(([key, label], i) => `
    ${i > 0 ? '<span class="countdown-sep">:</span>' : ''}
    <span class="countdown-unit"><strong>${String(parts[key]).padStart(2, '0')}</strong><small>${label}</small></span>
  `).join('');
}

function discountCountdownHTML(deadlineIso, extraClass = '') {
  const parts = countdownPartsFromMs(new Date(deadlineIso).getTime() - Date.now());
  if (!parts) return '';
  return `
    <div class="discount-countdown ${extraClass}" data-discount-deadline="${deadlineIso}">
      <span class="countdown-label"><i class="fa-solid fa-bolt"></i> پایان تخفیف تا</span>
      <div class="countdown-timer">${countdownUnitsHTML(parts)}</div>
    </div>`;
}

function tickAllDiscountCountdowns() {
  document.querySelectorAll('[data-discount-deadline]').forEach(el => {
    const parts = countdownPartsFromMs(new Date(el.dataset.discountDeadline).getTime() - Date.now());
    if (!parts) { el.style.display = 'none'; return; }
    el.querySelector('.countdown-timer').innerHTML = countdownUnitsHTML(parts);
  });
}
setInterval(tickAllDiscountCountdowns, 1000);

/* تخفیفِ مبتنی‌بر موجودی: به‌جای شمارش‌معکوس زمانی، تعداد باقیمانده از سهمیه رو با جذابیت
   بصری بیشتر (پالس/رنگ فوریت) نشون می‌ده — طبق نیاز محصول، این حالت باید بیشتر تو چشم باشه. */
function stockDiscountUrgencyHTML(p) {
  if (p.discountStockRemaining == null) return '';
  return `
    <div class="stock-discount-urgent">
      <i class="fa-solid fa-fire"></i>
      فقط <strong>${p.discountStockRemaining.toLocaleString('fa-IR')}</strong> عدد با این تخفیف باقی مونده!
    </div>`;
}

/* دیسپچر واحد: بسته به مبنای تخفیفِ فعال محصول، شمارش‌معکوس (زمانی) یا نوار فوریت موجودی رو
   برمی‌گردونه؛ هم روی کارت محصول (لندینگ/دسته‌بندی) و هم صفحه‌ی خود محصول استفاده می‌شه. */
function discountUrgencyHTML(p) {
  if (!p.discountActive) return '';
  if (p.discountBasis === 'stock') return stockDiscountUrgencyHTML(p);
  if (p.discountEndsAt) return discountCountdownHTML(p.discountEndsAt);
  return '';
}

/* پیشنهاد استورفرانت به افراد سخت‌پسند: از پنل ادمین روی هر محصول قابل تنظیمه (pickyPick.enabled/quote) */
function renderPickyPicks() {
  const list = document.getElementById('picky-picks-list');
  if (!list) return;
  const picks = PRODUCTS.filter(p => p.pickyPick?.enabled);

  if (!picks.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = picks.map(p => `
      <article class="picky-pick-card glass">
        <a class="picky-pick-media" href="${productUrl(p)}">
          <img src="${assetUrl(p.images?.[0])}" alt="${p.name}" loading="lazy">
        </a>
        <div class="picky-pick-body">
          <h3 class="picky-pick-name">${p.name}</h3>
          <p class="picky-pick-quote">«${p.pickyPick.quote}»</p>
          <div class="picky-pick-price">${formatPrice(p.price)}</div>
        </div>
      </article>
  `).join('');
}

/* ---------- 5b. رندر صفحه‌ی جزئیات محصول (انتخاب رنگ/سایز) ---------- */
function renderProductDetail() {
  const root = document.getElementById('product-detail');
  if (!root) return;

  // آدرس تمیز: /دسته‌بندی/کد-محصول (مثلاً /pants/469071)
  const [, category, code] = location.pathname.split('/');
  const product = PRODUCTS.find(p => p.category === category && p.code === code);

  if (!product) {
    root.innerHTML = `
      <div class="container product-not-found">
        <p>محصول مورد نظر پیدا نشد.</p>
        <a href="/#products" class="btn btn-primary"><i class="fa-solid fa-arrow-right"></i> بازگشت به محصولات</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} | Storefront`;
  const catName = CATEGORIES.find(c => c.id === product.category)?.name || '';

  let selectedColor = product.colors[0].id;
  let selectedSize = product.sizes ? product.sizes[0] : null;
  let qty = 1;

  root.innerHTML = `
    <div class="container">
      <a href="/#products" class="back-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
        بازگشت به محصولات
      </a>
      <div class="product-detail-grid">
        <div class="product-detail-media-wrap">
          <div class="product-detail-media">
            <div class="pd-gallery" id="pd-gallery">
              <div class="pd-gallery-track" id="pd-gallery-track">
                ${(product.images?.length ? product.images : ['']).map((src, i) => `
                  <div class="pd-gallery-slide">
                    <img src="${assetUrl(src)}" alt="${product.name}" loading="${i === 0 ? 'eager' : 'lazy'}"
                      onload="this.closest('.product-detail-media').classList.add('is-loaded');"
                      onerror="this.style.display='none'; if (this.closest('.pd-gallery-slide') === this.closest('.pd-gallery-track').firstElementChild) this.closest('.product-detail-media').classList.add('is-placeholder');">
                  </div>
                `).join('')}
              </div>
              ${product.images?.length > 1 ? `
              <button type="button" class="pd-gallery-arrow prev" id="pd-gallery-prev" aria-label="تصویر قبلی">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
              </button>
              <button type="button" class="pd-gallery-arrow next" id="pd-gallery-next" aria-label="تصویر بعدی">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
              </button>` : ''}
            </div>
            <div class="img-spinner"></div>
            <div class="img-placeholder">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-4 2-4-2-5 3v2l3-1.5V21h12V7.5L21 9V7l-5-3z"></path></svg>
              <span>تصویر محصول</span>
            </div>
            ${renderImageColorSwatches(product)}
            ${renderCategoryIcon(product)}
            ${!product.inStock ? '<div class="out-of-stock-overlay">ناموجود</div>' : ''}
          </div>
          ${product.images?.length > 1 ? `
          <div class="pd-gallery-thumbs" id="pd-gallery-thumbs">
            ${product.images.map((src, i) => `
              <button type="button" class="pd-gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="نمایش تصویر ${i + 1}">
                <img src="${assetUrl(src)}" alt="" loading="lazy">
              </button>
            `).join('')}
          </div>` : ''}
        </div>
        <div class="product-detail-info">
          ${renderBadges(product)}
          <a href="/category/${product.category}" class="product-category">${catName}</a>
          <h1 class="pd-name">${product.name}</h1>
          ${renderStockStatus(product)}
          ${stockProgressHTML(product)}
          <div class="pd-price ${product.oldPrice ? 'has-discount' : ''}">
            <span class="current-price">${formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>
          ${discountUrgencyHTML(product)}

          <div class="pd-attributes-grid">
            <div class="pd-attribute-block pd-option-group">
              <span class="pd-option-label">رنگ‌بندی</span>
              <div class="color-swatches" id="pd-colors">
                ${product.colors.map((c, i) => `
                  <button type="button" class="color-swatch ${i === 0 ? 'active' : ''}" data-color="${c.id}" title="${c.name}">
                    <span class="color-swatch-dot" style="background:${c.hex}"></span>
                    <span>${c.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            ${product.sizes ? `
            <div class="pd-attribute-block pd-option-group">
              <span class="pd-option-label">
                سایزبندی
                ${CURRENT_USER ? '<button type="button" class="pd-saved-size-btn" id="pd-saved-size-btn">سایز ذخیره‌شده</button>' : ''}
              </span>
              <div class="size-options" id="pd-sizes">
                ${product.sizes.map((s, i) => `<button type="button" class="size-option ${i === 0 ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
              </div>
              <div class="pd-saved-size-panel" id="pd-saved-size-panel" hidden></div>
              <button type="button" class="pd-size-help-link" id="pd-size-help-btn">چارت سایز</button>
            </div>` : ''}
          </div>

          ${product.description || product.material ? `
          <div class="pd-description-box">
            ${renderMaterialBadge(product)}
            ${product.description ? `
            <div class="pd-description-heading"><i class="fa-solid fa-align-right"></i> توضیحات محصول</div>
            ${renderProductDescriptionHTML(product.description)}
            ` : ''}
          </div>` : ''}

          <div class="pd-option-group">
            <span class="pd-option-label">تعداد</span>
            <div class="qty-stepper">
              <button type="button" class="qty-btn" id="pd-qty-dec">−</button>
              <span class="qty-value" id="pd-qty-value">1</span>
              <button type="button" class="qty-btn" id="pd-qty-inc">+</button>
            </div>
          </div>

          <button class="btn btn-primary btn-block pd-add-btn" id="pd-add-btn" ${product.inStock ? '' : 'disabled'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            ${product.inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
          </button>
        </div>
      </div>
    </div>
  `;
  markCachedImagesLoaded(root);
  initProductGallery(product);

  /* موجودی بر اساس ترکیب دقیق رنگ+سایز انتخاب‌شده (اگر محصول موجودی‌اش رو به این تفکیک ثبت کرده باشه) */
  const addBtn = document.getElementById('pd-add-btn');
  function updateVariantAvailability() {
    if (!product.variants || !product.variants.length) return;
    const remaining = getAvailableStock(product, selectedColor, selectedSize);
    addBtn.disabled = remaining <= 0;
    addBtn.innerHTML = remaining > 0
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> افزودن به سبد خرید`
      : 'این ترکیب رنگ/سایز ناموجود است';
    // اگه با تعویض رنگ/سایز موجودیِ ترکیب جدید از تعداد انتخاب‌شده کمتر شد، تعداد رو هم‌زمان محدود کن
    if (remaining > 0 && qty > remaining) {
      qty = remaining;
      const qtyValueEl = document.getElementById('pd-qty-value');
      if (qtyValueEl) qtyValueEl.textContent = qty;
    }
  }

  root.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
      updateVariantAvailability();
    });
  });

  root.querySelectorAll('.size-option').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
      updateVariantAvailability();
    });
  });
  updateVariantAvailability();

  const sizeHelpBtn = document.getElementById('pd-size-help-btn');
  const sizeChartOverlay = document.getElementById('size-chart-overlay');
  if (sizeHelpBtn && sizeChartOverlay) {
    sizeHelpBtn.addEventListener('click', () => sizeChartOverlay.classList.add('active'));
    document.getElementById('size-chart-close-btn').addEventListener('click', () => sizeChartOverlay.classList.remove('active'));
    sizeChartOverlay.addEventListener('click', e => {
      if (e.target === sizeChartOverlay) sizeChartOverlay.classList.remove('active');
    });
  }

  const savedSizeBtn = document.getElementById('pd-saved-size-btn');
  if (savedSizeBtn) {
    savedSizeBtn.addEventListener('click', async () => {
      const panel = document.getElementById('pd-saved-size-panel');
      if (!panel.hidden) { panel.hidden = true; return; }
      const res = await fetch('/api/me/sizes');
      const profiles = res.ok ? await res.json() : [];
      if (!profiles.length) {
        panel.innerHTML = '<p class="pd-saved-size-empty">هنوز سایزی ذخیره نکردی. از صفحه‌ی «سایزهای تنظیم‌شده» یکی بساز.</p>';
      } else {
        panel.innerHTML = profiles.map(p => `<button type="button" class="pd-saved-size-option" data-size="${p.suggestedSize}">${p.label} — سایز ${p.suggestedSize}</button>`).join('');
        panel.querySelectorAll('.pd-saved-size-option').forEach(opt => {
          opt.addEventListener('click', () => {
            const sizeBtn = root.querySelector(`.size-option[data-size="${opt.dataset.size}"]`);
            if (sizeBtn) {
              root.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
              sizeBtn.classList.add('active');
              selectedSize = sizeBtn.dataset.size;
              showToast(`سایز ${opt.dataset.size} انتخاب شد`);
            } else {
              showToast('این محصول سایز پیشنهادی رو نداره');
            }
            panel.hidden = true;
          });
        });
      }
      panel.hidden = false;
    });
  }

  const qtyValueEl = document.getElementById('pd-qty-value');
  document.getElementById('pd-qty-dec').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyValueEl.textContent = qty;
  });
  document.getElementById('pd-qty-inc').addEventListener('click', () => {
    const remaining = getAvailableStock(product, selectedColor, selectedSize);
    if (remaining != null && qty >= remaining) { showToast(`فقط ${remaining.toLocaleString('fa-IR')} عدد از این ترکیب رنگ/سایز موجوده`); return; }
    qty += 1;
    qtyValueEl.textContent = qty;
  });

  if (product.inStock) {
    document.getElementById('pd-add-btn').addEventListener('click', () => {
      addToCart(product.code, selectedColor, selectedSize, qty);
      showToast('به سبد خرید اضافه شد');
      openCart();
    });
  }
}

/* اسلایدر گالری تصاویر محصول (تا ۱۰ تصویر) — پیکان قبلی/بعدی + ردیف تامبنیل + سوایپ لمسی */
let pdGalleryIndex = 0;
function initProductGallery(product) {
  pdGalleryIndex = 0;
  const track = document.getElementById('pd-gallery-track');
  const thumbsEl = document.getElementById('pd-gallery-thumbs');
  const prevBtn = document.getElementById('pd-gallery-prev');
  const nextBtn = document.getElementById('pd-gallery-next');
  if (!track) return;
  const count = product.images?.length || 1;

  function setTrackPosition(dragOffsetPx = 0) {
    const dragOffsetPercent = (dragOffsetPx / (track.clientWidth || 1)) * 100;
    track.style.transform = `translateX(${-pdGalleryIndex * 100 + dragOffsetPercent}%)`;
  }

  function goToSlide(index) {
    // عمداً کلمپ می‌شه نه mod: wrap دور-تا-دور باعث می‌شد رفتن از آخرین به اولین تصویر یک
    // پرش/سُر خوردن دیده‌ی نامتعارف از بین همه‌ی عکس‌های میانی داشته باشه (transform با
    // transition روی فاصله‌ی کامل حرکت می‌کنه، نه یک جهش تمیز).
    pdGalleryIndex = Math.min(count - 1, Math.max(0, index));
    setTrackPosition();
    if (prevBtn) prevBtn.classList.toggle('is-disabled', pdGalleryIndex === 0);
    if (nextBtn) nextBtn.classList.toggle('is-disabled', pdGalleryIndex === count - 1);
    if (thumbsEl) {
      thumbsEl.querySelectorAll('.pd-gallery-thumb').forEach((thumb, i) => thumb.classList.toggle('active', i === pdGalleryIndex));
      const activeThumb = thumbsEl.querySelector('.pd-gallery-thumb.active');
      if (activeThumb) activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(pdGalleryIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(pdGalleryIndex + 1));
  goToSlide(0);
  if (thumbsEl) {
    thumbsEl.querySelectorAll('.pd-gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => goToSlide(Number(thumb.dataset.index)));
    });
  }

  let dragDeltaPx = 0;
  track.querySelectorAll('.pd-gallery-slide').forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (Math.abs(dragDeltaPx) > 5) return; // بعد از سوایپ لمسی، کلیک تصادفی مودال رو باز نکنه
      openProductGalleryModal(product, i);
    });
  });

  if (count <= 1) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let dragging = false;
  let dragAxis = null; // 'x' | 'y' | null تا جهت لمس مشخص بشه
  let activeTouchId = null; // شناسه‌ی همون انگشتی که ژست رو شروع کرده

  // اگه به هر دلیلی touchend/touchcancel روی خودِ track نرسه (مثلاً چون در میانه‌ی
  // اسکرول صفحه، انگشت روی عنصر دیگه‌ای «قفل» بمونه)، وضعیت drag برای ژست بعدی
  // stuck می‌مونه و همون چیزیه که باعث می‌شه بعد از یک اسکرول عمودی، سوایپ چپ/راست
  // دیگه جواب نده. برای همین یک safety-net سطح document هم اضافه شده تا مستقل از
  // اینکه touchend دقیقاً کجا landing کنه، وضعیت همیشه reset بشه.
  function forceEndDrag() {
    if (!dragging) return;
    dragging = false;
    dragAxis = null;
    activeTouchId = null;
    track.classList.remove('dragging');
    setTrackPosition();
    dragDeltaPx = 0;
  }
  document.addEventListener('touchend', forceEndDrag, { passive: true });
  document.addEventListener('touchcancel', forceEndDrag, { passive: true });

  track.addEventListener('touchstart', e => {
    const touch = e.changedTouches[0];
    activeTouchId = touch.identifier;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    dragDeltaPx = 0;
    dragging = true;
    dragAxis = null;
    track.classList.add('dragging');
  }, { passive: true });

  track.addEventListener('touchmove', e => {
    if (!dragging) return;
    const touch = [...e.touches].find(t => t.identifier === activeTouchId);
    if (!touch) return; // انگشتی که ژست رو شروع کرده دیگه روی صفحه نیست
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (!dragAxis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // هنوز جهت لمس معلوم نیست
      // اریب به سمت افقی: چون سوایپ چپ/راست تعامل اصلی گالریه، فقط وقتی به‌وضوح
      // عمودی‌تره (نه صرفاً کمی بیشتر) به اسکرول صفحه واگذار می‌شه.
      dragAxis = Math.abs(dy) > Math.abs(dx) * 1.15 ? 'y' : 'x';
      if (dragAxis === 'y') { dragging = false; track.classList.remove('dragging'); return; } // اسکرول عمودی صفحه، دست‌نخورده رها می‌شه
    }
    if (dragAxis !== 'x') return;

    // سوایپ افقی قطعی شد؛ preventDefault جلوی اسکرول/جسچر ناوبری مرورگر رو می‌گیره
    // وگرنه حین کشیدن گالری، کل صفحه (هدر/بادی/فوتر) هم همراهش جابه‌جا می‌شه.
    e.preventDefault();
    dragDeltaPx = dx;
    setTrackPosition(dragDeltaPx);
  }, { passive: false });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    dragAxis = null;
    activeTouchId = null;
    track.classList.remove('dragging');
    const width = track.clientWidth || 1;
    if (Math.abs(dragDeltaPx) > width * 0.15) {
      goToSlide(pdGalleryIndex + (dragDeltaPx < 0 ? 1 : -1));
    } else {
      setTrackPosition();
    }
    dragDeltaPx = 0;
  };
  track.addEventListener('touchend', endDrag);
  track.addEventListener('touchcancel', endDrag);
}

/* ---------- مودال بزرگ‌نمایی گالری تصاویر محصول (کلیک روی تصویر) ---------- */
function openProductGalleryModal(product, startIndex = 0) {
  const images = product.images?.length ? product.images : [''];
  let index = startIndex;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay pd-lightbox-overlay';
  overlay.innerHTML = `
    <div class="pd-lightbox" role="dialog" aria-modal="true" aria-label="نمایش بزرگ تصویر محصول">
      <button type="button" class="icon-btn modal-close pd-lightbox-close" aria-label="بستن">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
      </button>
      <div class="pd-lightbox-stage">
        <img src="${assetUrl(images[index])}" alt="${product.name}" class="pd-lightbox-img" id="pd-lightbox-img">
        ${images.length > 1 ? `
        <button type="button" class="pd-gallery-arrow prev pd-lightbox-arrow" id="pd-lightbox-prev" aria-label="تصویر قبلی">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>
        </button>
        <button type="button" class="pd-gallery-arrow next pd-lightbox-arrow" id="pd-lightbox-next" aria-label="تصویر بعدی">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
        </button>` : ''}
      </div>
      ${images.length > 1 ? `<div class="pd-lightbox-dots">${images.map((_, i) => `<span class="pd-lightbox-dot ${i === index ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const imgEl = overlay.querySelector('#pd-lightbox-img');
  const dots = overlay.querySelectorAll('.pd-lightbox-dot');
  const stage = overlay.querySelector('.pd-lightbox-stage');

  /* حالت زوم/پن: تا وقتی روی عکس زوم نشده، سوایپ افقی بین تصاویر جابه‌جا می‌کنه (مثل گالری
     عادی)؛ به‌محض زوم، همون سوایپ فقط تصویر بزرگ‌شده رو پن می‌کنه و اسلاید عوض نمی‌شه —
     دقیقاً رفتار گالری عکس موبایل. */
  let scale = 1, panX = 0, panY = 0;

  function applyTransform(withTransition) {
    imgEl.style.transition = withTransition ? 'transform .25s var(--ease)' : 'none';
    imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    imgEl.classList.toggle('zoomed', scale > 1.01);
  }
  function clampPan() {
    const rect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (scale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (scale - 1)) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }
  function resetZoom(withTransition) {
    scale = 1; panX = 0; panY = 0;
    applyTransform(withTransition);
  }

  function show(i) {
    index = (i + images.length) % images.length;
    imgEl.src = assetUrl(images[index]);
    dots.forEach((dot, di) => dot.classList.toggle('active', di === index));
    resetZoom(false);
  }
  overlay.querySelector('#pd-lightbox-prev')?.addEventListener('click', () => show(index - 1));
  overlay.querySelector('#pd-lightbox-next')?.addEventListener('click', () => show(index + 1));
  dots.forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.index))));

  const close = () => {
    overlay.classList.remove('active');
    document.removeEventListener('keydown', onKeydown);
    setTimeout(() => overlay.remove(), 300);
  };
  function onKeydown(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index + 1);
    else if (e.key === 'ArrowRight') show(index - 1);
  }
  document.addEventListener('keydown', onKeydown);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.pd-lightbox-close').addEventListener('click', close);

  function touchDist(touches) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  }

  let touchStartX = 0, touchStartY = 0, startPanX = 0, startPanY = 0;
  let pinchStartDist = 0, pinchStartScale = 1;
  let touchMoved = false, swipeDeltaX = 0;
  let lastTapTime = 0;

  stage.addEventListener('touchstart', e => {
    touchMoved = false;
    if (e.touches.length === 2) {
      pinchStartDist = touchDist(e.touches);
      pinchStartScale = scale;
    } else if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      startPanX = panX;
      startPanY = panY;
      swipeDeltaX = 0;
      if (scale > 1.01) imgEl.classList.add('panning');
    }
  }, { passive: true });

  stage.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchMoved = true;
      scale = Math.min(4, Math.max(1, pinchStartScale * (touchDist(e.touches) / pinchStartDist)));
      clampPan();
      applyTransform(false);
      return;
    }
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;

    if (scale > 1.01) {
      // زوم فعاله: سوایپ فقط پن می‌کنه، به اسلاید بعدی/قبلی نمی‌ره
      e.preventDefault();
      panX = startPanX + dx;
      panY = startPanY + dy;
      clampPan();
      applyTransform(false);
    } else if (images.length > 1) {
      swipeDeltaX = dx;
    }
  }, { passive: false });

  stage.addEventListener('touchend', e => {
    imgEl.classList.remove('panning');

    if (e.touches.length > 0) return; // یک انگشت از چند انگشت هنوز روی صفحه‌ست

    // اگر حرکتی رخ داده (پن/پینچ یا سوایپ)، دابل‌تپ در کار نیست: فقط اسنپ‌بک/سوایپ رو مدیریت کن.
    // قبلاً این شرط بدون چک touchMoved بود، یعنی هر تاچ‌اند در حالت زوم (از جمله تپ ساده برای
    // دابل‌تپ) اینجا return می‌شد و منطق toggle زوم زیرش هیچ‌وقت اجرا نمی‌شد.
    if (touchMoved) {
      if (scale > 1.01) {
        if (scale <= 1.05) resetZoom(true);
        return;
      }
      if (images.length > 1 && Math.abs(swipeDeltaX) > 40) show(index + (swipeDeltaX < 0 ? 1 : -1));
      return;
    }

    // بدون جابه‌جایی: دابل‌تپ زوم رو toggle می‌کنه — یک‌بار باز (زوم این)، بار بعد بسته (زوم اوت)
    const now = Date.now();
    if (now - lastTapTime < 300) {
      lastTapTime = 0;
      if (scale > 1.01) {
        resetZoom(true);
      } else {
        scale = 2.2;
        panX = 0; panY = 0;
        applyTransform(true);
      }
    } else {
      lastTapTime = now;
    }
  });
  stage.addEventListener('touchcancel', () => {
    imgEl.classList.remove('panning');
    if (scale <= 1.05) resetZoom(true);
  });
}

/* ---------- 6. عملیات سبد خرید ---------- */
function addToCart(productCode, colorId, sizeId, qty = 1) {
  const key = cartKey(productCode, colorId, sizeId);
  const existing = cart.find(item => item.key === key);
  const product = PRODUCTS.find(p => p.code === productCode);
  const available = product ? getAvailableStock(product, colorId, sizeId) : null;
  const currentQty = existing ? existing.qty : 0;
  let nextQty = currentQty + qty;
  if (available != null) {
    if (currentQty >= available) { showToast(`فقط ${available.toLocaleString('fa-IR')} عدد از این ترکیب رنگ/سایز موجوده`); return; }
    if (nextQty > available) { nextQty = available; showToast(`فقط ${available.toLocaleString('fa-IR')} عدد از این ترکیب رنگ/سایز موجوده`); }
  }
  if (existing) {
    existing.qty = nextQty;
  } else {
    cart.push({ key, code: productCode, color: colorId, size: sizeId || null, qty: nextQty });
  }
  saveCart();
  renderCart();
}

function updateQty(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  if (delta > 0) {
    const product = PRODUCTS.find(p => p.code === item.code);
    const available = product ? getAvailableStock(product, item.color, item.size) : null;
    if (available != null && item.qty >= available) {
      showToast(`فقط ${available.toLocaleString('fa-IR')} عدد از این ترکیب رنگ/سایز موجوده`);
      return;
    }
  }
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.key !== key);
  }
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
}

function clearCart() {
  if (!cart.length) return;
  if (!confirm('سبد خرید خالی بشه؟')) return;
  cart = [];
  saveCart();
  renderCart();
  showToast('سبد خرید خالی شد');
}

function getCartDetails() {
  return cart
    .map(item => {
      const product = PRODUCTS.find(p => p.code === item.code);
      if (!product) return null;
      const color = product.colors?.find(c => c.id === item.color);
      return {
        ...product,
        image: product.images?.[0] || '',
        key: item.key,
        qty: item.qty,
        color: item.color,
        colorName: color?.name || '',
        colorHex: color?.hex || '',
        size: item.size,
        lineTotal: product.price * item.qty,
      };
    })
    .filter(Boolean);
}

function getCartTotal() {
  return getCartDetails().reduce((sum, item) => sum + item.lineTotal, 0);
}

/* عمداً بر پایه‌ی getCartDetails (نه آرایه‌ی خام cart) حساب می‌شه: اگه محصولی
   حذف شده باشه ولی کلیدش هنوز توی localStorage مونده باشه، getCartDetails
   فیلترش می‌کنه و بچ هدر با تعداد واقعی آیتم‌های قابل‌نمایش هماهنگ می‌مونه. */
function getCartCount() {
  return getCartDetails().reduce((sum, item) => sum + item.qty, 0);
}

/* آیتم‌های یتیم سبد (محصولی که دیگه در PRODUCTS نیست) رو از localStorage پاک
   می‌کنه؛ بدون این، حتی بعد از هماهنگ‌شدن بچ، این آیتم‌ها برای همیشه توی
   localStorage باقی می‌موندن. */
function pruneInvalidCartItems() {
  const before = cart.length;
  cart = cart.filter(item => PRODUCTS.some(p => p.code === item.code));
  if (cart.length !== before) saveCart();
}

/* ---------- 7. رندر سبد خرید ---------- */
function renderCart() {
  pruneInvalidCartItems();
  const details = getCartDetails();
  const itemsList = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  const countBadge = document.getElementById('cart-count');
  const clearBtn = document.getElementById('cart-clear-btn');

  const count = details.reduce((sum, item) => sum + item.qty, 0);
  countBadge.textContent = count;
  countBadge.style.display = count > 0 ? 'flex' : 'none';
  if (clearBtn) clearBtn.hidden = !details.length;

  if (!details.length) {
    itemsList.innerHTML = '';
    emptyState.style.display = 'flex';
    footer.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  footer.style.display = 'block';

  itemsList.innerHTML = details.map(item => `
    <li class="cart-item" data-key="${item.key}">
      <div class="cart-item-media">
        <img src="${assetUrl(item.image)}" alt="${item.name}" loading="lazy" onload="this.parentElement.classList.add('is-loaded');" onerror="this.style.display='none'; this.parentElement.classList.add('is-placeholder');">
        <div class="img-spinner"></div>
        <div class="img-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4l-4 2-4-2-5 3v2l3-1.5V21h12V7.5L21 9V7l-5-3z"></path></svg>
        </div>
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-variant">
          ${item.colorHex ? `<span class="color-dot" style="background:${item.colorHex}"></span>` : ''}
          <span>${item.colorName}${item.size ? ` / سایز ${item.size}` : ''}</span>
        </div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="dec" data-key="${item.key}">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-action="inc" data-key="${item.key}">+</button>
          <button class="remove-item-btn" data-key="${item.key}" aria-label="حذف">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
          </button>
        </div>
      </div>
    </li>
  `).join('');
  markCachedImagesLoaded(itemsList);

  document.getElementById('cart-total-price').textContent = formatPrice(getCartTotal());

  itemsList.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQty(btn.dataset.key, btn.dataset.action === 'inc' ? 1 : -1);
    });
  });
  itemsList.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key));
  });
}

/* ---------- 8. باز/بسته کردن درور سبد خرید ---------- */
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('cart-open');
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  document.body.style.overflow = '';
  document.body.classList.remove('cart-open');
}

/* ---------- 8ب. بنر شناور بالای سایت ---------- */
const BANNER_DISMISSED_KEY = 'top_banner_dismissed_v1';
let bannerRotateTimer = null;

async function initTopBanner() {
  const banner = document.getElementById('top-banner');
  if (!banner || sessionStorage.getItem(BANNER_DISMISSED_KEY)) return;

  let slides;
  try {
    const res = await fetch('/api/banners');
    if (!res.ok) return;
    slides = await res.json();
  } catch {
    return;
  }
  if (!slides.length) return;

  banner.hidden = false;
  document.body.classList.add('has-banner');

  let index = 0;
  const textEl = document.getElementById('top-banner-text');
  const linkEl = document.getElementById('top-banner-link');
  function showSlide() {
    const slide = slides[index];
    textEl.textContent = slide.text;
    linkEl.href = slide.link || '#';
    if (!slide.link) linkEl.addEventListener('click', e => e.preventDefault(), { once: true });
  }
  showSlide();

  if (slides.length > 1) {
    bannerRotateTimer = setInterval(() => {
      index = (index + 1) % slides.length;
      showSlide();
    }, 5000);
  }

  document.getElementById('top-banner-close').addEventListener('click', () => {
    clearInterval(bannerRotateTimer);
    banner.hidden = true;
    document.body.classList.remove('has-banner');
    sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
  });
}

/* ---------- 9. تم روشن/تیره ---------- */
function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = saved === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
  updateHeroImagesForTheme();
}

/* پریست رنگی از تنظیمات ادمین میاد؛ برای جلوگیری از پرش رنگ لحظه‌ی لود، اول از کش محلی
   (بازدید قبلی) اعمال می‌شه، بعد با مقدار واقعی سرور همگام می‌شه. */
function initColorPreset() {
  const cached = localStorage.getItem(COLOR_PRESET_STORAGE_KEY);
  if (cached) document.documentElement.setAttribute('data-color-preset', cached);
}
async function syncColorPreset() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const { colorPreset } = await res.json();
    if (colorPreset) {
      document.documentElement.setAttribute('data-color-preset', colorPreset);
      localStorage.setItem(COLOR_PRESET_STORAGE_KEY, colorPreset);
    }
  } catch {
    // بی‌اهمیت — پریست کش‌شده یا پیش‌فرض همچنان نمایش داده می‌شه
  }
}

/* ---------- 10. منوی موبایل (همبرگری) ---------- */
function toggleMobileMenu() {
  const nav = document.getElementById('main-nav');
  const btn = document.getElementById('hamburger-btn');
  const isOpen = nav.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', String(isOpen));
}
function closeMobileMenu() {
  document.getElementById('main-nav').classList.remove('open');
  document.getElementById('hamburger-btn').classList.remove('open');
  document.getElementById('hamburger-btn').setAttribute('aria-expanded', 'false');
}

/* ---------- 10b. جستجوی محصولات در هدر ---------- */
const SEARCH_RESULT_LIMIT = 6;

function openSearch() {
  document.getElementById('search-panel').classList.add('open');
  document.getElementById('search-overlay').classList.add('active');
  const input = document.getElementById('search-input');
  input.value = '';
  renderSearchResults('');
  setTimeout(() => input.focus(), 50);
}
function closeSearch() {
  document.getElementById('search-panel').classList.remove('open');
  document.getElementById('search-overlay').classList.remove('active');
}
function renderSearchResults(query) {
  const resultsEl = document.getElementById('search-results');
  const q = query.trim();
  if (!q) {
    resultsEl.innerHTML = '<p class="search-hint">نام محصول مورد نظر خود را جستجو کنید</p>';
    return;
  }
  const matches = PRODUCTS.filter(p => p.name.includes(q)).slice(0, SEARCH_RESULT_LIMIT);
  if (!matches.length) {
    resultsEl.innerHTML = '<p class="search-empty">محصولی با این نام یافت نشد.</p>';
    return;
  }
  resultsEl.innerHTML = matches.map(p => `
    <a class="search-result-item" href="${productUrl(p)}">
      <div class="search-result-media">
        <img src="${assetUrl(p.images?.[0])}" alt="${p.name}" loading="lazy">
      </div>
      <div class="search-result-info">
        <span class="search-result-name">${p.name}</span>
        <span class="search-result-price">${formatPrice(p.price)}</span>
      </div>
      ${p.inStock ? '' : '<span class="search-result-stock">ناموجود</span>'}
    </a>
  `).join('');
}

/* ---------- 11. چک‌اوت ---------- */
let appliedCoupon = null; // { code, discountAmount } | null

const COUPON_ERROR_MESSAGES = {
  not_found: 'همچین کدی پیدا نشد',
  inactive: 'این کد غیرفعال شده',
  expired: 'این کد منقضی شده',
  max_uses_reached: 'ظرفیت استفاده از این کد تموم شده',
  not_your_code: 'این کد برای شماره‌ی دیگه‌ایه',
  first_order_only: 'این کد فقط برای اولین سفارشته',
  already_used: 'قبلاً از این کد استفاده کردی',
  invalid_input: 'اول شماره تماس رو بالا وارد کن',
};

/* ثبت سفارش یک صفحه‌ی کاملاً مجزاست (/checkout) که در یک تب جدید باز می‌شه؛
   این‌طوری اگه کاربر برای وارد کردن اطلاعات بانکی به اپ بانک سوییچ کنه، تب
   اصلی فروشگاه و روند خریدش دست‌نخورده می‌مونه. سبد خرید بین تب‌ها از طریق
   localStorage مشترکه، پس صفحه‌ی جدید همون سبد رو می‌بینه. */
function openCheckout() {
  if (!cart.length) {
    showToast('سبد خرید شما خالی است');
    return;
  }
  window.open('/checkout', '_blank', 'noopener');
}

/* فقط داخل خود صفحه‌ی /checkout اجرا می‌شه (با وجود #checkout-form تشخیص داده
   می‌شه). چون این صفحه دیگه پاپ‌آپ نیست، «باز شدن» همون بار شدن صفحه‌ست. */
function initCheckoutPage() {
  const form = document.getElementById('checkout-form');
  const content = document.getElementById('checkout-page-content');
  const emptyState = document.getElementById('checkout-page-empty');
  if (!form) return;

  if (!cart.length) {
    if (content) content.hidden = true;
    if (emptyState) emptyState.hidden = false;
    return;
  }

  appliedCoupon = null;
  renderCheckoutSummary();
  renderCheckoutSizeProfiles();
  wireCheckoutOptionChips();
  prefillCheckoutFromProfile();
  cardPaymentBoxes.cf = initCardPaymentBox('cf');

  const sizeHelpBtn = document.getElementById('checkout-size-help-btn');
  const sizeChartOverlay = document.getElementById('size-chart-overlay');
  if (sizeHelpBtn && sizeChartOverlay) {
    sizeHelpBtn.addEventListener('click', () => sizeChartOverlay.classList.add('active'));
    document.getElementById('size-chart-close-btn').addEventListener('click', () => sizeChartOverlay.classList.remove('active'));
    sizeChartOverlay.addEventListener('click', e => {
      if (e.target === sizeChartOverlay) sizeChartOverlay.classList.remove('active');
    });
  }

  form.addEventListener('submit', handleCheckoutSubmit);
}

/* اگر کاربر واردشده و پروفایلش رو (کامل یا ناقص) تکمیل کرده، هر فیلدی که موجوده
   رو از قبل توی فرم سفارش پر می‌کنیم؛ فیلدهای خالی پروفایل نادیده گرفته می‌شن.
   شماره تماس همیشه از پروفایل قفل می‌شه (فیلد حیاتیه)؛ نام و نام‌خانوادگی هم
   اگه از پروفایل ایمپورت شده باشن غیرقابل‌ویرایش می‌شن. */
function prefillCheckoutFromProfile() {
  const nameField = document.getElementById('cf-name');
  const phoneField = document.getElementById('cf-phone');
  const nameHint = document.getElementById('cf-name-hint');
  const phoneHint = document.getElementById('cf-phone-hint');
  nameField.readOnly = false;
  phoneField.readOnly = false;
  nameHint.hidden = true;
  phoneHint.hidden = true;

  if (!CURRENT_USER) return;
  const u = CURRENT_USER;

  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    nameField.value = fullName;
    nameField.readOnly = true;
    nameHint.hidden = false;
  }

  if (u.phone) {
    phoneField.value = u.phone;
    phoneField.readOnly = true;
    phoneHint.hidden = false;
  }

  const addressField = document.getElementById('cf-address');
  if (!addressField.value.trim()) {
    const addressParts = [u.address, u.city, u.province, u.postalCode ? `کد پستی ${u.postalCode}` : ''].filter(Boolean);
    if (addressParts.length) addressField.value = addressParts.join('، ');
  }
}
/* ---------- ۱۱ب. روش ارسال (چیپ رادیویی) + کارت به کارت اختصاصی (تنها روش پرداخت) ---------- */
function getCheckoutRadioValue(name) {
  const checked = document.querySelector(`#checkout-form input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

/* پست پیشتاز پس‌کرایه پشتیبانی نمی‌کنه (فقط پیش‌کرایه) — با انتخاب «پست پیشتاز»
   گزینه‌ی «پس‌کرایه» غیرفعال/مخفی می‌شه و اگه انتخاب‌شده بود، خودکار «پیش‌کرایه» جایگزینش
   می‌شه. با یک تابع عمومی برای فرم چک‌اوت مدیریت می‌شه. */
function syncShippingPaymentAvailability(methodGroupId, paymentGroupId) {
  const methodValue = document.querySelector(`#${methodGroupId} input:checked`)?.value;
  const paymentGroup = document.getElementById(paymentGroupId);
  if (!paymentGroup) return;
  const postpaidInput = paymentGroup.querySelector('input[value="postpaid"]');
  const postpaidChip = postpaidInput?.closest('.option-chip');
  if (!postpaidInput || !postpaidChip) return;

  const disablePostpaid = methodValue === 'post';
  postpaidInput.disabled = disablePostpaid;
  postpaidChip.classList.toggle('is-disabled', disablePostpaid);
  postpaidChip.hidden = disablePostpaid;

  if (disablePostpaid && postpaidInput.checked) {
    const prepaidInput = paymentGroup.querySelector('input[value="prepaid"]');
    prepaidInput.checked = true;
    paymentGroup.querySelectorAll('.option-chip').forEach(chip => chip.classList.toggle('active', chip.querySelector('input').checked));
  }
}

function wireCheckoutOptionChips() {
  document.querySelectorAll('#checkout-form .option-chips').forEach(group => {
    group.querySelectorAll('input[type="radio"]').forEach(input => {
      input.addEventListener('change', () => {
        group.querySelectorAll('.option-chip').forEach(chip => {
          chip.classList.toggle('active', chip.querySelector('input').checked);
        });
        if (group.id === 'cf-shipping-method') {
          syncShippingPaymentAvailability('cf-shipping-method', 'cf-shipping-payment');
          renderCheckoutSummary();
        }
        if (group.id === 'cf-shipping-payment') renderCheckoutSummary();
      });
    });
  });
  syncShippingPaymentAvailability('cf-shipping-method', 'cf-shipping-payment');
}

/* ---------- کارت به کارت اختصاصی: نمایش همیشگی شماره کارت + تایمر ۱ ساعته ----------
   برای فرم چک‌اوت (prefix «cf»).
   شماره کارت/به‌نام/بانک فقط بعد از کلیک روی «نمایش شماره کارت» از /api/settings گرفته
   و رندر می‌شه؛ دکمه‌ی نهایی ثبت سفارش («پرداخت کردم») تا انتخاب فایل رسید غیرفعاله. */
const CARD_PAYMENT_TIMER_MS = 60 * 60 * 1000;
const cardPaymentTimers = {};
const cardPaymentBoxes = {};
let siteCardSettingsPromise = null;

/* تایمر پرداخت کارت‌به‌کارت روی deadline در localStorage ذخیره می‌شه (نه فقط
   یک متغیر توی حافظه‌ی جاوااسکریپت)؛ چون وقتی کاربر برای وارد کردن اطلاعات
   بانکی به اپ بانک سوییچ می‌کنه، مرورگرهای موبایل ممکنه تب رو از حافظه خارج
   کنن و برگشتن بهش عملاً یعنی ری‌لود کامل صفحه — بدون این ذخیره‌سازی، وضعیت
   «کارت نمایش داده‌شده + شمارش معکوس» از دست می‌رفت. */
function persistCardPaymentDeadline(prefix, deadline) {
  localStorage.setItem(`cardPaymentDeadline_${prefix}`, String(deadline));
}
function readCardPaymentDeadline(prefix) {
  const raw = localStorage.getItem(`cardPaymentDeadline_${prefix}`);
  const deadline = raw ? Number(raw) : null;
  return deadline && deadline > Date.now() ? deadline : null;
}
function clearCardPaymentPersist(prefix) {
  localStorage.removeItem(`cardPaymentDeadline_${prefix}`);
}

function getSiteCardSettings() {
  if (!siteCardSettingsPromise) {
    siteCardSettingsPromise = fetch('/api/settings')
      .then(res => res.json())
      .then(data => ({
        number: data.cardToCardNumber || '',
        holder: data.cardToCardHolder || '',
        bank: data.cardToCardBank || '',
      }))
      .catch(() => ({ number: '', holder: '', bank: '' }));
  }
  return siteCardSettingsPromise;
}

function formatCardNumber(num) {
  return String(num || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function initCardPaymentBox(prefix) {
  const detailsEl = document.getElementById(`${prefix}-card-details`);
  if (!detailsEl) return null; // این صفحه این بلاک رو نداره

  const numberEl = document.getElementById(`${prefix}-card-number`);
  const holderEl = document.getElementById(`${prefix}-card-holder`);
  const bankEl = document.getElementById(`${prefix}-card-bank`);
  const timerEl = document.getElementById(`${prefix}-card-timer`);
  const timerBox = document.getElementById(`${prefix}-card-timer-box`);
  const expiredBox = document.getElementById(`${prefix}-card-expired-box`);
  const receiptGroup = document.getElementById(`${prefix}-receipt-group`);
  const receiptInput = document.getElementById(`${prefix}-receipt`);
  const receiptError = document.getElementById(`${prefix}-receipt-error`);
  const submitBtn = document.getElementById(`${prefix}-submit-btn`);
  const copyBtn = document.getElementById(`${prefix}-card-copy-btn`);

  function reset() {
    clearCardPaymentPersist(prefix);
    if (receiptInput) receiptInput.value = '';
    if (receiptError) receiptError.textContent = '';
    if (submitBtn) submitBtn.disabled = true;
    reveal(); // شماره کارت همیشه نمایش داده می‌شه؛ ریست یعنی فقط تایمر از نو شروع بشه
  }

  function startCountdown(deadline) {
    clearInterval(cardPaymentTimers[prefix]);
    function tick() {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        clearInterval(cardPaymentTimers[prefix]);
        if (timerBox) timerBox.hidden = true;
        if (expiredBox) expiredBox.hidden = false;
        clearCardPaymentPersist(prefix);
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    tick();
    cardPaymentTimers[prefix] = setInterval(tick, 1000);
  }

  async function reveal(deadline) {
    const settings = await getSiteCardSettings();
    numberEl.textContent = formatCardNumber(settings.number) || '—';
    holderEl.textContent = settings.holder || '—';
    bankEl.textContent = settings.bank || '—';
    detailsEl.hidden = false;
    receiptGroup.hidden = false;
    if (timerBox) timerBox.hidden = false;
    if (expiredBox) expiredBox.hidden = true;

    const effectiveDeadline = deadline || Date.now() + CARD_PAYMENT_TIMER_MS;
    persistCardPaymentDeadline(prefix, effectiveDeadline);
    startCountdown(effectiveDeadline);
  }

  /* شماره کارت همیشه از همون لحظه‌ی باز شدن فرم نمایش داده می‌شه (بدون نیاز به کلیک) —
     اگه از قبل (مثلاً قبل از سوییچ به اپ بانک) deadline ذخیره‌شده در localStorage معتبر بود
     همون رو ادامه می‌ده، وگرنه یک تایمر ۱ ساعته‌ی تازه شروع می‌کنه. */
  const persistedDeadline = readCardPaymentDeadline(prefix);
  reveal(persistedDeadline || undefined);

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const settings = await getSiteCardSettings();
      try {
        await navigator.clipboard.writeText(settings.number.replace(/\D/g, ''));
        showToast('شماره کارت کپی شد');
      } catch {
        showToast('کپی خودکار ممکن نشد؛ شماره رو دستی انتخاب کن');
      }
    });
  }

  if (receiptInput) {
    receiptInput.addEventListener('change', () => {
      if (submitBtn) submitBtn.disabled = !(receiptInput.files && receiptInput.files.length);
      if (receiptError) receiptError.textContent = '';
    });
  }

  return { reset };
}

function updateCartItemSize(key, size) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.size = size;
  saveCart();
}

/* برای هر آیتم سبد که محصولش سایزبندی ثبت‌شده داره، هم دکمه‌های سایز خام محصول
   رو نشون می‌ده هم (اگه کاربر واردشده و پروفایل سایز ذخیره‌شده‌ای داره — خودش/
   آشنایانش) یه میان‌بر برای اعمال سریع همون سایز پیشنهادی. */
async function renderCheckoutSizeProfiles() {
  const container = document.getElementById('checkout-size-profiles');
  if (!container) return;
  const itemsWithSizes = getCartDetails().filter(item => Array.isArray(item.sizes) && item.sizes.length);
  if (!itemsWithSizes.length) { container.innerHTML = ''; return; }

  let profiles = [];
  if (CURRENT_USER) {
    try {
      const res = await fetch('/api/me/sizes');
      profiles = res.ok ? await res.json() : [];
    } catch { profiles = []; }
  }

  container.innerHTML = itemsWithSizes.map(item => `
    <div class="checkout-size-item" data-key="${item.key}">
      <div class="checkout-size-item-name">سایز «${item.name}»</div>
      <div class="option-chips checkout-size-raw-options">
        ${item.sizes.map(s => `<label class="option-chip ${item.size === s ? 'active' : ''}"><input type="radio" name="checkout-size-${item.key}" value="${s}" ${item.size === s ? 'checked' : ''}> ${s}</label>`).join('')}
      </div>
      ${profiles.length ? `
      <div class="checkout-size-profile-quick">
        ${profiles.map(p => `<button type="button" class="checkout-size-profile-quick-btn ${item.size === p.suggestedSize ? 'active' : ''}" data-key="${item.key}" data-size="${p.suggestedSize}">${p.label} — سایز ${p.suggestedSize}</button>`).join('')}
      </div>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.checkout-size-raw-options input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const wrap = input.closest('.checkout-size-item');
      wrap.querySelectorAll('.option-chip').forEach(chip => chip.classList.toggle('active', chip.querySelector('input').checked));
      updateCartItemSize(wrap.dataset.key, input.value);
      renderCheckoutSummary();
    });
  });
  container.querySelectorAll('.checkout-size-profile-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateCartItemSize(btn.dataset.key, btn.dataset.size);
      renderCheckoutSizeProfiles();
      renderCheckoutSummary();
    });
  });
}

/* ردیف کوچک محصول در رسید خلاصه‌ی سفارش — عکس/جنس/تعداد، تا مشتری قبل از پرداخت
   دقیقاً ببینه چی خریده؛ چون از همون details (خروجی getCartDetails) رندر می‌شه،
   به‌صورت خودکار برای هر تعداد آیتم کار می‌کنه (فول‌استک، نه مخصوص یک آیتم). */
function checkoutReceiptItemHTML(item) {
  const materialInfo = MATERIAL_INFO[item.material];
  return `
    <div class="checkout-receipt-item">
      <div class="checkout-receipt-item-media">
        <img src="${assetUrl(item.image)}" alt="${item.name}" loading="lazy" onerror="this.style.display='none';">
      </div>
      <div class="checkout-receipt-item-info">
        <div class="checkout-receipt-item-name">${item.name}</div>
        <div class="checkout-receipt-item-meta">
          ${item.colorHex ? `<span class="color-dot" style="background:${item.colorHex}"></span>` : ''}
          <span>${[item.colorName, item.size ? `سایز ${item.size}` : ''].filter(Boolean).join(' / ')}</span>
          ${materialInfo ? `<span class="checkout-receipt-item-material"><img src="${materialInfo.icon}" alt=""> ${materialInfo.label}</span>` : ''}
        </div>
      </div>
      <div class="checkout-receipt-item-qty">× ${item.qty}</div>
      <div class="checkout-receipt-item-price">${formatPrice(item.lineTotal)}</div>
    </div>
  `;
}

function renderCheckoutSummary() {
  const details = getCartDetails();
  const subtotal = getCartTotal();
  const discountedSubtotal = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discountAmount) : subtotal;
  const shippingMethod = getCheckoutRadioValue('shippingMethod') || 'tipax';
  const shippingPayment = getCheckoutRadioValue('shippingPayment') || 'postpaid';
  const shippingFee = shippingPayment === 'prepaid' ? SHIPPING_FEE_TOMAN : 0;
  const finalTotal = discountedSubtotal + shippingFee;
  const summary = document.getElementById('checkout-summary');
  summary.innerHTML = `<div class="checkout-receipt">` + details.map(checkoutReceiptItemHTML).join('') + `
    <div class="checkout-discount-row">
      <input type="text" id="cf-discount-code" placeholder="کد تخفیف داری؟" value="${appliedCoupon ? appliedCoupon.code : ''}" ${appliedCoupon ? 'disabled' : ''}>
      ${appliedCoupon
        ? '<button type="button" class="btn btn-ghost" id="cf-discount-remove">حذف</button>'
        : '<button type="button" class="btn btn-ghost" id="cf-discount-apply">اعمال</button>'}
    </div>
    <span class="form-error" id="cf-discount-error"></span>
    ${appliedCoupon ? `
    <div class="checkout-summary-row checkout-summary-row--discount">
      <span><i class="fa-solid fa-tag"></i> تخفیف (${appliedCoupon.code})</span>
      <span>−${formatPrice(appliedCoupon.discountAmount)}</span>
    </div>` : ''}
    <div class="checkout-summary-row checkout-summary-row--shipping">
      <span><i class="fa-solid fa-truck-fast"></i> هزینه ارسال (${SHIPPING_METHOD_LABELS[shippingMethod]} — ${SHIPPING_PAYMENT_LABELS[shippingPayment]})</span>
      <span>${shippingPayment === 'prepaid' ? formatPrice(shippingFee) : 'هنگام تحویل'}</span>
    </div>
    <div class="checkout-summary-row total">
      <span>جمع کل قابل پرداخت</span>
      <span>${formatPrice(finalTotal)}</span>
    </div>
  </div>`;

  const applyBtn = document.getElementById('cf-discount-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const code = document.getElementById('cf-discount-code').value.trim();
      const phone = document.getElementById('cf-phone').value.trim();
      const errorEl = document.getElementById('cf-discount-error');
      errorEl.textContent = '';
      if (!code) { errorEl.textContent = 'یک کد وارد کن'; return; }
      if (!/^0\d{10}$/.test(phone)) { errorEl.textContent = 'اول شماره تماس رو بالا وارد کن'; return; }
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, phone, subtotal }),
        });
        const data = await res.json();
        if (!res.ok) { errorEl.textContent = COUPON_ERROR_MESSAGES[data.reason] || 'کد تخفیف معتبر نیست'; return; }
        appliedCoupon = { code: data.code, discountAmount: data.discountAmount };
        renderCheckoutSummary();
        showToast('کد تخفیف اعمال شد');
      } catch {
        errorEl.textContent = 'خطا در بررسی کد، دوباره تلاش کن';
      }
    });
  }
  const removeBtn = document.getElementById('cf-discount-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => { appliedCoupon = null; renderCheckoutSummary(); });
  }
}

function validateCheckoutForm(form) {
  let valid = true;
  const fields = [
    { id: 'cf-name', message: 'لطفاً نام و نام‌خانوادگی را وارد کنید' },
    { id: 'cf-phone', message: 'لطفاً شماره تماس معتبر وارد کنید', pattern: /^0\d{10}$/ },
    { id: 'cf-address', message: 'لطفاً آدرس را وارد کنید' },
  ];

  fields.forEach(field => {
    const input = document.getElementById(field.id);
    const errorEl = document.querySelector(`[data-error-for="${field.id}"]`);
    const value = input.value.trim();
    let fieldValid = value.length > 0;
    if (fieldValid && field.pattern) fieldValid = field.pattern.test(value);

    input.closest('.form-group').classList.toggle('has-error', !fieldValid);
    errorEl.textContent = fieldValid ? '' : field.message;
    if (!fieldValid) valid = false;
  });

  const receiptInput = document.getElementById('cf-receipt');
  const receiptError = document.getElementById('cf-receipt-error');
  const hasFile = receiptInput.files && receiptInput.files.length > 0;
  receiptError.textContent = hasFile ? '' : 'لطفاً شماره کارت رو نمایش بده، پرداخت کن و تصویر رسید رو انتخاب کن';
  if (!hasFile) valid = false;

  return valid;
}

const SHIPPING_FEE_TOMAN = 150000;
const SHIPPING_METHOD_LABELS = { tipax: 'تیپاکس', post: 'پست پیشتاز' };
const SHIPPING_PAYMENT_LABELS = { postpaid: 'پس‌کرایه', prepaid: 'پیش‌کرایه' };
const PAYMENT_METHOD_LABELS = { bank_gateway: 'درگاه بانکی مستقیم', card_to_card: 'کارت به کارت' };

function buildOrderMessage(customer, shipping) {
  const details = getCartDetails();
  const lines = details.map(item => {
    const variant = [item.colorName, item.size ? `سایز ${item.size}` : ''].filter(Boolean).join('، ');
    return `• ${item.name}${variant ? ` (${variant})` : ''} × ${item.qty} — ${formatPrice(item.lineTotal)}`;
  });
  const discountedSubtotal = appliedCoupon ? Math.max(0, getCartTotal() - appliedCoupon.discountAmount) : getCartTotal();
  const shippingFee = shipping.shippingPayment === 'prepaid' ? SHIPPING_FEE_TOMAN : 0;
  const grandTotal = discountedSubtotal + shippingFee;
  const message = [
    `سفارش جدید از Storefront`,
    ``,
    ...lines,
    ``,
    `جمع محصولات: ${formatPrice(getCartTotal())}`,
    appliedCoupon ? `تخفیف (${appliedCoupon.code}): −${formatPrice(appliedCoupon.discountAmount)}` : '',
    `هزینه ارسال: ${shipping.shippingPayment === 'prepaid' ? formatPrice(shippingFee) : 'پس‌کرایه (پرداخت هنگام تحویل)'}`,
    `جمع کل قابل پرداخت: ${formatPrice(grandTotal)}`,
    ``,
    `نام: ${customer.name}`,
    `تماس: ${customer.phone}`,
    `آدرس: ${customer.address}`,
    customer.note ? `توضیحات: ${customer.note}` : '',
    `روش ارسال: ${SHIPPING_METHOD_LABELS[shipping.shippingMethod]} — ${SHIPPING_PAYMENT_LABELS[shipping.shippingPayment]}`,
    `روش پرداخت: ${PAYMENT_METHOD_LABELS[shipping.paymentMethod]}`,
  ].filter(Boolean).join('\n');

  return encodeURIComponent(message);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (!validateCheckoutForm(form)) return;

  const customer = {
    name: document.getElementById('cf-name').value.trim(),
    phone: document.getElementById('cf-phone').value.trim(),
    address: document.getElementById('cf-address').value.trim(),
    note: document.getElementById('cf-note').value.trim(),
  };
  const shipping = {
    shippingMethod: getCheckoutRadioValue('shippingMethod'),
    shippingPayment: getCheckoutRadioValue('shippingPayment'),
    paymentMethod: 'card_to_card',
  };

  const encodedMessage = buildOrderMessage(customer, shipping);
  document.getElementById('whatsapp-send-btn').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  document.getElementById('telegram-send-btn').href = `https://t.me/${TELEGRAM_USERNAME}?text=${encodedMessage}`;

  // ثبت سفارش سمت سرور؛ فقط وقتی واقعاً با موفقیت ثبت بشه صفحه‌ی موفقیت نمایش داده می‌شه
  // و سبد خرید خالی می‌شه — وگرنه کاربر خطا رو می‌بینه و سبدش حفظ می‌مونه.
  const ORDER_ERROR_MESSAGES = {
    invalid_input: 'اطلاعات سفارش ناقصه؛ لطفاً فرم رو کامل کن.',
    insufficient_stock: 'موجودی یکی از اقلام سبد کافی نیست؛ لطفاً تعداد رو اصلاح کن.',
    invalid_coupon: 'کد تخفیف معتبر نیست یا منقضی شده.',
  };

  let order;
  try {
    const details = getCartDetails();
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        total: getCartTotal(),
        discountCode: appliedCoupon ? appliedCoupon.code : undefined,
        ...shipping,
        items: details.map(item => ({
          productId: item.code,
          name: item.name,
          image: item.image,
          price: item.price,
          qty: item.qty,
          colorId: item.color,
          colorName: item.colorName,
          size: item.size,
        })),
      }),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.json().catch(() => ({}));
      showToast(ORDER_ERROR_MESSAGES[errBody.error] || 'ثبت سفارش ناموفق بود؛ لطفاً دوباره تلاش کن.');
      return;
    }
    order = await orderRes.json();

    if (shipping.paymentMethod === 'card_to_card') {
      const receiptFile = document.getElementById('cf-receipt').files[0];
      if (receiptFile) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        const progressEl = document.getElementById('cf-receipt-progress');
        await uploadFileWithProgress(`/api/orders/${order.id}/receipt`, formData, p => renderUploadProgress(progressEl, p));
        if (progressEl) progressEl.hidden = true;
      }
    }
  } catch {
    showToast('خطا در ارتباط با سرور؛ سفارش ثبت نشد. لطفاً دوباره تلاش کن.');
    return;
  }

  document.getElementById('checkout-form-view').hidden = true;
  document.getElementById('checkout-success-view').hidden = false;
  clearCardPaymentPersist('cf');

  cart = [];
  saveCart();
  renderCart();
  form.reset();
  appliedCoupon = null;
}

/* ---------- 12. توست ---------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- 13. اسکرول‌اسپای منو ---------- */
function initScrollSpy() {
  const sections = ['hero', 'categories', 'products', 'about', 'footer'];
  const links = document.querySelectorAll('.nav-link');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

/* ---------- 12a. اسکلت لودینگ (تا رسیدن دیتای واقعی) + نوار پیشرفت بالای صفحه ---------- */
function skeletonCardHTML() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-line" style="width:70%"></div>
      <div class="skeleton skeleton-line" style="width:40%"></div>
    </div>`;
}

function showInitialSkeletons() {
  const fillIfEmpty = (id, html) => {
    const el = document.getElementById(id);
    if (el && !el.innerHTML.trim()) el.innerHTML = html;
  };

  fillIfEmpty('product-grid', Array.from({ length: 8 }, skeletonCardHTML).join(''));
  fillIfEmpty('deals-grid', Array.from({ length: 4 }, skeletonCardHTML).join(''));
  fillIfEmpty('bestsellers-grid', Array.from({ length: 4 }, skeletonCardHTML).join(''));
  fillIfEmpty('category-grid', Array.from({ length: 3 }, () => '<div class="skeleton skeleton-category"></div>').join(''));
  fillIfEmpty('hero-slides', '<div class="skeleton skeleton-hero"></div>');
  fillIfEmpty('product-detail', '<div class="container"><div class="skeleton skeleton-pdp"></div></div>');
}

/* نوار نازک بالای صفحه: روی کلیک لینک‌های داخلی قبل از ناوبری واقعی شروع می‌شه
   (این پروژه چندصفحه‌ای استاتیکه، نه SPA؛ این فقط حس سرعت بارگذاری رو منتقل می‌کنه) */
function initPageLoadBar() {
  const bar = document.createElement('div');
  bar.id = 'page-load-bar';
  document.body.appendChild(bar);

  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    let url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    bar.classList.add('is-loading');
  });
}

/* ---------- 12b. fade/reveal پلکانی هنگام اسکرول (سراسری) ---------- */
let scrollRevealObserver = null;

function initScrollReveal() {
  if (scrollRevealObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scrollRevealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      scrollRevealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.section-heading').forEach(el => applyScrollReveal(el));
}

/* روی یک المان (یا فرزندان مستقیمش) کلاس reveal اضافه می‌کنه و با تأخیر پلکانی observe می‌کنه.
   بعد از هر رندر پویا (فیلتر محصولات، تخفیف‌ها، پرطرفدارها و ...) باید دوباره صدا زده بشه. */
function applyScrollReveal(container, childSelector = null) {
  if (!scrollRevealObserver || !container) return;
  const items = childSelector ? Array.from(container.querySelectorAll(childSelector)) : [container];
  items.forEach((el, i) => {
    el.classList.add('reveal-on-scroll');
    el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
    scrollRevealObserver.observe(el);
  });
}

/* ---------- 13a. نوار شناور تماس سریع (تلگرام/واتساپ/تماس) ---------- */
function initContactBar() {
  if (document.getElementById('contact-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'contact-bar glass glass-strong';
  bar.id = 'contact-bar';
  bar.innerHTML = `
    <a class="contact-bar-item contact-bar-item--telegram" href="https://t.me/${TELEGRAM_USERNAME}" target="_blank" rel="noopener" aria-label="تلگرام استورفرانت">
      <span class="contact-bar-icon"><i class="fa-brands fa-telegram"></i></span>
      <span class="contact-bar-label">تلگرام</span>
    </a>
    <a class="contact-bar-item contact-bar-item--whatsapp" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener" aria-label="واتساپ استورفرانت">
      <span class="contact-bar-icon"><i class="fa-brands fa-whatsapp"></i></span>
      <span class="contact-bar-label">واتساپ</span>
    </a>
    <a class="contact-bar-item contact-bar-item--phone" href="tel:${SUPPORT_PHONE}" aria-label="تماس تلفنی با استورفرانت">
      <span class="contact-bar-icon"><i class="fa-solid fa-phone"></i></span>
      <span class="contact-bar-label">تماس</span>
    </a>
  `;
  document.body.appendChild(bar);
  document.body.classList.add('has-contact-bar');
}

/* ---------- 13b. صفحه‌ی سوالات متداول (آکاردئون + تب دسته‌بندی) ---------- */
function renderFaqTabs() {
  const bar = document.getElementById('faq-tab-bar');
  if (!bar) return;
  bar.innerHTML = FAQ_CATEGORIES.map(cat => `
    <button class="filter-btn ${activeFaqCategory === cat.id ? 'active' : ''}" data-faq-category="${cat.id}">${cat.name}</button>
  `).join('');

  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFaqCategory = btn.dataset.faqCategory;
      renderFaqTabs();
      renderFaqList();
    });
  });
}

function renderFaqList() {
  const list = document.getElementById('faq-list');
  if (!list) return;
  const items = FAQ_ITEMS.filter(item => item.category === activeFaqCategory);

  if (!items.length) {
    list.innerHTML = '<p class="faq-empty">در این دسته هنوز سوالی ثبت نشده.</p>';
    return;
  }

  list.innerHTML = items.map((item, i) => `
    <div class="faq-item" data-faq-index="${i}">
      <button class="faq-question" aria-expanded="false">
        ${item.question}
        <i class="fa-solid fa-chevron-down"></i>
      </button>
      <div class="faq-answer">
        <div class="faq-answer-inner">${item.answer}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      question.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

/* ---------- 15. احراز هویت (ورود سریع با OTP) + منوی حساب کاربری ---------- */
let CURRENT_USER = null;
let pendingOtpPhone = '';

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) { CURRENT_USER = null; return; }
    const data = await res.json();
    CURRENT_USER = data.user;
  } catch {
    CURRENT_USER = null;
  }
}

function renderAccountMenu() {
  const dropdown = document.getElementById('account-dropdown');
  if (!dropdown) return;

  if (!CURRENT_USER) {
    dropdown.innerHTML = `
      <div class="account-login-prompt">
        <p>برای مشاهده‌ی سفارش‌ها، سایزها و پروفایل، اول وارد شو</p>
        <button class="btn btn-primary btn-block" id="account-login-btn"><i class="fa-solid fa-key"></i> ورود سریع</button>
      </div>
    `;
    document.getElementById('account-login-btn').addEventListener('click', () => {
      closeAccountDropdown();
      openOtpModal();
    });
    return;
  }

  const displayName = [CURRENT_USER.firstName, CURRENT_USER.lastName].filter(Boolean).join(' ') || CURRENT_USER.phone;
  dropdown.innerHTML = `
    <div class="account-dropdown-header">
      <div class="account-dropdown-avatar">
        ${CURRENT_USER.avatarUrl ? `<img src="/${CURRENT_USER.avatarUrl}" alt="">` : '<i class="fa-solid fa-user"></i>'}
      </div>
      <div class="account-dropdown-header-text">
        <strong>${displayName}</strong>
        <span>${CURRENT_USER.phone}</span>
      </div>
    </div>
    <a class="account-menu-item" href="/account/orders"><i class="fa-solid fa-box"></i> مشاهده سفارشات</a>
    <a class="account-menu-item" href="/account/sizes"><i class="fa-solid fa-ruler"></i> سایزهای تنظیم‌شده</a>
    <a class="account-menu-item" href="/track"><i class="fa-solid fa-truck-fast"></i> پیگیری سفارش</a>
    <a class="account-menu-item" href="/account/profile"><i class="fa-solid fa-user-pen"></i> پروفایل کاربری</a>
    <a class="account-menu-item" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> پشتیبانی</a>
    <button class="account-menu-item logout" id="account-logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> خروج از حساب</button>
  `;
  document.getElementById('account-logout-btn').addEventListener('click', logout);
}

function openAccountDropdown() {
  document.getElementById('account-dropdown').classList.add('open');
  document.getElementById('account-open-btn').setAttribute('aria-expanded', 'true');
}
function closeAccountDropdown() {
  document.getElementById('account-dropdown').classList.remove('open');
  document.getElementById('account-open-btn').setAttribute('aria-expanded', 'false');
}
function toggleAccountDropdown() {
  const isOpen = document.getElementById('account-dropdown').classList.contains('open');
  if (isOpen) closeAccountDropdown(); else openAccountDropdown();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  CURRENT_USER = null;
  closeAccountDropdown();
  renderAccountMenu();
  showToast('از حساب خارج شدید');
  if (location.pathname.startsWith('/account')) location.href = '/';
}

/* ---------- 15b. مودال ورود سریع (OTP) ---------- */
function openOtpModal() {
  document.getElementById('otp-phone-view').hidden = false;
  document.getElementById('otp-code-view').hidden = true;
  document.getElementById('otp-phone-form').reset();
  document.getElementById('otp-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeOtpModal() {
  document.getElementById('otp-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

async function handleOtpPhoneSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('otp-phone-input');
  const errorEl = document.getElementById('otp-phone-error');
  const submitBtn = e.target.querySelector('button[type=submit]');
  const phone = input.value.trim();

  if (!/^0\d{10}$/.test(phone)) {
    errorEl.textContent = 'لطفاً شماره موبایل معتبر وارد کنید';
    return;
  }
  errorEl.textContent = '';
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      errorEl.textContent = 'ارسال کد با خطا مواجه شد، دوباره تلاش کنید';
      return;
    }
    await res.json();
  } catch {
    errorEl.textContent = 'اتصال به سرور برقرار نشد، اتصال اینترنت رو بررسی و دوباره تلاش کنید';
    return;
  } finally {
    submitBtn.disabled = false;
  }

  pendingOtpPhone = phone;

  document.getElementById('otp-phone-view').hidden = true;
  document.getElementById('otp-code-view').hidden = false;
  document.getElementById('otp-code-subtitle').textContent = `کد تایید برای ${phone} ارسال شد`;
  document.getElementById('otp-code-input').value = '';
  document.getElementById('otp-code-error').textContent = '';
}

async function handleOtpCodeSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('otp-code-input').value.trim();
  const errorEl = document.getElementById('otp-code-error');
  const submitBtn = e.target.querySelector('button[type=submit]');
  errorEl.textContent = '';
  submitBtn.disabled = true;

  let data;
  try {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: pendingOtpPhone, code }),
    });
    if (!res.ok) {
      errorEl.textContent = 'کد وارد شده صحیح نیست یا منقضی شده';
      return;
    }
    data = await res.json();
  } catch {
    errorEl.textContent = 'اتصال به سرور برقرار نشد، اتصال اینترنت رو بررسی و دوباره تلاش کنید';
    return;
  } finally {
    submitBtn.disabled = false;
  }

  CURRENT_USER = data.user;
  closeOtpModal();
  renderAccountMenu();
  showToast('با موفقیت وارد شدید');

  // اگر داخل یکی از صفحات حساب کاربری بودیم، محتوای همون صفحه رو رفرش کن
  renderAccountPages();
}

/* ---------- 15c. راهنمای ورود مشترک برای صفحات حساب کاربری ---------- */
function accountGuardHTML(message) {
  return `
    <div class="account-guard">
      <p>${message}</p>
      <button class="btn btn-primary" id="account-guard-login-btn"><i class="fa-solid fa-key"></i> ورود سریع</button>
    </div>
  `;
}
function wireAccountGuard(container) {
  const btn = container.querySelector('#account-guard-login-btn');
  if (btn) btn.addEventListener('click', openOtpModal);
}

/* ---------- 15d. صفحه‌ی سفارش‌های من ---------- */
async function renderOrdersPage() {
  const root = document.getElementById('orders-content');
  if (!root) return;

  if (!CURRENT_USER) {
    root.innerHTML = accountGuardHTML('برای دیدن سفارش‌هات باید اول وارد حساب کاربری بشی.');
    wireAccountGuard(root);
    return;
  }

  const res = await fetch('/api/me/orders');
  const orders = res.ok ? await res.json() : [];

  if (!orders.length) {
    root.innerHTML = '<p class="account-guard">هنوز سفارشی از این حساب ثبت نشده.</p>';
    return;
  }

  const statusLabels = { awaiting_payment_confirmation: 'در انتظار تایید پرداخت', payment_rejected: 'پرداخت رد شد', registered: 'ثبت شد', preparing: 'در حال آماده‌سازی', shipped: 'ارسال شد', delivered: 'تحویل داده شد' };
  root.innerHTML = `<div class="order-list">${orders.map(o => `
    <div class="order-card">
      <div class="order-card-info">
        <strong>سفارش #${o.code}</strong>
        <span>${new Date(o.createdAt).toLocaleDateString('fa-IR')} — ${formatPrice(o.total)}</span>
      </div>
      <span class="order-status-badge">${statusLabels[o.status] || o.status}</span>
      <button type="button" class="btn btn-ghost order-detail-open-btn" data-id="${o.id}"><i class="fa-solid fa-eye"></i> مشاهده جزئیات</button>
    </div>
  `).join('')}</div>`;

  root.querySelectorAll('.order-detail-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = orders.find(o => o.id === btn.dataset.id);
      if (order) openCustomerOrderDetailModal(order, statusLabels);
    });
  });
}

function openCustomerOrderDetailModal(o, statusLabels) {
  const itemsHTML = (o.items || []).map(it => `
    <div class="order-detail-item">
      ${it.image ? `<img src="${assetUrl(it.image)}" alt="" class="order-detail-item-img">` : '<div class="order-detail-item-img order-detail-item-img--empty"><i class="fa-solid fa-image"></i></div>'}
      <div class="order-detail-item-info">
        <div class="order-detail-item-name">${it.name}</div>
        <div class="order-detail-item-meta">${[it.colorName, it.size ? `سایز ${it.size}` : ''].filter(Boolean).join(' / ') || '—'}</div>
        <div class="order-detail-item-meta">تعداد: ${it.qty} × ${formatPrice(it.price)}</div>
      </div>
      <div class="order-detail-item-total">${formatPrice(it.price * it.qty)}</div>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal glass glass-strong order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cust-order-detail-title">
      <button type="button" class="icon-btn modal-close" id="cust-order-detail-close-btn" aria-label="بستن">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
      </button>
      <h3 id="cust-order-detail-title" class="modal-title">سفارش #${o.code}</h3>

      <div class="order-detail-section">
        <h4>وضعیت سفارش</h4>
        <div class="order-detail-grid"><div><span class="order-status-badge">${statusLabels[o.status] || o.status}</span></div></div>
      </div>

      <div class="order-detail-section">
        <h4>اطلاعات ارسال</h4>
        <div class="order-detail-grid">
          <div><strong>نام:</strong> ${o.customer?.name || '—'}</div>
          <div><strong>موبایل:</strong> ${o.customer?.phone || '—'}</div>
          <div class="order-detail-span2"><strong>آدرس:</strong> ${o.customer?.address || '—'}</div>
          <div><strong>روش ارسال:</strong> ${SHIPPING_METHOD_LABELS[o.shippingMethod] || '—'}</div>
          <div><strong>نحوه پرداخت کرایه:</strong> ${SHIPPING_PAYMENT_LABELS[o.shippingPayment] || '—'}</div>
          <div><strong>روش پرداخت:</strong> ${PAYMENT_METHOD_LABELS[o.paymentMethod] || '—'}</div>
          <div><strong>تاریخ ثبت سفارش:</strong> ${new Date(o.createdAt).toLocaleDateString('fa-IR')}</div>
        </div>
      </div>

      <div class="order-detail-section">
        <h4>اقلام سفارش</h4>
        <div class="order-detail-items">${itemsHTML}</div>
      </div>

      <div class="order-detail-section">
        <h4>جمع مالی</h4>
        <div class="order-detail-grid">
          ${o.subtotal != null ? `<div><strong>جمع جزء:</strong> ${formatPrice(o.subtotal)}</div>` : ''}
          ${o.discountCode ? `<div><strong>کد تخفیف:</strong> ${o.discountCode} (${formatPrice(o.discountAmount)}-)</div>` : ''}
          <div><strong>هزینه ارسال:</strong> ${formatPrice(o.shippingFee)}</div>
          <div><strong>مبلغ نهایی:</strong> ${formatPrice(o.total)}</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 300); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#cust-order-detail-close-btn').addEventListener('click', close);
}

/* ---------- 15e. صفحه‌ی سایزهای تنظیم‌شده ---------- */
async function renderSizesPage() {
  const root = document.getElementById('sizes-content');
  if (!root) return;

  if (!CURRENT_USER) {
    root.innerHTML = accountGuardHTML('برای محاسبه و ذخیره‌ی سایز باید اول وارد حساب کاربری بشی.');
    wireAccountGuard(root);
    return;
  }

  const res = await fetch('/api/me/sizes');
  const profiles = res.ok ? await res.json() : [];

  root.innerHTML = `
    <div class="size-form">
      <p class="form-hint">اگه وزنت رو نمی‌دونی مهم نیست؛ فقط دور سینه، کمر و باسن رو با متر خیاطی اندازه بگیر و همینا رو وارد کن. می‌تونی سایز خودت یا هر عضو دیگه‌ای از خانواده/دوستانت رو هم جدا ذخیره کنی.</p>
      <form id="size-form" novalidate>
        <div class="form-group">
          <label for="size-label">این سایز برای کیه؟</label>
          <input type="text" id="size-label" placeholder="مثلاً سایز من، سایز خواهرم" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="size-height">قد (سانتی‌متر، اختیاری)</label>
            <input type="number" id="size-height" min="120" max="220">
          </div>
          <div class="form-group">
            <label for="size-weight">وزن (کیلوگرم، اختیاری)</label>
            <input type="number" id="size-weight" min="30" max="200">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="size-chest">دور سینه (سانتی‌متر) *</label>
            <input type="number" id="size-chest" min="60" max="160" required>
          </div>
          <div class="form-group">
            <label for="size-waist">دور کمر (سانتی‌متر) *</label>
            <input type="number" id="size-waist" min="50" max="150" required>
          </div>
        </div>
        <div class="form-group">
          <label for="size-hip">دور باسن (سانتی‌متر) *</label>
          <input type="number" id="size-hip" min="60" max="160" required>
        </div>
        <div class="form-group">
          <label>جنس پارچه</label>
          <div class="option-chips">
            <label class="option-chip"><input type="radio" name="size-fabric" value="non-elastic" checked> غیرکشسان (پارچه‌ی معمولی)</label>
            <label class="option-chip"><input type="radio" name="size-fabric" value="elastic"> کشسان (پارچه‌ی کشی)</label>
          </div>
        </div>
        <div class="size-live-preview" id="size-live-preview" hidden>سایز پیشنهادی: <strong id="size-live-preview-value"></strong></div>
        <span class="form-error" id="size-form-error"></span>
        <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-ruler-combined"></i> محاسبه و ذخیره‌ی سایز</button>
      </form>
    </div>
    <div class="size-profile-list" id="size-profile-list"></div>
  `;

  renderSizeProfileList(profiles);
  document.getElementById('size-form').addEventListener('submit', handleSizeFormSubmit);
  wireSizeLivePreview();
}

/* منطق چارت سایز استورفرانت — دقیقاً هم‌راستا با calcSuggestedSize سمت سرور (server/routes/api.js) */
const SIZE_CHART_CLIENT = [
  { size: 'S', chest: [82, 86], waist: [62, 66], hip: [87, 91] },
  { size: 'M', chest: [86, 90], waist: [66, 70], hip: [91, 95] },
  { size: 'L', chest: [90, 94], waist: [70, 74], hip: [95, 99] },
  { size: 'XL', chest: [94, 100], waist: [74, 80], hip: [99, 105] },
  { size: '2XL', chest: [100, 106], waist: [80, 86], hip: [105, 111] },
];
const ELASTIC_TOLERANCE_CM_CLIENT = 3;

function nearestSizeForMeasurementClient(value, key, elastic) {
  const adjusted = elastic ? value - ELASTIC_TOLERANCE_CM_CLIENT : value;
  let best = SIZE_CHART_CLIENT[0].size;
  let bestDistance = Infinity;
  SIZE_CHART_CLIENT.forEach(row => {
    const [min, max] = row[key];
    const distance = adjusted < min ? min - adjusted : adjusted > max ? adjusted - max : 0;
    if (distance < bestDistance) { bestDistance = distance; best = row.size; }
  });
  return best;
}

function calcSuggestedSizeClient(chest, waist, hip, elastic) {
  const order = SIZE_CHART_CLIENT.map(r => r.size);
  const candidates = [
    nearestSizeForMeasurementClient(chest, 'chest', elastic),
    nearestSizeForMeasurementClient(waist, 'waist', elastic),
    nearestSizeForMeasurementClient(hip, 'hip', elastic),
  ].map(size => order.indexOf(size)).sort((a, b) => a - b);
  return order[candidates[1]];
}

function wireSizeLivePreview() {
  const chestInput = document.getElementById('size-chest');
  const waistInput = document.getElementById('size-waist');
  const hipInput = document.getElementById('size-hip');
  const preview = document.getElementById('size-live-preview');
  const previewValue = document.getElementById('size-live-preview-value');

  function update() {
    const chest = Number(chestInput.value);
    const waist = Number(waistInput.value);
    const hip = Number(hipInput.value);
    if (!chest || !waist || !hip) { preview.hidden = true; return; }
    const elastic = document.querySelector('input[name="size-fabric"]:checked')?.value === 'elastic';
    previewValue.textContent = calcSuggestedSizeClient(chest, waist, hip, elastic);
    preview.hidden = false;
  }

  [chestInput, waistInput, hipInput].forEach(el => el.addEventListener('input', update));
  document.querySelectorAll('input[name="size-fabric"]').forEach(el => el.addEventListener('change', update));
}

function renderSizeProfileList(profiles) {
  const list = document.getElementById('size-profile-list');
  if (!list) return;
  if (!profiles.length) {
    list.innerHTML = '<p class="account-guard">هنوز سایزی ذخیره نکردی.</p>';
    return;
  }
  list.innerHTML = profiles.map(p => `
    <div class="size-profile-card" data-id="${p.id}">
      <div class="size-profile-info">
        <strong>${p.label}</strong>
        <span>قد ${p.height || '—'} / وزن ${p.weight || '—'} / سینه ${p.chest} / کمر ${p.waist} / باسن ${p.hip} / پارچه‌ی ${p.fabricType === 'elastic' ? 'کشسان' : 'غیرکشسان'}</span>
      </div>
      <span class="size-profile-badge">سایز ${p.suggestedSize}</span>
      <button class="icon-btn size-profile-delete" data-id="${p.id}" aria-label="حذف">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.size-profile-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/me/sizes/${btn.dataset.id}`, { method: 'DELETE' });
      renderSizesPage();
    });
  });
}

async function handleSizeFormSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('size-form-error');
  const payload = {
    label: document.getElementById('size-label').value.trim(),
    height: document.getElementById('size-height').value,
    weight: document.getElementById('size-weight').value,
    chest: document.getElementById('size-chest').value,
    waist: document.getElementById('size-waist').value,
    hip: document.getElementById('size-hip').value,
    fabricType: document.querySelector('input[name="size-fabric"]:checked')?.value || 'non-elastic',
  };
  if (!payload.label || !payload.chest || !payload.waist || !payload.hip) {
    errorEl.textContent = 'لطفاً موارد ستاره‌دار رو کامل کن';
    return;
  }
  const res = await fetch('/api/me/sizes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    errorEl.textContent = 'ذخیره‌ی سایز با خطا مواجه شد';
    return;
  }
  showToast('سایز با موفقیت ذخیره شد');
  renderSizesPage();
}

/* ---------- 15f. صفحه‌ی پروفایل کاربری ---------- */
async function renderProfilePage() {
  const root = document.getElementById('profile-content');
  if (!root) return;

  if (!CURRENT_USER) {
    root.innerHTML = accountGuardHTML('برای مدیریت پروفایل باید اول وارد حساب کاربری بشی.');
    wireAccountGuard(root);
    return;
  }

  const u = CURRENT_USER;
  root.innerHTML = `
    <div class="profile-form">
      <div class="avatar-upload">
        <div class="avatar-preview" id="avatar-preview">
          ${u.avatarUrl ? `<img src="/${u.avatarUrl}" alt="تصویر پروفایل">` : '<i class="fa-solid fa-user"></i>'}
        </div>
        <div>
          <input type="file" id="avatar-input" accept="image/png,image/jpeg,image/webp" hidden>
          <button type="button" class="btn btn-ghost" id="avatar-upload-btn"><i class="fa-solid fa-camera"></i> تغییر تصویر</button>
          <span class="form-hint">حداکثر حجم فایل: ۳۰ مگابایت</span>
        </div>
      </div>
      <div class="upload-progress" id="avatar-upload-progress" hidden></div>
      <form id="profile-form-el" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="pf-first-name">نام</label>
            <input type="text" id="pf-first-name" value="${u.firstName || ''}" ${u.firstName ? 'readonly' : ''}>
            ${u.firstName ? '<span class="form-hint">نام یک‌بار ثبت می‌شه و قابل تغییر نیست.</span>' : ''}
          </div>
          <div class="form-group">
            <label for="pf-last-name">نام‌خانوادگی</label>
            <input type="text" id="pf-last-name" value="${u.lastName || ''}" ${u.lastName ? 'readonly' : ''}>
            ${u.lastName ? '<span class="form-hint">نام‌خانوادگی یک‌بار ثبت می‌شه و قابل تغییر نیست.</span>' : ''}
          </div>
        </div>
        <div class="form-group">
          <label for="pf-phone">شماره موبایل</label>
          <input type="tel" id="pf-phone" value="${u.phone}" disabled>
          <span class="form-hint">شماره موبایل همون شناسه‌ی ورودته و قابل تغییر نیست.</span>
        </div>
        <div class="form-group">
          <label for="pf-address">آدرس</label>
          <textarea id="pf-address" rows="2">${u.address || ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="pf-province">استان</label>
            <input type="text" id="pf-province" readonly data-popup="province" data-city-target="#pf-city" value="${u.province || ''}" data-selected-value="${u.province || ''}">
          </div>
          <div class="form-group">
            <label for="pf-city">شهر</label>
            <input type="text" id="pf-city" readonly data-popup="city" data-province-target="#pf-province" value="${u.city || ''}" data-selected-value="${u.city || ''}">
          </div>
        </div>
        <div class="form-group">
          <label for="pf-postal-code">کد پستی</label>
          <input type="text" id="pf-postal-code" value="${u.postalCode || ''}">
        </div>
        <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-floppy-disk"></i> ذخیره‌ی تغییرات</button>
      </form>
    </div>
  `;

  document.getElementById('profile-form-el').addEventListener('submit', handleProfileFormSubmit);
  document.getElementById('avatar-upload-btn').addEventListener('click', () => document.getElementById('avatar-input').click());
  document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);
}

async function handleProfileFormSubmit(e) {
  e.preventDefault();
  const payload = {
    firstName: document.getElementById('pf-first-name').value.trim(),
    lastName: document.getElementById('pf-last-name').value.trim(),
    address: document.getElementById('pf-address').value.trim(),
    province: document.getElementById('pf-province').value.trim(),
    city: document.getElementById('pf-city').value.trim(),
    postalCode: document.getElementById('pf-postal-code').value.trim(),
  };
  const res = await fetch('/api/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { showToast('ذخیره‌ی پروفایل با خطا مواجه شد'); return; }
  const data = await res.json();
  CURRENT_USER = data.user;
  renderAccountMenu();
  showToast('پروفایل با موفقیت به‌روزرسانی شد');
}

/* آپلود فایل با نمایش پیشرفت (fetch پیشرفت آپلود نمی‌ده، برای همین از XHR استفاده می‌کنیم) */
function uploadFileWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
      }
    });
    xhr.addEventListener('load', () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch (err) { /* پاسخ JSON نبود */ }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    });
    xhr.addEventListener('error', () => reject(new Error('network_error')));
    xhr.send(formData);
  });
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function renderUploadProgress(el, { loaded, total, percent }) {
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `
    <div class="upload-progress-bar"><span style="width:${percent}%"></span></div>
    <span class="upload-progress-label">${formatMB(loaded)} از ${formatMB(total)} مگابایت آپلود شد (${formatMB(total - loaded)} مگابایت باقی‌مانده) — ${percent}٪</span>
  `;
}

async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);
  const progressEl = document.getElementById('avatar-upload-progress');
  const { ok, data } = await uploadFileWithProgress('/api/me/avatar', formData, p => renderUploadProgress(progressEl, p));
  if (progressEl) progressEl.hidden = true;
  if (!ok) { showToast('آپلود تصویر با خطا مواجه شد'); return; }
  CURRENT_USER = data.user;
  renderProfilePage();
  renderAccountMenu();
  showToast('تصویر پروفایل به‌روزرسانی شد');
}

/* ---------- 15g. صفحه‌ی پیگیری سفارش ---------- */
/* کاربر لاگین‌شده: خودکار همه‌ی سفارش‌هاش به‌شکل stepper رندر می‌شه (بدون نیاز به کد/شماره).
   کاربر مهمان (لاگین‌نشده): فرم کد سفارش + شماره‌ی قبلی دقیقاً مثل قبل کار می‌کنه. */
async function renderTrackTab() {
  const autoEl = document.getElementById('track-auto-content');
  const guestForm = document.getElementById('track-guest-form');
  if (!autoEl || !guestForm) return;

  if (!CURRENT_USER) {
    autoEl.hidden = true;
    guestForm.hidden = false;
    return;
  }

  guestForm.hidden = true;
  autoEl.hidden = false;
  autoEl.innerHTML = '<p class="account-guard">در حال بارگذاری سفارش‌ها...</p>';

  const res = await fetch('/api/me/orders');
  const orders = res.ok ? await res.json() : [];

  if (!orders.length) {
    autoEl.innerHTML = '<p class="account-guard">هنوز سفارشی از این حساب ثبت نشده.</p>';
    return;
  }

  autoEl.innerHTML = orders.map(o => {
    const lastDoneIndex = o.timeline.reduce((acc, t, i) => (t.done ? i : acc), -1);
    return `
    <div class="track-order-card">
      <div class="track-order-header">
        <strong>سفارش #${o.code}</strong>
        <span>${new Date(o.createdAt).toLocaleDateString('fa-IR')} · ${formatPrice(o.total)}</span>
      </div>
      <div class="track-timeline">
        ${o.timeline.map((t, i) => `
          <div class="track-step ${t.done ? 'done' : ''} track-step-reveal" style="transition-delay:${i * 90}ms">
            <span class="track-step-dot ${i === lastDoneIndex ? 'is-current' : ''}"></span>
            <span>${t.label}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');

  requestAnimationFrame(() => {
    autoEl.querySelectorAll('.track-step-reveal').forEach(el => el.classList.add('is-visible'));
  });
}

async function handleTrackFormSubmit(e) {
  e.preventDefault();
  const code = document.getElementById('track-code-input').value.trim();
  const phone = document.getElementById('track-phone-input').value.trim();
  const codeError = document.getElementById('track-code-error');
  const phoneError = document.getElementById('track-phone-error');
  codeError.textContent = '';
  phoneError.textContent = '';

  if (!code) { codeError.textContent = 'کد سفارش رو وارد کن'; return; }
  if (!/^0\d{10}$/.test(phone)) { phoneError.textContent = 'شماره موبایل معتبر وارد کن'; return; }

  const resultEl = document.getElementById('track-result');
  const res = await fetch(`/api/orders/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`);

  if (!res.ok) {
    resultEl.innerHTML = '<p class="track-not-found">سفارشی با این مشخصات پیدا نشد. کد سفارش و شماره موبایل رو دوباره چک کن.</p>';
    return;
  }
  const { timeline } = await res.json();
  resultEl.innerHTML = `<div class="track-timeline">${timeline.map(t => `
    <div class="track-step ${t.done ? 'done' : ''}">
      <span class="track-step-dot"></span>
      <span>${t.label}</span>
    </div>
  `).join('')}</div>`;
}

/* هر صفحه‌ی حساب کاربری که در DOM حاضر باشه رو رفرش می‌کنه (بعد از ورود موفق OTP) */
function renderAccountPages() {
  renderOrdersPage();
  renderSizesPage();
  renderProfilePage();
}

/* ---------- 15h. تب‌های حساب کاربری (پروفایل/سفارش‌ها/پیگیری در یک صفحه‌ی مشترک) ---------- */
const ACCOUNT_TAB_PATHS = { profile: '/account/profile', orders: '/account/orders', track: '/track' };
const ACCOUNT_TAB_META = {
  profile: { heading: 'پروفایل کاربری', subtitle: 'اطلاعات تماس و آدرس تحویل سفارش رو این‌جا به‌روز نگه دار' },
  orders: { heading: 'سفارش‌های من', subtitle: 'لیست سفارش‌هایی که با این شماره موبایل ثبت کردی' },
  track: { heading: 'پیگیری سفارش', subtitle: 'کد سفارش و شماره موبایلی که موقع ثبت سفارش وارد کردی رو بزن تا وضعیتش رو ببینی' },
};

function getAccountTabFromPath(path) {
  return Object.keys(ACCOUNT_TAB_PATHS).find(tab => ACCOUNT_TAB_PATHS[tab] === path) || null;
}

function switchAccountTab(tab, { pushState = true } = {}) {
  document.querySelectorAll('.account-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  ['profile', 'orders', 'track'].forEach(t => {
    document.getElementById(`tab-panel-${t}`).hidden = t !== tab;
  });

  const meta = ACCOUNT_TAB_META[tab];
  document.getElementById('account-page-heading').textContent = meta.heading;
  document.getElementById('account-page-subtitle').textContent = meta.subtitle;
  document.title = `${meta.heading} | Storefront`;

  if (pushState) history.pushState({ tab }, '', ACCOUNT_TAB_PATHS[tab]);

  if (tab === 'orders') renderOrdersPage();
  if (tab === 'profile') renderProfilePage();
  if (tab === 'track') renderTrackTab();
}

function initAccountTabs() {
  const tabsEl = document.getElementById('account-tabs');
  if (!tabsEl) return;

  tabsEl.querySelectorAll('.account-tab').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchAccountTab(link.dataset.tab);
    });
  });

  window.addEventListener('popstate', () => {
    switchAccountTab(getAccountTabFromPath(location.pathname) || 'profile', { pushState: false });
  });

  switchAccountTab(getAccountTabFromPath(location.pathname) || 'profile', { pushState: false });
}

/* ---------- 14. راه‌اندازی ---------- */
async function init() {
  initTheme();
  initColorPreset();
  syncColorPreset();
  initTopBanner();
  initScrollReveal();
  initPageLoadBar();
  document.getElementById('footer-year').textContent = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());
  markCachedImagesLoaded(document);
  showInitialSkeletons();

  await loadCatalog();
  await checkAuth();

  renderHeroSlider();
  initHeroDemo();
  renderDeals();
  startDealsCountdown();
  renderCategories();
  renderHeaderCategoryMenu();
  renderFilterSidebar();
  renderProducts();
  applyCategoryFromQuery();
  renderCategoryPage();
  initCategoryPage();
  renderNewArrivals();
  renderBestsellers();
  renderPickyPicks();
  renderFaqTabs();
  renderFaqList();
  renderProductDetail();
  renderCart();
  renderAccountMenu();
  renderAccountPages();
  initAccountTabs();
  initScrollSpy();
  initContactBar();

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('cart-open-btn').addEventListener('click', openCart);
  document.getElementById('cart-close-btn').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', closeCart);
  document.getElementById('cart-clear-btn')?.addEventListener('click', clearCart);
  document.getElementById('hamburger-btn').addEventListener('click', toggleMobileMenu);
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.id !== 'nav-categories-toggle') link.addEventListener('click', closeMobileMenu);
  });
  initHeaderCategoryMenu();

  document.getElementById('search-open-btn').addEventListener('click', openSearch);
  document.getElementById('search-close-btn').addEventListener('click', closeSearch);
  document.getElementById('search-overlay').addEventListener('click', closeSearch);
  document.getElementById('search-input').addEventListener('input', e => renderSearchResults(e.target.value));

  const filterMobileOpenBtn = document.getElementById('filter-mobile-open-btn');
  if (filterMobileOpenBtn) {
    filterMobileOpenBtn.addEventListener('click', openFilterSidebar);
    document.getElementById('filter-mobile-close-btn').addEventListener('click', closeFilterSidebar);
    document.getElementById('filter-overlay').addEventListener('click', closeFilterSidebar);
    document.getElementById('filter-instock-only').addEventListener('change', e => {
      productFilters.inStockOnly = e.target.checked;
      saveProductFilters();
      paginationState.products.page = 1;
      renderProducts();
    });
    document.getElementById('filter-search-input').addEventListener('input', e => {
      productFilterSearch = e.target.value;
      paginationState.products.page = 1;
      renderProducts();
    });
    document.getElementById('filter-reset-btn').addEventListener('click', () => {
      productFilters = { categories: [], inStockOnly: false, colors: [], badges: [] };
      productFilterSearch = '';
      document.getElementById('filter-search-input').value = '';
      saveProductFilters();
      paginationState.products.page = 1;
      renderFilterSidebar();
      renderProducts();
      updateCategoryGridActiveState();
    });
  }

  document.getElementById('checkout-open-btn').addEventListener('click', openCheckout);
  initCheckoutPage();

  document.getElementById('account-open-btn').addEventListener('click', e => {
    e.stopPropagation();
    toggleAccountDropdown();
  });
  document.addEventListener('click', e => {
    const menu = document.querySelector('.account-menu');
    if (menu && !menu.contains(e.target)) closeAccountDropdown();
  });
  document.getElementById('otp-close-btn').addEventListener('click', closeOtpModal);
  document.getElementById('otp-phone-form').addEventListener('submit', handleOtpPhoneSubmit);
  document.getElementById('otp-code-form').addEventListener('submit', handleOtpCodeSubmit);
  document.getElementById('otp-change-phone-btn').addEventListener('click', () => {
    document.getElementById('otp-phone-view').hidden = false;
    document.getElementById('otp-code-view').hidden = true;
  });

  const trackForm = document.getElementById('track-form');
  if (trackForm) trackForm.addEventListener('submit', handleTrackFormSubmit);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCart();
      closeSearch();
      closeOtpModal();
      closeAccountDropdown();
      if (document.getElementById('filter-mobile-open-btn')) closeFilterSidebar();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
