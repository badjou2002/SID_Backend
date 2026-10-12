/**
 * Auth Controller
 * Handles register, login, and me (current user).
 */

const authService = require('../services/authService');
const CandidateProfile = require('../models/CandidateProfile');
const CompanyProfile = require('../models/CompanyProfile');
const { Role } = require('../enums');

/**
 * POST /api/auth/register
 * Body: { email, password, role }
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'email, password and role are required' });
    }

    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ success: false, message: `role must be one of: ${Object.values(Role).join(', ')}` });
    }

    const { user, token } = await authService.register(email, password, role);

    // Auto-create the matching profile
    if (role === Role.CANDIDATE) {
      await CandidateProfile.create({ user: user._id });
    } else if (role === Role.RECRUITER) {
      await CompanyProfile.create({ user: user._id, companyName: email.split('@')[0] });
    }

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const { user, token } = await authService.login(email, password);
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected — requires valid JWT.
 */
const me = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
