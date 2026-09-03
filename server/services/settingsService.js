'use strict';

const SiteSettings = require('../models/SiteSettings');

async function getSettings() {
  return SiteSettings.getSingleton();
}

async function updateColorPreset(colorPreset) {
  if (!SiteSettings.COLOR_PRESETS.includes(colorPreset)) return { ok: false, error: 'invalid_preset' };
  const settings = await SiteSettings.getSingleton();
  settings.colorPreset = colorPreset;
  await settings.save();
  return { ok: true, settings };
}

async function updateCardToCard({ number, holder, bank }) {
  const settings = await SiteSettings.getSingleton();
  settings.cardToCardNumber = String(number || '').replace(/\D/g, '');
  settings.cardToCardHolder = String(holder || '').trim();
  settings.cardToCardBank = String(bank || '').trim();
  await settings.save();
  return { ok: true, settings };
}

module.exports = { getSettings, updateColorPreset, updateCardToCard };
