import { io, Socket } from "socket.io-client";

class LazySocketManager {
  private socket: Socket | null = null;
  private connectionPromise: Promise<Socket> | null = null;

  // Get or create socket connection
  async getSocket(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    // If there's already a connection attempt in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = io({
        transports: ["websocket", "polling"], // Ensure fallback transports
        timeout: 10000, // 10 second timeout
      });

      // Add timeout for connection
      const connectionTimeout = setTimeout(() => {
        console.error("Socket connection timeout after 10 seconds");
        socket.disconnect();
        this.connectionPromise = null;
        reject(new Error("Connection timeout"));
      }, 10000);

      socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        console.log("Socket connected for gameplay/lobby");
        this.socket = socket;
        this.connectionPromise = null;
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.error("Socket connection error:", error);
        this.connectionPromise = null;
        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        this.socket = null;
      });
    });

    return this.connectionPromise;
  }

  // Get current socket without creating new connection
  getCurrentSocket(): Socket | null {
    return this.socket?.connected ? this.socket : null;
  }

  // Disconnect socket when not needed
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const lazySocket = new LazySocketManager();
