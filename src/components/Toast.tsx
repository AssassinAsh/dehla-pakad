"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: "error" | "success" | "game";
  duration?: number;
}

export default function Toast({
  message,
  onClose,
  type = "error",
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  let bgColor = "";
  let borderColor = "";
  let icon = null;
  let animation = "animate-fade-in-up";
  if (type === "error") {
    bgColor = "bg-gradient-to-r from-red-600 to-red-800";
    borderColor = "border-red-400";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-3 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  } else if (type === "success") {
    bgColor = "bg-gradient-to-r from-green-500 to-green-700";
    borderColor = "border-green-300";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-3 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  } else {
    // 'game' type
    bgColor = "bg-gradient-to-r from-yellow-400 to-yellow-600";
    borderColor = "border-yellow-300";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-3 flex-shrink-0 text-yellow-900"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6 1a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
    animation = "animate-bounce-in";
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div
        className={`w-full ${bgColor} text-white font-bold rounded-lg shadow-2xl p-4 flex items-center justify-between border-2 ${borderColor} ${animation}`}
      >
        <div className="flex items-center">
          {icon}
          <span className="text-sm">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white opacity-70 hover:opacity-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {/* Bounce-in animation for game toasts */}
      <style jsx global>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.7) translateY(40px);
            opacity: 0.2;
          }
          60% {
            transform: scale(1.1) translateY(-8px);
            opacity: 1;
          }
          80% {
            transform: scale(0.95) translateY(2px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
