const express = require('express');
const { body, param, query } = require('express-validator');

const router = express.Router();
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { Role, ApplicationStatus } = require('../enums');
const {
  createApplication,
  getMyApplications,
  updateApplicationStatus,
  ALLOWED_STATUS_CHANGES
} = require('../controllers/applicationController');

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

const isOfferIdPresent = (value, { req }) => {
  const id = (value || req.body.jobOfferId || '').toString().trim();
  if (!id) {
    throw new Error('jobOffer is required');
  }
  if (!MONGO_ID.test(id)) {
    throw new Error('jobOffer must be a valid id');
  }
  return true;
};

const createValidators = [
  body('jobOffer').optional({ values: 'null' }).custom(isOfferIdPresent),
  body('jobOfferId').optional({ values: 'null' }).custom(isOfferIdPresent),
  body().custom((_, { req }) => {
    if (!req.body.jobOffer && !req.body.jobOfferId) {
      throw new Error('jobOffer is required');
    }
    return true;
  }),
  body('motivationLetter')
    .isString()
    .withMessage('motivationLetter is required')
    .trim()
    .isLength({ min: 1, max: 5000 }),
  body('customCvUrl')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .isLength({ max: 500 })
];

// POST /api/v1/applications
router.post(
  '/',
//   protect,
//   authorizeRoles(Role.CANDIDATE),
  createValidators,
  validate,
  createApplication
);

// GET /api/v1/applications/my-applications
router.get(
  '/my-applications',
//   protect,
//   authorizeRoles(Role.CANDIDATE),
  query('status').optional().isIn(Object.values(ApplicationStatus)),
  validate,
  getMyApplications
);

// PATCH /api/v1/applications/:id/status
router.patch(
  '/:id/status',
//   protect,
//   authorizeRoles(Role.RECRUITER, Role.ADMIN),
  param('id').isMongoId().withMessage('Invalid application id'),
  body('status')
    .isIn(ALLOWED_STATUS_CHANGES)
    .withMessage(`status must be one of: ${ALLOWED_STATUS_CHANGES.join(', ')}`),
  validate,
  updateApplicationStatus
);

module.exports = router;

