import app from './src/app.js';
import config from './src/config/index.js';
import cron from 'node-cron';
import { fetchPluginUpdates } from './src/services/pluginService.js';
import { initializePubSub } from './src/services/pubsubService.js';

const port = process.env.PORT || config.port || 3000;

async function startServer() {
  try {
    if (config.pubsub.enabled) {
      await initializePubSub();
    } else {
      console.log('Pub/Sub is disabled.');
    }

    cron.schedule(config.updateInterval, async () => {
      console.log('Running scheduled plugin update task');
      await fetchPluginUpdates();
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();