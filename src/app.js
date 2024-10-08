import express from 'express';
import config from './config/index.js';
import pluginRoutes from './routes/plugins.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use('/plugins', pluginRoutes);
app.use(errorHandler);

export default app;