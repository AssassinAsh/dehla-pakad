"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room, Player, Card, Trick } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal"; // Import the modal
import CardComponent from "@/components/Card"; // Renamed to avoid conflict
import "@/styles/animations.css";

export default function RoomPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "";

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
    socket.on("gameStarted", (updated: Room) => setRoom(updated));
    socket.on("cardPlayed", (updatedRoom) => {
      setRoom(updatedRoom); // Use the updated room state from server
    });
    socket.on("trumpRevealed", (suit: string) => {
      setRoom((r) =>
        r ? { ...r, gameState: { ...r.gameState, trump: suit } } : r
      );
    });
    socket.on("trickCompleted", (trick: Trick) => {
      setRoom((r) => (r ? { ...r, tricks: [...r.tricks, trick] } : r));
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
    if (!currentPlayer || !room || !socketRef.current) return;
    socketRef.current.emit("playCard", room.id, card.id);
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
  const isMyTurn = currentPlayer && room.currentPlayer === currentPlayer.seat;

  // Helper: can play this card? (basic: must be your turn and card in hand)
  const canPlayCard = (card: Card) =>
    isMyTurn && currentPlayer?.hand.some((c) => c.id === card.id);

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
    <>
      <div className="min-h-screen p-4 bg-gradient-to-br from-green-800 via-gray-900 to-black text-white pb-40">
        <div className="max-w-7xl mx-auto space-y-4">
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

          {/* Start Game Button */}
          {!room.gameStarted && room.players.length === 4 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={startGame}
                className="bg-yellow-500 text-gray-900 font-bold py-3 px-8 rounded-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 shadow-lg text-xl"
              >
                Start Game / Deal Cards
              </button>
            </div>
          )}

          {/* Team Players panel removed as requested */}
        </div>

        {/* Player Hand (always at bottom, floating) */}
        {currentPlayer && (
          <div className="fixed left-0 right-0 bottom-0 z-40 flex flex-col items-center pb-4 pointer-events-none">
            <div className="mb-2 text-lg font-semibold text-yellow-200">
              Your Hand
            </div>
            <div className="flex gap-2 justify-center items-end pointer-events-auto">
              {currentPlayer.hand.map((card, idx) => (
                <div
                  key={card.id}
                  style={{
                    animation: room.gameState.dealing
                      ? `fadeInUp 0.5s ${(idx + 1) * 0.15}s both`
                      : undefined,
                  }}
                  className={`transition-transform duration-200 relative ${
                    canPlayCard(card)
                      ? "cursor-pointer hover:-translate-y-4 hover:scale-110 shadow-xl border-2 border-yellow-400 animate-pulse"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => canPlayCard(card) && playCard(card)}
                >
                  <CardComponent card={card} size="large" />
                </div>
              ))}
            </div>
            {isMyTurn ? (
              <div className="mt-2 text-green-400 font-bold animate-bounce">
                It&apos;s your turn!
              </div>
            ) : (
              <div className="mt-2 text-gray-400">Waiting for your turn...</div>
            )}
          </div>
        )}

        {/* Game Over - Updated for team scores */}
        {gameFinishedData && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-xl border-2 border-yellow-600 shadow-2xl text-center space-y-4 max-w-md w-full">
              <h2 className="text-2xl font-bold text-yellow-400">Game Over</h2>

              {gameFinishedData.kot !== null && (
                <div className="bg-red-900/60 p-3 rounded-lg text-red-300 font-bold text-lg animate-pulse">
                  KOT! Seat {gameFinishedData.kot}
                  <p className="text-sm font-normal mt-1 text-red-200/80">
                    {room.players.find((p) => p.seat === gameFinishedData.kot)
                      ?.name || "Player"}{" "}
                    failed to win any tricks!
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Team 1 */}
                <div className="bg-blue-900/50 p-3 rounded-lg">
                  <div className="font-bold text-white mb-1">Team 1</div>
                  <div className="text-xl font-bold text-yellow-400 mb-2">
                    {(gameFinishedData.scores[1] || 0) +
                      (gameFinishedData.scores[3] || 0)}
                    ✦
                  </div>
                  <div className="text-xs text-gray-300">Seats 1 & 3</div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Seat 1:</span>
                    <span className="font-medium text-white">
                      {gameFinishedData.scores[1] || 0}✦
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Seat 3:</span>
                    <span className="font-medium text-white">
                      {gameFinishedData.scores[3] || 0}✦
                    </span>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="bg-green-900/50 p-3 rounded-lg">
                  <div className="font-bold text-white mb-1">Team 2</div>
                  <div className="text-xl font-bold text-yellow-400 mb-2">
                    {(gameFinishedData.scores[2] || 0) +
                      (gameFinishedData.scores[4] || 0)}
                    ✦
                  </div>
                  <div className="text-xs text-gray-300">Seats 2 & 4</div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Seat 2:</span>
                    <span className="font-medium text-white">
                      {gameFinishedData.scores[2] || 0}✦
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Seat 4:</span>
                    <span className="font-medium text-white">
                      {gameFinishedData.scores[4] || 0}✦
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setGameFinishedData(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </>
  );
}
