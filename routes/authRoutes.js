const express = require("express");
const { body } = require("express-validator");

const {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword
} = require("../controllers/authController");
const { protect
 } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validate");
const router = express.Router();

// Création d'un nouveau compte
router.post("/register", register);

// Vérification de l'adresse email
router.post("/verify-email", verifyEmail);

// Demander un nouveau code de vérification
router.post(
  "/resend-verification-code",
  body('email').isEmail().withMessage('Email invalide'),
  validate,
  resendVerificationCode
);

// Connexion
router.post("/login", login);

// Modifier le mot de passe
router.post("/change-password", protect, changePassword);

// Renouveler l'access token
router.post("/refresh-token", refreshToken);

// Déconnexion
router.post("/logout", protect, logout);

// Demander un code de réinitialisation
router.post("/forgot-password", forgotPassword);

// Réinitialiser le mot de passe
router.post("/reset-password", resetPassword);

module.exports = router;
