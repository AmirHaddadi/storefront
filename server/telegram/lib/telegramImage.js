'use strict';

/* Node 18+ دارای fetch سراسری است (engines.node پروژه از قبل >=18)، نیازی به
   node-fetch/axios نیست. */
async function downloadTelegramFile(bot, fileId) {
  const link = await bot.telegram.getFileLink(fileId);
  const res = await fetch(link.href);
  if (!res.ok) throw new Error('telegram_file_download_failed');
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

module.exports = { downloadTelegramFile };
