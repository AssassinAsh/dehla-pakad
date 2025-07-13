import { RoomManager } from "./roomManager.js";
import { BotManager } from "./botManager.js";

export class MatchmakingQueue {
  static queue = new Map(); // playerId -> player data
  static waitingRooms = new Map(); // roomId -> { room, timer, playerCount }
  static playerTimers = new Map(); // playerId -> timeout reference

  // Configuration
  static WAIT_TIME = 45000; // 45 seconds to find real players
  static PARTIAL_ROOM_WAIT = 30000; // 30 seconds for partial rooms
  static MIN_PLAYERS_TO_START = 2; // Minimum players to create a room
  static MAX_PLAYERS_PER_ROOM = 4;

  // Socket.IO instance (set from server)
  static io = null;

  static setIO(ioInstance) {
    this.io = ioInstance;
  }

  /**
   * Add player to matchmaking queue
   */
  static addPlayerToQueue(player, preferences = {}) {
    console.log(`Adding player ${player.name} to matchmaking queue`);

    const queueEntry = {
      ...player,
      joinedAt: Date.now(),
      preferences: {
        mode: preferences.mode || "prefer-humans", // "quick-bots", "prefer-humans", "humans-only"
        region: preferences.region || "global",
        skillLevel: preferences.skillLevel || "mixed",
      },
    };

    this.queue.set(player.socketId, queueEntry);

    // Handle immediate bot games
    if (preferences.mode === "quick-bots") {
      return this.createQuickBotGame(queueEntry);
    }

    // Try to match with existing players
    this.attemptMatching();

    // Set individual player timeout
    const timeout = setTimeout(() => {
      this.handlePlayerTimeout(player.socketId);
    }, this.WAIT_TIME);

    this.playerTimers.set(player.socketId, timeout);

    // Notify player of queue status
    this.notifyQueueStatus(player.socketId);

    return { status: "queued", estimatedWait: this.getEstimatedWaitTime() };
  }

  /**
   * Remove player from queue
   */
  static removePlayerFromQueue(socketId) {
    const player = this.queue.get(socketId);
    if (!player) return false;

    console.log(`Removing player ${player.name} from matchmaking queue`);

    // Clear player timeout
    const timeout = this.playerTimers.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.playerTimers.delete(socketId);
    }

    // Remove from queue
    this.queue.delete(socketId);

    // Check if player was in a waiting room
    for (const [roomId, roomData] of this.waitingRooms.entries()) {
      const room = roomData.room;
      const playerIndex = room.players.findIndex(
        (p) => p.socketId === socketId
      );

      if (playerIndex !== -1) {
        // Remove player from waiting room
        room.players.splice(playerIndex, 1);

        // If room becomes empty, clean it up
        if (room.players.length === 0) {
          this.cleanupWaitingRoom(roomId);
        } else {
          // Notify remaining players
          this.notifyRoomUpdate(roomId, room);
        }
        break;
      }
    }

