import { BotEngine } from "./botEngine.js";
import { RoomManager } from "./roomManager.js";
import { determineTrickWinner } from "./gameLogic.js";
import metrics from "./metrics.js";
import { GameEventManager, GameEventTypes } from "./gameEventManager.js";

export class BotManager {
  static botPlayers = new Map(); // Track bot players by room
  static emitRoomUpdateFn = null; // Store reference to debounced room update function

  // Set the debounced room update function
  static setEmitRoomUpdateFunction(emitRoomUpdateFn) {
    this.emitRoomUpdateFn = emitRoomUpdateFn;
  }

  // Add a single bot to a specific seat
  static addBotToSeat(roomId, room, seat, difficulty = "medium") {
    // Check if seat is already occupied
    const occupiedSeats = room.players.map((p) => p.seat);
    if (occupiedSeats.includes(seat)) {
      return null;
    }

    // Create bot for the specific seat
    const bot = BotEngine.createBot(seat, difficulty);
    room.players.push(bot);

    // Add to bot tracking
    const existingBots = this.botPlayers.get(roomId) || [];
    existingBots.push(bot);
    this.botPlayers.set(roomId, existingBots);

    return bot;
  }

  // Add bots to fill empty seats in a room (for backward compatibility)
  static addBotsToRoom(roomId, room, difficulty = "medium") {
    const bots = [];

    // Ensure room.players exists and is an array
    if (!room || !Array.isArray(room.players)) {
      console.error("Invalid room or room.players in addBotsToRoom:", {
        roomId,
        room,
      });
      return bots;
    }

    const occupiedSeats = room.players.map((p) => p.seat);

    // Find empty seats and add bots
    for (let seat = 1; seat <= 4; seat++) {
      if (!occupiedSeats.includes(seat)) {
        const bot = this.addBotToSeat(roomId, room, seat, difficulty);
        if (bot) bots.push(bot);
      }
    }

    return bots;
  }

  // Remove bots from a room
  static removeBotsFromRoom(roomId) {
    const bots = this.botPlayers.get(roomId);
    if (bots) {
      this.botPlayers.delete(roomId);
    }
    return bots || [];
  }

  // Make all bots in a room ready
  static makeBotsReady(roomId) {
    const bots = this.botPlayers.get(roomId);
    if (bots) {
      bots.forEach((bot) => {
        bot.isReady = true;
      });
    }
  }

  // Get bot players for a room
  static getBotsInRoom(roomId) {
    return this.botPlayers.get(roomId) || [];
  }

  // Check if a player is a bot
  static isBot(player) {
    return player && player.isBot === true;
  }

  // Get bot by seat in a room
  static getBotBySeat(roomId, seat) {
    const bots = this.getBotsInRoom(roomId);
    return bots.find((bot) => bot.seat === seat);
  }

  // Check if remaining cards need to be dealt and deal them
  static checkAndDealRemainingCards(roomId, room, io) {
    // If trump was set during this trick, deal remaining cards
    if (room.trumpSetThisTrick) {
      room.trumpSetThisTrick = false;
      if (room.deck && room.deck.length > 0) {
        this.dealRemainingCards(roomId, room, io);
        return true; // Indicates dealing is in progress
      }
    }

    // If 5 tricks have been completed and trump is not set, deal remaining cards
    if (
      !room.gameState.trump &&
      room.gameState.totalTricksCompleted === 5 &&
      room.deck &&
      room.deck.length > 0
    ) {
      this.dealRemainingCards(roomId, room, io);
      return true; // Indicates dealing is in progress
    }

    return false; // No dealing needed
  }

