const mongoose = require('mongoose');

const candidateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    fullName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    rawCvUrl: {
      type: String,
      default: null
    },
    parsedSkills: {
      type: [String],
      default: []
    },
    parsedExperiences: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    parsedEducation: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    cvEmbedding: {
      type: [Number],
      default: []
    },
    completenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    isNewCandidate: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);
