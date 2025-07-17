"use client";

import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface InstallPromptProps {
  onInstallSuccess?: () => void;
}

export default function InstallPrompt({
  onInstallSuccess,
}: InstallPromptProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSInstructions,
    showInstallPrompt,
    hideIOSInstructions,
  } = useInstallPrompt();

  // Don't show anything if app is already installed
  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const success = await showInstallPrompt();
    if (success && onInstallSuccess) {
      onInstallSuccess();
    }
  };

  return (
    <>
      {/* Install Button for Android/Desktop */}
      {isInstallable && !isIOS && (
        <button
          onClick={handleInstall}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 border-2 border-green-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          Install App
        </button>
      )}

      {/* Install Suggestion for iOS */}
      {isIOS && !isInstalled && (
        <button
          onClick={() => showInstallPrompt()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 border-2 border-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          Install App
        </button>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Install Dehla Pakad
              </h3>
              <button
                onClick={hideIOSInstructions}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Install this app on your device for the best experience:
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Tap the <strong>Share</strong> button in Safari
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                  </svg>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Select <strong>&quot;Add to Home Screen&quot;</strong>
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Tap <strong>&quot;Add&quot;</strong> to install
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-purple-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                  </svg>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-xs">
                  💡 <strong>Benefits:</strong> Play offline, get notifications,
                  and enjoy a native app experience!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
