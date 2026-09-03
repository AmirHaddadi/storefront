'use strict';

const Order = require('../models/Order');
const Product = require('../models/Product');
const PageView = require('../models/PageView');
const LoginEvent = require('../models/LoginEvent');

// سفارش «ثبت و پرداخت‌شده» یعنی ادمین پرداختش رو تایید کرده — طبق منطق orderService.changeOrderStatus
// وضعیت registered (و هر وضعیت بعدیِ چرخه) یعنی موجودی هم واقعاً کم شده، پس پرداخت قطعیه.
const PAID_STATUSES = ['registered', 'preparing', 'shipped', 'delivered'];

/* بازه‌ی پیش‌فرض اگر from/to داده نشه: ۳۰ روز اخیر */
function resolveRange({ from, to } = {}) {
  const rangeTo = to ? new Date(to) : new Date();
  const rangeFrom = from ? new Date(from) : new Date(rangeTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: rangeFrom, to: rangeTo };
}

/* گروه‌بندی روزانه‌ی یک کالکشن با $group روی رشته‌ی YYYY-MM-DD (میلادی؛ نمایش شمسی سمت
   کلاینت با jalaali.min.js موجود انجام می‌شه، دقیقاً مثل بقیه‌ی پنل). */
function dayKeyExpr(field) {
  return { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } };
}

async function getVisitStats({ from, to } = {}) {
  const range = resolveRange({ from, to });
  const match = { createdAt: { $gte: range.from, $lte: range.to } };

  const [daily, totals] = await Promise.all([
    PageView.aggregate([
      { $match: match },
      { $group: { _id: { day: dayKeyExpr('createdAt'), visitor: { $ifNull: ['$userId', '$guestId'] } }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.day', views: { $sum: '$count' }, uniqueVisitors: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', views: 1, uniqueVisitors: 1 } },
    ]),
    PageView.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$userId', '$guestId'] } } },
      { $count: 'uniqueVisitors' },
    ]),
  ]);

  const totalViews = daily.reduce((sum, d) => sum + d.views, 0);
  return { daily, totalViews, totalUniqueVisitors: totals[0]?.uniqueVisitors || 0 };
}

async function getLoginStats({ from, to } = {}) {
  const range = resolveRange({ from, to });
  const match = { createdAt: { $gte: range.from, $lte: range.to } };

  const [daily, users] = await Promise.all([
    LoginEvent.aggregate([
      { $match: match },
      { $group: { _id: dayKeyExpr('createdAt'), count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', count: 1 } },
    ]),
    LoginEvent.aggregate([
      { $match: match },
      { $group: { _id: '$userId', phone: { $first: '$phone' }, lastLoginAt: { $max: '$createdAt' }, loginCount: { $sum: 1 } } },
      { $sort: { lastLoginAt: -1 } },
    ]),
  ]);

  const rows = users.map(u => ({ userId: u._id, phone: u.phone, lastLoginAt: u.lastLoginAt, loginCount: u.loginCount }));
  return { daily, totalLogins: daily.reduce((sum, d) => sum + d.count, 0), uniqueUsers: rows.length, rows };
}

async function getPurchaseStats({ from, to } = {}) {
  const range = resolveRange({ from, to });
  const match = { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: PAID_STATUSES } };

  const [daily, buyers] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: dayKeyExpr('createdAt'), orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', orders: 1, revenue: 1 } },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$userId', '$customer.phone'] }, phone: { $first: '$customer.phone' }, name: { $first: '$customer.name' }, orders: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
      { $sort: { totalSpent: -1 } },
    ]),
  ]);

  const rows = buyers.map(b => ({ buyerId: b._id, phone: b.phone, name: b.name, orders: b.orders, totalSpent: b.totalSpent }));
  return {
    daily,
    totalOrders: daily.reduce((sum, d) => sum + d.orders, 0),
    totalRevenue: daily.reduce((sum, d) => sum + d.revenue, 0),
    uniqueBuyers: rows.length,
    rows,
  };
}

async function getNewProductsCount({ from, to } = {}) {
  const range = resolveRange({ from, to });
  return Product.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } });
}

/* محصولات با تخفیف فعال/غیرفعال + زمان یا موجودی باقی‌مانده — همه از طریق getPublicView()
   محاسبه می‌شه (server/models/Product.js) تا منطق «فعال بودن تخفیف» جای دیگه دوباره‌نویسی
   نشه؛ فقط رکوردهایی که اصلاً discountType دارن برمی‌گردن. */
async function getDiscountedProducts() {
  const products = await Product.find({ discountType: { $ne: null } }).sort({ createdAt: -1 });
  const now = Date.now();

  return products.map(p => {
    const view = p.getPublicView();
    let remainingLabel = '—';
    let remainingMs = null;
    if (view.discountActive) {
      if (p.discountBasis === 'stock') {
        remainingLabel = view.discountStockRemaining != null ? `${view.discountStockRemaining} عدد باقی‌مانده` : '—';
      } else if (p.discountEndsAt) {
        remainingMs = Math.max(0, new Date(p.discountEndsAt).getTime() - now);
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        remainingLabel = `${days} روز و ${hours} ساعت`;
      } else {
        remainingLabel = 'نامحدود (تا غیرفعال‌سازی دستی)';
      }
    }
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      discountType: p.discountType,
      discountValue: p.discountValue,
      discountBasis: p.discountBasis,
      discountActive: view.discountActive,
      remainingLabel,
      remainingMs,
    };
  });
}

/* پرفروش‌ترین محصولات در بازه — بر مبنای Order.items واقعی (نه فلگ دستی bestseller ادمین).
   توجه: item.productId همون Product.code هست (نه _id مونگو) — طبق همون کانوانسیونی که
   Product.getAvailableQty/registerSale هم استفاده می‌کنن. */
async function getTopSellingProducts({ from, to, limit = 10 } = {}) {
  const range = resolveRange({ from, to });
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: PAID_STATUSES } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', name: { $first: '$items.name' }, image: { $first: '$items.image' }, qtySold: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
    { $sort: { qtySold: -1 } },
    { $limit: limit },
  ]);

  return rows.map(r => ({ code: r._id, name: r.name, image: r.image, qtySold: r.qtySold, revenue: r.revenue }));
}

module.exports = {
  PAID_STATUSES,
  resolveRange,
  getVisitStats,
  getLoginStats,
  getPurchaseStats,
  getNewProductsCount,
  getDiscountedProducts,
  getTopSellingProducts,
};
