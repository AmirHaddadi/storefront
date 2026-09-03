'use strict';

/* ---------------------------------------------------------------------------
 * Seed script — populates the database with neutral demo data.
 *
 *   npm run seed         # idempotent: upserts demo categories / colors /
 *                        # hero slides, inserts demo products only if none
 *                        # exist, creates the first super-admin if none exists.
 *   npm run seed:reset   # wipes products / categories / coupons / hero slides
 *                        # first, then re-seeds from scratch.
 *
 * All data here is fictional. Replace it with your own catalog from the admin
 * panel (or by editing this file).
 * ------------------------------------------------------------------------- */

require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDB } = require('../lib/db');
const { hashToken } = require('../lib/adminAuth');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Color = require('../models/Color');
const HeroSlide = require('../models/HeroSlide');
const Admin = require('../models/Admin');

const RESET = process.argv.includes('--reset');

const CAT_IMG = '/assets/images/categories/category-casual.webp';

/* دسته‌بندی‌های نمونه — عمومی و چنددامنه‌ای. ساختار parent اجازه‌ی زیرمجموعه می‌ده. */
const CATEGORIES = [
  { id: 'electronics', name: 'الکترونیک', image: CAT_IMG, parent: null, description: 'گجت‌ها و لوازم الکترونیکی نمونه.' },
  { id: 'home', name: 'خانه و آشپزخانه', image: CAT_IMG, parent: null, description: 'لوازم خانه و آشپزخانه نمونه.' },
  { id: 'apparel', name: 'پوشاک', image: CAT_IMG, parent: null, description: 'پوشاک نمونه با پشتیبانی از رنگ و سایز.' },
  { id: 'apparel-tops', name: 'بالاتنه', image: CAT_IMG, parent: 'apparel' },
  { id: 'apparel-bottoms', name: 'پایین‌تنه', image: CAT_IMG, parent: 'apparel' },
  { id: 'accessories', name: 'لوازم جانبی', image: CAT_IMG, parent: null, description: 'اکسسوری و لوازم جانبی نمونه.' },
];

/* پالت رنگ پایه — ادمین از پنل با سلکتور RGB می‌تونه رنگ جدید هم اضافه کنه. */
const COLORS = [
  { name: 'مشکی', hex: '#1C1C1C' }, { name: 'سفید', hex: '#FFFFFF' },
  { name: 'خاکستری', hex: '#8C8C8C' }, { name: 'نقره‌ای', hex: '#B8BCC2' },
  { name: 'سرمه‌ای', hex: '#1B2A4A' }, { name: 'آبی', hex: '#2F6FB0' },
  { name: 'فیروزه‌ای', hex: '#2F9BA6' }, { name: 'سبز', hex: '#3E7D4C' },
  { name: 'زرد', hex: '#E0C23A' }, { name: 'نارنجی', hex: '#E08A3C' },
  { name: 'قرمز', hex: '#A3243A' }, { name: 'صورتی', hex: '#E08BC0' },
  { name: 'بنفش', hex: '#6A2D8F' }, { name: 'قهوه‌ای', hex: '#6B4A35' },
  { name: 'بژ', hex: '#D8C6A8' }, { name: 'طلایی', hex: '#C9A227' },
];

const P = n => `/assets/images/products/product-${String(n).padStart(2, '0')}.webp`;

/* محصولات نمونه — چند حالت مختلف را نشان می‌دهند: موجودی ساده، تخفیف درصدی/مبلغی،
   پرفروش، محصول جدید، و محصول دارای واریانت رنگ/سایز. */
