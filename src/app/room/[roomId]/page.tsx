"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams } from "next/navigation";
import { Room, Player, Card, Trick } from "@/types/game";
import GameTable from "@/components/GameTable";
import RulesModal from "@/components/RulesModal"; // Import the modal
import CardComponent from "@/components/Card"; // Renamed to avoid conflict

export default function RoomPage() {
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
  return (
    <>
      <div className="min-h-screen p-4 bg-gradient-to-br from-green-800 via-gray-900 to-black text-white">
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
            </div>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="bg-transparent border border-yellow-500 text-yellow-500 font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 hover:text-gray-900 transition-colors"
            >
              Show Rules
            </button>
          </header>

          {/* Table & Trump */}
          <GameTable
            room={room}
            onSeatClick={joinSeat}
            onPlayCard={playCard}
            currentPlayerId={currentPlayer?.id || ""}
          />
          {room.gameState.trump && (
            <div className="text-center">
              <span className="font-semibold">Trump: </span>
              <span
                className={
                  room.gameState.trump === "hearts" ||
                  room.gameState.trump === "diamonds"
                    ? "text-red-600"
                    : ""
                }
              >
                {
                  {
                    hearts: "♥",
                    diamonds: "♦",
                    clubs: "♣",
                    spades: "♠",
                  }[room.gameState.trump]
                }
              </span>
            </div>
          )}

          {/* Scores */}
          <section className="grid grid-cols-4 gap-4">
            {room.players
              .slice()
              .sort((a, b) => a.seat - b.seat)
              .map((p) => (
                <div
                  key={p.seat}
                  className="bg-white p-4 rounded shadow text-center"
                >
                  <div className="font-semibold">Seat {p.seat}</div>
                  <div>{p.name}</div>
                  <div className="mt-2 text-xl text-blue-600">
                    {room.gameState.scores[p.seat] || 0}✦
                  </div>
                </div>
              ))}
          </section>

          {/* Player Hand & Controls */}
          {currentPlayer && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Your Hand</h2>
                <div className="flex justify-center items-center overflow-x-auto py-2 space-x-[-2rem]">
                  {currentPlayer.hand.map((card) => (
                    <div key={card.id} className="flex-shrink-0">
                      <CardComponent
                        card={card}
                        size="medium"
                        onClick={() => playCard(card)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>You are: {currentPlayer.name}</div>
                {room.gameStarted && <div>Turn: {room.currentPlayer}</div>}
                {!room.gameStarted && room.players.length === 4 && (
                  <button
                    onClick={startGame}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                  >
                    Start
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Game Over */}
          {gameFinishedData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded shadow-lg text-center space-y-4">
                <h2 className="text-2xl font-bold">Game Over</h2>
                {gameFinishedData.kot !== null && (
                  <p className="text-red-600">
                    Kot! Seat {gameFinishedData.kot}
                  </p>
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
      </div>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </>
  );
}
