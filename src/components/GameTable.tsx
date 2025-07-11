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
  const isSeated = !!currentPlayer;

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
          <div className="bg-gradient-to-b from-blue-900 to-blue-700 text-blue-100 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-blue-700 shadow-lg text-center font-bold">
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
          <div className="bg-gradient-to-b from-green-900 to-green-700 text-green-100 text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 rounded-t-md border-t-2 border-l-2 border-r-2 border-green-700 shadow-lg text-center font-bold">
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

        {/* Trump Indicator - small square, pinned between top seat and right scorecard */}
        {room.gameState.trump && (
          <div className="absolute top-0 right-[30%] z-30 flex flex-col items-center">
            <div className="flex flex-col items-center bg-gradient-to-b from-purple-700 to-purple-900 border border-yellow-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.18)] rounded-lg w-8 h-8 justify-center">
              <span
                className={`text-lg font-extrabold drop-shadow-sm ${getSuitColor(
                  room.gameState.trump
                )}`}
              >
                {getSuitSymbol(room.gameState.trump)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-yellow-200 mt-1 tracking-wide uppercase leading-none">
              Trump
            </span>
          </div>
        )}

        {/* Trump Card Display - More prominent when just set */}
        {room.gameState.trump && room.gameState.trumpJustSet && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="relative">
              <div className="bg-white p-1 rounded-lg border-4 border-yellow-500 shadow-2xl transform transition-all duration-700 animate-flip-short">
                <div className="flex flex-col items-center">
                  <div className="bg-yellow-400 p-2 rounded-t-md w-full text-center shadow-md">
                    <span
                      className="font-extrabold text-xl text-purple-900 drop-shadow-lg px-3 py-1 rounded bg-yellow-200/90"
                      style={{ textShadow: "0 2px 8px #fff, 0 0 2px #000" }}
                    >
                      Trump Set!
                    </span>
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
          const isMe = player && player.id === currentPlayerId;
          // Team color: team 1 (seats 1 & 3) = blue, team 2 (seats 2 & 4) = green
          const isTeam1 = seat % 2 === 1;
          const teamColor = isTeam1 ? "team1" : "team2";
          return (
            <div
              key={seat}
              className={`${seatPositions[idx].style} z-20 flex flex-col items-center select-none`}
              style={{ minWidth: 60 }}
              onClick={() => !player && onSeatClick && onSeatClick(seat)}
            >
              {/* Seat base */}
              <div
                className={`rounded-xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-1 shadow-lg transition-all duration-300
                ${
                  player
                    ? isActive
                      ? "border-4 border-yellow-400 animate-seat-glow-gold bg-gradient-to-b from-yellow-100/80 to-yellow-200/60"
                      : teamColor === "team1"
                      ? "border-2 border-blue-700 bg-gradient-to-b from-blue-900/80 to-blue-700/60"
                      : "border-2 border-green-700 bg-gradient-to-b from-green-900/80 to-green-700/60"
                    : "!border-2 border-dashed border-yellow-300 bg-gradient-to-b from-yellow-50/80 to-yellow-100/60 animate-seat-invite"
                }
                ${isMe && !isActive ? "animate-seat-glow-soft" : ""}
              `}
              >
                {player ? (
                  <>
                    <div
                      className={`avatar flex items-center justify-center font-bold text-lg md:text-xl
                        ${isMe ? "text-yellow-100 scale-110" : "text-white"}
                        w-10 h-10 md:w-14 md:h-14 rounded-lg bg-gray-900/90 shadow-xl transition-all duration-300`}
                      title={player.name}
                      tabIndex={0}
                      role="button"
                      aria-label={`Player ${player.name}`}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`avatar flex items-center justify-center font-bold text-lg md:text-xl text-yellow-700 w-10 h-10 md:w-14 md:h-14 rounded-lg bg-yellow-100/80 border-2 border-yellow-300 shadow transition-all duration-200 cursor-pointer ${
                        !isSeated ? "animate-pulse-seat" : ""
                      }`}
                      title="Join this seat"
                      tabIndex={0}
                      role="button"
                      aria-label={`Join seat ${seat}`}
                    >
                      +
                    </div>
                  </>
                )}
                {/* 'You' badge, above the seat base, only for your own seat */}
                {isMe && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-600 shadow-md z-10">
                    You
                  </span>
                )}
              </div>
              {/* Name and seat info */}
              <span
                className={`text-xs font-semibold text-center px-1 ${
                  isMe
                    ? "text-yellow-300 font-bold"
                    : player
                    ? teamColor === "team1"
                      ? "text-blue-300"
                      : "text-green-200"
                    : "text-gray-200"
                }`}
              >
                {player ? (
                  <>
                    {player.name}
                    {dealerSeat === seat && (
                      <span className="ml-1 text-yellow-300 font-bold">
                        (D)
                      </span>
                    )}
                  </>
                ) : (
                  "Empty Seat"
                )}
              </span>
              {/* Take a Seat prompt for unseated users */}
              {!player && !isSeated && (
                <span className="mt-1 text-[11px] font-bold text-yellow-300 animate-bounce pointer-events-none select-none">
                  Take a Seat!
                </span>
              )}
            </div>
          );
        })}
        {/* Pulsing seat animation and seat glow */}
        <style jsx global>{`
          @keyframes pulse-seat {
            0% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(251, 191, 36, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
            }
          }
          .animate-pulse-seat {
            animation: pulse-seat 1.2s infinite;
            border-color: #fbbf24 !important;
          }
          @keyframes flip-short {
            0% {
              transform: rotateY(90deg) scale(0.7);
              opacity: 0.2;
            }
            40% {
              transform: rotateY(-10deg) scale(1.05);
              opacity: 1;
            }
            60% {
              transform: rotateY(10deg) scale(0.98);
            }
            100% {
              transform: rotateY(0deg) scale(1);
              opacity: 1;
            }
          }
          .animate-flip-short {
            animation: flip-short 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          @keyframes seat-glow {
            0% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
            }
            70% {
              box-shadow: 0 0 16px 8px rgba(34, 197, 94, 0.15);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            }
          }
          .animate-seat-glow {
            animation: seat-glow 1.2s infinite;
            border-color: #22c55e !important;
          }
          .animate-seat-glow-inner {
            animation: seat-glow 1.2s infinite;
            box-shadow: 0 0 12px 2px #22c55e99;
          }
          @keyframes seat-invite {
            0% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
            }
            70% {
              box-shadow: 0 0 16px 8px rgba(251, 191, 36, 0.15);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
            }
          }
          .animate-seat-invite {
            animation: seat-invite 1.2s infinite;
            border-color: #fbbf24 !important;
          }
          @keyframes seat-glow-gold {
            0% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
            }
            70% {
              box-shadow: 0 0 16px 8px rgba(251, 191, 36, 0.18);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
            }
          }
          .animate-seat-glow-gold {
            animation: seat-glow-gold 1.2s infinite;
            border-color: #fbbf24 !important;
          }
          @keyframes seat-glow-soft {
            0% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.18);
            }
            70% {
              box-shadow: 0 0 8px 4px rgba(251, 191, 36, 0.1);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
            }
          }
          .animate-seat-glow-soft {
            animation: seat-glow-soft 1.2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
