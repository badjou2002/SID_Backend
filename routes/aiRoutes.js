const express = require('express');
const { protect, authorizeRoles } = require('../middlewares/authMiddleware');
const { Role } = require('../enums');
const { requestAgent } = require('../services/agentClient');

const router = express.Router();

const id = '[^/]{1,128}';
const version = '[1-9][0-9]{0,8}';
const policies = [
  ['POST', /^\/agent\/parse-cv$/, [Role.CANDIDATE]],
  ['POST', /^\/agent\/generate-pack$/, [Role.CANDIDATE]],
  ['POST', /^\/agent\/chat$/, [Role.CANDIDATE, Role.RECRUITER]],
  ['POST', /^\/agent\/source-candidates$/, [Role.RECRUITER]],
  ['POST', /^\/agent\/score-application$/, [Role.RECRUITER]],
  ['POST', /^\/agent\/evaluate-profile$/, [Role.CANDIDATE]],
  ['POST', /^\/agent\/candidate-refs\/resolve$/, [Role.RECRUITER]],
  ['GET', /^\/agent\/capabilities$/, [Role.ADMIN]],
  ['POST', /^\/v1\/cv-imports$/, [Role.CANDIDATE]],
  ['GET|PUT|DELETE', new RegExp(`^/v1/cv-imports/${id}$`), [Role.CANDIDATE]],
  ['GET', new RegExp(`^/v1/cv-imports/${id}/versions/${version}$`), [Role.CANDIDATE]],
  ['POST', new RegExp(`^/v1/cv-imports/${id}/accept$`), [Role.CANDIDATE]],
  ['POST', /^\/v1\/profiles$/, [Role.CANDIDATE]],
  ['GET|PUT', new RegExp(`^/v1/profiles/${id}$`), [Role.CANDIDATE]],
  ['GET', new RegExp(`^/v1/profiles/${id}/versions/${version}$`), [Role.CANDIDATE]],
  ['POST', new RegExp(`^/v1/profiles/${id}/accept$`), [Role.CANDIDATE]],
  ['GET', new RegExp(`^/v1/profiles/${id}/evaluation$`), [Role.CANDIDATE]],
  ['POST', /^\/v1\/application-drafts\/preview$/, [Role.ADMIN]],
  ['POST', /^\/v1\/application-drafts$/, [Role.CANDIDATE]],
  ['POST', /^\/v1\/application-dossiers$/, [Role.CANDIDATE]],
  ['GET|PUT', new RegExp(`^/v1/application-drafts/${id}$`), [Role.CANDIDATE]],
  ['GET', new RegExp(`^/v1/application-drafts/${id}/versions/${version}$`), [Role.CANDIDATE]],
  ['PUT', new RegExp(`^/v1/application-drafts/${id}/evidence$`), [Role.CANDIDATE]],
  ['POST', new RegExp(`^/v1/application-drafts/${id}/approvals$`), [Role.CANDIDATE]],
  ['GET', new RegExp(`^/v1/tasks/${id}$`), [Role.CANDIDATE]],
  ['POST', /^\/v1\/conversations$/, [Role.CANDIDATE, Role.RECRUITER]],
  ['GET|DELETE', new RegExp(`^/v1/conversations/${id}$`), [Role.CANDIDATE, Role.RECRUITER]],
  ['POST', new RegExp(`^/v1/conversations/${id}/turns$`), [Role.CANDIDATE, Role.RECRUITER]],
  ['POST', /^\/v1\/knowledge\/search$/, [Role.ADMIN]],
  ['GET', /^\/v1\/knowledge\/status$/, [Role.ADMIN]],
  ['GET', /^\/v1\/operations\/status$/, [Role.ADMIN]],
  ['GET', /^\/v1\/matching\/status$/, [Role.ADMIN]],
  ['GET', /^\/v1\/ai\/status$/, [Role.ADMIN]],
  ['GET', /^\/health$/, []],
  ['GET', /^\/health\/ready$/, []],
  ['GET', /^\/$/, []]
];

const findPolicy = (method, path) => policies.find(([methods, pattern]) => (
  methods.split('|').includes(method) && pattern.test(path)
));

const runMiddleware = (middleware, req, res) => new Promise((resolve, reject) => {
  middleware(req, res, (error) => error ? reject(error) : resolve());
});

const authorizeRequest = async (req, res, roles) => {
  if (roles.length === 0) {
    return true;
  }

  await runMiddleware(protect, req, res);
  if (res.headersSent) {
    return false;
  }
  await runMiddleware(authorizeRoles(...roles), req, res);
  return !res.headersSent;
};

router.use(async (req, res, next) => {
  const path = req.path.replace(/\/+$/, '') || '/';
  const policy = findPolicy(req.method, path);

  if (!policy) {
    return next();
  }

  try {
    if (!await authorizeRequest(req, res, policy[2])) {
      return;
    }

    let body;
    if (path === '/agent/parse-cv' && req.method === 'POST') {
      await runMiddleware(express.raw({ type: 'application/pdf', limit: '5mb' }), req, res);
      if (res.headersSent) {
        return;
      }
      body = req.body;
    } else if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body !== undefined) {
      body = Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
    }

    const upstreamPath = path.startsWith('/v1/')
      ? `/api${path}`
      : path.startsWith('/agent/')
        ? path
        : path === '/'
          ? '/'
          : path;
    const upstream = await requestAgent({
      path: `${upstreamPath}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`,
      method: req.method,
      headers: {
        'x-platform-user-id': req.user ? String(req.user._id) : undefined,
        'content-type': req.headers['content-type'],
        'idempotency-key': req.headers['idempotency-key'],
        accept: req.headers.accept
      },
      body
    });

    for (const header of ['content-type', 'location', 'retry-after', 'cache-control']) {
      const value = upstream.headers.get(header);
      if (value) {
        res.set(header, value);
      }
    }
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(responseBody);
  } catch (error) {
    if (error.statusCode === 503) {
      res.set('Retry-After', '5');
      return res.status(503).json({ success: false, message: error.message });
    }
    return next(error);
  }
});

module.exports = router;
