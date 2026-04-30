// backend/models/Review.js
'use strict';

const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema({
  videoId:    { type: Schema.Types.ObjectId, ref: 'Video', required: true },
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  comment:    { type: String, required: true, maxlength: 1000 },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Review', ReviewSchema);
