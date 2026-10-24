require('dotenv').config();
const connectDB = require('../config/db');
const { startMatchingWorker, closeMatchingQueue } = require('../services/matchingQueue');
const { processMatchingSyncJob } = require('../services/matchingWorkerProcessor');
const logger = require('../utils/logger');

const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required to run the matching worker');
  }
  await connectDB();
  await startMatchingWorker(processMatchingSyncJob);
  logger.info('Matching Agenda worker started');
};

const shutdown = async () => {
  await closeMatchingQueue();
  await require('mongoose').disconnect();
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    shutdown()
      .then(() => process.exit(0))
      .catch((error) => {
        logger.error('Failed to stop matching worker cleanly', {
          errorMessage: error.message
        });
        process.exit(1);
      });
  });
}

start().catch((error) => {
  logger.error('Failed to start matching Agenda worker', { errorMessage: error.message });
  process.exitCode = 1;
});
