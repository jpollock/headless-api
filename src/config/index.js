const config = {
    port: process.env.PORT || 3000,
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/plugin_cache',
    mongoDb: 'ptc_cache',
    mongoCollection: 'plugins_cache',
    mongoUseSSL: process.env.MONGODB_USE_SSL === 'true',
    remoteApiBaseUrl: 'https://api.wordpress.org',
    pubsub: {
      enabled: process.env.PUBSUB_ENABLED === 'true',
      topicName: process.env.PUBSUB_TOPIC_NAME || 'plugin_updates'
    },
    updateInterval: process.env.UPDATE_INTERVAL || '*/30 * * * *',
    devMode: process.env.NODE_ENV === 'development',
    maxPagesInDev: parseInt(process.env.MAX_PAGES_IN_DEV, 10) || 1,
    maxPluginsInDev: parseInt(process.env.MAX_PLUGINS_IN_DEV, 10) || 1
  };
  
  export default config;