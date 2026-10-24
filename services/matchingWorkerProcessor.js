const logger = require('../utils/logger');
const { requestAgent } = require('./agentClient');

const processMatchingSyncJob = async (job) => {
  const response = await requestAgent({
    path: '/api/v1/matching/sync',
    method: 'POST',
    timeoutMs: Number(process.env.SID_AGENT_SYNC_TIMEOUT_MS) || 180000
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`SID Agent matching sync returned ${response.status}`);
  }
  logger.info('Matching index synchronized', {
    jobId: String(job.attrs._id),
    entity: job.attrs.data.entity,
    result: payload
  });
  return payload;
};

module.exports = { processMatchingSyncJob };
