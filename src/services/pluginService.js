import axios from 'axios';
import * as cacheService from './cacheService.js';
import { parseCustomDate, formatCustomDate } from '../utils/dateUtils.js';
import { publishPluginUpdate } from './pubsubService.js';
import config from '../config/index.js';
import fs from 'fs/promises';

const REMOTE_API_BASE_URL = config.remoteApiBaseUrl;
const LAST_UPDATE_FILE = 'last_update.txt';
let updateInProgress = false;
let lastUpdateStatus = null;

async function fetchFromRemoteAPI(path, params, headers = {}) {
  const backendUrl = `${REMOTE_API_BASE_URL}${path}`;
  return axios({
    method: 'GET',
    url: backendUrl,
    params: params,
    headers: {
      ...headers,
      host: new URL(REMOTE_API_BASE_URL).host
    }
  });
}

async function getOrSetCache(path, params) {
  const cacheKey = cacheService.generateCacheKey(path, params);
  let cachedData = await cacheService.get(cacheKey);

  if (cachedData) {
    console.log('Cache hit for:', cacheKey);
    return cachedData;
  }

  console.log('Cache miss for:', cacheKey);
  const response = await fetchFromRemoteAPI(path, params);
  await cacheService.set(cacheKey, response.data);

  return response.data;
}
async function getOrSetCacheSlug(path, params) {
    const cacheKey = cacheService.generateCacheKeyForSlug(path, params);
    let cachedData = await cacheService.get(cacheKey);
  
    if (cachedData) {
      console.log('Cache hit for:', cacheKey);
      return cachedData;
    }
  
    console.log('Cache miss for:', cacheKey);
    const response = await fetchFromRemoteAPI(path, params);
    response.data.last_updated_time = parseCustomDate(response.data.last_updated).getTime();
    await cacheService.set(cacheKey, response.data);
  
    return response.data;
  }
  
export async function getPluginInformation(query) {
  const path = '/plugins/info/1.2/';
  const params = {
    action: 'plugin_information',
    ...query
  };

  return getOrSetCacheSlug(path, params);
}
/*
export async function queryPlugins(query) {
  const path = '/plugins/info/1.2/';
  const params = {
    action: 'query_plugins',
    ...query
  };
  
  const response = await fetchFromRemoteAPI(path, params);
  
  return response.data;
}*/

