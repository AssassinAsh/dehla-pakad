import { NextRequest, NextResponse } from "next/server";
import { generateRoomId } from "@/utils/gameUtils";

export async function POST(request: NextRequest) {
  try {
    const { playerName } = await request.json();

    if (
      !playerName ||
      typeof playerName !== "string" ||
      playerName.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    // Generate a unique room ID
    const roomId = generateRoomId();

    // TODO: Store room in database or memory store
    // For now, just return the room ID

    return NextResponse.json({ roomId });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // TODO: Get active rooms from database or memory store
    // For now, return mock data
    const rooms = [
      {
        id: "ROOM01",
        playerCount: 2,
        gameStarted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "ROOM02",
        playerCount: 4,
        gameStarted: true,
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Error getting rooms:", error);
    return NextResponse.json({ error: "Failed to get rooms" }, { status: 500 });
  }
}
