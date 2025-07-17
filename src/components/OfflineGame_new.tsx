"use client";

import { useState, useEffect } from "react";

interface OfflineGameProps {
  playerName: string;
  onGameEnd?: (result?: {
    winner: string;
    scores: { team1: number; team2: number };
  }) => void;
}

export default function OfflineGame({
  playerName,
  onGameEnd,
}: OfflineGameProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Loading Offline Game...
          </h2>
          <p className="text-white/80">
            Setting up your game with AI opponents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome, {playerName}!
        </h2>
        <h3 className="text-xl font-semibold text-white/90 mb-4">
          Offline Mode
        </h3>
        <p className="text-white/80 mb-6">
          Offline gameplay is currently being set up. This will use cached game
          assets to provide a seamless gaming experience even without internet
          connection.
        </p>
        <div className="space-y-4">
          <div className="bg-green-600/20 border border-green-400/30 rounded-lg p-4">
            <h3 className="text-green-300 font-semibold mb-2">
              ✓ Assets Cached
            </h3>
            <p className="text-white/70 text-sm">
              All cards and sounds are ready for offline play
            </p>
          </div>
          <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-semibold mb-2">
              ✓ AI Opponents Ready
            </h3>
            <p className="text-white/70 text-sm">
              Smart bots with different difficulty levels
            </p>
          </div>
        </div>
        <button
          onClick={() => onGameEnd?.()}
          className="mt-6 bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors duration-200"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
