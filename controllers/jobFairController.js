const adminService = require('../services/adminService');

const getJobFairs = async (req, res, next) => {
  try {
    const jobFairs = await adminService.getJobFairs();
    res.json({ success: true, count: jobFairs.length, data: jobFairs });
  } catch (err) {
    next(err);
  }
};

const createJobFair = async (req, res, next) => {
  try {
    const jobFair = await adminService.createJobFair(req.body);
    res.status(201).json({ success: true, data: jobFair });
  } catch (err) {
    next(err);
  }
};

module.exports = { getJobFairs, createJobFair };
