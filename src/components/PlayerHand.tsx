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

  // Enhanced fan spread calculations for better visual appeal
  const fanSpread = isSmallScreen ? 28 : 38;
  const centerOffset = index - (totalCards - 1) / 2;
  const rotation = isSmallScreen ? centerOffset * 1.2 : centerOffset * 2.5;
  const horizontalOffset = centerOffset * fanSpread;

  // Enhanced vertical positioning with arc effect
  const verticalOffset = Math.abs(centerOffset) * (isSmallScreen ? 2 : 4);

  const dragTransform = transform
    ? CSS.Translate.toString(transform)
    : undefined;

  const style = {
    left: `calc(50% + ${horizontalOffset}px)`,
    bottom: canPlay && selected ? "60px" : `${20 + verticalOffset}px`, // Arc effect
    zIndex: selected ? 40 : 20 + index,
    transform: `rotate(${rotation}deg)${
      dragTransform ? ` ${dragTransform}` : ""
    }${selected ? " scale(1.15)" : ""}`,
    transition: isDragging
      ? "none"
      : "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
    filter: selected
      ? "drop-shadow(0 12px 24px rgba(251, 192, 45, 0.4))"
      : canPlay
      ? "drop-shadow(0 6px 12px rgba(0,0,0,0.15))"
      : "drop-shadow(0 3px 6px rgba(0,0,0,0.1)) grayscale(20%)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute transition-all duration-400 cursor-pointer select-none haptic-light focus-ring
        ${canPlay ? "hover-effect" : "opacity-75"}
        ${
          selected
            ? "ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-green-900/50 animate-enhanced-pulse"
            : ""
        }
        ${
          canPlay && !isDragging
            ? "hover:scale-110 hover:-translate-y-3 hover:shadow-2xl"
            : ""
        }
        ${isDragging ? "opacity-90 scale-110 z-50 rotate-0 card-dragging" : ""}
      `}
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
      onKeyDown={(e) => {
        if (canPlay && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (selected) {
            onPlay(card);
            setSelected(null);
          } else {
            setSelected(card.id);
          }
        }
      }}
      tabIndex={canPlay ? 0 : -1}
      role="button"
      aria-label={`${selected ? "Selected: " : ""}${card.rank} of ${card.suit}${
        canPlay ? ". Click to play." : ""
      }`}
      aria-pressed={selected}
    >
      <div className={`relative ${selected ? "animate-spotlight" : ""}`}>
        <CardComponent
          card={card}
          size={isSmallScreen ? "large" : "medium"}
          className={`rounded-xl overflow-hidden border-2 transition-all duration-300
            ${
              canPlay
                ? "border-white/30 shadow-xl bg-white"
                : "border-gray-400/20 shadow-md bg-gray-100"
            }
            ${
              selected
                ? "border-yellow-400/60 bg-gradient-to-br from-white via-yellow-50 to-white"
                : ""
            }
          `}
        />

        {/* Enhanced selection indicator */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce-in">
            <svg
              className="w-3 h-3 text-white font-bold"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Playable indicator glow */}
        {canPlay && !selected && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-emerald-400/10 via-transparent to-emerald-300/10 animate-pulse pointer-events-none" />
        )}
      </div>
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
    if (hand && hand.length > 0) {
      const sorted = [...hand].sort((a, b) => {
        // Primary sort: by suit (Spades, Hearts, Clubs, Diamonds)
        const suitOrder = ["spades", "hearts", "clubs", "diamonds"];
        const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);

        if (suitDiff !== 0) {
          return suitDiff;
        }

        // Secondary sort: by rank within the same suit
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
      });

      // Debug logging to verify sorting is working
      console.log("🃏 PlayerHand: Sorting cards", {
        original: hand.map((c) => `${c.rank}${c.suit.charAt(0).toUpperCase()}`),
        sorted: sorted.map((c) => `${c.rank}${c.suit.charAt(0).toUpperCase()}`),
      });

      setSortedHand(sorted);
    } else {
      setSortedHand([]);
    }
  }, [hand]);

  // Force re-sort when hand length changes (additional safety)
  useEffect(() => {
    if (hand && hand.length > 0 && sortedHand.length !== hand.length) {
      console.log("🔄 PlayerHand: Force re-sorting due to length change", {
        handLength: hand.length,
        sortedLength: sortedHand.length,
      });

      const sorted = [...hand].sort((a, b) => {
        const suitOrder = ["spades", "hearts", "clubs", "diamonds"];
        const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
        if (suitDiff !== 0) return suitDiff;

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
      });

      setSortedHand(sorted);
    }
  }, [hand.length, sortedHand.length, hand]);

  // Clear selection if selected card is no longer in hand
  useEffect(() => {
    if (selectedCard && !hand.some((card) => card.id === selectedCard)) {
      setSelectedCard(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand]); // Only depend on hand changes to avoid infinite loop
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center h-32 sm:h-40 md:h-48 z-50 pointer-events-none px-2 sm:px-4 md:px-8">
      {/* Transparent background to not hide the table */}

      <div className="relative w-full max-w-5xl h-full pointer-events-auto touch-action-none flex justify-center">
        <div className="relative w-full max-w-3xl h-full">
          {/* Hand cards with enhanced fan layout */}
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

          {/* Subtle hand indicator for better UX */}
          {canPlay && sortedHand.length > 0 && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-white/60 font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {selectedCard ? "Tap again to play" : "Tap to select a card"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
