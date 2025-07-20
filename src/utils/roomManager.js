// Hybrid storage: Redis with in-memory fallback
import dotenv from "dotenv";
import { BotManager } from "./botManager.js";
import metrics from "./metrics.js";
import { RedisOperations, RedisKeys } from "./redisClient.js";

// Load environment variables
dotenv.config();

// In-memory storage as fallback
const rooms = new Map();

// Redis operations instance
const redisOps = {
  async getRoom(roomId) {
    const roomData = await RedisOperations.get(RedisKeys.room(roomId));
    return RedisOperations.parseJSON(roomData);
  },

  async setRoom(roomId, room) {
    return await RedisOperations.set(RedisKeys.room(roomId), room, {
      ttl: 3600,
    }); // 1 hour TTL
  },

  async deleteRoom(roomId) {
    return await RedisOperations.del(RedisKeys.room(roomId));
  },
};

export class RoomManager {
  // Helper method to serialize room data for storage
  static serializeRoom(room) {
    return {
      ...room,
      // Convert Sets to Arrays for JSON serialization
      replayVotes: Array.from(room.replayVotes || []),
      replayState: {
        ...room.replayState,
        votes: Array.from(room.replayState?.votes || []),
      },
    };
  }

  // Helper method to deserialize room data from storage
  static deserializeRoom(roomData) {
    if (!roomData) return null;

    // Handle legacy full rooms
    return {
      ...roomData,
      // Convert Arrays back to Sets
      replayVotes: new Set(roomData.replayVotes || []),
      replayState: {
        ...roomData.replayState,
        votes: new Set(roomData.replayState?.votes || []),
      },
    };
  }

  static async createRoom(roomId, firstPlayer) {
    // Check if room exists in Redis first, then fallback to in-memory
    let existingRoom = null;
    try {
      existingRoom = await redisOps.getRoom(roomId);
    } catch (error) {
      console.warn("Redis check failed, using in-memory:", error.message);
    }

    if (existingRoom || rooms.has(roomId)) {
      throw new Error("Room already exists");
    }

    const room = {
      id: roomId,
      players: [firstPlayer],
      host: firstPlayer.id, // Use socket ID internally for host
      gameStarted: false,
      createdAt: new Date(), // Add timestamp for cleanup
      gameState: {
        status: "waiting", // 'waiting', 'in-progress', 'finished'
        trump: null,
        trumpJustSet: false,
        totalTricksCompleted: 0,
        scores: {
          team1: { tricks: 0, tens: 0 },
          team2: { tricks: 0, tens: 0 },
        },
        lastTrickWinnerSeat: null,
        isCollectingStack: false, // Prevent card plays during stack collection
      },
      deck: [],
      currentTrick: [],
      stackedTricks: [], // For the new rule
      tricks: [], // This will now store tricks captured by teams
      replayVotes: new Set(), // Track players who want to replay
      gameMode: "private", // Default to private, can be set during creation
      replayState: {
        votesNeeded: 0,
        votes: new Set(),
        timer: null,
        isReplayInProgress: false,
      },
    };

    // Store in both Redis and in-memory
    try {
      await redisOps.setRoom(roomId, this.serializeRoom(room));
    } catch (error) {
      console.warn(
        "Redis storage failed, using in-memory only:",
        error.message
      );
    }

    // Keep full room in memory
    rooms.set(roomId, room);

    // Update metrics
    this.updateMetrics();

    return room;
  }

  static async getRoom(roomId) {
    // Try to get room from in-memory first for performance
    let room = rooms.get(roomId);

    if (room) {
      return room;
    }

    // If not in memory, try Redis
    try {
      const redisRoom = await redisOps.getRoom(roomId);
      if (redisRoom) {
        room = this.deserializeRoom(redisRoom);
        // Cache in memory for future requests
        rooms.set(roomId, room);
        return room;
      }
    } catch (error) {
      console.warn("Redis fetch failed, using in-memory only:", error.message);
    }

    return null;
  }

  // Update room in both Redis and memory
  static async updateRoom(roomId, room) {
    try {
      await redisOps.setRoom(roomId, this.serializeRoom(room));
    } catch (error) {
      console.warn("Redis update failed, using in-memory only:", error.message);
    }

    // Keep full room in memory for immediate access
    rooms.set(roomId, room);
    return room;
  }

