'use strict';

/* هر مدلی که به کلاینت سریالایز می‌شه از این استفاده می‌کنه تا خروجی JSON
   بجای _id/__v مونگویی، یک فیلد id (رشته‌ای) ساده داشته باشه — سازگار با
   شکل داده‌ای که کلاینت (script.js) از فاز اول انتظارش رو داره. */
function applyIdJson(schema, hiddenFields = []) {
  // اگر خود schema از قبل یک فیلد id تعریف نکرده (مثل Category که id=اسلاگ داره)،
  // یک virtual id (نسخه‌ی رشته‌ای _id) اضافه می‌شه.
  if (!schema.path('id')) {
    schema.virtual('id').get(function () {
      return this._id.toHexString();
    });
  }
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete ret._id;
      hiddenFields.forEach(f => delete ret[f]);
    },
  });
}

module.exports = { applyIdJson };
