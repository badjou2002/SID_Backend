const express = require('express');

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  
} = require('../controllers/userController');

const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { Role } = require('../enums');

const router = express.Router();

// ==================== ADMIN ====================

// Voir tous les utilisateurs
router.get(
  '/',
  protect,
  authorizeRoles(Role.ADMIN),
  getAllUsers
);

 // ==================== MON COMPTE ====================

// Consulter son compte
router.get(
  '/me',
  protect,
  authorizeRoles(Role.CANDIDATE, Role.RECRUITER),
  getMyAccount
);

// Modifier son email
router.patch(
  '/me',
  protect,
  authorizeRoles(Role.CANDIDATE, Role.RECRUITER),
  updateMyAccount
);

// Supprimer son compte
router.delete(
  '/me',
  protect,
  authorizeRoles(Role.CANDIDATE, Role.RECRUITER),
  deleteMyAccount
);

// Voir un utilisateur
router.get(
  '/:id',
  protect,
  authorizeRoles(Role.ADMIN),
  getUserById
);

// Modifier un utilisateur
router.put(
  '/:id',
  protect,
  authorizeRoles(Role.ADMIN),
  updateUser
);

// Supprimer un utilisateur
router.delete(
  '/:id',
  protect,
  authorizeRoles(Role.ADMIN),
  deleteUser
);

// Activer / désactiver un utilisateur
router.patch(
  '/:id/status',
  protect,
  authorizeRoles(Role.ADMIN),
  updateUserStatus
);

module.exports = router;