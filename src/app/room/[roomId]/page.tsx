"use client";

import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Room, Player, Card } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal";
import PlayerHand from "@/components/PlayerHand";
import Toast from "@/components/Toast"; // Import the new Toast component
import ReplayModal from "@/components/ReplayModal";
import SmartHeader from "@/components/SmartHeader";
import { lazySocket } from "@/utils/lazySocket";

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
  const [toastType, setToastType] = useState<
    "error" | "success" | "game" | "info"
  >("error");

  // Helper functions for different toast types
  const showError = (message: string) => {
    setToastType("error");
    setError(message);
  };

  const showInfo = (message: string) => {
    setToastType("info");
    setError(message);
  };

  // Initialize Socket.IO client
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Use lazySocket for consistency
        const socket = await lazySocket.getSocket();
        socketRef.current = socket;

        // Remove any existing room-specific event listeners to avoid conflicts
        socket.removeAllListeners("roomUpdated");
        socket.removeAllListeners("error");
        socket.removeAllListeners("gameRestarted");
        socket.removeAllListeners("replayRequestReceived");
        socket.removeAllListeners("replayApproved");
        socket.removeAllListeners("replayResponse");
        socket.removeAllListeners("hostLeft");

        // If socket is already connected, immediately run the logic
        if (socket.connected) {
          handleConnectedSocket(socket);
        } else {
          // Only add connect listener if not already connected
          socket.once("connect", () => {
            handleConnectedSocket(socket);
          });
        }

        function handleConnectedSocket(socket: Socket) {
          // Explicitly check if we're in a valid room once connected
          if (roomId) {
            socket.emit("checkRoom", roomId, (exists: boolean) => {
              if (!exists) {
                console.error("Room doesn't exist:", roomId);
                showError(`Room ${roomId} doesn't exist or has been closed.`);
                setTimeout(() => {
                  window.location.href = "/";
                }, 3000);
              } else {
                // Room exists, try to join automatically if player has a name
                if (playerName) {
                  socket.emit(
                    "joinRoom",
                    roomId,
                    playerName,
                    null,
                    (success: boolean) => {
                      if (!success) {
                        console.log(
                          "Auto-join failed, player might need to select a seat"
                        );
                      }
                    }
                  );
                }
              }
            });
          }
        }

        socket.on("connect_error", (error: Error) => {
          console.error("Socket.IO connection error:", error);
          showError("Connection to server failed. Please refresh.");
        });

        // Listen for joinRoom callback errors
        socket.on("error", (message: string) => {
          showError(message);
        });

        // Join room for updates (server will add to socket.join on create/join events)
        socket.on("roomUpdated", (updated: Room) => {
          setRoom(updated);

          // If we're already in the player list, update our current player
          const me = updated.players?.find((p) => p.name === playerName);
          if (me) {
            setCurrentPlayer(me);
          }
        });

        // Handle replay events
        socket.on("gameRestarted", () => {
          setError(null);
          setShowReplayModal(false);
          setEndgameResult(null);
        });

        socket.on(
          "replayRequestReceived",
          (data: { requester: string; message: string }) => {
            // Show info notification that someone requested a replay
            showInfo(data.message);
          }
        );

        socket.on(
          "replayApproved",
          (data: { message: string; mode: string }) => {
            if (data.mode === "lobby") {
              // For lobby mode, redirect to home to join a new lobby
              showInfo(data.message);
              setTimeout(() => {
                window.location.href = "/";
              }, 2000);
            }
          }
        );

        socket.on(
          "replayResponse",
          (response: { success: boolean; message: string }) => {
            if (response.success) {
              // For successful replay, close the modal and return to game table
              setShowReplayModal(false);
              setEndgameResult(null);
            } else {
              // Only show error messages
              if (response.message && response.message.trim()) {
                showError(response.message);
              }
            }
          }
        );

        // Handle admin/host leaving
        socket.on("hostLeft", (data: { message: string }) => {
          showError(data.message);
          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
        });
      } catch (error) {
        console.error("Failed to connect socket:", error);
        showError("Failed to connect to server. Please refresh.");
      }
    };

    initSocket();

    return () => {
      // Don't disconnect the socket entirely, just remove our listeners
      if (socketRef.current) {
        socketRef.current.removeAllListeners("roomUpdated");
        socketRef.current.removeAllListeners("error");
        socketRef.current.removeAllListeners("gameRestarted");
        socketRef.current.removeAllListeners("replayRequestReceived");
        socketRef.current.removeAllListeners("replayApproved");
        socketRef.current.removeAllListeners("replayResponse");
        socketRef.current.removeAllListeners("hostLeft");
      }
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
        {/* Smart Header */}
        <SmartHeader
          room={room}
          isGameInProgress={room.gameState.status === "in-progress"}
          onShowRules={() => setIsRulesModalOpen(true)}
        />
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
          {!room.gameStarted &&
            room.players.length === 4 &&
            room.players.every((p) => p.seat !== null) && (
              <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center space-y-4 pointer-events-auto">
                  {!currentPlayer?.isReady ? (
                    <button
                      onClick={handleReady}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg text-xl border-2 border-green-500 hover:border-green-400 active:scale-95"
                    >
                      🎮 Ready to Play
                    </button>
                  ) : (
                    <div className="text-yellow-400 font-semibold text-lg bg-yellow-900/30 px-6 py-3 rounded-lg border border-yellow-500/50 shadow-md">
                      ⏳ Waiting for others to get ready…
                    </div>
                  )}
                  {/* Show which players are ready */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-md bg-gray-900/50 p-4 rounded-lg border border-gray-700 shadow-md">
                    {room.players.map((p) => (
                      <span
                        key={p.name}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          p.isReady
                            ? "bg-green-600 border-green-500 text-white"
                            : "bg-gray-700 border-gray-600 text-gray-300"
                        }`}
                      >
                        {p.name} {p.isReady ? "✅" : "⏳"}
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
        <Toast
          message={error}
          onClose={() => setError(null)}
          type={toastType}
        />
      )}
    </DndContext>
  );
}
