"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RoomSummary } from "@/types/game";
import { io, Socket } from "socket.io-client";
import RulesModal from "@/components/RulesModal"; // Import the modal

export default function Home() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // State for modal
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

    // Listen for room list updates
    socket.on("roomsList", (roomsList: RoomSummary[]) => {
      console.log("Received rooms list:", roomsList);
      setRooms(roomsList);
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

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold text-yellow-400 tracking-wider [text-shadow:_0_4px_8px_rgba(0,0,0,0.5)]">
            Dehla Pakad
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            The classic 4-player trick-taking card game.
          </p>
        </div>

        {/* Room Creation */}
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <h2 className="text-2xl font-bold text-center text-yellow-300 mb-6">
            Join or Create a Room
          </h2>
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            />
            <button
              onClick={createRoom}
              disabled={isCreatingRoom || !playerName.trim()}
              className="w-full bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg"
            >
              {isCreatingRoom ? "Creating Room..." : "Create New Room"}
            </button>
          </div>
        </div>

        {/* Rules Button */}
        <div className="mt-8">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="bg-transparent border border-yellow-500 text-yellow-500 font-bold py-2 px-6 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition-colors"
          >
            Show Rules
          </button>
        </div>

        {/* Available Rooms List */}
        <div className="w-full max-w-md mt-10">
          <h3 className="text-xl font-semibold text-center mb-4">
            Available Rooms
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-gray-800 rounded-lg border border-gray-700">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex justify-between items-center bg-gray-700 p-4 rounded-lg"
                >
                  <span className="font-medium">{`Room ${room.id.substring(
                    0,
                    5
                  )}`}</span>
                  <span className="text-sm text-gray-400">{`${room.playerCount}/4 players`}</span>
                  <button
                    onClick={() => {
                      if (!playerName.trim()) {
                        alert("Please enter your name first");
                        return;
                      }
                      router.push(
                        `/room/${room.id}?name=${encodeURIComponent(
                          playerName
                        )}`
                      );
                    }}
                    className="bg-green-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-500 transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">
                No available rooms. Create one!
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </>
  );
}
