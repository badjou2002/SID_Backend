const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./emailService');

// Récupérer tous les utilisateurs
const getAllUsers = async () => {
  const users = await User.find()
    .select('-passwordHash -refreshToken')
    .sort({ createdAt: -1 });

  return users;
};

// Récupérer un utilisateur par son ID
const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-passwordHash -refreshToken');

  if (!user) {
    throw new Error('Utilisateur introuvable');
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

  await User.findByIdAndDelete(userId);

  return true;
};

// Activer ou désactiver un utilisateur
const updateUserStatus = async (userId, isActive) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  user.isActive = isActive;

  await user.save();

  return user;
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus
};