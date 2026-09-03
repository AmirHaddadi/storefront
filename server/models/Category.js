'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, required: true },
  // شرح کلی که در صفحه‌ی اختصاصی دسته‌بندی (/category/:id) بالای فهرست محصولات نشون داده می‌شه
  description: { type: String, default: '' },
  // اگر ست باشه، این دسته زیرمجموعه‌ی همون id از یک دسته‌ی دیگه (اصلی) است
  parent: { type: String, default: null },
}, { timestamps: true });

applyIdJson(categorySchema);

module.exports = mongoose.model('Category', categorySchema);
