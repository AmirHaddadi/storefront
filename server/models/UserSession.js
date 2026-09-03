'use strict';

const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index: مانگو خودش سندهای منقضی‌شده رو پاک می‌کنه، نیازی به cron جدا نیست
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UserSession', userSessionSchema);
