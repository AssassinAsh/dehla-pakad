import { Card } from "@/types/game";
import CardComponent from "./Card";

interface PlayerHandProps {
  hand: Card[];
  onPlayCard: (card: Card) => void;
  canPlay: boolean;
}

export default function PlayerHand({
  hand,
  onPlayCard,
  canPlay,
}: PlayerHandProps) {
  // Sort hand for a consistent display
  const sortedHand = [...hand].sort((a, b) => {
    if (a.suit === b.suit) {
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
      return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    }
    return a.suit.localeCompare(b.suit);
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center items-end h-48 pb-4 z-50 pointer-events-none">
      <div className="relative flex justify-center items-end w-full max-w-3xl">
        {sortedHand.map((card, index) => {
          const totalCards = sortedHand.length;
          const cardOffset = 100 / totalCards;
          const rotation = (index - (totalCards - 1) / 2) * 5;
          const translateY = Math.abs(index - (totalCards - 1) / 2) * 6;

          return (
            <div
              key={card.id}
              className={`absolute transition-transform duration-300 ease-in-out transform pointer-events-auto ${
                canPlay
                  ? "cursor-pointer hover:-translate-y-6 hover:scale-110"
                  : "cursor-not-allowed"
              }`}
              style={{
                transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                transformOrigin: "bottom center",
                zIndex: index,
              }}
              onClick={() => canPlay && onPlayCard(card)}
            >
              <CardComponent card={card} size="medium" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
