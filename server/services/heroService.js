'use strict';

const HeroSlide = require('../models/HeroSlide');

async function listSlides() {
  return HeroSlide.find().sort({ order: 1, createdAt: 1 });
}

async function listActiveSlides() {
  return HeroSlide.find({ active: true }).sort({ order: 1, createdAt: 1 });
}

async function createSlide(payload) {
  const { imageUrl, imageUrlDark, eyebrow, title, subtitle, ctaLabel, ctaLink, order, active } = payload;
  if (!imageUrl) return { ok: false, error: 'invalid_input' };
  const slide = await HeroSlide.create({
    imageUrl,
    imageUrlDark: imageUrlDark || '',
    eyebrow: eyebrow || '',
    title: title || '',
    subtitle: subtitle || '',
    ctaLabel: ctaLabel || '',
    ctaLink: ctaLink || '',
    order: Number(order) || 0,
    active: active !== false,
  });
  return { ok: true, slide };
}

async function updateSlide(id, payload) {
  const update = {};
  const stringFields = ['imageUrl', 'imageUrlDark', 'eyebrow', 'title', 'subtitle', 'ctaLabel', 'ctaLink'];
  stringFields.forEach(field => {
    if (typeof payload[field] === 'string') update[field] = payload[field];
  });
  if (payload.order !== undefined) update.order = Number(payload.order) || 0;
  if (typeof payload.active === 'boolean') update.active = payload.active;

  return HeroSlide.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
}

async function deleteSlide(id) {
  await HeroSlide.deleteOne({ _id: id });
}

async function reorderSlides(idsInOrder) {
  if (!Array.isArray(idsInOrder) || !idsInOrder.length) return { ok: false, error: 'invalid_input' };
  await Promise.all(idsInOrder.map((id, index) => HeroSlide.updateOne({ _id: id }, { order: index })));
  return { ok: true };
}

module.exports = { listSlides, listActiveSlides, createSlide, updateSlide, deleteSlide, reorderSlides };
