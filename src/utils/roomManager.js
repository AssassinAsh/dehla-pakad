// In-memory storage for development (replace with database in production)
const rooms = new Map();

import { BotManager } from "./botManager.js";
import metrics from "./metrics.js";

export class RoomManager {
  static createRoom(roomId, firstPlayer) {
    const room = {
      id: roomId,
      players: [firstPlayer],
      host: firstPlayer.name,
      gameStarted: false,
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

    rooms.set(roomId, room);

    // Update metrics
    this.updateMetrics();

    return room;
  }

  static getRoom(roomId) {
    return rooms.get(roomId) || null;
  }

  static addPlayerToRoom(roomId, player) {
    const room = rooms.get(roomId);
    if (!room || room.players.length >= 4) {
      return false;
    }

    // Check if seat is already taken
    const seatTaken = room.players.some((p) => p.seat === player.seat);
    if (seatTaken) {
      return false;
    }

    // Prevent same user (by socket id) from taking multiple seats
    const alreadySeated = room.players.some((p) => p.id === player.id);
    if (alreadySeated) {
      return false;
    }

    room.players.push(player);
    rooms.set(roomId, room);

    // Update metrics
    this.updateMetrics();

    return true;
  }

  static removePlayerFromRoom(roomId, playerId) {
    const room = rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Check if the player being removed is the host
    const removedPlayer = room.players.find((p) => p.id === playerId);
    const isHostLeaving = removedPlayer && room.host === removedPlayer.name;
    const isDealerLeaving =
      removedPlayer && room.dealerSeat === removedPlayer.seat;

    room.players = room.players.filter((p) => p.id !== playerId);

    // If no players left, remove the room
    if (room.players.length === 0) {
      // Clean up bots
      BotManager.cleanupRoom(roomId);
      rooms.delete(roomId);
    } else {
      // If host left, transfer host to next player (by join order)
      if (isHostLeaving) {
        room.host = room.players.length > 0 ? room.players[0].name : undefined;
      }

      // If dealer left, reassign dealer to next occupied seat
      if (isDealerLeaving && room.players.length > 0) {
        const occupiedSeats = room.players
          .map((p) => p.seat)
          .sort((a, b) => a - b);
        room.dealerSeat = occupiedSeats[0]; // Assign to first available seat
      }

      rooms.set(roomId, room);
    }

    // Update metrics
    this.updateMetrics();

    return true;
  }

  static updateRoom(roomId, updates) {
    const room = rooms.get(roomId);
    if (!room) {
      return false;
    }

    const updatedRoom = { ...room, ...updates };
    rooms.set(roomId, updatedRoom);

    return true;
  }

  static isRoomFull(roomId) {
    const room = rooms.get(roomId);
    return room ? room.players.length >= 4 : false;
  }

  static canStartGame(roomId) {
    const room = rooms.get(roomId);
    return room ? room.players.length === 4 && !room.gameStarted : false;
  }

  static getRoomByPlayerId(playerId) {
    for (const room of rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room;
      }
    }
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

  static setDealer(roomId, seat) {
    const room = rooms.get(roomId);
    if (room) {
      room.dealerSeat = seat;
      rooms.set(roomId, room);
    }
  }

  static rotateDealer(roomId) {
    const room = rooms.get(roomId);
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

    rooms.set(roomId, room);
  }

  static setDealing(roomId, dealing) {
    const room = rooms.get(roomId);
    if (room) {
      room.gameState.dealing = dealing;
      rooms.set(roomId, room);
    }
  }

  static addReplayVote(roomId, playerName) {
    const room = rooms.get(roomId);
    if (room) {
      room.replayVotes.add(playerName);
      rooms.set(roomId, room);
    }
  }

  static clearReplayVotes(roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.replayVotes = new Set();
      rooms.set(roomId, room);
    }
  }

  static getReplayVotes(roomId) {
    const room = rooms.get(roomId);
    return room ? room.replayVotes : new Set();
  }

