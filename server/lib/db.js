'use strict';

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[db] MONGODB_URI environment variable is not set — create .env based on .env.example.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const safeUri = uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
    console.log(`[db] MongoDB connected: ${safeUri}`);
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', err => {
    console.error('[db] MongoDB connection error at runtime:', err.message);
  });
}

module.exports = { connectDB };
