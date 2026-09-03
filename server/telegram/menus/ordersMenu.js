'use strict';

const orderService = require('../../services/orderService');
const Order = require('../../models/Order');
const { requireTelegramPermission } = require('../middlewares/permissionMiddleware');
const { paginate, paginationRow, backRow } = require('../lib/keyboards');
const { editOrReply } = require('./mainMenu');
const { toman, faDate, statusLabel, nextStatus, STATUS_ACTION_LABELS } = require('../lib/format');

const STATUS_FILTERS = [{ value: 'all', label: 'همه' }, ...Order.STATUSES.map(s => ({ value: s, label: statusLabel(s) }))];

function statusFilterKeyboard() {
  const rows = [];
  let row = [];
  STATUS_FILTERS.forEach(f => {
    row.push({ text: f.label, callback_data: `orders:list:${f.value}:1` });
    if (row.length === 2) { rows.push(row); row = []; }
  });
  if (row.length) rows.push(row);
  rows.push(...backRow('menu:main', { withMainMenu: false }));
  return { inline_keyboard: rows };
}

async function showOrdersRoot(ctx) {
  await editOrReply(ctx, '📦 سفارشات — یک وضعیت رو برای فیلتر انتخاب کن:', statusFilterKeyboard());
}

async function showOrdersList(ctx, status, page) {
  const all = await orderService.listOrders();
  const filtered = status === 'all' ? all : all.filter(o => o.status === status);
  const { pageItems, page: safePage, totalPages } = paginate(filtered, page, 5);

  if (!pageItems.length) {
    return editOrReply(ctx, 'سفارشی با این فیلتر پیدا نشد.', { inline_keyboard: backRow('menu:orders') });
  }

  const rows = pageItems.map(o => ([{
    text: `${o.code} — ${o.customer.name || o.customer.phone} — ${statusLabel(o.status)}`,
    callback_data: `order:view:${o.id}`,
  }]));
  rows.push(...paginationRow(safePage, totalPages, p => `orders:list:${status}:${p}`));
  rows.push(...backRow('menu:orders'));

  const filterLabel = STATUS_FILTERS.find(f => f.value === status)?.label || status;
  await editOrReply(ctx, `📦 سفارشات (${filterLabel}) — صفحه ${safePage} از ${totalPages}`, { inline_keyboard: rows });
}

function orderDetailKeyboard(order) {
  const rows = [];
  const next = nextStatus(order.status);
  if (next) rows.push([{ text: `✅ ${STATUS_ACTION_LABELS[next]}`, callback_data: `order:setStatus:${next}:${order.id}` }]);
  if (order.status === 'awaiting_payment_confirmation') {
    rows.push([{ text: '❌ رد پرداخت', callback_data: `order:setStatus:payment_rejected:${order.id}` }]);
  }
  rows.push([{ text: '🔄 انتخاب وضعیت دیگر', callback_data: `order:statusMenu:${order.id}` }]);
  rows.push(...backRow('menu:orders'));
  return { inline_keyboard: rows };
}

async function showOrderDetail(ctx, orderId) {
  const order = await orderService.getOrderById(orderId);
  if (!order) return editOrReply(ctx, 'سفارش پیدا نشد.', { inline_keyboard: backRow('menu:orders') });

  const itemsText = order.items.map(it => `• ${it.name} × ${it.qty}${it.size ? ` (سایز ${it.size})` : ''}`).join('\n');
  const text = [
    `📦 سفارش ${order.code}`,
    `مشتری: ${order.customer.name || '—'} — ${order.customer.phone}`,
    `آدرس: ${order.customer.address || '—'}`,
    `اقلام:\n${itemsText}`,
    `مبلغ نهایی: ${toman(order.total)}`,
    `وضعیت فعلی: ${statusLabel(order.status)}`,
    `رسید کارت‌به‌کارت: ${order.receiptImageUrl ? 'آپلود شده (پیام عکس رو در همین چت ببین)' : 'هنوز آپلود نشده'}`,
    `تاریخ ثبت: ${faDate(order.createdAt)}`,
  ].join('\n');

  await editOrReply(ctx, text, orderDetailKeyboard(order));
}

function orderStatusMenuKeyboard(order) {
  const rows = Order.STATUSES.map(s => ([{
    text: `${s === order.status ? '✅ ' : ''}${statusLabel(s)}`,
    callback_data: `order:setStatus:${s}:${order.id}`,
  }]));
  rows.push([{ text: '🔙 بازگشت به جزئیات سفارش', callback_data: `order:view:${order.id}` }]);
  return { inline_keyboard: rows };
}

function register(bot) {
  bot.action('menu:orders', requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    await showOrdersRoot(ctx);
  });

  bot.action(/^orders:list:(\w+):(\d+)$/, requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    const [, status, page] = ctx.match;
    await showOrdersList(ctx, status, Number(page));
  });

  bot.action(/^order:view:([\w-]+)$/, requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    await showOrderDetail(ctx, ctx.match[1]);
  });

  bot.action(/^order:statusMenu:([\w-]+)$/, requireTelegramPermission('orders'), async ctx => {
    await ctx.answerCbQuery();
    const order = await orderService.getOrderById(ctx.match[1]);
    if (!order) return showOrdersRoot(ctx);
    await editOrReply(ctx, `تغییر وضعیت سفارش ${order.code}:`, orderStatusMenuKeyboard(order));
  });

  bot.action(/^order:setStatus:(\w+):([\w-]+)$/, requireTelegramPermission('orders'), async ctx => {
    const [, status, orderId] = ctx.match;
    const result = await orderService.changeOrderStatus(orderId, status, { excludeAdminId: ctx.state.admin.id });
    if (!result.ok) {
      await ctx.answerCbQuery('خطا در تغییر وضعیت', { show_alert: true });
      return;
    }
    await ctx.answerCbQuery('وضعیت به‌روزرسانی شد');
    await showOrderDetail(ctx, orderId);
  });
}

module.exports = { register };