const PRODUCTS = [
  {
    code: '1001', name: 'هدفون بی‌سیم نمونه', category: 'electronics',
    description: 'یک محصول نمونه برای نمایش صفحه‌ی محصول و سبد خرید.',
    price: 1800000, images: [P(1), P(2)], material: 'پلاستیک و فلز',
    stockQty: 25, bestseller: true,
  },
  {
    code: '1002', name: 'اسپیکر رومیزی نمونه', category: 'electronics',
    description: 'محصول نمونه با تخفیف درصدی فعال.',
    price: 2400000, images: [P(3)], stockQty: 12,
    discountType: 'percent', discountValue: 15, discountBasis: 'time',
  },
  {
    code: '1003', name: 'کتری برقی نمونه', category: 'home',
    description: 'محصول نمونه با موجودی محدود.',
    price: 990000, images: [P(4)], stockQty: 6, isNewArrival: true,
  },
  {
    code: '1004', name: 'ست ظرف نگهدارنده نمونه', category: 'home',
    description: 'محصول نمونه با تخفیف مبلغی ثابت.',
    price: 650000, images: [P(5)], stockQty: 40,
    discountType: 'fixed', discountValue: 100000, discountBasis: 'time',
  },
  {
    code: '1005', name: 'تی‌شرت پایه نمونه', category: 'apparel-tops',
    description: 'محصول نمونه‌ی دارای واریانت رنگ و سایز.',
    price: 420000, images: [P(6), P(7)], material: 'پنبه',
    colors: [
      { id: 'مشکی', name: 'مشکی', hex: '#1C1C1C' },
      { id: 'سفید', name: 'سفید', hex: '#FFFFFF' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    variants: [
      { colorId: 'مشکی', size: 'S', stockQty: 5 }, { colorId: 'مشکی', size: 'M', stockQty: 8 },
      { colorId: 'مشکی', size: 'L', stockQty: 6 }, { colorId: 'مشکی', size: 'XL', stockQty: 3 },
      { colorId: 'سفید', size: 'S', stockQty: 4 }, { colorId: 'سفید', size: 'M', stockQty: 7 },
      { colorId: 'سفید', size: 'L', stockQty: 5 }, { colorId: 'سفید', size: 'XL', stockQty: 2 },
    ],
  },
  {
    code: '1006', name: 'شلوار راسته نمونه', category: 'apparel-bottoms',
    description: 'محصول نمونه با سایزبندی عددی.',
    price: 780000, images: [P(8)], material: 'کتان',
    sizes: ['36', '38', '40', '42'], stockQty: 20,
  },
  {
    code: '1007', name: 'کوله‌پشتی روزمره نمونه', category: 'accessories',
    description: 'محصول نمونه‌ی پرفروش.',
    price: 1150000, images: [P(9), P(10)], stockQty: 15, bestseller: true,
    pickyPick: { enabled: true, quote: 'یک انتخاب همه‌کاره برای استفاده‌ی روزمره.' },
  },
  {
    code: '1008', name: 'ساعت مچی مینیمال نمونه', category: 'accessories',
    description: 'محصول نمونه‌ی جدید با تخفیف بر اساس تعداد فروش.',
    price: 1990000, images: [P(11)], stockQty: 30, isNewArrival: true,
    discountType: 'percent', discountValue: 20, discountBasis: 'stock', discountStockQuota: 10,
  },
];

const HERO_SLIDES = [
  {
    imageUrl: '/assets/images/hero/1.webp', order: 0, active: true,
    eyebrow: 'خرید ساده، مطمئن و سریع',
    title: 'به فروشگاه نمونه خوش آمدید',
    subtitle: 'این یک قالب فروشگاه اینترنتی متن‌باز است؛ متن‌ها و محصولات از پنل مدیریت قابل تنظیم‌اند.',
    ctaLabel: 'مشاهده محصولات', ctaLink: '/#products',
  },
  {
    imageUrl: '/assets/images/hero/2.webp', order: 1, active: true,
    eyebrow: 'کاتالوگ کامل',
    title: 'دسته‌بندی، فیلتر و جست‌وجو',
    subtitle: 'محصولات را بر اساس دسته‌بندی، رنگ، سایز و موجودی فیلتر کنید.',
    ctaLabel: 'دسته‌بندی‌ها', ctaLink: '/#categories',
  },
];

const COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, active: true, maxUses: null },
];

async function seedCategoriesColorsHero() {
  if (RESET) {
    await Promise.all([
      Product.deleteMany({}), Category.deleteMany({}),
      Coupon.deleteMany({}), HeroSlide.deleteMany({}),
    ]);
    console.log('[seed] Product / Category / Coupon / HeroSlide collections cleared (--reset).');
  }

  for (const cat of CATEGORIES) {
    // eslint-disable-next-line no-await-in-loop
    await Category.updateOne({ id: cat.id }, { $set: cat }, { upsert: true });
  }
  console.log(`[seed] ${CATEGORIES.length} demo categories upserted.`);

  for (const c of COLORS) {
    // eslint-disable-next-line no-await-in-loop
    await Color.updateOne({ hex: c.hex.toUpperCase() }, { $set: { name: c.name, hex: c.hex.toUpperCase() } }, { upsert: true });
  }
  console.log(`[seed] ${COLORS.length} base colors upserted.`);

  if (await HeroSlide.countDocuments({}) === 0) {
    await HeroSlide.insertMany(HERO_SLIDES);
    console.log(`[seed] ${HERO_SLIDES.length} demo hero slides inserted.`);
  }
}

async function seedProductsAndCoupons() {
  if (await Product.countDocuments({}) === 0) {
    for (const p of PRODUCTS) {
      // eslint-disable-next-line no-await-in-loop
      await Product.create(p);
    }
    console.log(`[seed] ${PRODUCTS.length} demo products inserted.`);
  } else {
    console.log('[seed] Products already exist; no demo products inserted.');
  }

  for (const c of COUPONS) {
    // eslint-disable-next-line no-await-in-loop
    await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
  }
  console.log(`[seed] ${COUPONS.length} demo coupon(s) ensured.`);
}

async function seedInitialAdmin() {
  if (await Admin.countDocuments({}) > 0) {
    console.log('[seed] At least one admin already exists; no new super-admin created.');
    return;
  }

  const rawToken = process.env.INITIAL_ADMIN_TOKEN;
  if (!rawToken) {
    console.warn('[seed] Warning: INITIAL_ADMIN_TOKEN is not set in .env; initial super-admin was not created.');
    return;
  }

  await Admin.create({
    name: 'مدیر فروشگاه',
    tokenHash: hashToken(rawToken),
    permissions: Admin.SECTIONS,
    isSuperAdmin: true,
  });
  console.log('[seed] Initial super-admin created. Login token (= INITIAL_ADMIN_TOKEN):', rawToken);
}

async function main() {
  await connectDB();
  await seedCategoriesColorsHero();
  await seedProductsAndCoupons();
  await seedInitialAdmin();
  await mongoose.disconnect();
  console.log('[seed] Done.');
}

main().catch(err => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
