// backend/routes/reviewRoutes.js
'use strict';

const router = require('express').Router();
const Review = require('../models/Review');
const auth   = require('../middleware/authMiddleware');

// GET /api/reviews/:videoId — public, approved only
router.get('/:videoId', async (req, res) => {
  try {
    const reviews = await Review.find({ videoId: req.params.videoId, isApproved: true })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews — admin, all reviews
router.get('/', auth, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('videoId', 'title')
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, reviews, count: reviews.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reviews — public
router.post('/', async (req, res) => {
  try {
    const { videoId, name, rating, comment } = req.body;
    if (!videoId || !name?.trim() || !rating || !comment?.trim()) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const review = await Review.create({
      videoId, name: name.trim(), rating: +rating, comment: comment.trim(),
    });
    res.status(201).json({ success: true, message: 'Review submitted! Awaiting approval.', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/reviews/:id/approve — admin
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    review.isApproved = !review.isApproved;
    await review.save();
    res.json({ success: true, message: review.isApproved ? 'Review approved' : 'Review hidden', review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/reviews/:id — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
