'use strict';

/* buildCallbackData(pageNumber) -> string؛ هر منو خودش قالب callback_data
   (شامل فیلترهایی مثل status) رو می‌سازه، این تابع فقط چیدمان دکمه‌هاست. */
function paginationRow(page, totalPages, buildCallbackData) {
  if (totalPages <= 1) return [];
  const row = [];
  if (page > 1) row.push({ text: '◀️ قبلی', callback_data: buildCallbackData(page - 1) });
  row.push({ text: `صفحه ${page} از ${totalPages}`, callback_data: 'noop' });
  if (page < totalPages) row.push({ text: 'بعدی ▶️', callback_data: buildCallbackData(page + 1) });
  return [row];
}

function backRow(backCallbackData, { withMainMenu = true } = {}) {
  const row = [{ text: '🔙 بازگشت', callback_data: backCallbackData }];
  if (withMainMenu) row.push({ text: '🏠 منوی اصلی', callback_data: 'menu:main' });
  return [row];
}

function paginate(items, page, pageSize = 5) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), page: safePage, totalPages };
}

module.exports = { paginationRow, backRow, paginate };
