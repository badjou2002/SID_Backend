const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Vérifier que l'utilisateur possède un access token valide
const protect = async (req, res, next) => {
  try {
    // Récupérer le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token d'authentification manquant",
      });
    }

    // Récupérer uniquement le token
    const token = authHeader.split(" ")[1];

    // Vérifier le token
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    // Rechercher l'utilisateur
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "Utilisateur introuvable",
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        message: "Compte désactivé",
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token invalide ou expiré",
    });
  }
};

// Vérifier que l'utilisateur possède l'un des rôles autorisés
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    // Vérifier que son rôle est autorisé
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant",
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};