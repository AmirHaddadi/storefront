'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const colorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  hex: { type: String, required: true },
}, { _id: false });

const pickyPickSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  quote: { type: String, default: '' },
}, { _id: false });

// موجودی به تفکیک هر ترکیب رنگ/سایز؛ colorId/size می‌تونن null باشن (مثلاً محصول بی‌سایز یا تک‌رنگ)
const variantSchema = new mongoose.Schema({
  colorId: { type: String, default: null },
  size: { type: String, default: null },
  stockQty: { type: Number, default: 0, min: 0 },
  stockSold: { type: Number, default: 0, min: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, maxlength: 4 },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, index: true },
  description: { type: String, default: '', trim: true },
  price: { type: Number, required: true, min: 0 },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: arr => arr.length >= 1 && arr.length <= 10,
      message: 'A product must have between 1 and 10 images',
    },
  },
  badge: { type: String, default: '' },
  isNewArrival: { type: Boolean, default: false }, // منبع حقیقتِ بخش «محصولات جدید» لندینگ — badge دیگه برای این استفاده نمی‌شه
  // لحظه‌ای که isNewArrival آخرین‌بار از false به true تغییر کرد (ایجاد یا ویرایش دستی)؛
  // مبنای شمارش پنجره‌ی ۱۲ روزه‌ست. فقط در همون لحظه‌ی تغییر وضعیت ست می‌شه، نه در هر
  // ذخیره‌ی دیگه — وگرنه ویرایش قیمت روی محصولی که از قبل «جدید» بوده تایمر رو ریست می‌کرد.
  newArrivalMarkedAt: { type: Date, default: null },
  bestseller: { type: Boolean, default: false },
  inStock: { type: Boolean, default: true },

  // متریال/جنس محصول — یک ویژگی عمومی و اختیاری (مثلاً «پنبه»، «استیل»، «چوب»، ...)
  // که در صورت پر بودن روی صفحه‌ی محصول نمایش داده می‌شه.
  material: { type: String, default: '', trim: true },

  // ردیابی تعداد موجودی: اگر variants پر باشه، موجودی/فروخته‌شده به تفکیک رنگ+سایز محاسبه می‌شه.
  // در غیر این صورت (محصول بدون رنگ/سایز متغیر) همین stockQty/stockSold کلی ملاکه؛
  // اگر stockQty هم null باشه، فقط همون تیک دستی «موجود است» ادمین حاکمه.
  stockQty: { type: Number, default: null, min: 0 },
  stockSold: { type: Number, default: 0, min: 0 },
  variants: { type: [variantSchema], default: [] },

  colors: { type: [colorSchema], default: [] },
  sizes: { type: [String], default: null },

  // تخفیف — لحظه‌ی خواندن چک می‌شه (getPublicView)، بدون نیاز به scheduler جدا.
  // دو مبنای مستقل و انحصاری برای فعال بودن: زمان (بازه‌ی تاریخ) یا موجودی (سهمیه‌ی اولین خریداران).
  discountType: { type: String, enum: ['percent', 'fixed', null], default: null },
  discountValue: { type: Number, default: null },
  discountBasis: { type: String, enum: ['time', 'stock'], default: 'time' },
  discountStartsAt: { type: Date, default: null },
  discountEndsAt: { type: Date, default: null },
  // فقط برای discountBasis === 'stock': تخفیف تا وقتی معتبره که تعداد فروخته‌شده‌ی محصول
  // از این سهمیه کمتر باشه (یعنی برای همین تعداد اول خریدار)؛ بعدش خودکار غیرفعال می‌شه.
  discountStockQuota: { type: Number, default: null, min: 1 },

  // پیشنهاد استورفرانت به افراد سخت‌پسند — مدیریت‌شدنی از پنل ادمین
  pickyPick: { type: pickyPickSchema, default: () => ({}) },
}, { timestamps: true });

applyIdJson(productSchema);

