/**
 * Optimized Audio Manager with client-side caching
 * Leverages Service Worker cache + Web Audio API for best performance
 */

interface AudioSettings {
  enabled: boolean;
  volume: number;
  enabledSounds: Set<string>;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();
  private activeSources = new Map<string, AudioBufferSourceNode[]>(); // Track active sources
  private settings: AudioSettings;
  private initialized = false;

  // Audio file mapping
  private readonly audioFiles = {
    cardPlay: "card-play.mp3",
    cardDeal: "card-deal.mp3",
    stackWon: "stack-won.mp3",
    victory: "victory.mp3",
    defeat: "defeat.mp3",
  } as const;

  // Priority levels for loading
  private readonly loadingPriority = {
    immediate: ["cardPlay"], // 15KB - most frequent
    onGameStart: ["cardDeal", "stackWon"], // 74KB + 24KB
    onDemand: ["victory", "defeat"], // 84KB + 96KB
  };

  constructor() {
    this.settings = {
      enabled: true,
      volume: 0.7,
      enabledSounds: new Set(Object.keys(this.audioFiles)),
    };

    this.loadSettings();
  }

  /**
   * Initialize audio system (user gesture required)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create AudioContext (requires user gesture)
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported");
      }
      this.audioContext = new AudioContextClass();

      // Resume context if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.initialized = true;
      console.log("AudioManager initialized");

      // Preload essential sounds immediately
      await this.preloadEssentialSounds();
    } catch (error) {
      console.warn("AudioContext initialization failed:", error);
      this.initialized = false;
    }
  }

  /**
   * Preload most frequently used sounds
   */
  async preloadEssentialSounds(): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      const promises = this.loadingPriority.immediate.map((soundKey) =>
        this.loadSound(
          this.audioFiles[soundKey as keyof typeof this.audioFiles]
        )
      );
      await Promise.all(promises);
      console.log("Essential sounds preloaded");
    } catch (error) {
      console.warn("Failed to preload essential sounds:", error);
    }
  }

  /**
   * Load sounds needed when game starts
   */
  async preloadGameSounds(): Promise<void> {
    if (!this.settings.enabled) return;

    try {
      const promises = this.loadingPriority.onGameStart.map((soundKey) =>
        this.loadSound(
          this.audioFiles[soundKey as keyof typeof this.audioFiles]
        )
      );
      await Promise.all(promises);
      console.log("Game sounds preloaded");
    } catch (error) {
      console.warn("Failed to preload game sounds:", error);
    }
  }

  /**
   * Load a specific sound file with caching
   */
  private async loadSound(filename: string): Promise<AudioBuffer> {
    // Return cached buffer if available
    if (this.audioBuffers.has(filename)) {
      return this.audioBuffers.get(filename)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename)!;
    }

    // Create new loading promise
    const loadingPromise = this.fetchAndDecodeAudio(filename);
    this.loadingPromises.set(filename, loadingPromise);

    try {
      const audioBuffer = await loadingPromise;
      this.audioBuffers.set(filename, audioBuffer);
      this.loadingPromises.delete(filename);
      return audioBuffer;
    } catch (error) {
      this.loadingPromises.delete(filename);
      throw error;
    }
  }

  /**
   * Fetch and decode audio file (uses service worker cache automatically)
   */
  private async fetchAndDecodeAudio(filename: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    // Service worker will serve from cache if available
    const response = await fetch(`/sound/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
  }

  /**
   * Play a sound with optimal performance
   */
  async playSound(
    soundKey: keyof typeof this.audioFiles,
    volume?: number
  ): Promise<void> {
    if (!this.settings.enabled || !this.settings.enabledSounds.has(soundKey)) {
      return;
    }

    const filename = this.audioFiles[soundKey];
    const finalVolume = volume !== undefined ? volume : this.settings.volume;

    try {
      // Initialize if needed (on first user interaction)
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.audioContext || !this.initialized) {
        // Fallback to HTML5 Audio
        return this.playFallbackAudio(filename, finalVolume);
      }

      // Try Web Audio API first (best performance)
      const audioBuffer = await this.loadSound(filename);

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = Math.max(0, Math.min(1, finalVolume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Track the source for potential stopping
      if (!this.activeSources.has(soundKey)) {
        this.activeSources.set(soundKey, []);
      }
      this.activeSources.get(soundKey)!.push(source);

      // Clean up when the source ends
      source.onended = () => {
        const sources = this.activeSources.get(soundKey);
        if (sources) {
          const index = sources.indexOf(source);
          if (index > -1) {
            sources.splice(index, 1);
          }
        }
      };

      source.start();
    } catch (error) {
      console.warn(`Failed to play ${soundKey} with Web Audio API:`, error);
      // Fallback to HTML5 Audio
      this.playFallbackAudio(filename, finalVolume);
    }
  }

  /**
   * Fallback audio player using HTML5 Audio (still uses browser cache)
   */
  private playFallbackAudio(filename: string, volume: number): void {
    try {
      const audio = new Audio(`/sound/${filename}`);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch((error) => {
        console.warn(`Failed to play ${filename}:`, error);
      });
    } catch (error) {
      console.warn(`Fallback audio failed for ${filename}:`, error);
    }
  }

  /**
   * Stop all instances of a specific sound
   */
  stopSound(soundKey: keyof typeof this.audioFiles): void {
    const sources = this.activeSources.get(soundKey);
    if (sources) {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Source may already be stopped, ignore error
        }
      });
      this.activeSources.set(soundKey, []);
    }
  }

  /**
   * Convenient methods for specific game sounds
   */
  async playCardPlay(volume?: number): Promise<void> {
    return this.playSound("cardPlay", volume);
  }

  async playCardDeal(volume?: number): Promise<void> {
    return this.playSound("cardDeal", volume);
  }

  stopCardDeal(): void {
    this.stopSound("cardDeal");
  }

  async playStackWon(volume?: number): Promise<void> {
    return this.playSound("stackWon", volume);
  }

  async playVictory(volume?: number): Promise<void> {
    // Load on-demand if not cached
    if (!this.audioBuffers.has(this.audioFiles.victory)) {
      await this.loadSound(this.audioFiles.victory);
    }
    return this.playSound("victory", volume);
  }

  async playDefeat(volume?: number): Promise<void> {
    // Load on-demand if not cached
    if (!this.audioBuffers.has(this.audioFiles.defeat)) {
      await this.loadSound(this.audioFiles.defeat);
    }
    return this.playSound("defeat", volume);
  }

  /**
   * Settings management
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  toggleSound(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  toggleSpecificSound(
    soundKey: keyof typeof this.audioFiles,
    enabled: boolean
  ): void {
    if (enabled) {
      this.settings.enabledSounds.add(soundKey);
    } else {
      this.settings.enabledSounds.delete(soundKey);
    }
    this.saveSettings();
  }

  /**
   * Persistence
   */
  private loadSettings(): void {
    // Skip localStorage operations during SSR
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      const saved = localStorage.getItem("dehla-pakad-audio-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          ...this.settings,
          ...parsed,
          enabledSounds: new Set(
            parsed.enabledSounds || Object.keys(this.audioFiles)
          ),
        };
      }
    } catch (error) {
      console.warn("Failed to load audio settings:", error);
    }
  }

  private saveSettings(): void {
    // Skip localStorage operations during SSR
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      const toSave = {
        ...this.settings,
        enabledSounds: Array.from(this.settings.enabledSounds),
      };
      localStorage.setItem(
        "dehla-pakad-audio-settings",
        JSON.stringify(toSave)
      );
    } catch (error) {
      console.warn("Failed to save audio settings:", error);
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.initialized = false;
  }
}

// Create singleton instance
export const audioManager = new AudioManager();

// Export types for external use
export type { AudioSettings };
export type GameSound = keyof (typeof audioManager)["audioFiles"];
