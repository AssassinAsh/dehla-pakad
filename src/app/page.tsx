"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Socket } from "socket.io-client";
import RulesModal from "@/components/RulesModal";
import FeedbackModal from "@/components/FeedbackModal";
import MatchmakingModal from "@/components/MatchmakingModal";
import { lazySocket } from "@/utils/lazySocket";

interface MatchResult {
  status: string;
  roomId?: string;
  gameType?: string;
  message?: string;
}

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showPrivateRoomOptions, setShowPrivateRoomOptions] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinRoomError, setJoinRoomError] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsCreatingRoom(true);

    try {
      // Get socket connection only when needed
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      // Add a timeout to handle cases where the callback doesn't fire
      const timeoutId = setTimeout(() => {
        setIsCreatingRoom(false);
        alert("Room creation timed out. Please try again.");
      }, 5000);

      socket.emit("createRoom", playerName, (roomId: string | null) => {
        clearTimeout(timeoutId);

        if (roomId) {
          const roomUrl = `/room/${roomId}?name=${encodeURIComponent(
            playerName
          )}`;

          // Use only router.push, fallback to window.location.href only on error
          try {
            router.push(roomUrl);
          } catch (navError) {
            console.error("Navigation error:", navError);
            window.location.href = roomUrl;
          }
        } else {
          console.error("Failed to create room");
          alert("Failed to create room");
        }
        setIsCreatingRoom(false);
      });
    } catch (error) {
      console.error("Error connecting to create room:", error);
      alert("Connection error. Please try again.");
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = async () => {
    if (!joinRoomId.trim()) {
      setJoinRoomError("Please enter a room ID");
      return;
    }

    if (!playerName.trim()) {
      setJoinRoomError("Please enter your name");
      return;
    }

    try {
      // Get socket connection only when needed
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      setJoinRoomError("");
      setIsJoiningRoom(true);
      const normalizedId = joinRoomId.trim().toUpperCase();

      // Check if room exists before trying to join
      socket.emit("checkRoom", normalizedId, (exists: boolean) => {
        setIsJoiningRoom(false);

        if (exists) {
          // Room exists, navigate to it with player name
          const roomUrl = `/room/${normalizedId}?name=${encodeURIComponent(
            playerName
          )}`;
          router.push(roomUrl);
        } else {
          // Room doesn't exist
          setJoinRoomError(
            `Room "${normalizedId}" not found. Please check the room ID and try again.`
          );
        }
      });
    } catch (error) {
      console.error("Error connecting to join room:", error);
      setJoinRoomError("Connection error. Please try again.");
      setIsJoiningRoom(false);
    }
  };

  const playWithComputer = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      // Get socket connection only when needed
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      // Use dedicated bot game creation (bypasses matchmaking queue)
      socket.emit("createBotGame", playerName, (result: MatchResult) => {
        if (result.status === "matched" && result.roomId) {
          const roomUrl = `/room/${result.roomId}?name=${encodeURIComponent(
            playerName
          )}`;
          router.push(roomUrl);
        } else {
          alert("Failed to create computer game");
        }
      });
    } catch (error) {
      console.error("Error connecting for computer game:", error);
      alert("Connection error. Please try again.");
    }
  };

  const playOnline = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    // Immediately show the matchmaking modal - the modal will handle joining
    setIsMatchmakingModalOpen(true);
  };

  return (
    <>
      <main className="flex min-h-screen flex-col md:flex-row items-center justify-center p-4 md:p-12 lg:p-16 bg-[#f6e7c6] text-green-950 relative">
        {/* Game-like background overlay */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-green-200 via-green-100 to-yellow-100">
          <div className="absolute inset-0 bg-[url('/table-texture.png')] opacity-10 mix-blend-multiply"></div>
        </div>
        {/* Logo and Title section */}
        <div className="text-center mb-10 md:mb-0 md:w-1/2 md:flex md:flex-col md:justify-center md:items-center">
          <div className="flex flex-col items-center mb-2 md:mb-8 animate-fade-in-up">
            <Image
              src="/logo.webp"
              alt="Dehla Pakad Logo"
              width={120}
              height={120}
              priority
              className="w-24 h-24 sm:w-36 sm:h-36 md:w-56 md:h-56"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-green-800 tracking-wider [text-shadow:_0_2px_4px_rgba(0,0,0,0.2)] mb-1 sm:mb-2 md:mb-4">
            Dehla Pakad
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-700 mt-1 sm:mt-2 md:mt-2 max-w-xs sm:max-w-md">
            The classic 4-player trick-taking card game.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 border-2 border-yellow-500"
            >
              How to Play
            </button>
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 border-2 border-blue-600"
            >
              Give Feedback
            </button>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="w-full max-w-md md:w-1/2 md:max-w-lg bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-green-800/20 space-y-6 md:space-y-8 md:ml-8 lg:ml-16">
          <div>
            <h2 className="text-2xl font-bold text-center text-green-800 mb-6">
              Choose Game Mode
            </h2>

            {/* Name input */}
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition mb-6"
            />

            {/* Game Mode Options */}
            <div className="space-y-4">
              {/* Play Online */}
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 transition-all duration-200 hover:shadow-md">
                <h3 className="font-bold text-purple-800 mb-2 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-purple-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  Join Online Lobby
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Join a lobby with other players. Bots will fill empty seats
                  automatically.
                </p>
                <button
                  onClick={playOnline}
                  disabled={!playerName.trim()}
                  className="w-full bg-purple-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow"
                >
                  Join Lobby
                </button>
              </div>

              {/* Play Computer */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 transition-all duration-200 hover:shadow-md">
                <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 3H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h3l-1 1v1h8v-1l-1-1h3c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 13H4V5h16v11z" />
                    <circle cx="12" cy="10.5" r="1.5" />
                    <circle cx="8" cy="8.5" r="1" />
                    <circle cx="16" cy="8.5" r="1" />
                    <circle cx="8" cy="12.5" r="1" />
                    <circle cx="16" cy="12.5" r="1" />
                  </svg>
                  Play Computer
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Play instantly against AI opponents. Perfect for practice!
                </p>
                <button
                  onClick={playWithComputer}
                  disabled={!playerName.trim()}
                  className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow"
                >
                  Start Computer Game
                </button>
              </div>

              {/* Private Room */}
              <div className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 transition-all duration-200 hover:shadow-md">
                <h3 className="font-bold text-green-800 mb-2 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Private Room
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Create or join a room with friends. Add bots to fill empty
                  seats.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={createRoom}
                    disabled={isCreatingRoom || !playerName.trim()}
                    className="bg-green-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow text-sm"
                  >
                    {isCreatingRoom ? "Creating..." : "Create Room"}
                  </button>
                  <button
                    onClick={() => setShowPrivateRoomOptions(true)}
                    disabled={!playerName.trim()}
                    className="border-2 border-green-700 text-green-700 font-bold py-2 px-3 rounded-lg hover:bg-green-50 disabled:bg-gray-400 disabled:border-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 text-sm"
                  >
                    Join Room
                  </button>
                </div>

                {/* Join Room Form - Shows inline when Join Room is clicked */}
                {showPrivateRoomOptions && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-300 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-green-800">
                        Join a Private Room
                      </h4>
                      <button
                        onClick={() => {
                          setShowPrivateRoomOptions(false);
                          setJoinRoomId("");
                          setJoinRoomError("");
                          setIsJoiningRoom(false);
                        }}
                        className="text-green-600 hover:text-green-800 text-xl font-bold"
                        aria-label="Close join room form"
                      >
                        &times;
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter Room ID"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      className="w-full px-3 py-2 mb-3 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition text-sm"
                      autoFocus
                    />
                    <button
                      onClick={joinRoom}
                      disabled={
                        !joinRoomId.trim() ||
                        !playerName.trim() ||
                        isJoiningRoom
                      }
                      className="w-full bg-green-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow text-sm"
                    >
                      {isJoiningRoom ? "Checking Room..." : "Join Room"}
                    </button>
                    {joinRoomError && (
                      <div className="mt-2 text-red-600 text-xs font-semibold text-center">
                        {joinRoomError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rules Button */}
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Matchmaking Modal */}
      <MatchmakingModal
        isOpen={isMatchmakingModalOpen}
        onClose={() => setIsMatchmakingModalOpen(false)}
        playerName={playerName}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full text-center text-xs text-green-900/70 mt-8 mb-2">
        © {new Date().getFullYear()} Dehla Pakad. Made with ♥ for card game
        lovers.
      </footer>
    </>
  );
}
