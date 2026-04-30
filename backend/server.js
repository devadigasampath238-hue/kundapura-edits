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
    cb(null, true); // allow all for now; tighten in production
  },
  credentials: true,
}));

// ── BODY PARSERS ─────────────────────────────────────────────────────────────
// NOTE: We intentionally do NOT set large body limits here.
// Large video files are uploaded DIRECTLY to Cloudinary from the browser.
// The backend only handles JSON/text payloads (credentials, metadata, etc.)
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
    // Retry after 5s
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
// The browser requests a signed upload signature, then uploads DIRECTLY to
// Cloudinary. The video never passes through our server. This completely
// eliminates the 413 error and Render's body-size limit.
app.post('/api/cloudinary/sign', require('./middleware/authMiddleware'), (req, res) => {
  try {
    const { folder = 'kundapura-edits', public_id } = req.body;
    const timestamp = Math.round(Date.now() / 1000);

    // Build params to sign
    const params = {
      timestamp,
      folder,
      ...(public_id ? { public_id } : {}),
    };

    // Create signature string: param1=val1&param2=val2&...SECRET
    const toSign = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&') + process.env.CLOUDINARY_API_SECRET;

    const signature = crypto.createHash('sha256').update(toSign).digest('hex');

    res.json({
      success: true,
      signature,
      timestamp,
      cloudName:  process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:     process.env.CLOUDINARY_API_KEY,
      folder,
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
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV,
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
