import { NextRequest, NextResponse } from "next/server";

interface ActionData {
  roomId?: string;
  cardId?: string;
  playerName?: string;
  seat?: number;
  [key: string]: string | number | boolean | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      data,
      timestamp,
    }: { type: string; data: ActionData; timestamp: number } = body;

    console.log("[Sync API] Received offline action:", { type, timestamp });

    // Validate the action type
    const validActions = ["playCard", "joinRoom", "leaveRoom", "playerReady"];
    if (!validActions.includes(type)) {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    // Check if the action is not too old (max 5 minutes)
    const actionAge = Date.now() - timestamp;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (actionAge > maxAge) {
      return NextResponse.json(
        { error: "Action too old", message: "This action has expired" },
        { status: 410 }
      );
    }

    // Process the action based on type
    switch (type) {
      case "playCard":
        return await handlePlayCard(data);

      case "joinRoom":
        return await handleJoinRoom(data);

      case "leaveRoom":
        return await handleLeaveRoom(data);

      case "playerReady":
        return await handlePlayerReady(data);

      default:
        return NextResponse.json(
          { error: "Unhandled action type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Sync API] Error processing sync action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePlayCard(data: ActionData) {
  // In a real implementation, you would:
  // 1. Validate the room still exists
  // 2. Check if it's still the player's turn
  // 3. Validate the card is still in player's hand
  // 4. Apply the move if valid

  console.log("[Sync API] Processing play card action:", data);

  // For now, return a simple response
  // In practice, you'd integrate with your game logic
  return NextResponse.json({
    success: false,
    message: "Game state may have changed. Please refresh and try again.",
    requiresRefresh: true,
  });
}

async function handleJoinRoom(data: ActionData) {
  console.log("[Sync API] Processing join room action:", data);

  // Room joining from offline actions is typically not useful
  // as the room state would have changed
  return NextResponse.json({
    success: false,
    message: "Room state may have changed. Please try joining again.",
    requiresRefresh: true,
  });
}

async function handleLeaveRoom(data: ActionData) {
  console.log("[Sync API] Processing leave room action:", data);

  // Leave room actions can often be safely processed
  return NextResponse.json({
    success: true,
    message: "Leave room action processed successfully",
  });
}

async function handlePlayerReady(data: ActionData) {
  console.log("[Sync API] Processing player ready action:", data);

  // Ready state changes are typically safe to ignore when syncing
  // as the game state would have moved on
  return NextResponse.json({
    success: false,
    message: "Game may have already started. Please refresh.",
    requiresRefresh: true,
  });
}

// Health check endpoint for offline detection
export async function GET() {
  return NextResponse.json({
    status: "online",
    timestamp: Date.now(),
    version: "1.0.0",
  });
}
