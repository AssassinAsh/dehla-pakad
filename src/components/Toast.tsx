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
  let animation = "animate-slide-up";

  if (type === "error") {
    bgColor = "bg-gradient-to-br from-red-500 via-red-600 to-red-700";
    borderColor = "border-red-300/50";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 sm:h-6 sm:w-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  } else if (type === "success") {
    bgColor = "bg-gradient-to-br from-emerald-500 via-green-600 to-green-700";
    borderColor = "border-emerald-300/50";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 sm:h-6 sm:w-6 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  } else {
    // 'game' type
    bgColor = "bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500";
    borderColor = "border-yellow-300/60";
    animation = "animate-bounce-in";
    icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-900"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6 1a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-4">
      <div
        className={`w-full ${bgColor} text-white font-bold rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex items-center justify-between border-2 ${borderColor} ${animation} backdrop-blur-sm`}
        style={{
          boxShadow:
            type === "game"
              ? "0 20px 40px rgba(251, 192, 45, 0.3), 0 8px 16px rgba(0,0,0,0.1)"
              : type === "success"
              ? "0 20px 40px rgba(34, 197, 94, 0.3), 0 8px 16px rgba(0,0,0,0.1)"
              : "0 20px 40px rgba(239, 68, 68, 0.3), 0 8px 16px rgba(0,0,0,0.1)",
        }}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 sm:mr-4">
            {icon}
          </div>
          <span className="text-sm sm:text-base font-medium leading-relaxed">
            {message}
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-3 sm:ml-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center justify-center group haptic-light focus-ring"
          aria-label="Close notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
