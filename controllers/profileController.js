const CompanyProfile = require('../models/CompanyProfile');

// ==================== RECRUITER ====================

// Créer le profil de l'entreprise
const createCompanyProfile = async (req, res, next) => {
  try {
    // Vérifier si le Recruiter possède déjà un profil
    const existingProfile = await CompanyProfile.findOne({
      user: req.user._id
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà un profil entreprise'
      });
    }

    const profile = await CompanyProfile.create({
      user: req.user._id,
      companyName: req.body.companyName,
      description: req.body.description,
      industry: req.body.industry,
      address: req.body.address,
      phone: req.body.phone,
      website: req.body.website,
      logo: req.body.logo
    });
    const indexing = await enqueueMatchingSync({ entity: 'company', entityId: profile._id });

    return res.status(201).json({
      success: true,
      message: 'Profil entreprise créé avec succès',
      profile,
      indexing
    });
  } catch (error) {
    return next(error);
  }
};

// Consulter son profil
const getMyCompanyProfile = async (req, res) => {
  try {
    const profile = await CompanyProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil entreprise introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Modifier son profil
const updateCompanyProfile = async (req, res, next) => {
  try {
    const profile = await CompanyProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil entreprise introuvable'
      });
    }

    const allowedFields = [
      'companyName',
      'description',
      'industry',
      'address',
      'phone',
      'website',
      'logo'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    await profile.save();
    const indexing = await enqueueMatchingSync({ entity: 'company', entityId: profile._id });

    return res.status(200).json({
      success: true,
      message: 'Profil entreprise modifié avec succès',
      profile,
      indexing
    });
  } catch (error) {
    return next(error);
  }
};

// Supprimer son profil
const deleteCompanyProfile = async (req, res, next) => {
  try {
    const profile = await CompanyProfile.findOne({
      user: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil entreprise introuvable'
      });
    }

    await CompanyProfile.findByIdAndDelete(profile._id);
    const indexing = await enqueueMatchingSync({ entity: 'company', entityId: profile._id });

    return res.status(200).json({
      success: true,
      message: 'Profil entreprise supprimé avec succès',
      indexing
    });
  } catch (error) {
    return next(error);
  }
};
    
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const { Role } = require('../enums');
const { enqueueMatchingSync } = require('../services/matchingQueue');

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
  if (!req.user || req.user.role !== Role.CANDIDATE) {
    throw ApiError.forbidden('Candidate access only');
  }
  const profile = await CandidateProfile.findOne({ user: req.user._id }).select('-cvEmbedding').populate(
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
    const activeUserIds = await User.find({ isDeleted: { $ne: true } }).distinct('_id');
    const filter = {};
    filter.user = { $in: activeUserIds };
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

const createMyProfile = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== Role.CANDIDATE) {
      throw ApiError.forbidden('Candidate access only');
    }
    const existing = await CandidateProfile.findOne({ user: req.user._id });
    if (existing) {
      throw ApiError.conflict('Candidate profile already exists');
    }
    const profile = await CandidateProfile.create({
      user: req.user._id,
      fullName: req.body.fullName,
      phone: req.body.phone,
      city: req.body.city,
      parsedSkills: req.body.parsedSkills,
      parsedExperiences: req.body.parsedExperiences,
      parsedEducation: req.body.parsedEducation
    });
    profile.completenessScore = computeCompleteness(profile);
    await profile.save();
    const indexing = await enqueueMatchingSync({ entity: 'candidate', entityId: profile._id });
    await profile.populate('user', 'email role createdAt');
    const profileData = profile.toObject();
    delete profileData.cvEmbedding;
    return res.status(201).json({ success: true, profile: profileData, indexing });
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
    const indexing = await enqueueMatchingSync({ entity: 'candidate', entityId: profile._id });

    const profileData = profile.toObject();
    delete profileData.cvEmbedding;
    return res.status(200).json({ success: true, data: profileData, indexing });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createCompanyProfile,
  getMyCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
  getMyProfile,
  createMyProfile,
  updateMyProfile,
  getAllProfiles,
  computeCompleteness,
  requireCandidateProfile
};
