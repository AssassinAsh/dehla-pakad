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
  "bottom-2 left-1/2 -translate-x-1/2", // 0: Player at bottom
  "top-1/2 left-2 -translate-y-1/2", // 1: Player on left
  "top-2 left-1/2 -translate-x-1/2", // 2: Player at top
  "top-1/2 right-2 -translate-y-1/2", // 3: Player on right
];

interface DroppablePlayAreaProps {
  children: React.ReactNode;
  isTrickEmpty: boolean;
  isMyTurn: boolean;
}

function DroppablePlayArea({
  children,
  isTrickEmpty,
  isMyTurn,
}: DroppablePlayAreaProps) {
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

  console.log("Droppable area active:", isMyTurn, "Is over:", isOver);

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
      {/* Spotlight effect for drop area */}
      <div
        className={`
        absolute inset-0 bg-radial-gradient from-transparent 
        ${
          isOver
            ? "via-yellow-500/5 to-yellow-500/20"
            : isMyTurn
            ? "via-green-500/5 to-green-500/10"
            : "to-transparent"
        } 
        transition-opacity duration-300
      `}
      />

      {children}

      {isTrickEmpty && !isOver && (
        <div
          className={`
          text-center absolute inset-0 flex flex-col items-center justify-center
          ${isMyTurn ? "text-green-200/90" : "text-yellow-200/70"}
        `}
        >
          {isMyTurn ? (
            <>
              <div className="text-lg font-semibold mb-1">Your Turn</div>
              <div className="text-sm italic">Drag a card here to play</div>
            </>
          ) : (
            <div className="text-sm italic">Cards played will appear here</div>
          )}
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm rounded-xl">
          <div className="text-yellow-300 font-bold text-xl animate-bounce">
            Drop to Play
          </div>
          <div className="text-yellow-200/80 text-xs mt-1">
            Release to play this card
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayArea({ room, mySeat }: PlayAreaProps) {
  // Determine if it's the current player's turn
  const currentPlayer = room.players.find((p) => p.seat === room.currentPlayer);
  const isMyTurn = currentPlayer && room.currentPlayer === mySeat;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center touch-none">
      {/* Play area container */}
      <div className="w-[70%] h-48 md:w-72 md:h-48 relative">
        {/* Droppable area */}
        <DroppablePlayArea
          isTrickEmpty={room.currentTrick.length === 0}
          isMyTurn={!!isMyTurn}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {room.currentTrick.map(({ card, seat }, index) => {
              const player = room.players.find((p) => p.seat === seat);
              const isTeamOne = seat === 1 || seat === 3;
              const teamColor = isTeamOne
                ? "bg-blue-500/30 border-blue-500"
                : "bg-green-500/30 border-green-500";
              const nameBgColor = isTeamOne
                ? "bg-blue-900/80"
                : "bg-green-900/80";

              const positionIndex = (seat - mySeat + 4) % 4;
              const positionClass = `absolute ${cardPositions[positionIndex]}`;

              return (
                <div
                  key={`${card.id}-${seat}`}
                  className={`flex flex-col items-center animate-fade-in ${positionClass}`}
                  style={{
                    // Stagger the animation delay based on the order cards were played
                    animationDelay: `${index * 0.15}s`,
                    // Add a subtle shadow based on team color
                    filter: `drop-shadow(0 2px 4px ${
                      isTeamOne
                        ? "rgba(37, 99, 235, 0.5)"
                        : "rgba(5, 150, 105, 0.5)"
                    })`,
                  }}
                >
                  <Image
                    src={`/cards/${card.rank}${card.suit[0].toUpperCase()}.png`}
                    alt={getCardDisplayName(card)}
                    width={70}
                    height={100}
                    className={`rounded-lg shadow-xl border-2 ${teamColor}`}
                  />
                  <div
                    className={`${nameBgColor} text-center px-2 py-1 rounded-md mt-1 min-w-[70px] border border-gray-700 text-shadow`}
                  >
                    <span className="text-white text-xs font-medium">
                      {player?.name || `Seat ${seat}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DroppablePlayArea>
      </div>

      {/* Game status indicators (Trump & Turn) */}
      <div className="mt-4 flex flex-col items-center">
        {room.gameState.trump ? (
          <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-md border border-yellow-700 shadow-lg">
            <span className="text-yellow-200 text-sm">Trump:</span>
            <span className="font-bold text-white">{room.gameState.trump}</span>
          </div>
        ) : (
          <span className="text-yellow-200/80 text-xs tracking-wider">
            Play Area
          </span>
        )}

        {/* Remove the player turn indicator here - it's now in the player hand component */}
      </div>
    </div>
  );
}
