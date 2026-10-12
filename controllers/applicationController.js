/**
 * Application Controller
 * Handles applying, listing, status updates, and validation.
 */

const applicationService = require('../services/applicationService');

/**
 * POST /api/applications
 * Protected — CANDIDATE only.
 * Body: { jobOfferId, customCvUrl, motivationLetter }
 */
const applyToJob = async (req, res, next) => {
  try {
    const application = await applicationService.applyToJob(req.user.id, req.body);
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/applications/candidate/:candidateId
 * Protected — CANDIDATE (must be the owner of the profile).
 */
const getCandidateApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getCandidateApplications(
      req.params.candidateId,
      req.user.id
    );
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/applications/job/:jobOfferId
 * Protected — RECRUITER (must own the job offer).
 */
const getJobApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getJobApplications(
      req.params.jobOfferId,
      req.user.id
    );
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/applications/:id/status
 * Protected — RECRUITER (owner of the job).
 * Body: { status }
 */
const updateStatus = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplicationStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );
    res.json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/applications/:id/validate
 * Protected — CANDIDATE (owner of the application).
 */
const validateApplication = async (req, res, next) => {
  try {
    const application = await applicationService.validateApplication(req.params.id, req.user.id);
    res.json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyToJob,
  getCandidateApplications,
  getJobApplications,
  updateStatus,
  validateApplication
};
