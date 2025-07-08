import { Room } from "@/types/game";
import { getCardDisplayName } from "@/utils/gameUtils";
import Image from "next/image";

interface GameTableProps {
  room: Room;
  dealerSeat?: number;
  currentPlayerId?: string;
  onSeatClick?: (seat: number) => void;
}

const seatPositions = [
  { name: "bottom", style: "absolute left-1/2 bottom-0 -translate-x-1/2" },
  { name: "left", style: "absolute left-0 top-1/2 -translate-y-1/2" },
  { name: "top", style: "absolute left-1/2 top-0 -translate-x-1/2" },
  { name: "right", style: "absolute right-0 top-1/2 -translate-y-1/2" },
];

// GameTable component

export default function GameTable({
  room,
  dealerSeat,
  currentPlayerId,
  onSeatClick,
}: GameTableProps) {
  const isDealing = room.gameState.dealing;

  // Find the local player's seat
  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const mySeat = currentPlayer?.seat || 1;

  // Rotate seat order so local player is always at the bottom
  const seatOrder = [0, 1, 2, 3].map((i) => ((mySeat - 1 + i) % 4) + 1);

  return (
    <div className="w-full max-w-3xl mx-auto bg-green-800 rounded-2xl aspect-[2/1] relative flex items-center justify-center p-8 shadow-2xl border-8 border-yellow-800">
      {/* Team score indicators at the top of the table */}
      <div className="absolute top-0 left-0 w-full flex justify-between z-10 transform -translate-y-7">
        <div className="bg-blue-900 text-white text-sm px-3 py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-blue-600 flex items-center shadow-lg">
          <span className="font-bold">Team 1</span>
          <span className="text-xs ml-2 text-blue-200">(Seats 1 & 3)</span>
          <span className="ml-3 font-bold text-yellow-400">
            {(room.gameState.scores[1] || 0) + (room.gameState.scores[3] || 0)}✦
          </span>
        </div>

        <div className="bg-green-900 text-white text-sm px-3 py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-green-600 flex items-center shadow-lg">
          <span className="font-bold">Team 2</span>
          <span className="text-xs ml-2 text-green-200">(Seats 2 & 4)</span>
          <span className="ml-3 font-bold text-yellow-400">
            {(room.gameState.scores[2] || 0) + (room.gameState.scores[4] || 0)}✦
          </span>
        </div>
      </div>
      {/* Dealer & Deck */}
      {isDealing && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <Image
            src="/cards/back.png"
            alt="Deck"
            width={64}
            height={90}
            className="drop-shadow-lg animate-bounce"
          />
          {dealerSeat && (
            <span className="mt-2 text-yellow-300 font-bold text-sm bg-black/60 px-2 py-1 rounded">
              Dealer: Seat {dealerSeat}
            </span>
          )}
        </div>
      )}

      {/* Rectangular seat boxes instead of circles */}
      {seatOrder.map((seat, idx) => {
        const player = room.players.find((p) => p.seat === seat);
        const isCurrent = player?.id === currentPlayerId;
        const isCurrentTurn = player && room.currentPlayer === player.seat;
        return (
          <div
            key={seat}
            className={
              seatPositions[idx].style +
              " z-10 flex flex-col items-center select-none"
            }
            onClick={() => onSeatClick && !player && onSeatClick(seat)}
          >
            {/* Seat rectangle */}
            <div
              className={
                "w-24 px-2 py-2 rounded-md flex items-center justify-center border-l-4 shadow-xl transition-all duration-200 " +
                (isCurrent
                  ? "border-blue-500 bg-gradient-to-r from-blue-900 to-blue-800"
                  : isCurrentTurn
                  ? "border-green-500 bg-gradient-to-r from-green-800 to-green-900 animate-pulse"
                  : player
                  ? "border-yellow-500 bg-gradient-to-r from-yellow-900 to-amber-950"
                  : "border-gray-500 bg-gradient-to-r from-gray-800 to-gray-900 opacity-70 hover:opacity-100 hover:from-gray-700")
              }
            >
              {player ? (
                <div className="flex flex-col items-center text-center">
                  <span className="text-base font-bold truncate text-white max-w-[5rem]">
                    {player.name}
                  </span>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-yellow-200 font-medium">
                      {player.hand.length} cards
                    </span>
                    {isCurrentTurn && (
                      <span className="ml-1 text-xs text-green-400">▶</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm text-gray-300">Seat {seat}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    Click to join
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Trick cards in center (play area) - improved positioning */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        {/* Play area with clear team indicators */}
        <div className="w-64 h-40 flex items-center justify-center relative border-2 border-dashed border-yellow-400 rounded-xl bg-green-900/50">
          <div className="flex items-center justify-center w-full h-full relative">
            {room.currentTrick.map(({ card, seat }, idx) => {
              // Find player who played this card
              const player = room.players.find((p) => p.seat === seat);

              // Get team color based on seat (1&3 blue, 2&4 green)
              const teamColor =
                seat === 1 || seat === 3
                  ? "bg-blue-500/30 border-blue-500"
                  : "bg-green-500/30 border-green-500";

              return (
                <div
                  key={`${card.id}-${seat}`}
                  className={`absolute flex flex-col items-center animate-fade-in play-area-card-${
                    idx + 1
                  }`}
                >
                  <Image
                    src={`/cards/${card.rank}${card.suit[0].toUpperCase()}.png`}
                    alt={getCardDisplayName(card)}
                    width={60}
                    height={90}
                    className={`rounded shadow-xl border-2 ${teamColor}`}
                  />
                  <div
                    className={`${
                      seat === 1 || seat === 3
                        ? "bg-blue-900/80"
                        : "bg-green-900/80"
                    } text-center px-1 py-0.5 rounded mt-1 min-w-[60px] border border-gray-700`}
                  >
                    <span className="text-white text-xs">
                      {player?.name || `Seat ${seat}`}
                    </span>
                  </div>
                </div>
              );
            })}
            {room.currentTrick.length === 0 && (
              <div className="text-yellow-200/70 text-sm italic">
                Cards played will appear here
              </div>
            )}
          </div>
        </div>

        {/* Trump and turn indicator */}
        <div className="mt-2 flex flex-col items-center">
          {room.gameState.trump && (
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded mb-1 border border-yellow-900">
              <span className="text-yellow-200 text-xs">Trump: </span>
              <span className="font-bold text-white">
                {room.gameState.trump}
              </span>
            </div>
          )}
          {!room.gameState.trump && (
            <span className="text-yellow-200 text-xs tracking-wider">
              Play Area
            </span>
          )}
          {room.currentPlayer && (
            <div className="text-green-300 text-xs mt-1 animate-pulse">
              Current turn: Seat {room.currentPlayer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
