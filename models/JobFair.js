const mongoose = require('mongoose');

const jobFairSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'End date must be on or after the start date'
      }
    },
    companiesCount: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isInteger
    },
    participantsCount: {
      type: Number,
      min: 0,
      default: 0,
      validate: Number.isInteger
    }
  },
  {
    timestamps: true
  }
);

jobFairSchema.index({ startDate: 1 });

module.exports = mongoose.model('JobFair', jobFairSchema);
