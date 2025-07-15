import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Redis client instance
let redis = null;

// Initialize Redis client
export function initializeRedis() {
  try {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.warn(
        "Redis environment variables not found, falling back to in-memory storage"
      );
      return null;
    }

    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    console.log("✅ Redis client initialized successfully");
    return redis;
  } catch (error) {
    console.error("❌ Failed to initialize Redis client:", error);
    return null;
  }
}

// Get Redis client instance
export function getRedisClient() {
  if (!redis) {
    redis = initializeRedis();
  }
  return redis;
}

// Redis key helpers
export const RedisKeys = {
  // Room data: room:{roomId}
  room: (roomId) => `room:${roomId}`,

  // Room index for quick lookups: rooms:all
  allRooms: () => "rooms:all",

  // Player to room mapping: player:{playerId}:room
  playerRoom: (playerId) => `player:${playerId}:room`,

  // Room expiry (TTL for cleanup): room:{roomId}:ttl
  roomTTL: (roomId) => `room:${roomId}:ttl`,

  // Metrics data: metrics:game
  metrics: () => "metrics:game",

  // Bot tracking: bots:{roomId}
  bots: (roomId) => `bots:${roomId}`,

  // Matchmaking queue: queue:matchmaking
  matchmakingQueue: () => "queue:matchmaking",
};

// Redis operations with fallback
export class RedisOperations {
  static async get(key) {
    const client = getRedisClient();
    if (!client) return null;

    try {
      return await client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  static async set(key, value, options = {}) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      // Serialize objects to JSON
      const serializedValue =
        typeof value === "object" ? JSON.stringify(value) : value;

      if (options.ttl) {
        await client.setex(key, options.ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  static async del(key) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  static async exists(key) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  static async sadd(key, ...members) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.sadd(key, ...members);
      return true;
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      return false;
    }
  }

  static async srem(key, ...members) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.srem(key, ...members);
      return true;
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
      return false;
    }
  }

  static async smembers(key) {
    const client = getRedisClient();
    if (!client) return [];

    try {
      return await client.smembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  static async expire(key, ttl) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  // Utility function to deserialize JSON strings
  static parseJSON(value) {
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      // If it's not JSON, return as-is
      return value;
    }
  }

  // Ping Redis to check connection
  static async ping() {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("Redis PING error:", error);
      return false;
    }
  }
}

// Initialize Redis on module load
initializeRedis();
