const mongoose = require('mongoose');
const { OfferType, OfferStatus } = require('../enums');

const jobOfferSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyProfile',
      required: [true, 'Company reference is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(OfferType),
      required: [true, 'Offer type is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    offerEmbedding: {
      type: [Number],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.OPEN
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('JobOffer', jobOfferSchema);
