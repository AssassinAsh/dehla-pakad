"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RoomSummary } from "@/types/game";
import { io, Socket } from "socket.io-client";
import RulesModal from "@/components/RulesModal"; // Import the modal

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false); // State for showing join room dialog
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // State for modal
  const [joinRoomId, setJoinRoomId] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // Connect to Socket.IO for real-time room updates
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    // Connection status for debugging
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server with ID:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    // Listen for room list updates - currently logging only
    socket.on("roomsList", (roomsList: RoomSummary[]) => {
      console.log("Received rooms list:", roomsList);
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

    console.log("Emitting createRoom event with name:", playerName);

    // Add a timeout to handle cases where the callback doesn't fire
    const timeoutId = setTimeout(() => {
      console.warn("Room creation timed out");
      setIsCreatingRoom(false);
      alert("Room creation timed out. Please try again.");
    }, 5000);

    socketRef.current.emit(
      "createRoom",
      playerName,
      (roomId: string | null) => {
        clearTimeout(timeoutId);
        console.log("Received room creation callback with roomId:", roomId);

        if (roomId) {
          console.log("Navigating to room:", roomId);
          const roomUrl = `/room/${roomId}?name=${encodeURIComponent(
            playerName
          )}`;

          // Add a manual redirect fallback if Next.js router doesn't navigate properly
          try {
            router.push(roomUrl);

            // Fallback in case router.push doesn't redirect immediately
            setTimeout(() => {
              window.location.href = roomUrl;
            }, 1000);
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
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!joinRoomId.trim()) {
      alert("Please enter a room ID");
      return;
    }
    const roomUrl = `/room/${joinRoomId}?name=${encodeURIComponent(
      playerName
    )}`;
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
          <div className="flex flex-col items-center mb-4 md:mb-8 animate-fade-in-up">
            <Image
              src="/logo.webp"
              alt="Dehla Pakad Logo"
              width={280}
              height={280}
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-green-800 tracking-wider [text-shadow:_0_2px_4px_rgba(0,0,0,0.2)]">
            Dehla Pakad
          </h1>
          <p className="text-gray-700 mt-2 text-base md:text-lg max-w-md">
            The classic 4-player trick-taking card game.
          </p>
        </div>

        {/* Room Creation & Join */}
        <div className="w-full max-w-md md:w-1/2 md:max-w-lg bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-green-800/20 space-y-6 md:space-y-8 md:ml-8 lg:ml-16">
          {/* How to Play button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 border-2 border-yellow-500"
            >
              How to Play
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-center text-green-800 mb-6">
              Join or Create a Room
            </h2>
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
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-green-800">
                    Join with Room ID
                  </h3>
                  <button
                    onClick={() => {
                      setShowJoinRoom(false);
                      setJoinRoomId("");
                    }}
                    className="text-green-800 hover:text-green-600"
                  >
                    &times; Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-green-50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition mb-4"
                />
                <button
                  onClick={joinRoom}
                  disabled={!playerName.trim() || !joinRoomId.trim()}
                  className="w-full bg-green-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg"
                >
                  Join Room
                </button>
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
        <div className="mt-8 md:absolute md:bottom-8 md:right-8">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="bg-transparent border-2 border-green-700 text-green-700 font-bold py-2 px-6 rounded-lg hover:bg-green-700 hover:text-white transition-colors shadow-md"
          >
            Show Rules
          </button>
        </div>
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
      {/* Footer */}
      <footer className="w-full text-center text-xs text-green-900/70 mt-8 mb-2">
        © {new Date().getFullYear()} Dehla Pakad. Made with ♥ for card game
        lovers.
      </footer>
    </>
  );
}
