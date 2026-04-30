// backend/routes/bookingRoutes.js
'use strict';

const router  = require('express').Router();
const Booking = require('../models/Booking');
const auth    = require('../middleware/authMiddleware');

// POST /api/bookings/session — public
router.post('/session', async (req, res) => {
  try {
    const { name, email, phone, projectType, message } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and email required' });
    }
    const booking = await Booking.create({ type: 'session', name: name.trim(), email: email.trim(), phone, projectType, message });
    res.status(201).json({ success: true, message: "Booking received! We'll contact you soon. 🎬", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bookings/counsellor — public
router.post('/counsellor', async (req, res) => {
  try {
    const { name, email, phone, skills, experience, portfolioLink, message } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and email required' });
    }
    const booking = await Booking.create({ type: 'counsellor', name: name.trim(), email: email.trim(), phone, skills, experience, portfolioLink, message });
    res.status(201).json({ success: true, message: "Application received! We'll review it soon.", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings — admin
router.get('/', auth, async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    if (type && type !== 'all') query.type = type;
    if (status) query.status = status;
    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, bookings, total: bookings.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/bookings/:id/status — admin
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const b = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!b) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: `Status → ${status}`, booking: b });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/bookings/:id — admin
router.delete('/:id', auth, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
