const jwt = require('jsonwebtoken');

// Générer le token d'accès
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
    }
  );
};

// Générer le refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
    }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken
};