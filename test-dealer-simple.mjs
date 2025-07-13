// Simple test for dealer rotation logic
import { io } from "socket.io-client";

console.log("🧪 Testing Dealer Rotation Logic...\n");

const socket1 = io("http://localhost:3000");
const socket2 = io("http://localhost:3000");
const socket3 = io("http://localhost:3000");
const socket4 = io("http://localhost:3000");

let roomId = null;
let dealerBefore = null;
let dealerAfter = null;

socket1.on("connect", () => {
  console.log("✅ Player 1 connected");

  socket1.emit("createRoom", "Player1", (createdRoomId) => {
    if (createdRoomId) {
      roomId = createdRoomId;
      console.log(`✅ Room created: ${roomId}`);

      // Add 3 more players
      socket2.on("connect", () => {
        console.log("✅ Player 2 connected");
        socket2.emit("joinRoom", roomId, "Player2", 2, () => {
          socket3.on("connect", () => {
            console.log("✅ Player 3 connected");
            socket3.emit("joinRoom", roomId, "Player3", 3, () => {
              socket4.on("connect", () => {
                console.log("✅ Player 4 connected");
                socket4.emit("joinRoom", roomId, "Player4", 4, () => {
                  console.log("👥 All 4 players joined!");

                  // Start the game to set initial dealer
                  setTimeout(() => {
                    console.log("🎮 Starting game...");
                    socket1.emit("playerReady", roomId, "Player1");
                    socket2.emit("playerReady", roomId, "Player2");
                    socket3.emit("playerReady", roomId, "Player3");
                    socket4.emit("playerReady", roomId, "Player4");
                  }, 1000);
                });
              });
            });
          });
        });
      });

      // Listen for room updates
      socket1.on("roomUpdated", (room) => {
        if (room.dealerSeat && !dealerBefore) {
          dealerBefore = room.dealerSeat;
          console.log(`🎯 Initial dealer set to seat: ${dealerBefore}`);

          // Wait a bit then simulate replay to test rotation
          setTimeout(() => {
            console.log("🔄 Testing dealer rotation with replay votes...");
            socket1.emit("playerReplay", roomId);
            socket2.emit("playerReplay", roomId);
            socket3.emit("playerReplay", roomId);
            socket4.emit("playerReplay", roomId);
          }, 2000);
        } else if (
          room.dealerSeat &&
          dealerBefore &&
          room.dealerSeat !== dealerBefore &&
          !dealerAfter
        ) {
          dealerAfter = room.dealerSeat;
          console.log(`🎯 Dealer rotated to seat: ${dealerAfter}`);

          // Verify rotation is correct (clockwise)
          const expectedNext = dealerBefore === 4 ? 1 : dealerBefore + 1;
          if (dealerAfter === expectedNext) {
            console.log("✅ Dealer rotation works correctly!");
          } else {
            console.log(
              `❌ Dealer rotation failed. Expected: ${expectedNext}, Got: ${dealerAfter}`
            );
          }

          // Clean up
          setTimeout(() => {
            socket1.disconnect();
            socket2.disconnect();
            socket3.disconnect();
            socket4.disconnect();
            process.exit(0);
          }, 1000);
        }
      });
    }
  });
});

// Error handling
[socket1, socket2, socket3, socket4].forEach((socket, i) => {
  socket.on("connect_error", (error) => {
    console.error(`❌ Player ${i + 1} connection failed:`, error);
  });
});

// Safety timeout
setTimeout(() => {
  console.log("\n⏰ Test timed out");
  [socket1, socket2, socket3, socket4].forEach((s) => s.disconnect());
  process.exit(0);
}, 15000);
