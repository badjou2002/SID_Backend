require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { MATCHING_QUEUE } = require('../services/matchingQueue');
const { processMatchingSyncJob } = require('../services/matchingWorkerProcessor');
const logger = require('../utils/logger');

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required to run the matching worker');
}

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const worker = new Worker(
  MATCHING_QUEUE,
  processMatchingSyncJob,
  { connection, concurrency: 1 }
);

worker.on('failed', (job, error) => {
  logger.error('Matching index job failed', {
    jobId: job && job.id,
    errorMessage: error.message
  });
});

worker.on('error', (error) => {
  logger.error('Matching worker error', { errorMessage: error.message });
});

const shutdown = async () => {
  await worker.close();
  await connection.quit();
};

process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
