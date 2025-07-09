import { Card } from "@/types/game";
import CardComponent from "./Card";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";

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
  onDoubleClick: () => void;
  selected?: boolean;
}

function DraggableCard({
  card,
  canPlay,
  index,
  totalCards,
  onDoubleClick,
  selected = false,
}: DraggableCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      disabled: !canPlay,
      data: { card },
    });
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 768;

  // Calculate the fanned layout position - adaptive for screen size
  const maxFanWidth = isSmallScreen
    ? Math.min(totalCards * 14, window.innerWidth * 0.75) // Smaller fan width on mobile
    : Math.min(totalCards * 20, 600); // Regular fan width on desktop

  const fanSpread = maxFanWidth / (totalCards + (isSmallScreen ? 1 : 0)); // Tighter fan on mobile

  // Calculate rotation and position - less dramatic on mobile
  const centerOffset = index - (totalCards - 1) / 2;
  const rotation = isSmallScreen ? centerOffset * 1 : centerOffset * 2; // Less rotation on mobile
  const translateY = isSmallScreen
    ? Math.abs(centerOffset) * 2 // Less height difference on mobile
    : Math.abs(centerOffset) * 4; // Regular curve on desktop

  const horizontalOffset = centerOffset * fanSpread; // Horizontal spread

  // Style for the card including transform from dragging
  const style = {
    transform: CSS.Transform.toString(
      transform
        ? {
            ...transform,
            scaleX: isDragging ? 1.05 : 1,
            scaleY: isDragging ? 1.05 : 1,
          }
        : null
    ),
    zIndex: isDragging ? 100 : isHovered ? 50 : index,
    left: `calc(50% + ${horizontalOffset}px)`,
    bottom: canPlay && (isHovered || selected) ? "45px" : "20px",
    transformOrigin: "bottom center",
    rotate: `${rotation}deg`,
    translateY: `${translateY}px`,
    transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)", // Smoother animation
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`absolute touch-action-none no-select ${
        isDragging ? "opacity-95 scale-105 z-50" : "opacity-100"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => canPlay && onDoubleClick()}
      onTouchStart={() => canPlay && setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div
        className={`
          transition-all duration-200 transform-gpu
          ${
            canPlay
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-not-allowed opacity-80"
          }
          ${isDragging ? "card-dragging shadow-2xl" : ""}
          ${canPlay && (isHovered || selected) ? "scale-110" : ""}
          ${canPlay && !isDragging ? "hover:animate-card-glow" : ""}
          ${selected ? "ring-4 ring-yellow-400 ring-opacity-70" : ""}
        `}
      >
        <CardComponent
          card={card}
          size="medium"
          className={`rounded-lg ${
            canPlay && (isHovered || selected) ? "shadow-xl" : "shadow-md"
          }`}
        />
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
    <div className="fixed bottom-0 left-0 right-0 flex justify-center h-32 md:h-48 z-50 pointer-events-none">
      <div className="relative w-full max-w-3xl h-full pointer-events-auto touch-action-none">
        {sortedHand.map((card, index) => (
          <DraggableCard
            key={card.id}
            card={card}
            canPlay={canPlay}
            index={index}
            totalCards={sortedHand.length}
            onDoubleClick={() => {
              if (selectedCard === card.id) {
                onPlayCard(card);
                setSelectedCard(null);
              } else {
                setSelectedCard(card.id);
              }
            }}
            selected={selectedCard === card.id}
          />
        ))}
      </div>

      {/* Your Turn Indicator - Moved above the cards to prevent overlap */}
      {canPlay && (
        <div className="absolute bottom-[90px] md:bottom-[130px] left-1/2 transform -translate-x-1/2 bg-green-800 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 border-green-500 shadow-lg animate-pulse z-50">
          <span className="flex items-center font-bold text-sm md:text-base">
            Your Turn
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 md:h-5 md:w-5 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </span>
          {canPlay && (
            <span className="ml-1 text-xs block text-center mt-1">
              Drag card to play
            </span>
          )}
        </div>
      )}
    </div>
  );
}
