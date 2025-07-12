// Bot engine for Dehla Pakad game
export class BotEngine {
  static DIFFICULTY_LEVELS = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
  };

  // Track used bot names to avoid duplicates
  static usedBotNames = new Set();

  // Generate a unique bot name
  static generateBotName() {
    const botNames = [
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
      "Echo",
      "Foxtrot",
      "Golf",
      "Hotel",
      "India",
      "Juliet",
      "Kilo",
      "Lima",
      "Mike",
      "November",
      "Oscar",
      "Papa",
      "Quebec",
      "Romeo",
      "Sierra",
      "Tango",
      "Uniform",
      "Victor",
      "Whiskey",
      "Xray",
    ];

    // Filter out already used names
    const availableNames = botNames.filter(
      (name) => !this.usedBotNames.has(name)
    );

    // If all names are used, clear the set and start over
    if (availableNames.length === 0) {
      this.usedBotNames.clear();
      return botNames[Math.floor(Math.random() * botNames.length)];
    }

    // Pick a random available name
    const selectedName =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    this.usedBotNames.add(selectedName);
    return selectedName;
  }

  // Choose a card to play based on difficulty and game state
  static chooseCard(player, gameState, currentTrick, difficulty = "medium") {
    const { hand, seat } = player;
    const { trump } = gameState;
    const leadSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;

    // Validate that player has cards
    if (!hand || hand.length === 0) {
      console.error(`Bot ${player.name} has no cards in hand`);
      return null;
    }

    // Filter valid cards (must follow suit if possible)
    let validCards = hand;
    if (leadSuit) {
      const hasLeadSuit = hand.some((card) => card.suit === leadSuit);
      if (hasLeadSuit) {
        validCards = hand.filter((card) => card.suit === leadSuit);
      }
    }

    if (validCards.length === 0) {
      validCards = hand; // All cards are valid if can't follow suit
    }

    // Final validation - ensure we still have valid cards
    if (!validCards || validCards.length === 0) {
      console.error(`Bot ${player.name} has no valid cards to play`);
      return hand && hand.length > 0 ? hand[0] : null;
    }

    switch (difficulty) {
      case "easy":
        return this.easyStrategy(validCards, leadSuit, trump);
      case "hard":
        return this.hardStrategy(
          validCards,
          leadSuit,
          trump,
          currentTrick,
          seat
        );
      case "medium":
      default:
        return this.mediumStrategy(validCards, leadSuit, trump, currentTrick);
    }
  }

  // Easy strategy: Play random valid card
  static easyStrategy(validCards) {
    if (!validCards || validCards.length === 0) {
      console.error("easyStrategy called with no valid cards");
      return null;
    }
    return validCards[Math.floor(Math.random() * validCards.length)];
  }

  // Medium strategy: Basic card evaluation
  static mediumStrategy(validCards, leadSuit, trump, currentTrick) {
    if (!validCards || validCards.length === 0) {
      console.error("mediumStrategy called with no valid cards");
      return null;
    }

    // If leading, play highest card
    if (!leadSuit) {
      return this.getHighestCard(validCards) || validCards[0];
    }

    // If following suit, try to win if possible
    const winningCard = this.getWinningCard(validCards, currentTrick, trump);
    if (winningCard) {
      return winningCard;
    }

    // Otherwise, play lowest card
    return this.getLowestCard(validCards) || validCards[0];
  }

  // Hard strategy: Advanced tactics
  static hardStrategy(validCards, leadSuit, trump, currentTrick, seat) {
    if (!validCards || validCards.length === 0) {
      console.error("hardStrategy called with no valid cards");
      return null;
    }

    // If leading, consider trump setting
    if (!leadSuit) {
      return this.hardLeadStrategy(validCards, trump);
    }

    // If following suit, advanced following strategy
    return this.hardFollowStrategy(validCards, currentTrick, trump, seat);
  }

  // Hard strategy for leading
  static hardLeadStrategy(validCards, trump) {
    if (!validCards || validCards.length === 0) {
      return null;
    }

    // If trump is set, lead with trump to control the game
    if (trump) {
      const trumpCards = validCards.filter((card) => card.suit === trump);
      if (trumpCards.length > 0) {
        return this.getHighestCard(trumpCards) || trumpCards[0];
      }
    }

    // Lead with highest card of strongest suit
    return this.getHighestCard(validCards) || validCards[0];
  }

  // Hard strategy for following suit
  static hardFollowStrategy(validCards, currentTrick, trump, seat) {
    if (!validCards || validCards.length === 0) {
      return null;
    }
    // Check if we can win the trick
    const winningCard = this.getWinningCard(validCards, currentTrick, trump);

    if (winningCard) {
      // Consider if winning is beneficial
      const isLastToPlay = currentTrick.length === 3;
      const isPartnerWinning = this.isPartnerWinning(currentTrick, seat);

      if (isLastToPlay && isPartnerWinning) {
        // Partner is winning, don't overtrump unless necessary
        return this.getLowestCard(validCards) || validCards[0];
      }

      return winningCard;
    }

    // Can't win, play lowest card
    return this.getLowestCard(validCards) || validCards[0];
  }

  // Get the highest card from a set of cards
  static getHighestCard(cards) {
    if (!cards || cards.length === 0) {
      console.error("getHighestCard called with empty array");
      return null;
    }

    const cardValues = {
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    return cards.reduce((highest, card) => {
      const currentValue = cardValues[card.rank];
      const highestValue = cardValues[highest.rank];
      return currentValue > highestValue ? card : highest;
    });
  }

  // Get the lowest card from a set of cards
  static getLowestCard(cards) {
    if (!cards || cards.length === 0) {
      console.error("getLowestCard called with empty array");
      return null;
    }

    const cardValues = {
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    return cards.reduce((lowest, card) => {
      const currentValue = cardValues[card.rank];
      const lowestValue = cardValues[lowest.rank];
      return currentValue < lowestValue ? card : lowest;
    });
  }

  // Get the best card to win the current trick
  static getWinningCard(cards, currentTrick, trump) {
    if (!cards || cards.length === 0 || currentTrick.length === 0) return null;

    const leadSuit = currentTrick[0].card.suit;
    const cardValues = {
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    // Find current winning card
    let currentWinner = currentTrick[0];
    for (const played of currentTrick) {
      if (played.card.suit === trump && currentWinner.card.suit !== trump) {
        currentWinner = played;
      } else if (
        played.card.suit === leadSuit &&
        currentWinner.card.suit === leadSuit
      ) {
        if (
          cardValues[played.card.rank] > cardValues[currentWinner.card.rank]
        ) {
          currentWinner = played;
        }
      } else if (
        played.card.suit === leadSuit &&
        currentWinner.card.suit !== trump
      ) {
        currentWinner = played;
      }
    }

    // Find cards that can beat the current winner
    const winningCards = cards.filter((card) => {
      if (card.suit === trump && currentWinner.card.suit !== trump) {
        return true;
      }
      if (card.suit === trump && currentWinner.card.suit === trump) {
        return cardValues[card.rank] > cardValues[currentWinner.card.rank];
      }
      if (card.suit === leadSuit && currentWinner.card.suit === leadSuit) {
        return cardValues[card.rank] > cardValues[currentWinner.card.rank];
      }
      if (card.suit === leadSuit && currentWinner.card.suit !== trump) {
        return true;
      }
      return false;
    });

    if (winningCards.length === 0) return null;

    // Return the lowest winning card to conserve high cards
    return this.getLowestCard(winningCards);
  }

  // Check if partner is currently winning the trick
  static isPartnerWinning(currentTrick, seat) {
    if (currentTrick.length === 0) return false;

    const partnerSeat =
      seat % 2 === 1 ? (seat === 1 ? 3 : 1) : seat === 2 ? 4 : 2;
    const cardValues = {
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    const leadSuit = currentTrick[0].card.suit;
    let winningSeat = currentTrick[0].seat;
    let winningCard = currentTrick[0].card;

    for (const played of currentTrick) {
      if (played.card.suit === winningCard.suit) {
        if (cardValues[played.card.rank] > cardValues[winningCard.rank]) {
          winningSeat = played.seat;
          winningCard = played.card;
        }
      } else if (
        played.card.suit !== leadSuit &&
        winningCard.suit === leadSuit
      ) {
        // Trump beats non-trump
        winningSeat = played.seat;
        winningCard = played.card;
      }
    }

    return winningSeat === partnerSeat;
  }

  // Make a bot ready
  static makeBotReady(bot) {
    return {
      ...bot,
      isReady: true,
    };
  }

  // Create a bot player
  static createBot(seat, difficulty = "medium") {
    return {
      id: `bot_${seat}_${Date.now()}`,
      name: this.generateBotName(),
      seat: seat,
      hand: [],
      isReady: false,
      isConnected: true,
      isBot: true,
      difficulty: difficulty,
    };
  }
}
