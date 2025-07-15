"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Socket } from "socket.io-client";
import { lazySocket } from "@/utils/lazySocket";

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
}

interface MatchmakingPreferences {
  mode: "quick-bots" | "prefer-humans" | "humans-only";
  region: string;
  skillLevel: string;
}

interface QueueStatus {
  playersInQueue: number;
  waitingRooms: number;
  totalPlayersInWaitingRooms: number;
  estimatedWait?: number;
}

interface MatchResult {
  status: string;
  roomId?: string;
  gameType?: string;
  message?: string;
}

interface MatchFoundData {
  message: string;
  playersFound?: number;
  waitingForMore?: number;
  redirect?: boolean;
  roomId?: string;
}

interface WaitingRoomData {
  playersCount: number;
}

interface GameStartingData {
  message: string;
  redirect?: boolean;
  roomId?: string;
}

interface MatchTimeoutData {
  message: string;
}

export default function MatchmakingModal({
  isOpen,
  onClose,
  playerName,
}: MatchmakingModalProps) {
  const [isQueued, setIsQueued] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [preferences, setPreferences] = useState<MatchmakingPreferences>({
    mode: "prefer-humans",
    region: "global",
    skillLevel: "mixed",
  });
  const [matchFoundMessage, setMatchFoundMessage] = useState("");
  const [waitingMessage, setWaitingMessage] = useState("");
  const [timeInQueue, setTimeInQueue] = useState(0);
  const [playersFound, setPlayersFound] = useState(0);
  const [waitingForMore, setWaitingForMore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  const leaveQueue = useCallback(async () => {
    const socket = socketRef.current || (await lazySocket.getSocket());

    socket.emit("leaveMatchmaking", () => {
      setIsQueued(false);
      setTimeInQueue(0);
      setMatchFoundMessage("");
      setWaitingMessage("");
      setPlayersFound(0);
      setWaitingForMore(0);
      onClose();
    });
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Set default to prefer-humans for online play
      setPreferences((prev) => ({ ...prev, mode: "prefer-humans" }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isQueued) return;

    // Setup socket connection and listeners when modal opens and queued
    const setupSocket = async () => {
      try {
        const socket = await lazySocket.getSocket();
        socketRef.current = socket;

        // Listen for match found
        socket.on("matchFound", (data: MatchFoundData) => {
          console.log("Match found:", data);
          setMatchFoundMessage(data.message);
          setPlayersFound(data.playersFound || 4);
          setWaitingForMore(data.waitingForMore || 0);

          if (data.redirect || data.roomId) {
            // Navigate to room after a short delay
            setTimeout(() => {
              const roomUrl = `/room/${data.roomId}?name=${encodeURIComponent(
                playerName
              )}`;
              router.push(roomUrl);
            }, 2000);
          }
        });

        // Listen for queue status updates
        socket.on("queueStatus", (status: QueueStatus) => {
          setQueueStatus(status);
        });

        // Listen for waiting room updates
        socket.on("waitingRoomUpdate", (data: WaitingRoomData) => {
          setPlayersFound(data.playersCount);
          setWaitingForMore(4 - data.playersCount);
          setWaitingMessage(
            `Found ${data.playersCount}/4 players. Looking for ${
              4 - data.playersCount
            } more...`
          );
        });

        // Listen for match timeout
        socket.on("matchTimeout", (data: MatchTimeoutData) => {
          setMatchFoundMessage(data.message);
          setTimeout(() => {
            leaveQueue();
          }, 3000);
        });

        // Listen for game starting
        socket.on("gameStarting", (data: GameStartingData) => {
          setMatchFoundMessage(data.message);
          if (data.redirect && data.roomId) {
            setTimeout(() => {
              const roomUrl = `/room/${data.roomId}?name=${encodeURIComponent(
                playerName
              )}`;
              router.push(roomUrl);
            }, 1500);
          }
        });
      } catch (error) {
        console.error("Error setting up socket for matchmaking:", error);
      }
    };

    setupSocket();

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.off("matchFound");
        socket.off("queueStatus");
        socket.off("waitingRoomUpdate");
        socket.off("matchTimeout");
        socket.off("gameStarting");
      }
    };
  }, [isOpen, isQueued, playerName, router, leaveQueue]);

  // Timer for queue time
  useEffect(() => {
    if (isQueued && !matchFoundMessage) {
      timerRef.current = setInterval(() => {
        setTimeInQueue((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isQueued, matchFoundMessage]);

  const joinQueue = async () => {
    if (!playerName.trim()) return;

    try {
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      socket.emit(
        "joinMatchmaking",
        playerName,
        preferences,
        (result: MatchResult) => {
          if (result.status === "queued" || result.status === "matched") {
            setIsQueued(true);
            setTimeInQueue(0);
            setMatchFoundMessage("");
            setWaitingMessage("");

            if (result.status === "matched") {
              setMatchFoundMessage("Match found instantly!");
            }
          } else {
            console.error("Failed to join queue:", result);
          }
        }
      );
    } catch (error) {
      console.error("Error connecting for matchmaking:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleModeChange = (mode: MatchmakingPreferences["mode"]) => {
    setPreferences((prev) => ({ ...prev, mode }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Find a Match</h2>
            <button
              onClick={isQueued ? leaveQueue : onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {!isQueued ? (
            <div className="space-y-6">
              {/* Game Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Game Mode
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="quick-bots"
                      checked={preferences.mode === "quick-bots"}
                      onChange={() => handleModeChange("quick-bots")}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Quick Game with Bots
                      </div>
                      <div className="text-sm text-gray-500">
                        Start immediately with AI players
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="prefer-humans"
                      checked={preferences.mode === "prefer-humans"}
                      onChange={() => handleModeChange("prefer-humans")}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Prefer Real Players
                      </div>
                      <div className="text-sm text-gray-500">
                        Wait for humans, add bots if needed
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="humans-only"
                      checked={preferences.mode === "humans-only"}
                      onChange={() => handleModeChange("humans-only")}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        Humans Only
                      </div>
                      <div className="text-sm text-gray-500">
                        Wait for real players only (longer wait)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Queue Stats */}
              {queueStatus && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-900">
                    <div>Players in queue: {queueStatus.playersInQueue}</div>
                    <div>Active waiting rooms: {queueStatus.waitingRooms}</div>
                    {queueStatus.estimatedWait && (
                      <div>Estimated wait: ~{queueStatus.estimatedWait}s</div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={joinQueue}
                disabled={!playerName.trim()}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Find Match
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              {matchFoundMessage ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {matchFoundMessage}
                  </div>
                  {playersFound > 0 && waitingForMore > 0 && (
                    <div className="text-sm text-gray-600">
                      {playersFound}/4 players ready. Filling {waitingForMore}{" "}
                      spots with bots...
                    </div>
                  )}
                  <div className="text-sm text-gray-500">Starting game...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="text-xl font-bold text-gray-900">
                    {waitingMessage || "Searching for players..."}
                  </div>
                  <div className="text-sm text-gray-600">
                    Time in queue: {formatTime(timeInQueue)}
                  </div>

                  {playersFound > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-900">
                        Players found: {playersFound}/4
                        {waitingForMore > 0 && (
                          <div>
                            Looking for {waitingForMore} more players...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {preferences.mode === "prefer-humans" && timeInQueue > 30 && (
                    <div className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      Still searching... We&apos;ll add bots if no players are
                      found soon.
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={leaveQueue}
                className="w-full bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
