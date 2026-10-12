const express = require('express');
const router = express.Router();
const {
  applyToJob,
  getCandidateApplications,
  getJobApplications,
  updateStatus,
  validateApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * Application Routes
 * All routes are protected (authentication required).
 */

// POST /api/applications                           — CANDIDATE: apply to a job
router.post('/', protect, authorize('CANDIDATE'), applyToJob);

// GET  /api/applications/candidate/:candidateId   — CANDIDATE: my applications
router.get('/candidate/:candidateId', protect, authorize('CANDIDATE'), getCandidateApplications);

// GET  /api/applications/job/:jobOfferId          — RECRUITER: applications for a job
router.get('/job/:jobOfferId', protect, authorize('RECRUITER'), getJobApplications);

// PATCH /api/applications/:id/status             — RECRUITER: update status
router.patch('/:id/status', protect, authorize('RECRUITER'), updateStatus);

// PATCH /api/applications/:id/validate           — CANDIDATE: confirm acceptance
router.patch('/:id/validate', protect, authorize('CANDIDATE'), validateApplication);

module.exports = router;
