const CompanyProfile = require('../models/CompanyProfile');
const ApiError = require('../utils/ApiError');

const findCompanyProfile = async (userId) => {
  const company = await CompanyProfile.findOne({ user: userId });

  if (!company) {
    throw ApiError.notFound('Company profile not found');
  }

  return company;
};

const populateCompany = (document) => document.populate(
  'company',
  'companyName industry logo'
);

module.exports = { findCompanyProfile, populateCompany };
