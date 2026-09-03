'use strict';

const path = require('path');

const CLIENT_ROOT = path.join(__dirname, '..', '..', 'public-html');

function sendPage(res, file) {
  res.sendFile(path.join(CLIENT_ROOT, file));
}

function sendNotFound(res) {
  res.status(404).sendFile(path.join(CLIENT_ROOT, '404.html'));
}

module.exports = { CLIENT_ROOT, sendPage, sendNotFound };
