// In-memory storage for development (replace with database in production)
const rooms = new Map();

export class RoomManager {
  static createRoom(roomId, firstPlayer) {
    const room = {
      id: roomId,
      players: [firstPlayer],
      gameState: {
        phase: "waiting",
        currentRound: 0,
        scores: {},
        remainingDeck: [],
        dealing: false,
      },
      currentTrick: [],
      currentPlayer: 1,
      tricks: [],
      gameStarted: false,
      createdAt: new Date(),
      // Add new properties
      dealerSeat: 1,
      deck: [],
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

    room.players.push(player);
    rooms.set(roomId, room);
    return true;
  }

  static removePlayerFromRoom(roomId, playerId) {
    const room = rooms.get(roomId);
    if (!room) {
      return false;
    }

    room.players = room.players.filter((p) => p.id !== playerId);

    // If no players left, remove the room
    if (room.players.length === 0) {
      rooms.delete(roomId);
    } else {
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
}