// پنجره‌ی «محصول جدید»: ۱۲ روز از newArrivalMarkedAt. هم اسکریپت بک‌فیل هم sweep دوره‌ای
// از همین ثابت استفاده می‌کنن تا مقدار جایی دوبار تعریف نشه.
const NEW_ARRIVAL_WINDOW_MS = 12 * 24 * 60 * 60 * 1000;

/* هر جا isNewArrival با save() تغییر کنه (مثلاً Product.create وقتی ادمین چک‌باکس «جدید» رو
   می‌زنه) این هوک تایمر رو مدیریت می‌کنه: تازه true شده → مهر زمانی بزن؛ false شده → پاک کن. */
productSchema.pre('save', function () {
  if (this.isModified('isNewArrival')) {
    if (this.isNewArrival) {
      if (!this.newArrivalMarkedAt) this.newArrivalMarkedAt = new Date();
    } else {
      this.newArrivalMarkedAt = null;
    }
  }
});

/* منبع حقیقتِ inStock وقتی محصول ردیابی موجودی داره (stockQty یا variants): همیشه از روی
   باقی‌مونده‌ی واقعی محاسبه می‌شه، نه یک تیک دستی جدا — وگرنه (باگ قبلی) وقتی آخرین واحد
   فروخته می‌شد یا ادمین دستی qty رو صفر می‌کرد، جدول ادمین همچنان «موجود» نشون می‌داد.
   فقط برای محصولات بدون ردیابی موجودی (نه variants نه stockQty) چک‌باکس دستی ادمین حاکمه. */
function computeInStock({ stockQty, stockSold, variants, fallback }) {
  if (variants && variants.length) {
    return variants.some(v => (v.stockQty || 0) - (v.stockSold || 0) > 0);
  }
  if (stockQty != null) {
    return (stockQty - (stockSold || 0)) > 0;
  }
  return fallback;
}

/* هر بار سند از طریق .save() ذخیره می‌شه (ایجاد محصول، یا registerSale هنگام تایید سفارش)،
   اگه ردیابی موجودی داره و qty/sold/variants تغییر کرده، inStock رو دوباره محاسبه می‌کنیم. */
productSchema.pre('save', function () {
  const hasQtyTracking = (this.variants && this.variants.length) || this.stockQty != null;
  if (!hasQtyTracking) return;
  if (this.isNew || this.isModified('stockQty') || this.isModified('stockSold') || this.isModified('variants')) {
    this.inStock = computeInStock({
      stockQty: this.stockQty, stockSold: this.stockSold, variants: this.variants, fallback: this.inStock,
    });
  }
});

/* productService.updateProduct از findByIdAndUpdate استفاده می‌کنه که هوک save رو رد نمی‌کنه؛
   این هوک همون منطق بالا رو برای مسیر ویرایش دستی (چک‌باکس در فرم ادمین) پیاده می‌کنه.
   فقط وقتی کلید isNewArrival واقعاً توی payload باشه دست به تایمر می‌زنیم — یک ویرایش نامرتبط
   (مثلاً قیمت) نباید هیچ اثری روی newArrivalMarkedAt داشته باشه. */
productSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate() || {};
  if (Object.prototype.hasOwnProperty.call(update, 'isNewArrival')) {
    if (update.isNewArrival) {
      const current = await this.model.findOne(this.getQuery()).select('isNewArrival');
      if (!current || !current.isNewArrival) {
        update.newArrivalMarkedAt = new Date();
      }
    } else {
      update.newArrivalMarkedAt = null;
    }
  }

  /* productService.updateProduct (فرم ویرایش ادمین) از findByIdAndUpdate استفاده می‌کنه که
     هوک save رو رد نمی‌کنه؛ این‌جا همون منطق computeInStock رو برای مسیر ویرایش دستی پیاده
     می‌کنیم تا چک‌باکس «موجود است» ادمین دیگه بتونه با qty واقعی ناهماهنگ بمونه. */
  const touchesStock = ['stockQty', 'stockSold', 'variants', 'inStock'].some(k => Object.prototype.hasOwnProperty.call(update, k));
  if (touchesStock) {
    const current = await this.model.findOne(this.getQuery()).select('stockQty stockSold variants inStock');
    if (current) {
      const stockQty = Object.prototype.hasOwnProperty.call(update, 'stockQty') ? update.stockQty : current.stockQty;
      const stockSold = Object.prototype.hasOwnProperty.call(update, 'stockSold') ? update.stockSold : current.stockSold;
      const variants = Object.prototype.hasOwnProperty.call(update, 'variants') ? update.variants : current.variants;
      const hasQtyTracking = (variants && variants.length) || stockQty != null;
      if (hasQtyTracking) {
        update.inStock = computeInStock({ stockQty, stockSold, variants, fallback: current.inStock });
      }
    }
  }
});