  // Deal remaining 32 cards to all players (8 cards each) using optimized dealing
  static dealRemainingCards(roomId, room, io) {
    // Prevent multiple simultaneous dealing operations
    if (room.isCurrentlyDealing) {
      return;
    }

    const deck = [...room.deck];

    if (!deck || deck.length === 0) {
      return;
    }

    room.deck = []; // Clear deck as we'll distribute all remaining cards
    room.isCurrentlyDealing = true; // Set dealing guard

    // Set dealing state to true for animation
    RoomManager.setDealing(roomId, true);

    // Get dealing order (clockwise from dealer, not current player)
    const getDealingOrder = () => {
      // Use dealer seat if available, otherwise start from seat 1
      const dealerSeat = room.dealerSeat || 1;
      const order = [];
      for (let i = 1; i <= 4; i++) {
        const seat = (dealerSeat % 4) + i; // Start from next seat clockwise
        const adjustedSeat = seat > 4 ? seat - 4 : seat;
        order.push(adjustedSeat);
      }
      return order;
    };

    const dealingOrder = getDealingOrder();
    let dealCount = 0;
    const cardsPerPlayer = 8;
    const totalCards = cardsPerPlayer * dealingOrder.length;

    const dealNext = () => {
      if (dealCount >= totalCards) {
        // Finished dealing remaining cards

        // Clear dealing guards
        room.isCurrentlyDealing = false;

        // Set dealing state back to false
        RoomManager.setDealing(roomId, false);

        // Final update and continue with next turn
        RoomManager.updateRoom(roomId, room);

        if (this.emitRoomUpdateFn) {
          this.emitRoomUpdateFn(roomId, io, 100);
        } else {
          io.to(roomId).emit("roomUpdated", room);
        }

        // Handle next turn after dealing is complete
        setTimeout(() => {
          this.handleTurn(roomId, room, io);
        }, 500);

        return;
      }

      const currentSeat = dealingOrder[dealCount % dealingOrder.length];
      const player = room.players.find((p) => p.seat === currentSeat);

      if (player && deck.length > 0) {
        const cardToAdd = deck.shift();
        player.hand.push(cardToAdd);

        // Emit card dealt event for remaining cards using the same event system as initial dealing
        GameEventManager.emitToRoom(
          io,
          roomId,
          GameEventTypes.CARDS_DEALT_INITIAL,
          {
            playerId: player.id,
            playerSeat: player.seat,
            playerName: player.name,
            cards: [cardToAdd],
            dealingRound: Math.floor(dealCount / dealingOrder.length) + 1,
            totalCardsDealt: player.hand.length,
            cardsPerPlayerThisPhase: cardsPerPlayer,
            dealingPhase: "final",
          }
        );
      }

      // Update bot hands tracking
      this.updateBotHands(roomId, room);

      // Update room and broadcast every few cards to avoid spam
      if (dealCount % 4 === 0 || dealCount >= totalCards - 1) {
        RoomManager.updateRoomState(roomId, room);
        if (this.emitRoomUpdateFn) {
          this.emitRoomUpdateFn(roomId, io, 100);
        } else {
          io.to(roomId).emit("roomUpdated", room);
        }
      }

      dealCount++;
      setTimeout(dealNext, 200); // Match timing with initial dealing (200ms)
    };

    dealNext();
  }

  // Helper function to update room, broadcast, and handle turn
  static updateRoomAndHandleTurn(roomId, room, io) {
    // Update room in RoomManager
    RoomManager.updateRoom(roomId, room);

    // Broadcast to all clients
    io.to(roomId).emit("roomUpdated", room);

    // Handle turn if game is in progress
    if (room && room.gameState.status === "in-progress" && room.currentPlayer) {
      // Use a small delay to ensure the UI updates before next turn
      setTimeout(() => {
        this.handleTurn(roomId, room, io);
      }, 500);
    }
  }

