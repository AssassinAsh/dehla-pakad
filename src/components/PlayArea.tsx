import { Room } from "@/types/game";
import { getCardDisplayName } from "@/utils/gameUtils";
import Image from "next/image";
import { useDroppable } from "@dnd-kit/core";
import { useState, useEffect } from "react";

interface PlayAreaProps {
  room: Room;
  mySeat: number;
}

// Enhanced card positions with better mobile/desktop responsive spacing
const cardPositions = [
  "bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2", // 0: Player at bottom - responsive spacing
  "top-1/2 left-6 sm:left-8 -translate-y-1/2", // 1: Player on left - straight, no rotation
  "top-6 sm:top-8 left-1/2 -translate-x-1/2 rotate-180", // 2: Player at top - rotated for perspective
  "top-1/2 right-6 sm:right-8 -translate-y-1/2", // 3: Player on right - straight, no rotation
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

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full h-full rounded-2xl transition-all duration-500 backdrop-blur-sm
        border-dashed relative overflow-hidden 
        ${
          isOver
            ? "bg-gradient-to-br from-yellow-500/30 via-yellow-400/20 to-amber-500/30 shadow-[0_0_25px_rgba(255,215,0,0.8)] border-yellow-300 border-4"
            : isMyTurn
            ? "bg-gradient-to-br from-emerald-900/40 via-green-800/30 to-teal-900/40 shadow-[0_0_15px_rgba(52,211,153,0.5)] border-emerald-400 border-3 animate-pulse"
            : "bg-gradient-to-br from-green-900/20 via-emerald-900/15 to-green-800/20 border-green-600/60 border-2"
        }
      `}
      style={{
        boxShadow: isOver
          ? `0 0 ${20 + pulseIntensity / 6}px ${
              2 + pulseIntensity / 15
            }px rgba(255,215,0,0.${
              6 + pulseIntensity / 20
            }), inset 0 0 30px rgba(255,215,0,0.1)`
          : isMyTurn
          ? `0 0 15px 3px rgba(52,211,153,0.${
              4 + Math.sin(Date.now() / 600) * 2
            }), inset 0 0 20px rgba(52,211,153,0.05)`
          : "inset 0 0 15px rgba(0,0,0,0.1)",
      }}
      data-droppable-id="play-area"
    >
      {/* Enhanced center glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-radial from-transparent via-white/[0.02] to-transparent pointer-events-none" />

      {/* Subtle inner border for depth */}
      <div className="absolute inset-2 rounded-xl border border-white/10 pointer-events-none" />

      {children}
    </div>
  );
}

export default function PlayArea({ room, mySeat }: PlayAreaProps) {
  const currentPlayer = room.players?.find(
    (p) => p.seat === room.currentPlayer
  );
  const isMyTurn = currentPlayer?.seat === mySeat;

  return (
    <DroppablePlayArea isMyTurn={isMyTurn}>
      <div className="w-full h-full relative">
        {/* Enhanced stacked tricks with modern styling */}
        {room.stackedTricks && room.stackedTricks.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {room.stackedTricks.map((trick, trickIndex) => (
              <div
                key={`stacked-trick-${trickIndex}`}
                className="absolute transition-all duration-300 hover:scale-105"
                style={{
                  transform: `translate(${trickIndex * 3}px, ${
                    trickIndex * -2
                  }px) rotate(${trickIndex * 2 - 2}deg)`,
                  zIndex: 5 + trickIndex,
                }}
              >
                <div className="relative">
                  <Image
                    src="/cards/back.png"
                    alt="Stacked Card"
                    width={80}
                    height={112}
                    className="rounded-lg shadow-xl border border-gray-700/50"
                  />
                  {/* Stack indicator */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg">
                    {trickIndex + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced current trick with improved animations */}
        {room.currentTrick?.map(({ card, seat }, idx) => {
          const positionIndex = (seat - mySeat + 4) % 4;
          const positionStyle = cardPositions[positionIndex];
          const cardDisplayName = getCardDisplayName(card);
          const isLatest = idx === (room.currentTrick?.length || 0) - 1;

          return (
            <div
              key={card.id}
              className={`absolute transform transition-all duration-700 ease-out ${positionStyle} ${
                isLatest ? "z-30 animate-in zoom-in-95 duration-500" : "z-20"
              }`}
              style={{
                filter: isLatest
                  ? "drop-shadow(0 8px 16px rgba(251, 192, 45, 0.4))"
                  : "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
              }}
            >
              <div
                className={`relative rounded-md overflow-hidden transition-all duration-500 ${
                  isLatest
                    ? "ring-3 ring-yellow-400/80 ring-offset-2 ring-offset-green-900/50 scale-110"
                    : "hover:scale-105"
                }`}
                style={{
                  width: "4rem", // 64px
                  height: "5.6rem", // 89.6px (maintaining card ratio)
                  background: "linear-gradient(145deg, #ffffff, #f8f9fa)",
                  boxShadow: isLatest
                    ? "0 12px 24px rgba(251, 192, 45, 0.3), 0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                {/* Enhanced card border */}
                <div className="absolute inset-0 rounded-md border border-gray-200/50" />

                <Image
                  src={`/cards/${cardDisplayName}.png`}
                  alt={card.id}
                  width={64}
                  height={90}
                  className="rounded-md object-cover"
                  style={{ width: "auto", height: "auto" }}
                  priority={isLatest}
                />

                {/* Card glow effect for latest card */}
                {isLatest && (
                  <div className="absolute inset-0 rounded-md bg-gradient-to-t from-yellow-400/10 via-transparent to-yellow-300/10 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DroppablePlayArea>
  );
}
