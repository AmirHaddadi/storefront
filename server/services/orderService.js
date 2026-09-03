'use strict';

const Order = require('../models/Order');
const Product = require('../models/Product');
const { notifyOrderCustomer } = require('../lib/notifier');
const { ORDER_STATUS_LABELS } = require('../lib/orderStatus');
const telegramNotify = require('../telegram/notify');

async function listOrders() {
  return Order.find().sort({ createdAt: -1 });
}

async function getOrderById(id) {
  return Order.findById(id);
}

/* opts.excludeAdminId: وقتی تغییر وضعیت از خودِ ربات تلگرام انجام شده، آن ادمین
   دوباره برای اقدام خودش اعلان نمی‌گیرد؛ وقتی از پنل وب باشد خالی می‌ماند یعنی
   به همه‌ی ادمین‌های دارای دسترسی اطلاع بده. */
async function changeOrderStatus(id, status, opts = {}) {
  if (!Order.STATUSES.includes(status)) return { ok: false, error: 'invalid_status' };

  const order = await Order.findById(id);
  if (!order) return { ok: false, error: 'not_found' };

  const previousStatus = order.status;
  order.status = status;
  if (status !== 'awaiting_payment_confirmation' && !order.confirmedAt) order.confirmedAt = new Date();
  await order.save();

  // موجودی محصول فقط لحظه‌ای که ادمین پرداخت رو تایید می‌کنه (وضعیت «ثبت‌شده») کم می‌شه —
  // نه در لحظه‌ی ثبت سفارش توسط مشتری؛ گارد جلوی کم شدن دوباره‌ی موجودی رو هم می‌گیره اگر
  // ادمین دوباره همین وضعیت رو ثبت کنه.
  if (status === 'registered' && previousStatus !== 'registered') {
    await Promise.all(order.items.map(item => Product.registerSale(item.productId, item.qty, { colorId: item.colorId, size: item.size })));
  }

  notifyOrderCustomer(order.customer.phone, {
    name: order.customer.name,
    code: order.code,
    statusLabel: ORDER_STATUS_LABELS[status] || status,
  });
  telegramNotify.notifyOrderStatusChanged(order, status, opts.excludeAdminId);

  return { ok: true, order };
}

module.exports = { listOrders, getOrderById, changeOrderStatus };
