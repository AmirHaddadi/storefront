'use strict';

const mongoose = require('mongoose');
const { applyIdJson } = require('../lib/schemaJson');

const sizeProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, required: true, trim: true },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  chest: { type: Number, required: true },
  waist: { type: Number, required: true },
  hip: { type: Number, required: true },
  fabricType: { type: String, enum: ['elastic', 'non-elastic'], default: 'non-elastic' },
  suggestedSize: { type: String, required: true },
}, { timestamps: true });

applyIdJson(sizeProfileSchema);

module.exports = mongoose.model('SizeProfile', sizeProfileSchema);
