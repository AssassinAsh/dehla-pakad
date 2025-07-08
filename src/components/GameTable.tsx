import { Room, Player } from "@/types/game";
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

// Helper to get player by seat
const getPlayerAtSeat = (room: Room, seat: number) =>
  room.players.find((p) => p.seat === seat);

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

      {/* Seats and player info (no tiles below table) */}
      {seatOrder.map((seat, idx) => {
        const player = room.players.find((p) => p.seat === seat);
        const isCurrent = player?.id === currentPlayerId;
        return (
          <div
            key={seat}
            className={
              seatPositions[idx].style +
              " z-10 flex flex-col items-center select-none"
            }
            onClick={() => onSeatClick && !player && onSeatClick(seat)}
          >
            {/* Seat circle */}
            <div
              className={
                "w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-200 " +
                (isCurrent
                  ? "border-blue-400 bg-blue-900/80 shadow-lg"
                  : player
                  ? "border-yellow-400 bg-yellow-900/80 shadow"
                  : "border-gray-500 bg-gray-800/60 opacity-60")
              }
            >
              {player ? (
                <div className="flex flex-col items-center text-center">
                  <span className="text-base font-bold truncate text-white max-w-[3.5rem]">
                    {player.name}
                  </span>
                  <span className="text-xs text-yellow-200 font-normal">
                    {player.hand.length} cards
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-300">Seat {seat}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Trick cards in center (play area) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="w-48 h-32 flex items-center justify-center relative border-2 border-dashed border-yellow-400 rounded-xl bg-green-900/40">
          <div className="flex flex-row gap-8 items-center justify-center">
            {room.currentTrick.map(({ card, seat }, idx) => (
              <div
                key={`${card.id}-${seat}-${idx}`}
                className="relative flex flex-col items-center animate-fade-in"
              >
                <Image
                  src={`/cards/${card.rank}${card.suit[0].toUpperCase()}.png`}
                  alt={getCardDisplayName(card)}
                  width={48}
                  height={72}
                  className="rounded shadow-lg"
                />
                <span className="text-white text-xs mt-1">Seat {seat}</span>
              </div>
            ))}
          </div>
        </div>
        <span className="mt-2 text-yellow-200 text-xs tracking-wider">
          Play Area
        </span>
      </div>
    </div>
  );
}
