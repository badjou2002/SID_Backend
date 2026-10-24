const adminService = require('../services/adminService');

const getAdminNews = async (req, res, next) => {
  try {
    const news = await adminService.getAdminNews();
    res.json({ success: true, count: news.length, data: news });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

const getAiInsights = async (req, res, next) => {
  try {
    const days = req.query.days === undefined ? 7 : Number(req.query.days);
    const insights = await adminService.getAiInsights(days);
    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminNews, getDashboardStats, getAiInsights };
