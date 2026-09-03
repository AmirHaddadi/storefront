'use strict';

const mongoose = require('mongoose');

/* حافظه‌ی state ویزاردهای چندمرحله‌ای ربات ادمین در تلگرام (مثلاً افزودن محصول) —
   عمداً در Mongo نگه‌داری می‌شه چون بیشتر هاست‌ها پروسه را با هر دیپلوی/ری‌استارت از نو می‌سازند
   و state نباید با هر ری‌استارت گم بشه. سندهای بلااستفاده بعد از ۲۴ ساعت خودکار پاک می‌شن. */
const telegramBotSessionSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  step: { type: String, default: null },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  menuStack: { type: [String], default: [] },
}, { timestamps: true });

telegramBotSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('TelegramBotSession', telegramBotSessionSchema);
