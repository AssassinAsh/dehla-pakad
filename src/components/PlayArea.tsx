import { Room } from "@/types/game";
import { getCardDisplayName } from "@/utils/gameUtils";
import Image from "next/image";
import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect } from "react";

interface PlayAreaProps {
  room: Room;
  mySeat: number;
}

// Defines the position styling for each card in the play area, relative to the local player.
const cardPositions = [
  "bottom-8 left-1/2 -translate-x-1/2", // 0: Player at bottom - moved up to avoid seat overlap
  "top-1/2 left-8 -translate-y-1/2", // 1: Player on left - moved inward
  "top-8 left-1/2 -translate-x-1/2", // 2: Player at top - moved down
  "top-1/2 right-8 -translate-y-1/2", // 3: Player on right - moved inward
];

interface DroppablePlayAreaProps {
  children: React.ReactNode;
  isMyTurn: boolean;
}

function DroppablePlayArea({ children, isMyTurn }: DroppablePlayAreaProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "play-area",
    disabled: !isMyTurn,
  });

  // Enhanced pulse animation when hovering
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    if (isOver) {
      const interval = setInterval(() => {
        setPulseIntensity((prev) => (prev >= 100 ? 0 : prev + 5));
      }, 30); // Faster pulse
      return () => clearInterval(interval);
    } else {
      setPulseIntensity(0);
    }
  }, [isOver]);

  // Calculate dynamic border styles
  const getBorderStyle = () => {
    if (isOver) {
      return "border-yellow-300 border-3";
    }
    if (isMyTurn) {
      return "border-green-400 border-2 animate-pulse";
    }
    return "border-yellow-500/50 border-2";
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full h-full rounded-xl transition-all duration-300 
        border-dashed relative overflow-hidden
        ${
          isOver
            ? "bg-yellow-500/20 shadow-[0_0_20px_rgba(255,215,0,0.6)]"
            : isMyTurn
            ? "bg-green-900/30 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
            : "bg-green-900/20"
        }
        ${getBorderStyle()}
      `}
      style={{
        boxShadow: isOver
          ? `0 0 ${15 + pulseIntensity / 8}px ${
              pulseIntensity / 10
            }px rgba(255,215,0,0.${4 + pulseIntensity / 25})`
          : isMyTurn
          ? `0 0 10px 2px rgba(52,211,153,0.${
              3 + Math.sin(Date.now() / 500) * 2
            })`
          : undefined,
      }}
      data-droppable-id="play-area"
    >
      {children}
    </div>
  );
}

export default function PlayArea({ room, mySeat }: PlayAreaProps) {
  const currentPlayer = room.players.find((p) => p.seat === room.currentPlayer);
  const isMyTurn = currentPlayer?.seat === mySeat;

  return (
    <DroppablePlayArea isMyTurn={isMyTurn}>
      <div className="w-full h-full relative">
        {/* Stacked tricks */}
        {room.stackedTricks && room.stackedTricks.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {room.stackedTricks.map((trick, trickIndex) => (
              <div
                key={`stacked-trick-${trickIndex}`}
                className="absolute"
                style={{
                  transform: `translate(${trickIndex * 2}px, ${
                    trickIndex * 2
                  }px)`,
                }}
              >
                <Image
                  src="/cards/back.png"
                  alt="Stacked Card"
                  width={80}
                  height={112}
                  className="rounded-md shadow-lg"
                />
              </div>
            ))}
          </div>
        )}

        {/* Current trick */}
        {room.currentTrick.map(({ card, seat }, idx) => {
          const positionIndex = (seat - mySeat + 4) % 4;
          const positionStyle = cardPositions[positionIndex];
          const cardDisplayName = getCardDisplayName(card);
          const isLatest = idx === room.currentTrick.length - 1;

          return (
            <div
              key={card.id}
              className={`absolute transform transition-all duration-500 ${positionStyle} ${
                isLatest ? "z-20" : "z-10"
              }`}
            >
              <div
                className={`card rounded-md shadow-lg transition-all duration-300 ${
                  isLatest ? "ring-4 ring-yellow-400 animate-fly-in" : ""
                }`}
                style={{
                  width: 60,
                  height: 84,
                  background: "#fff",
                  position: "relative",
                  boxShadow: isLatest
                    ? "0 0 16px 4px rgba(251, 192, 45, 0.5)"
                    : "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <Image
                  src={`/cards/${cardDisplayName}.png`}
                  alt={card.id}
                  width={60}
                  height={84}
                  className="rounded-md"
                  priority={isLatest}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DroppablePlayArea>
  );
}
