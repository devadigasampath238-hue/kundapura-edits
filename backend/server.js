// ─── KE Studio · server.js ────────────────────────────────────────────────────
'use strict';

require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const crypto     = require('crypto');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5000',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    // In production you may want to reject unknown origins:
    // cb(new Error('CORS: origin not allowed'));
    cb(null, true);
  },
  credentials: true,
}));

// ── BODY PARSERS ─────────────────────────────────────────────────────────────
// Videos are uploaded DIRECTLY to Cloudinary from the browser.
// The backend only handles small JSON payloads (credentials, metadata).
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── STATIC FILES ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── MONGODB ───────────────────────────────────────────────────────────────────
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB disconnected. Reconnecting…');
  setTimeout(connectDB, 3000);
});

connectDB();

// ── CLOUDINARY SIGNATURE ENDPOINT ────────────────────────────────────────────
// The browser requests a signed upload signature here, then uploads DIRECTLY
// to Cloudinary. The video never passes through this server.
//
// ⚠️  CRITICAL SIGNING RULES (common source of CORS-looking errors):
//   1. Only sign params that are actually sent in the FormData POST body.
//   2. Do NOT include resource_type — it goes in the URL path, not the body.
//   3. Sort params alphabetically before joining.
//   4. Append the raw API secret at the end (no separator).
//   5. SHA-256 hash the whole string.
//
app.post('/api/cloudinary/sign', require('./middleware/authMiddleware'), (req, res) => {
  try {
    const folder     = (req.body.folder || 'kundapura-edits').trim();
    const public_id  = req.body.public_id || undefined;
    const timestamp  = Math.round(Date.now() / 1000);

    // Only include params you will ALSO send in the FormData.
    // resource_type is NOT a signable param — it lives in the upload URL path.
    const paramsToSign = {
      folder,
      timestamp,
      ...(public_id ? { public_id } : {}),
    };

    // Sort keys alphabetically, build "key=value&key=value" string, append secret
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map(k => `${k}=${paramsToSign[k]}`)
      .join('&') + process.env.CLOUDINARY_API_SECRET;

    const signature = crypto.createHash('sha256').update(toSign).digest('hex');

    res.json({
      success:   true,
      signature,
      timestamp,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
      // Never send CLOUDINARY_API_SECRET to the browser
    });
  } catch (err) {
    console.error('Sign error:', err);
    res.status(500).json({ success: false, message: 'Signature failed' });
  }
});

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/admin',    require('./routes/authRoutes'));
app.use('/api/videos',   require('./routes/videoRoutes'));
app.use('/api/reviews',  require('./routes/reviewRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    env:    process.env.NODE_ENV,
  });
});

// ── SPA FALLBACK ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/admin.html')));

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html')));

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('🔥 Unhandled error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 KE Studio running on port ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
});
app.post('/api/cloudinary/sign', require('./middleware/authMiddleware'), (req, res) => {
  try {
    const folder    = (req.body.folder || 'kundapura-edits').trim();
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = { folder, timestamp };

    const toSign = Object.keys(paramsToSign)
      .sort()
      .map(k => `${k}=${paramsToSign[k]}`)
      .join('&') + process.env.CLOUDINARY_API_SECRET;

    // ── TEMPORARY: log what we're signing so you can verify ──
    console.log('=== CLOUDINARY SIGN DEBUG ===');
    console.log('paramsToSign:', paramsToSign);
    console.log('toSign string:', toSign);
    console.log('API_SECRET present:', !!process.env.CLOUDINARY_API_SECRET);
    console.log('API_SECRET length:', process.env.CLOUDINARY_API_SECRET?.length);
    // ── END DEBUG ──

    const signature = crypto.createHash('sha256').update(toSign).digest('hex');

    res.json({
      success: true, signature, timestamp, folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    console.error('Sign error:', err);
    res.status(500).json({ success: false, message: 'Signature failed' });
  }
});