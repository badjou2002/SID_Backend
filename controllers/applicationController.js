const applicationService = require('../services/applicationService');
const { Role } = require('../enums');

const applyToJob = async (req, res, next) => {
  try {
    const application = await applicationService.applyToJob(req.user.id, req.body);
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

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

const getMyApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getMyApplications(
      req.user.id,
      req.query.status
    );
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    next(err);
  }
};

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

const updateApplicationStatus = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplicationStatus(
      req.params.id,
      req.user.id,
      req.body.status,
      req.user.role === Role.ADMIN
    );
    res.json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

const validateApplication = async (req, res, next) => {
  try {
    const application = await applicationService.validateApplication(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, data: application });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyToJob,
  getCandidateApplications,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  validateApplication
};
