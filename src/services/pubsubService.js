import PubNub from 'pubnub';
import { PubSub } from '@google-cloud/pubsub';
import config from '../config/index.js';

let pubsub;
let topic;
let pubnub;

if (config.pubsub.enabled) {
  pubsub = new PubSub();
  topic = pubsub.topic(config.pubsub.topicName);
}

if (config.pubnub.enabled) {
  pubnub = new PubNub({
    publishKey: config.pubnub.publishKey,
    subscribeKey: config.pubnub.subscribeKey,
    userId: config.pubnub.userId
  });
}

export async function publishPluginUpdate(plugin) {
  const messageData = JSON.stringify({
    slug: plugin.slug,
    last_updated: plugin.last_updated
  });

  if (config.pubsub.enabled) {
    try {
      const messageId = await topic.publish(Buffer.from(messageData));
      console.log(`Pub/Sub message ${messageId} published for plugin: ${plugin.slug}`);
    } catch (error) {
      console.error(`Error publishing Pub/Sub update for plugin ${plugin.slug}:`, error);
    }
  }

  if (config.pubnub.enabled) {
    try {
      const result = await pubnub.publish({
        channel: config.pubnub.channel,
        message: JSON.parse(messageData)
      });
      console.log(`PubNub message published for plugin: ${plugin.slug}, timetoken: ${result.timetoken}`);
    } catch (error) {
      console.error(`Error publishing PubNub update for plugin ${plugin.slug}:`, error);
    }
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

export async function initializeMessagingServices() {
  if (config.pubsub.enabled) {
    try {
      await ensureTopicExists();
      console.log('Pub/Sub service initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Pub/Sub service:', error);
    }
  } else {
    console.log('Pub/Sub is disabled. Skipping initialization.');
  }

}