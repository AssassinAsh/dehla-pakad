import { Room, Card } from "@/types/game";
import { Socket } from "socket.io-client";
import Image from "next/image";
import PlayArea from "./PlayArea";
import { useAudio } from "@/hooks/useAudio";
import { useState, useEffect } from "react";
import { getSuitSymbol } from "@/utils/gameUtils";

interface GameTableProps {
  room: Room;
  dealerSeat?: number;
  currentPlayerId?: string;
  onSeatClick?: (seat: number) => void;
  onAddBot?: (seat: number) => void;
  isHost?: boolean;
  socket?: Socket; // Socket.IO socket for listening to card dealing events
  onShowRules?: () => void; // Callback to show rules modal
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
  socket,
  onShowRules,
}: GameTableProps) {
  const isDealing = room.gameState?.dealing || false;
  const { playCardDeal, stopCardDeal } = useAudio();

  // Event-driven dealing animation state
  const [dealingCards, setDealingCards] = useState<
    Array<{
      id: string;
      targetSeat: number;
      startTime: number;
      position: { x: number; y: number };
      opacity: number;
    }>
  >([]);

  // Track previous scores for animations
  const [prevScores, setPrevScores] = useState({
    team1: { tricks: 0, tens: 0 },
    team2: { tricks: 0, tens: 0 },
  });

  // Update previous scores when current scores change
  useEffect(() => {
    const currentScores = {
      team1: room.gameState?.scores?.team1 || { tricks: 0, tens: 0 },
      team2: room.gameState?.scores?.team2 || { tricks: 0, tens: 0 },
    };

    // Check if scores have changed
    const hasChanged =
      prevScores.team1.tricks !== currentScores.team1.tricks ||
      prevScores.team1.tens !== currentScores.team1.tens ||
      prevScores.team2.tricks !== currentScores.team2.tricks ||
      prevScores.team2.tens !== currentScores.team2.tens;

    if (hasChanged) {
      setPrevScores(currentScores);
    }
  }, [room.gameState?.scores, prevScores]);

  // Listen for individual card dealing events from server
  useEffect(() => {
    if (!socket) {
      setDealingCards([]);
      return;
    }

    // Reset animation when dealing starts
    if (isDealing) {
      setDealingCards([]);
    } else {
      setDealingCards([]);
      return;
    }

    const handleCardDealt = (event: {
      type: string;
      data: {
        playerSeat: number;
        playerId: string;
        playerName: string;
        cards: Card[];
        dealingRound: number;
        totalCardsDealt: number;
      };
    }) => {
      if (event.type === "cardsDealtInitial") {
        const { playerSeat } = event.data;

        // Calculate position for this player's seat
        const seatPositions = {
          1: { x: 0, y: 180 }, // Bottom - closer
          2: { x: -250, y: 0 }, // Left - closer
          3: { x: 0, y: -180 }, // Top - closer
          4: { x: 250, y: 0 }, // Right - closer
        };

        const targetPos =
          seatPositions[playerSeat as keyof typeof seatPositions];
        if (!targetPos) return;

        // Create new dealing card animation for this specific player
        const newCard = {
          id: `deal-${playerSeat}-${Date.now()}-${Math.random()}`,
          targetSeat: playerSeat,
          startTime: Date.now(),
          position: { x: 0, y: 0 },
          opacity: 1,
        };

        setDealingCards((prev) => [...prev, newCard]);

        // Stop any existing card deal sound and play new one with slight delay for staggering
        stopCardDeal();
        const soundDelay = (playerSeat - 1) * 25; // 25ms offset per seat
        setTimeout(() => {
          playCardDeal().catch(console.warn);
        }, soundDelay);

        // Use a small timeout instead of requestAnimationFrame to ensure state is updated
        setTimeout(() => {
          setDealingCards((prev) =>
            prev.map((card) =>
              card.id === newCard.id
                ? { ...card, position: targetPos, opacity: 0.3 }
                : card
            )
          );
        }, 50);

        // Fallback cleanup after animation duration + buffer
        setTimeout(() => {
          setDealingCards((prev) =>
            prev.filter((card) => card.id !== newCard.id)
          );
        }, 270); // 50ms delay + 120ms animation + 100ms buffer
      }
    };

    // Listen for game events
    socket.on("gameEvent", handleCardDealt);

    return () => {
      socket.off("gameEvent", handleCardDealt);
    };
  }, [socket, isDealing, playCardDeal, stopCardDeal]);

  // Find the local player's seat
  const currentPlayer = room.players?.find((p) => p.id === currentPlayerId);
  const mySeat = currentPlayer?.seat || 1;

  // Rotate seat order so local player is always at the bottom
  const seatOrder = [0, 1, 2, 3].map((i) => ((mySeat - 1 + i) % 4) + 1);

  // Helper to get suit color
  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative flex flex-col items-center justify-center px-2 sm:px-4 mt-2 sm:mt-4">
      {/* Compact Score Display - Top Border Left */}
      <div className="absolute -top-1 sm:-top-2 left-6 sm:left-8 z-30">
        <div className="flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 sm:px-3 py-1 border border-white/20 shadow-lg">
          {/* Team 1 */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300 text-[10px] sm:text-xs font-medium">
              T1
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`text-yellow-300 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  prevScores.team1.tricks !==
                  (room.gameState?.scores?.team1?.tricks || 0)
                    ? "animate-bounce"
                    : ""
                }`}
              >
                {room.gameState?.scores?.team1?.tricks || 0}
              </span>
              <span className="text-gray-400 text-[8px] sm:text-xs">|</span>
              <span
                className={`text-green-300 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  prevScores.team1.tens !==
                  (room.gameState?.scores?.team1?.tens || 0)
                    ? "animate-bounce"
                    : ""
                }`}
              >
                {room.gameState?.scores?.team1?.tens || 0}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/30"></div>

          {/* Team 2 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span
                className={`text-yellow-300 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  prevScores.team2.tricks !==
                  (room.gameState?.scores?.team2?.tricks || 0)
                    ? "animate-bounce"
                    : ""
                }`}
              >
                {room.gameState?.scores?.team2?.tricks || 0}
              </span>
              <span className="text-gray-400 text-[8px] sm:text-xs">|</span>
              <span
                className={`text-green-300 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  prevScores.team2.tens !==
                  (room.gameState?.scores?.team2?.tens || 0)
                    ? "animate-bounce"
                    : ""
                }`}
              >
                {room.gameState?.scores?.team2?.tens || 0}
              </span>
            </div>
            <span className="text-orange-300 text-[10px] sm:text-xs font-medium">
              T2
            </span>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Compact Trump Indicator - Top Border Right */}
      {room.gameState?.trump && (
        <div className="absolute -top-1 sm:-top-2 right-6 sm:right-8 z-30">
          <div className="flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 sm:px-3 py-0.5 border border-white/20 shadow-lg">
            {/* Trump label */}
            <span className="text-purple-300 text-[10px] sm:text-xs font-medium">
              Trump
            </span>

            {/* Divider */}
            <div className="w-px h-3 bg-white/30"></div>

            {/* Suit symbol */}
            <div className="flex items-center gap-1">
              <span
                className={`text-sm sm:text-base font-bold transition-all duration-300 ${getSuitColor(
                  room.gameState.trump
                )} ${
                  room.gameState.trump === "clubs" ||
                  room.gameState.trump === "spades"
                    ? "bg-white/90 rounded-full px-1 py-0.5 shadow-lg"
                    : ""
                }`}
              >
                {getSuitSymbol(room.gameState.trump)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Responsive game table container */}
      <div className="w-full h-[70vh] sm:h-[75vh] md:h-[80vh] lg:h-[85vh] max-h-[600px] bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-2xl md:rounded-3xl relative border-4 md:border-6 border-yellow-700 shadow-2xl overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 mb-20 sm:mb-24 md:mb-0">
        {/* Rules Button - Moved inside table container */}
        {onShowRules && (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-[100]">
            <button
              onClick={onShowRules}
              className="flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 sm:px-3 py-0.5 border border-white/20 shadow-lg hover:bg-black/70 transition-colors cursor-pointer touch-manipulation"
              aria-label="Show Rules"
            >
              {/* Rules label */}
              <span className="text-yellow-300 text-[10px] sm:text-xs font-medium pointer-events-none">
                Rules
              </span>

              {/* Divider */}
              <div className="w-px h-3 bg-white/30 pointer-events-none"></div>

              {/* Rules icon */}
              <div className="flex items-center gap-1 pointer-events-none">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </button>
          </div>
        )}
        {/* Enhanced table texture with better blend mode */}
        <div className="absolute inset-0 bg-[url('/table-texture.png')] opacity-25 mix-blend-overlay pointer-events-none" />
        {/* Realistic felt texture overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-green-800/10 to-green-900/20 pointer-events-none" />
        {/* Enhanced inner shadow for depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl pointer-events-none" />

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

        {/* Enhanced dealing animation with smaller deck and sound */}
        {isDealing && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
            <div className="relative dealing-deck animate-deck-pulse">
              {/* Smaller deck stack effect */}
              <div className="absolute -left-1 -top-1 opacity-20">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={50}
                  height={70}
                  style={{ width: "auto", height: "auto" }}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div className="absolute -left-0.5 -top-0.5 opacity-40">
                <Image
                  src="/cards/back.png"
                  alt="Deck"
                  width={50}
                  height={70}
                  style={{ width: "auto", height: "auto" }}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <Image
                src="/cards/back.png"
                alt="Deck"
                width={50}
                height={70}
                style={{ width: "auto", height: "auto" }}
                className="rounded-lg drop-shadow-2xl relative z-10"
              />
            </div>
            {dealerSeat && (
              <span className="mt-2 text-yellow-300 font-bold text-xs sm:text-sm bg-black/80 px-3 py-1 rounded-full border border-yellow-600 shadow-xl backdrop-blur-sm">
                Dealer: Seat {dealerSeat}
              </span>
            )}
          </div>
        )}

        {/* Animated dealing cards flying to players - optimized with smooth transitions */}
        {dealingCards.map((card) => (
          <div
            key={card.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
            style={{
              transform: `translate(calc(-50% + ${
                card.position.x
              }px), calc(-50% + ${card.position.y}px)) scale(${
                card.position.x === 0 && card.position.y === 0 ? "1.1" : "1"
              })`,
              opacity: card.opacity,
              transition: "transform 120ms ease-out, opacity 120ms ease-out",
              filter:
                card.position.x === 0 && card.position.y === 0
                  ? "drop-shadow(0 8px 16px rgba(0,0,0,0.3))"
                  : "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
            }}
          >
            <Image
              src="/cards/back.png"
              alt="Dealing card"
              width={56}
              height={80}
              className="rounded-lg shadow-lg"
            />
          </div>
        ))}

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
