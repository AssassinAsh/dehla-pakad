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
import { useAudio } from "@/hooks/useAudio";

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

// Preload all card images and sound files
const CARD_IMAGE_PATHS = [
  "2C",
  "2D",
  "2H",
  "2S",
  "3C",
  "3D",
  "3H",
  "3S",
  "4C",
  "4D",
  "4H",
  "4S",
  "5C",
  "5D",
  "5H",
  "5S",
  "6C",
  "6D",
  "6H",
  "6S",
  "7C",
  "7D",
  "7H",
  "7S",
  "8C",
  "8D",
  "8H",
  "8S",
  "9C",
  "9D",
  "9H",
  "9S",
  "10C",
  "10D",
  "10H",
  "10S",
  "JC",
  "JD",
  "JH",
  "JS",
  "QC",
  "QD",
  "QH",
  "QS",
  "KC",
  "KD",
  "KH",
  "KS",
  "AC",
  "AD",
  "AH",
  "AS",
  "back",
].map((name) => `/cards/${name}.png`);

const SOUND_PATHS = [
  "/sound/card-deal.mp3",
  "/sound/card-play.mp3",
  "/sound/defeat.mp3",
  "/sound/stack-won.mp3",
  "/sound/victory.mp3",
];

const normalizePlayerName = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

const selectCurrentPlayer = (
  players: Player[] | undefined,
  socketId: string | undefined,
  playerName: string,
) => {
  if (!players?.length) {
    return null;
  }

  const playerBySocket = players.find((player) => player.id === socketId);
  if (playerBySocket) {
    return playerBySocket;
  }

  const normalizedPlayerName = normalizePlayerName(playerName);
  if (!normalizedPlayerName) {
    return null;
  }

  return (
    [...players]
      .filter(
        (player) => normalizePlayerName(player.name) === normalizedPlayerName,
      )
      .sort((left, right) => {
        const leftSeatScore = typeof left.seat === "number" ? 1 : 0;
        const rightSeatScore = typeof right.seat === "number" ? 1 : 0;
        if (leftSeatScore !== rightSeatScore) {
          return rightSeatScore - leftSeatScore;
        }

        const leftHandScore = left.hand?.length ?? 0;
        const rightHandScore = right.hand?.length ?? 0;
        return rightHandScore - leftHandScore;
      })[0] ?? null
  );
};

