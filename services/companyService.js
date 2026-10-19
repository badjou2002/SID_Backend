const CompanyProfile = require('../models/CompanyProfile');

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getAllCompanies = async (query = {}) => {
  const filter = {};
  const industry = query.industry || query.sector;

  if (typeof industry === 'string' && industry.trim()) {
    filter.industry = industry.trim();
  }

  if (query.verified === 'true') {
    filter.isVerified = true;
  } else if (query.verified === 'false') {
    filter.isVerified = { $in: [false, null] };
  }

  if (typeof query.search === 'string' && query.search.trim()) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const search = new RegExp(escapedSearch, 'i');
    filter.$or = [
      { companyName: search },
      { industry: search },
      { description: search }
    ];
  }

  return CompanyProfile.find(filter).sort({ createdAt: -1 });
};

const getCompanyById = async (companyId) => {
  const company = await CompanyProfile.findById(companyId);

  if (!company) {
    throw createError('Company profile not found', 404);
  }

  return company;
};

const updateCompany = async (companyId, userId, data) => {
  const company = await CompanyProfile.findOne({
    _id: companyId,
    user: userId
  });

  if (!company) {
    throw createError('Company profile not found', 404);
  }

  ['companyName', 'description', 'address', 'phone', 'website', 'logo'].forEach((field) => {
    if (data[field] !== undefined) {
      company[field] = data[field];
    }
  });

  if (data.industry !== undefined || data.sector !== undefined) {
    company.industry = data.industry !== undefined ? data.industry : data.sector;
  }

  await company.save();
  return company;
};

const verifyCompany = async (companyId) => {
  const company = await CompanyProfile.findById(companyId);

  if (!company) {
    throw createError('Company profile not found', 404);
  }

  company.isVerified = !company.isVerified;
  await company.save();
  return company;
};

module.exports = {
  getAllCompanies,
  getCompanyById,
  updateCompany,
  verifyCompany
};
