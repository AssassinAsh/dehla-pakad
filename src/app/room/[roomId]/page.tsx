"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room, Player, Card } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal";
import PlayerHand from "@/components/PlayerHand";
import Toast from "@/components/Toast"; // Import the new Toast component
import "@/styles/animations.css";
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

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

    socket.on("error", (message) => {
      console.error("Received error from server:", message);
      setError(message);
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
    console.log(`Playing card: ${card.id} as player ${playerName}`);
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

  const [showEndgameModal, setShowEndgameModal] = useState(false);
  const [endgameResult, setEndgameResult] = useState<null | {
    result: "win" | "lose" | "draw";
    isKot: boolean;
    isDraw: boolean;
    t1Tens: number;
    t2Tens: number;
    t1Tricks: number;
    t2Tricks: number;
  }>(null);
  const { width, height } = useWindowSize();

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
      setShowEndgameModal(true);
    }
  }, [room, currentPlayer]);

  const handleReplay = () => {
    // Notify backend that this player wants to replay
    if (socketRef.current && room) {
      socketRef.current.emit("playerReplay", room.id);
    }
    // Close the endgame modal and return to the table
    setShowEndgameModal(false);
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
        {/* Endgame Modal */}
        {showEndgameModal && endgameResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            {/* Confetti for win or Kot */}
            {(endgameResult.result === "win" ||
              (endgameResult.isKot && endgameResult.result !== "draw")) && (
              <Confetti
                width={width}
                height={height}
                numberOfPieces={endgameResult.isKot ? 800 : 400}
                recycle={false}
                gravity={0.3}
              />
            )}
            {/* Dramatic effect for Kot lose */}
            {endgameResult.isKot && endgameResult.result === "lose" && (
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-purple-900 opacity-80 animate-pulse pointer-events-none" />
            )}
            <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl border-4 border-yellow-400 max-w-md w-full p-8 flex flex-col items-center animate-fade-in-up">
              <h2
                className={`text-3xl font-extrabold mb-2 ${
                  endgameResult.result === "win"
                    ? "text-green-700"
                    : endgameResult.result === "lose"
                    ? "text-red-700"
                    : "text-yellow-600"
                }`}
              >
                {endgameResult.isKot
                  ? endgameResult.result === "win"
                    ? "KOT!"
                    : "KOT!"
                  : endgameResult.result === "win"
                  ? "You Win!"
                  : endgameResult.result === "lose"
                  ? "You Lose"
                  : "Match Draw"}
              </h2>
              {endgameResult.isKot && (
                <p className="text-lg font-bold text-purple-700 mb-2">
                  All four 10s captured!
                </p>
              )}
              <div className="flex flex-col gap-2 w-full mt-2 mb-4">
                <div className="flex justify-between w-full">
                  <span className="font-bold text-blue-700">Team 1 (1&3)</span>
                  <span className="font-mono">
                    {endgameResult.t1Tens} tens, {endgameResult.t1Tricks} tricks
                  </span>
                </div>
                <div className="flex justify-between w-full">
                  <span className="font-bold text-green-700">Team 2 (2&4)</span>
                  <span className="font-mono">
                    {endgameResult.t2Tens} tens, {endgameResult.t2Tricks} tricks
                  </span>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleReplay}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-2 rounded-lg shadow border-2 border-yellow-600 transition-transform transform hover:scale-105"
                >
                  Replay
                </button>
                <button
                  onClick={handleLeave}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-2 rounded-lg shadow border-2 border-gray-900 transition-transform transform hover:scale-105"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
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
          {!room.gameStarted &&
            room.players.length === 4 &&
            room.host === currentPlayer?.name && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 font-bold py-3 px-8 rounded-lg hover:from-yellow-400 hover:to-amber-400 transition-all transform hover:scale-105 shadow-lg text-xl border-2 border-yellow-600"
                >
                  Start Game / Deal Cards
                </button>
              </div>
            )}
          {/* Toast for non-hosts when all 4 players have joined */}
          {!room.gameStarted &&
            room.players.length === 4 &&
            room.host !== currentPlayer?.name && (
              <div className="flex justify-center mt-4">
                <Toast
                  message="All players are ready. Waiting for the host to start the game…"
                  onClose={() => {}}
                  type="game"
                  duration={3500}
                />
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
      {error && (
        <Toast message={error} onClose={() => setError(null)} type="error" />
      )}
    </DndContext>
  );
}
