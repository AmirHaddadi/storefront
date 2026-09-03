'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

/* اسلایدهای هیرو سکشن لندینگ — کاملاً مدیریت‌شدنی از پنل ادمین (جایگزین آرایه‌ی
   هاردکد قبلی در script.js). هر اسلاید هم تصویر و هم متن/CTA خودش را دارد تا ادمین
   کل تجربه‌ی هیرو را کنترل کند، نه فقط عکس. */
const heroSlideSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  imageUrlDark: { type: String, default: '' }, // خالی = در تم تیره هم از imageUrl استفاده می‌شه
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  ctaLabel: { type: String, default: '' },
  ctaLink: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

applyIdJson(heroSlideSchema);

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
