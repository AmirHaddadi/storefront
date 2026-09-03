'use strict';

const Banner = require('../models/Banner');

async function listBanners() {
  return Banner.find().sort({ order: 1, createdAt: 1 });
}

async function createBanner({ text, link, order }) {
  if (!text) return { ok: false, error: 'invalid_input' };
  const banner = await Banner.create({ text: String(text).trim(), link: link || '', order: Number(order) || 0 });
  return { ok: true, banner };
}

async function updateBanner(id, { text, link, order, active }) {
  const update = {};
  if (typeof text === 'string' && text.trim()) update.text = text.trim();
  if (typeof link === 'string') update.link = link;
  if (order !== undefined) update.order = Number(order) || 0;
  if (typeof active === 'boolean') update.active = active;

  return Banner.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
}

async function deleteBanner(id) {
  await Banner.deleteOne({ _id: id });
}

module.exports = { listBanners, createBanner, updateBanner, deleteBanner };
