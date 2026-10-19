const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const { Role } = require('../enums');

const {
  generateAccessToken,
  generateRefreshToken
} = require('../utils/jwt');

const {
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('./emailService');


// ======================================================
// Générer un code numérique de 6 chiffres
// ======================================================

const generateCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};


// ======================================================
// REGISTER
// ======================================================

const registerUser = async ({ email, password, role }) => {

  // Vérifier que le rôle est autorisé pour l'inscription publique
  if (![Role.CANDIDATE, Role.RECRUITER].includes(role)) {
    throw new Error('Rôle invalide');
  }

  // Vérifier si l'email existe déjà
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error('Cet email est déjà utilisé');
  }

  // Hasher le mot de passe
  const passwordHash = await bcrypt.hash(password, 12);

  // Générer le code de vérification
  const verificationCode = generateCode();

  // Le code expire après 10 minutes
  const verificationExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  // Créer le compte
  const user = await User.create({
    email,
    passwordHash,
    role,
    isEmailVerified: false,
    emailVerificationCode: verificationCode,
    emailVerificationExpires: verificationExpires
  });

  // Envoyer le code par email
  await sendVerificationEmail(
    user.email,
    verificationCode
  );

  return user;
};


// ======================================================
// VERIFY EMAIL
// ======================================================

const verifyEmail = async ({ email, code }) => {

  // Rechercher l'utilisateur
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Vérifier si l'email est déjà confirmé
  if (user.isEmailVerified) {
    throw new Error('Le compte est déjà vérifié');
  }

  // Vérifier le code
  if (user.emailVerificationCode !== code) {
    throw new Error('Code de vérification incorrect');
  }

  // Vérifier l'expiration
  if (
    !user.emailVerificationExpires ||
    user.emailVerificationExpires < new Date()
  ) {
    throw new Error('Le code de vérification a expiré');
  }

  // Confirmer l'email
  user.isEmailVerified = true;

  // Supprimer le code après utilisation
  user.emailVerificationCode = null;
  user.emailVerificationExpires = null;

  await user.save();

  return user;
};


// ======================================================
// LOGIN
// ======================================================

const loginUser = async ({ email, password }) => {

  // Rechercher l'utilisateur
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Vérifier si le compte est actif
  if (!user.isActive) {
    throw new Error('Votre compte est désactivé');
  }

  // Vérifier si l'email est confirmé
  if (!user.isEmailVerified) {
    throw new Error('Veuillez confirmer votre adresse email');
  }

  // Comparer le mot de passe avec le hash
  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Générer les tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Hasher le refresh token avant de le stocker
  user.refreshToken = await bcrypt.hash(refreshToken, 12);

  await user.save();

  return {
    user,
    accessToken,
    refreshToken
  };
};


// ======================================================
// REFRESH TOKEN
// ======================================================

const refreshAccessToken = async (refreshToken) => {

  const jwt = require('jsonwebtoken');

  let payload;

  try {
    // Vérifier le refresh token
    payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
  } catch (error) {
    throw new Error('Refresh token invalide ou expiré');
  }

  // Rechercher l'utilisateur
  const user = await User.findById(payload.userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Vérifier que l'utilisateur est actif
  if (!user.isActive) {
    throw new Error('Compte désactivé');
  }

  // Vérifier le refresh token enregistré
  if (!user.refreshToken) {
    throw new Error('Refresh token invalide');
  }

  const isValidRefreshToken = await bcrypt.compare(
    refreshToken,
    user.refreshToken
  );

  if (!isValidRefreshToken) {
    throw new Error('Refresh token invalide');
  }

  // Générer un nouvel access token
  const accessToken = generateAccessToken(user);

  return accessToken;
};


// ======================================================
// LOGOUT
// ======================================================

const logoutUser = async (userId) => {

  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Supprimer le refresh token
  user.refreshToken = null;

  await user.save();

  return true;
};


// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (email) => {

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Générer un code de reset
  const resetCode = generateCode();

  // Le code expire après 10 minutes
  const resetExpires = new Date(
    Date.now() + 10 * 60 * 1000
  );

  user.passwordResetCode = resetCode;
  user.passwordResetExpires = resetExpires;

  await user.save();

  // Envoyer le code par email
  await sendPasswordResetEmail(
    user.email,
    resetCode
  );

  return true;
};


// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async ({
  email,
  code,
  newPassword
}) => {

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Vérifier le code
  if (user.passwordResetCode !== code) {
    throw new Error('Code de réinitialisation incorrect');
  }

  // Vérifier l'expiration
  if (
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date()
  ) {
    throw new Error('Le code de réinitialisation a expiré');
  }

  // Hasher le nouveau mot de passe
  user.passwordHash = await bcrypt.hash(
    newPassword,
    12
  );

  // Supprimer le code après utilisation
  user.passwordResetCode = null;
  user.passwordResetExpires = null;

  // Invalider le refresh token existant
  user.refreshToken = null;

  await user.save();

  return true;
};
// CHANGE PASSWORD
const changePassword = async ({ userId, currentPassword, newPassword }) => {
  // Recherche de l'utilisateur
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Vérification de l'ancien mot de passe
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error('Ancien mot de passe incorrect');
  }

  // Vérification que le nouveau mot de passe est différent
  if (currentPassword === newPassword) {
    throw new Error(
      'Le nouveau mot de passe doit être différent de l’ancien'
    );
  }

  // Hashage du nouveau mot de passe
  user.passwordHash = await bcrypt.hash(newPassword, 12);

  // Invalidation du refresh token pour demander une nouvelle authentification
  user.refreshToken = null;

  await user.save();

  return true;
};

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword
};