/* آیا محصول هنوز داخل پنجره‌ی ۱۲ روزه‌ی «جدید»‌ه؟ هم getPublicView هم sweep دوره‌ای از
   همین متد به‌عنوان تنها منبع حقیقت استفاده می‌کنن. */
productSchema.methods.isNewArrivalActive = function () {
  return Boolean(this.isNewArrival && this.newArrivalMarkedAt
    && (Date.now() - this.newArrivalMarkedAt.getTime()) < NEW_ARRIVAL_WINDOW_MS);
};

/* نمایی که کلاینت مشتری می‌بینه: تنها منبع تخفیف، همین یک مکانیزم (discountType/discountValue)
   هست — قیمت پایه (price) در دیتابیس دست‌نخورده می‌مونه و oldPrice/قیمت نهایی این‌جا لحظه‌ی
   خواندن محاسبه می‌شه، نه در زمان ذخیره. دو مبنای انحصاری برای فعال بودن تخفیف: «زمان» (بازه‌ی
   تاریخ، اختیاری—اگر تنظیم نشده باشه نامحدود فعاله تا ادمین خاموشش کنه) یا «موجودی» (فقط تا
   وقتی معتبره که تعداد فروخته‌شده از سهمیه‌ی discountStockQuota کمتر باشه). endpointهای ادمین
   از این متد استفاده نمی‌کنن (دیتای خام رو برای فرم ویرایش نیاز دارن). */
productSchema.methods.getPublicView = function () {
  const obj = this.toJSON();

  // موجودی/فروخته‌شده رو قبل از محاسبه‌ی تخفیف می‌سنجیم چون تخفیفِ مبتنی‌بر موجودی بهش نیاز داره.
  let totalQty = null;
  let totalSold = 0;
  if (obj.variants && obj.variants.length) {
    totalQty = obj.variants.reduce((s, v) => s + (v.stockQty || 0), 0);
    totalSold = obj.variants.reduce((s, v) => s + (v.stockSold || 0), 0);
    obj.stockPercentSold = totalQty > 0 ? Math.min(100, Math.round((totalSold / totalQty) * 100)) : 100;
    obj.inStock = obj.variants.some(v => (v.stockQty - v.stockSold) > 0);
  } else if (obj.stockQty != null) {
    totalQty = obj.stockQty;
    totalSold = obj.stockSold || 0;
    obj.stockPercentSold = totalQty > 0 ? Math.min(100, Math.round((totalSold / totalQty) * 100)) : 100;
    obj.inStock = (totalQty - totalSold) > 0;
  } else {
    obj.stockPercentSold = null;
  }

  const now = new Date();
  let isActive;
  if (obj.discountBasis === 'stock') {
    isActive = Boolean(obj.discountType && obj.discountValue > 0 && obj.discountStockQuota > 0 && totalSold < obj.discountStockQuota);
    obj.discountStockRemaining = isActive ? Math.max(0, obj.discountStockQuota - totalSold) : null;
  } else {
    const hasDateRange = Boolean(obj.discountStartsAt && obj.discountEndsAt);
    const withinRange = hasDateRange
      ? (new Date(obj.discountStartsAt) <= now && now <= new Date(obj.discountEndsAt))
      : true;
    isActive = Boolean(obj.discountType && obj.discountValue > 0 && withinRange);
    obj.discountStockRemaining = null;
  }

  // منبع حقیقتِ «جدید» isNewArrival + پنجره‌ی ۱۲ روزه‌ی newArrivalMarkedAt هست، نه فقط
  // بولین خام؛ obj.isNewArrival رو با نتیجه‌ی همین چک override می‌کنیم تا فرانت مشتری
  // (که مستقیم روی همین فیلد فیلتر می‌کنه) نیازی به تغییر نداشته باشه.
  const newArrivalActive = this.isNewArrivalActive();
  obj.isNewArrival = newArrivalActive;

  if (isActive) {
    const base = obj.price;
    const discounted = obj.discountType === 'percent'
      ? Math.round(base * (1 - obj.discountValue / 100))
      : Math.round(base - obj.discountValue);
    obj.oldPrice = base;
    obj.price = Math.max(0, discounted);
    obj.badge = 'تخفیف';
  } else {
    obj.oldPrice = null;
    // سرور خودش بج رو ست می‌کنه تا هیچ‌وقت با تایپ دستی ادمین گم/ناهماهنگ نشه.
    if (newArrivalActive) obj.badge = 'جدید';
  }
  obj.discountActive = isActive;

  return obj;
};

