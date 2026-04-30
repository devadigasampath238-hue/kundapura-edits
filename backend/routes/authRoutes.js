// backend/routes/authRoutes.js
'use strict';

const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/authMiddleware');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    token,
    admin: { username },
  });
});

// GET /api/admin/verify
router.get('/verify', auth, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

module.exports = router;
