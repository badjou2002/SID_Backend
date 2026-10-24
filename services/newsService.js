const CompanyNews = require('../models/CompanyNews');
const ApiError = require('../utils/ApiError');
const { findCompanyProfile, populateCompany } = require('./companyHelpers');

const findOwnedNews = async (newsId, userId) => {
  const company = await findCompanyProfile(userId);
  const news = await CompanyNews.findOne({ _id: newsId, company: company._id });

  if (!news) {
    throw ApiError.notFound('News article not found');
  }

  return news;
};

const getAllNews = async (query = {}) => {
  const filter = { isPublished: true };

  if (typeof query.companyId === 'string' && query.companyId) {
    filter.company = query.companyId;
  }

  if (typeof query.search === 'string' && query.search.trim()) {
    const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const search = new RegExp(escapedSearch, 'i');
    filter.$or = [{ title: search }, { content: search }];
  }

  return CompanyNews.find(filter)
    .populate('company', 'companyName industry logo')
    .sort({ createdAt: -1 });
};

const getNewsById = async (newsId) => {
  const news = await CompanyNews.findOne({ _id: newsId, isPublished: true });

  if (!news) {
    throw ApiError.notFound('Published news article not found');
  }

  return populateCompany(news);
};

const createNews = async (userId, data) => {
  const company = await findCompanyProfile(userId);
  const news = await CompanyNews.create({
    company: company._id,
    title: data.title,
    content: data.content,
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType
  });

  return populateCompany(news);
};

const updateNews = async (newsId, userId, data) => {
  const news = await findOwnedNews(newsId, userId);

  ['title', 'content', 'mediaUrl', 'mediaType'].forEach((field) => {
    if (data[field] !== undefined) {
      news[field] = data[field];
    }
  });

  await news.save();
  return populateCompany(news);
};

const deleteNews = async (newsId, userId, isAdmin = false) => {
  const news = isAdmin
    ? await CompanyNews.findById(newsId)
    : await findOwnedNews(newsId, userId);

  if (!news) {
    throw ApiError.notFound('News article not found');
  }

  await news.deleteOne();
};

const togglePublish = async (newsId, userId) => {
  const news = await findOwnedNews(newsId, userId);
  news.isPublished = !news.isPublished;
  await news.save();

  return populateCompany(news);
};

module.exports = {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  togglePublish
};