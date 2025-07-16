// Game Event Manager for Dehla Pakad
// Phase 1: Event System Foundation - Non-breaking addition to existing system

export class GameEventManager {
  constructor() {
    this.eventHistory = new Map(); // roomId -> events[]
    this.eventListeners = new Map(); // eventType -> callbacks[]
  }

  // Emit game event to specific room
  static emitToRoom(io, roomId, eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: Date.now(),
      roomId: roomId,
    };

    // Emit to room clients
    io.to(roomId).emit("gameEvent", event);

    // Store event in history for debugging/replay
    this.storeEvent(roomId, event);
  }

  // Store event in memory for this session
  static storeEvent(roomId, event) {
    if (!this.eventHistory) {
      this.eventHistory = new Map();
    }

    if (!this.eventHistory.has(roomId)) {
      this.eventHistory.set(roomId, []);
    }

    const roomEvents = this.eventHistory.get(roomId);
    roomEvents.push(event);

    // Keep only last 100 events per room to prevent memory leaks
    if (roomEvents.length > 100) {
      roomEvents.shift();
    }
  }

  // Get event history for a room (useful for debugging)
  static getEventHistory(roomId) {
    return this.eventHistory?.get(roomId) || [];
  }

  // Clear event history for a room (cleanup)
  static clearEventHistory(roomId) {
    if (this.eventHistory) {
      this.eventHistory.delete(roomId);
    }
  }
}

// Dehla Pakad specific event types
export const GameEventTypes = {
  // Game lifecycle
  GAME_STARTED: "gameStarted",
  GAME_ENDED: "gameEnded",
  GAME_RESET: "gameReset",

  // Player actions
  PLAYER_JOINED: "playerJoined",
  PLAYER_LEFT: "playerLeft",
  PLAYER_READY: "playerReady",

  // Card dealing
  CARDS_DEALT_INITIAL: "cardsDealtInitial",
  CARDS_DEALT_REMAINING: "cardsDealtRemaining",

  // Gameplay
  CARD_PLAYED: "cardPlayed",
  TURN_ADVANCED: "turnAdvanced",
  TRUMP_SET: "trumpSet",

  // Trick management
  TRICK_STARTED: "trickStarted",
  TRICK_COMPLETED: "trickCompleted",

  // Scoring
  TEN_COLLECTED: "tenCollected",
  TEAM_SCORE_UPDATED: "teamScoreUpdated",

  // Special conditions
  KOT_ACHIEVED: "kotAchieved",
  DEHLA_PAKAD_WIN: "dehlaPakadWin",
  CONSECUTIVE_WIN: "consecutiveWin",

  // System
  ERROR_OCCURRED: "errorOccurred",
  VALIDATION_FAILED: "validationFailed",
};

// Event data structure examples for documentation
export const EventDataExamples = {
  [GameEventTypes.GAME_STARTED]: {
    dealerSeat: 1,
    firstPlayer: 2,
    gameMode: "private",
  },

  [GameEventTypes.CARD_PLAYED]: {
    playerId: "socket123",
    playerSeat: 1,
    cardId: "AS",
    cardSuit: "spades",
    cardRank: "A",
    followedSuit: true,
    trickPosition: 2,
  },

  [GameEventTypes.TRUMP_SET]: {
    trumpSuit: "hearts",
    setByPlayer: 3,
    setByPlayerName: "Player3",
    triggerCard: "JH",
    trickNumber: 3,
  },

  [GameEventTypes.TRICK_COMPLETED]: {
    trickNumber: 5,
    winnerSeat: 2,
    winnerName: "Player2",
    cardsInTrick: [
      { playerId: "socket1", seat: 1, cardId: "KS" },
      { playerId: "socket2", seat: 2, cardId: "AS" },
      { playerId: "socket3", seat: 3, cardId: "7H" },
      { playerId: "socket4", seat: 4, cardId: "QS" },
    ],
    containsTen: false,
    teamTricksWon: { team1: 3, team2: 2 },
  },

  [GameEventTypes.TEN_COLLECTED]: {
    collectorSeat: 1,
    collectorName: "Player1",
    tenCard: "10H",
    teamTensCollected: { team1: 2, team2: 1 },
  },
};
