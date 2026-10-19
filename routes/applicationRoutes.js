const express = require('express');
const { body, param, query } = require('express-validator');

const router = express.Router();
const {
  applyToJob,
  getCandidateApplications,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  validateApplication
} = require('../controllers/applicationController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { Role, ApplicationStatus } = require('../enums');

const validateOfferId = body().custom((_, { req }) => {
  const offerId = req.body.jobOfferId || req.body.jobOffer;
  if (!offerId) {
    throw new Error('jobOffer is required');
  }
  if (!/^[0-9a-fA-F]{24}$/.test(String(offerId).trim())) {
    throw new Error('jobOffer must be a valid id');
  }
  return true;
});

const validateApplicationId = param('id').isMongoId().withMessage('Invalid application id');

router.post(
  '/',
  protect,
  authorizeRoles(Role.CANDIDATE),
  validateOfferId,
  body('motivationLetter')
    .isString()
    .withMessage('motivationLetter is required')
    .trim()
    .isLength({ min: 1, max: 5000 }),
  body('customCvUrl')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .isLength({ max: 500 }),
  validate,
  applyToJob
);

router.get(
  '/my-applications',
  protect,
  authorizeRoles(Role.CANDIDATE),
  query('status').optional().isIn(Object.values(ApplicationStatus)),
  validate,
  getMyApplications
);

router.get(
  '/candidate/:candidateId',
  protect,
  authorizeRoles(Role.CANDIDATE),
  param('candidateId').isMongoId().withMessage('Invalid candidate id'),
  validate,
  getCandidateApplications
);

router.get(
  '/job/:jobOfferId',
  protect,
  authorizeRoles(Role.RECRUITER),
  param('jobOfferId').isMongoId().withMessage('Invalid job offer id'),
  validate,
  getJobApplications
);

router.patch(
  '/:id/status',
  protect,
  authorizeRoles(Role.RECRUITER, Role.ADMIN),
  validateApplicationId,
  body('status')
    .isIn([ApplicationStatus.REVIEWED, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED])
    .withMessage('Invalid application status'),
  validate,
  updateApplicationStatus
);

router.patch(
  '/:id/validate',
  protect,
  authorizeRoles(Role.CANDIDATE),
  validateApplicationId,
  validate,
  validateApplication
);

module.exports = router;