  // Simplified turn handler - treats bots and humans the same
  static async handleTurn(roomId, room, io) {
    // Always get the latest room state to avoid race conditions
    const latestRoom = await RoomManager.getRoom(roomId);
    if (!latestRoom) {
      return;
    }

    // Validate that the game is still in progress
    if (latestRoom.gameState?.status !== "in-progress") {
      return;
    }

    // Validate that it's actually this player's turn
    if (!latestRoom.currentPlayer) {
      return;
    }

    // Find the current player
    const currentPlayer = latestRoom.players.find(
      (p) => p.seat === latestRoom.currentPlayer
    );

    if (!currentPlayer) {
      return;
    }

    // CRITICAL: Check if player has cards before trying to make them play
    if (!currentPlayer.hand || currentPlayer.hand.length === 0) {
      console.error(
        `Player ${currentPlayer.name} has no cards in hand - cannot take turn`
      );
      return;
    }

    // If it's a bot's turn, automatically make them play
    if (this.isBot(currentPlayer)) {
      // Prevent multiple simultaneous plays by checking thinking state
      if (currentPlayer.isThinking) {
        return;
      }

      // Make the bot play automatically after a short delay
      this.makeAutomaticBotPlay(roomId, currentPlayer, io);
    }
    // Human player's turn - just wait for them to play
  }

  // Make a bot play automatically when it's their turn
  static makeAutomaticBotPlay(roomId, currentPlayer, io) {
    // Prevent multiple simultaneous plays
    if (currentPlayer.isThinking || currentPlayer.isPlaying) {
      console.log(
        `Bot ${currentPlayer.name} is already thinking/playing, skipping`
      );
      return;
    }

    // Set thinking flag to prevent concurrent plays
    currentPlayer.isThinking = true;

    // Add a delay to make bot play feel natural
    setTimeout(async () => {
      try {
        const room = await RoomManager.getRoom(roomId);
        if (!room) {
          currentPlayer.isThinking = false;
          return;
        }

        // Double-check that it's still this bot's turn
        if (room.currentPlayer !== currentPlayer.seat) {
          console.log(
            `Bot ${currentPlayer.name} is no longer the current player`
          );
          currentPlayer.isThinking = false;
          return;
        }

        // CRITICAL: Check if bot has any cards in hand
        if (!currentPlayer.hand || currentPlayer.hand.length === 0) {
          console.error(`Bot ${currentPlayer.name} has no cards in hand`);
          currentPlayer.isThinking = false;
          return;
        }

        // ADDITIONAL: Ensure game is still in progress
        if (room.gameState.status !== "in-progress") {
          console.log(
            `Game not in progress, bot ${currentPlayer.name} cannot play`
          );
          currentPlayer.isThinking = false;
          return;
        }

        // RACE CONDITION CHECK: Make sure bot isn't already playing
        if (currentPlayer.isPlaying) {
          console.log(`Bot ${currentPlayer.name} is already playing a card`);
          currentPlayer.isThinking = false;
          return;
        }

        // Let the bot choose a card
        const chosenCard = BotEngine.chooseCard(
          currentPlayer,
          room.gameState,
          room.currentTrick || [],
          currentPlayer.difficulty
        );

        if (!chosenCard) {
          console.error(`Bot ${currentPlayer.name} could not choose a card`);
          currentPlayer.isThinking = false;
          return;
        }

        // ADDITIONAL VALIDATION: Ensure bot's chosen card follows suit rules
        const leadSuit =
          room.currentTrick.length > 0 ? room.currentTrick[0].card.suit : null;
        if (leadSuit && chosenCard.suit !== leadSuit) {
          // Check if bot has cards of the lead suit
          const hasLeadSuit = currentPlayer.hand.some(
            (card) => card.suit === leadSuit
          );
          if (hasLeadSuit) {
            console.error(
              `Bot ${currentPlayer.name} chose invalid card ${chosenCard.rank} of ${chosenCard.suit} when must follow ${leadSuit}!`
            );
            currentPlayer.isThinking = false;
            return; // Don't allow invalid moves
          }
        }

        // Track bot action metric
        metrics.incrementBotActions();

        // Final check before playing
        if (room.currentPlayer !== currentPlayer.seat) {
          console.log(
            `Bot ${currentPlayer.name} turn changed during card selection`
          );
          currentPlayer.isThinking = false;
          return;
        }

        // Now simulate the same card play that a human would do
        // This uses the exact same logic as the human playCard handler
        await this.simulateCardPlay(roomId, currentPlayer, chosenCard, io);
      } catch (error) {
        console.error(
          `Error in automatic bot play for ${currentPlayer.name}:`,
          error
        );
        currentPlayer.isThinking = false;
      }
    }, 1200 + Math.random() * 800); // 1.2-2.0 second delay (increased)
  }

