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

  // Helper function to get team styling based on seat number
  const getTeamStyle = (seat: number) => {
    // Team 1: Seats 1 & 3
    if (seat === 1 || seat === 3) {
      return {
        card: "bg-blue-500/30 border-blue-500",
        background: "bg-blue-900",
        label: "text-blue-200",
        border: "border-blue-600",
        text: "text-blue-200",
      };
    }
    // Team 2: Seats 2 & 4
    return {
      card: "bg-green-500/30 border-green-500",
      background: "bg-green-900",
      label: "text-green-200",
      border: "border-green-600",
      text: "text-green-200",
    };
  };

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

        {/* Top bar for scores and trump */}
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

          {/* Trump Indicator */}
          {room.gameState.trump && (
            <div className="bg-gradient-to-b from-purple-800 to-purple-900 text-white text-xs md:text-sm px-3 py-1 md:py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-purple-600 shadow-lg flex flex-col items-center">
              <span className="font-bold">Trump</span>
              <span
                className={`font-bold text-3xl leading-none ${getSuitColor(
                  room.gameState.trump
                )}`}
              >
                {getSuitSymbol(room.gameState.trump)}
              </span>
            </div>
          )}

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

        {/* Players seated around the table */}
        {seatOrder.map((seat, index) => {
          const player = room.players.find((p) => p.seat === seat);
          const teamStyle = getTeamStyle(seat);
          const positionStyle = seatPositions[index].style;
          const isCurrentPlayer = player?.id === currentPlayerId;

          return (
            <div
              key={seat}
              className={`${positionStyle} z-10 flex flex-col items-center select-none`}
              onClick={() => onSeatClick && !player && onSeatClick(seat)}
            >
              {/* Seat rectangle */}
              <div
                className={`w-20 md:w-28 px-2 md:px-3 py-1.5 md:py-2.5 rounded-lg flex items-center justify-center border-l-2 md:border-l-4 shadow-xl transition-all duration-200 text-sm md:text-base ${
                  isCurrentPlayer
                    ? "border-yellow-400 bg-gradient-to-r from-blue-900 to-blue-800 ring-2 ring-yellow-300 ring-opacity-50"
                    : player
                    ? "border-yellow-600 bg-gradient-to-r from-yellow-900 to-amber-950"
                    : "border-gray-500 bg-gradient-to-r from-gray-800 to-gray-900 opacity-80 hover:opacity-100 hover:from-gray-700 cursor-pointer"
                }`}
              >
                {player ? (
                  <div className="flex flex-col items-center text-center">
                    <span className="text-sm md:text-base font-bold truncate text-white max-w-[4.5rem] md:max-w-[5rem]">
                      {player.name}
                    </span>
                    <div className="flex items-center mt-0.5 md:mt-1">
                      <span className="text-[10px] md:text-xs text-yellow-200 font-medium">
                        {player.hand.length} cards
                      </span>
                      {isCurrentPlayer && (
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

              {/* Small team indicator */}
              {player && (
                <div
                  className={`${teamStyle.background} text-xs px-2 py-0.5 rounded-b-md mt-1 text-white opacity-80`}
                >
                  Team {seat === 1 || seat === 3 ? "1" : "2"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
