"use client";

import { useState, useEffect } from "react";
import Confetti from "react-confetti";

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplay: () => void;
  onLeave: () => void;
  gameMode: "private" | "lobby" | "quick-bots";
  gameResult: {
    result: "win" | "lose" | "draw";
    isKot: boolean;
    isDraw: boolean;
    t1Tens: number;
    t2Tens: number;
    t1Tricks: number;
    t2Tricks: number;
  };
  replayState?: {
    votesNeeded: number;
    currentVotes: number;
    isWaitingForVotes: boolean;
    isHost?: boolean;
  };
}

export default function ReplayModal({
  isOpen,
  onReplay,
  onLeave,
  gameMode,
  gameResult,
  replayState,
}: ReplayModalProps) {
  const [countdown, setCountdown] = useState(15);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Set window dimensions for confetti
  useEffect(() => {
    const updateDimensions = () => {
      setWindowDimensions({
        width: window.innerWidth || 1200,
        height: window.innerHeight || 800,
      });
    };

    // Set initial dimensions immediately
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Show confetti for victories
  useEffect(() => {
    if (isOpen && gameResult.result === "win") {
      setShowConfetti(true);
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [isOpen, gameResult.result, windowDimensions, showConfetti]);

  // Auto-leave countdown for quick-bots mode (15 seconds to decide)
  useEffect(() => {
    if (isOpen && gameMode === "quick-bots") {
      setCountdown(15); // Reset countdown to 15 seconds
      setShowCountdown(true);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onLeave(); // Auto-leave if no action taken
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setShowCountdown(false);
      setCountdown(15);
    }
  }, [isOpen, gameMode, onLeave]);

  if (!isOpen) return null;

  const getResultMessage = () => {
    if (gameResult.isDraw) return "It's a Draw!";
    if (gameResult.isKot)
      return gameResult.result === "win" ? "🎉 Kot Victory!" : "💥 Kot Defeat!";
    return gameResult.result === "win" ? "🎉 You Won!" : "😔 You Lost";
  };

  const getResultColor = () => {
    if (gameResult.isDraw) return "text-yellow-600";
    return gameResult.result === "win" ? "text-green-600" : "text-red-600";
  };

  const getGameModeTitle = () => {
    switch (gameMode) {
      case "quick-bots":
        return "Computer Game Complete";
      case "private":
        return "Private Room Game Complete";
      case "lobby":
        return "Online Game Complete";
      default:
        return "Game Complete";
    }
  };

  const renderReplayButton = () => {
    switch (gameMode) {
      case "quick-bots":
        return (
          <button
            onClick={onReplay}
            className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <span className="mr-2">🎮</span>
            Replay
          </button>
        );

      case "private":
        if (replayState?.isWaitingForVotes) {
          return (
            <div className="flex-1 bg-gray-100 border-2 border-green-500 text-green-700 font-bold py-3 px-6 rounded-lg flex items-center justify-center">
              <span className="mr-2">⏳</span>
              Waiting for host...
            </div>
          );
        } else {
          return (
            <button
              onClick={onReplay}
              className="flex-1 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🔄</span>
              Replay
            </button>
          );
        }

      case "lobby":
        if (replayState?.isWaitingForVotes) {
          return (
            <div className="flex-1 bg-blue-100 border-2 border-blue-500 text-blue-700 font-bold py-3 px-6 rounded-lg flex items-center justify-center">
              <span className="mr-2">⏳</span>
              Votes: {replayState.currentVotes}/{replayState.votesNeeded}
            </div>
          );
        } else {
          return (
            <button
              onClick={onReplay}
              className="flex-1 bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🎮</span>
              Replay
            </button>
          );
        }

      default:
        return (
          <button
            onClick={onReplay}
            className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Replay
          </button>
        );
    }
  };

  return (
    <>
      {/* Victory Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <Confetti
            width={windowDimensions.width}
            height={windowDimensions.height}
            numberOfPieces={300}
            recycle={true}
            colors={[
              "#ff6b6b",
              "#4ecdc4",
              "#45b7d1",
              "#f9ca24",
              "#6c5ce7",
              "#a8e6cf",
              "#fd79a8",
              "#e17055",
            ]}
            gravity={0.3}
            initialVelocityX={5}
            initialVelocityY={15}
          />
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getGameModeTitle()}
            </h2>
            <div className={`text-3xl font-bold ${getResultColor()}`}>
              {getResultMessage()}
            </div>
          </div>

          {/* Score Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Final Score
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Team 1</div>
                  <div className="text-lg font-bold text-gray-800">
                    {gameResult.t1Tens} tens • {gameResult.t1Tricks} tricks
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Team 2</div>
                  <div className="text-lg font-bold text-gray-800">
                    {gameResult.t2Tens} tens • {gameResult.t2Tricks} tricks
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Result Badges */}
          {gameResult.isKot && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4 text-center">
              <span className="text-red-700 font-bold">⚡ KOT Game!</span>
            </div>
          )}

          {gameResult.isDraw && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4 text-center">
              <span className="text-yellow-700 font-bold">🤝 Draw Game!</span>
            </div>
          )}

          {/* Private Room Vote Status */}
          {gameMode === "private" && replayState?.isWaitingForVotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-center text-blue-700">
                <div className="font-semibold">
                  Waiting for host decision...
                </div>
                <div className="text-sm">
                  The room host will decide if you play again
                </div>
              </div>
            </div>
          )}

          {/* Lobby Vote Status */}
          {gameMode === "lobby" && replayState?.isWaitingForVotes && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <div className="text-center text-purple-700">
                <div className="font-semibold">
                  Players voting for replay...
                </div>
                <div className="text-sm">
                  {replayState.currentVotes} of {replayState.votesNeeded} votes
                  needed
                </div>
                <div className="mt-2 bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (replayState.currentVotes / replayState.votesNeeded) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick-bots timeout warning */}
          {gameMode === "quick-bots" && showCountdown && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="text-center text-orange-700">
                <div className="font-semibold">⏰ Make Your Choice</div>
                <div className="text-sm">
                  Choose to play again or leave the game
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {renderReplayButton()}

            <button
              onClick={onLeave}
              className="flex-1 bg-gray-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              <span className="mr-2">🏠</span>
              Leave Game
            </button>
          </div>

          {/* Countdown Timer - Placed below buttons */}
          {gameMode === "quick-bots" && showCountdown && (
            <div className="mt-4 text-center">
              <div className="bg-orange-100 rounded-lg p-3">
                <div className="text-orange-700 font-semibold text-sm mb-2">
                  Auto-leaving in {countdown} seconds
                </div>
                {/* Progress bar showing time remaining */}
                <div className="bg-orange-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${(countdown / 15) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Game Mode Info */}
          {gameMode !== "quick-bots" && (
            <div className="mt-4 text-center text-xs text-gray-500">
              {gameMode === "private" &&
                "Only the room host can start a new game"}
              {gameMode === "lobby" &&
                "Join a new lobby to play with different players"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
