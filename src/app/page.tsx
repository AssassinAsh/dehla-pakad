"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import RulesModal from "@/components/RulesModal";
import FeedbackModal from "@/components/FeedbackModal";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false); // State for showing join room dialog
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinRoomError, setJoinRoomError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // Connect to Socket.IO for real-time room updates
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    // Connection status for debugging
    socket.on("connect", () => {
      // Connection established
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    // Listen for room list updates - currently logging only
    socket.on("roomsList", () => {
      // We're not displaying the rooms list at this time
    });

    // Request current rooms list
    socket.emit("getRooms");

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsCreatingRoom(true);

    if (!socketRef.current) {
      console.error("Socket not connected");
      alert("Connection error. Please refresh the page and try again.");
      setIsCreatingRoom(false);
      return;
    }

    // Add a timeout to handle cases where the callback doesn't fire
    const timeoutId = setTimeout(() => {
      setIsCreatingRoom(false);
      alert("Room creation timed out. Please try again.");
    }, 5000);

    socketRef.current.emit(
      "createRoom",
      playerName,
      (roomId: string | null) => {
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
      }
    );
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setJoinRoomError("Please enter a room ID");
      return;
    }
    // Navigate to the room page, uppercase the ID for consistency
    const normalizedId = joinRoomId.trim().toUpperCase();
    const roomUrl = `/room/${normalizedId}`;
    router.push(roomUrl);
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

        {/* Room Creation & Join */}
        <div className="w-full max-w-md md:w-1/2 md:max-w-lg bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-green-800/20 space-y-6 md:space-y-8 md:ml-8 lg:ml-16">
          <div>
            <h2 className="text-2xl font-bold text-center text-green-800 mb-6">
              Join or Create a Room
            </h2>
            {/* Name input only for create room, not for join room */}
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition mb-4"
            />
            <button
              onClick={createRoom}
              disabled={isCreatingRoom || !playerName.trim()}
              className="w-full bg-green-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg mb-2"
            >
              {isCreatingRoom ? "Creating Room..." : "Create New Room"}
            </button>
          </div>
          <div className="border-t border-green-100 pt-4 sm:pt-6">
            {showJoinRoom ? (
              <div
                className="animate-fade-in fixed md:static left-0 right-0 bottom-0 md:bottom-auto z-40 bg-white md:bg-transparent rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none p-6 md:p-0 border-t-2 border-green-200 md:border-none transition-all duration-300"
                style={{ maxWidth: "100vw" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="join-room-title"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3
                    id="join-room-title"
                    className="text-lg font-semibold text-green-800"
                  >
                    Join a Room
                  </h3>
                  <button
                    onClick={() => {
                      setShowJoinRoom(false);
                      setJoinRoomId("");
                      setPlayerName("");
                    }}
                    className="text-green-800 hover:text-green-600 text-2xl font-bold"
                    aria-label="Close join room dialog"
                  >
                    &times;
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full px-4 py-3 mb-4 bg-green-50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  autoFocus
                />
                <button
                  onClick={joinRoom}
                  disabled={!joinRoomId.trim()}
                  className="w-full bg-green-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg"
                >
                  Join Room
                </button>
                {joinRoomError && (
                  <div className="mt-3 text-red-600 text-sm font-semibold text-center animate-fade-in">
                    {joinRoomError}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowJoinRoom(true)}
                className="w-full border-2 border-green-700 text-green-700 font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-green-50 transition-transform transform hover:scale-105"
              >
                Join Room
              </button>
            )}
          </div>
        </div>

        {/* Rules Button */}
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
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
