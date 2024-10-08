import { PubSub } from '@google-cloud/pubsub';
import config from '../config/index.js';

let pubsub;
let topic;

if (config.pubsub.enabled) {
  pubsub = new PubSub();
  topic = pubsub.topic(config.pubsub.topicName);
}

export async function publishPluginUpdate(plugin) {
  if (!config.pubsub.enabled) {
    console.log('Pub/Sub is disabled. Skipping message publication.');
    return;
  }

  const messageData = JSON.stringify({
    slug: plugin.slug,
    last_updated: plugin.last_updated
  });

  try {
    const messageId = await topic.publish(Buffer.from(messageData));
    console.log(`Message ${messageId} published for plugin: ${plugin.slug}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing update for plugin ${plugin.slug}:`, error);
    throw error;
  }
}

export async function ensureTopicExists() {
  if (!config.pubsub.enabled) {
    console.log('Pub/Sub is disabled. Skipping topic creation.');
    return;
  }

  try {
    const [topics] = await pubsub.getTopics();
    const topicExists = topics.some(t => t.name.endsWith(`/${config.pubsub.topicName}`));
    
    if (!topicExists) {
      await pubsub.createTopic(config.pubsub.topicName);
      console.log(`Topic ${config.pubsub.topicName} created.`);
    } else {
      console.log(`Topic ${config.pubsub.topicName} already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring topic exists:', error);
    throw error;
  }
}

export async function initializePubSub() {
  if (!config.pubsub.enabled) {
    console.log('Pub/Sub is disabled. Skipping initialization.');
    return;
  }

  try {
    await ensureTopicExists();
    console.log('Pub/Sub service initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Pub/Sub service:', error);
    throw error;
  }
}