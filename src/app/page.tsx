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
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold text-yellow-400 tracking-wider [text-shadow:_0_4px_8px_rgba(0,0,0,0.5)]">
            Dehla Pakad
          </h1>
          <p className="text-gray-300 mt-2 text-lg">
            The classic 4-player trick-taking card game.
          </p>
        </div>

        {/* Room Creation & Join */}
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-center text-yellow-300 mb-6">
              Join or Create a Room
            </h2>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition mb-4"
            />
            <button
              onClick={createRoom}
              disabled={isCreatingRoom || !playerName.trim()}
              className="w-full bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg mb-2"
            >
              {isCreatingRoom ? "Creating Room..." : "Create New Room"}
            </button>
          </div>
          <div className="border-t border-gray-600 pt-6">
            <h3 className="text-lg font-semibold text-yellow-200 mb-2">
              Join with Room ID
            </h3>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 transition mb-2"
            />
            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !joinRoomId.trim()}
              className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform transform hover:scale-105 shadow-lg"
            >
              Join Room
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
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </>
  );
}
