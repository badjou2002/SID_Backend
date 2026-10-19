const Application = require('../models/Application');
const JobOffer = require('../models/JobOffer');
const CompanyProfile = require('../models/CompanyProfile');
const CandidateProfile = require('../models/CandidateProfile');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const { Role, OfferStatus, ApplicationStatus } = require('../enums');
const logger = require('../utils/logger');

const ALLOWED_STATUS_CHANGES = [
  ApplicationStatus.REVIEWED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED
];

const OFFER_POPULATE = {
  path: 'jobOffer',
  select: 'title type status description company createdAt',
  populate: { path: 'company', select: 'companyName sector isVerified' }
};

const getCandidateProfile = async (req) => {
  if (!req.body.user || req.body.user.role !== Role.CANDIDATE) {
    throw ApiError.forbidden('Candidate access only');
  }
  const profile = await CandidateProfile.findOne({ user: req.body.user._id });
  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }
  return profile;
};

const createApplication = async (req, res, next) => {
  try {
    const profile = await getCandidateProfile(req);

    const offerId = req.body.jobOffer || req.body.jobOfferId;
    const jobOffer = await JobOffer.findById(offerId);
    if (!jobOffer) {
      throw ApiError.notFound('Job offer not found');
    }
    if (jobOffer.status !== OfferStatus.OPEN) {
      throw ApiError.conflict('This job offer is closed');
    }

    const existing = await Application.findOne({
      candidate: profile._id,
      jobOffer: jobOffer._id
    });
    if (existing) {
      throw ApiError.conflict('You already applied to this job offer');
    }

    let application;
    try {
      application = await Application.create({
        candidate: profile._id,
        jobOffer: jobOffer._id,
        customCvUrl: req.body.customCvUrl || null,
        motivationLetter: req.body.motivationLetter,
        isValidatedByCandidate: true,
        status: ApplicationStatus.PENDING
      });
    } catch (err) {
      if (err && err.code === 11000) {
        throw ApiError.conflict('You already applied to this job offer');
      }
      throw err;
    }

    const populated = await application.populate(OFFER_POPULATE);
    logger.info('Application submitted', {
      applicationId: String(application._id),
      jobOfferId: String(jobOffer._id)
    });
    return created(res, populated);
  } catch (err) {
    return next(err);
  }
};

const getMyApplications = async (req, res, next) => {
  try {
    const profile = await getCandidateProfile(req);

    const filter = { candidate: profile._id };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .populate(OFFER_POPULATE);

    return ok(res, applications);
  } catch (err) {
    return next(err);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id).populate({
      path: 'jobOffer',
      select: 'company'
    });
    if (!application || !application.jobOffer) {
      throw ApiError.notFound('Application not found');
    }

    if (req.body.user.role !== Role.ADMIN) {
      const company = await CompanyProfile.findById(application.jobOffer.company);
      if (!company || String(company.user) !== String(req.body.user._id)) {
        throw ApiError.forbidden('Insufficient permissions');
      }
    }

    application.status = req.body.status;
    await application.save();

    const populated = await application.populate(OFFER_POPULATE);
    logger.info('Application status updated', {
      applicationId: String(application._id),
      status: application.status
    });
    return ok(res, populated);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  updateApplicationStatus,
  ALLOWED_STATUS_CHANGES
};
