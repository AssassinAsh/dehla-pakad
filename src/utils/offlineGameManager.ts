import { openDB, DBSchema, IDBPDatabase } from "idb";

// Type definitions for game data
interface CardData {
  id: string;
  suit: string;
  rank: string;
}

interface GameStateData {
  players: Array<{
    id: string;
    name: string;
    seat: number;
    hand: CardData[];
    isReady: boolean;
  }>;
  gameStarted: boolean;
  currentPlayer: number;
  tricks: Array<{ cards: CardData[]; winner: number }>;
  scores: { team1: number; team2: number };
}

interface ActionData {
  roomId?: string;
  cardId?: string;
  playerName?: string;
  seat?: number;
  [key: string]: string | number | boolean | undefined;
}

// Database schema for offline storage
interface GameDB extends DBSchema {
  gameState: {
    key: string;
    value: {
      id: string;
      roomId: string;
      playerName: string;
      gameData: GameStateData;
      timestamp: number;
      syncStatus: "pending" | "synced" | "failed";
    };
  };
  queuedActions: {
    key: string;
    value: {
      id: string;
      type: "playCard" | "joinRoom" | "leaveRoom" | "playerReady";
      data: ActionData;
      timestamp: number;
      retryCount: number;
    };
    indexes: { "by-timestamp": number };
  };
  playerPreferences: {
    key: string;
    value: {
      id: string;
      theme: "light" | "dark";
      soundEnabled: boolean;
      notificationsEnabled: boolean;
      autoReady: boolean;
      cardAnimations: boolean;
    };
  };
  gameHistory: {
    key: string;
    value: {
      id: string;
      roomId: string;
      playerName: string;
      gameResult: "win" | "loss" | "draw";
      score: number;
      duration: number;
      timestamp: number;
    };
    indexes: { "by-timestamp": number };
  };
}

