"use client";

import { useState } from "react";
import Toast from "./Toast";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedback: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.feedback.trim()) {
      setToast({
        message: "Please enter your feedback",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setToast({
          message: result.message || "Thank you for your feedback!",
          type: "success",
        });

        // Reset form
        setFormData({ name: "", email: "", feedback: "" });

        // Close modal after short delay
        setTimeout(() => {
          onClose();
          setToast(null);
        }, 2000);
      } else {
        setToast({
          message: result.error || "Failed to submit feedback",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setToast({
        message: "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md mx-auto">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00D2FF]/20 via-transparent to-[#FF4C4C]/20 rounded-2xl blur-lg"></div>

          {/* Main modal */}
          <div className="relative bg-[#040e16]/90 backdrop-blur-xl border border-[#00D2FF]/30 rounded-2xl shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00D2FF]/20 to-[#040e16]/20 text-[#00D2FF] p-4 rounded-t-2xl border-b border-[#00D2FF]/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-white">
                  Share Your Feedback
                </h2>
                <button
                  onClick={onClose}
                  className="group relative w-8 h-8 rounded-full bg-[#FF4C4C]/20 hover:bg-[#FF4C4C]/30 border border-[#FF4C4C]/30 hover:border-[#FF4C4C]/50 transition-all duration-300 flex items-center justify-center transform hover:scale-110"
                  aria-label="Close feedback form"
                >
                  <svg
                    className="w-4 h-4 text-[#FF4C4C] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
              <p className="text-[#00D2FF]/70 text-sm mt-1">
                Help us improve Dehla Pakad!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[#00D2FF] mb-1"
                >
                  Name <span className="text-[#00D2FF]/50">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[#040e16]/80 border border-[#00D2FF]/30 rounded-lg focus:ring-2 focus:ring-[#00D2FF] focus:border-[#00D2FF] transition-all text-[#00D2FF] placeholder-[#00D2FF]/40 backdrop-blur-sm"
                    placeholder="Your name"
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00D2FF]/5 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#00D2FF] mb-1"
                >
                  Email <span className="text-[#00D2FF]/50">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-[#040e16]/80 border border-[#00D2FF]/30 rounded-lg focus:ring-2 focus:ring-[#00D2FF] focus:border-[#00D2FF] transition-all text-[#00D2FF] placeholder-[#00D2FF]/40 backdrop-blur-sm"
                    placeholder="your@email.com"
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00D2FF]/5 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Feedback Field */}
              <div>
                <label
                  htmlFor="feedback"
                  className="block text-sm font-medium text-[#00D2FF] mb-1"
                >
                  Feedback <span className="text-[#FF4C4C]">*</span>
                </label>
                <div className="relative">
                  <textarea
                    id="feedback"
                    name="feedback"
                    value={formData.feedback}
                    onChange={handleChange}
                    rows={4}
                    required
                    className="w-full px-3 py-2 bg-[#040e16]/80 border border-[#00D2FF]/30 rounded-lg focus:ring-2 focus:ring-[#00D2FF] focus:border-[#00D2FF] transition-all resize-none text-[#00D2FF] placeholder-[#00D2FF]/40 backdrop-blur-sm"
                    placeholder="Share your thoughts, suggestions, or report any issues..."
                  />
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00D2FF]/5 to-transparent pointer-events-none"></div>
                </div>
              </div>
              {/* Submit Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-[#00D2FF] bg-[#040e16]/80 hover:bg-[#00D2FF]/10 border border-[#00D2FF]/30 hover:border-[#00D2FF]/50 rounded-lg transition-all duration-300 font-medium backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.feedback.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00D2FF] to-blue-400 text-[#040e16] rounded-lg hover:from-[#00D2FF]/90 hover:to-blue-400/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00D2FF]/25 hover:shadow-xl hover:shadow-[#00D2FF]/40 transform hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