  // Remove room from both Redis and memory
  static async removeRoom(roomId) {
    try {
      await redisOps.deleteRoom(roomId);
    } catch (error) {
      console.warn("Redis deletion failed:", error.message);
    }

    const deleted = rooms.delete(roomId);
    this.updateMetrics();
    return deleted;
  }

  static async addPlayerToRoom(roomId, player) {
    const room = await this.getRoom(roomId);
    if (!room || room.players.length >= 4) {
      return false;
    }

    // Check if seat is already taken (only if player has a seat)
    if (player.seat !== null) {
      const seatTaken = room.players.some((p) => p.seat === player.seat);
      if (seatTaken) {
        return false;
      }
    }

    // Prevent same user (by socket id) from taking multiple seats
    const alreadySeatedById = room.players.some((p) => p.id === player.id);
    if (alreadySeatedById) {
      return false;
    }

    // Prevent duplicate by name: if a player with the same name exists, update their socket id and info
    const existingByName = room.players.find((p) => p.name === player.name);
    if (existingByName) {
      // Update socket id and other info
      existingByName.id = player.id;
      existingByName.socketId = player.socketId;
      existingByName.isConnected = true;
      existingByName.seat = player.seat ?? existingByName.seat;
      await this.updateRoom(roomId, room);
      return true;
    }

    room.players.push(player);
    await this.updateRoom(roomId, room);

    // Update metrics
    this.updateMetrics();

    return true;
  }

  static async removePlayerFromRoom(roomId, playerId) {
    const room = await this.getRoom(roomId);
    if (!room) {
      return false;
    }

    // Check if the player being removed is the host
    const removedPlayer = room.players.find((p) => p.id === playerId);
    const isHostLeaving = removedPlayer && room.host === removedPlayer.id;
    const isDealerLeaving =
      removedPlayer && room.dealerSeat === removedPlayer.seat;

    room.players = room.players.filter((p) => p.id !== playerId);

    // If no players left, remove the room
    if (room.players.length === 0) {
      // Clean up bots
      BotManager.cleanupRoom(roomId);
      await this.removeRoom(roomId);
    } else {
      // If host left, transfer host to next player (by join order)
      if (isHostLeaving) {
        room.host = room.players.length > 0 ? room.players[0].id : undefined;
      }

      // If dealer left, reassign dealer to next occupied seat
      if (isDealerLeaving && room.players.length > 0) {
        const occupiedSeats = room.players
          .map((p) => p.seat)
          .sort((a, b) => a - b);
        room.dealerSeat = occupiedSeats[0]; // Assign to first available seat
      }

      await this.updateRoom(roomId, room);
    }

    // Update metrics
    this.updateMetrics();

    return true;
  }

  static async updateRoomState(roomId, updates) {
    const room = await this.getRoom(roomId);
    if (!room) {
      return false;
    }

    const updatedRoom = { ...room, ...updates };
    await this.updateRoom(roomId, updatedRoom);

    return true;
  }

  static async isRoomFull(roomId) {
    const room = await this.getRoom(roomId);
    return room ? room.players.length >= 4 : false;
  }

  static async canStartGame(roomId) {
    const room = await this.getRoom(roomId);
    return room ? room.players.length === 4 && !room.gameStarted : false;
  }

  static async getRoomByPlayerId(playerId) {
    // Since we can't easily search Redis by player ID, we'll check in-memory first
    for (const room of rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room;
      }
    }

