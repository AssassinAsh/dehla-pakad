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
    <div className="w-full max-w-3xl mx-auto relative flex flex-col md:flex-row items-center justify-center shadow-2xl px-2 sm:px-4">
      {/* Mobile-first vertical layout with max height for mobile */}
      <div className="w-full aspect-[3/4] md:aspect-[2/1] max-h-[60vh] md:max-h-none bg-gradient-to-b from-green-800 to-green-900 rounded-2xl relative border-4 md:border-8 border-yellow-800 overflow-hidden p-2 sm:p-3 md:p-8 flex flex-col items-center justify-between mb-24 md:mb-0">
        {/* Table texture overlay */}
        <div className="absolute inset-0 bg-[url('/table-texture.png')] opacity-20 mix-blend-overlay pointer-events-none" />
        {/* Subtle inner shadow */}
        <div className="absolute inset-0 shadow-inner rounded-xl pointer-events-none" />

        {/* Team 1 Score - top left */}
        <div className="absolute top-3 left-3 z-30">
          <div className="bg-gradient-to-b from-blue-900 to-blue-700 text-blue-100 text-xs px-2 py-1 rounded-full border-2 border-blue-700 shadow font-bold flex flex-col items-center min-w-[54px] md:min-w-[70px]">
            <span className="font-bold">T1</span>
            <span className="text-yellow-300 text-base">
              {team1Scores.tricks}
            </span>
            <span className="text-[10px] text-blue-200">
              {team1Scores.tens} tens
            </span>
          </div>
        </div>
        {/* Team 2 Score - top right */}
        <div className="absolute top-3 right-3 z-30">
          <div className="bg-gradient-to-b from-green-900 to-green-700 text-green-100 text-xs px-2 py-1 rounded-full border-2 border-green-700 shadow font-bold flex flex-col items-center min-w-[54px] md:min-w-[70px]">
            <span className="font-bold">T2</span>
            <span className="text-yellow-300 text-base">
              {team2Scores.tricks}
            </span>
            <span className="text-[10px] text-green-200">
              {team2Scores.tens} tens
            </span>
          </div>
        </div>

        {/* Trump indicator, more prominent on mobile, centered at top */}
        {room.gameState.trump && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
            <div className="bg-gradient-to-b from-purple-700 to-purple-900 border-2 border-yellow-400 shadow-lg rounded-full w-10 h-10 flex items-center justify-center">
              <span
                className={`text-2xl font-extrabold drop-shadow-sm ${getSuitColor(
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
            <div className="relative">
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
            {dealerSeat && (
              <span className="mt-3 text-yellow-300 font-bold text-sm bg-black/70 px-3 py-1.5 rounded-md border border-yellow-800 shadow-lg">
                Dealer: Seat {dealerSeat}
              </span>
            )}
          </div>
        )}

        {/* Play area where cards are played */}
        <div className="relative flex-1 flex items-center justify-center w-full min-h-[120px] md:min-h-[200px] py-4 md:py-10">
          <PlayArea room={room} mySeat={mySeat} />
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
        {/* Bottom (you) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          {renderSeat(seatOrder[0])}
        </div>
      </div>
    </div>
  );

  // Helper to render a seat/avatar
  function renderSeat(seat: number) {
    const player = room.players.find((p) => p.seat === seat);
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
        style={{ minWidth: 70 }}
        onClick={() => !player && onSeatClick && onSeatClick(seat)}
      >
        <div
          className={`rounded-full w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-1 shadow-xl border-4 transition-all duration-300
            ${
              player
                ? isActive
                  ? "border-yellow-400 bg-gradient-to-b from-yellow-100/80 to-yellow-200/60"
                  : teamColor === "team1"
                  ? "border-blue-700 bg-gradient-to-b from-blue-900/80 to-blue-700/60"
                  : "border-green-700 bg-gradient-to-b from-green-900/80 to-green-700/60"
                : "border-dashed border-yellow-300 bg-gradient-to-b from-yellow-50/80 to-yellow-100/60 animate-seat-invite"
            }
            ${isMe && !isActive ? "animate-seat-glow-soft" : ""}
          `}
        >
          {player ? (
            <span
              className={`avatar flex items-center justify-center font-bold text-xl md:text-2xl
                ${isMe ? "text-yellow-100 scale-110" : "text-white"}
                w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-900/90 shadow-xl transition-all duration-300`}
              title={player.name}
              tabIndex={0}
              role="button"
              aria-label={`Player ${player.name}`}
            >
              {player.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span
              className="avatar flex items-center justify-center font-bold text-xl md:text-2xl text-yellow-700 w-12 h-12 md:w-16 md:h-16 rounded-full bg-yellow-100/80 border-2 border-yellow-300 shadow transition-all duration-200 cursor-pointer"
              title="Join this seat"
              tabIndex={0}
              role="button"
              aria-label={`Join seat ${seat}`}
            >
              +
            </span>
          )}
          {/* 'You' badge */}
          {isMe && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-yellow-600 shadow-md z-10">
              You
            </span>
          )}
          {/* Dealer badge */}
          {isDealer && (
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-purple-700 text-yellow-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-900 shadow z-10">
              Dealer
            </span>
          )}
        </div>
        {/* Name and seat info */}
        <span
          className={`text-xs font-semibold text-center px-1 mt-1 ${
            isMe
              ? "text-yellow-300 font-bold"
              : player
              ? teamColor === "team1"
                ? "text-blue-300"
                : "text-green-200"
              : "text-gray-200"
          }`}
        >
          {player ? player.name : "Empty Seat"}
        </span>
        {/* Take a Seat prompt for unseated users */}
        {!player && !room.players.some((p) => p.id === currentPlayerId) && (
          <span className="mt-1 text-[11px] font-bold text-yellow-300 animate-bounce pointer-events-none select-none">
            Take a Seat!
          </span>
        )}
      </div>
    );
  }
}
