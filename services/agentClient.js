const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const getAgentConfig = () => {
  const baseUrl = process.env.SID_AGENT_URL;
  const serviceKey = process.env.SID_SERVICE_API_KEY;

  if (!baseUrl || !serviceKey) {
    throw ApiError.unavailable('SID Agent integration is not configured');
  }

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw ApiError.unavailable('SID_AGENT_URL must be a valid absolute URL');
  }

  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw ApiError.unavailable('SID_AGENT_URL must use HTTP or HTTPS');
  }

  return { baseUrl: parsedBaseUrl, serviceKey };
};

const requestAgent = async ({
  path,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = Number(process.env.SID_AGENT_TIMEOUT_MS) || 60000
}) => {
  const { baseUrl, serviceKey } = getAgentConfig();
  const url = new URL(path.replace(/^\/+/, ''), `${baseUrl.toString().replace(/\/+$/, '')}/`);
  const requestHeaders = new Headers({
    Accept: headers.accept || 'application/json',
    'X-Service-Key': serviceKey
  });

  for (const name of ['x-platform-user-id', 'content-type', 'idempotency-key']) {
    if (headers[name]) {
      requestHeaders.set(name, headers[name]);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    logger.error('SID Agent request failed', {
      path,
      method,
      errorMessage: error.message
    });
    throw ApiError.unavailable('SID Agent is temporarily unavailable');
  }

  return response;
};

module.exports = { requestAgent };
