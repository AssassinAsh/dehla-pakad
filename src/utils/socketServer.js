import { Server } from "socket.io";
import { RoomManager } from "./roomManager.js";
import { createDeck } from "./gameLogic.js";
import { BotManager } from "./botManager.js";

// Debounce map for room updates
const roomUpdateDebounce = new Map();

// Optimized room update emitter with debouncing
function emitRoomUpdate(roomId, io, delay = 50) {
  // Clear existing timeout
  if (roomUpdateDebounce.has(roomId)) {
    clearTimeout(roomUpdateDebounce.get(roomId));
  }

  // Set new timeout
  const timeoutId = setTimeout(() => {
    const room = RoomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit("roomUpdated", room);
    }
    roomUpdateDebounce.delete(roomId);
  }, delay);

  roomUpdateDebounce.set(roomId, timeoutId);
}

// Optimized dealing function to reduce emissions
function dealCardsOptimized(room, roomId, io, deck) {
  return new Promise((resolve) => {
    let dealIndex = 0;
    const dealCards = () => {
      if (dealIndex < 5) {
        // Deal 4 cards at once (one per player)
        room.players.forEach((player) => {
          player.hand.push(deck.shift());
        });

        // Update bot hands
        BotManager.updateBotHands(roomId, room);

        dealIndex++;

        // Only emit update every 2 deals to reduce network traffic
        if (dealIndex % 2 === 0 || dealIndex === 5) {
          RoomManager.updateRoom(roomId, room);
          emitRoomUpdate(roomId, io, 100);
        }

        setTimeout(dealCards, dealIndex === 5 ? 0 : 200); // Faster dealing
      } else {
        resolve();
      }
    };
    dealCards();
  });
}

