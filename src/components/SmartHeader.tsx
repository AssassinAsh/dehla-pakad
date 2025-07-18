"use client";

import { useState } from "react";
import { Room } from "@/types/game";

interface SmartHeaderProps {
  room: Room;
  isGameInProgress: boolean;
  onShowRules: () => void;
}

export default function SmartHeader({
  room,
  isGameInProgress,
  onShowRules,
}: SmartHeaderProps) {
  const [copied, setCopied] = useState(false);

  const gameMode = room.gameMode || "private";
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${room.id}`
      : "";

  // Determine what to show based on game mode and state
  const shouldShowRoomId = gameMode === "private";
  const shouldShowShareButton = gameMode === "private" && !isGameInProgress;

  // Context-aware display logic
  const isWaitingForPlayers = room.players.length < 4;
  const isWaitingForReady =
    room.players.length === 4 &&
    !room.gameStarted &&
    room.players.some((p) => !p.isReady);
  const isInGame = isGameInProgress;

  const getGameModeIndicator = () => {
    switch (gameMode) {
      case "lobby":
        return {
          text: isInGame ? "Online Match" : "Online Lobby",
          icon: "🌐",
          bgColor: "bg-purple-400",
          borderColor: "border-purple-600",
          description: isInGame ? "Playing online" : "Waiting for players",
        };
      case "quick-bots":
        return {
          text: isInGame ? "vs AI" : "vs Computer",
          icon: "🤖",
          bgColor: "bg-blue-400",
          borderColor: "border-blue-600",
          description: isInGame ? "Playing with bots" : "Bot game ready",
        };
      case "private":
      default:
        return null; // Will show room ID instead
    }
  };

  const getGameStateInfo = () => {
    if (isWaitingForReady) {
      return {
        text: "Ready?",
        subText: `${room.players.filter((p) => p.isReady).length}/4 ready`,
        compact: false,
      };
    } else if (isWaitingForPlayers) {
      return {
        text: "Waiting",
        subText: `${room.players.length}/4 players`,
        compact: false,
      };
    }
    return null;
  };

  const gameStateInfo = getGameStateInfo();

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join my Dehla Pakad room!",
        text: `Join my Dehla Pakad room: ${room.id}`,
        url: inviteUrl,
      });
    } else {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const modeIndicator = getGameModeIndicator();

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between gap-1 md:gap-2 px-2 md:px-4 lg:px-8 ${
        isInGame ? "py-1 md:py-1" : "py-1 md:py-2 lg:py-4"
      } bg-gradient-to-b from-black/70 to-transparent rounded-b-2xl shadow-lg ${
        isInGame ? "mb-1 md:mb-2" : "mb-2 md:mb-4"
      } transition-all duration-300`}
    >
      {/* Left side - Room ID, Game Mode Indicator, or Game State */}
      <div className="flex items-center gap-2">
        {shouldShowRoomId ? (
          // Show Room ID for private rooms
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-full bg-yellow-400 text-gray-900 font-bold text-sm md:text-base shadow-md border-2 border-yellow-600 select-all">
              <span className="tracking-widest text-xs md:text-base">
                {room.id}
              </span>
              <button
                onClick={handleCopyRoomId}
                className="ml-1 md:ml-2 p-1 rounded-full bg-yellow-500 hover:bg-yellow-300 transition-colors"
                aria-label="Copy Room ID"
              >
                {copied ? (
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 md:w-4 md:h-4 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                  </svg>
                )}
              </button>
            </span>
            {/* Show game state info for private rooms */}
            {gameStateInfo && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full bg-gray-700/80 text-white font-medium ${
                  gameStateInfo.compact
                    ? "text-xs md:text-sm"
                    : "text-sm md:text-base"
                } shadow-sm border border-gray-600`}
              >
                <span className="text-center">
                  {gameStateInfo.text}
                  {gameStateInfo.subText && (
                    <span className="block text-xs opacity-75">
                      {gameStateInfo.subText}
                    </span>
                  )}
                </span>
              </span>
            )}
          </div>
        ) : modeIndicator ? (
          // Show game mode indicator for lobby/computer games
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-full ${modeIndicator.bgColor} text-gray-900 font-bold text-sm md:text-base shadow-md border-2 ${modeIndicator.borderColor}`}
            >
              <span className="mr-1 md:mr-2 text-sm md:text-base">
                {modeIndicator.icon}
              </span>
              <span className="text-xs md:text-base">{modeIndicator.text}</span>
            </span>
            {/* Show additional context for non-private games */}
            {gameStateInfo && !isInGame && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-700/80 text-white font-medium text-xs md:text-sm shadow-sm border border-gray-600">
                {gameStateInfo.text}
                {gameStateInfo.subText && (
                  <span className="ml-1 opacity-75">
                    • {gameStateInfo.subText}
                  </span>
                )}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Right side - Share and Rules buttons */}
      <div className="flex items-center gap-2">
        {/* Share Button - Only for private rooms when not in game */}
        {shouldShowShareButton && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold shadow-md border-2 border-yellow-600 hover:from-yellow-300 hover:to-yellow-400 transition-colors text-sm md:text-base min-w-[80px] md:min-w-[120px] justify-center"
            aria-label="Share Room Link"
          >
            <svg
              className="w-4 h-4 md:w-5 md:h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 6l-4-4-4 4m4-4v16"
              />
            </svg>
            <span className="hidden md:inline">Share Room</span>
            <span className="md:hidden">Share</span>
            {copied && (
              <span className="ml-1 md:ml-2 text-green-700 font-semibold animate-fade-in text-xs md:text-sm">
                ✓
              </span>
            )}
          </button>
        )}

        {/* Rules Button - Always visible, more compact during gameplay */}
        <button
          onClick={onShowRules}
          className={`flex items-center justify-center ${
            isInGame ? "w-10 h-8 md:w-16 md:h-10" : "w-12 h-10 md:w-20 md:h-14"
          } rounded-full bg-gradient-to-br from-yellow-400 to-yellow-300 text-gray-900 font-bold shadow-2xl border-2 md:border-4 border-yellow-600 hover:from-yellow-300 hover:to-yellow-400 hover:text-gray-900 transition-all px-2 py-1 md:px-4 md:py-2 ${
            isInGame ? "text-xs md:text-sm" : "text-sm md:text-lg"
          } gap-1 md:gap-2`}
          aria-label="Show Rules"
          style={{ boxShadow: "0 6px 32px 0 rgba(251, 191, 36, 0.25)" }}
        >
          <svg
            className={`${
              isInGame ? "w-4 h-4 md:w-5 md:h-5" : "w-5 h-5 md:w-7 md:h-7"
            }`}
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
          {!isInGame && <span className="hidden md:inline ml-1">Rules</span>}
        </button>
      </div>
    </header>
  );
}
