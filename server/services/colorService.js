'use strict';

const Color = require('../models/Color');

async function listColors() {
  return Color.find().sort({ createdAt: 1 });
}

/* اگر رنگی با همین hex از قبل وجود داشته باشه همون برمی‌گرده (بدون رکورد تکراری)،
   وگرنه رنگ جدید ساخته و ذخیره می‌شه تا دفعات بعد نیازی به ساخت مجدد نباشه. */
async function upsertColor({ name, hex }) {
  const normalizedHex = String(hex || '').trim().toUpperCase();
  const existing = await Color.findOne({ hex: normalizedHex });
  if (existing) return existing;
  return Color.create({ name: String(name || '').trim(), hex: normalizedHex });
}

async function deleteColor(id) {
  await Color.deleteOne({ _id: id });
}

module.exports = { listColors, upsertColor, deleteColor };
