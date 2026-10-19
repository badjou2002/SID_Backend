const express = require('express');

const {
  createCompanyProfile,
  getMyCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile
} = require('../controllers/profileController');

const {
  protect,
  authorizeRoles
} = require('../middlewares/authMiddleware');

const { Role } = require('../enums');

const router = express.Router();

// ==================== RECRUITER ====================

// Créer son profil entreprise
router.post(
  '/company',
  protect,
  authorizeRoles(Role.RECRUITER),
  createCompanyProfile
);

// Consulter son profil entreprise
router.get(
  '/company/me',
  protect,
  authorizeRoles(Role.RECRUITER),
  getMyCompanyProfile
);

// Modifier son profil entreprise
router.put(
  '/company/me',
  protect,
  authorizeRoles(Role.RECRUITER),
  updateCompanyProfile
);

// Supprimer son profil entreprise
router.delete(
  '/company/me',
  protect,
  authorizeRoles(Role.RECRUITER),
  deleteCompanyProfile
);

module.exports = router;
