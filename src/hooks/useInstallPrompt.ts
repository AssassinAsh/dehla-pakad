import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    showIOSInstructions: false,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Detect if app is already installed (standalone mode)
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    setState((prev) => ({
      ...prev,
      isIOS,
      isInstalled,
    }));

    // Handle beforeinstallprompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;

      setState((prev) => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: event,
      }));
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = async (): Promise<boolean> => {
    if (state.isIOS) {
      // Show iOS instructions
      setState((prev) => ({ ...prev, showIOSInstructions: true }));
      return false;
    }

    if (state.deferredPrompt) {
      try {
        await state.deferredPrompt.prompt();
        const { outcome } = await state.deferredPrompt.userChoice;

        setState((prev) => ({
          ...prev,
          deferredPrompt: null,
          isInstallable: false,
        }));

        return outcome === "accepted";
      } catch (error) {
        console.error("Error showing install prompt:", error);
        return false;
      }
    }

    return false;
  };

  const hideIOSInstructions = () => {
    setState((prev) => ({ ...prev, showIOSInstructions: false }));
  };

  return {
    ...state,
    showInstallPrompt,
    hideIOSInstructions,
  };
}