/* موجودی واقعاً قابل‌خرید یک ترکیب رنگ/سایز (یا کل محصول اگر variant نداره)؛ برای محصولات
   بدون ردیابی موجودی (نه variants نه stockQty) null برمی‌گردونه یعنی «بدون محدودیت اعلام‌شده».
   هم سمت سبد خرید (جلوگیری از افزودن بیش از موجودی) هم هنگام ثبت سفارش استفاده می‌شه. */
productSchema.statics.getAvailableQty = async function (code, { colorId = null, size = null } = {}) {
  const product = await this.findOne({ code });
  if (!product) return null;

  if (product.variants && product.variants.length) {
    const variant = product.variants.find(v => (v.colorId || null) === (colorId || null) && (v.size || null) === (size || null));
    if (!variant) return 0;
    return Math.max(0, variant.stockQty - variant.stockSold);
  }

  if (product.stockQty == null) return null;
  return Math.max(0, product.stockQty - product.stockSold);
};

/* هر وقت ادمین پرداخت سفارش رو تایید کنه (وضعیت «ثبت‌شده»)، موجودی رو کم می‌کنه: اگر محصول
   variants (رنگ/سایز) داشته باشه دقیقاً همون ترکیب انتخاب‌شده رو کم می‌کنه، وگرنه از موجودی کلی
   قدیمی (stockQty) کم می‌شه. عمداً در لحظه‌ی ثبت سفارش صدا زده نمی‌شه — تا وقتی ادمین پرداخت رو
   تایید نکرده، موجودی نباید رزرو/کم بشه. */
productSchema.statics.registerSale = async function (code, qty, { colorId = null, size = null } = {}) {
  const product = await this.findOne({ code });
  if (!product) return;

  if (product.variants && product.variants.length) {
    const variant = product.variants.find(v => (v.colorId || null) === (colorId || null) && (v.size || null) === (size || null));
    if (!variant) return;
    variant.stockSold = Math.min(variant.stockQty, variant.stockSold + qty);
    if (!product.variants.some(v => (v.stockQty - v.stockSold) > 0)) product.inStock = false;
    await product.save();
    return;
  }

  if (product.stockQty == null) return;
  product.stockSold = Math.min(product.stockQty, product.stockSold + qty);
  if (product.stockQty - product.stockSold <= 0) product.inStock = false;
  await product.save();
};

/* تولید خودکار کد بعدی محصول (حداکثر ۴ رقم عددی)؛ ادمین می‌تونه بعداً دستی ویرایشش کنه. */
productSchema.statics.generateNextCode = async function () {
  const last = await this.find({ code: /^\d{1,4}$/ }).sort({ code: -1 }).limit(50);
  const maxNum = last.reduce((max, p) => Math.max(max, Number(p.code) || 0), 0);
  const next = Math.min(9999, maxNum + 1);
  return String(next).padStart(4, '0');
};

const Product = mongoose.model('Product', productSchema);
Product.NEW_ARRIVAL_WINDOW_MS = NEW_ARRIVAL_WINDOW_MS;

module.exports = Product;