export default function RoomPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "";

  const [preloadProgress, setPreloadProgress] = useState({
    loaded: 0,
    total: 0,
    done: false,
  });

  function preloadAssetsWithProgress() {
    let loaded = 0;
    let total = 0;
    let completed = 0;
    const assetList = [...CARD_IMAGE_PATHS, ...SOUND_PATHS];
    const assetSizes: Record<string, number> = {};

    // Step 1: Fetch all HEADs to get sizes
    Promise.all(
      assetList.map((src) =>
        fetch(src, { method: "HEAD" })
          .then((res) => {
            const size = parseInt(res.headers.get("content-length") || "0", 10);
            assetSizes[src] = size;
            total += size;
          })
          .catch(() => {
            assetSizes[src] = 0;
          }),
      ),
    ).then(() => {
      setPreloadProgress({ loaded: 0, total, done: false });
      // Step 2: Actually load assets and track progress
      assetList.forEach((src) => {
        fetch(src)
          .then((res) => res.blob())
          .then((blob) => {
            loaded += assetSizes[src] || blob.size;
            completed++;
            setPreloadProgress({
              loaded,
              total,
              done: completed === assetList.length,
            });
          })
          .catch(() => {
            completed++;
            setPreloadProgress({
              loaded,
              total,
              done: completed === assetList.length,
            });
          });
      });
    });
  }

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
    }),
  );

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // State for modal
  const [error, setError] = useState<string | null>(null); // State for error toast
  const [toastType, setToastType] = useState<
    "error" | "success" | "game" | "info"
  >("error");
  const [isPlayingCard, setIsPlayingCard] = useState(false); // Prevent rapid card plays
  const [tenCaptureSplash, setTenCaptureSplash] = useState<{
    message: string;
    type: "captured" | "lost";
    count: number;
  } | null>(null); // State for 10 capture splash
  const [hideHeader, setHideHeader] = useState(false);

  // Audio functionality for game sounds
  const {
    playCardPlay,
    playStackWon,
    playVictory,
    playDefeat,
    initializeAudio,
  } = useAudio();

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
      console.log("🚀 Room page: Initializing socket connection...");
      try {
        // Use lazySocket for consistency
        const newSocket = await lazySocket.getSocket();
        console.log("✅ Room page: Got socket from lazySocket", {
          socketId: newSocket.id,
          connected: newSocket.connected,
          transport: newSocket.io.engine?.transport?.name,
        });

        socketRef.current = newSocket;

        // Remove any existing room-specific event listeners to avoid conflicts
        newSocket.removeAllListeners("roomUpdated");
        newSocket.removeAllListeners("error");
        newSocket.removeAllListeners("gameRestarted");
        newSocket.removeAllListeners("replayRequestReceived");
        newSocket.removeAllListeners("replayApproved");
        newSocket.removeAllListeners("replayResponse");
        newSocket.removeAllListeners("hostLeft");
        newSocket.removeAllListeners("gameEvent");
        newSocket.removeAllListeners("tenCaptured");

        // If socket is already connected, immediately run the logic
        if (newSocket.connected) {
          console.log(
            "🔄 Room page: Socket already connected, handling immediately",
          );
          handleConnectedSocket(newSocket);
        } else {
          console.log(
            "⏳ Room page: Socket not connected, waiting for connect event",
          );
          // Only add connect listener if not already connected
          newSocket.once("connect", () => {
            console.log("✅ Room page: Socket connected event received");
            handleConnectedSocket(newSocket);
          });
        }

        function handleConnectedSocket(socket: Socket) {
          console.log("🎯 Room page: handleConnectedSocket called", {
            socketId: socket.id,
            roomId,
            playerName,
            connected: socket.connected,
          });

          // Explicitly check if we're in a valid room once connected
          if (roomId) {
            socket.emit("checkRoom", roomId, (exists: boolean) => {
              console.log("🏠 Room page: checkRoom response", {
                roomId,
                exists,
              });
              if (!exists) {
                console.error("Room doesn't exist:", roomId);
                showError(`Room ${roomId} doesn't exist or has been closed.`);
                setTimeout(() => {
                  window.location.href = "/";
                }, 3000);
              } else {
                // Room exists, try to join automatically if player has a name
                if (playerName) {
                  console.log("👤 Room page: Attempting auto-join", {
                    playerName,
                    roomId,
                  });
                  socket.emit(
                    "joinRoom",
                    roomId,
                    playerName,
                    null,
                    (success: boolean) => {
                      console.log("🚪 Room page: joinRoom response", {
                        success,
                      });
                      if (!success) {
                        console.log(
                          "Auto-join failed, player might need to select a seat",
                        );
                      }
                    },
                  );
                }
              }
            });
          }
        }

        newSocket.on("connect_error", (error: Error) => {
          console.error("Socket.IO connection error:", error);
          showError("Connection to server failed. Please refresh.");
        });

        // Listen for joinRoom callback errors
        newSocket.on("error", (message: string) => {
          showError(message);
        });

        // Join room for updates (server will add to socket.join on create/join events)
        newSocket.on("roomUpdated", (updated: Room) => {
          setRoom((prevRoom) => {
            // Audio integration - detect game state changes and play appropriate sounds
            if (prevRoom && updated) {
              // Initialize audio on first user interaction with the game
              initializeAudio().catch(console.warn);

              // Check for card played (when current trick length increases)
              if (updated.currentTrick && prevRoom.currentTrick) {
                if (
                  updated.currentTrick.length > prevRoom.currentTrick.length
                ) {
                  playCardPlay();
                  // Clear the playing flag since a card was successfully played
                  setIsPlayingCard(false);
                }
              }

              // Also clear playing flag if current player changed (backup check)
              if (prevRoom.currentPlayer !== updated.currentPlayer) {
                setIsPlayingCard(false);
              }

              // Check for trick completion and stack won
              if (updated.tricks && prevRoom.tricks) {
                if (updated.tricks.length > prevRoom.tricks.length) {
                  playStackWon();
                }
              }

              // Check for game end (status changes to finished)
              if (
                prevRoom.gameState?.status !== "finished" &&
                updated.gameState?.status === "finished"
              ) {
                // Game ended - audio will be played when replay modal opens
                // No audio logic here to avoid conflicts with the modal
              }
            }

            return updated;
          });

          // If we're already in the player list, update our current player
          // Prefer socket ID, but fall back to player name during reconnects.
          const me = selectCurrentPlayer(
            updated.players,
            newSocket.id,
            playerName,
          );
          if (me) {
            setCurrentPlayer(me);
          }
        });

        newSocket.on("gameEvent", () => {
          // Events are processed silently for future phases
        });

        // Listen for 10 capture events
        newSocket.on(
          "tenCaptured",
          (data: {
            winnerTeam: "team1" | "team2";
            tensCount: number;
            playerSeat: number;
          }) => {
            if (data.tensCount > 0) {
              // Use a more reliable way to get current player info using socket ID
              setRoom((currentRoom) => {
                if (currentRoom && newSocket.id) {
                  const currentPlayerInRoom = currentRoom.players?.find(
                    (p: Player) => p.id === newSocket.id,
                  );
                  const mySeat = currentPlayerInRoom?.seat;
                  const myTeam =
                    mySeat &&
                    (mySeat === 1 || mySeat === 3 ? "team1" : "team2");

                  const isMyTeam = myTeam === data.winnerTeam;
                  setTenCaptureSplash({
                    message: isMyTeam ? "10 Captured!" : "10 Lost!",
                    type: isMyTeam ? "captured" : "lost",
                    count: data.tensCount,
                  });

                  // Clear the splash after 2 seconds
                  setTimeout(() => {
                    setTenCaptureSplash(null);
                  }, 2000);
                }
                return currentRoom; // Return unchanged room
              });
            }
          },
        );

        // Handle replay events
        newSocket.on("gameRestarted", () => {
          setError(null);
          setShowReplayModal(false);
          setEndgameResult(null);
        });

        newSocket.on(
          "replayRequestReceived",
          (data: { requester: string; message: string }) => {
            // Show info notification that someone requested a replay
            showInfo(data.message);
          },
        );

        newSocket.on(
          "replayApproved",
          (data: { message: string; mode: string }) => {
            if (data.mode === "lobby") {
              // For lobby mode, redirect to home to join a new lobby
              showInfo(data.message);
              setTimeout(() => {
                window.location.href = "/";
              }, 2000);
            }
          },
        );

        newSocket.on(
          "replayResponse",
          (response: {
            success: boolean;
            message: string;
            mode?: string;
            matchmaking?: boolean;
          }) => {
            if (response.success) {
              // Check if this is a lobby matchmaking response
              if (response.mode === "lobby" && response.matchmaking) {
                // For lobby replay, redirect to home with params to auto-open matchmaking
                setShowReplayModal(false);
                setEndgameResult(null);
                const player = currentPlayer;
                const playerNameParam = player?.name
                  ? `&name=${encodeURIComponent(player.name)}`
                  : "";
                window.location.href = `/?joinLobby=true${playerNameParam}`;
              } else {
                // For other modes (quick-bots, private), close modal and return to game table
                setShowReplayModal(false);
                setEndgameResult(null);
              }
            } else {
              // Only show error messages
              if (response.message && response.message.trim()) {
                showError(response.message);
              }
            }
          },
        );

        // Handle admin/host leaving
        newSocket.on("hostLeft", (data: { message: string }) => {
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
        socketRef.current.removeAllListeners("gameEvent");
        socketRef.current.removeAllListeners("tenCaptured");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerName]); // Removed currentPlayer to prevent infinite loop

  useEffect(() => {
    // Preload assets on first mount with progress
    preloadAssetsWithProgress();
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > lastScrollY && window.scrollY > 40) {
            setHideHeader(true); // Hide on scroll down
          } else {
            setHideHeader(false); // Show on scroll up
          }
          lastScrollY = window.scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const joinSeat = async (seatNumber: number) => {
    if (!playerName || !room || !socketRef.current) return;

    // Initialize audio when user starts interacting with the game
    initializeAudio().catch(console.warn);

    socketRef.current.emit(
      "joinRoom",
      roomId,
      playerName,
      seatNumber,
      (success: boolean) => {
        if (!success) {
          showError("Failed to join seat. Please try again.");
        }
      },
    );
  };

  // Play a card
  const playCard = async (card: Card) => {
    if (!currentPlayer || !room || !socketRef.current) {
      return;
    }

    // Prevent rapid card plays
    if (isPlayingCard) {
      return;
    }

    // Initialize audio on first card play interaction
    initializeAudio().catch(console.warn);

    // Basic validation
    if (room.currentPlayer !== currentPlayer.seat) {
      showError("It's not your turn!");
      return;
    }

    // Prevent card plays during stack collection
    if (room.gameState?.isCollectingStack) {
      showError("Please wait while the stack is being collected.");
      return;
    }

    // Set playing flag to prevent multiple rapid plays
    setIsPlayingCard(true);

    socketRef.current.emit("playCard", {
      roomId,
      cardId: card.id,
      playerName,
      actionId: `${roomId}:${card.id}:${Date.now()}`,
    });

    // Clear the flag after a short delay to allow the server to process
    setTimeout(() => {
      setIsPlayingCard(false);
    }, 500); // 500ms should be enough for server processing
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
        `/room/${roomId}?name=${encodeURIComponent(nameInput.trim())}`,
      );
    }
  };

  // Helper: is it this player's turn?
  const isMyTurn =
    currentPlayer &&
    room &&
    room.gameState.status === "in-progress" &&
    room.currentPlayer === currentPlayer.seat &&
    !room.gameState?.isCollectingStack; // Prevent plays during stack collection

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

      // Play appropriate sound based on game result
      setTimeout(() => {
        if (result === "draw") {
          // For draws, don't play victory or defeat sound
          return;
        } else if (result === "win") {
          playVictory();
        } else {
          playDefeat();
        }
      }, 500); // Small delay to let UI update first
    }
  }, [room, currentPlayer, playVictory, playDefeat]);

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
    if (socketRef.current && room) {
      // Initialize audio when player clicks ready
      initializeAudio().catch(console.warn);

      // Use socket ID instead of player name for ready system
      // This fixes issues with duplicate names
      socketRef.current.emit("playerReady", room.id);
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
                    isHost: room.host === currentPlayer.id,
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
          hide={hideHeader}
        />
        <main className="max-w-7xl mx-auto space-y-2 md:space-y-4">
          {/* Table */}
          <GameTable
            room={room}
            dealerSeat={room.dealerSeat}
            currentPlayerId={currentPlayer?.id}
            onSeatClick={joinSeat}
            onAddBot={handleAddBot}
            isHost={currentPlayer?.id === room.host}
            socket={socketRef.current || undefined}
            onShowRules={() => setIsRulesModalOpen(true)}
          />

          {/* Ready Button System - Centered in viewport */}
          {!room.gameStarted &&
            room.players.length === 4 &&
            room.players.every((p) => p.seat !== null) && (
              <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                {/* Only the actual ready box is pointer-events-auto, not the whole center area */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4 pointer-events-auto z-50">
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
                          key={`${p.name}-${p.seat}`}
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
              </div>
            )}
        </main>

        {/* Ten Capture Splash */}
        {tenCaptureSplash && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className={`
                px-8 py-6 rounded-2xl shadow-2xl border-4 font-bold text-2xl transform
                ${
                  tenCaptureSplash.type === "captured"
                    ? "bg-gradient-to-r from-green-500 to-green-600 border-green-400 text-white shadow-green-500/50"
                    : "bg-gradient-to-r from-red-500 to-red-600 border-red-400 text-white shadow-red-500/50"
                }
              `}
              style={{
                animation:
                  "fadeInScale 0.3s ease-out, fadeOut 0.3s ease-in 1.7s forwards",
                boxShadow:
                  tenCaptureSplash.type === "captured"
                    ? "0 20px 60px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.4)"
                    : "0 20px 60px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.4)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-bounce">
                  {tenCaptureSplash.type === "captured" ? "🎯" : "💔"}
                </span>
                <div>
                  <div className="text-2xl font-black tracking-wide">
                    {tenCaptureSplash.message}
                  </div>
                  {tenCaptureSplash.count > 1 && (
                    <div className="text-lg opacity-90 font-semibold">
                      {tenCaptureSplash.count} tens in this stack!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
