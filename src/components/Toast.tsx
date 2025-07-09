"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: "error" | "success";
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

  const bgColor =
    type === "error"
      ? "bg-gradient-to-r from-red-600 to-red-800"
      : "bg-gradient-to-r from-green-500 to-green-700";
  const borderColor = type === "error" ? "border-red-400" : "border-green-300";

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div
        className={`w-full ${bgColor} text-white font-bold rounded-lg shadow-2xl p-4 flex items-center justify-between border-2 ${borderColor} animate-fade-in-up`}
      >
        <div className="flex items-center">
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
    </div>
  );
}
