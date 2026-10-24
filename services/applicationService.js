const Application = require('../models/Application');
const CandidateProfile = require('../models/CandidateProfile');
const CompanyProfile = require('../models/CompanyProfile');
const JobOffer = require('../models/JobOffer');
const ApiError = require('../utils/ApiError');
const { ApplicationStatus, OfferStatus, Role } = require('../enums');

const findCandidateProfile = async (userId) => {
  const candidate = await CandidateProfile.findOne({ user: userId });

  if (!candidate) {
    throw ApiError.notFound('Candidate profile not found');
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
    throw ApiError.notFound('Application not found');
  }

  return application;
};

const populateJobOffer = (query) => query.populate({
    path: 'jobOffer',
    populate: {
      path: 'company',
      select: 'companyName industry logo'
    }
  });

const populateApplication = (query) => populateJobOffer(query)
  .populate({
    path: 'candidate',
    select: 'fullName phone city user'
  });

const applyToJob = async (userId, data) => {
  const candidate = await findCandidateProfile(userId);
  const jobOfferId = data.jobOfferId || data.jobOffer;
  const job = await JobOffer.findById(jobOfferId);

  if (!job) {
    throw ApiError.notFound('Job offer not found');
  }
  if (job.status !== OfferStatus.OPEN) {
    throw ApiError.conflict('This job offer is closed');
  }

  try {
    const application = await Application.create({
      candidate: candidate._id,
      jobOffer: job._id,
      customCvUrl: data.customCvUrl,
      motivationLetter: data.motivationLetter,
      isValidatedByCandidate: true
    });

    return populateApplication(Application.findById(application._id));
  } catch (error) {
    if (error.code === 11000) {
      throw ApiError.conflict('You have already applied to this job offer');
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
    throw ApiError.notFound('Candidate profile not found');
  }

  return populateApplication(
    Application.find({ candidate: candidate._id }).sort({ createdAt: -1 })
  );
};

const getMyApplications = async (userId, status) => {
  const candidate = await findCandidateProfile(userId);
  const filter = { candidate: candidate._id };
  if (status) {
    filter.status = status;
  }

  return populateJobOffer(
    Application.find(filter).sort({ createdAt: -1 })
  );
};

const findOwnedJob = async (jobOfferId, userId) => {
  const company = await CompanyProfile.findOne({ user: userId });
  if (!company) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  const job = await JobOffer.findById(jobOfferId);

  if (!job) {
    throw ApiError.notFound('Job offer not found');
  }
  if (String(job.company) !== String(company._id)) {
    throw ApiError.forbidden('Insufficient permissions');
  }

  return job;
};

const getJobApplications = async (jobOfferId, userId) => {
  const job = await findOwnedJob(jobOfferId, userId);

  return populateApplication(
    Application.find({ jobOffer: job._id }).sort({ createdAt: -1 })
  );
};

const updateApplicationStatus = async (applicationId, userId, status, isAdmin = false) => {
  if (!Object.values(ApplicationStatus).includes(status)) {
    throw ApiError.badRequest('Invalid application status');
  }

  const application = await Application.findById(applicationId);

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  if (!isAdmin) {
    await findOwnedJob(application.jobOffer, userId);
  }
  application.status = status;
  await application.save();

  return populateApplication(Application.findById(application._id));
};

const validateApplication = async (applicationId, userId) => {
  const application = await findOwnedApplication(applicationId, userId);

  if (application.status !== ApplicationStatus.ACCEPTED) {
    throw ApiError.conflict('Only accepted applications can be validated');
  }

  application.isValidatedByCandidate = true;
  await application.save();

  return populateApplication(Application.findById(application._id));
};

module.exports = {
  applyToJob,
  getCandidateApplications,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus,
  validateApplication
};