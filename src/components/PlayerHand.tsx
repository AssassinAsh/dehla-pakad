import { Card } from "@/types/game";
import CardComponent from "./Card";
import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface PlayerHandProps {
  hand: Card[];
  onPlayCard: (card: Card) => void;
  canPlay: boolean;
}

interface DraggableCardProps {
  card: Card;
  canPlay: boolean;
  index: number;
  totalCards: number;
  onPlay: (card: Card) => void;
  selected: boolean;
  setSelected: (id: string | null) => void;
}

function DraggableCard({
  card,
  canPlay,
  index,
  totalCards,
  onPlay,
  selected,
  setSelected,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      disabled: !canPlay,
    });
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 600;
  const fanSpread = isSmallScreen ? 32 : 44;
  const centerOffset = index - (totalCards - 1) / 2;
  const rotation = isSmallScreen ? centerOffset * 1 : centerOffset * 2;
  const horizontalOffset = centerOffset * fanSpread;
  const dragTransform = transform
    ? CSS.Translate.toString(transform)
    : undefined;
  const style = {
    left: `calc(50% + ${horizontalOffset}px)`,
    bottom: canPlay && selected ? "50px" : "20px",
    zIndex: selected ? 30 : index,
    transform: `rotate(${rotation}deg)${
      dragTransform ? ` ${dragTransform}` : ""
    }`,
    transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card absolute transition-all duration-200 ${
        canPlay ? "playable" : ""
      } ${
        selected ? "ring-4 ring-yellow-400 ring-opacity-70 scale-110 z-30" : ""
      } ${canPlay && !isDragging ? "hover:shadow-lg hover:scale-105" : ""} ${
        isDragging ? "opacity-90 scale-105 z-50" : ""
      }`}
      onClick={() => {
        if (canPlay) {
          if (selected) {
            onPlay(card);
            setSelected(null);
          } else {
            setSelected(card.id);
          }
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Play ${card.rank} of ${card.suit}`}
    >
      <CardComponent
        card={card}
        size={isSmallScreen ? "large" : "medium"}
        className={`rounded-lg ${canPlay ? "shadow-xl" : "shadow-md"}`}
      />
    </div>
  );
}

export default function PlayerHand({
  hand,
  onPlayCard,
  canPlay,
}: PlayerHandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [sortedHand, setSortedHand] = useState<Card[]>([]);

  // Sort hand whenever it changes
  useEffect(() => {
    // Sort hand for a consistent display
    const sorted = [...hand].sort((a, b) => {
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
    setSortedHand(sorted);

    // Clear selection if selected card is no longer in hand
    if (selectedCard && !sorted.some((card) => card.id === selectedCard)) {
      setSelectedCard(null);
    }
  }, [hand, selectedCard]);

  // This section is where we'd handle card selection if we needed to
  useEffect(() => {
    // Clear selection if hand changes (like when a card is played)
    setSelectedCard(null);
  }, [hand.length]);

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center h-32 md:h-48 z-50 pointer-events-none px-4 md:px-8">
      <div className="relative w-full max-w-4xl h-full pointer-events-auto touch-action-none flex justify-center">
        <div className="relative w-full max-w-2xl h-full">
          {sortedHand.map((card, index) => (
            <DraggableCard
              key={card.id}
              card={card}
              canPlay={canPlay}
              index={index}
              totalCards={sortedHand.length}
              onPlay={onPlayCard}
              selected={selectedCard === card.id}
              setSelected={setSelectedCard}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
