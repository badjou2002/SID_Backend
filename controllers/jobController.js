/**
 * Job Controller
 * Handles CRUD operations for job offers.
 */

const jobService = require('../services/jobService');

/**
 * GET /api/jobs
 * Public — returns all OPEN offers. Query: ?type=&search=
 */
const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.getAllJobs(req.query);
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/:id
 * Public — returns a single offer.
 */
const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/jobs
 * Protected — RECRUITER only.
 * Body: { title, type, description, requiredSkills }
 */
const createJob = async (req, res, next) => {
  try {
    const job = await jobService.createJob(req.user.id, req.body);
    res.status(201).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/jobs/:id
 * Protected — RECRUITER + owner.
 */
const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/jobs/:id
 * Protected — RECRUITER + owner.
 */
const deleteJob = async (req, res, next) => {
  try {
    await jobService.deleteJob(req.params.id, req.user.id);
    res.json({ success: true, message: 'Job offer deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/jobs/:id/close
 * Protected — RECRUITER + owner.
 */
const closeJob = async (req, res, next) => {
  try {
    const job = await jobService.closeJob(req.params.id, req.user.id);
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllJobs, getJobById, createJob, updateJob, deleteJob, closeJob };
