const Application = require('../models/Application');
const CandidateProfile = require('../models/CandidateProfile');
const CompanyProfile = require('../models/CompanyProfile');
const JobOffer = require('../models/JobOffer');
const { ApplicationStatus, OfferStatus } = require('../enums');

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const findCandidateProfile = async (userId) => {
  const candidate = await CandidateProfile.findOne({ user: userId });

  if (!candidate) {
    throw createError('Candidate profile not found', 404);
  }

  return candidate;
};

const findOwnedApplication = async (applicationId, userId) => {
  const candidate = await findCandidateProfile(userId);
  const application = await Application.findOne({
    _id: applicationId,
    candidate: candidate._id
  });

  if (!application) {
    throw createError('Application not found', 404);
  }

  return application;
};

const populateApplication = (query) => query
  .populate({
    path: 'candidate',
    select: 'fullName phone city user'
  })
  .populate({
    path: 'jobOffer',
    populate: {
      path: 'company',
      select: 'companyName industry logo'
    }
  });

const applyToJob = async (userId, data) => {
  const candidate = await findCandidateProfile(userId);
  const job = await JobOffer.findOne({
    _id: data.jobOfferId,
    status: OfferStatus.OPEN
  });

  if (!job) {
    throw createError('Open job offer not found', 404);
  }

  try {
    const application = await Application.create({
      candidate: candidate._id,
      jobOffer: job._id,
      customCvUrl: data.customCvUrl,
      motivationLetter: data.motivationLetter
    });

    return populateApplication(Application.findById(application._id));
  } catch (error) {
    if (error.code === 11000) {
      throw createError('You have already applied to this job offer', 409);
    }

    throw error;
  }
};

const getCandidateApplications = async (candidateId, userId) => {
  const candidate = await CandidateProfile.findOne({
    _id: candidateId,
    user: userId
  });

  if (!candidate) {
    throw createError('Candidate profile not found', 404);
  }

  return populateApplication(
    Application.find({ candidate: candidate._id }).sort({ createdAt: -1 })
  );
};

const findOwnedJob = async (jobOfferId, userId) => {
  const company = await CompanyProfile.findOne({ user: userId });

  if (!company) {
    throw createError('Company profile not found', 404);
  }

  const job = await JobOffer.findOne({
    _id: jobOfferId,
    company: company._id
  });

  if (!job) {
    throw createError('Job offer not found', 404);
  }

  return job;
};

const getJobApplications = async (jobOfferId, userId) => {
  const job = await findOwnedJob(jobOfferId, userId);

  return populateApplication(
    Application.find({ jobOffer: job._id }).sort({ createdAt: -1 })
  );
};

const updateApplicationStatus = async (applicationId, userId, status) => {
  if (!Object.values(ApplicationStatus).includes(status)) {
    throw createError('Invalid application status', 400);
  }

  const application = await Application.findById(applicationId);

  if (!application) {
    throw createError('Application not found', 404);
  }

  await findOwnedJob(application.jobOffer, userId);
  application.status = status;
  await application.save();

  return populateApplication(Application.findById(application._id));
};

const validateApplication = async (applicationId, userId) => {
  const application = await findOwnedApplication(applicationId, userId);

  if (application.status !== ApplicationStatus.ACCEPTED) {
    throw createError('Only accepted applications can be validated', 409);
  }

  application.isValidatedByCandidate = true;
  await application.save();

  return populateApplication(Application.findById(application._id));
};

module.exports = {
  applyToJob,
  getCandidateApplications,
  getJobApplications,
  updateApplicationStatus,
  validateApplication
};