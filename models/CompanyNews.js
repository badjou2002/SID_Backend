const mongoose = require('mongoose');
const { MediaType } = require('../enums');

const companyNewsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    mediaUrl: {
      type: String,
      default: null
    },
    mediaType: {
      type: String,
      enum: Object.values(MediaType),
      default: null
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      required: [true, 'Company reference is required']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CompanyNews', companyNewsSchema);
