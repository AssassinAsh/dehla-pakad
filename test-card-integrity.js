// Quick test script to verify card integrity system
import { BotManager } from "./src/utils/botManager.js";

// Create a mock room with potential issues
const mockRoom = {
  id: "TEST123",
  players: [
    {
      name: "Player1",
      seat: 1,
      hand: [
        { rank: "A", suit: "hearts", id: "A_of_hearts" },
        { rank: "K", suit: "hearts", id: "K_of_hearts" },
        { rank: "A", suit: "hearts", id: "A_of_hearts" }, // DUPLICATE!
        { rank: "Q", suit: "hearts", id: "Q_of_hearts" },
        { rank: "J", suit: "hearts", id: "J_of_hearts" },
      ],
    },
    {
      name: "Player2",
      seat: 2,
      hand: [
        { rank: "10", suit: "hearts", id: "10_of_hearts" },
        { rank: "9", suit: "hearts", id: "9_of_hearts" },
        { rank: "8", suit: "hearts", id: "8_of_hearts" },
        { rank: "7", suit: "hearts", id: "7_of_hearts" },
        { rank: "6", suit: "hearts", id: "6_of_hearts" },
        { rank: "5", suit: "hearts", id: "5_of_hearts" }, // 6 cards instead of 5!
      ],
    },
    {
      name: "Player3",
      seat: 3,
      hand: [
        { rank: "4", suit: "hearts", id: "4_of_hearts" },
        { rank: "3", suit: "hearts", id: "3_of_hearts" },
        { rank: "2", suit: "hearts", id: "2_of_hearts" },
        { rank: "A", suit: "diamonds", id: "A_of_diamonds" },
        { rank: "K", suit: "diamonds", id: "K_of_diamonds" },
      ],
    },
    {
      name: "Player4",
      seat: 4,
      hand: [
        { rank: "Q", suit: "diamonds", id: "Q_of_diamonds" },
        { rank: "J", suit: "diamonds", id: "J_of_diamonds" },
        { rank: "10", suit: "diamonds", id: "10_of_diamonds" },
        { rank: "9", suit: "diamonds", id: "9_of_diamonds" },
        // Missing one card!
      ],
    },
  ],
  currentTrick: [],
  deck: [],
};

console.log("🧪 Testing Card Integrity System");
console.log("================================");

// Test 1: Duplicate card detection
console.log("\n📋 Test 1: Duplicate Card Detection");
const result1 = BotManager.checkCardIntegrity(
  "TEST123",
  mockRoom,
  "test-duplicates"
);
console.log("Result:", result1.success ? "✅ PASSED" : "❌ FAILED");

// Test 2: Hand size validation
console.log("\n📏 Test 2: Hand Size Validation (after initial dealing)");
const result2 = BotManager.checkCardIntegrity(
  "TEST123",
  mockRoom,
  "after-initial-dealing"
);
console.log("Result:", result2.success ? "✅ PASSED" : "❌ FAILED");

// Test 3: Deck validation
console.log("\n🃏 Test 3: Deck Validation");
const invalidDeck = [
  { rank: "A", suit: "hearts", id: "A_of_hearts" },
  { rank: "A", suit: "hearts", id: "A_of_hearts" }, // Duplicate
  { rank: "K", suit: "hearts", id: "K_of_hearts" },
];

const fixedDeck = BotManager.validateAndFixDeck(invalidDeck);
console.log("Original deck length:", invalidDeck.length);
console.log("Fixed deck length:", fixedDeck.length);
console.log(
  "Deck fix result:",
  fixedDeck.length === 52 ? "✅ PASSED" : "❌ FAILED"
);

console.log("\n🎯 Card Integrity System Test Complete!");
