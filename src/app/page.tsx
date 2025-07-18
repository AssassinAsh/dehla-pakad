"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Socket } from "socket.io-client";
import RulesModal from "@/components/RulesModal";
import FeedbackModal from "@/components/FeedbackModal";
import MatchmakingModal from "@/components/MatchmakingModal";
import InstallPrompt from "@/components/InstallPrompt";
import OfflineGame from "@/components/OfflineGame";
import { lazySocket } from "@/utils/lazySocket";

// Component that handles search params with Suspense boundary
function SearchParamsHandler({
  setPlayerName,
  setIsMatchmakingModalOpen,
}: {
  setPlayerName: (name: string) => void;
  setIsMatchmakingModalOpen: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const autoJoinLobby = searchParams.get("joinLobby");
    const nameFromUrl = searchParams.get("name");

    if (autoJoinLobby === "true") {
      // Set player name if provided in URL
      if (nameFromUrl) {
        setPlayerName(decodeURIComponent(nameFromUrl));
      }
      // Auto-open matchmaking modal
      setIsMatchmakingModalOpen(true);

      // Clean up URL params
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("joinLobby");
      newUrl.searchParams.delete("name");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, setPlayerName, setIsMatchmakingModalOpen]);

  return null;
}

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showPrivateRoomOptions, setShowPrivateRoomOptions] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinRoomError, setJoinRoomError] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  // Load name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // Save name to localStorage when it changes
  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName);
    }
  }, [playerName]);

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    setIsCreatingRoom(true);

    try {
      // Get socket connection only when needed
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      // Add a timeout to handle cases where the callback doesn't fire
      const timeoutId = setTimeout(() => {
        setIsCreatingRoom(false);
        alert("Room creation timed out. Please try again.");
      }, 5000);

      socket.emit("createRoom", playerName, (roomId: string | null) => {
        clearTimeout(timeoutId);

        if (roomId) {
          const roomUrl = `/room/${roomId}?name=${encodeURIComponent(
            playerName
          )}`;

          // Use only router.push, fallback to window.location.href only on error
          try {
            router.push(roomUrl);
          } catch (navError) {
            console.error("Navigation error:", navError);
            window.location.href = roomUrl;
          }
        } else {
          console.error("Failed to create room");
          alert("Failed to create room");
        }
        setIsCreatingRoom(false);
      });
    } catch (error) {
      console.error("Error connecting to create room:", error);
      alert("Connection error. Please try again.");
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = async () => {
    if (!joinRoomId.trim()) {
      setJoinRoomError("Please enter a room ID");
      return;
    }

    if (!playerName.trim()) {
      setJoinRoomError("Please enter your name");
      return;
    }

    try {
      // Get socket connection only when needed
      const socket = await lazySocket.getSocket();
      socketRef.current = socket;

      setJoinRoomError("");
      setIsJoiningRoom(true);
      const normalizedId = joinRoomId.trim().toUpperCase();

      // Check if room exists before trying to join
      socket.emit("checkRoom", normalizedId, (exists: boolean) => {
        setIsJoiningRoom(false);

        if (exists) {
          // Room exists, navigate to it with player name
          const roomUrl = `/room/${normalizedId}?name=${encodeURIComponent(
            playerName
          )}`;
          router.push(roomUrl);
        } else {
          // Room doesn't exist
          setJoinRoomError(
            `Room "${normalizedId}" not found. Please check the room ID and try again.`
          );
        }
      });
    } catch (error) {
      console.error("Error connecting to join room:", error);
      setJoinRoomError("Connection error. Please try again.");
      setIsJoiningRoom(false);
    }
  };

  const playWithComputer = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    // Check if we're online or offline
    const isOnline = navigator.onLine;

    // If offline or PWA available, trigger asset preloading
    if (!isOnline || "serviceWorker" in navigator) {
      try {
        // Send message to service worker to preload assets for better offline experience
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "PRELOAD_GAME_ASSETS",
          });
        }
      } catch {
        // Service worker not available, proceeding anyway
      }
    }

    // Use the existing multiplayer system with bots - works online/offline
    // This preserves the beautiful UI and sophisticated bot engine
    if (isOnline) {
      // Online: Use existing bot game creation system
      try {
        const socket = await lazySocket.getSocket();

        // Use existing createBotGame handler for instant bot game
        socket.emit(
          "createBotGame",
          playerName.trim(),
          (response: { status: string; roomId?: string; message?: string }) => {
            if (response && response.status === "matched" && response.roomId) {
              router.push(
                `/room/${response.roomId}?name=${encodeURIComponent(
                  playerName.trim()
                )}`
              );
            } else {
              console.error("Failed to create bot game:", response);
              setIsOfflineMode(true);
            }
          }
        );
      } catch {
        // Online computer game failed, falling back to offline
        setIsOfflineMode(true);
      }
    } else {
      // Offline: Use cached offline mode
      setIsOfflineMode(true);
    }
  };

  const playOnline = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    // Immediately show the matchmaking modal - the modal will handle joining
    setIsMatchmakingModalOpen(true);
  };

  return (
    <>
      {/* Offline Game Mode */}
      {isOfflineMode ? (
        <OfflineGame
          playerName={playerName}
          onGameEnd={() => setIsOfflineMode(false)}
        />
      ) : (
        <>
          {/* Handle search params with Suspense boundary */}
          <Suspense fallback={null}>
            <SearchParamsHandler
              setPlayerName={setPlayerName}
              setIsMatchmakingModalOpen={setIsMatchmakingModalOpen}
            />
          </Suspense>

          <main className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-[#040e16] text-dp-neon relative overflow-hidden">
            {/* Enhanced Background with Subtle Patterns */}
            <div className="fixed inset-0 -z-10">
              {/* Base gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#040e16] via-[#0a1420] to-[#040e16]"></div>

              {/* Subtle grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `
                  linear-gradient(rgba(0, 210, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 210, 255, 0.1) 1px, transparent 1px)
                `,
                  backgroundSize: "50px 50px",
                }}
              ></div>

              {/* Floating orbs for depth */}
              <div className="absolute top-20 left-10 w-32 h-32 bg-dp-neon/5 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-20 right-10 w-48 h-48 bg-dp-heart/5 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "2s" }}
              ></div>
              <div
                className="absolute top-1/2 left-1/3 w-24 h-24 bg-dp-neon/3 rounded-full blur-2xl animate-pulse"
                style={{ animationDelay: "4s" }}
              ></div>
            </div>

            {/* Mobile: Vertical Slide Structure */}
            <div className="md:hidden w-full">
              {/* First Slide - Hero Section */}
              <div className="min-h-screen flex flex-col items-center justify-center relative px-6 mobile-slide">
                <div className="text-center animate-fade-in-up max-w-sm">
                  {/* Logo with enhanced styling */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-dp-neon/15 rounded-full blur-xl scale-110 animate-pulse"></div>
                    <Image
                      src="/logo.webp"
                      alt="Dehla Pakad Logo"
                      width={140}
                      height={140}
                      style={{ width: "auto", height: "auto" }}
                      priority
                      className="relative w-32 h-32 mx-auto animate-float drop-shadow-xl"
                    />
                  </div>

                  {/* Enhanced Typography */}
                  <div className="space-y-4">
                    <p className="text-sm text-dp-neon/70 font-light leading-relaxed">
                      Experience the classic 4-player trick-taking card game
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 mt-6">
                      <button
                        onClick={() => setIsRulesModalOpen(true)}
                        className="group relative px-6 py-3 bg-gradient-to-r from-dp-neon to-blue-400 text-[#0D1117] font-bold rounded-xl shadow-lg shadow-dp-neon/25 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-dp-neon/40 active:scale-95"
                      >
                        <span className="relative z-10">How to Play</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>

                      <button
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="group relative px-6 py-2.5 border-2 border-dp-neon/30 text-dp-neon font-semibold rounded-xl backdrop-blur-sm bg-dp-neon/5 hover:bg-dp-neon/10 hover:border-dp-neon/50 transition-all duration-300 transform hover:scale-105 active:scale-95"
                      >
                        <span className="relative z-10">Give Feedback</span>
                      </button>

                      <InstallPrompt />
                    </div>
                  </div>
                </div>

                {/* Enhanced Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                  <div
                    className="group cursor-pointer flex flex-col items-center"
                    onClick={() => {
                      const secondSlide =
                        document.querySelector(".second-slide");
                      if (secondSlide) {
                        secondSlide.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-dp-neon/20 rounded-full blur-lg scale-150 group-hover:scale-[2] transition-transform duration-500"></div>
                      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-dp-cardFace to-dp-cardBorder border border-dp-neon/30 flex items-center justify-center backdrop-blur-sm group-hover:border-dp-neon group-hover:shadow-lg group-hover:shadow-dp-neon/30 transition-all duration-300 animate-bounce">
                        <svg
                          className="w-4 h-4 text-dp-neon group-hover:scale-110 transition-transform duration-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Slide - Game Selection */}
              <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-8 mobile-slide second-slide">
                <div className="w-full max-w-md">
                  {/* Glass Card Container */}
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-dp-neon/20 via-transparent to-dp-heart/20 rounded-3xl blur-lg"></div>

                    {/* Main card */}
                    <div className="relative bg-dp-cardFace/80 backdrop-blur-xl border border-dp-cardBorder/50 rounded-2xl p-6 shadow-2xl">
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-dp-neon to-white mb-2">
                          Choose Game Mode
                        </h2>
                        <div className="w-16 h-0.5 bg-gradient-to-r from-dp-neon to-dp-heart rounded-full mx-auto"></div>
                      </div>

                      {/* Enhanced Name Input */}
                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="w-full px-4 py-3 bg-[#040e16] border border-dp-cardBorder/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-dp-neon focus:border-transparent transition-all text-dp-neon placeholder-dp-neon/40 font-medium backdrop-blur-sm"
                          />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-dp-neon/5 to-transparent pointer-events-none"></div>
                        </div>
                      </div>

                      {/* Game Mode Cards */}
                      <div className="space-y-4">
                        {/* Online Lobby Card */}
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-dp-neon/30 to-blue-400/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                          <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-dp-neon/20 to-blue-400/20 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-dp-neon"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                </svg>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-dp-neon mb-1">
                                  Join Online Lobby
                                </h3>
                                <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                  Join a lobby with other players. Bots fill
                                  empty seats automatically.
                                </p>

                                <button
                                  onClick={playOnline}
                                  disabled={!playerName.trim()}
                                  className="w-full bg-gradient-to-r from-dp-neon to-blue-400 text-[#0D1117] font-bold py-2.5 px-3 rounded-lg hover:shadow-lg hover:shadow-dp-neon/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                                >
                                  Join Lobby
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Computer Game Card */}
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400/30 to-dp-neon/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                          <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400/20 to-dp-neon/20 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-dp-neon"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M20 3H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h3l-1 1v1h8v-1l-1-1h3c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 13H4V5h16v11z" />
                                  <circle cx="12" cy="10.5" r="1.5" />
                                  <circle cx="8" cy="8.5" r="1" />
                                  <circle cx="16" cy="8.5" r="1" />
                                  <circle cx="8" cy="12.5" r="1" />
                                  <circle cx="16" cy="12.5" r="1" />
                                </svg>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-dp-neon mb-1">
                                  Play Computer
                                </h3>
                                <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                  Play instantly offline against AI opponents.
                                  No internet required!
                                </p>

                                <button
                                  onClick={playWithComputer}
                                  disabled={!playerName.trim()}
                                  className="w-full bg-gradient-to-r from-purple-500 to-dp-neon text-white font-bold py-2.5 px-3 rounded-lg hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                                >
                                  Start Computer Game
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Private Room Card */}
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-dp-heart/30 to-orange-400/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                          <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-dp-heart/20 to-orange-400/20 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-dp-neon"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-dp-neon mb-1">
                                  Private Room
                                </h3>
                                <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                  Create or join a room with friends. Add bots
                                  to fill empty seats.
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={createRoom}
                                    disabled={
                                      isCreatingRoom || !playerName.trim()
                                    }
                                    className="bg-gradient-to-r from-dp-heart to-orange-400 text-white font-bold py-2.5 px-2 rounded-lg hover:shadow-lg hover:shadow-dp-heart/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-xs"
                                  >
                                    {isCreatingRoom
                                      ? "Creating..."
                                      : "Create Room"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setShowPrivateRoomOptions(true)
                                    }
                                    disabled={!playerName.trim()}
                                    className="border-2 border-dp-neon/40 text-dp-neon font-bold py-2.5 px-2 rounded-lg hover:bg-dp-neon/10 hover:border-dp-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-xs backdrop-blur-sm"
                                  >
                                    Join Room
                                  </button>
                                </div>

                                {/* Enhanced Join Room Form */}
                                {showPrivateRoomOptions && (
                                  <div className="mt-4 p-4 bg-[#040e16]/80 rounded-xl border border-dp-cardBorder/30 backdrop-blur-sm animate-fade-in">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="font-bold text-dp-neon text-sm">
                                        Join a Private Room
                                      </h4>
                                      <button
                                        onClick={() => {
                                          setShowPrivateRoomOptions(false);
                                          setJoinRoomId("");
                                          setJoinRoomError("");
                                          setIsJoiningRoom(false);
                                        }}
                                        className="text-dp-neon hover:text-dp-heart text-xl font-bold transition-colors hover:scale-110 transform"
                                        aria-label="Close join room form"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="space-y-3">
                                      <input
                                        type="text"
                                        placeholder="Enter Room ID"
                                        value={joinRoomId}
                                        onChange={(e) =>
                                          setJoinRoomId(e.target.value)
                                        }
                                        className="w-full px-3 py-2.5 bg-dp-cardFace/50 border border-dp-cardBorder/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-dp-neon focus:border-transparent transition-all text-dp-neon placeholder-dp-neon/40 backdrop-blur-sm text-sm"
                                        autoFocus
                                      />
                                      <button
                                        onClick={joinRoom}
                                        disabled={
                                          !joinRoomId.trim() ||
                                          !playerName.trim() ||
                                          isJoiningRoom
                                        }
                                        className="w-full bg-gradient-to-r from-dp-heart to-orange-400 text-white font-bold py-2.5 px-3 rounded-lg hover:shadow-lg hover:shadow-dp-heart/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                                      >
                                        {isJoiningRoom
                                          ? "Checking Room..."
                                          : "Join Room"}
                                      </button>
                                      {joinRoomError && (
                                        <div className="text-dp-heart text-xs font-semibold text-center bg-dp-heart/10 py-2 px-2 rounded-lg border border-dp-heart/20">
                                          {joinRoomError}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Enhanced Layout */}
            <div className="hidden md:flex w-full h-full min-h-screen items-center justify-center px-8 lg:px-16">
              {/* Left Side - Hero Section */}
              <div className="flex-1 max-w-xl pr-6 lg:pr-12">
                <div className="space-y-8">
                  {/* Logo with enhanced styling */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-dp-neon/15 rounded-full blur-2xl scale-150 animate-pulse"></div>
                    <Image
                      src="/logo.webp"
                      alt="Dehla Pakad Logo"
                      width={200}
                      height={200}
                      style={{ width: "auto", height: "auto" }}
                      priority
                      className="relative w-44 h-44 lg:w-56 lg:h-56 animate-float drop-shadow-2xl"
                    />
                  </div>

                  {/* Enhanced Typography */}
                  <div className="space-y-6">
                    <p className="text-lg lg:text-xl text-dp-neon/70 font-light leading-relaxed max-w-lg">
                      Experience the classic 4-player trick-taking card game
                      with stunning visuals and seamless gameplay.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => setIsRulesModalOpen(true)}
                        className="group relative px-8 py-4 bg-gradient-to-r from-dp-neon to-blue-400 text-[#0D1117] font-bold rounded-xl shadow-lg shadow-dp-neon/25 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-dp-neon/40 active:scale-95"
                      >
                        <span className="relative z-10">How to Play</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>

                      <button
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="group relative px-8 py-4 border-2 border-dp-neon/30 text-dp-neon font-bold rounded-xl backdrop-blur-sm bg-dp-neon/5 hover:bg-dp-neon/10 hover:border-dp-neon/50 transition-all duration-300 transform hover:scale-105 active:scale-95"
                      >
                        <span className="relative z-10">Give Feedback</span>
                      </button>

                      <InstallPrompt />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Game Selection */}
              <div className="flex-shrink-0 w-full max-w-md">
                <div className="relative">
                  {/* Enhanced glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-dp-neon/20 via-transparent to-dp-heart/20 rounded-2xl blur-xl"></div>

                  {/* Main card */}
                  <div className="relative bg-dp-cardFace/80 backdrop-blur-xl border border-dp-cardBorder/50 rounded-2xl p-6 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-dp-neon to-white mb-2">
                        Choose Game Mode
                      </h2>
                      <div className="w-16 h-0.5 bg-gradient-to-r from-dp-neon to-dp-heart rounded-full mx-auto"></div>
                    </div>

                    {/* Enhanced Name Input */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="w-full px-4 py-3 bg-[#040e16] border border-dp-cardBorder/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-dp-neon focus:border-transparent transition-all text-dp-neon placeholder-dp-neon/40 font-medium backdrop-blur-sm"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-dp-neon/5 to-transparent pointer-events-none"></div>
                      </div>
                    </div>

                    {/* Game Mode Cards */}
                    <div className="space-y-4">
                      {/* Online Lobby Card */}
                      <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-dp-neon/30 to-blue-400/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-dp-neon/20 to-blue-400/20 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-dp-neon"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                              </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-dp-neon mb-1">
                                Join Online Lobby
                              </h3>
                              <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                Join a lobby with other players. Bots fill empty
                                seats automatically.
                              </p>

                              <button
                                onClick={playOnline}
                                disabled={!playerName.trim()}
                                className="w-full bg-gradient-to-r from-dp-neon to-blue-400 text-[#0D1117] font-bold py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-dp-neon/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                              >
                                Join Lobby
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Computer Game Card */}
                      <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400/30 to-dp-neon/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-400/20 to-dp-neon/20 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-dp-neon"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20 3H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h3l-1 1v1h8v-1l-1-1h3c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 13H4V5h16v11z" />
                                <circle cx="12" cy="10.5" r="1.5" />
                                <circle cx="8" cy="8.5" r="1" />
                                <circle cx="16" cy="8.5" r="1" />
                                <circle cx="8" cy="12.5" r="1" />
                                <circle cx="16" cy="12.5" r="1" />
                              </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-dp-neon mb-1">
                                Play Computer
                              </h3>
                              <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                Play instantly offline against AI opponents. No
                                internet required!
                              </p>

                              <button
                                onClick={playWithComputer}
                                disabled={!playerName.trim()}
                                className="w-full bg-gradient-to-r from-purple-500 to-dp-neon text-white font-bold py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                              >
                                Start Computer Game
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Private Room Card */}
                      <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-dp-heart/30 to-orange-400/30 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                        <div className="relative bg-gradient-to-br from-dp-background/90 to-dp-cardFace/90 border border-dp-cardBorder/30 rounded-xl p-4 backdrop-blur-sm group-hover:border-dp-neon/50 transition-all duration-300">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-dp-heart/20 to-orange-400/20 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-dp-neon"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-dp-neon mb-1">
                                Private Room
                              </h3>
                              <p className="text-xs text-dp-neon/60 mb-3 leading-relaxed">
                                Create or join a room with friends. Add bots to
                                fill empty seats.
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={createRoom}
                                  disabled={
                                    isCreatingRoom || !playerName.trim()
                                  }
                                  className="bg-gradient-to-r from-dp-heart to-orange-400 text-white font-bold py-2 px-2 rounded-lg hover:shadow-lg hover:shadow-dp-heart/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-xs"
                                >
                                  {isCreatingRoom
                                    ? "Creating..."
                                    : "Create Room"}
                                </button>
                                <button
                                  onClick={() =>
                                    setShowPrivateRoomOptions(true)
                                  }
                                  disabled={!playerName.trim()}
                                  className="border-2 border-dp-neon/40 text-dp-neon font-bold py-2 px-2 rounded-lg hover:bg-dp-neon/10 hover:border-dp-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-xs backdrop-blur-sm"
                                >
                                  Join Room
                                </button>
                              </div>

                              {/* Enhanced Join Room Form */}
                              {showPrivateRoomOptions && (
                                <div className="mt-3 p-3 bg-[#040e16]/80 rounded-lg border border-dp-cardBorder/30 backdrop-blur-sm animate-fade-in">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-dp-neon text-sm">
                                      Join a Private Room
                                    </h4>
                                    <button
                                      onClick={() => {
                                        setShowPrivateRoomOptions(false);
                                        setJoinRoomId("");
                                        setJoinRoomError("");
                                        setIsJoiningRoom(false);
                                      }}
                                      className="text-dp-neon hover:text-dp-heart text-lg font-bold transition-colors hover:scale-110 transform"
                                      aria-label="Close join room form"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <input
                                      type="text"
                                      placeholder="Enter Room ID"
                                      value={joinRoomId}
                                      onChange={(e) =>
                                        setJoinRoomId(e.target.value)
                                      }
                                      className="w-full px-3 py-2 bg-dp-cardFace/50 border border-dp-cardBorder/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-dp-neon focus:border-transparent transition-all text-dp-neon placeholder-dp-neon/40 backdrop-blur-sm text-sm"
                                      autoFocus
                                    />
                                    <button
                                      onClick={joinRoom}
                                      disabled={
                                        !joinRoomId.trim() ||
                                        !playerName.trim() ||
                                        isJoiningRoom
                                      }
                                      className="w-full bg-gradient-to-r from-dp-heart to-orange-400 text-white font-bold py-2 px-3 rounded-lg hover:shadow-lg hover:shadow-dp-heart/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                                    >
                                      {isJoiningRoom
                                        ? "Checking Room..."
                                        : "Join Room"}
                                    </button>
                                    {joinRoomError && (
                                      <div className="text-dp-heart text-xs font-semibold text-center bg-dp-heart/10 py-1.5 px-2 rounded-lg border border-dp-heart/20">
                                        {joinRoomError}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules Button */}
          </main>

          {/* Rules Modal */}
          <RulesModal
            isOpen={isRulesModalOpen}
            onClose={() => setIsRulesModalOpen(false)}
          />

          {/* Matchmaking Modal */}
          <MatchmakingModal
            isOpen={isMatchmakingModalOpen}
            onClose={() => setIsMatchmakingModalOpen(false)}
            playerName={playerName}
          />

          {/* Feedback Modal */}
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
          />

          {/* Footer */}
          <footer className="w-full text-center text-xs text-dp-neon/50 mt-8 mb-2">
            © {new Date().getFullYear()} Dehla Pakad. Made with ♥ for card game
            lovers.
          </footer>
        </>
      )}
    </>
  );
}
