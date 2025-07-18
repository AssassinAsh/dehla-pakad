import client from "prom-client";

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "dehla_pakad_",
});

// Custom Gauges for real-time data
const activeUsersGauge = new client.Gauge({
  name: "dehla_pakad_active_users_total",
  help: "Total number of active users connected",
  registers: [register],
});

const activeRoomsGauge = new client.Gauge({
  name: "dehla_pakad_active_rooms_total",
  help: "Total number of active rooms",
  registers: [register],
});

const playersInGameGauge = new client.Gauge({
  name: "dehla_pakad_players_in_game_total",
  help: "Total number of players currently in games",
  registers: [register],
});

const playersWaitingGauge = new client.Gauge({
  name: "dehla_pakad_players_waiting_total",
  help: "Total number of players waiting for games",
  registers: [register],
});

const socketConnectionsGauge = new client.Gauge({
  name: "dehla_pakad_socket_connections_total",
  help: "Total number of socket connections",
  registers: [register],
});

// Counters for cumulative data
const gamesStartedCounter = new client.Counter({
  name: "dehla_pakad_games_started_total",
  help: "Total number of games started",
  registers: [register],
});

const gamesCompletedCounter = new client.Counter({
  name: "dehla_pakad_games_completed_total",
  help: "Total number of games completed",
  registers: [register],
});

const cardPlaysCounter = new client.Counter({
  name: "dehla_pakad_card_plays_total",
  help: "Total number of cards played",
  registers: [register],
});

const botActionsCounter = new client.Counter({
  name: "dehla_pakad_bot_actions_total",
  help: "Total number of bot actions",
  registers: [register],
});

// Histogram for response times
const responseTimeHistogram = new client.Histogram({
  name: "dehla_pakad_response_time_seconds",
  help: "Response time in seconds",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Additional metrics for better monitoring
const roomSizeHistogram = new client.Histogram({
  name: "dehla_pakad_room_size_distribution",
  help: "Distribution of players per room",
  buckets: [1, 2, 3, 4],
  registers: [register],
});

const gameDurationHistogram = new client.Histogram({
  name: "dehla_pakad_game_duration_seconds",
  help: "Duration of completed games in seconds",
  buckets: [60, 300, 600, 900, 1800, 3600],
  registers: [register],
});

const errorCountCounter = new client.Counter({
  name: "dehla_pakad_errors_total",
  help: "Total number of errors by type",
  labelNames: ["error_type", "component"],
  registers: [register],
});

const redisOperationsCounter = new client.Counter({
  name: "dehla_pakad_redis_operations_total",
  help: "Total Redis operations by type",
  labelNames: ["operation", "status"],
  registers: [register],
});

const activeBotsGauge = new client.Gauge({
  name: "dehla_pakad_active_bots_total",
  help: "Total number of active bot players",
  registers: [register],
});

// Metrics update functions
const metrics = {
  // Gauge updates
  setActiveUsers: (count) => activeUsersGauge.set(count),
  setActiveRooms: (count) => activeRoomsGauge.set(count),
  setPlayersInGame: (count) => playersInGameGauge.set(count),
  setPlayersWaiting: (count) => playersWaitingGauge.set(count),
  setSocketConnections: (count) => socketConnectionsGauge.set(count),
  setActiveBots: (count) => activeBotsGauge.set(count),

  // Counter increments
  incrementGamesStarted: () => gamesStartedCounter.inc(),
  incrementGamesCompleted: () => gamesCompletedCounter.inc(),
  incrementCardPlays: () => cardPlaysCounter.inc(),
  incrementBotActions: () => botActionsCounter.inc(),
  incrementErrors: (errorType, component) =>
    errorCountCounter.inc({ error_type: errorType, component }),
  incrementRedisOperations: (operation, status) =>
    redisOperationsCounter.inc({ operation, status }),

  // Histogram observations
  observeResponseTime: (seconds) => responseTimeHistogram.observe(seconds),
  observeRoomSize: (playerCount) => roomSizeHistogram.observe(playerCount),
  observeGameDuration: (seconds) => gameDurationHistogram.observe(seconds),

  // Response time tracking
  startTimer: () => responseTimeHistogram.startTimer(),

  // Get all metrics
  getMetrics: () => register.metrics(),

  // Register instance for potential custom metrics
  register,
};

export default metrics;
