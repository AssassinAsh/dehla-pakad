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
    small: "w-12 h-18",
    medium: "w-20 h-28",
    large: "w-24 h-36",
  };

  const imageSrc = getCardImageSrc(card);

  return (
    <div
      className={`
        relative transition-all duration-300 transform-gpu
        ${sizeClasses[size]}
        ${isSelected ? "-translate-y-4 scale-105" : "hover:scale-105"}
        ${className}
      `}
      onClick={onClick}
    >
      <Image
        src={imageSrc}
        alt={`${card.rank} of ${card.suit}`}
        layout="fill"
        objectFit="contain"
        className="drop-shadow-lg"
      />
    </div>
  );
}
