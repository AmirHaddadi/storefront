'use strict';

/* فیچرفلگ بخش گزارش‌گیری ادمین — طبق کانوانسیون فعلی پروژه (خالی/نامعتبر = غیرفعال).
   وقتی خاموشه، این بخش باید کاملاً بی‌اثر باشه: نه فقط قفل (مثل RBAC عادی)، بلکه اصلاً
   در پنل دیده نشه و endpointهاش هم ۴۰۴ بدن — روت‌ها/میدل‌ورهایی که این پرچم رو چک می‌کنن
   دقیقاً همین رفتار رو پیاده می‌کنن (server/routes/pages.js, server/routes/adminApi.js). */
const REPORTS_ENABLED = ['on', '1', 'true'].includes(String(process.env.REPORTS_ENABLED || '').trim().toLowerCase());

module.exports = { REPORTS_ENABLED };
