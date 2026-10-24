const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const Application = require('../models/Application');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./emailService');
const { enqueueMatchingSync } = require('./matchingQueue');

const queueCandidateIndex = async (userId) => {
  const profile = await CandidateProfile.findOne({ user: userId }).select('_id');
  if (profile) {
    await enqueueMatchingSync({ entity: 'candidate', entityId: profile._id });
  }
};

const PUBLIC_USER_FIELDS = '-passwordHash -refreshToken -emailVerificationCode -emailVerificationExpires -passwordResetCode -passwordResetExpires';

// Récupérer tous les utilisateurs
const getAllUsers = async () => {
  const users = await User.find({ isDeleted: { $ne: true } })
    .select(PUBLIC_USER_FIELDS)
    .sort({ createdAt: -1 });

  return users;
};

// Récupérer un utilisateur par son ID
const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select(PUBLIC_USER_FIELDS);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }
  if (user.isDeleted) {
    throw new Error('Ce compte a été supprimé');
  }

  return user;
};

// Modifier les informations d'un utilisateur
const updateUser = async (userId, data) => {
  const user = await User.findById(userId);
  let verificationCodeToSend = null;

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }
  if (user.isDeleted) {
    throw new Error('Ce compte a été supprimé');
  }

  // Modifier l'email
  if (data.email) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId }
    });

    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    if (user.email !== normalizedEmail) {
      verificationCodeToSend = crypto.randomInt(100000, 1000000).toString();

      user.email = normalizedEmail;
      user.isEmailVerified = false;
      user.emailVerificationCode = verificationCodeToSend;
      user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.passwordResetCode = null;
      user.passwordResetExpires = null;
      user.refreshToken = null;
    }
  }

  // Modifier le rôle
  if (data.role) {
    const allowedRoles = ['CANDIDATE', 'RECRUITER', 'ADMIN'];

    if (!allowedRoles.includes(data.role)) {
      throw new Error('Rôle invalide');
    }

    user.role = data.role;
  }

  await user.save();

  if (data.role) {
    await queueCandidateIndex(user._id);
  }

  if (verificationCodeToSend) {
    await sendVerificationEmail(user.email, verificationCodeToSend);
  }

  return user;
};

// Supprimer un utilisateur
const deleteUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  const deletedUserId = String(user._id);
  user.email = `deleted-${deletedUserId}@deleted.invalid`;
  user.passwordHash = crypto.randomBytes(32).toString('hex');
  user.isActive = false;
  user.isDeleted = true;
  user.isEmailVerified = false;
  user.emailVerificationCode = null;
  user.emailVerificationExpires = null;
  user.passwordResetCode = null;
  user.passwordResetExpires = null;
  user.refreshToken = null;
  await user.save();

  const candidateProfile = await CandidateProfile.findOne({ user: user._id });
  if (candidateProfile) {
    await Application.updateMany(
      { candidate: candidateProfile._id },
      {
        $set: {
          customCvUrl: null,
          motivationLetter: '',
          matchScore: null,
          aiJustification: ''
        }
      }
    );

    candidateProfile.fullName = '';
    candidateProfile.phone = '';
    candidateProfile.city = '';
    candidateProfile.rawCvUrl = null;
    candidateProfile.parsedSkills = [];
    candidateProfile.parsedExperiences = [];
    candidateProfile.parsedEducation = [];
    candidateProfile.cvEmbedding = [];
    candidateProfile.completenessScore = 0;
    candidateProfile.isNewCandidate = false;
    await candidateProfile.save();
  }

  return true;
};

// Activer ou désactiver un utilisateur
const updateUserStatus = async (userId, isActive) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }
  if (user.isDeleted) {
    throw new Error('Ce compte a été supprimé');
  }

  user.isActive = isActive;

  await user.save();
  await queueCandidateIndex(user._id);

  return user;
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus
};