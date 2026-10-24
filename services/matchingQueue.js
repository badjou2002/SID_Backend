const { Agenda } = require('agenda');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const MATCHING_JOB = 'sid-agent-matching-sync';
const MAX_ATTEMPTS = 5;
let agenda;
let agendaReady;
let disabledWarningLogged = false;

const matchingIntegrationConfigured = () => (
  Boolean(process.env.MONGO_URI && process.env.SID_AGENT_URL && process.env.SID_SERVICE_API_KEY)
);

const matchingIntegrationPartiallyConfigured = () => (
  Boolean(process.env.MONGO_URI || process.env.SID_AGENT_URL || process.env.SID_SERVICE_API_KEY)
);

const getMatchingAgenda = async () => {
  if (agenda) {
    await agendaReady;
    return agenda;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required for background matching updates');
  }

  agenda = new Agenda({
    db: {
      address: process.env.MONGO_URI,
      collection: 'sidAgentAgendaJobs'
    },
    processEvery: '1 second',
    defaultConcurrency: 1,
    maxConcurrency: 1,
    defaultLockLifetime: (Number(process.env.SID_AGENT_SYNC_TIMEOUT_MS) || 180000) + 30000
  });
  agenda.on('error', (error) => {
    logger.error('Matching Agenda error', { errorMessage: error.message });
  });
  agendaReady = new Promise((resolve, reject) => {
    agenda.once('ready', resolve);
    agenda.once('error', reject);
  });
  await agendaReady;
  return agenda;
};

const enqueueMatchingSync = async ({ entity, entityId }) => {
  if (!matchingIntegrationConfigured()) {
    if (matchingIntegrationPartiallyConfigured()) {
      throw ApiError.unavailable(
        'Configure MONGO_URI, SID_AGENT_URL and SID_SERVICE_API_KEY together to enable matching updates'
      );
    }
    if (!disabledWarningLogged) {
      logger.warn('Matching index updates are disabled; configure MONGO_URI, SID_AGENT_URL and SID_SERVICE_API_KEY');
      disabledWarningLogged = true;
    }
    return { status: 'disabled' };
  }
  try {
    const scheduler = await getMatchingAgenda();
    const job = await scheduler.now(MATCHING_JOB, {
      entity,
      entityId: String(entityId),
      attemptsMade: 0
    });
    return { status: 'queued', jobId: String(job.attrs._id) };
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

const registerMatchingJob = async (processJob) => {
  const scheduler = await getMatchingAgenda();
  scheduler.define(
    MATCHING_JOB,
    {
      concurrency: 1,
      lockLifetime: (Number(process.env.SID_AGENT_SYNC_TIMEOUT_MS) || 180000) + 30000
    },
    async (job) => {
      try {
        return await processJob(job);
      } catch (error) {
        const attemptsMade = Number(job.attrs.data.attemptsMade) || 0;
        if (attemptsMade + 1 >= MAX_ATTEMPTS) {
          throw error;
        }

        const nextAttempt = attemptsMade + 1;
        const retryDelayMs = 1000 * (2 ** attemptsMade);
        job.attrs.data.attemptsMade = nextAttempt;
        job.schedule(new Date(Date.now() + retryDelayMs));
        logger.warn('Matching index job scheduled for retry', {
          jobId: String(job.attrs._id),
          attempt: nextAttempt + 1,
          maxAttempts: MAX_ATTEMPTS,
          retryDelayMs,
          errorMessage: error.message
        });
        return { retrying: true, attempt: nextAttempt + 1 };
      }
    }
  );
  return scheduler;
};

const startMatchingWorker = async (processJob) => {
  const scheduler = await registerMatchingJob(processJob);
  scheduler.on(`fail:${MATCHING_JOB}`, (error, job) => {
    logger.error('Matching index job failed permanently', {
      jobId: String(job.attrs._id),
      attemptsMade: job.attrs.data.attemptsMade,
      errorMessage: error.message
    });
  });
  await scheduler.start();
  return scheduler;
};

const closeMatchingQueue = async () => {
  if (agenda) {
    const activeAgenda = agenda;
    agenda = undefined;
    agendaReady = undefined;
    await activeAgenda.stop();
    await activeAgenda.close({ force: true });
  }
};

module.exports = {
  MATCHING_JOB,
  enqueueMatchingSync,
  startMatchingWorker,
  closeMatchingQueue,
  matchingIntegrationConfigured
};
