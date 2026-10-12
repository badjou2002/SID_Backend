const express = require('express');
const router = express.Router();
const {
  getAllCompanies,
  getCompanyById,
  updateCompany,
  verifyCompany
} = require('../controllers/companyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * Company Routes
 */

// GET  /api/companies        — Public: list all companies
router.get('/', getAllCompanies);

// GET  /api/companies/:id    — Public: get single company
router.get('/:id', getCompanyById);

// PUT  /api/companies/:id    — RECRUITER (owner): update profile
router.put('/:id', protect, authorize('RECRUITER'), updateCompany);

// PATCH /api/companies/:id/verify — ADMIN: toggle verified flag
router.patch('/:id/verify', protect, authorize('ADMIN'), verifyCompany);

module.exports = router;
