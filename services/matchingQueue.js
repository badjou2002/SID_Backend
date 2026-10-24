const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const MATCHING_QUEUE = 'sid-agent-matching-sync';
let queue;
let queueConnection;
let disabledWarningLogged = false;

const matchingIntegrationConfigured = () => (
  Boolean(process.env.REDIS_URL && process.env.SID_AGENT_URL && process.env.SID_SERVICE_API_KEY)
);

const matchingIntegrationPartiallyConfigured = () => (
  Boolean(process.env.REDIS_URL || process.env.SID_AGENT_URL || process.env.SID_SERVICE_API_KEY)
);

const getMatchingQueue = () => {
  if (queue) {
    return queue;
  }
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for background matching updates');
  }

  queueConnection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  queue = new Queue(MATCHING_QUEUE, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 }
    }
  });
  return queue;
};

const enqueueMatchingSync = async ({ entity, entityId }) => {
  if (!matchingIntegrationConfigured()) {
    if (matchingIntegrationPartiallyConfigured()) {
      throw ApiError.unavailable(
        'Configure REDIS_URL, SID_AGENT_URL and SID_SERVICE_API_KEY together to enable matching updates'
      );
    }
    if (!disabledWarningLogged) {
      logger.warn('Matching index updates are disabled; configure REDIS_URL, SID_AGENT_URL and SID_SERVICE_API_KEY');
      disabledWarningLogged = true;
    }
    return { status: 'disabled' };
  }
  try {
    const job = await getMatchingQueue().add('sync-platform-index', {
      entity,
      entityId: String(entityId)
    });
    return { status: 'queued', jobId: job.id };
  } catch (error) {
    logger.error('Failed to enqueue matching index update', {
      entity,
      entityId: String(entityId),
      errorMessage: error.message
    });
    throw ApiError.unavailable(
      'The record was saved, but its matching index update could not be queued'
    );
  }
};

const closeMatchingQueue = async () => {
  if (queue) {
    const activeQueue = queue;
    const activeConnection = queueConnection;
    queue = undefined;
    queueConnection = undefined;
    await activeQueue.close();
    if (activeConnection && activeConnection.status !== 'end') {
      await activeConnection.quit();
    }
  }
};

module.exports = {
  MATCHING_QUEUE,
  enqueueMatchingSync,
  closeMatchingQueue,
  matchingIntegrationConfigured
};
