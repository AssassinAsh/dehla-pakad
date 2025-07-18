import { io, Socket } from "socket.io-client";

class LazySocketManager {
  private socket: Socket | null = null;
  private connectionPromise: Promise<Socket> | null = null;
  private preconnectingSocket: Socket | null = null;

  // Preconnect socket for faster subsequent connections
  preconnect(): void {
    if (
      this.socket?.connected ||
      this.connectionPromise ||
      this.preconnectingSocket
    ) {
      return; // Already connected or connecting
    }

    console.log("Preconnecting socket for faster game loading...");
    this.preconnectingSocket = io({
      transports: ["websocket", "polling"],
      timeout: 5000, // Shorter timeout for preconnect
      autoConnect: true,
    });

    this.preconnectingSocket.on("connect", () => {
      console.log("Socket preconnected successfully");
      // Keep the connection alive for immediate use
    });

    this.preconnectingSocket.on("connect_error", (error) => {
      console.warn("Socket preconnect failed:", error);
      this.preconnectingSocket = null;
    });
  }

  // Get or create socket connection
  async getSocket(): Promise<Socket> {
    // If we have a preconnected socket, use it
    if (this.preconnectingSocket?.connected) {
      this.socket = this.preconnectingSocket;
      this.preconnectingSocket = null;
      return this.socket;
    }

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
        timeout: 8000, // 8 second timeout (reduced from 10)
        forceNew: false, // Reuse existing connection if available
      });

      // Add timeout for connection
      const connectionTimeout = setTimeout(() => {
        console.error("Socket connection timeout after 8 seconds");
        socket.disconnect();
        this.connectionPromise = null;
        reject(new Error("Connection timeout"));
      }, 8000);

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
    if (this.preconnectingSocket) {
      this.preconnectingSocket.disconnect();
      this.preconnectingSocket = null;
    }
    this.connectionPromise = null;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return (
      this.socket?.connected || this.preconnectingSocket?.connected || false
    );
  }
}

// Export singleton instance
export const lazySocket = new LazySocketManager();
