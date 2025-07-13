// Test script for dealer rotation functionality
import { io } from "socket.io-client";

console.log("🧪 Testing Dealer Rotation...\n");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connected to server");

  // Create a room
  socket.emit("createRoom", "TestPlayer", (roomId) => {
    if (roomId) {
      console.log(`✅ Room created: ${roomId}`);

      // Listen for room updates to track dealer changes
      socket.on("roomUpdated", (room) => {
        console.log(`🎯 Current dealer seat: ${room.dealerSeat || "None"}`);
        console.log(`👥 Players in room: ${room.players.length}`);
        console.log(`🎮 Game started: ${room.gameStarted}`);
        console.log(`📊 Game status: ${room.gameState?.status}`);
        console.log("---");
      });

      // Add some bots to fill the room
      setTimeout(() => {
        console.log("🤖 Adding bots to test dealer rotation...");
        socket.emit("addBotToSeat", roomId, 2, "medium");
        setTimeout(() => socket.emit("addBotToSeat", roomId, 3, "medium"), 500);
        setTimeout(
          () => socket.emit("addBotToSeat", roomId, 4, "medium"),
          1000
        );

        // After bots are added, test dealer rotation by starting and replaying
        setTimeout(() => {
          console.log("🎮 Starting game to set initial dealer...");
          socket.emit("playerReady", roomId, "TestPlayer");
        }, 2000);

        // Simulate game completion and replay to test dealer rotation
        setTimeout(() => {
          console.log("🔄 Testing dealer rotation with replay vote...");
          socket.emit("playerReplay", roomId);
        }, 4000);
      }, 1000);
    } else {
      console.log("❌ Failed to create room");
      process.exit(1);
    }
  });
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection failed:", error);
  process.exit(1);
});

// Clean up after 10 seconds
setTimeout(() => {
  console.log("\n🏁 Test completed");
  socket.disconnect();
  process.exit(0);
}, 10000);
