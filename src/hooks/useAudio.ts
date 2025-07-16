/**
 * React hook for using the audio manager
 * Provides convenient interface for game sounds with caching
 */

import { useEffect, useCallback, useRef } from "react";
import {
  audioManager,
  type GameSound,
  type AudioSettings,
} from "@/utils/audioManager";

interface UseAudioReturn {
  playSound: (sound: GameSound, volume?: number) => Promise<void>;
  playCardPlay: () => Promise<void>;
  playCardDeal: () => Promise<void>;
  stopCardDeal: () => void;
  playStackWon: () => Promise<void>;
  playVictory: () => Promise<void>;
  playDefeat: () => Promise<void>;
  settings: AudioSettings;
  updateSettings: (settings: Partial<AudioSettings>) => void;
  toggleSound: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  isInitialized: boolean;
  initializeAudio: () => Promise<void>;
}

export function useAudio(): UseAudioReturn {
  const initializeRef = useRef(false);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(async () => {
    if (!initializeRef.current) {
      try {
        await audioManager.initialize();
        initializeRef.current = true;
        console.log("Audio initialized via user interaction");
      } catch (error) {
        console.warn("Failed to initialize audio:", error);
      }
    }
  }, []);

  // Auto-initialize on mount (will require user gesture)
  useEffect(() => {
    // Try to initialize immediately (may fail, that's ok)
    initializeAudio().catch(() => {
      // Will initialize on first user interaction
    });
  }, [initializeAudio]);

  // Sound playing functions with auto-initialization
  const playSound = useCallback(
    async (sound: GameSound, volume?: number) => {
      await initializeAudio();
      return audioManager.playSound(sound, volume);
    },
    [initializeAudio]
  );

  const playCardPlay = useCallback(async () => {
    await initializeAudio();
    return audioManager.playCardPlay();
  }, [initializeAudio]);

  const playCardDeal = useCallback(async () => {
    await initializeAudio();
    return audioManager.playCardDeal();
  }, [initializeAudio]);

  const playStackWon = useCallback(async () => {
    await initializeAudio();
    return audioManager.playStackWon();
  }, [initializeAudio]);

  const playVictory = useCallback(async () => {
    await initializeAudio();
    return audioManager.playVictory();
  }, [initializeAudio]);

  const playDefeat = useCallback(async () => {
    await initializeAudio();
    return audioManager.playDefeat();
  }, [initializeAudio]);

  // Settings management
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    audioManager.updateSettings(newSettings);
  }, []);

  const toggleSound = useCallback((enabled: boolean) => {
    audioManager.toggleSound(enabled);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  const stopCardDeal = useCallback(() => {
    audioManager.stopCardDeal();
  }, []);

  return {
    playSound,
    playCardPlay,
    playCardDeal,
    stopCardDeal,
    playStackWon,
    playVictory,
    playDefeat,
    settings: audioManager.getSettings(),
    updateSettings,
    toggleSound,
    setVolume,
    isInitialized: initializeRef.current,
    initializeAudio,
  };
}

/**
 * Hook for preloading game sounds at strategic moments
 */
export function useAudioPreloader() {
  const preloadGameSounds = useCallback(async () => {
    try {
      await audioManager.preloadGameSounds();
      console.log("Game sounds preloaded");
    } catch (error) {
      console.warn("Failed to preload game sounds:", error);
    }
  }, []);

  const preloadEssentialSounds = useCallback(async () => {
    try {
      await audioManager.preloadEssentialSounds();
      console.log("Essential sounds preloaded");
    } catch (error) {
      console.warn("Failed to preload essential sounds:", error);
    }
  }, []);

  return {
    preloadGameSounds,
    preloadEssentialSounds,
  };
}
