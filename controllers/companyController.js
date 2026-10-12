/**
 * Company Controller
 * Handles listing, detail, update and admin-verify for company profiles.
 */

const companyService = require('../services/companyService');

/**
 * GET /api/companies
 * Public — list all companies. Query: ?sector=&search=&verified=true
 */
const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await companyService.getAllCompanies(req.query);
    res.json({ success: true, count: companies.length, data: companies });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companies/:id
 * Public — single company.
 */
const getCompanyById = async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/companies/:id
 * Protected — RECRUITER (owner of this profile).
 * Body: { companyName, sector, address, description }
 */
const updateCompany = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/companies/:id/verify
 * Protected — ADMIN only. Toggles isVerified flag.
 */
const verifyCompany = async (req, res, next) => {
  try {
    const company = await companyService.verifyCompany(req.params.id);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCompanies, getCompanyById, updateCompany, verifyCompany };
