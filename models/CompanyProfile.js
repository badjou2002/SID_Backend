const mongoose = require('mongoose');

const companyProfileSchema = new mongoose.Schema(
  {
    // Utilisateur Recruiter propriétaire du profil
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    // Informations de l'entreprise
    companyName: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    industry: {
      type: String,
      trim: true
    },

    address: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      trim: true
    },

    website: {
      type: String,
      trim: true
    },

    logo: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CompanyProfile', companyProfileSchema);