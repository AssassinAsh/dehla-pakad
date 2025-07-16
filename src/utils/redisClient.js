import { createClient } from "redis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Redis client instance
let redis = null;

// Initialize Redis client
export function initializeRedis() {
  try {
    if (
      !process.env.REDIS_HOST ||
      !process.env.REDIS_PORT ||
      !process.env.REDIS_PASSWORD
    ) {
      console.warn(
        "Redis environment variables not found, falling back to in-memory storage"
      );
      return null;
    }

    redis = createClient({
      username: process.env.REDIS_USERNAME || "default",
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    });

    // Handle Redis client errors
    redis.on("error", (err) => {
      console.error("❌ Redis Client Error:", err);
    });

    // Connect to Redis
    redis
      .connect()
      .then(() => {
        console.log("✅ Redis client connected successfully");
      })
      .catch((error) => {
        console.error("❌ Failed to connect to Redis:", error);
      });

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
// Error tracking for circuit breaker
const errorTracking = {
  consecutiveErrors: 0,
  lastErrorTime: 0,
  isCircuitOpen: false,
  lastLogTime: 0,
  LOG_THROTTLE_MS: 5000, // Only log Redis errors every 5 seconds
  CIRCUIT_BREAKER_THRESHOLD: 5, // Open circuit after 5 consecutive errors
  CIRCUIT_BREAKER_TIMEOUT: 30000, // Keep circuit open for 30 seconds
};

class RedisOperations {
  static async get(key) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return null;
    }

    if (!client) return null;

    try {
      const value = await client.get(key);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return value;
    } catch (error) {
      this.handleRedisError(key, error);
      return null;
    }
  }

  static async set(key, value, options = {}) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      const now = Date.now();
      if (
        now - errorTracking.lastErrorTime <
        errorTracking.CIRCUIT_BREAKER_TIMEOUT
      ) {
        // Circuit still open, don't attempt Redis operation
        return false;
      } else {
        // Reset circuit breaker after timeout
        errorTracking.isCircuitOpen = false;
        errorTracking.consecutiveErrors = 0;
      }
    }

    if (!client) {
      this.handleRedisError(key, new Error("Redis client not available"));
      return false;
    }

    try {
      // Serialize objects to JSON
      const serializedValue =
        typeof value === "object" ? JSON.stringify(value) : value;

      if (options.ttl) {
        await client.setEx(key, options.ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return true;
    } catch (error) {
      this.handleRedisError(key, error);
      return false;
    }
  }

  static handleRedisError(key, error) {
    const now = Date.now();
    errorTracking.consecutiveErrors++;
    errorTracking.lastErrorTime = now;

    // Open circuit breaker if too many consecutive errors
    if (
      errorTracking.consecutiveErrors >= errorTracking.CIRCUIT_BREAKER_THRESHOLD
    ) {
      errorTracking.isCircuitOpen = true;
    }

    // Throttle error logging to prevent spam
    if (now - errorTracking.lastLogTime > errorTracking.LOG_THROTTLE_MS) {
      console.error(
        `Redis SET error for key ${key} (${errorTracking.consecutiveErrors} consecutive errors):`,
        error.message
      );
      if (errorTracking.isCircuitOpen) {
        console.warn(
          `Redis circuit breaker OPEN - operations will be skipped for ${
            errorTracking.CIRCUIT_BREAKER_TIMEOUT / 1000
          }s`
        );
      }
      errorTracking.lastLogTime = now;
    }
  }

  static async del(key) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return false;
    }

    if (!client) return false;

    try {
      await client.del(key);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return true;
    } catch (error) {
      this.handleRedisError(key, error);
      return false;
    }
  }

  static async exists(key) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return false;
    }

    if (!client) return false;

    try {
      const result = await client.exists(key);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return result === 1;
    } catch (error) {
      this.handleRedisError(key, error);
      return false;
    }
  }

  static async sadd(key, ...members) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return false;
    }

    if (!client) return false;

    try {
      await client.sAdd(key, members);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return true;
    } catch (error) {
      this.handleRedisError(key, error);
      return false;
    }
  }

  static async srem(key, ...members) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return false;
    }

    if (!client) return false;

    try {
      await client.sRem(key, members);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return true;
    } catch (error) {
      this.handleRedisError(key, error);
      return false;
    }
  }

  static async smembers(key) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return [];
    }

    if (!client) return [];

    try {
      const result = await client.sMembers(key);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return result;
    } catch (error) {
      this.handleRedisError(key, error);
      return [];
    }
  }

  static async expire(key, ttl) {
    const client = getRedisClient();

    // Circuit breaker check
    if (errorTracking.isCircuitOpen) {
      return false;
    }

    if (!client) return false;

    try {
      await client.expire(key, ttl);

      // Reset error tracking on success
      errorTracking.consecutiveErrors = 0;
      errorTracking.isCircuitOpen = false;

      return true;
    } catch (error) {
      this.handleRedisError(key, error);
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

export { RedisOperations };
