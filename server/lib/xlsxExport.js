'use strict';

const ExcelJS = require('exceljs');

/* کمک‌تابع مشترک برای خروجی اکسل همه‌ی گزارش‌ها — از دوباره‌نویسی boilerplate ساخت
   workbook/ستون‌ها/هدر پاسخ در هر route جلوگیری می‌کنه.
   columns: [{ header: 'عنوان فارسی', key: 'fieldName', width? }] */
async function buildWorkbookResponse(res, filename, rows, columns) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('گزارش', { views: [{ rightToLeft: true }] });
  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach(row => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { buildWorkbookResponse };
