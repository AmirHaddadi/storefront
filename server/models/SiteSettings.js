'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const COLOR_PRESETS = ['violet', 'rose', 'emerald', 'sunset'];

/* یک سند تک‌نمونه‌ای (singleton) برای تنظیمات کلی ظاهر سایت — فعلاً فقط پریست رنگی،
   بعداً می‌تونه محل تنظیمات مشترک دیگه‌ی سایت هم بشه. */
const siteSettingsSchema = new mongoose.Schema({
  colorPreset: { type: String, enum: COLOR_PRESETS, default: 'violet' },
  // اطلاعات کارت به کارت اختصاصی — تنها روش پرداخت سایت، از پنل ادمین قابل تغییره
  cardToCardNumber: { type: String, default: '' },
  cardToCardHolder: { type: String, default: '' },
  cardToCardBank: { type: String, default: '' },
}, { timestamps: true });

applyIdJson(siteSettingsSchema);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
SiteSettings.COLOR_PRESETS = COLOR_PRESETS;

SiteSettings.getSingleton = async function getSingleton() {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  return settings;
};

module.exports = SiteSettings;
