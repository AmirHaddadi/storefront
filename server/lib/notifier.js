'use strict';

/* ---------------------------------------------------------------------------
 * لایه‌ی نوتیفیکیشن قابل‌جایگزین (Notifications module)
 *
 * پیاده‌سازی پیش‌فرض فقط در کنسول لاگ می‌کنه — هیچ سرویس بیرونی/اعتبارنامه‌ای لازم
 * نداره و پروژه بدون هیچ پیکربندی‌ای قابل اجراست. برای اتصال یک ارائه‌دهنده‌ی واقعی
 * (پیامک، ایمیل، push و ...) کافیه توابع همین فایل رو بازنویسی کنی یا از طریق
 * setChannel یک کانال دیگه تزریق کنی؛ بقیه‌ی کد (auth/OTP، سرویس سفارش) فقط با
 * همین امضاها کار می‌کنه و به جزئیات ارائه‌دهنده وابسته نیست.
 *
 * اعلان‌های سمت ادمین جداگانه از طریق ماژول اینتگریشن تلگرام انجام می‌شه
 * (server/telegram/*) و کاملاً اختیاری/env-gated است.
 * ------------------------------------------------------------------------- */

/* eslint-disable no-console */

const consoleChannel = {
  async sendOtp(phone, code) {
    console.log(`[notifier] OTP for ${phone}: ${code}`);
    return { ok: true, dev: true };
  },
  async sendOrderUpdate(phone, { name, code, statusLabel }) {
    console.log(`[notifier] order update -> ${phone} | ${name || '-'} | #${code} | ${statusLabel}`);
    return { ok: true, dev: true };
  },
  async broadcast(message, recipients) {
    console.log(`[notifier] broadcast to ${recipients.length} recipient(s): ${message}`);
    return { ok: true, dev: true, recipients: recipients.length };
  },
};

let channel = consoleChannel;

/* یک کانال سفارشی (مثلاً آداپتور یک ارائه‌دهنده‌ی پیامک) رو جایگزین کانال پیش‌فرض می‌کنه. */
function setChannel(customChannel) {
  channel = { ...consoleChannel, ...customChannel };
}

async function sendOtp(phone, code) {
  return channel.sendOtp(phone, code);
}

async function notifyOrderCustomer(phone, payload) {
  return channel.sendOrderUpdate(phone, payload);
}

async function broadcast(message, recipients) {
  return channel.broadcast(message, recipients);
}

module.exports = { setChannel, sendOtp, notifyOrderCustomer, broadcast };
