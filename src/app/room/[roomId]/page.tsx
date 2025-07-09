"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room, Player, Card } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal";
import PlayerHand from "@/components/PlayerHand";
import "@/styles/animations.css";
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  MouseSensor,
} from "@dnd-kit/core";

export default function RoomPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "";

  // Configure DnD sensors for better mobile/touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation (reduced for better responsiveness)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Short delay for touch activation (reduced for better responsiveness)
        tolerance: 5, // Tolerance for movement
      },
    })
  );

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // State for modal
  const [gameFinishedData, setGameFinishedData] = useState<{
    scores: Record<number, number>;
    kot: number | null;
  } | null>(null);

  // Copy invite link to clipboard
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";
  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Initialize Socket.IO client
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    // Connection status for debugging
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server with ID:", socket.id);

      // Explicitly check if we're in a valid room once connected
      if (roomId) {
        console.log("Checking room:", roomId);
        socket.emit("checkRoom", roomId, (exists: boolean) => {
          if (!exists) {
            console.error("Room doesn't exist:", roomId);
            alert(`Room ${roomId} doesn't exist or has been closed.`);
            window.location.href = "/";
          }
        });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    // Join room for updates (server will add to socket.join on create/join events)
    socket.on("roomUpdated", (updated: Room) => {
      console.log("Room updated:", updated);
      setRoom(updated);

      // If we're already in the player list, update our current player
      const me = updated.players.find((p) => p.name === playerName);
      if (me) {
        setCurrentPlayer(me);
      }
    });

    socket.on("gameFinished", (data) => setGameFinishedData(data));
    return () => {
      socket.disconnect();
    };
  }, [roomId, playerName]);

  const joinSeat = (seatNumber: number) => {
    if (!playerName || !room || !socketRef.current) return;

    // Check if seat is available
    const seatTaken = room.players.some((p) => p.seat === seatNumber);
    if (seatTaken) return;

    socketRef.current.emit(
      "joinRoom",
      room.id,
      playerName,
      seatNumber,
      (success: boolean) => {
        if (success) {
          // Safe-guard socket id as string
          const sid = socketRef.current!.id || "";
          setCurrentPlayer({
            id: sid,
            name: playerName,
            seat: seatNumber,
            hand: [],
            isReady: true,
            isConnected: true,
          });
        }
      }
    );
  };

  const startGame = () => {
    if (room && room.players.length === 4 && socketRef.current) {
      socketRef.current.emit("startGame", room.id);
    }
  };

  const playCard = (card: Card) => {
    if (!currentPlayer || !room || !socketRef.current) {
      console.log("Cannot play card: invalid state", { currentPlayer, room });
      return;
    }
    if (room.currentPlayer !== currentPlayer.seat) {
      console.log("Not your turn", {
        current: room.currentPlayer,
        player: currentPlayer.seat,
      });
      return;
    }
    console.log("Playing card:", card);
    // Send to server
    socketRef.current.emit("playCard", room.id, card.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;

    // If dropped on the play area
    if (over && over.id === "play-area") {
      const cardId = active.id as string;
      const card = currentPlayer?.hand.find((c) => c.id === cardId);
      if (
        card &&
        currentPlayer &&
        room &&
        room.currentPlayer === currentPlayer.seat
      ) {
        console.log("Card dropped and played:", card);
        playCard(card);
      } else {
        console.log("Card drop rejected - not your turn or card not found");
      }
    } else {
      console.log("Card not dropped on play area:", over?.id);
    }
  };

  const [showNameModal, setShowNameModal] = useState(!playerName);
  const [nameInput, setNameInput] = useState("");

  // Show modal for name entry if not present in URL
  useEffect(() => {
    if (!playerName) {
      setShowNameModal(true);
    } else {
      setShowNameModal(false);
    }
  }, [playerName]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      router.replace(
        `/room/${roomId}?name=${encodeURIComponent(nameInput.trim())}`
      );
    }
  };

  // Helper: is it this player's turn?
  const isMyTurn =
    currentPlayer && room && room.currentPlayer === currentPlayer.seat;

  // Calculate team scores
  const team1Score = room
    ? (room.gameState.scores[1] || 0) + (room.gameState.scores[3] || 0)
    : 0;
  const team2Score = room
    ? (room.gameState.scores[2] || 0) + (room.gameState.scores[4] || 0)
    : 0;

  // If room data isn't loaded yet
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  // Main game UI
  if (showNameModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
        <form
          onSubmit={handleNameSubmit}
          className="bg-gray-900 p-8 rounded-2xl shadow-2xl border-2 border-yellow-500 flex flex-col items-center w-full max-w-xs"
        >
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">
            Enter Your Name
          </h2>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 mb-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 shadow-lg"
            disabled={!nameInput.trim()}
          >
            Join Room
          </button>
        </form>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd} autoScroll={false} sensors={sensors}>
      <div className="min-h-screen p-2 md:p-4 bg-gradient-to-br from-green-800 via-gray-900 to-black text-white pb-32 md:pb-40">
        <div className="max-w-7xl mx-auto space-y-2 md:space-y-4">
          {/* Header */}
          <header className="flex justify-between items-center p-4 rounded-lg bg-black/30">
            <div>
              <h1 className="text-3xl font-bold text-yellow-400 [text-shadow:_0_2px_4px_rgba(0,0,0,0.5)]">
                Room: {room.id.substring(0, 5)}...
              </h1>
              <p className="text-gray-300">
                {room.players.length}/4 players ·{" "}
                <span
                  className={
                    room.gameStarted ? "text-green-400" : "text-yellow-400"
                  }
                >
                  {room.gameStarted ? "In Progress" : "Waiting for players..."}
                </span>
              </p>
              {/* Invite Link */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="bg-gray-700 text-yellow-200 px-2 py-1 rounded w-64 text-xs border border-gray-600 select-all"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopy}
                  className="bg-yellow-500 text-gray-900 font-bold px-3 py-1 rounded hover:bg-yellow-400 transition-colors text-xs"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="bg-transparent border border-yellow-500 text-yellow-500 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Show Rules
            </button>
          </header>

          {/* Table */}
          <GameTable
            room={room}
            dealerSeat={room.dealerSeat}
            currentPlayerId={currentPlayer?.id}
            onSeatClick={joinSeat}
          />

          {/* Start Game Button - Fixed position */}
          {!room.gameStarted && room.players.length === 4 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold py-3 px-8 rounded-lg hover:from-yellow-400 hover:to-amber-400 transition-all transform hover:scale-105 shadow-lg text-xl border-2 border-yellow-600"
              >
                Start Game / Deal Cards
              </button>
            </div>
          )}

          {/* Scoring Summary */}
          {room.gameStarted && (
            <div className="mt-4 md:mt-6 bg-black/40 rounded-lg p-3 md:p-4 border border-gray-700">
              <h3 className="text-lg md:text-xl font-bold text-yellow-400 mb-1 md:mb-2">
                Current Scores
              </h3>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div className="bg-blue-900/60 p-2 md:p-3 rounded-md border border-blue-700">
                  <h4 className="font-bold text-white text-sm md:text-base">
                    Team 1{" "}
                    <span className="hidden xs:inline">(Seats 1 & 3)</span>
                  </h4>
                  <p className="text-lg md:text-xl font-bold text-yellow-300">
                    {team1Score} points
                  </p>
                  <div className="text-xs md:text-sm text-blue-200 mt-1">
                    1: {room.gameState.scores[1] || 0} | 3:{" "}
                    {room.gameState.scores[3] || 0}
                  </div>
                </div>
                <div className="bg-green-900/60 p-2 md:p-3 rounded-md border border-green-700">
                  <h4 className="font-bold text-white text-sm md:text-base">
                    Team 2{" "}
                    <span className="hidden xs:inline">(Seats 2 & 4)</span>
                  </h4>
                  <p className="text-lg md:text-xl font-bold text-yellow-300">
                    {team2Score} points
                  </p>
                  <div className="text-xs md:text-sm text-green-200 mt-1">
                    2: {room.gameState.scores[2] || 0} | 4:{" "}
                    {room.gameState.scores[4] || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Player Hand (always at bottom, floating) */}
        {currentPlayer && (
          <PlayerHand
            hand={currentPlayer.hand}
            onPlayCard={playCard}
            canPlay={!!isMyTurn}
          />
        )}
      </div>
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </DndContext>
  );
}
