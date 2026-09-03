'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

/* اسلایدهای بنر شناور بالای سایت — هم برای تبلیغ متنی، هم برای اطلاع‌رسانی تخفیف قابل استفاده‌ست.
   چند اسلاید فعال به‌صورت خودکار توی بنر می‌چرخن. */
const bannerSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  link: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

applyIdJson(bannerSchema);

module.exports = mongoose.model('Banner', bannerSchema);
