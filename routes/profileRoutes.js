const express = require('express');
const { body, query } = require('express-validator');

const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { Role } = require('../enums');
const {
  getMyProfile,
  updateMyProfile,
  getAllProfiles
} = require('../controllers/profileController');

const FORBIDDEN_FIELDS = [
  'user',
  'rawCvUrl',
  'cvEmbedding',
  'completenessScore',
  'isNewCandidate'
];

const rejectImmutableFields = (req, res, next) => {
  const provided = FORBIDDEN_FIELDS.filter((field) => req.body[field] !== undefined);
  if (provided.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Field(s) cannot be updated through this endpoint',
      errors: provided.map((field) => ({ field, message: 'Read-only field' }))
    });
  }
  return next();
};

const updateValidators = [
  body('fullName').optional().isString().trim().isLength({ min: 1, max: 120 }),
  body('phone').optional().isString().trim().isLength({ max: 40 }),
  body('city').optional().isString().trim().isLength({ max: 80 }),
  body('parsedSkills').optional().isArray({ max: 100 }),
  body('parsedSkills.*').isString().trim().isLength({ min: 1, max: 60 }),
  body('parsedExperiences').optional().isArray({ max: 50 }),
  body('parsedEducation').optional().isArray({ max: 50 })
];

// GET /api/v1/profiles — tous les profils candidats (RECRUITER / ADMIN)
router.get(
  '/',
//   protect,
//   authorizeRoles(Role.RECRUITER, Role.ADMIN),
  query('q').optional().isString().trim().isLength({ max: 100 }),
  query('city').optional().isString().trim().isLength({ max: 80 }),
  validate,
  getAllProfiles
);

// GET /api/v1/profiles/candidate/me
router.get(
  '/candidate/me',
//   protect,
//   authorizeRoles(Role.CANDIDATE),
  getMyProfile
);

// PUT /api/v1/profiles/candidate/me
router.put(
  '/candidate/me',
//   protect,
// //   authorizeRoles(Role.CANDIDATE),
//   rejectImmutableFields,
  updateValidators,
  validate,
  updateMyProfile
);

module.exports = router;
