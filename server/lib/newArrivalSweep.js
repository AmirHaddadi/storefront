'use strict';

const Product = require('../models/Product');

/* getPublicView (لحظه‌ی خواندن) خودش «جدید بودن» رو صحیح محاسبه می‌کنه، ولی endpointهای
   ادمین (لیست محصولات/تب «محصولات جدید» در پنل) مستقیم از فیلد خام isNewArrival می‌خونن —
   این sweep دوره‌ای همون فیلد رو هم با واقعیت هماهنگ نگه می‌داره. */
async function sweepExpiredNewArrivals() {
  const cutoff = new Date(Date.now() - Product.NEW_ARRIVAL_WINDOW_MS);
  const result = await Product.updateMany(
    { isNewArrival: true, newArrivalMarkedAt: { $lt: cutoff } },
    { $set: { isNewArrival: false, newArrivalMarkedAt: null } },
  );
  if (result.modifiedCount) {
    console.log(`[new-arrival-sweep] ${result.modifiedCount} محصول از «محصولات جدید» خارج شد (پنجره‌ی ۱۲ روزه تمام شد).`);
  }
  return result.modifiedCount;
}

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // هر ۱ ساعت

function startNewArrivalSweep() {
  sweepExpiredNewArrivals().catch(err => console.error('[new-arrival-sweep] Error:', err));
  setInterval(() => {
    sweepExpiredNewArrivals().catch(err => console.error('[new-arrival-sweep] Error:', err));
  }, SWEEP_INTERVAL_MS);
}

module.exports = { sweepExpiredNewArrivals, startNewArrivalSweep };
