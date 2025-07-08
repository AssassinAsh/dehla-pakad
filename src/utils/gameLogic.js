export const createDeck = (shuffled = true) => {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
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
    "A",
  ];

  let deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: `${rank}_of_${suit}`, suit, rank });
    }
  }

  if (shuffled) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  return deck;
};

export const determineTrickWinner = (trick, trumpSuit) => {
  let winningCard = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    // If current card is trump and winning card is not
    if (
      currentCard.card.suit === trumpSuit &&
      winningCard.card.suit !== trumpSuit
    ) {
      winningCard = currentCard;
    } else if (currentCard.card.suit === winningCard.card.suit) {
      // If both are same suit (trump or not), check rank
      const rankOrder = [
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
        "A",
      ];
      if (
        rankOrder.indexOf(currentCard.card.rank) >
        rankOrder.indexOf(winningCard.card.rank)
      ) {
        winningCard = currentCard;
      }
    }
  }
  return winningCard.seat;
};

export const calculateScores = (players) => {
  const scores = { 1: 0, 2: 0, 3: 0, 4: 0 };
  players.forEach((player) => {
    const tens = player.capturedTricks
      .flat()
      .filter((c) => c.card.rank === "10").length;
    scores[player.seat] = tens;
  });
  return scores;
};

export const checkForKot = (scores) => {
  const team1Score = scores[1] + scores[3];
  const team2Score = scores[2] + scores[4];
  if (team1Score === 4) return 1; // Team 1 (seats 1 & 3) kots
  if (team2Score === 4) return 2; // Team 2 (seats 2 & 4) kots
  return null;
};
