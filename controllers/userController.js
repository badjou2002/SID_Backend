const userService = require('../services/user.services');

// Récupérer tous les utilisateurs
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer un utilisateur par son ID
const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Modifier un utilisateur
const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Supprimer un utilisateur
const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Activer ou désactiver un utilisateur
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive doit être un booléen'
      });
    }

    const user = await userService.updateUserStatus(
      req.params.id,
      isActive
    );

    return res.status(200).json({
      success: true,
      message: isActive
        ? 'Utilisateur activé avec succès'
        : 'Utilisateur désactivé avec succès',
      user
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Consulter son propre compte
 */
const getMyAccount = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user._id);

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Modifier son propre compte
 */
const updateMyAccount = async (req, res) => {
  try {
    // Seul l'email peut être modifié par cette route
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email valide'
      });
    }

    const user = await userService.updateUser(
      req.user._id,
      { email }
    );

    return res.status(200).json({
      success: true,
      message: 'Compte modifié avec succès',
      user
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Supprimer son propre compte
 */
const deleteMyAccount = async (req, res) => {
  try {
    await userService.deleteUser(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMyAccount,
  updateMyAccount,
  deleteMyAccount,
  updateUserStatus
};