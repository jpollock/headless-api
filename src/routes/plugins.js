import express from 'express';
import * as pluginService from '../services/pluginService.js';

const router = express.Router();

router.get('/info/1.2', async (req, res, next) => {
  try {
    const action = req.query.action;
    if (action === 'plugin_information') {
      const data = await pluginService.getPluginInformation(req.query);
      res.json(data);
    } else if (action === 'query_plugins') {
      const data = await pluginService.queryPlugins(req.query);
      res.json(data);
    } else {
      res.status(400).json({ error: 'Invalid or unsupported action' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/update', async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await pluginService.triggerPluginUpdate(force);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/update-status', async (req, res, next) => {
  try {
    const status = pluginService.getUpdateStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;