// Create a wrapper around the TypeScript socketServer
export default function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL
          : "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Set the debounced room update function in BotManager
  BotManager.setEmitRoomUpdateFunction(emitRoomUpdate);

  io.on("connection", (socket) => {
    // Handle room creation
    socket.on("createRoom", (playerName, callback) => {
      try {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const player = {
          id: socket.id,
          name: playerName,
          seat: 1, // First player gets seat 1
          hand: [],
          isReady: false,
          isConnected: true,
        };

        const room = RoomManager.createRoom(roomId, player);
        socket.join(roomId);

        // Ensure callback is a function before calling it
        if (typeof callback === "function") {
          callback(roomId);
        } else {
          console.error("createRoom callback is not a function");
        }

        socket.emit("roomUpdated", room);
      } catch (error) {
        console.error("Error creating room:", error);

        // Ensure callback is a function before calling it
        if (typeof callback === "function") {
          callback(null);
        } else {
          console.error("createRoom callback is not a function");
        }
      }
    });

    // Handle joining a room
    socket.on("joinRoom", (roomId, playerName, seatNumber, callback) => {
      try {
        const player = {
          id: socket.id,
          name: playerName,
          seat: seatNumber,
          hand: [],
          isReady: false,
          isConnected: true,
        };

        const success = RoomManager.addPlayerToRoom(roomId, player);
        if (success) {
          socket.join(roomId);
          emitRoomUpdate(roomId, io); // Use optimized emitter
          callback(true);
        } else {
          // Check if duplicate name
          const room = RoomManager.getRoom(roomId);
          const normalizedName = playerName.trim().toLowerCase();
          const nameExists =
            room &&
            room.players.some(
              (p) => p.name.trim().toLowerCase() === normalizedName
            );
          if (nameExists) {
            callback(
              false,
              "A player with this name already exists in the room. Please choose a different name."
            );
          } else {
            callback(false);
          }
        }
      } catch (error) {
        console.error("Error joining room:", error);
        callback(false);
      }
    });

    // Handle checking if a room exists
    socket.on("checkRoom", (roomId, callback) => {
      const room = RoomManager.getRoom(roomId);
      const exists = !!room;

      if (exists) {
        // If room exists, join the socket to that room for updates
        socket.join(roomId);
        // Send the current room state to the client
        socket.emit("roomUpdated", room);
      }

      if (typeof callback === "function") {
        callback(exists);
      }
    });

    // Handle playing a card
    socket.on("playCard", (roomId, cardId, playerName) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room || room.gameState.status !== "in-progress") {
          return socket.emit("error", "Cannot play card: game not in progress");
        }

        // Find player by name, as socket.id can change on reconnect
        const player = room.players.find((p) => p.name === playerName);
        if (!player) {
          return socket.emit("error", "Player not found.");
        }

        // Optional: Update socket.id if it's different (handles reconnection)
        if (player.id !== socket.id) {
          player.id = socket.id;
        }

        if (room.currentPlayer !== player.seat) {
          return socket.emit("error", "It's not your turn.");
        }

        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) {
          return socket.emit("error", "Invalid card played.");
        }

        const playedCard = player.hand[cardIndex];

        // Use the shared card play logic from BotManager
        BotManager.processCardPlay(
          room,
          player,
          playedCard,
          cardIndex,
          roomId,
          io,
          socket
        );
      } catch (error) {
        console.error("Error playing card:", error);
        socket.emit("error", "Error playing card");
      }
    });

    // Handle starting the game
    socket.on("startGame", async (roomId) => {
      try {
        const room = RoomManager.getRoom(roomId);

        // Only need 4 players who have all joined
        if (room && room.players.length === 4 && !room.gameStarted) {
          // Set dealer and dealing state
          RoomManager.setDealer(roomId, room.currentPlayer || 1);
          RoomManager.setDealing(roomId, true);

          const deck = createDeck();

          // Use optimized dealing
          await dealCardsOptimized(room, roomId, io, deck);

          // Finish dealing
          room.gameStarted = true;
          room.gameState.status = "in-progress";
          room.currentPlayer = room.players[0].seat; // Start with seat 1
          room.deck = deck; // Store remaining deck
          RoomManager.setDealing(roomId, false);
          RoomManager.updateRoom(roomId, room);

          // Single emission for game start
          io.to(roomId).emit("gameStarted", room);
          emitRoomUpdate(roomId, io);

          // Use unified turn handler for first player
          BotManager.handleTurn(roomId, room, io);
        } else {
          socket.emit("error", "Cannot start game.");
        }
      } catch (error) {
        console.error(`Error starting game in room ${roomId}:`, error);
        socket.emit("error", "An error occurred while starting the game.");
      }
    });

    // Handle player ready event
    socket.on("playerReady", async (roomId, playerName) => {
      const set = RoomManager.setPlayerReady(roomId, playerName, true);
      if (set) {
        const room = RoomManager.getRoom(roomId);
        emitRoomUpdate(roomId, io);

        if (RoomManager.areAllPlayersReady(roomId)) {
          // All ready, start the game automatically
          if (room && room.players.length === 4 && !room.gameStarted) {
            RoomManager.setDealer(roomId, room.currentPlayer || 1);
            RoomManager.setDealing(roomId, true);
            const deck = createDeck();

            // Use optimized dealing
            await dealCardsOptimized(room, roomId, io, deck);

            room.gameStarted = true;
            room.gameState.status = "in-progress";
            room.currentPlayer = room.players[0].seat;
            room.deck = deck;
            RoomManager.setDealing(roomId, false);
            RoomManager.updateRoom(roomId, room);

            io.to(roomId).emit("gameStarted", room);
            emitRoomUpdate(roomId, io);
          }
        }
      }
    });

    // Handle adding a bot to a specific seat
    socket.on("addBotToSeat", (roomId, seat, difficulty = "medium") => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        // Add bot to specific seat
        const bot = BotManager.addBotToSeat(roomId, room, seat, difficulty);

        if (bot) {
          // Make bot ready automatically
          bot.isReady = true;

          // Update room and broadcast
          RoomManager.updateRoom(roomId, room);
          emitRoomUpdate(roomId, io);
        } else {
          socket.emit("error", "Seat is already occupied");
        }
      } catch (error) {
        console.error("Error adding bot:", error);
        socket.emit("error", "Failed to add bot");
      }
    });

    // Handle adding bots to room (for backward compatibility)
    socket.on("addBots", (roomId, difficulty = "medium") => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        // Add bots to fill empty seats
        const bots = BotManager.addBotsToRoom(roomId, room, difficulty);

        if (bots.length > 0) {
          // Make bots ready automatically
          BotManager.makeBotsReady(roomId);

          // Update room and broadcast
          RoomManager.updateRoom(roomId, room);
          emitRoomUpdate(roomId, io);
        }
      } catch (error) {
        console.error("Error adding bots:", error);
        socket.emit("error", "Failed to add bots");
      }
    });

    // Handle room list requests
    socket.on("getRooms", () => {
      const roomsList = RoomManager.getRoomsList();
      socket.emit("roomsList", roomsList);
    });

    // Handle player replay requests
    socket.on("playerReplay", (roomId) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room) return;
        // Find player by socket.id
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;
        RoomManager.addReplayVote(roomId, player.name);
        const replayVotes = RoomManager.getReplayVotes(roomId);

        // Count only human players for replay votes (bots don't vote)
        const humanPlayers = room.players.filter((p) => !BotManager.isBot(p));
        const requiredVotes = humanPlayers.length;

        // If all human players have voted, reset the game
        if (replayVotes.size === requiredVotes) {
          // Remove all bots from the room before resetting
          const bots = BotManager.getBotsInRoom(roomId);
          bots.forEach((bot) => {
            // Remove bot from room.players
            const botIndex = room.players.findIndex((p) => p.id === bot.id);
            if (botIndex !== -1) {
              room.players.splice(botIndex, 1);
            }
          });

          // Clean up bot tracking
          BotManager.removeBotsFromRoom(roomId);

          // Reset game state
          RoomManager.clearReplayVotes(roomId);
          RoomManager.resetAllReady(roomId); // <-- Reset ready flags
          room.gameStarted = false;
          room.gameState = {
            status: "waiting",
            trump: null,
            trumpJustSet: false,
            totalTricksCompleted: 0,
            scores: {
              team1: { tricks: 0, tens: 0 },
              team2: { tricks: 0, tens: 0 },
            },
            lastTrickWinnerSeat: null,
          };
          room.deck = [];
          room.currentTrick = [];
          room.stackedTricks = [];
          room.tricks = [];
          // Optionally rotate dealer/first player
          room.currentPlayer =
            room.players.length > 0 ? room.players[0].seat : null;
          RoomManager.updateRoom(roomId, room);
          emitRoomUpdate(roomId, io);
          // Now players must click Ready again to start
        } else {
          // Notify clients how many are ready
          io.to(roomId).emit("replayVote", {
            count: replayVotes.size,
            required: requiredVotes,
          });
        }
      } catch (error) {
        console.error("Error handling playerReplay:", error);
      }
    });

    // Handle leaving a room
    socket.on("leaveRoom", (roomId) => {
      const room = RoomManager.getRoom(roomId);
      if (room) {
        RoomManager.removePlayerFromRoom(roomId, socket.id);
        const updatedRoom = RoomManager.getRoom(roomId);
        if (updatedRoom) {
          emitRoomUpdate(roomId, io);
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      // Give a grace period for reconnection, e.g., 5 seconds
      setTimeout(() => {
        const room = RoomManager.getRoomByPlayerId(socket.id);
        if (room) {
          // Check if the player has reconnected with a new socket ID
          const player = room.players.find((p) => p.id === socket.id);
          if (player && !player.isConnected) {
            RoomManager.removePlayerFromRoom(room.id, socket.id);
            const updatedRoom = RoomManager.getRoom(room.id);
            if (updatedRoom) {
              emitRoomUpdate(room.id, io);
            }
          }
        }
      }, 5000); // 5-second grace period
    });
  });

  // Emit updated room list to all clients in the lobby every 10 seconds (reduced frequency)
  setInterval(() => {
    const roomsList = RoomManager.getRoomsList();
    io.emit("roomsList", roomsList);
  }, 10000);

  return io;
}
