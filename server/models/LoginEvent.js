'use strict';

const mongoose = require('mongoose');

/* یک رکورد به‌ازای هر ورود موفق (OTP verify) — برای گزارش «چه کاربرانی/چند نفر ورود
   انجام داده‌اند» به تفکیک روز (بخش گزارش‌گیری، پشت REPORTS_ENABLED). */
const loginEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// هم برای aggregation بازه‌ی تاریخ، هم TTL — بعد از ۴۰۰ روز خودکار پاک می‌شه
loginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

module.exports = mongoose.model('LoginEvent', loginEventSchema);
