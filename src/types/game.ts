// Game types and interfaces for Dehla Pakad card game

export interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank:
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K";
  id: string;
}

export interface Player {
  id: string;
  name: string;
  seat: number; // 1-4
  hand: Card[];
  isReady: boolean;
  isConnected: boolean;
}

export interface PlayedCard {
  card: Card;
  seat: number;
}

export interface Room {
  id: string;
  players: Player[];
  host?: string;
  gameState: GameState;
  currentTrick: PlayedCard[];
  currentPlayer: number; // seat number
  tricks: Trick[];
  stackedTricks: Trick[];
  gameStarted: boolean;
  createdAt: Date;
  dealerSeat?: number;
  deck?: Card[];
}

export interface Trick {
  cards: PlayedCard[];
  winner: number; // seat number
  leadSuit: string;
}

export interface TeamScore {
  tricks: number;
  tens: number;
}

export interface GameState {
  phase: "waiting" | "dealing" | "playing" | "finished";
  currentRound: number;
  scores: {
    team1: TeamScore;
    team2: TeamScore;
  };
  remainingDeck: Card[];
  trump?: string;
  leadSeat?: number;
  lastTrickWinner?: number;
  consecutiveWins?: number;
  dealing?: boolean;
  status?: "waiting" | "in-progress" | "finished";
  trumpJustSet?: boolean;
}

export interface RoomSummary {
  id: string;
  playerCount: number;
  gameStarted: boolean;
  createdAt: Date;
}

// Socket event types
export interface ServerToClientEvents {
  roomUpdated: (room: Room) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: (room: Room) => void;
  cardPlayed: (card: Card, playerId: string) => void;
  trickCompleted: (trick: Trick) => void;
  gameError: (error: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, callback: (roomId: string) => void) => void;
  joinRoom: (
    roomId: string,
    playerName: string,
    seat: number,
    callback: (success: boolean, error?: string) => void
  ) => void;
  leaveRoom: (roomId: string) => void;
  startGame: (roomId: string) => void;
  playCard: (roomId: string, cardId: string) => void;
  getRooms: (callback: (rooms: RoomSummary[]) => void) => void;
}
