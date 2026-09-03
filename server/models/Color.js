'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

/* پالت رنگی مشترک — هم ۲۴ رنگ پایه‌ی اولیه، هم هر رنگ سفارشی که ادمین با
   سلکتور RGB بسازه؛ تا نیازی به ساخت مجدد یک رنگ تکراری نباشه. */
const colorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  hex: { type: String, required: true, uppercase: true, trim: true, unique: true },
}, { timestamps: true });

applyIdJson(colorSchema);

module.exports = mongoose.model('Color', colorSchema);
