// Socket.IO configuration for future implementation
// This file contains the setup for real-time multiplayer functionality

import { Server } from "socket.io";
import { RoomManager } from "@/utils/roomManager";
import { Player, Card } from "@/types/game";
import {
  createDeck,
  shuffleDeck,
  canPlayCard,
  getTrickWinner,
  countTens,
} from "@/utils/gameUtils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupSocketIO(server: any) {
  const io = new Server(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL
          : "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle room creation
    socket.on("createRoom", (playerName: string, callback) => {
      try {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const player: Player = {
          id: socket.id,
          name: playerName,
          seat: 1, // First player gets seat 1
          hand: [],
          isReady: false,
          isConnected: true,
        };

        const room = RoomManager.createRoom(roomId, player);
        socket.join(roomId);

        callback(roomId);
        socket.emit("roomUpdated", room);
      } catch {
        callback(null);
      }
    });

    // Handle joining a room
    socket.on(
      "joinRoom",
      (roomId: string, playerName: string, seat: number, callback) => {
        try {
          const room = RoomManager.getRoom(roomId);
          if (!room) {
            callback(false, "Room not found");
            return;
          }

          if (room.players.length >= 4) {
            callback(false, "Room is full");
            return;
          }

          const player: Player = {
            id: socket.id,
            name: playerName,
            seat: seat,
            hand: [],
            isReady: false,
            isConnected: true,
          };

          const success = RoomManager.addPlayerToRoom(roomId, player);
          if (success) {
            socket.join(roomId);
            const updatedRoom = RoomManager.getRoom(roomId);

            callback(true);
            io.to(roomId).emit("roomUpdated", updatedRoom);
            socket.to(roomId).emit("playerJoined", player);
          } else {
            callback(false, "Failed to join room");
          }
        } catch {
          callback(false, "Server error");
        }
      }
    );

    // Handle leaving a room
    socket.on("leaveRoom", (roomId: string) => {
      try {
        RoomManager.removePlayerFromRoom(roomId, socket.id);
        socket.leave(roomId);

        const room = RoomManager.getRoom(roomId);
        if (room) {
          io.to(roomId).emit("roomUpdated", room);
        }

        socket.to(roomId).emit("playerLeft", socket.id);
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    // Handle starting the game
    socket.on("startGame", (roomId: string) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room || !RoomManager.canStartGame(roomId)) {
          socket.emit("gameError", "Cannot start game");
          return;
        }

        // Deal initial 5 cards to each player
        const deck = shuffleDeck(createDeck());
        const initialHands: Card[][] = room.players.map(() =>
          deck.splice(0, 5)
        );
        room.players.forEach((player, idx) => {
          player.hand = initialHands[idx];
        });
        // Initialize game state with zeroed scores and full deck
        const initialScores: { [seat: number]: number } = {};
        room.players.forEach((p) => (initialScores[p.seat] = 0));
        const updatedGameState = {
          phase: "playing" as const,
          currentRound: 1,
          scores: initialScores,
          remainingDeck: deck,
          trump: undefined,
          leadSeat: room.players[0].seat,
          lastTrickWinner: undefined,
          consecutiveWins: 0,
        };
        RoomManager.updateRoom(roomId, {
          gameStarted: true,
          players: room.players,
          currentTrick: [],
          tricks: [],
          currentPlayer: room.players[0].seat,
          gameState: updatedGameState,
        });
        const updatedRoom = RoomManager.getRoom(roomId);
        io.to(roomId).emit("gameStarted", updatedRoom);
      } catch {
        socket.emit("gameError", "Failed to start game");
      }
    });

    // Handle card play
    socket.on("playCard", (roomId: string, cardId: string) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room || !room.gameStarted) {
          socket.emit("gameError", "Game not active");
          return;
        }
        // Identify player and card
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) {
          socket.emit("gameError", "Player not in room");
          return;
        }
        const card = player.hand.find((c) => c.id === cardId);
        if (!card) {
          socket.emit("gameError", "Card not in hand");
          return;
        }
        // Determine lead suit
        const leadSuit = room.currentTrick.length
          ? room.currentTrick[0].suit
          : card.suit;
        // Validate follow suit rule
        if (!canPlayCard(card, leadSuit, player.hand)) {
          socket.emit("gameError", "Must follow suit");
          return;
        }
        // Remove card from hand and add to trick
        player.hand = player.hand.filter((c) => c.id !== cardId);
        room.currentTrick.push(card);
        // If trick complete (each player played)
        if (room.currentTrick.length === room.players.length) {
          const leadSuitCompleted = room.currentTrick[0].suit;
          const trump = room.gameState.trump;
          // Determine play order based on leadSeat
          const sorted = [...room.players].sort((a, b) => a.seat - b.seat);
          const startIdx = sorted.findIndex(
            (p) => p.seat === (room.gameState.leadSeat || sorted[0].seat)
          );
          const order = Array(room.players.length)
            .fill(0)
            .map((_, i) => sorted[(startIdx + i) % sorted.length].seat);
          const winnerIdx = getTrickWinner(
            room.currentTrick,
            leadSuitCompleted,
            trump
          );
          const winnerSeat = order[winnerIdx];
          // Record trick
          const trickObj = {
            cards: room.currentTrick,
            winner: winnerSeat,
            leadSuit: leadSuitCompleted,
          };
          room.tricks.push(trickObj);
          // Update consecutive wins
          if (room.gameState.lastTrickWinner === winnerSeat) {
            room.gameState.consecutiveWins! += 1;
          } else {
            room.gameState.consecutiveWins = 1;
          }
          room.gameState.lastTrickWinner = winnerSeat;
          // Handle scoring: count tens
          if (room.gameState.consecutiveWins! >= 2) {
            // Capture all tricks played so far
            const allCards = room.tricks.flatMap((t) => t.cards);
            const tensCaptured = countTens(allCards);
            room.gameState.scores[winnerSeat] += tensCaptured;
            // Clear tricks history
            room.tricks = [];
          } else {
            // Score only this trick
            const tensCaptured = countTens(trickObj.cards);
            room.gameState.scores[winnerSeat] += tensCaptured;
            room.gameState.leadSeat = winnerSeat;
          }
          // Reset current trick and advance round
          room.currentTrick = [];
          // Advance to next round
          room.gameState.currentRound! += 1;
          // Check if round complete
          if (room.gameState.currentRound! > 13) {
            // End of round: determine Kot (capturing all 4 tens)
            const finalScores = room.gameState.scores;
            let kotWinner: number | null = null;
            Object.entries(finalScores).forEach(([seat, score]) => {
              if (score === 4) kotWinner = Number(seat);
            });
            room.gameState.phase = "finished";
            io.to(roomId).emit("gameFinished", {
              scores: finalScores,
              kot: kotWinner,
            });
            return;
          }
          // Persist updated room
          RoomManager.updateRoom(roomId, {
            players: room.players,
            currentTrick: room.currentTrick,
            currentPlayer: room.currentPlayer,
            gameState: room.gameState,
            tricks: room.tricks,
          });
          io.to(roomId).emit("trickCompleted", trickObj);
        }
        // Advance turn
        const idx = room.players.findIndex(
          (p) => p.seat === room.currentPlayer
        );
        const next = room.players[(idx + 1) % room.players.length];
        room.currentPlayer = next.seat;
        // Persist updates
        RoomManager.updateRoom(roomId, {
          players: room.players,
          currentTrick: room.currentTrick,
          currentPlayer: room.currentPlayer,
          gameState: room.gameState,
        });
        // Notify players
        io.to(roomId).emit("cardPlayed", card, socket.id);
      } catch {
        socket.emit("gameError", "Failed to play card");
      }
    });

    // Handle getting all rooms
    socket.on("getRooms", (callback) => {
      try {
        const rooms = RoomManager.getAllRooms();
        const roomSummaries = rooms.map((room) => ({
          id: room.id,
          playerCount: room.players.length,
          gameStarted: room.gameStarted,
          createdAt: room.createdAt,
        }));

        callback(roomSummaries);
      } catch {
        callback([]);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Remove player from all rooms
      const rooms = RoomManager.getAllRooms();
      rooms.forEach((room) => {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          RoomManager.removePlayerFromRoom(room.id, socket.id);
          socket.to(room.id).emit("playerLeft", socket.id);

          const updatedRoom = RoomManager.getRoom(room.id);
          if (updatedRoom) {
            io.to(room.id).emit("roomUpdated", updatedRoom);
          }
        }
      });
    });

    // Handle room list requests
    socket.on("getRooms", () => {
      const roomsList = RoomManager.getRoomsList();
      socket.emit("roomsList", roomsList);
    });
  });

  // Emit updated room list to all clients in the lobby every 5 seconds
  setInterval(() => {
    const roomsList = RoomManager.getRoomsList();
    io.emit("roomsList", roomsList);
  }, 5000);

  return io;
}

// Export for use in API routes or custom server
export default setupSocketIO;
