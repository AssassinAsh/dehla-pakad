import { BotEngine } from "./botEngine.js";
import { RoomManager } from "./roomManager.js";
import { determineTrickWinner } from "./gameLogic.js";
import metrics from "./metrics.js";

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
        console.log("Dealing remaining cards after trump set in trick...");
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
      console.log(
        "5 tricks completed, trump not set, dealing remaining cards..."
      );
      this.dealRemainingCards(roomId, room, io);
      return true; // Indicates dealing is in progress
    }

    return false; // No dealing needed
  }

  // Deal remaining cards to all players
  static dealRemainingCards(roomId, room, io) {
    const deck = [...room.deck];
    room.deck = [];

    const dealCards = () => {
      if (deck.length > 0) {
        // Deal one card to each player per iteration
        for (let i = 0; i < room.players.length; i++) {
          if (deck.length > 0) {
            const player = room.players[i];
            player.hand.push(deck.shift());
          }
        }

        // Update bot hands tracking
        this.updateBotHands(roomId, room);

        // Update room and broadcast
        RoomManager.updateRoom(roomId, room);
        if (this.emitRoomUpdateFn) {
          this.emitRoomUpdateFn(roomId, io, 100);
        } else {
          io.to(roomId).emit("roomUpdated", room);
        }

        // Continue dealing after a short delay
        setTimeout(dealCards, 300);
      } else {
        console.log("Finished dealing remaining cards.");

        // VALIDATION: Ensure all players have cards before continuing
        const playersWithoutCards = room.players.filter(
          (p) => !p.hand || p.hand.length === 0
        );
        if (playersWithoutCards.length > 0) {
          console.error(
            "Error: Some players have no cards after dealing!",
            playersWithoutCards.map((p) => p.name)
          );
          return; // Don't continue the game if players have no cards
        }

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
      }
    };

    dealCards();
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
  static handleTurn(roomId, room, io) {
    // Always get the latest room state to avoid race conditions
    const latestRoom = RoomManager.getRoom(roomId);
    if (!latestRoom) {
      return;
    }

    // Validate that the game is still in progress
    if (latestRoom.gameState.status !== "in-progress") {
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
    setTimeout(() => {
      try {
        const room = RoomManager.getRoom(roomId);
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
        this.simulateCardPlay(roomId, currentPlayer, chosenCard, io);
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
  static simulateCardPlay(roomId, player, chosenCard, io) {
    // Clear thinking flag
    player.isThinking = false;

    // Get the room
    const room = RoomManager.getRoom(roomId);
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
          // Invalid play for humans - send error. For bots, this shouldn't happen
          if (socket) {
            player.isPlaying = false; // Clear flag on error
            return socket.emit(
              "error",
              `You must follow the suit: ${leadSuit}`
            );
          } else {
            console.error(
              `Bot ${player.name} tried to play invalid card - must follow suit ${leadSuit}`
            );
            player.isPlaying = false; // Clear flag on error
            return; // Bot shouldn't make invalid moves
          }
        } else {
          // This is a valid off-suit play. If trump isn't set, this card sets it.
          if (!room.gameState.trump) {
            room.gameState.trump = playedCard.suit;
            room.gameState.trumpJustSet = true; // For animation
            room.trumpSetThisTrick = true; // Track for dealing logic

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
    } catch (error) {
      console.error(`Error in processCardPlay for ${player.name}:`, error);
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

    // Check if this is the last trick of the game (13 total tricks)
    const isLastTrick = room.gameState.totalTricksCompleted === 13;

    if (trickWinnerSeat === room.gameState.lastTrickWinnerSeat || isLastTrick) {
      // Consecutive win OR last trick: Collect the stack

      const winnerTeam =
        trickWinnerSeat === 1 || trickWinnerSeat === 3 ? "team1" : "team2";
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

      room.stackedTricks.push(completedTrick);
      room.gameState.lastTrickWinnerSeat = trickWinnerSeat;
    }

    // Wait before clearing the trick and setting next player
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
        console.log("Game finished");

        // Track game completion metric
        metrics.incrementGamesCompleted();

        // Remove all bots from the room after game completion
        const bots = this.getBotsInRoom(roomId);
        if (bots.length > 0) {
          bots.forEach((bot) => {
            // Remove bot from room.players
            const botIndex = room.players.findIndex((p) => p.id === bot.id);
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
    }, 2000); // 2 second delay to show completed trick
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
