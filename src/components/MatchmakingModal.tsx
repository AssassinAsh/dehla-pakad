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

interface QueueStatus {
  playersInQueue: number;
  waitingRooms: number;
  totalPlayersInWaitingRooms: number;
  estimatedWait?: number;
}

interface LobbyData {
  roomId: string;
  message: string;
  playersCount: number;
  maxPlayers: number;
  timeRemaining: number;
  yourSeat?: number;
}

interface LobbyUpdateData {
  playersCount: number;
  maxPlayers: number;
  timeRemaining: number;
  players: Array<{ name: string; seat: number }>;
}

interface GameStartingData {
  message: string;
  redirect?: boolean;
  roomId?: string;
}

export default function MatchmakingModal({
  isOpen,
  onClose,
  playerName,
}: MatchmakingModalProps) {
  const [isQueued, setIsQueued] = useState(false);
  const [matchFoundMessage, setMatchFoundMessage] = useState("");
  const [waitingMessage, setWaitingMessage] = useState("");
  const [timeInQueue, setTimeInQueue] = useState(0);
  const [playersFound, setPlayersFound] = useState(0);
  const [waitingForMore, setWaitingForMore] = useState(0);
  const [lobbyTimeRemaining, setLobbyTimeRemaining] = useState(15);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lobbyTimerRef = useRef<NodeJS.Timeout | null>(null);
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
      setLobbyTimeRemaining(15);
      onClose();
    });
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Automatically join lobby when modal opens
      if (playerName.trim()) {
        setIsQueued(true);
      }
    }
  }, [isOpen, playerName]);

  useEffect(() => {
    if (!isOpen || !isQueued) return;

    // Setup socket connection and listeners when modal opens and queued
    const setupSocket = async () => {
      try {
        const socket = await lazySocket.getSocket();
        socketRef.current = socket;

        // Listen for lobby joined
        socket.on("lobbyJoined", (data: LobbyData) => {
          console.log("Lobby joined:", data);
          setPlayersFound(data.playersCount);
          setWaitingForMore(data.maxPlayers - data.playersCount);
          setLobbyTimeRemaining(data.timeRemaining);
          setMatchFoundMessage(data.message);

          // Start countdown timer
          if (lobbyTimerRef.current) {
            clearInterval(lobbyTimerRef.current);
          }

          lobbyTimerRef.current = setInterval(() => {
            setLobbyTimeRemaining((prev) => {
              if (prev <= 1) {
                if (lobbyTimerRef.current) {
                  clearInterval(lobbyTimerRef.current);
                  lobbyTimerRef.current = null;
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        });

        // Listen for lobby updates
        socket.on("lobbyUpdate", (data: LobbyUpdateData) => {
          console.log("Lobby update:", data);
          setPlayersFound(data.playersCount);
          setWaitingForMore(data.maxPlayers - data.playersCount);
          setLobbyTimeRemaining(data.timeRemaining);
          setMatchFoundMessage(
            `Lobby: ${data.playersCount}/${data.maxPlayers} players ready`
          );
        });

        // Listen for game starting
        socket.on("gameStarting", (data: GameStartingData) => {
          setMatchFoundMessage("Game Starting! Redirecting...");
          if (data.redirect && data.roomId) {
            setTimeout(() => {
              const roomUrl = `/room/${data.roomId}?name=${encodeURIComponent(
                playerName
              )}`;
              router.push(roomUrl);
            }, 1500);
          }
        });

        // Listen for queue status updates (for statistics)
        socket.on("queueStatus", (status: QueueStatus) => {
          console.log("Queue status:", status);
        });

        // Automatically join lobby
        socket.emit(
          "joinMatchmaking",
          playerName,
          { mode: "lobby" },
          (result: { status: string; roomId?: string }) => {
            console.log("Join lobby result:", result);
          }
        );
      } catch (error) {
        console.error("Error setting up socket for matchmaking:", error);
      }
    };

    setupSocket();

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.off("lobbyJoined");
        socket.off("lobbyUpdate");
        socket.off("gameStarting");
        socket.off("queueStatus");
      }

      // Clean up lobby timer
      if (lobbyTimerRef.current) {
        clearInterval(lobbyTimerRef.current);
        lobbyTimerRef.current = null;
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Join Lobby</h2>
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
          <div className="text-center space-y-6">
            {matchFoundMessage ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  Lobby Status
                </div>
                <div className="text-lg text-gray-700">{matchFoundMessage}</div>

                {/* Lobby Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Players Joined</span>
                    <span>{playersFound}/4</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(playersFound / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Countdown Timer */}
                {lobbyTimeRemaining > 0 && (
                  <div className="space-y-2">
                    <div className="text-lg font-semibold text-gray-700">
                      Game starts in: {lobbyTimeRemaining}s
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(lobbyTimeRemaining / 15) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {playersFound === 4 && (
                  <div className="text-green-600 font-bold">
                    🎉 Lobby Full! Starting game...
                  </div>
                )}
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
                        <div>Looking for {waitingForMore} more players...</div>
                      )}
                    </div>
                  </div>
                )}

                {timeInQueue > 30 && (
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
        </div>
      </div>
    </div>
  );
}
