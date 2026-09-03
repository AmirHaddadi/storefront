'use strict';

const Admin = require('../models/Admin');

/* لیست ادمین‌های در حال حاضر متصل به ربات تلگرام رو در کنسول سرور لاگ می‌کنه —
   هم موقع استارتاپ سرور (server.js) و هم هر بار که یک ادمین وصل/قطع می‌شه
   (adminService.js) صدا زده می‌شه، تا همیشه یک منبع واحد برای این کوئری باشه. */
async function logConnectedAdmins() {
  const connected = await Admin.find({ telegramChatId: { $ne: null } }, 'name telegramChatId isSuperAdmin');
  if (!connected.length) {
    console.log('[telegram] connected admins: none');
    return;
  }
  console.log(`[telegram] connected admins (${connected.length}):`);
  connected.forEach(a => {
    console.log(`  - ${a.name}${a.isSuperAdmin ? ' [super admin]' : ''} (chatId=${a.telegramChatId})`);
  });
}

module.exports = { logConnectedAdmins };
