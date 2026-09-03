'use strict';

/* یک‌بار در استارتاپ سرور اجرا می‌شه: محصولات قدیمی که فقط فیلد تک‌تصویری
   `image` رو دارن (از قبل از معرفی گالری چندتصویری) به فیلد جدید `images`
   (آرایه) تبدیل می‌کنه. Idempotent — روی دیتابیسی که قبلاً مهاجرت شده هیچ‌کاری
   نمی‌کنه، پس امن اجرا میشه در هر بار بالا اومدن سرور. */

const mongoose = require('mongoose');

async function migrateProductImages() {
  const coll = mongoose.connection.collection('products');
  const cursor = coll.find({ image: { $exists: true } });

  let migrated = 0;
  for await (const doc of cursor) {
    const images = Array.isArray(doc.images) && doc.images.length
      ? doc.images
      : (doc.image ? [doc.image] : []);
    if (!images.length) continue;
    await coll.updateOne({ _id: doc._id }, { $set: { images }, $unset: { image: '' } });
    migrated++;
  }

  if (migrated > 0) {
    console.log(`[migrate] Converted ${migrated} legacy single-image product(s) to the new images[] array.`);
  } else {
    console.log('[migrate] No legacy single-image products found; images[] migration not needed.');
  }
}

module.exports = { migrateProductImages };
