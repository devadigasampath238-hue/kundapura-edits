// backend/routes/videoRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: Videos are uploaded DIRECTLY from the browser to Cloudinary.
// This route ONLY receives JSON: { title, category, videoUrl, publicId }
// NO multer, NO file handling, NO req.file — that was causing the 500 error.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const router = require('express').Router();
const Video  = require('../models/Video');
const auth   = require('../middleware/authMiddleware');

// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };
    if (category && category !== 'all') query.category = category;

    const [videos, total] = await Promise.all([
      Video.find(query).sort({ createdAt: -1 })
        .skip((+page - 1) * +limit).limit(+limit).lean(),
      Video.countDocuments(query),
    ]);

    res.json({ success: true, videos, total, page: +page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).lean();
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/videos — receives JSON from browser after direct Cloudinary upload
router.post('/', auth, async (req, res) => {
  try {
    const { title, category, videoUrl, publicId, description, thumbnail } = req.body;

    if (!title?.trim())    return res.status(400).json({ success: false, message: 'Title is required' });
    if (!category)         return res.status(400).json({ success: false, message: 'Category is required' });
    if (!videoUrl?.trim()) return res.status(400).json({ success: false, message: 'Video URL is required' });

    const video = await Video.create({
      title:       title.trim(),
      category,
      videoUrl:    videoUrl.trim(),
      publicId:    publicId || '',
      description: description?.trim() || '',
      thumbnail:   thumbnail || '',
    });

    res.status(201).json({ success: true, message: 'Video saved! 🎬', video });
  } catch (err) {
    console.error('Video save error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/videos/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, category, description, isActive } = req.body;
    const update = {};
    if (title !== undefined)       update.title       = title.trim();
    if (category !== undefined)    update.category    = category;
    if (description !== undefined) update.description = description;
    if (isActive !== undefined)    update.isActive    = isActive;

    const video = await Video.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    res.json({ success: true, message: 'Updated', video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/videos/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    if (video.publicId) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key:    process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
      } catch (e) { console.warn('Cloudinary delete warning:', e.message); }
    }

    await video.deleteOne();
    await require('../models/Review').deleteMany({ videoId: req.params.id });
    res.json({ success: true, message: 'Video deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;