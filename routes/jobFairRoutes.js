const express = require('express');
const { body } = require('express-validator');
const { getJobFairs, createJobFair } = require('../controllers/jobFairController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { Role } = require('../enums');
const validate = require('../middlewares/validate');

const router = express.Router();

router.get('/', getJobFairs);
router.post(
  '/',
  protect,
  authorizeRoles(Role.ADMIN),
  body('name').isString().trim().isLength({ min: 1, max: 160 }),
  body('location').isString().trim().isLength({ min: 1, max: 200 }),
  body('organizer').isString().trim().isLength({ min: 1, max: 160 }),
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date'),
  body('companiesCount').optional().isInt({ min: 0 }).toInt(),
  body('participantsCount').optional().isInt({ min: 0 }).toInt(),
  validate,
  createJobFair
);

module.exports = router;