    // If not found in memory, this would require a more complex Redis implementation
    // For now, return null as rooms should be cached in memory when active
    return null;
  }

  static getRoomsList() {
    return Array.from(rooms.values()).map((room) => ({
      id: room.id,
      playerCount: room.players.length,
      gameStarted: room.gameStarted,
      createdAt: room.createdAt,
    }));
  }

  static async setDealer(roomId, seat) {
    const room = await this.getRoom(roomId);
    if (room) {
      room.dealerSeat = seat;
      await this.updateRoom(roomId, room);
    }
  }

  static async rotateDealer(roomId) {
    const room = await this.getRoom(roomId);
    if (!room || room.players.length === 0) {
      return;
    }

    // Get all occupied seats in order
    const occupiedSeats = room.players.map((p) => p.seat).sort((a, b) => a - b);

    if (!room.dealerSeat) {
      // No dealer set yet, assign to first occupied seat
      room.dealerSeat = occupiedSeats[0];
    } else {
      // Find current dealer index in the occupied seats array
      const currentDealerIndex = occupiedSeats.indexOf(room.dealerSeat);

      if (currentDealerIndex === -1) {
        // Current dealer seat is no longer occupied, set to first occupied seat
        room.dealerSeat = occupiedSeats[0];
      } else {
        // Move to next seat clockwise (with wrap-around)
        const nextDealerIndex = (currentDealerIndex + 1) % occupiedSeats.length;
        room.dealerSeat = occupiedSeats[nextDealerIndex];
      }
    }

    await this.updateRoom(roomId, room);
  }

  static async setDealing(roomId, dealing) {
    const room = await this.getRoom(roomId);
    if (room) {
      room.gameState.dealing = dealing;
      await this.updateRoom(roomId, room);
    }
  }

  static async addReplayVote(roomId, playerIdentifier) {
    const room = await this.getRoom(roomId);
    if (room) {
      // Use socket ID for replay votes to avoid duplicate name issues
      let playerId = playerIdentifier;

      // If playerIdentifier is a name, convert to socket ID
      const player = room.players.find((p) => p.name === playerIdentifier);
      if (player) {
        playerId = player.id;
      }

      room.replayVotes.add(playerId);
      await this.updateRoom(roomId, room);
    }
  }

  static async clearReplayVotes(roomId) {
    const room = await this.getRoom(roomId);
    if (room) {
      room.replayVotes = new Set();
      await this.updateRoom(roomId, room);
    }
  }

  static async getReplayVotes(roomId) {
    const room = await this.getRoom(roomId);
    return room ? room.replayVotes : new Set();
  }

  static async setPlayerReady(roomId, playerIdentifier, ready) {
    const room = await this.getRoom(roomId);
    if (room) {
      // Try to find player by socket ID first, then by name for backward compatibility
      let player = room.players.find((p) => p.id === playerIdentifier);
      if (!player) {
        // Fallback to name-based lookup (case-insensitive)
        player = room.players.find(
          (p) =>
            p.name.trim().toLowerCase() ===
            playerIdentifier.trim().toLowerCase()
        );
      }
      if (player) {
        player.isReady = ready;
        await this.updateRoom(roomId, room);
        return true;
      }
    }
    return false;
  }

  static async resetAllReady(roomId) {
    const room = await this.getRoom(roomId);
    if (room) {
      room.players.forEach((p) => (p.isReady = false));
      await this.updateRoom(roomId, room);
    }
  }

  static async areAllPlayersReady(roomId) {
    const room = await this.getRoom(roomId);
    return (
      room && room.players.length === 4 && room.players.every((p) => p.isReady)
    );
  }

  // Helper method to get host name for display (while using socket ID internally)
  static async getHostName(roomId) {
    const room = await this.getRoom(roomId);
    if (!room || !room.host) return null;

    const hostPlayer = room.players.find((p) => p.id === room.host);
    return hostPlayer ? hostPlayer.name : null;
  }

  // Helper method to check if a player is the host (by socket ID)
  static async isPlayerHost(roomId, playerId) {
    const room = await this.getRoom(roomId);
    return room && room.host === playerId;
  }

  // Metrics collection methods
  static updateMetrics() {
    try {
      const totalRooms = rooms.size;
      let totalPlayers = 0;
      let playersInGame = 0;
      let playersWaiting = 0;

      rooms.forEach((room) => {
        totalPlayers += room.players.length;
        if (room.gameStarted && room.gameState.status === "in-progress") {
          playersInGame += room.players.length;
        } else {
          playersWaiting += room.players.length;
        }
      });

      metrics.setActiveRooms(totalRooms);
      metrics.setActiveUsers(totalPlayers);
      metrics.setPlayersInGame(playersInGame);
      metrics.setPlayersWaiting(playersWaiting);
    } catch (error) {
      console.error("Error updating metrics:", error);
    }
  }

  // Cleanup stale rooms periodically
  static async cleanupStaleRooms() {
    console.log("Running periodic room cleanup...");
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    const emptyRoomThreshold = 10 * 60 * 1000; // 10 minutes for empty rooms

    let cleanedRooms = 0;
    const allRooms = Array.from(rooms.entries());

    for (const [roomId, room] of allRooms) {
      let shouldRemove = false;
      let reason = "";

      // Check for completely empty rooms
      if (room.players.length === 0) {
        const roomAge = now - new Date(room.createdAt || 0).getTime();
        if (roomAge > emptyRoomThreshold) {
          shouldRemove = true;
          reason = "empty room timeout";
        }
      }

      // Check for rooms with only disconnected players
      const connectedPlayers = room.players.filter((p) => p.isConnected).length;
      if (connectedPlayers === 0 && room.players.length > 0) {
        const roomAge = now - new Date(room.createdAt || 0).getTime();
        if (roomAge > staleThreshold) {
          shouldRemove = true;
          reason = "all players disconnected";
        }
      }

      // Check for very old finished games
      if (room.gameState?.status === "finished") {
        const roomAge = now - new Date(room.createdAt || 0).getTime();
        if (roomAge > staleThreshold) {
          shouldRemove = true;
          reason = "finished game timeout";
        }
      }

      if (shouldRemove) {
        console.log(`Cleaning up stale room ${roomId}: ${reason}`);

        // Track cleanup metrics
        metrics.incrementRoomsCleaned(reason.replace(/ /g, "_"));

        // Clean up associated data
        BotManager.cleanupRoom(roomId);

        // Remove from storage
        await this.removeRoom(roomId);
        cleanedRooms++;
      }
    }

    if (cleanedRooms > 0) {
      console.log(`Cleaned up ${cleanedRooms} stale rooms`);
      this.updateMetrics();
    }
  }

  static getAllRooms() {
    return rooms;
  }

  // Enhanced replay system for different game modes
  static async setGameMode(roomId, gameMode) {
    const room = await this.getRoom(roomId);
    if (room) {
      room.gameMode = gameMode;
      // Set voting requirements based on game mode
      switch (gameMode) {
        case "quick-bots":
          room.replayState.votesNeeded = 1; // Only the human player
          break;
        case "private":
          room.replayState.votesNeeded = 1; // Only host decision
          break;
        case "lobby":
          // Count human players only
          const humanPlayers = room.players.filter((p) => !p.isBot).length;
          room.replayState.votesNeeded = Math.max(
            1,
            Math.ceil(humanPlayers / 2)
          ); // Majority vote
          break;
        default:
          room.replayState.votesNeeded = room.players.filter(
            (p) => !p.isBot
          ).length;
      }
      await this.updateRoom(roomId, room);
    }
  }

  static async getGameMode(roomId) {
    const room = await this.getRoom(roomId);
    return room ? room.gameMode : "private";
  }

  static async handleReplayRequest(roomId, playerIdentifier, io) {
    const room = await this.getRoom(roomId);
    if (!room) return { success: false, message: "Room not found" };

    // Find player by ID first, then by name for backward compatibility
    let player = room.players.find((p) => p.id === playerIdentifier);
    if (!player) {
      player = room.players.find((p) => p.name === playerIdentifier);
    }
    if (!player) {
      return { success: false, message: "Player not found in room" };
    }

    const gameMode = room.gameMode || "private";

    switch (gameMode) {
      case "quick-bots":
        return await this.handleQuickBotsReplay(roomId, io);

      case "private":
        return await this.handlePrivateRoomReplay(roomId, player, io);

      case "lobby":
        return await this.handleLobbyReplay(roomId, player, io);

      default:
        return await this.handleDefaultReplay(roomId, player, io);
    }
  }

  static async handleQuickBotsReplay(roomId, io) {
    // Reset game state and set to waiting for ready
    const success = await this.resetGameState(roomId);
    if (success) {
      const room = await this.getRoom(roomId);

      // Ensure bots are properly seated for quick-bots mode
      const { BotManager } = await import("./botManager.js");
      BotManager.addBotsToRoom(roomId, room, "medium");

      // Reset ready states - humans need to click ready, bots are auto-ready
      room.players.forEach((player) => {
        if (!player.isBot) {
          player.isReady = false;
        } else {
          player.isReady = true;
        }
      });

      room.gameStarted = false;
      await this.updateRoom(roomId, room);

      io.to(roomId).emit("roomUpdated", room);
      return { success: true, message: "Game reset. Get ready to play again!" };
    }
    return { success: false, message: "Failed to restart game" };
  }

  static async handlePrivateRoomReplay(roomId, player, io) {
    const room = await this.getRoom(roomId);
    if (!room) return { success: false, message: "Room not found" };

    // Only host can initiate replay in private rooms (compare by socket ID)
    if (room.host !== player.id) {
      // Non-host players get added to a waiting list
      room.replayState.votes.add(player.id);
      io.to(roomId).emit("replayRequestReceived", {
        requester: player.name, // Show name to users
        message: `${player.name} wants to play again. Waiting for host decision.`,
      });
      return { success: true, message: "Replay request sent to host" };
    }

    // Host initiates replay
    const success = await this.resetGameState(roomId);
    if (success) {
      const room = await this.getRoom(roomId);
      // Reset ready states for all human players
      room.players.forEach((player) => {
        if (!player.isBot) {
          player.isReady = false;
        }
      });
      room.gameStarted = false;
      await this.updateRoom(roomId, room);

      io.to(roomId).emit("roomUpdated", room);
      return {
        success: true,
        message: "Game reset by host. Get ready to play again!",
      };
    }
    return { success: false, message: "Failed to restart game" };
  }

  static async handleLobbyReplay(roomId, player, io) {
    const room = await this.getRoom(roomId);
    if (!room) return { success: false, message: "Room not found" };

    // Immediately add player to matchmaking queue for lobby games
    const { MatchmakingQueue } = await import("./matchmakingQueue.js");

    // Prepare player data for matchmaking
    const playerForQueue = {
      id: player.id,
      socketId: player.socketId || player.id,
      name: player.name,
      hand: [],
      isReady: false,
      isConnected: true,
    };

    try {
      // Add player to lobby matchmaking queue with error handling
      const queueResult = await MatchmakingQueue.addPlayerToQueue(
        playerForQueue,
        {
          mode: "lobby",
        }
      );

      // Notify player about joining matchmaking regardless of Redis status
      io.to(player.socketId || player.id).emit("replayResponse", {
        success: true,
        message: "Finding new match...",
        mode: "lobby",
        matchmaking: true,
      });

      return {
        success: true,
        message: "Player added to matchmaking queue",
        matchmaking: true,
        queueResult,
      };
    } catch (error) {
      console.error("Error adding player to matchmaking queue:", error);

      // Still try to redirect player even if there was an error
      // The matchmaking system has fallbacks and in-memory storage
      io.to(player.socketId || player.id).emit("replayResponse", {
        success: true,
        message: "Redirecting to lobby...",
        mode: "lobby",
        matchmaking: true,
      });

      return {
        success: true,
        message: "Redirecting to lobby (fallback mode)",
        error: error.message,
      };
    }
  }

  static async handleDefaultReplay(roomId, player, io) {
    // Fallback to original replay system
    await this.addReplayVote(roomId, player.id);
    const replayVotes = await this.getReplayVotes(roomId);
    const room = await this.getRoom(roomId);
    const humanPlayers = room.players.filter((p) => !p.isBot).length;

    if (replayVotes.size >= humanPlayers) {
      const success = await this.resetGameState(roomId);
      if (success) {
        io.to(roomId).emit("gameRestarted", {
          message: "All players voted for replay!",
          mode: "default",
        });
        return { success: true, message: "Game restarted" };
      }
    }

    return {
      success: true,
      message: `Replay vote recorded (${replayVotes.size}/${humanPlayers})`,
    };
  }

  static async resetGameState(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    try {
      // Reset game state
      room.gameState = {
        phase: "waiting",
        currentRound: 1,
        scores: {
          team1: { tricks: 0, tens: 0 },
          team2: { tricks: 0, tens: 0 },
        },
        remainingDeck: [],
        status: "waiting",
        isCollectingStack: false, // Initialize collection flag
      };

      // Reset room state
      room.currentTrick = [];
      room.tricks = [];
      room.stackedTricks = [];
      room.gameStarted = false;
      room.currentPlayer = 1;
      // Keep dealer seat for proper rotation (will be rotated when game starts)

      // Clear replay votes
      room.replayVotes = new Set();
      room.replayState.votes = new Set();
      room.replayState.isReplayInProgress = false;

      // Reset player hands but keep them in their seats
      room.players.forEach((player) => {
        player.hand = [];
        // Auto-ready bots, humans need to click ready
        player.isReady = player.isBot === true;
      });

      // Clear the deck to ensure a fresh deck is used for the next game
      room.deck = [];

      // Update room in Redis
      await this.updateRoom(roomId, room);

      return true;
    } catch (error) {
      console.error("Error resetting game state:", error);
      return false;
    }
  }
}
