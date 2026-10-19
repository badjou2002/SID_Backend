const CompanyProfile = require('../models/CompanyProfile');
const JobOffer = require('../models/JobOffer');
const { OfferStatus } = require('../enums');

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const findCompanyProfile = async (userId) => {
  const company = await CompanyProfile.findOne({ user: userId });

  if (!company) {
    throw createError('Company profile not found', 404);
  }

  return company;
};

const findOwnedJob = async (jobId, userId) => {
  const company = await findCompanyProfile(userId);
  const job = await JobOffer.findOne({ _id: jobId, company: company._id });

  if (!job) {
    throw createError('Job offer not found', 404);
  }

  return job;
};

const populateCompany = (job) => job.populate('company', 'companyName industry logo');

const getAllJobs = async (query = {}) => {
  const filter = { status: OfferStatus.OPEN };

  if (typeof query.type === 'string' && query.type) {
    filter.type = query.type;
  }

  if (typeof query.search === 'string' && query.search.trim()) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const search = new RegExp(escapedSearch, 'i');

    filter.$or = [
      { title: search },
      { description: search },
      { requiredSkills: search }
    ];
  }

  return JobOffer.find(filter)
    .populate('company', 'companyName industry logo')
    .sort({ createdAt: -1 });
};

const getJobById = async (jobId) => {
  const job = await JobOffer.findById(jobId);

  if (!job) {
    throw createError('Job offer not found', 404);
  }

  return populateCompany(job);
};

const createJob = async (userId, data) => {
  const company = await findCompanyProfile(userId);
  const job = await JobOffer.create({
    company: company._id,
    title: data.title,
    type: data.type,
    description: data.description,
    requiredSkills: data.requiredSkills
  });

  return populateCompany(job);
};

const updateJob = async (jobId, userId, data) => {
  const job = await findOwnedJob(jobId, userId);

  ['title', 'type', 'description', 'requiredSkills'].forEach((field) => {
    if (data[field] !== undefined) {
      job[field] = data[field];
    }
  });

  await job.save();
  return populateCompany(job);
};

const deleteJob = async (jobId, userId) => {
  const job = await findOwnedJob(jobId, userId);
  await job.deleteOne();
};

const closeJob = async (jobId, userId) => {
  const job = await findOwnedJob(jobId, userId);
  job.status = OfferStatus.CLOSED;
  await job.save();

  return populateCompany(job);
};

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  closeJob
};