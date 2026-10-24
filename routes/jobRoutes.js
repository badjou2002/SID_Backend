const express = require('express');
const router = express.Router();
const {
  getAllJobs,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  closeJob
} = require('../controllers/jobController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { query } = require('express-validator');
const validate = require('../middlewares/validate');
const { OfferType } = require('../enums');

/**
 * Job Offer Routes
 */

// GET  /api/jobs          — Public: list all OPEN offers
router.get(
  '/',
  query('type').optional().isIn(Object.values(OfferType)).withMessage('Invalid offer type'),
  validate,
  getAllJobs
);

// GET  /api/jobs/mine     — RECRUITER: list all own offers, including closed offers
router.get('/mine', protect, authorize('RECRUITER'), getMyJobs);
// GET  /api/jobs/:id      — Public: get single offer
router.get('/:id', getJobById);

// POST /api/jobs          — RECRUITER: create offer
router.post('/', protect, authorize('RECRUITER'), createJob);

// PUT  /api/jobs/:id      — RECRUITER (owner): update offer
router.put('/:id', protect, authorize('RECRUITER'), updateJob);

// DELETE /api/jobs/:id   — RECRUITER (owner): delete offer
router.delete('/:id', protect, authorize('RECRUITER'), deleteJob);

// PATCH /api/jobs/:id/close — RECRUITER (owner): close offer
router.patch('/:id/close', protect, authorize('RECRUITER'), closeJob);

module.exports = router;
