'use strict';

const { ORDER_STATUS_LABELS } = require('../../lib/orderStatus');

function toman(n) {
  return `${Number(n || 0).toLocaleString('fa-IR')} تومان`;
}

function faDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status;
}

/* ترتیب پیش‌فرض پیشرفت سفارش برای دکمه‌ی «تغییر وضعیت سریع» در اعلان‌های تلگرام —
   فقط UI است؛ اعتبارسنجی واقعی همیشه در orderService.changeOrderStatus انجام می‌شود. */
const STATUS_FLOW = ['awaiting_payment_confirmation', 'registered', 'preparing', 'shipped', 'delivered'];
const STATUS_ACTION_LABELS = {
  registered: 'تایید پرداخت',
  preparing: 'شروع آماده‌سازی',
  shipped: 'ثبت ارسال',
  delivered: 'ثبت تحویل',
};

function nextStatus(status) {
  const idx = STATUS_FLOW.indexOf(status);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

module.exports = { toman, faDate, statusLabel, nextStatus, STATUS_FLOW, STATUS_ACTION_LABELS, ORDER_STATUS_LABELS };
