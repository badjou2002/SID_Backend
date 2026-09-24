const mongoose = require('mongoose');
const { ApplicationStatus } = require('../enums');

const applicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CandidateProfile',
      required: [true, 'Candidate reference is required']
    },
    jobOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobOffer',
      required: [true, 'Job offer reference is required']
    },
    customCvUrl: {
      type: String,
      default: null
    },
    motivationLetter: {
      type: String,
      default: ''
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    aiJustification: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING
    },
    isValidatedByCandidate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ candidate: 1, jobOffer: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
