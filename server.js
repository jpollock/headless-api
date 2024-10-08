import app from './src/app.js';
import config from './src/config/index.js';
import cron from 'node-cron';
import { fetchPluginUpdates } from './src/services/pluginService.js';
import { initializePubSub } from './src/services/pubsubService.js';
import { closeMongo } from './src/services/cacheService.js';

const port = process.env.PORT || config.port || 3000;

async function startServer() {
  try {
    if (config.pubsub.enabled) {
      await initializePubSub();
    } else {
      console.log('Pub/Sub is disabled.');
    }

    const job = cron.schedule(config.updateInterval, async () => {
      console.log('Running scheduled plugin update task');
      await fetchPluginUpdates();
    });

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      job.stop();
      server.close(async () => {
        console.log('HTTP server closed.');
        await closeMongo();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();