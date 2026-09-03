'use strict';

/* برچسب فارسی هر وضعیت سفارش — یک‌جا و مستقل از منطق ارسال/نمایش نگه داشته می‌شه تا
   هم API، هم لایه‌ی نوتیفیکیشن و هم ربات تلگرام از یک منبع واحد استفاده کنن.
   برای چندزبانه‌سازی (فاز بعد) کافیه این نگاشت به لایه‌ی i18n منتقل بشه. */
const ORDER_STATUS_LABELS = {
  awaiting_payment_confirmation: 'در انتظار تایید پرداخت',
  payment_rejected: 'پرداخت رد شد، لطفاً با پشتیبانی تماس بگیرید',
  registered: 'ثبت شد',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال شد',
  delivered: 'تحویل داده شد',
};

module.exports = { ORDER_STATUS_LABELS };
