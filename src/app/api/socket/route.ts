import { NextResponse } from "next/server";

export async function GET() {
  // The socket server is now started by the custom server.js
  // This API route is only kept for compatibility
  return new NextResponse("Socket.IO server is running on the custom server", {
    status: 200,
  });
}
