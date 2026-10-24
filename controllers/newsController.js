/**
 * News Controller
 * Handles CRUD + publish toggle for company news.
 */

const newsService = require('../services/newsService');
const { Role } = require('../enums');

/**
 * GET /api/news
 * Public — returns all published news. Query: ?companyId=&search=
 */
const getAllNews = async (req, res, next) => {
  try {
    const news = await newsService.getAllNews(req.query);
    res.json({ success: true, count: news.length, data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/news/:id
 * Public — returns a single news article.
 */
const getNewsById = async (req, res, next) => {
  try {
    const news = await newsService.getNewsById(req.params.id);
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/news
 * Protected — RECRUITER only.
 * Body: { title, content, mediaUrl, mediaType }
 */
const createNews = async (req, res, next) => {
  try {
    const news = await newsService.createNews(req.user.id, req.body);
    res.status(201).json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/news/:id
 * Protected — RECRUITER + owner.
 */
const updateNews = async (req, res, next) => {
  try {
    const news = await newsService.updateNews(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/news/:id
 * Protected — RECRUITER + owner.
 */
const deleteNews = async (req, res, next) => {
  try {
    await newsService.deleteNews(
      req.params.id,
      req.user.id,
      req.user.role === Role.ADMIN
    );
    res.json({ success: true, message: 'News article deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/news/:id/publish
 * Protected — RECRUITER + owner. Toggles isPublished.
 */
const togglePublish = async (req, res, next) => {
  try {
    const news = await newsService.togglePublish(req.params.id, req.user.id);
    res.json({ success: true, data: news });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllNews, getNewsById, createNews, updateNews, deleteNews, togglePublish };
