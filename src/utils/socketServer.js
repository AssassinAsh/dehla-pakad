import { Server } from "socket.io";
import { RoomManager } from "./roomManager.js";
import { createDeck, determineTrickWinner } from "./gameLogic.js";

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
          console.log("Invalid room state for playing card");
          return socket.emit("error", "Cannot play card: game not in progress");
        }

        // Find player by name, as socket.id can change on reconnect
        const player = room.players.find((p) => p.name === playerName);
        if (!player) {
          console.log(
            `Player not found by name: ${playerName} in room ${roomId}`
          );
          return socket.emit("error", "Player not found.");
        }

        // Optional: Update socket.id if it's different (handles reconnection)
        if (player.id !== socket.id) {
          console.log(
            `Updating socket ID for ${playerName} from ${player.id} to ${socket.id}`
          );
          player.id = socket.id;
        }

        if (room.currentPlayer !== player.seat) {
          console.log("Not player's turn:", player.seat, room.currentPlayer);
          return socket.emit("error", "It's not your turn.");
        }

        const cardIndex = player.hand.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) {
          console.log("Invalid card played:", cardId);
          return socket.emit("error", "Invalid card played.");
        }

        const playedCard = player.hand[cardIndex];

        // --- DEHLA PAKAD GAME LOGIC (Strict Suit Following & Trump Setting) ---
        const leadSuit =
          room.currentTrick.length > 0 ? room.currentTrick[0].card.suit : null;

        if (leadSuit) {
          // A lead suit exists for this trick.
          if (playedCard.suit !== leadSuit) {
            // Player is trying to play an off-suit card.
            // Check if they have any card of the lead suit.
            const hasLeadSuit = player.hand.some((c) => c.suit === leadSuit);
            if (hasLeadSuit) {
              // If they have a card of the lead suit, they MUST play it.
              console.log(
                `Player ${player.seat} illegally played ${playedCard.id}. Must follow suit ${leadSuit}.`
              );
              return socket.emit(
                "error",
                `You must follow the suit: ${leadSuit}`
              );
            }
            // This is a valid off-suit play. If trump isn't set, this card sets it.
            if (!room.gameState.trump) {
              room.gameState.trump = playedCard.suit;
              room.gameState.trumpJustSet = true; // For animation
              room.trumpSetThisTrick = true; // Track for dealing logic
              console.log(
                `Trump suit has been set to: ${room.gameState.trump}`
              );

              // Show the trump announcement for a few seconds, then clear flag
              setTimeout(() => {
                room.gameState.trumpJustSet = false;
                RoomManager.updateRoom(roomId, room);
                io.to(roomId).emit("roomUpdated", room);
              }, 5000); // Show for 5 seconds
            }
          }
        }
        // --- END OF GAME LOGIC ---

        // Remove the card from player's hand
        player.hand.splice(cardIndex, 1);
        console.log(`Player ${player.seat} played card:`, playedCard);

        // Add the played card to the current trick
        room.currentTrick.push({ card: playedCard, seat: player.seat });

        // Move to next player immediately
        room.currentPlayer = (player.seat % 4) + 1;

        // Broadcast the updated state to all players
        RoomManager.updateRoom(roomId, room);
        io.to(roomId).emit("roomUpdated", room); // Use roomUpdated for consistency

        // If trick is complete (4 cards), handle trick completion
        if (room.currentTrick.length === 4) {
          const trickWinnerSeat = determineTrickWinner(
            room.currentTrick,
            room.gameState.trump
          );
          console.log("Trick completed, winner:", trickWinnerSeat);

          const completedTrick = {
            winner: trickWinnerSeat,
            cards: [...room.currentTrick],
          };

          // --- NEW RULE: CONSECUTIVE WINS ---
          // Check if this is the last trick of the game (13 total tricks)
          const isLastTrick =
            room.tricks.length + room.stackedTricks.length === 12;

          if (
            trickWinnerSeat === room.gameState.lastTrickWinnerSeat ||
            isLastTrick
          ) {
            // Consecutive win OR last trick: Collect the stack
            console.log(
              `Player ${trickWinnerSeat} wins the stack. Consecutive: ${
                trickWinnerSeat === room.gameState.lastTrickWinnerSeat
              }, Last Trick: ${isLastTrick}`
            );

            const winnerTeam =
              trickWinnerSeat === 1 || trickWinnerSeat === 3
                ? "team1"
                : "team2";
            const tricksToAward = [...room.stackedTricks, completedTrick];

            // Add to team's captured tricks
            room.tricks.push(...tricksToAward);

            // Update scores
            tricksToAward.forEach((trick) => {
              room.gameState.scores[winnerTeam].tricks += 1;
              trick.cards.forEach((c) => {
                if (c.card.rank === "10") {
                  room.gameState.scores[winnerTeam].tens += 1;
                }
              });
            });

            room.stackedTricks = []; // Clear the stack
            room.gameState.lastTrickWinnerSeat = null; // Reset for next stack
          } else {
            // Not a consecutive win: Add to stack
            console.log(
              `Player ${trickWinnerSeat} wins trick, but not stack. Stacking.`
            );
            room.stackedTricks.push(completedTrick);
            room.gameState.lastTrickWinnerSeat = trickWinnerSeat;
          }
          // --- END OF NEW RULE ---

          // Wait before clearing the trick on the table
          setTimeout(() => {
            room.currentTrick = [];
            room.currentPlayer = trickWinnerSeat;

            // Handle end of game
            if (isLastTrick) {
              // Calculate Kot and draw
              const t1Tens = room.gameState.scores.team1.tens;
              const t2Tens = room.gameState.scores.team2.tens;
              const t1Tricks = room.gameState.scores.team1.tricks;
              const t2Tricks = room.gameState.scores.team2.tricks;
              // Kot: team 1 or 2 gets all 4 tens
              if (t1Tens === 4) room.gameState.kot = 1;
              else if (t2Tens === 4) room.gameState.kot = 2;
              // Draw: tens and tricks both tied
              else if (t1Tens === t2Tens && t1Tricks === t2Tricks)
                room.gameState.draw = true;
              else room.gameState.draw = false;
              room.gameState.status = "finished";
              console.log(
                "Game finished. Final Scores:",
                room.gameState.scores,
                "Kot:",
                room.gameState.kot,
                "Draw:",
                room.gameState.draw
              );
              // Final update will be sent, no further actions needed here
            }

            // If trump was set during this trick, deal remaining cards
            if (room.trumpSetThisTrick) {
              room.trumpSetThisTrick = false;
              if (room.deck && room.deck.length > 0) {
                console.log(
                  "Dealing remaining cards after trump set in trick..."
                );
                const deck = [...room.deck];
                room.deck = [];
                const dealRemainingCards = () => {
                  if (deck.length > 0) {
                    for (let i = 0; i < room.players.length; i++) {
                      if (deck.length > 0) {
                        const player = room.players[i];
                        player.hand.push(deck.shift());
                      }
                    }
                    RoomManager.updateRoom(roomId, room);
                    io.to(roomId).emit("roomUpdated", room);
                    setTimeout(dealRemainingCards, 300);
                  } else {
                    console.log("Finished dealing remaining cards.");
                    RoomManager.updateRoom(roomId, room);
                    io.to(roomId).emit("roomUpdated", room);
                  }
                };
                dealRemainingCards();
                return;
              }
            }

            // If all players have 0 cards in hand (after 5 cards played) and trump is not set, deal remaining cards
            const allHandsEmpty = room.players.every(
              (p) => p.hand.length === 0
            );
            if (
              !room.gameState.trump &&
              allHandsEmpty &&
              room.deck &&
              room.deck.length > 0
            ) {
              console.log(
                "All 5 cards played, trump not set, dealing remaining cards..."
              );
              const deck = [...room.deck];
              room.deck = [];
              const dealRemainingCards = () => {
                if (deck.length > 0) {
                  for (let i = 0; i < room.players.length; i++) {
                    if (deck.length > 0) {
                      const player = room.players[i];
                      player.hand.push(deck.shift());
                    }
                  }
                  RoomManager.updateRoom(roomId, room);
                  io.to(roomId).emit("roomUpdated", room);
                  setTimeout(dealRemainingCards, 300);
                } else {
                  console.log(
                    "Finished dealing remaining cards (no trump set)."
                  );
                  RoomManager.updateRoom(roomId, room);
                  io.to(roomId).emit("roomUpdated", room);
                }
              };
              dealRemainingCards();
              return;
            }

            // Update and broadcast the new state if not dealing
            RoomManager.updateRoom(roomId, room);
            io.to(roomId).emit("roomUpdated", room);
          }, 1500);
        }
      } catch (error) {
        console.error("Error playing card:", error);
        socket.emit("error", "Error playing card");
      }
    });

    // Handle starting the game
    socket.on("startGame", (roomId) => {
      try {
        const room = RoomManager.getRoom(roomId);

        // Only need 4 players who have all joined
        if (room && room.players.length === 4 && !room.gameStarted) {
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
        // If all 4 players have voted, reset the game
        if (replayVotes.size === 4) {
          // Reset game state
          RoomManager.clearReplayVotes(roomId);
          room.gameStarted = false;
          room.gameState = {
            status: "waiting",
            trump: null,
            trumpJustSet: false,
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
          room.currentPlayer = room.players[0].seat;
          RoomManager.updateRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", room);
          // Start new game automatically
          setTimeout(() => {
            io.to(roomId).emit("gameStarted", room);
            socket.emit("startGame", roomId);
          }, 1000);
        } else {
          // Notify clients how many are ready
          io.to(roomId).emit("replayVote", { count: replayVotes.size });
        }
      } catch (error) {
        console.error("Error handling playerReplay:", error);
      }
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