  // Simulate a card play exactly like a human would do it
  static async simulateCardPlay(roomId, player, chosenCard, io) {
    // Clear thinking flag
    player.isThinking = false;

    // Get the room
    const room = await RoomManager.getRoom(roomId);
    if (!room) {
      return;
    }

    // Find the card index in player's hand
    const cardIndex = player.hand.findIndex(
      (c) => c.suit === chosenCard.suit && c.rank === chosenCard.rank
    );

    if (cardIndex === -1) {
      console.error(
        `Bot ${player.name} tried to play a card not in their hand`
      );
      return;
    }

    // Use the same card play logic as humans
    this.processCardPlay(room, player, chosenCard, cardIndex, roomId, io);
  }

  // Shared card play processing logic for both humans and bots
  static processCardPlay(
    room,
    player,
    playedCard,
    cardIndex,
    roomId,
    io,
    socket = null
  ) {
    // CRITICAL: Prevent multiple card plays from the same player
    if (player.isPlaying) {
      console.log(
        `Player ${player.name} is already playing a card, ignoring duplicate`
      );
      return;
    }

    // Set playing flag to prevent race conditions
    player.isPlaying = true;

    // Clear thinking flag for bots
    if (this.isBot(player)) {
      player.isThinking = false;
    }

    try {
      // --- DEHLA PAKAD GAME LOGIC (Strict Suit Following & Trump Setting) ---
      const leadSuit =
        room.currentTrick.length > 0 ? room.currentTrick[0].card.suit : null;

      if (leadSuit && playedCard.suit !== leadSuit) {
        // Check if player has cards of the lead suit
        const hasLeadSuit = player.hand.some((card) => card.suit === leadSuit);
        if (hasLeadSuit) {
          // Invalid play for humans - throw error to be caught by caller
          if (socket) {
            player.isPlaying = false; // Clear flag on error
            socket.emit("error", `You must follow the suit: ${leadSuit}`);
            return;
          } else {
            // console.error(
            //   `Bot ${player.name} tried to play invalid card - must follow suit ${leadSuit}`
            // );
            player.isPlaying = false; // Clear flag on error
            return; // Bot shouldn't make invalid moves
          }
        } else {
          // This is a valid off-suit play. If trump isn't set, this card sets it.
          if (!room.gameState.trump) {
            room.gameState.trump = playedCard.suit;
            room.gameState.trumpJustSet = true; // For animation
            room.trumpSetThisTrick = true; // Track for dealing logic

            // Emit trump set event alongside existing logic
            GameEventManager.emitToRoom(io, roomId, GameEventTypes.TRUMP_SET, {
              trumpSuit: playedCard.suit,
              setByPlayer: player.seat,
              setByPlayerName: player.name,
              triggerCard: playedCard.id,
              trickNumber: room.gameState.totalTricksCompleted + 1,
            });

            // Show the trump announcement for 2 seconds, then clear flag
            setTimeout(() => {
              room.gameState.trumpJustSet = false;
              RoomManager.updateRoom(roomId, room);
              io.to(roomId).emit("roomUpdated", room);
            }, 2000);
          }
        }
      }
      // --- END OF GAME LOGIC ---

      // Remove the card from player's hand
      player.hand.splice(cardIndex, 1);

      // Add the played card to the current trick
      room.currentTrick.push({ card: playedCard, seat: player.seat });

      // Move to next player immediately
      room.currentPlayer = (player.seat % 4) + 1;

      // Update room and broadcast using debounced function
      RoomManager.updateRoom(roomId, room);

      // Use stored emitRoomUpdate function if available, otherwise direct emit
      if (
        this.emitRoomUpdateFn &&
        typeof this.emitRoomUpdateFn === "function"
      ) {
        this.emitRoomUpdateFn(roomId, io, 100);
      } else {
        io.to(roomId).emit("roomUpdated", room);
      }

      // If trick is complete (4 cards), handle trick completion
      if (room.currentTrick.length === 4) {
        // Clear all players' playing flags
        room.players.forEach((p) => (p.isPlaying = false));
        this.processTrickCompletion(room, roomId, io);
      } else {
        // Clear the current player's playing flag
        player.isPlaying = false;

        // Continue with next player's turn after a longer delay to prevent race conditions
        setTimeout(() => {
          this.handleTurn(roomId, room, io);
        }, 800); // Increased delay from 500ms to 800ms
      }
    } catch {
      player.isPlaying = false; // Clear flag on error
      if (this.isBot(player)) {
        player.isThinking = false;
      }
    }
  }

