const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const created = (res, data) => ok(res, data, 201);

const fail = (res, statusCode, message, extra = {}) =>
  res.status(statusCode).json({ success: false, message, ...extra });

module.exports = { ok, created, fail };
