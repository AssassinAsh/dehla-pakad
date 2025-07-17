// TypeScript declarations for botEngine.js
import { Card, Player } from "@/types/game";

export interface TrickCard {
  card: Card;
  playedBy: Player;
}

export interface GameContext {
  trump: string | null;
}

export declare class BotEngine {
  static DIFFICULTY_LEVELS: {
    EASY: string;
    MEDIUM: string;
    HARD: string;
  };

  static usedBotNames: Set<string>;

  static generateBotName(): string;

  static chooseCard(
    player: Pick<Player, "hand" | "seat" | "name">,
    gameContext: GameContext,
    currentTrick: TrickCard[],
    difficulty?: string
  ): Card | null;

  static resetBotNames(): void;
}
