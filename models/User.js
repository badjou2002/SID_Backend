const mongoose = require('mongoose');
const { Role } = require('../enums');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: Object.values(Role),
      required: [true, 'Role is required'],
      default: Role.CANDIDATE
    },
     // Indique si l'adresse email a été confirmée
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Code temporaire de confirmation email
    emailVerificationCode: {
      type: String,
      default: null,
    },

    // Date d'expiration du code de confirmation
    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    // Code temporaire pour réinitialiser le mot de passe
    passwordResetCode: {
      type: String,
      default: null,
    },

    // Date d'expiration du code de reset
    passwordResetExpires: {
      type: Date,
      default: null,
    },

    // Refresh token hashé
    refreshToken: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('User', userSchema);
