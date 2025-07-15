import { Server } from "socket.io";
import { RoomManager } from "./roomManager.js";
import { createDeck } from "./gameLogic.js";
import { BotManager } from "./botManager.js";
import { MatchmakingQueue } from "./matchmakingQueue.js";
import metrics from "./metrics.js";

// Debounce map for room updates
const roomUpdateDebounce = new Map();

// Optimized room update emitter with debouncing
function emitRoomUpdate(roomId, io, delay = 50) {
  // Clear existing timeout
  if (roomUpdateDebounce.has(roomId)) {
    clearTimeout(roomUpdateDebounce.get(roomId));
  }

  // Set new timeout
  const timeoutId = setTimeout(async () => {
    const room = await RoomManager.getRoom(roomId);
    if (room) {
      io.to(roomId).emit("roomUpdated", room);
    }
    roomUpdateDebounce.delete(roomId);
  }, delay);

  roomUpdateDebounce.set(roomId, timeoutId);
}

// Optimized dealing function to reduce emissions
// Deals cards starting from the player clockwise to the dealer
function dealCardsOptimized(room, roomId, io, deck, dealerSeat) {
  return new Promise((resolve) => {
    let dealIndex = 0;

    // Get dealing order starting from the player clockwise to the dealer
    const getDealingOrder = (dealer) => {
      const order = [];
      for (let i = 1; i <= 4; i++) {
        const seat = (dealer % 4) + i; // Start from next seat clockwise
        const adjustedSeat = seat > 4 ? seat - 4 : seat;
        order.push(adjustedSeat);
      }
      return order;
    };

    const dealingOrder = getDealingOrder(dealerSeat);

    const dealCards = () => {
      if (dealIndex < 5) {
        // Deal cards in proper order (clockwise from dealer)
        dealingOrder.forEach((seat) => {
          const player = room.players.find((p) => p.seat === seat);
          if (player && deck.length > 0) {
            player.hand.push(deck.shift());
          }
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
        // Set the first player to play (the one who got the first card)
        room.firstPlayerThisRound = dealingOrder[0];
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

  // Track socket connections
  let socketConnections = 0;

  // Set the debounced room update function in BotManager
  BotManager.setEmitRoomUpdateFunction(emitRoomUpdate);

  // Initialize MatchmakingQueue with Socket.IO instance
  MatchmakingQueue.setIO(io);

  // Set up periodic metrics updates every 30 seconds
  setInterval(() => {
    try {
      RoomManager.updateMetrics();
    } catch (error) {
      console.error("Error updating periodic metrics:", error);
    }
  }, 30000);

  io.on("connection", (socket) => {
    // Increment connection count and update metrics
    socketConnections++;
    metrics.setSocketConnections(socketConnections);

    console.log(
      `Socket connected for game/lobby: ${socket.id} (Total: ${socketConnections})`
    );

    // Handle room creation
    socket.on("createRoom", async (playerName, callback) => {
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

        const room = await RoomManager.createRoom(roomId, player);

        // Set as private room mode
        await RoomManager.setGameMode(roomId, "private");

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
    socket.on("joinRoom", async (roomId, playerName, seatNumber, callback) => {
      try {
        const room = await RoomManager.getRoom(roomId);
        if (!room) {
          callback(false);
          return;
        }

        // Check if player already exists in room (reconnection case)
        const existingPlayer = room.players.find((p) => p.name === playerName);

        if (existingPlayer) {
          // If player exists and is trying to select a seat
          if (seatNumber !== null && existingPlayer.seat !== seatNumber) {
            // Check if the new seat is available
            const seatTaken = room.players.some(
              (p) => p.seat === seatNumber && p.name !== playerName
            );
            if (seatTaken) {
              callback(false);
              return;
            }

            // Update existing player's seat
            existingPlayer.seat = seatNumber;
          }

          // Update existing player's socket ID for reconnection
          existingPlayer.id = socket.id;
          existingPlayer.socketId = socket.id;
          existingPlayer.isConnected = true;

          // Save updated room
          await RoomManager.updateRoom(roomId, room);

          // Join socket to room and emit update
          socket.join(roomId);
          emitRoomUpdate(roomId, io);

          callback(true);
          return;
        }

        // New player joining - only allow if they specify a seat
        if (seatNumber === null) {
          // Just add them to the room without a seat (for room observation)
          const player = {
            id: socket.id,
            socketId: socket.id,
            name: playerName,
            seat: null,
            hand: [],
            isReady: false,
            isConnected: true,
          };

          room.players.push(player);
          await RoomManager.updateRoom(roomId, room);

          socket.join(roomId);
          emitRoomUpdate(roomId, io);
          callback(true);
          return;
        }

        // New player joining with a specific seat
        const player = {
          id: socket.id,
          socketId: socket.id,
          name: playerName,
          seat: seatNumber,
          hand: [],
          isReady: false,
          isConnected: true,
        };

        const success = await RoomManager.addPlayerToRoom(roomId, player);
        if (success) {
          socket.join(roomId);
          emitRoomUpdate(roomId, io);
          callback(true);
        } else {
          callback(false);
        }
      } catch (error) {
        console.error("Error joining room:", error);
        callback(false);
      }
    });

    // ========== MATCHMAKING SYSTEM ==========

    // Handle instant bot game creation (bypasses queue entirely)
    socket.on("createBotGame", async (playerName, callback) => {
      try {
        const player = {
          id: socket.id,
          socketId: socket.id,
          name: playerName,
          hand: [],
          isReady: false,
          isConnected: true,
          seat: 1, // Always assign to seat 1
        };

        // Create room directly without queue
        const roomId = MatchmakingQueue.generateRoomId();
        const room = await RoomManager.createRoom(roomId, player);

        // Set game mode for quick-bots
        await RoomManager.setGameMode(roomId, "quick-bots");

        // Add bots to remaining seats
        BotManager.addBotsToRoom(roomId, room, "medium");

        // Make bots ready
        BotManager.makeBotsReady(roomId);

        if (typeof callback === "function") {
          callback({ status: "matched", roomId, gameType: "quick-bots" });
        }
      } catch (error) {
        console.error("Error creating bot game:", error);
        if (typeof callback === "function") {
          callback({ status: "error", message: "Failed to create bot game" });
        }
      }
    });

    // Handle joining matchmaking queue (for lobby games only)
    socket.on("joinMatchmaking", async (playerName, preferences, callback) => {
      try {
        const player = {
          id: socket.id,
          socketId: socket.id,
          name: playerName,
          hand: [],
          isReady: false,
          isConnected: true,
        };

        const result = await MatchmakingQueue.addPlayerToQueue(
          player,
          preferences
        );

        if (typeof callback === "function") {
          callback(result);
        }
      } catch (error) {
        console.error("Error joining matchmaking:", error);
        if (typeof callback === "function") {
          callback({ status: "error", message: "Failed to join matchmaking" });
        }
      }
    });

    // Handle leaving matchmaking queue
    socket.on("leaveMatchmaking", (callback) => {
      try {
        const success = MatchmakingQueue.removePlayerFromQueue(socket.id);

        if (typeof callback === "function") {
          callback({ status: success ? "success" : "not-found" });
        }
      } catch (error) {
        console.error("Error leaving matchmaking:", error);
        if (typeof callback === "function") {
          callback({ status: "error", message: "Failed to leave matchmaking" });
        }
      }
    });

    // Handle getting queue status
    socket.on("getQueueStatus", (callback) => {
      try {
        const stats = MatchmakingQueue.getQueueStats();

        if (typeof callback === "function") {
          callback(stats);
        }
      } catch (error) {
        console.error("Error getting queue status:", error);
        if (typeof callback === "function") {
          callback({ error: "Failed to get queue status" });
        }
      }
    });

    // ========== END MATCHMAKING ==========

    // Handle checking if a room exists
    socket.on("checkRoom", async (roomId, callback) => {
      const room = await RoomManager.getRoom(roomId);
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
    socket.on("playCard", async (roomId, cardId, playerName) => {
      try {
        const room = await RoomManager.getRoom(roomId);
        if (!room || room.gameState?.status !== "in-progress") {
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

        // Track card play metric
        metrics.incrementCardPlays();

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
        const room = await RoomManager.getRoom(roomId);

        // Only need 4 players who have all joined
        if (room && room.players.length === 4 && !room.gameStarted) {
          // Set or rotate dealer (clockwise for new rounds)
          if (!room.dealerSeat) {
            // First game: assign dealer to seat 1
            await RoomManager.setDealer(roomId, 1);
          } else {
            // Subsequent games: rotate dealer clockwise
            await RoomManager.rotateDealer(roomId);
          }

          const dealerSeat = room.dealerSeat;
          await RoomManager.setDealing(roomId, true);

          const deck = createDeck();

          // Use optimized dealing with proper dealer logic
          await dealCardsOptimized(room, roomId, io, deck, dealerSeat);

          // Check card integrity after initial dealing
          BotManager.checkCardIntegrity(roomId, room, "after-initial-dealing");

          // Finish dealing
          room.gameStarted = true;
          room.gameState.status = "in-progress";
          // Set current player to the one who got the first card (clockwise from dealer)
          room.currentPlayer = room.firstPlayerThisRound;
          room.deck = deck; // Store remaining deck
          await RoomManager.setDealing(roomId, false);
          await RoomManager.updateRoomState(roomId, room);

          // Track game started metric
          metrics.incrementGamesStarted();

          // Single emission for game start
          io.to(roomId).emit("gameStarted", room);
          emitRoomUpdate(roomId, io);

          // Use unified turn handler for first player with a small delay
          setTimeout(async () => {
            const currentRoom = await RoomManager.getRoom(roomId);
            await BotManager.handleTurn(roomId, currentRoom, io);
          }, 1000);
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
      const set = await RoomManager.setPlayerReady(roomId, playerName, true);
      if (set) {
        const room = await RoomManager.getRoom(roomId);
        emitRoomUpdate(roomId, io);

        if (await RoomManager.areAllPlayersReady(roomId)) {
          // All ready, start the game automatically
          if (room && room.players.length === 4 && !room.gameStarted) {
            // Set or rotate dealer (clockwise for new rounds)
            if (!room.dealerSeat) {
              // First game: assign dealer to seat 1
              await RoomManager.setDealer(roomId, 1);
            } else {
              // Subsequent games: rotate dealer clockwise
              await RoomManager.rotateDealer(roomId);
            }

            const dealerSeat = room.dealerSeat;
            await RoomManager.setDealing(roomId, true);
            const deck = createDeck();

            // Use optimized dealing with proper dealer logic
            await dealCardsOptimized(room, roomId, io, deck, dealerSeat);

            room.gameStarted = true;
            room.gameState.status = "in-progress";
            // Set current player to the one who got the first card (clockwise from dealer)
            room.currentPlayer = room.firstPlayerThisRound;
            room.deck = deck;
            RoomManager.setDealing(roomId, false);
            RoomManager.updateRoom(roomId, room);

            // Track game started metric
            metrics.incrementGamesStarted();

            io.to(roomId).emit("gameStarted", room);
            emitRoomUpdate(roomId, io);

            // Use unified turn handler for first player with a small delay
            setTimeout(async () => {
              const currentRoom = await RoomManager.getRoom(roomId);
              await BotManager.handleTurn(roomId, currentRoom, io);
            }, 1000);
          }
        }
      }
    });

    // Handle adding a bot to a specific seat
    socket.on("addBotToSeat", async (roomId, seat, difficulty = "medium") => {
      try {
        const room = await RoomManager.getRoom(roomId);
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
    socket.on("addBots", async (roomId, difficulty = "medium") => {
      try {
        const room = await RoomManager.getRoom(roomId);
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

    // Handle player replay requests - Enhanced version
    socket.on("playerReplay", async (roomId) => {
      try {
        const room = await RoomManager.getRoom(roomId);
        if (!room) return;

        // Find player by socket.id
        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        // Use enhanced replay system
        const result = await RoomManager.handleReplayRequest(
          roomId,
          player.name,
          io
        );

        // Send feedback to the requesting player
        socket.emit("replayResponse", result);
      } catch (error) {
        console.error("Error handling playerReplay:", error);
        socket.emit("replayResponse", {
          success: false,
          message: "Error processing replay request",
        });
      }
    });

    // Handle leaving a room
    socket.on("leaveRoom", async (roomId) => {
      const room = await RoomManager.getRoom(roomId);
      if (room) {
        // Find the leaving player
        const leavingPlayer = room.players.find((p) => p.id === socket.id);
        const isHost = leavingPlayer && room.host === leavingPlayer.name;

        await RoomManager.removePlayerFromRoom(roomId, socket.id);
        const updatedRoom = await RoomManager.getRoom(roomId);

        if (isHost && updatedRoom && updatedRoom.players.length > 0) {
          // Host left, notify remaining players
          io.to(roomId).emit("hostLeft", {
            message:
              "Host left the game. You will be redirected to the home page.",
          });

          // Remove the room after a delay to let players see the message
          setTimeout(async () => {
            await RoomManager.removeRoom(roomId);
          }, 3000);
        } else if (updatedRoom) {
          emitRoomUpdate(roomId, io);
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      // Decrement connection count and update metrics
      socketConnections--;
      metrics.setSocketConnections(socketConnections);

      console.log(
        `Socket disconnected from game/lobby: ${socket.id} (Total: ${socketConnections})`
      );

      // Clean up from matchmaking queue
      MatchmakingQueue.cleanupDisconnectedPlayer(socket.id);

      // Give a grace period for reconnection, e.g., 5 seconds
      setTimeout(async () => {
        const room = await RoomManager.getRoomByPlayerId(socket.id);
        if (room) {
          // Check if the player has reconnected with a new socket ID
          const player = room.players.find((p) => p.id === socket.id);
          if (player && !player.isConnected) {
            const isHost = room.host === player.name;

            await RoomManager.removePlayerFromRoom(room.id, socket.id);
            const updatedRoom = await RoomManager.getRoom(room.id);

            if (isHost && updatedRoom && updatedRoom.players.length > 0) {
              // Host disconnected, notify remaining players
              io.to(room.id).emit("hostLeft", {
                message:
                  "Host disconnected and left the game. You will be redirected to the home page.",
              });

              // Remove the room after a delay
              setTimeout(async () => {
                await RoomManager.removeRoom(room.id);
              }, 3000);
            } else if (updatedRoom) {
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
