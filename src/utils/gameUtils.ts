import { Card, Player, Room } from "@/types/game";

// Create a standard 52-card deck
export function createDeck(): Card[] {
  const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Card["rank"][] = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
      });
    }
  }

  return deck;
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Count number of ten cards in a set
export function countTens(cards: Card[]): number {
  return cards.filter((c) => c.rank === "10").length;
}

// Get the dealing order starting from the player clockwise to the dealer
export function getDealingOrder(dealerSeat: number): number[] {
  const order = [];
  for (let i = 1; i <= 4; i++) {
    const seat = (dealerSeat % 4) + i; // Start from next seat clockwise
    const adjustedSeat = seat > 4 ? seat - 4 : seat;
    order.push(adjustedSeat);
  }
  return order;
}

// Get the next seat clockwise
export function getNextSeatClockwise(currentSeat: number): number {
  return (currentSeat % 4) + 1;
}

// Get the next dealer (clockwise rotation)
export function getNextDealer(
  currentDealer: number,
  occupiedSeats: number[]
): number {
  const sortedSeats = [...occupiedSeats].sort((a, b) => a - b);
  const currentIndex = sortedSeats.indexOf(currentDealer);

  if (currentIndex === -1) {
    // Current dealer not found, return first occupied seat
    return sortedSeats[0];
  }

  // Return next seat in clockwise order
  const nextIndex = (currentIndex + 1) % sortedSeats.length;
  return sortedSeats[nextIndex];
}

// Deal 13 cards to each of 4 players
export function dealCards(deck: Card[]): Card[][] {
  const shuffled = shuffleDeck(deck);
  const hands: Card[][] = [[], [], [], []];

  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(shuffled[i]);
  }

  return hands;
}

// Get card display name
export function getCardDisplayName(card: Card): string {
  const suitLetters = {
    hearts: "H",
    diamonds: "D",
    clubs: "C",
    spades: "S",
  };

  return `${card.rank}${suitLetters[card.suit]}`;
}

// Get card color for styling
export function getCardColor(suit: Card["suit"]): "red" | "black" {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

// Get suit symbol
export function getSuitSymbol(suit: string): string {
  switch (suit) {
    case "spades":
      return "♠";
    case "clubs":
      return "♣";
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    default:
      return "";
  }
}

// Check if a card can be played (basic rules)
export function canPlayCard(
  card: Card,
  leadSuit: string | null,
  playerHand: Card[]
): boolean {
  // If no lead suit, any card can be played
  if (!leadSuit) return true;

  // Must follow suit if possible
  const hasLeadSuit = playerHand.some((c) => c.suit === leadSuit);
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  // Can play any card if no lead suit in hand
  return true;
}

// Determine trick winner (simplified - highest card of lead suit wins)
// Determine the winner index of a trick, considering lead suit and optional trump
export function getTrickWinner(
  trick: Card[],
  leadSuit: string,
  trump?: string
): number {
  const cardValues = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    "10": 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };

  let winnerIndex = 0;
  let highestValue = 0;

  // If any trump cards were played, winner is highest trump; otherwise highest of lead suit
  const winningSuit =
    trump && trick.some((c) => c.suit === trump) ? trump : leadSuit;
  trick.forEach((card, index) => {
    if (card.suit === winningSuit) {
      const value = cardValues[card.rank];
      if (value > highestValue) {
        highestValue = value;
        winnerIndex = index;
      }
    }
  });

  return winnerIndex;
}

// Generate unique room ID
export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Check if room is full
export function isRoomFull(room: Room): boolean {
  return room.players.length >= 4;
}

// Get available seats in a room
export function getAvailableSeats(room: Room): number[] {
  const occupiedSeats = room.players.map((p) => p.seat);
  return [1, 2, 3, 4].filter((seat) => !occupiedSeats.includes(seat));
}

// Get player by seat number
export function getPlayerBySeat(room: Room, seat: number): Player | null {
  return room.players.find((p) => p.seat === seat) || null;
}

// Check if all players are ready
export function areAllPlayersReady(room: Room): boolean {
  return room.players.length === 4 && room.players.every((p) => p.isReady);
}
