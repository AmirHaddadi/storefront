'use strict';

const crypto = require('crypto');
const PageView = require('../models/PageView');

const GUEST_COOKIE = 'sf_visitor';
const GUEST_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // هم‌راستا با TTL خودِ PageView

/* میدل‌ور ثبت بازدید صفحات سمت مشتری — فقط وقتی REPORTS_ENABLED روشنه mount می‌شه
   (server/app.js)، پس هزینه‌ی نوشتن در دیتابیس وقتی فیچر خاموشه صفر است. عمداً بعد از
   static/api/admin mount می‌شه تا فقط صفحات واقعی مشتری (نه دارایی‌های استاتیک، نه API،
   نه پنل ادمین) ثبت بشن؛ ثبت هم fire-and-forget است تا هیچ تاخیری روی پاسخ اصلی نندازه. */
function pageViewTracker(req, res, next) {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/assets')) {
    return next();
  }

  let guestId = req.cookies[GUEST_COOKIE];
  if (!guestId) {
    guestId = crypto.randomUUID();
    res.cookie(GUEST_COOKIE, guestId, { maxAge: GUEST_COOKIE_MAX_AGE_MS, httpOnly: true, sameSite: 'lax' });
  }

  PageView.create({
    path: req.path,
    userId: req.user ? req.user.id : null,
    guestId,
  }).catch(err => console.error('[page-view-tracker] Error:', err.message));

  next();
}

module.exports = { pageViewTracker, GUEST_COOKIE };