export async function queryPlugins(query) {
    const page = parseInt(query.request?.page) || 1;
    const perPage = parseInt(query.request?.per_page) || 250;
    const browse = query.request?.browse || 'updated';
  
    const db = await cacheService.getMongoDb();
    const collection = db.collection(config.mongoCollection);
  
    const totalPlugins = await collection.countDocuments();
    const totalPages = Math.ceil(totalPlugins / perPage);
  
    let plugins;
    if (browse === 'updated') {
      plugins = await collection.find({})
        .sort({ 'value.last_updated_time': -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .toArray();
    } else {
      plugins = await collection.find({})
        .skip((page - 1) * perPage)
        .limit(perPage)
        .toArray();
    }
  
    const result = {
      info: {
        page: page,
        pages: totalPages,
        results: totalPlugins
      },
      plugins: plugins.map(doc => doc.value)
    };
  
    return result;
  }

async function getLastKnownUpdate() {
  try {
    console.log('Checking last known update...');
    // First, check MongoDB for the most recent plugin
    const db = await cacheService.getMongoDb();
    const collection = db.collection(config.mongoCollection);
    const mostRecentPlugin = await collection.find({})
      .sort({ 'value.last_updated_time': -1 })
      .limit(1)
      .toArray();

    if (mostRecentPlugin.length > 0) {
      console.log('Found most recent update in MongoDB');
      return mostRecentPlugin[0].value.last_updated;
    }

    // If no plugins in MongoDB, check the file
    console.log('No plugins found in MongoDB, checking file');
    //const fileContent = await fs.readFile(LAST_UPDATE_FILE, 'utf-8');
    return formatCustomDate(new Date(0));
  } catch (error) {
    console.log('Error reading last update, starting from scratch', error);
    return formatCustomDate(new Date(0));
  }
}

export async function triggerPluginUpdate(force) {
  if (updateInProgress) {
    return { status: 'Update already in progress' };
  }

  updateInProgress = true;
  const startTime = new Date();

  try {
    const lastKnownUpdate = await getLastKnownUpdate();
    const { latestUpdate, totalUpdatedPlugins } = await fetchPluginUpdates(lastKnownUpdate, force);
    
    // Update the file with the latest update time
    await fs.writeFile(LAST_UPDATE_FILE, latestUpdate);
    
    const endTime = new Date();
    lastUpdateStatus = {
      startTime,
      endTime,
      latestUpdate,
      totalUpdatedPlugins,
      duration: endTime - startTime
    };

    return { status: 'Update completed', ...lastUpdateStatus };
  } catch (error) {
    console.error('Error during plugin update:', error);
    lastUpdateStatus = { status: 'Update failed', error: error.message };
    return lastUpdateStatus;
  } finally {
    updateInProgress = false;
  }
}

export async function fetchPluginUpdates(lastKnownUpdate, force) {
  let page = 1;
  let latestUpdate = lastKnownUpdate;
  if (lastKnownUpdate === undefined) {
    lastKnownUpdate = await getLastKnownUpdate();
  }
  let continueUpdating = true;
  let totalUpdatedPlugins = 0;

  console.log('Starting plugin update process...');
  console.log('Last known update:', latestUpdate);

  while (continueUpdating) {
    if (config.devMode && page > config.maxPagesInDev) {
      console.log(`Dev mode: Reached maximum of ${config.maxPagesInDev} pages. Stopping update process.`);
      break;
    }

    const path = '/plugins/info/1.2/';
    const params = {
      action: 'query_plugins',
      'request[page]': page,
      'request[per_page]': 250,
      'request[browse]': 'updated'
    };

    console.log(`Fetching page ${page}...`);

    try {
      
      const response = await fetchFromRemoteAPI(path, params);

      const plugins = response.data.plugins;
      if (plugins.length === 0) {
        console.log('No more plugins to process. Ending update process.');
        break;
      }

      console.log(`Processing ${plugins.length} plugins from page ${page}`);

      for (const plugin of plugins) {
        console.log(`last updated: ${plugin.last_updated} last known update: ${latestUpdate}`);
        //console.log(parseCustomDate(plugin.last_updated).getTime(), parseCustomDate(latestUpdate).getTime());
        //console.log(parseCustomDate(plugin.last_updated).getTime() <= parseCustomDate(latestUpdate).getTime());
        if (!force && parseCustomDate(plugin.last_updated).getTime() <= parseCustomDate(lastKnownUpdate).getTime()) {
          console.log(`Reached plugin with last_updated <= last known update. Ending update process.`);
          continueUpdating = false;
          break;
        }
        if (config.devMode && totalUpdatedPlugins >= config.maxPluginsInDev) {
            console.log(`Dev mode: Reached maximum of ${config.maxPluginsInDev} plugins. Stopping update process.`);
            break;
        }
    
        plugin.last_updated_time = parseCustomDate(plugin.last_updated).getTime();
        console.log(`plugin.last_updated_time: ${plugin.last_updated_time}`);
        const result = await cachePlugin(plugin);
        
        if (config.pubsub.enabled && result == 1) {
          await publishPluginUpdate(plugin);
        }

        console.log(`Updated/Inserted plugin: ${plugin.slug}`);

        totalUpdatedPlugins++;

        if (parseCustomDate(plugin.last_updated) > parseCustomDate(latestUpdate)) {
          latestUpdate = plugin.last_updated;
        }
        console.log(`ending last updated: ${latestUpdate}`);
      }

      console.log(`Updated plugins on page ${page}`);
      console.log(`Total plugins updated so far: ${totalUpdatedPlugins}`);
      console.log(`Current latest update: ${latestUpdate}`);

      page++;
    } catch (error) {
      console.error('Error fetching plugin updates:', error.message);
      break;
    }
  }

  return { latestUpdate, totalUpdatedPlugins };
}

async function cachePlugin(plugin) {
  const pluginPath = '/plugins/info/1.2/';
  const pluginParams = {
    action: 'plugin_information',
    'request': {
        slug: plugin.slug
    }
  };
  console.log(`plugin.last_updated_time: ${plugin.last_updated_time}`);
  const pluginCacheKey = cacheService.generateCacheKeyForSlug(plugin.slug);
  const result = await cacheService.set(pluginCacheKey, plugin);
  return result;
}

export function getUpdateStatus() {
  if (updateInProgress) {
    return { status: 'Update in progress' };
  }
  return lastUpdateStatus || { status: 'No update has been run' };
}