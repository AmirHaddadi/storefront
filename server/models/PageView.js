'use strict';

const mongoose = require('mongoose');

/* یک رکورد به‌ازای هر بار بارگذاری صفحه‌ی سمت مشتری (نه ادمین/API/استاتیک) — برای گزارش
   «چه کاربرانی/چند نفر از سایت بازدید کرده‌اند» (بخش گزارش‌گیری، پشت REPORTS_ENABLED).
   کاربر لاگین‌کرده با userId شناخته می‌شه؛ مهمان با guestId (کوکی sf_visitor). */
const pageViewSchema = new mongoose.Schema({
  path: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  guestId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// همین یک ایندکس هم برای aggregation های بازه‌ی تاریخ (روز/هفته/ماه) در سرویس گزارش‌گیری
// استفاده می‌شه هم به‌عنوان TTL: بعد از ۴۰۰ روز خودکار پاک می‌شه تا این کالکشن نامحدود
// رشد نکنه (بازه‌ی گزارش‌ها معمولاً روز/هفته/ماهه، نگه‌داری بیش از یک سال کافیه)
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model('PageView', pageViewSchema);