  // Handle trick completion (shared by both humans and bots)
  static processTrickCompletion(room, roomId, io) {
    // Increment total tricks completed counter
    if (!room.gameState.totalTricksCompleted) {
      room.gameState.totalTricksCompleted = 0;
    }
    room.gameState.totalTricksCompleted += 1;

    const trickWinnerSeat = determineTrickWinner(
      room.currentTrick,
      room.gameState.trump
    );

    const completedTrick = {
      winner: trickWinnerSeat,
      cards: [...room.currentTrick],
    };

    // Emit trick completion event
    GameEventManager.emitToRoom(io, roomId, "TRICK_COMPLETED", {
      trickNumber: room.gameState.totalTricksCompleted,
      winner: trickWinnerSeat,
      winnerName:
        room.players.find((p) => p.seat === trickWinnerSeat)?.name || "Unknown",
      cards: completedTrick.cards,
      totalPoints: completedTrick.cards.filter((c) => c.card.rank === "10")
        .length,
    });

    // Check if this is the last trick of the game (13 total tricks)
    const isLastTrick = room.gameState.totalTricksCompleted === 13;

    if (trickWinnerSeat === room.gameState.lastTrickWinnerSeat || isLastTrick) {
      // Consecutive win OR last trick: Collect the stack

      // IMPORTANT: Set collecting flag to prevent premature card plays
      room.gameState.isCollectingStack = true;

      // Phase 1: Add current trick to stack for visual effect
      room.stackedTricks.push(completedTrick);

      // Update room immediately to show the trick being added to stack
      RoomManager.updateRoom(roomId, room);
      io.to(roomId).emit("roomUpdated", room);

      // Phase 2: Wait then clear the current trick (make played cards disappear)
      setTimeout(() => {
        room.currentTrick = []; // Clear played cards from the table

        // Update room to show cards disappeared
        RoomManager.updateRoom(roomId, room);
        io.to(roomId).emit("roomUpdated", room);

        // Phase 3: Wait then collect the entire stack
        setTimeout(() => {
          const winnerTeam =
            trickWinnerSeat === 1 || trickWinnerSeat === 3 ? "team1" : "team2";
          const tricksToAward = [...room.stackedTricks]; // All stacked tricks

          // Count tens captured in this stack collection
          let tensCount = 0;
          tricksToAward.forEach((trick) => {
            trick.cards.forEach((c) => {
              if (c.card.rank === "10") {
                tensCount += 1;
              }
            });
          });

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

          // Emit ten capture event if any tens were captured
          if (tensCount > 0) {
            io.to(roomId).emit("tenCaptured", {
              winnerTeam: winnerTeam,
              tensCount: tensCount,
              playerSeat: trickWinnerSeat,
            });
          }

          room.stackedTricks = []; // Clear the stack after collection
          room.gameState.lastTrickWinnerSeat = null; // Reset for next stack

          // IMPORTANT: Set the next player and clear collecting flag together
          room.currentPlayer = trickWinnerSeat; // Set next player
          room.gameState.isCollectingStack = false; // Allow card plays again

          // Update room after stack collection
          RoomManager.updateRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", room);

          // Phase 4: Handle endgame or continue
          setTimeout(() => {
            // Handle end of game
            if (isLastTrick) {
              // ...existing endgame code...
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
              // console.log("Game finished");

              // Emit game end event
              GameEventManager.emitToRoom(io, roomId, "GAME_ENDED", {
                winner:
                  room.gameState.kot === 1
                    ? "team1"
                    : room.gameState.kot === 2
                    ? "team2"
                    : "none",
                isDraw: room.gameState.draw,
                isKot: Boolean(room.gameState.kot),
                finalScores: {
                  team1: {
                    tens: room.gameState.scores.team1.tens,
                    tricks: room.gameState.scores.team1.tricks,
                  },
                  team2: {
                    tens: room.gameState.scores.team2.tens,
                    tricks: room.gameState.scores.team2.tricks,
                  },
                },
                totalTricks: room.gameState.totalTricksCompleted,
              });

              // Track game completion metric
              metrics.incrementGamesCompleted();

              // Remove all bots from the room after game completion
              const bots = this.getBotsInRoom(roomId);
              if (bots.length > 0) {
                bots.forEach((bot) => {
                  // Remove bot from room.players
                  const botIndex = room.players.findIndex(
                    (p) => p.id === bot.id
                  );
                  if (botIndex !== -1) {
                    room.players.splice(botIndex, 1);
                  }
                });

                // Clean up bot tracking
                this.removeBotsFromRoom(roomId);
              }

              // Final update will be sent, no further actions needed here
            }

            // Check if we need to deal remaining cards
            const shouldDealRemainingCards = this.checkAndDealRemainingCards(
              roomId,
              room,
              io
            );

            if (!shouldDealRemainingCards) {
              // Update room and continue game
              RoomManager.updateRoom(roomId, room);
              io.to(roomId).emit("roomUpdated", room);

              // Handle next turn
              setTimeout(() => {
                this.handleTurn(roomId, room, io);
              }, 500);
            }
          }, 300); // Brief pause after stack collection
        }, 1000); // 1 second delay to show stack collection after cards disappeared
      }, 1500); // 1.5 second delay to let cards disappear from play area
    } else {
      // Not a consecutive win: Add to stack
      room.stackedTricks.push(completedTrick);
      room.gameState.lastTrickWinnerSeat = trickWinnerSeat;

      // Wait before clearing the trick and setting next player
      setTimeout(() => {
        room.currentTrick = [];
        // Set next player immediately for non-consecutive wins (no collection delay)
        room.currentPlayer = trickWinnerSeat;

        // Check if we need to deal remaining cards
        const shouldDealRemainingCards = this.checkAndDealRemainingCards(
          roomId,
          room,
          io
        );

        if (!shouldDealRemainingCards) {
          // Update room and continue game
          RoomManager.updateRoom(roomId, room);
          io.to(roomId).emit("roomUpdated", room);

          // Handle next turn
          setTimeout(() => {
            this.handleTurn(roomId, room, io);
          }, 500);
        }
      }, 3000); // 3 second delay to show completed trick and allow card animations to finish
    }
  }

  // Update bot hands when cards are dealt
  static updateBotHands(roomId, room) {
    const bots = this.getBotsInRoom(roomId);
    bots.forEach((bot) => {
      // Find the bot in the room's player list and update their hand
      const roomBot = room.players.find((p) => p.id === bot.id);
      if (roomBot) {
        bot.hand = [...roomBot.hand];
        // Also sync other important properties
        bot.isReady = roomBot.isReady;
        // Make sure the thinking flag is properly synced
        if (!roomBot.isThinking) {
          bot.isThinking = false;
        }
      }
    });
  }

  // Clean up bots when room is deleted
  static cleanupRoom(roomId) {
    this.removeBotsFromRoom(roomId);

    // Clear used bot names when room is cleaned up
    // This allows the same bot names to be reused in new rooms
    BotEngine.usedBotNames.clear();
  }
}