class OfflineGameManager {
  private db: IDBPDatabase<GameDB> | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initDB();
    this.setupOnlineListeners();
  }

  private async initDB(): Promise<void> {
    try {
      this.db = await openDB<GameDB>("dehla-pakad-db", 1, {
        upgrade(db) {
          // Game state store
          if (!db.objectStoreNames.contains("gameState")) {
            db.createObjectStore("gameState", { keyPath: "id" });
          }

          // Queued actions store
          if (!db.objectStoreNames.contains("queuedActions")) {
            const store = db.createObjectStore("queuedActions", {
              keyPath: "id",
            });
            store.createIndex("by-timestamp", "timestamp");
          }

          // Player preferences store
          if (!db.objectStoreNames.contains("playerPreferences")) {
            db.createObjectStore("playerPreferences", { keyPath: "id" });
          }

          // Game history store
          if (!db.objectStoreNames.contains("gameHistory")) {
            const store = db.createObjectStore("gameHistory", {
              keyPath: "id",
            });
            store.createIndex("by-timestamp", "timestamp");
          }
        },
      });
      console.log("IndexedDB initialized successfully");
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
    }
  }

  private setupOnlineListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("App is back online");
      this.syncQueuedActions();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("App is offline");
    });
  }

  // Game State Management
  async saveGameState(
    roomId: string,
    playerName: string,
    gameData: GameStateData
  ): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put("gameState", {
        id: `${roomId}-${playerName}`,
        roomId,
        playerName,
        gameData,
        timestamp: Date.now(),
        syncStatus: this.isOnline ? "synced" : "pending",
      });
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }

  async getGameState(
    roomId: string,
    playerName: string
  ): Promise<GameStateData | null> {
    if (!this.db) return null;

    try {
      const state = await this.db.get("gameState", `${roomId}-${playerName}`);
      return state?.gameData || null;
    } catch (error) {
      console.error("Failed to get game state:", error);
      return null;
    }
  }

  // Queued Actions Management
  async queueAction(
    type: "playCard" | "joinRoom" | "leaveRoom" | "playerReady",
    data: ActionData
  ): Promise<void> {
    if (!this.db) return;

    try {
      const actionId = `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await this.db.put("queuedActions", {
        id: actionId,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      });
      console.log("Action queued for sync:", type);
    } catch (error) {
      console.error("Failed to queue action:", error);
    }
  }

  async syncQueuedActions(): Promise<void> {
    if (!this.db || !this.isOnline) return;

    try {
      const actions = await this.db.getAll("queuedActions");

      for (const action of actions) {
        try {
          // Attempt to sync action with server
          const response = await fetch("/api/sync-action", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: action.type,
              data: action.data,
              timestamp: action.timestamp,
            }),
          });

          if (response.ok) {
            // Remove successfully synced action
            await this.db.delete("queuedActions", action.id);
            console.log("Action synced and removed:", action.type);
          } else {
            // Increment retry count
            action.retryCount++;
            if (action.retryCount >= 3) {
              // Remove after 3 failed attempts
              await this.db.delete("queuedActions", action.id);
              console.log("Action removed after max retries:", action.type);
            } else {
              await this.db.put("queuedActions", action);
            }
          }
        } catch (error) {
          console.error("Failed to sync action:", action.type, error);
          action.retryCount++;
          await this.db.put("queuedActions", action);
        }
      }
    } catch (error) {
      console.error("Failed to sync queued actions:", error);
    }
  }

  // Player Preferences Management
  async savePreferences(
    playerId: string,
    preferences: Partial<GameDB["playerPreferences"]["value"]>
  ): Promise<void> {
    if (!this.db) return;

    try {
      const existing = await this.db.get("playerPreferences", playerId);
      const updated = {
        id: playerId,
        theme: "light" as const,
        soundEnabled: true,
        notificationsEnabled: true,
        autoReady: false,
        cardAnimations: true,
        ...existing,
        ...preferences,
      };

      await this.db.put("playerPreferences", updated);
      console.log("Preferences saved");
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }

  async getPreferences(
    playerId: string
  ): Promise<GameDB["playerPreferences"]["value"] | null> {
    if (!this.db) return null;

    try {
      const prefs = await this.db.get("playerPreferences", playerId);
      return (
        prefs || {
          id: playerId,
          theme: "light",
          soundEnabled: true,
          notificationsEnabled: true,
          autoReady: false,
          cardAnimations: true,
        }
      );
    } catch (error) {
      console.error("Failed to get preferences:", error);
      return null;
    }
  }

  // Game History Management
  async saveGameResult(
    roomId: string,
    playerName: string,
    result: "win" | "loss" | "draw",
    score: number,
    duration: number
  ): Promise<void> {
    if (!this.db) return;

    try {
      const historyId = `${roomId}-${playerName}-${Date.now()}`;
      await this.db.put("gameHistory", {
        id: historyId,
        roomId,
        playerName,
        gameResult: result,
        score,
        duration,
        timestamp: Date.now(),
      });
      console.log("Game result saved to history");
    } catch (error) {
      console.error("Failed to save game result:", error);
    }
  }

  async getGameHistory(
    playerName: string,
    limit: number = 10
  ): Promise<GameDB["gameHistory"]["value"][]> {
    if (!this.db) return [];

    try {
      const allHistory = await this.db.getAll("gameHistory");
      return allHistory
        .filter((h) => h.playerName === playerName)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get game history:", error);
      return [];
    }
  }

  // Cleanup old data
  async cleanupOldData(): Promise<void> {
    if (!this.db) return;

    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Clean old game states
      const gameStates = await this.db.getAll("gameState");
      for (const state of gameStates) {
        if (state.timestamp < oneWeekAgo) {
          await this.db.delete("gameState", state.id);
        }
      }

      // Clean old failed actions
      const actions = await this.db.getAll("queuedActions");
      for (const action of actions) {
        if (action.timestamp < oneWeekAgo || action.retryCount >= 3) {
          await this.db.delete("queuedActions", action.id);
        }
      }

      // Keep only last 50 game history entries per player
      const history = await this.db.getAll("gameHistory");
      const historyByPlayer = new Map<
        string,
        GameDB["gameHistory"]["value"][]
      >();

      history.forEach((h) => {
        if (!historyByPlayer.has(h.playerName)) {
          historyByPlayer.set(h.playerName, []);
        }
        historyByPlayer.get(h.playerName)!.push(h);
      });

      for (const [, playerHistory] of historyByPlayer) {
        const sorted = playerHistory.sort((a, b) => b.timestamp - a.timestamp);
        if (sorted.length > 50) {
          for (let i = 50; i < sorted.length; i++) {
            await this.db.delete("gameHistory", sorted[i].id);
          }
        }
      }

      console.log("Old data cleaned up");
    } catch (error) {
      console.error("Failed to cleanup old data:", error);
    }
  }

  // Check if offline
  isOffline(): boolean {
    return !this.isOnline;
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
        };
      }
    } catch (error) {
      console.error("Failed to get storage usage:", error);
    }

    return { used: 0, available: 0 };
  }
}

// Create singleton instance
const offlineGameManager = new OfflineGameManager();

export default offlineGameManager;
