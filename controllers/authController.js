const authService = require("../services/auth.service");
const logger = require("../utils/logger");

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Vérification des données obligatoires
    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, mot de passe et rôle sont obligatoires",
      });
    }

    // Appel du service d'inscription
    const user = await authService.registerUser({
      email,
      password,
      role,
    });

    return res.status(201).json({
      message: "Compte créé avec succès",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};


// Vérification de l'adresse email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Vérification des données obligatoires
    if (!email || !code) {
      return res.status(400).json({
        message: "Email et code sont obligatoires",
      });
    }

    // Appel du service de vérification
    const user = await authService.verifyEmail({
      email,
      code,
    });

    return res.status(200).json({
      message: "Compte vérifié avec succès",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        message: 'Email obligatoire',
      });
    }

    await authService.resendVerificationCode(email);
    return res.status(200).json({
      message: 'Si le compte existe et n’est pas vérifié, un nouveau code sera envoyé',
    });
  } catch (error) {
    logger.error('Verification email resend failed', {
      errorMessage: error.message
    });
    return res.status(500).json({
      message: 'Impossible d’envoyer le code de vérification',
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérification des données obligatoires
    if (!email || !password) {
      return res.status(400).json({
        message: "Email et mot de passe sont obligatoires",
      });
    }

    // Appel du service de connexion
    const result = await authService.loginUser({
      email,
      password,
    });

    return res.status(200).json({
      message: "Connexion réussie",
      user: {
        id: result.user._id,
        email: result.user.email,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message,
    });
  }
};

// ======================================================
// REFRESH TOKEN
// ======================================================

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Vérification du refresh token
    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token obligatoire",
      });
    }

    // Générer un nouvel access token
    const accessToken = await authService.refreshAccessToken(
      refreshToken
    );

    return res.status(200).json({
      message: "Access token renouvelé avec succès",
      accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message,
    });
  }
};


// ======================================================
// LOGOUT
// ======================================================

const logout = async (req, res) => {
  try {
    // req.user est fourni par le middleware protect
    await authService.logoutUser(req.user._id);

    return res.status(200).json({
      message: "Déconnexion réussie",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Vérification de l'email
    if (!email) {
      return res.status(400).json({
        message: "Email obligatoire",
      });
    }

    // Appel du service pour générer et envoyer le code
    await authService.forgotPassword(email);

    return res.status(200).json({
      message: "Code de réinitialisation envoyé par email",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Vérification des données obligatoires
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, code et nouveau mot de passe sont obligatoires",
      });
    }

    // Appel du service de réinitialisation
    await authService.resetPassword({
      email,
      code,
      newPassword,
    });

    return res.status(200).json({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Vérification des données obligatoires
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "L'ancien et le nouveau mot de passe sont obligatoires",
      });
    }

    // Appel du service de changement de mot de passe
    await authService.changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });

    return res.status(200).json({
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword
};
