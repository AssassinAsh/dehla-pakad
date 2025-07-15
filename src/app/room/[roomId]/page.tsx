"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room, Player, Card } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal";
import PlayerHand from "@/components/PlayerHand";
import Toast from "@/components/Toast"; // Import the new Toast component
import ReplayModal from "@/components/ReplayModal";

import "@/styles/animations.css";
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";

// Patch GameState type for kot/draw
// (Remove this if you add kot/draw to the main type)
type PatchedGameState = Room["gameState"] & { kot?: number; draw?: boolean };

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
  const [error, setError] = useState<string | null>(null); // State for error toast

  // Copy invite link to clipboard
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  // Initialize Socket.IO client
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    // Connection status for debugging
    socket.on("connect", () => {
      // Explicitly check if we're in a valid room once connected
      if (roomId) {
        socket.emit("checkRoom", roomId, (exists: boolean) => {
          if (!exists) {
            console.error("Room doesn't exist:", roomId);
            // Use the toast for this error as well
            setError(`Room ${roomId} doesn't exist or has been closed.`);
            setTimeout(() => {
              window.location.href = "/";
            }, 3000);
          }
        });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      setError("Connection to server failed. Please refresh.");
    });

    // Listen for joinRoom callback errors
    socket.on("error", (message) => {
      setError(message);
    });

    // Join room for updates (server will add to socket.join on create/join events)
    socket.on("roomUpdated", (updated: Room) => {
      setRoom(updated);

      // If we're already in the player list, update our current player
      const me = updated.players.find((p) => p.name === playerName);
      if (me) {
        setCurrentPlayer(me);
      }
    });

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
      () => {}
    );
  };

  const playCard = (card: Card) => {
    if (!currentPlayer || !room || !socketRef.current) {
      return;
    }
    if (room.currentPlayer !== currentPlayer.seat) {
      return;
    }
    // Send to server with playerName for identification
    socketRef.current.emit("playCard", room.id, card.id, playerName);
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
        playCard(card);
      }
    } else {
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
      setError(null); // Clear any previous error
      router.replace(
        `/room/${roomId}?name=${encodeURIComponent(nameInput.trim())}`
      );
    }
  };

  // Helper: is it this player's turn?
  const isMyTurn =
    currentPlayer &&
    room &&
    room.gameState.status === "in-progress" &&
    room.currentPlayer === currentPlayer.seat;

  const [showReplayModal, setShowReplayModal] = useState(false);
  const [endgameResult, setEndgameResult] = useState<null | {
    result: "win" | "lose" | "draw";
    isKot: boolean;
    isDraw: boolean;
    t1Tens: number;
    t2Tens: number;
    t1Tricks: number;
    t2Tricks: number;
  }>(null);

  // Watch for game end
  useEffect(() => {
    if (room && room.gameState.status === "finished") {
      // Determine result
      const t1Tens = room.gameState.scores.team1.tens;
      const t2Tens = room.gameState.scores.team2.tens;
      const t1Tricks = room.gameState.scores.team1.tricks;
      const t2Tricks = room.gameState.scores.team2.tricks;
      const mySeat = currentPlayer?.seat;
      const myTeam = mySeat && (mySeat % 2 === 1 ? "team1" : "team2");
      let result: "win" | "lose" | "draw" = "lose";
      const gs = room.gameState as PatchedGameState;
      const isKot = gs.kot === 1 || gs.kot === 2;
      const isDraw = !!gs.draw;
      if (isDraw) result = "draw";
      else if (
        (t1Tens > t2Tens && myTeam === "team1") ||
        (t2Tens > t1Tens && myTeam === "team2") ||
        (t1Tens === t2Tens &&
          ((t1Tricks > t2Tricks && myTeam === "team1") ||
            (t2Tricks > t1Tricks && myTeam === "team2")))
      ) {
        result = "win";
      }
      setEndgameResult({
        result,
        isKot,
        isDraw,
        t1Tens,
        t2Tens,
        t1Tricks,
        t2Tricks,
      });
      setShowReplayModal(true);
    }
  }, [room, currentPlayer]);

  const handleReplay = () => {
    // Close the replay modal and return to the table
    setShowReplayModal(false);
    setEndgameResult(null);
  };
  const handleLeave = () => {
    if (socketRef.current && room) {
      socketRef.current.emit("leaveRoom", room.id);
      socketRef.current.disconnect();
    }
    setCurrentPlayer(null);
    window.location.href = "/";
  };

  // Add handler for Ready button
  const handleReady = () => {
    if (socketRef.current && room && currentPlayer) {
      socketRef.current.emit("playerReady", room.id, currentPlayer.name);
    }
  };

  const handleAddBot = (seat: number) => {
    if (socketRef.current && room) {
      // Add a bot to the specific seat with medium difficulty
      socketRef.current.emit("addBotToSeat", room.id, seat, "medium");
    }
  };

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
          {error && (
            <div className="w-full mb-3 bg-red-700/80 text-white text-sm font-semibold rounded-lg px-3 py-2 text-center animate-fade-in-up border border-red-400">
              {error}
            </div>
          )}
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
        {/* Enhanced Replay Modal */}
        {showReplayModal && endgameResult && room && currentPlayer && (
          <ReplayModal
            isOpen={showReplayModal}
            gameMode={room.gameMode || "private"}
            gameResult={{
              result: endgameResult.result,
              isKot: endgameResult.isKot,
              isDraw: endgameResult.isDraw,
              t1Tens: endgameResult.t1Tens,
              t2Tens: endgameResult.t2Tens,
              t1Tricks: endgameResult.t1Tricks,
              t2Tricks: endgameResult.t2Tricks,
            }}
            replayState={
              room.replayState
                ? {
                    votesNeeded: room.replayState.votesNeeded,
                    currentVotes: room.replayState.votes.size,
                    isWaitingForVotes: room.replayState.isReplayInProgress,
                    isHost: room.host === currentPlayer.name,
                  }
                : undefined
            }
            onClose={handleReplay}
            onReplay={() => {
              if (socketRef.current && room) {
                socketRef.current.emit("playerReplay", room.id);
              }
            }}
            onLeave={handleLeave}
          />
        )}
        {/* Modern Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-8 py-2 md:py-4 bg-gradient-to-b from-black/70 to-transparent rounded-b-2xl shadow-lg mb-2 md:mb-4">
          {/* Room ID Pill */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-400 text-gray-900 font-bold text-base shadow-md border-2 border-yellow-600 select-all">
              <span className="tracking-widest">{room.id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(room.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="ml-2 p-1 rounded-full bg-yellow-500 hover:bg-yellow-300 transition-colors"
                aria-label="Copy Room ID"
              >
                {copied ? (
                  <svg
                    className="w-4 h-4 text-green-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                  </svg>
                )}
              </button>
            </span>
          </div>

          {/* Share Button (Web Share API on mobile, fallback to copy) */}
          <button
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: "Join my Dehla Pakad room!",
                  text: `Join my Dehla Pakad room: ${room.id}`,
                  url: inviteUrl,
                });
              } else {
                navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold shadow-md border-2 border-yellow-600 hover:from-yellow-300 hover:to-yellow-400 transition-colors text-base min-w-[120px] justify-center"
            aria-label="Share Room Link"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 6l-4-4-4 4m4-4v16"
              />
            </svg>
            <span>Share Room</span>
            {copied && (
              <span className="ml-2 text-green-700 font-semibold animate-fade-in">
                Copied!
              </span>
            )}
          </button>

          {/* Show Rules FAB (mobile) or Icon Button (desktop) */}
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center justify-center w-20 h-14 md:w-auto md:h-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-300 text-gray-900 font-bold shadow-2xl border-4 border-yellow-600 hover:from-yellow-300 hover:to-yellow-400 hover:text-gray-900 transition-all px-4 py-2 text-lg gap-2"
            aria-label="Show Rules"
            style={{ boxShadow: "0 6px 32px 0 rgba(251, 191, 36, 0.25)" }}
          >
            <svg
              className="w-7 h-7 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="ml-1">Rules</span>
          </button>
        </header>
        <main className="max-w-7xl mx-auto space-y-2 md:space-y-4">
          {/* Table */}
          <GameTable
            room={room}
            dealerSeat={room.dealerSeat}
            currentPlayerId={currentPlayer?.id}
            onSeatClick={joinSeat}
            onAddBot={handleAddBot}
            isHost={currentPlayer?.name === room.host}
          />

          {/* Ready Button System - Centered in viewport */}
          {!room.gameStarted && room.players.length === 4 && (
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center space-y-6 pointer-events-auto">
                {!currentPlayer?.isReady ? (
                  <button
                    onClick={handleReady}
                    className="bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-4 px-12 rounded-xl hover:from-green-300 hover:to-green-500 transition-all transform hover:scale-105 shadow-2xl text-2xl border-3 border-green-700 animate-pulse"
                    style={{
                      boxShadow: "0 10px 40px 0 rgba(34, 197, 94, 0.4)",
                    }}
                  >
                    Ready to Play
                  </button>
                ) : (
                  <div className="text-yellow-300 font-bold text-xl animate-pulse bg-black/80 px-6 py-3 rounded-xl border-2 border-yellow-500 shadow-xl">
                    Waiting for others to get ready…
                  </div>
                )}
                {/* Show which players are ready */}
                <div className="flex flex-wrap gap-3 justify-center max-w-md bg-black/80 p-4 rounded-xl border border-gray-600 shadow-xl">
                  {room.players.map((p) => (
                    <span
                      key={p.name}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 shadow-lg transition-all ${
                        p.isReady
                          ? "bg-green-500 border-green-400 text-white transform scale-105"
                          : "bg-gray-700 border-gray-500 text-gray-300"
                      }`}
                    >
                      {p.name} {p.isReady ? "✓" : "⏳"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
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
      {error && (
        <Toast message={error} onClose={() => setError(null)} type="error" />
      )}
    </DndContext>
  );
}
