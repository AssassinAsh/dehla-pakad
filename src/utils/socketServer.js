import { Server } from "socket.io";
import { RoomManager } from "./roomManager.js";
import {
  createDeck,
  determineTrickWinner,
  calculateScores,
  checkForKot,
} from "./gameLogic.js";

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

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle room creation
    socket.on("createRoom", (playerName, callback) => {
      console.log(
        `User ${socket.id} is creating a room with name ${playerName}`
      );
      try {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log(`Generated room ID: ${roomId}`);

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

        console.log(`Room ${roomId} created, sending callback and room update`);

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
          isReady: true,
          isConnected: true,
        };

        const success = RoomManager.addPlayerToRoom(roomId, player);
        if (success) {
          socket.join(roomId);
          const room = RoomManager.getRoom(roomId);
          io.to(roomId).emit("roomUpdated", room); // Broadcast to all in room
          callback(true);
        } else {
          callback(false);
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
    socket.on("playCard", (roomId, cardId) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (!room || room.gameState.status !== "in-progress") return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player || room.currentPlayer !== player.seat) {
          // It's not this player's turn
          return socket.emit("error", "It's not your turn.");
        }

        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) {
          return socket.emit("error", "Invalid card played.");
        }

        const playedCard = player.hand.splice(cardIndex, 1)[0];

        // --- Dehla Pakad Logic ---
        const trick = room.currentTrick;
        const leadCard = trick.length > 0 ? trick[0].card : null;

        // Check if the player followed suit
        let followedSuit = true;
        if (leadCard && playedCard.suit !== leadCard.suit) {
          if (player.hand.some((c) => c.suit === leadCard.suit)) {
            // Player had a card of the lead suit but didn't play it
            player.hand.push(playedCard); // Return card to hand
            return socket.emit(
              "error",
              `You must follow the lead suit: ${leadCard.suit}`
            );
          }
          followedSuit = false;
        }

        trick.push({ card: playedCard, seat: player.seat });

        // Reveal trump if not set and player didn't follow suit
        if (!room.gameState.trump && !followedSuit) {
          room.gameState.trump = playedCard.suit;
          io.to(roomId).emit("trumpRevealed", room.gameState.trump);

          // Deal remaining 8 cards
          const deck = createDeck(true); // Create a shuffled deck
          const dealtCards = new Set(
            room.players.flatMap((p) => p.hand.map((c) => c.id))
          );
          const remainingDeck = deck.filter((c) => !dealtCards.has(c.id));

          room.players.forEach((p) => {
            p.hand.push(...remainingDeck.splice(0, 8));
          });
        }

        // Move to next player
        room.currentPlayer = (player.seat % 4) + 1;

        // Check if trick is complete
        if (trick.length === 4) {
          // Determine trick winner (simplified for now)
          const trickWinnerSeat = determineTrickWinner(
            trick,
            room.gameState.trump
          );
          const trickWinner = room.players.find(
            (p) => p.seat === trickWinnerSeat
          );

          if (trickWinner) {
            room.tricks.push({ winner: trickWinnerSeat, cards: [...trick] });
            room.currentPlayer = trickWinnerSeat;

            // Check for 2 consecutive wins
            if (room.gameState.lastTrickWinner === trickWinnerSeat) {
              trickWinner.capturedTricks.push(...room.tricks);
              room.tricks = [];
            } else {
              trickWinner.capturedTricks.push(room.tricks.pop());
            }
            room.gameState.lastTrickWinner = trickWinnerSeat;
          }

          room.currentTrick = []; // Clear trick

          // Check for end of round (13 tricks played)
          if (room.players.every((p) => p.hand.length === 0)) {
            // End of round logic
            const scores = calculateScores(room.players);
            const kot = checkForKot(scores);
            io.to(roomId).emit("gameFinished", { scores, kot });
            RoomManager.resetRoomForNewRound(roomId);
          }
        }

        io.to(roomId).emit("roomUpdated", room);
      } catch (error) {
        console.error(`Error playing card in room ${roomId}:`, error);
        socket.emit("error", "An error occurred while playing your card.");
      }
    });

    // Handle starting the game
    socket.on("startGame", (roomId) => {
      try {
        const room = RoomManager.getRoom(roomId);
        if (
          room &&
          room.players.find((p) => p.id === socket.id) &&
          room.players.length === 4 &&
          !room.gameStarted
        ) {
          // Set dealer and dealing state
          RoomManager.setDealer(roomId, room.currentPlayer || 1);
          RoomManager.setDealing(roomId, true);

          const deck = createDeck();

          // Animate dealing: deal cards one by one with delay
          let dealIndex = 0;
          const dealCards = () => {
            if (dealIndex < 5) {
              room.players.forEach((player) => {
                player.hand.push(deck.shift());
              });
              RoomManager.updateRoom(roomId, room);
              io.to(roomId).emit("roomUpdated", room);
              dealIndex++;
              setTimeout(dealCards, 300); // 300ms per card
            } else {
              // Finish dealing
              room.gameStarted = true;
              room.gameState.status = "in-progress";
              room.currentPlayer = room.players[0].seat; // Start with seat 1
              room.deck = deck; // Store remaining deck
              RoomManager.setDealing(roomId, false);
              RoomManager.updateRoom(roomId, room);
              io.to(roomId).emit("gameStarted", room);
              io.to(roomId).emit("roomUpdated", room);
            }
          };
          // Start dealing animation
          dealCards();
        } else {
          socket.emit("error", "Cannot start game.");
        }
      } catch (error) {
        console.error(`Error starting game in room ${roomId}:`, error);
        socket.emit("error", "An error occurred while starting the game.");
      }
    });

    // Handle room list requests
    socket.on("getRooms", () => {
      const roomsList = RoomManager.getRoomsList();
      socket.emit("roomsList", roomsList);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Give a grace period for reconnection, e.g., 5 seconds
      setTimeout(() => {
        const room = RoomManager.getRoomByPlayerId(socket.id);
        if (room) {
          // Check if the player has reconnected with a new socket ID
          const player = room.players.find((p) => p.id === socket.id);
          if (player && !player.isConnected) {
            console.log(
              `Player ${player.name} did not reconnect in time. Removing.`
            );
            RoomManager.removePlayerFromRoom(room.id, socket.id);
            const updatedRoom = RoomManager.getRoom(room.id);
            if (updatedRoom) {
              io.to(room.id).emit("roomUpdated", updatedRoom);
            }
          }
        }
      }, 5000); // 5-second grace period
    });
  });

  // Emit updated room list to all clients in the lobby every 5 seconds
  setInterval(() => {
    const roomsList = RoomManager.getRoomsList();
    io.emit("roomsList", roomsList);
  }, 5000);

  return io;
}
