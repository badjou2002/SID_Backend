const CandidateProfile = require('../models/CandidateProfile');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const { Role } = require('../enums');

const PROFILE_FIELDS = [
  'fullName',
  'phone',
  'city',
  'rawCvUrl',
  'parsedSkills',
  'parsedExperiences',
  'parsedEducation'
];

const UPDATABLE_FIELDS = [
  'fullName',
  'phone',
  'city',
  'parsedSkills',
  'parsedExperiences',
  'parsedEducation'
];

const computeCompleteness = (profile) => {
  const filled = PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim() !== '';
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
};

const requireCandidateProfile = async (req) => {
  if (!req.body.user || req.body.user.role !== Role.CANDIDATE) {
    throw ApiError.forbidden('Candidate access only');
  }
  const profile = await CandidateProfile.findOne({ user: req.body.user._id }).populate(
    'user',
    'email role createdAt'
  );
  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }
  return profile;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllProfiles = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ fullName: rx }, { city: rx }, { parsedSkills: rx }];
    }
    if (req.query.city) {
      filter.city = new RegExp(escapeRegex(req.query.city), 'i');
    }

    const profiles = await CandidateProfile.find(filter)
      .select('-cvEmbedding')
      .populate('user', 'email role createdAt')
      .sort({ createdAt: -1 });

    return ok(res, profiles);
  } catch (err) {
    return next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await requireCandidateProfile(req);
    return ok(res, profile);
  } catch (err) {
    return next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await requireCandidateProfile(req);

    const updates = {};
    UPDATABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(profile, updates);
    profile.completenessScore = computeCompleteness(profile);
    await profile.save();

    return ok(res, profile);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getAllProfiles,
  computeCompleteness,
  requireCandidateProfile
};
