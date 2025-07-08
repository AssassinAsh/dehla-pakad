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
    socket.on("cardPlayed", () => {
      setRoom((r) => (r ? { ...r } : r)); // re-render on card play
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
              className="bg-transparent border border-yellow-500 text-yellow-500 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition-colors"
            >
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

          {/* Scores as small overlay instead of white tiles */}
          <div className="mt-2 bg-gray-900/80 p-2 rounded-lg text-center mx-auto max-w-md">
            <div className="text-yellow-300 text-sm">Current Scores:</div>
            <div className="flex justify-center gap-4 mt-1">
              {room.players
                .slice()
                .sort((a, b) => a.seat - b.seat)
                .map((p) => (
                  <div key={p.seat} className="text-center">
                    <div className="text-white text-xs">
                      Seat {p.seat}: {p.name}
                    </div>
                    <div className="font-bold text-yellow-400">
                      {room.gameState.scores[p.seat] || 0}✦
                    </div>
                  </div>
                ))}
            </div>
          </div>
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

        {/* Game Over */}
        {gameFinishedData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-lg text-center space-y-4">
              <h2 className="text-2xl font-bold">Game Over</h2>
              {gameFinishedData.kot !== null && (
                <p className="text-red-600">Kot! Seat {gameFinishedData.kot}</p>
              )}
              {Object.entries(gameFinishedData.scores).map(([s, sc]) => (
                <div key={s} className="flex justify-between">
                  <span>Seat {s}</span>
                  <span>{sc}✦</span>
                </div>
              ))}
              <button
                onClick={() => setGameFinishedData(null)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
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
