// backend/models/Video.js
'use strict';

const { Schema, model } = require('mongoose');

const VideoSchema = new Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  category:    { type: String, required: true, enum: ['wedding', 'reels', 'youtube', 'ads'], default: 'reels' },
  videoUrl:    { type: String, required: true },
  publicId:    { type: String, default: '' },  // Cloudinary public_id for deletion
  description: { type: String, default: '', maxlength: 1000 },
  thumbnail:   { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  views:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model('Video', VideoSchema);
