import express from 'express';
import cron from 'node-cron';
import config from './config/index.js';
import pluginRoutes from './routes/plugins.js';
import { fetchPluginUpdates } from './services/pluginService.js';
import { initializePubSub } from './services/pubsubService.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use('/plugins', pluginRoutes);
app.use(errorHandler);

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

    const port = config.port;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;