    return true;
  }

  /**
   * Attempt to match players in queue
   */
  static attemptMatching() {
    const queuedPlayers = Array.from(this.queue.values())
      .filter((p) => p.preferences.mode !== "quick-bots")
      .sort((a, b) => a.joinedAt - b.joinedAt); // FIFO

    if (queuedPlayers.length < this.MIN_PLAYERS_TO_START) {
      return;
    }

    // Try to fill existing waiting rooms first
    for (const [roomId, roomData] of this.waitingRooms.entries()) {
      const room = roomData.room;
      const availableSlots = this.MAX_PLAYERS_PER_ROOM - room.players.length;

      if (availableSlots > 0) {
        const playersToAdd = queuedPlayers.slice(0, availableSlots);

        for (const player of playersToAdd) {
          this.addPlayerToWaitingRoom(roomId, player);
        }

        // If room is full, start the game
        if (room.players.length === this.MAX_PLAYERS_PER_ROOM) {
          this.startGameFromWaitingRoom(roomId);
        }

        return;
      }
    }

    // Create new room if we have enough players
    if (queuedPlayers.length >= this.MIN_PLAYERS_TO_START) {
      const playersForNewRoom = queuedPlayers.slice(
        0,
        this.MAX_PLAYERS_PER_ROOM
      );
      this.createWaitingRoom(playersForNewRoom);
    }
  }

  /**
   * Create a quick game with bots
   */
  static createQuickBotGame(player) {
    console.log(`Creating quick bot game for ${player.name}`);

    const roomId = this.generateRoomId();

    // Assign player to seat 1
    player.seat = 1;

    // Create room
    const room = RoomManager.createRoom(roomId, player);

    // Add bots to remaining seats
    BotManager.addBotsToRoom(roomId, room, "medium");

    // Make bots ready
    BotManager.makeBotsReady(roomId);

    // Remove player from queue
    this.removePlayerFromQueue(player.socketId);

    // Notify player to join room
    if (this.io) {
      this.io.to(player.socketId).emit("matchFound", {
        roomId,
        message: "Quick game with bots created!",
      });
    }

    return { status: "matched", roomId, gameType: "quick-bots" };
  }

  /**
   * Create a waiting room for matched players
   */
  static createWaitingRoom(players) {
    const roomId = this.generateRoomId();
    console.log(
      `Creating waiting room ${roomId} for ${players.length} players`
    );

    // Assign seats to players
    players.forEach((player, index) => {
      player.seat = index + 1;
    });

    // Create room with first player
    const room = RoomManager.createRoom(roomId, players[0]);

    // Add remaining players
    for (let i = 1; i < players.length; i++) {
      RoomManager.addPlayerToRoom(roomId, players[i]);
    }

    // Remove players from queue
    players.forEach((player) => {
      this.queue.delete(player.socketId);
      const timeout = this.playerTimers.get(player.socketId);
      if (timeout) {
        clearTimeout(timeout);
        this.playerTimers.delete(player.socketId);
      }
    });

    // Set up waiting room
    const waitingRoomData = {
      room,
      createdAt: Date.now(),
      playerCount: players.length,
      timer: null,
    };

    this.waitingRooms.set(roomId, waitingRoomData);

    // Set timer to fill with bots if needed
    waitingRoomData.timer = setTimeout(() => {
      this.fillRoomWithBots(roomId);
    }, this.PARTIAL_ROOM_WAIT);

    // Notify players
    players.forEach((player) => {
      if (this.io) {
        this.io.to(player.socketId).emit("matchFound", {
          roomId,
          message: `Match found! ${players.length}/4 players ready.`,
          playersFound: players.length,
          waitingForMore: this.MAX_PLAYERS_PER_ROOM - players.length,
        });
      }
    });

    return roomId;
  }

  /**
   * Add player to existing waiting room
   */
  static addPlayerToWaitingRoom(roomId, player) {
    const roomData = this.waitingRooms.get(roomId);
    if (!roomData) return false;

    const room = roomData.room;
    const availableSeats = [1, 2, 3, 4].filter(
      (seat) => !room.players.some((p) => p.seat === seat)
    );

    if (availableSeats.length === 0) return false;

    // Assign seat to player
    player.seat = availableSeats[0];

    // Add to room
    RoomManager.addPlayerToRoom(roomId, player);

    // Remove from queue
    this.queue.delete(player.socketId);
    const timeout = this.playerTimers.get(player.socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.playerTimers.delete(player.socketId);
    }

    // Update room data
    roomData.playerCount = room.players.length;

    // Notify all players in the room
    this.notifyRoomUpdate(roomId, room);

    // Notify new player
    if (this.io) {
      this.io.to(player.socketId).emit("matchFound", {
        roomId,
        message: `Joined match! ${room.players.length}/4 players ready.`,
        playersFound: room.players.length,
        waitingForMore: this.MAX_PLAYERS_PER_ROOM - room.players.length,
      });
    }

    return true;
  }

  /**
   * Fill room with bots after timeout
   */
  static fillRoomWithBots(roomId) {
    const roomData = this.waitingRooms.get(roomId);
    if (!roomData) return;

    const room = roomData.room;
    console.log(
      `Filling room ${roomId} with bots. Current players: ${room.players.length}`
    );

    // Add bots to empty seats
    BotManager.addBotsToRoom(roomId, room, "medium");

    // Make bots ready
    BotManager.makeBotsReady(roomId);

    // Start the game
    this.startGameFromWaitingRoom(roomId);
  }

  /**
   * Start game from waiting room
   */
  static startGameFromWaitingRoom(roomId) {
    const roomData = this.waitingRooms.get(roomId);
    if (!roomData) return;

    const room = roomData.room;
    console.log(
      `Starting game in room ${roomId} with ${room.players.length} players`
    );

    // Notify all players that the game is starting
    room.players.forEach((player) => {
      if (this.io && !BotManager.isBot(player)) {
        this.io.to(player.socketId).emit("gameStarting", {
          roomId,
          message: "Game is starting! Get ready!",
          redirect: true,
        });
      }
    });

    // Clean up waiting room
    this.cleanupWaitingRoom(roomId);
  }

  /**
   * Handle player timeout
   */
  static handlePlayerTimeout(socketId) {
    const player = this.queue.get(socketId);
    if (!player) return;

    console.log(`Player ${player.name} timed out in queue`);

    if (player.preferences.mode === "humans-only") {
      // Notify player that no match was found
      if (this.io) {
        this.io.to(socketId).emit("matchTimeout", {
          message: "No other players found. Try again later!",
          suggestion: "Consider playing with bots for a quicker game.",
        });
      }
    } else {
      // Create game with bots
      this.createQuickBotGame(player);
    }

    this.removePlayerFromQueue(socketId);
  }

  /**
   * Clean up waiting room
   */
  static cleanupWaitingRoom(roomId) {
    const roomData = this.waitingRooms.get(roomId);
    if (!roomData) return;

    // Clear timer
    if (roomData.timer) {
      clearTimeout(roomData.timer);
    }

    // Remove from waiting rooms
    this.waitingRooms.delete(roomId);
  }

  /**
   * Notify player of queue status
   */
  static notifyQueueStatus(socketId) {
    const queueSize = this.queue.size;
    const waitingRoomCount = this.waitingRooms.size;

    if (this.io) {
      this.io.to(socketId).emit("queueStatus", {
        position: queueSize,
        playersInQueue: queueSize,
        waitingRooms: waitingRoomCount,
        estimatedWait: this.getEstimatedWaitTime(),
      });
    }
  }

  /**
   * Notify room update
   */
  static notifyRoomUpdate(roomId, room) {
    if (!this.io) return;

    room.players.forEach((player) => {
      if (!BotManager.isBot(player)) {
        this.io.to(player.socketId).emit("waitingRoomUpdate", {
          roomId,
          playersCount: room.players.length,
          players: room.players.map((p) => ({
            name: p.name,
            isBot: BotManager.isBot(p),
          })),
        });
      }
    });
  }

  /**
   * Get estimated wait time
   */
  static getEstimatedWaitTime() {
    const queueSize = this.queue.size;

    if (queueSize === 0) return 0;
    if (queueSize < 2) return 45; // Full wait time
    if (queueSize < 4) return 30; // Likely to get partial room
    return 15; // Should match quickly
  }

  /**
   * Generate unique room ID
   */
  static generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Get queue statistics
   */
  static getQueueStats() {
    return {
      playersInQueue: this.queue.size,
      waitingRooms: this.waitingRooms.size,
      totalPlayersInWaitingRooms: Array.from(this.waitingRooms.values()).reduce(
        (sum, roomData) => sum + roomData.playerCount,
        0
      ),
    };
  }

  /**
   * Clean up disconnected players
   */
  static cleanupDisconnectedPlayer(socketId) {
    this.removePlayerFromQueue(socketId);
  }
}
