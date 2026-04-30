// backend/models/Booking.js
'use strict';

const { Schema, model } = require('mongoose');

const BookingSchema = new Schema({
  type:          { type: String, enum: ['session', 'counsellor'], required: true },
  name:          { type: String, required: true, trim: true, maxlength: 100 },
  email:         { type: String, required: true, trim: true, lowercase: true },
  phone:         { type: String, default: '' },
  projectType:   { type: String, default: '' },
  message:       { type: String, default: '', maxlength: 2000 },
  // counsellor-only fields
  skills:        { type: String, default: '' },
  experience:    { type: String, default: '' },
  portfolioLink: { type: String, default: '' },
  status:        { type: String, enum: ['new', 'reviewed', 'contacted', 'closed'], default: 'new' },
}, { timestamps: true });

module.exports = model('Booking', BookingSchema);
