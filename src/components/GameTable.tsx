import { Room } from "@/types/game";
import Image from "next/image";
import PlayArea from "./PlayArea";
import { getSuitSymbol } from "@/utils/gameUtils";

interface GameTableProps {
  room: Room;
  dealerSeat?: number;
  currentPlayerId?: string;
  onSeatClick?: (seat: number) => void;
}

// Defines the position styling for each seat based on local player's perspective
const seatPositions = [
  { name: "bottom", style: "absolute left-1/2 bottom-3 -translate-x-1/2" },
  { name: "left", style: "absolute left-3 top-1/2 -translate-y-1/2" },
  { name: "top", style: "absolute left-1/2 top-3 -translate-x-1/2" },
  { name: "right", style: "absolute right-3 top-1/2 -translate-y-1/2" },
];

/**
 * GameTable component - Displays the main game table with players, cards, and game state
 */
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

  // Calculate team scores
  const team1Scores = room.gameState.scores.team1;
  const team2Scores = room.gameState.scores.team2;

  // Helper to get suit color
  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative flex items-center justify-center shadow-2xl">
      {/* Table background with felt texture */}
      <div className="w-full aspect-[2/1] bg-gradient-to-b from-green-800 to-green-900 rounded-2xl relative border-4 md:border-8 border-yellow-800 overflow-hidden p-3 md:p-8">
        {/* Table texture overlay */}
        <div className="absolute inset-0 bg-[url('/table-texture.png')] opacity-20 mix-blend-overlay"></div>

        {/* Subtle inner shadow */}
        <div className="absolute inset-0 shadow-inner rounded-xl pointer-events-none"></div>

        {/* Top bar for scores only (remove trump from here) */}
        <div className="absolute top-0 left-0 w-full flex justify-between items-start z-10 transform -translate-y-5 md:-translate-y-7 px-4">
          {/* Team 1 Score */}
          <div className="bg-gradient-to-b from-blue-800 to-blue-900 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-blue-600 shadow-lg text-center">
            <div className="font-bold">Team 1 (1&3)</div>
            <div className="font-bold text-yellow-300 text-base md:text-lg">
              {team1Scores.tricks}
              <span className="text-sm text-blue-200"> tricks</span>
            </div>
            <div className="text-xs text-blue-200">
              {team1Scores.tens} tens captured
            </div>
          </div>

          {/* Team 2 Score */}
          <div className="bg-gradient-to-b from-green-800 to-green-900 text-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-green-600 shadow-lg text-center">
            <div className="font-bold">Team 2 (2&4)</div>
            <div className="font-bold text-yellow-300 text-base md:text-lg">
              {team2Scores.tricks}
              <span className="text-sm text-green-200"> tricks</span>
            </div>
            <div className="text-xs text-green-200">
              {team2Scores.tens} tens captured
            </div>
          </div>
        </div>

        {/* Trump Indicator - premium badge style */}
        {room.gameState.trump && (
          <div className="absolute top-2 right-[22%] z-30 flex flex-col items-center">
            <div className="flex flex-col items-center bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-yellow-400 shadow-[0_0_16px_4px_rgba(251,191,36,0.25)] rounded-full px-4 py-2 min-w-[56px]">
              <span
                className={`text-3xl font-extrabold drop-shadow-sm ${getSuitColor(
                  room.gameState.trump
                )}`}
              >
                {getSuitSymbol(room.gameState.trump)}
              </span>
              <span className="text-xs font-bold text-yellow-200 mt-1 tracking-wide uppercase">
                Trump
              </span>
            </div>
          </div>
        )}

        {/* Trump Card Display - More prominent when just set */}
        {room.gameState.trump && room.gameState.trumpJustSet && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="relative">
              <div className="bg-white p-1 rounded-lg border-4 border-yellow-500 shadow-2xl transform transition-all duration-700 animate-flip">
                <div className="flex flex-col items-center">
                  <div className="bg-yellow-100 p-2 rounded-t-md w-full text-center">
                    <span className="font-bold text-lg">Trump Set!</span>
                  </div>
                  <div className="p-4 flex flex-col items-center bg-white rounded-b-md">
                    <span
                      className={`text-6xl font-bold ${getSuitColor(
                        room.gameState.trump
                      )}`}
                    >
                      {getSuitSymbol(room.gameState.trump)}
                    </span>
                    <span className="mt-2 text-sm font-semibold text-gray-800">
                      {room.gameState.trump.charAt(0).toUpperCase() +
                        room.gameState.trump.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Decorative cards underneath for a more dramatic effect */}
              <div className="absolute -bottom-2 -right-2 -z-10 w-full h-full bg-white rounded-lg border-2 border-gray-300 transform rotate-3"></div>
              <div className="absolute -bottom-4 -left-2 -z-20 w-full h-full bg-white rounded-lg border-2 border-gray-300 transform -rotate-3"></div>
            </div>
          </div>
        )}

        {/* Dealer & Deck - shown during dealing phase */}
        {isDealing && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
            {/* Animated card deck with shadow */}
            <div className="relative">
              {/* Multiple stacked cards for a deck effect */}
              <div className="absolute -left-1 -top-1 opacity-40">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={64}
                  height={90}
                  className="rounded-md"
                />
              </div>
              <div className="absolute -left-0.5 -top-0.5 opacity-70">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={64}
                  height={90}
                  className="rounded-md"
                />
              </div>
              <Image
                src="/cards/back.png"
                alt="Deck"
                width={64}
                height={90}
                className="rounded-md drop-shadow-lg animate-bounce relative z-10"
              />
            </div>

            {/* Dealer indicator */}
            {dealerSeat && (
              <span className="mt-3 text-yellow-300 font-bold text-sm bg-black/70 px-3 py-1.5 rounded-md border border-yellow-800 shadow-lg">
                Dealer: Seat {dealerSeat}
              </span>
            )}
          </div>
        )}

        {/* Play area where cards are played */}
        <div className="absolute inset-0 flex items-center justify-center p-10 md:p-16">
          <PlayArea room={room} mySeat={mySeat} />
        </div>

        {/* Player Avatars at 4 sides */}
        {seatOrder.map((seat, idx) => {
          const player = room.players.find((p) => p.seat === seat);
          const isActive = room.currentPlayer === seat;
          return (
            <div
              key={seat}
              className={`${seatPositions[idx].style} z-20 flex flex-col items-center select-none`}
              style={{ minWidth: 60 }}
              onClick={() => !player && onSeatClick && onSeatClick(seat)}
            >
              {player ? (
                <>
                  <div
                    className={`avatar${
                      isActive ? " active" : ""
                    } shadow-lg mb-1 transition-all duration-300`}
                    title={player.name}
                    tabIndex={0}
                    role="button"
                    aria-label={`Player ${player.name}`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white drop-shadow-sm text-center px-1">
                    {player.name}
                    {dealerSeat === seat && (
                      <span className="ml-1 text-yellow-300 font-bold">
                        (D)
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <div
                    className="avatar bg-gray-700 opacity-70 mb-1 border-dashed border-2 border-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-600 hover:opacity-100 transition-all duration-200"
                    title="Join this seat"
                    tabIndex={0}
                    role="button"
                    aria-label={`Join seat ${seat}`}
                  >
                    +
                  </div>
                  <span className="text-xs font-semibold text-gray-200 drop-shadow-sm text-center px-1">
                    Empty Seat
                  </span>
                </>
              )}
              {/* Show seat number for clarity on mobile */}
              <span className="text-[10px] text-gray-300">Seat {seat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