  static setPlayerReady(roomId, playerName, ready) {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(
        (p) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
      );
      if (player) {
        player.isReady = ready;
        rooms.set(roomId, room);
        return true;
      }
    }
    return false;
  }

  static resetAllReady(roomId) {
    const room = rooms.get(roomId);
    if (room) {
      room.players.forEach((p) => (p.isReady = false));
      rooms.set(roomId, room);
    }
  }

  static areAllPlayersReady(roomId) {
    const room = rooms.get(roomId);
    return (
      room && room.players.length === 4 && room.players.every((p) => p.isReady)
    );
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

  static getAllRooms() {
    return rooms;
  }

  // Enhanced replay system for different game modes
  static setGameMode(roomId, gameMode) {
    const room = rooms.get(roomId);
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
    }
  }

  static getGameMode(roomId) {
    const room = rooms.get(roomId);
    return room ? room.gameMode : "private";
  }

  static handleReplayRequest(roomId, playerName, io) {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "Room not found" };

    const gameMode = room.gameMode || "private";

    switch (gameMode) {
      case "quick-bots":
        return this.handleQuickBotsReplay(roomId, io);

      case "private":
        return this.handlePrivateRoomReplay(roomId, playerName, io);

      case "lobby":
        return this.handleLobbyReplay(roomId, playerName, io);

      default:
        return this.handleDefaultReplay(roomId, playerName, io);
    }
  }

  static handleQuickBotsReplay(roomId, io) {
    // Instant replay for single player vs bots
    const success = this.resetGameState(roomId);
    if (success) {
      io.to(roomId).emit("gameRestarted", {
        message: "Starting new game...",
        mode: "quick-bots",
      });
      return { success: true, message: "Game restarted instantly" };
    }
    return { success: false, message: "Failed to restart game" };
  }

  static handlePrivateRoomReplay(roomId, playerName, io) {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "Room not found" };

    // Only host can initiate replay in private rooms
    if (room.host !== playerName) {
      // Non-host players get added to a waiting list
      room.replayState.votes.add(playerName);
      io.to(roomId).emit("replayRequestReceived", {
        requester: playerName,
        message: `${playerName} wants to play again. Waiting for host decision.`,
      });
      return { success: true, message: "Replay request sent to host" };
    }

    // Host initiates replay
    const success = this.resetGameState(roomId);
    if (success) {
      io.to(roomId).emit("gameRestarted", {
        message: "Host started a new game!",
        mode: "private",
      });
      return { success: true, message: "New game started by host" };
    }
    return { success: false, message: "Failed to restart game" };
  }

  static handleLobbyReplay(roomId, playerName, io) {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "Room not found" };

    // Add vote for replay
    room.replayState.votes.add(playerName);

    const currentVotes = room.replayState.votes.size;
    const votesNeeded = room.replayState.votesNeeded;

    // Notify all players of vote status
    io.to(roomId).emit("replayVoteUpdate", {
      currentVotes,
      votesNeeded,
      voter: playerName,
    });

    if (currentVotes >= votesNeeded) {
      // Enough votes, redirect to new lobby
      io.to(roomId).emit("replayApproved", {
        message: "Players voted for replay! Joining new lobby...",
        mode: "lobby",
      });

      // Clear the room after a short delay
      setTimeout(() => {
        this.deleteRoom(roomId);
      }, 3000);

      return { success: true, message: "Replay approved - joining new lobby" };
    }

    return {
      success: true,
      message: `Vote recorded (${currentVotes}/${votesNeeded})`,
    };
  }

  static handleDefaultReplay(roomId, playerName, io) {
    // Fallback to original replay system
    this.addReplayVote(roomId, playerName);
    const replayVotes = this.getReplayVotes(roomId);
    const room = rooms.get(roomId);
    const humanPlayers = room.players.filter((p) => !p.isBot).length;

    if (replayVotes.size >= humanPlayers) {
      const success = this.resetGameState(roomId);
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

  static resetGameState(roomId) {
    const room = rooms.get(roomId);
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
        player.isReady = room.gameMode === "quick-bots" ? true : false; // Auto-ready for bots
      });

      return true;
    } catch (error) {
      console.error("Error resetting game state:", error);
      return false;
    }
  }
}
