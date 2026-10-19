const User = require('../models/User');
const bcrypt = require('bcryptjs');

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

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Modifier l'email
  if (data.email) {
    const existingUser = await User.findOne({
      email: data.email.toLowerCase(),
      _id: { $ne: userId }
    });

    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    user.email = data.email.toLowerCase();
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