'use strict';

const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/* اگر توکن در .env تنظیم نشده باشه، کل ماژول ربات تلگرام غیرفعال می‌مونه
   (دقیقاً همون الگوی isConfigured در server/lib/sms.js) — بدون توکن هیچ جای
   دیگه‌ی کد نباید کرش کنه، فقط اعلان‌ها/وبهوک بی‌صدا رد می‌شن. */
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

module.exports = bot;
