const express = require('express');
const router = express.Router();
const {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  togglePublish
} = require('../controllers/newsController');
const { protect, authorize } = require('../middlewares/authMiddleware');

/**
 * News Routes
 */

// GET  /api/news          — Public: list published news
router.get('/', getAllNews);

// GET  /api/news/:id      — Public: get single article
router.get('/:id', getNewsById);

// POST /api/news          — RECRUITER: create news
router.post('/', protect, authorize('RECRUITER'), createNews);

// PUT  /api/news/:id      — RECRUITER (owner): update
router.put('/:id', protect, authorize('RECRUITER'), updateNews);

// DELETE /api/news/:id   — RECRUITER (owner): delete
router.delete('/:id', protect, authorize('RECRUITER'), deleteNews);

// PATCH /api/news/:id/publish — RECRUITER (owner): toggle publish
router.patch('/:id/publish', protect, authorize('RECRUITER'), togglePublish);

module.exports = router;
