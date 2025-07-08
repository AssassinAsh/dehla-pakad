import { Room, Player, RoomSummary } from "@/types/game";

// In-memory storage for development (replace with database in production)
const rooms = new Map<string, Room>();

export class RoomManager {
  static createRoom(roomId: string, firstPlayer: Player): Room {
    const room: Room = {
      id: roomId,
      players: [firstPlayer],
      gameState: {
        phase: "waiting",
        currentRound: 0,
        scores: {},
        remainingDeck: [],
      },
      currentTrick: [],
      currentPlayer: 1,
      tricks: [],
      gameStarted: false,
      createdAt: new Date(),
    };

    rooms.set(roomId, room);
    return room;
  }

  static getRoom(roomId: string): Room | null {
    return rooms.get(roomId) || null;
  }

  static addPlayerToRoom(roomId: string, player: Player): boolean {
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

  static removePlayerFromRoom(roomId: string, playerId: string): boolean {
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

  static getAllRooms(): Room[] {
    return Array.from(rooms.values());
  }

  static updateRoom(roomId: string, updates: Partial<Room>): boolean {
    const room = rooms.get(roomId);
    if (!room) {
      return false;
    }

    const updatedRoom = { ...room, ...updates };
    rooms.set(roomId, updatedRoom);
    return true;
  }

  static isRoomFull(roomId: string): boolean {
    const room = rooms.get(roomId);
    return room ? room.players.length >= 4 : false;
  }

  static canStartGame(roomId: string): boolean {
    const room = rooms.get(roomId);
    return room ? room.players.length === 4 && !room.gameStarted : false;
  }

  static getRoomsList(): RoomSummary[] {
    return Array.from(rooms.values()).map((room) => ({
      id: room.id,
      playerCount: room.players.length,
      gameStarted: room.gameStarted,
      createdAt: room.createdAt,
    }));
  }
}
