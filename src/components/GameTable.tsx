import { Room } from "@/types/game";
import Image from "next/image";
import PlayArea from "./PlayArea";
import { getSuitSymbol } from "@/utils/gameUtils";

interface GameTableProps {
  room: Room;
  dealerSeat?: number;
  currentPlayerId?: string;
  onSeatClick?: (seat: number) => void;
  onAddBot?: (seat: number) => void;
  isHost?: boolean;
}

/**
 * GameTable component - Displays the main game table with players, cards, and game state
 */
export default function GameTable({
  room,
  dealerSeat,
  currentPlayerId,
  onSeatClick,
  onAddBot,
  isHost = false,
}: GameTableProps) {
  const isDealing = room.gameState?.dealing || false;

  // Find the local player's seat
  const currentPlayer = room.players?.find((p) => p.id === currentPlayerId);
  const mySeat = currentPlayer?.seat || 1;

  // Rotate seat order so local player is always at the bottom
  const seatOrder = [0, 1, 2, 3].map((i) => ((mySeat - 1 + i) % 4) + 1);

  // Calculate team scores
  const team1Scores = room.gameState?.scores?.team1 || { tricks: 0, tens: 0 };
  const team2Scores = room.gameState?.scores?.team2 || { tricks: 0, tens: 0 };

  // Helper to get suit color
  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative flex flex-col items-center justify-center px-2 sm:px-4">
      {/* Responsive game table container */}
      <div className="w-full h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] max-h-[600px] bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-2xl md:rounded-3xl relative border-4 md:border-6 border-yellow-700 shadow-2xl overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 mb-20 sm:mb-24 md:mb-0">
        {/* Enhanced table texture with better blend mode */}
        <div className="absolute inset-0 bg-[url('/table-texture.png')] opacity-25 mix-blend-overlay pointer-events-none" />
        {/* Realistic felt texture overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-green-800/10 to-green-900/20 pointer-events-none" />
        {/* Enhanced inner shadow for depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl pointer-events-none" />

        {/* Modernized Team Score Cards with better spacing */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-30">
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-blue-300 shadow-xl font-bold flex flex-col items-center min-w-[80px] sm:min-w-[90px] md:min-w-[100px] backdrop-blur-sm">
            <span className="font-bold text-blue-100 text-sm sm:text-base">
              Team 1
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] sm:text-xs text-blue-200">
                Tricks:
              </span>
              <span className="text-yellow-300 text-lg sm:text-xl font-black">
                {team1Scores.tricks}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-blue-200">
                Tens:
              </span>
              <span className="text-green-300 text-sm sm:text-base font-bold">
                {team1Scores.tens}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-30">
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-orange-300 shadow-xl font-bold flex flex-col items-center min-w-[80px] sm:min-w-[90px] md:min-w-[100px] backdrop-blur-sm">
            <span className="font-bold text-orange-100 text-sm sm:text-base">
              Team 2
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] sm:text-xs text-orange-200">
                Tricks:
              </span>
              <span className="text-yellow-300 text-lg sm:text-xl font-black">
                {team2Scores.tricks}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-orange-200">
                Tens:
              </span>
              <span className="text-green-300 text-sm sm:text-base font-bold">
                {team2Scores.tens}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced trump indicator moved higher and outside play area */}
        {room.gameState?.trump && (
          <div className="absolute top-[8%] sm:top-[6%] right-[20%] sm:right-[18%] md:right-[22%] z-30 flex flex-col items-center">
            <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 border-3 border-yellow-400 shadow-xl rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center backdrop-blur-sm">
              <span
                className={`text-2xl sm:text-3xl font-black drop-shadow-lg ${getSuitColor(
                  room.gameState.trump
                )}`}
              >
                {getSuitSymbol(room.gameState.trump)}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-yellow-200 mt-1 tracking-wider uppercase leading-none bg-black/30 px-2 py-0.5 rounded-full">
              Trump
            </span>
          </div>
        )}

        {/* Enhanced Trump Card Display with better animation */}
        {room.gameState?.trump && room.gameState?.trumpJustSet && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="relative animate-in zoom-in-50 duration-700">
              <div className="bg-white p-2 rounded-xl border-4 border-yellow-500 shadow-2xl transform transition-all duration-700">
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 p-3 rounded-t-lg w-full text-center shadow-lg">
                    <span
                      className="font-black text-xl sm:text-2xl text-purple-900 drop-shadow-lg px-4 py-2 rounded bg-yellow-200/90"
                      style={{ textShadow: "0 2px 8px #fff, 0 0 2px #000" }}
                    >
                      Trump Set!
                    </span>
                  </div>
                  <div className="p-6 flex flex-col items-center bg-white rounded-b-lg">
                    <span
                      className={`text-7xl sm:text-8xl font-black ${getSuitColor(
                        room.gameState?.trump || "spades"
                      )}`}
                    >
                      {getSuitSymbol(room.gameState?.trump || "spades")}
                    </span>
                    <span className="mt-3 text-base sm:text-lg font-bold text-gray-800 capitalize">
                      {room.gameState?.trump}
                    </span>
                  </div>
                </div>
              </div>
              {/* Enhanced decorative cards */}
              <div className="absolute -bottom-3 -right-3 -z-10 w-full h-full bg-white rounded-xl border-2 border-gray-300 transform rotate-6 opacity-60"></div>
              <div className="absolute -bottom-6 -left-3 -z-20 w-full h-full bg-white rounded-xl border-2 border-gray-300 transform -rotate-6 opacity-40"></div>
            </div>
          </div>
        )}

        {/* Enhanced dealing animation with modern cards */}
        {isDealing && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
            <div className="relative animate-pulse">
              <div className="absolute -left-2 -top-2 opacity-30">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={72}
                  height={100}
                  style={{ width: "auto", height: "auto" }}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div className="absolute -left-1 -top-1 opacity-60">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={72}
                  height={100}
                  style={{ width: "auto", height: "auto" }}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <Image
                src="/cards/back.png"
                alt="Deck"
                width={72}
                height={100}
                style={{ width: "auto", height: "auto" }}
                className="rounded-lg drop-shadow-2xl animate-bounce relative z-10"
              />
            </div>
            {dealerSeat && (
              <span className="mt-4 text-yellow-300 font-bold text-sm sm:text-base bg-black/80 px-4 py-2 rounded-full border border-yellow-600 shadow-xl backdrop-blur-sm">
                Dealer: Seat {dealerSeat}
              </span>
            )}
          </div>
        )}

        {/* Improved play area with proper spacing */}
        <div className="absolute inset-[15%] sm:inset-[12%] md:inset-[15%] lg:inset-[18%] flex items-center justify-center">
          <PlayArea room={room} mySeat={mySeat} />

          {/* Enhanced turn indicator with better visibility */}
          {room.gameState?.status === "in-progress" &&
            room.currentPlayer === mySeat &&
            room.currentTrick?.length < 4 &&
            room.players?.some((player) => player.hand?.length > 0) && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                <div
                  className="bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full border-3 border-green-300 shadow-2xl animate-pulse font-bold text-base sm:text-lg flex items-center gap-2 sm:gap-3 backdrop-blur-sm"
                  style={{ boxShadow: "0 12px 40px rgba(34, 197, 94, 0.6)" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-6 sm:w-6 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                  <span className="font-black">Your Turn</span>
                </div>
              </div>
            )}
        </div>

        {/* Player Avatars - mobile: vertical stack, desktop: 2x2 */}
        {/* Top (opponent) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          {renderSeat(seatOrder[2])}
        </div>
        {/* Left (seat 2) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
          {renderSeat(seatOrder[1])}
        </div>
        {/* Right (seat 4) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
          {renderSeat(seatOrder[3])}
        </div>
        {/* Bottom (you) - back to original position with smaller size */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          {renderSeat(seatOrder[0])}
        </div>
      </div>
    </div>
  );

  // Helper to render a seat/avatar
  function renderSeat(seat: number) {
    const player = room.players?.find((p) => p.seat === seat);
    const isActive = room.currentPlayer === seat;
    const isMe = player && player.id === currentPlayerId;
    const isDealer = dealerSeat === seat;
    const isTeam1 = seat % 2 === 1;
    const teamColor = isTeam1 ? "team1" : "team2";
    return (
      <div
        className={`relative flex flex-col items-center select-none ${
          isActive ? "animate-seat-glow-gold" : ""
        }`}
        style={{ minWidth: 60 }}
        onClick={() => !player && onSeatClick && onSeatClick(seat)}
      >
        {/* Name and seat info - moved above avatar */}
        <span
          className={`text-[10px] font-semibold text-center px-1 mb-0.5 ${
            isMe
              ? teamColor === "team1"
                ? "text-blue-200 font-bold"
                : "text-orange-200 font-bold"
              : player
              ? teamColor === "team1"
                ? "text-blue-200"
                : "text-orange-200"
              : "text-gray-200"
          }`}
        >
          {player ? `${player.name}${isDealer ? " (D)" : ""}` : "Empty Seat"}
        </span>

        <div
          className={`relative rounded-xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center shadow-xl border-3 transition-all duration-300 cursor-pointer group
            ${
              player
                ? isActive
                  ? "border-yellow-400 bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50 shadow-yellow-400/50"
                  : teamColor === "team1"
                  ? "border-blue-400 bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-blue-200/60"
                  : "border-orange-400 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 shadow-orange-200/40"
                : "border-dashed border-yellow-400 bg-gradient-to-br from-yellow-50/80 to-yellow-100/60 animate-seat-invite hover:from-yellow-100 hover:to-yellow-200"
            }
            ${
              isMe && !isActive
                ? teamColor === "team1"
                  ? "ring-2 ring-blue-300/60 ring-offset-1"
                  : "ring-2 ring-orange-300/60 ring-offset-1"
                : ""
            }
          `}
        >
          {/* Team indicator corners */}
          {player && (
            <>
              <div
                className={`absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full border border-white shadow-sm ${
                  teamColor === "team1" ? "bg-blue-500" : "bg-orange-500"
                }`}
              />
              <div
                className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-white shadow-sm ${
                  teamColor === "team1" ? "bg-blue-500" : "bg-orange-500"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border border-white shadow-sm ${
                  teamColor === "team1" ? "bg-blue-500" : "bg-orange-500"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white shadow-sm ${
                  teamColor === "team1" ? "bg-blue-500" : "bg-orange-500"
                }`}
              />
            </>
          )}

          {/* Player avatar or empty seat */}
          {player ? (
            <div className="relative">
              <div
                className={`w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shadow-inner transition-all duration-300 group-hover:scale-105
                  ${
                    teamColor === "team1"
                      ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-blue-500/50"
                      : "bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-orange-500/50"
                  }
                `}
                title={player.name}
                tabIndex={0}
                role="button"
                aria-label={`Player ${player.name}`}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>

              {/* Glow effect for active player */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg bg-yellow-400/20 animate-pulse pointer-events-none" />
              )}
            </div>
          ) : (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-300 flex items-center justify-center font-bold text-2xl md:text-3xl text-yellow-700 shadow-inner transition-all duration-200 group-hover:scale-110 group-hover:from-yellow-300 group-hover:to-yellow-400">
              +
            </div>
          )}
        </div>

        {/* Bot controls for host on empty seats */}
        {!player && isHost && !room.gameStarted && onAddBot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddBot(seat);
            }}
            className="mt-1 text-[10px] font-bold text-purple-300 bg-purple-900/80 px-2 py-1 rounded-full border border-purple-600 hover:bg-purple-800/90 transition-colors cursor-pointer"
            title="Add Bot"
          >
            Add Bot
          </button>
        )}

        {/* Take a Seat prompt for unseated users */}
        {!player &&
          !room.players?.some(
            (p) => p.id === currentPlayerId && p.seat !== null
          ) &&
          !isHost && (
            <span className="mt-1 text-[11px] font-bold text-yellow-300 animate-bounce pointer-events-none select-none">
              Take a Seat!
            </span>
          )}
      </div>
    );
  }
}
