import loki from 'lokijs';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import config from '../config/index.js';

// Initialize LokiJS
const db = new loki('cache.db');
const memoryCache = db.addCollection('cache');

// MongoDB client
let mongoClient = null;
let mongoDb = null;

async function connectToMongo() {
    if (!mongoClient) {
      try {
        console.log('Attempting to connect to MongoDB...');
        const options = {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        };
        if (config.mongoUseSSL) {
          options.ssl = true;
          options.tls = true;
          options.tlsAllowInvalidCertificates = true; // Only use this for testing, remove in production
        }
        mongoClient = new MongoClient(config.mongoUrl, options);
        await mongoClient.connect();
        mongoDb = mongoClient.db(config.mongoDb);
        console.log('Connected to MongoDB:', config.mongoDb);
      } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        mongoClient = null;
        mongoDb = null;
      }
    }
    return mongoDb;
  }

export async function get(key) {
  try {
    // Check LokiJS first
    const cachedItem = memoryCache.findOne({ key });
    if (cachedItem) {
      return cachedItem.value;
    }

    // If not in LokiJS, try MongoDB
    const db = await connectToMongo();
    if (db) {
      const collection = db.collection(config.mongoCollection);
      const doc = await collection.findOne({ key });
      if (doc) {
        // Store in LokiJS for future fast access
        memoryCache.insert({ key, value: doc.value });
        return doc.value;
      }
    }
  } catch (error) {
    console.error('Cache get error:', error);
  }
  return null;
}

export async function set(key, value) {
  try {
    // Set in LokiJS
    const existingItem = memoryCache.findOne({ key });
    if (existingItem) {
      existingItem.value = value;
      memoryCache.update(existingItem);
    } else {
      memoryCache.insert({ key, value });
    }

    // Set in MongoDB
    const db = await connectToMongo();
    if (db) {
      console.log('mongoCollection:', config.mongoDb);
      console.log('mongoCollection:', config.mongoCollection);
      const collection = db.collection(config.mongoCollection);
      const result = await collection.updateOne(
        { key },
        { $set: { value } },
        { upsert: true }
      );
      
      console.log(result);
      
      if (result.matchedCount > 0) {
        console.log("Document matched and updated");
      } else if (result.upsertedCount > 0) {
        console.log("New document inserted");
        console.log("Inserted document ID:", result.upsertedId);
      } else {
        console.log("No changes made");
      }
    } else {
      console.warn('MongoDB not available, data only cached in memory');
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export function generateCacheKey(path, params) {
  const fullUrl = `${path}?${new URLSearchParams(params).toString()}`;
  console.log('Generated cache key:', fullUrl);
  return crypto.createHash('md5').update(fullUrl).digest('hex');
}

export async function getMongoDb() {
  return connectToMongo();
}

// Optional: Persist LokiJS to file system
export function saveLokiDB() {
  db.saveDatabase((err) => {
    if (err) {
      console.error('Error saving LokiJS database:', err);
    } else {
      console.log('LokiJS database saved successfully');
    }
  });
}

// Optional: Load LokiJS from file system
export function loadLokiDB() {
  db.loadDatabase({}, (err) => {
    if (err) {
      console.error('Error loading LokiJS database:', err);
    } else {
      console.log('LokiJS database loaded successfully');
    }
  });
}

// Close MongoDB connection
export async function closeMongo() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    console.log('Closed MongoDB connection');
  }
}