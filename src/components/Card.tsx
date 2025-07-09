import { Card as CardType } from "@/types/game";
import Image from "next/image";

// Helper to map card data to image file names from deckofcardsapi.com
const getCardImageSrc = (card: CardType): string => {
  const rankMap: { [key: string]: string } = {
    A: "A",
    K: "K",
    Q: "Q",
    J: "J",
    "10": "0",
    "9": "9",
    "8": "8",
    "7": "7",
    "6": "6",
    "5": "5",
    "4": "4",
    "3": "3",
    "2": "2",
  };

  const suitMap: { [key: string]: string } = {
    spades: "S",
    diamonds: "D",
    clubs: "C",
    hearts: "H",
  };

  const rank = rankMap[card.rank];
  const suit = suitMap[card.suit.toLowerCase()];

  // Fallback for invalid card data
  if (!rank || !suit) {
    return "/cards/back.png"; // Default to card back if data is invalid
  }

  const code = rank + suit;
  // Use local card images
  return `/cards/${code}.png`;
};

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "small" | "medium" | "large";
  className?: string;
}

export default function Card({
  card,
  isSelected = false,
  onClick,
  size = "medium",
  className = "",
}: CardProps) {
  const sizeClasses = {
    small: "w-10 md:w-12 h-15 md:h-18",
    medium: "w-14 md:w-20 h-20 md:h-28",
    large: "w-18 md:w-24 h-28 md:h-36",
  };

  const imageSrc = getCardImageSrc(card);

  // Get border color based on suit
  const getSuitColor = () => {
    if (card.suit === "hearts" || card.suit === "diamonds") {
      return isSelected ? "border-red-500" : "hover:border-red-500/70";
    }
    return isSelected ? "border-blue-800" : "hover:border-blue-800/70";
  };

  return (
    <div
      className={`
        relative transition-all duration-300 transform-gpu
        ${sizeClasses[size]}
        ${isSelected ? "-translate-y-4 scale-105" : "hover:scale-105"}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      <div
        className={`
          absolute inset-0 rounded-lg overflow-hidden border-2 ${getSuitColor()}
          ${
            isSelected
              ? "shadow-lg shadow-yellow-500/30"
              : "shadow-md hover:shadow-lg"
          }
          transition-all duration-200
        `}
      >
        <Image
          src={imageSrc}
          alt={`${card.rank} of ${card.suit}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain"
          priority={isSelected}
        />
      </div>
    </div>
  );
}
