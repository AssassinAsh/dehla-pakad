import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// This endpoint is called internally by socketServer.js when a game ends.
// Protected by a shared secret so it is never callable from the browser.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    userId,
    displayName,
    roomId,
    team,
    result,
    isKot,
    tensCaptured,
    tricksWon,
    gameMode,
  } = body;

  // Guests (no userId) are skipped — no leaderboard entry
  if (!userId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    await db.collection("game_results").insertOne({
      userId,
      displayName,
      roomId,
      team,
      result, // "win" | "lose" | "draw"
      isKot: !!isKot,
      tensCaptured: tensCaptured ?? 0,
      tricksWon: tricksWon ?? 0,
      gameMode, // "private" | "lobby" | "quick-bots"
      playedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save game result:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
