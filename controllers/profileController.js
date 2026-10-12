const CompanyProfile = require('../models/CompanyProfile');

// ==================== RECRUITER ====================

// Créer le profil de l'entreprise
const createCompanyProfile = async (req, res) => {
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

    return res.status(201).json({
      success: true,
      message: 'Profil entreprise créé avec succès',
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
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
const updateCompanyProfile = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Profil entreprise modifié avec succès',
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Supprimer son profil
const deleteCompanyProfile = async (req, res) => {
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

    return res.status(200).json({
      success: true,
      message: 'Profil entreprise supprimé avec succès'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createCompanyProfile,
  getMyCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile
};