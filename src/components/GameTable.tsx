import { Room, Player, Card } from "@/types/game";
import { getCardDisplayName } from "@/utils/gameUtils";

interface GameTableProps {
  room: Room;
  onSeatClick: (seat: number) => void;
  onPlayCard: (card: Card) => void;
  currentPlayerId: string;
}

const Seat = ({
  player,
  seatNumber,
  onSeatClick,
  isCurrentPlayer,
  isActivePlayer,
  position,
}: {
  player: Player | undefined;
  seatNumber: number;
  onSeatClick: (seat: number) => void;
  isCurrentPlayer: boolean;
  isActivePlayer: boolean;
  position: string;
}) => {
  const hasPlayer = !!player;

  return (
    <div className={`absolute ${position}`}>
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-110 ${
          isCurrentPlayer
            ? "bg-blue-500 border-4 border-blue-300"
            : hasPlayer
            ? "bg-gray-600 border-4 border-gray-400"
            : "bg-gray-200 hover:bg-gray-300"
        } ${isActivePlayer ? "ring-4 ring-yellow-400 shadow-lg" : ""}`}
        onClick={() => !hasPlayer && onSeatClick(seatNumber)}
      >
        {hasPlayer ? (
          <div className="text-white font-bold text-center">
            <p className="truncate">{player.name}</p>
            <p>({player.hand.length} cards)</p>
          </div>
        ) : (
          <span className="text-sm text-gray-600">Seat {seatNumber}</span>
        )}
      </div>
    </div>
  );
};

export default function GameTable({
  room,
  onSeatClick,
  onPlayCard,
  currentPlayerId,
}: GameTableProps) {
  const getPlayerAtSeat = (seat: number) =>
    room.players.find((p) => p.seat === seat);

  const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
  const currentPlayerSeat = currentPlayer?.seat;

  const seatPositions: { [key: string]: string } = {
    bottom: "bottom-0 left-1/2 -translate-x-1/2",
    left: "top-1/2 left-0 -translate-y-1/2",
    top: "top-0 left-1/2 -translate-x-1/2",
    right: "top-1/2 right-0 -translate-y-1/2",
  };

  const renderSeats = () => {
    if (!currentPlayerSeat) {
      // Render a simple grid if the current player isn't seated yet
      return [1, 2, 3, 4].map((seatNumber) => (
        <div key={seatNumber} className="flex items-center justify-center">
          <Seat
            player={getPlayerAtSeat(seatNumber)}
            seatNumber={seatNumber}
            onSeatClick={onSeatClick}
            isCurrentPlayer={false}
            isActivePlayer={room.currentPlayer === seatNumber}
            position="" // Position will be handled by grid
          />
        </div>
      ));
    }

    const seatOrder = ["bottom", "left", "top", "right"];
    const seatNumbers = [
      currentPlayerSeat,
      ((currentPlayerSeat + 0) % 4) + 1, // Left player
      ((currentPlayerSeat + 1) % 4) + 1, // Top player
      ((currentPlayerSeat + 2) % 4) + 1, // Right player
    ];

    return seatOrder.map((position, index) => {
      const seatNumber = seatNumbers[index];
      const player = getPlayerAtSeat(seatNumber);
      return (
        <Seat
          key={seatNumber}
          player={player}
          seatNumber={seatNumber}
          onSeatClick={onSeatClick}
          isCurrentPlayer={player?.id === currentPlayerId}
          isActivePlayer={room.currentPlayer === seatNumber}
          position={seatPositions[position]}
        />
      );
    });
  };

  const mainContent =
    currentPlayerSeat !== undefined ? (
      <div className="w-full h-full relative">{renderSeats()}</div>
    ) : (
      <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full h-full">
        {renderSeats()}
      </div>
    );

  return (
    <div className="w-full max-w-2xl mx-auto bg-green-700 rounded-full aspect-square relative flex items-center justify-center p-8 shadow-2xl border-8 border-yellow-800">
      {mainContent}
      <div className="absolute w-56 h-40 bg-green-800/70 rounded-lg flex items-center justify-center p-2 shadow-inner">
        <div className="grid grid-cols-2 gap-2">
          {room.currentTrick.map(({ card, seat }) => (
            <div
              key={`${card.id}-${seat}`}
              className="relative flex flex-col items-center"
            >
              <div className="w-12 h-16 bg-white rounded text-sm flex items-center justify-center font-bold text-black shadow-md">
                {getCardDisplayName(card)}
              </div>
              <span className="text-white text-xs mt-1">Seat {seat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
