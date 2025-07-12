// In-memory storage for development (replace with database in production)
const rooms = new Map();

import { BotManager } from "./botManager.js";

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
    };

    rooms.set(roomId, room);
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

    // Prevent same user (by id or name) from taking multiple seats
    const normalizedName = player.name.trim().toLowerCase();
    const alreadySeated = room.players.some(
      (p) =>
        p.id === player.id || p.name.trim().toLowerCase() === normalizedName
    );
    if (alreadySeated) {
      return false;
    }

    room.players.push(player);
    rooms.set(roomId, room);
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
      rooms.set(roomId, room);
    }

    return true;
  }

  static getAllRooms() {
    return Array.from(rooms.values());
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
}
