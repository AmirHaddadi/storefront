'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

/* روی بیشتر هاست‌های مبتنی‌بر کانتینر، فضای فایل با هر دیپلوی/ری‌استارت از صفر ساخته می‌شه؛
   پس هرچی در زمان اجرا داخل مسیر کد (public-html/...) نوشته بشه با دیپلوی بعدی پاک می‌شه.
   UPLOADS_ROOT این مسیر رو قابل تنظیم می‌کنه تا بشه یک دیسک/Volume پایدار بهش داد. در نبود این
   متغیر محیطی، رفتار پیش‌فرض (مسیر داخل ریپو، مناسب توسعه‌ی محلی) حفظ می‌شه. همین مقدار در
   app.js برای سرو استاتیک فایل‌های آپلودی هم استفاده می‌شه. */
const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(__dirname, '..', '..', 'public-html', 'assets', 'uploads');

const AVATAR_DIR = path.join(UPLOADS_ROOT, 'avatars');
const RECEIPT_DIR = path.join(UPLOADS_ROOT, 'receipts');
const PRODUCT_DIR = path.join(UPLOADS_ROOT, 'products');
const HERO_DIR = path.join(UPLOADS_ROOT, 'hero');
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(RECEIPT_DIR, { recursive: true });
fs.mkdirSync(PRODUCT_DIR, { recursive: true });
fs.mkdirSync(HERO_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(new Error('invalid_file_type'));
  }
  cb(null, true);
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // ۳۰ مگابایت

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
});

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
});

/* تصاویر محصول به‌صورت in-memory گرفته می‌شن (نه مستقیم روی دیسک) چون قبل از
   ذخیره باید با sharp به webp تبدیل بشن — دیسک‌نویسی مستقیم multer این فرصت رو نمی‌داد. */
const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
});

/* هر عکسی که ادمین برای محصول آپلود می‌کنه (از پنل وب یا ربات تلگرام) قبل از ذخیره
   روی دیسک به webp تبدیل می‌شه تا حجم و سرعت بارگذاری سمت کاربر بهینه بمونه. */
async function saveProductImageWebp(buffer) {
  const filename = `product-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
  const webpBuffer = await sharp(buffer).webp({ quality: 82 }).toBuffer();
  await fs.promises.writeFile(path.join(PRODUCT_DIR, filename), webpBuffer);
  return `/assets/uploads/products/${filename}`;
}

/* تصاویر هیرو معمولاً عریض و سنگین‌اند؛ علاوه بر تبدیل webp، عرض رو به حداکثر ۱۹۲۰px
   محدود می‌کنیم (بدون بزرگ‌نمایی تصاویر کوچیک‌تر) تا حجم صفحه‌ی اصلی سبک بمونه. */
async function saveHeroImageWebp(buffer) {
  const filename = `hero-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;
  const webpBuffer = await sharp(buffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await fs.promises.writeFile(path.join(HERO_DIR, filename), webpBuffer);
  return `/assets/uploads/hero/${filename}`;
}

const uploadHeroImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter,
});

module.exports = {
  uploadAvatar, uploadReceipt, uploadProductImage, saveProductImageWebp,
  uploadHeroImage, saveHeroImageWebp,
  UPLOADS_ROOT,
};
