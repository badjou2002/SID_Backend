const express = require('express');
const { query } = require('express-validator');
const {
  getAdminNews,
  getDashboardStats,
  getAiInsights
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { Role } = require('../enums');

const router = express.Router();

router.use(protect, authorizeRoles(Role.ADMIN));

router.get('/news', getAdminNews);
router.get('/stats', getDashboardStats);
router.get(
  '/ai-insights',
  query('days').optional().isIn(['7', '30', '90']).withMessage('days must be 7, 30 or 90'),
  validate,
  getAiInsights
);

module.exports = router;
