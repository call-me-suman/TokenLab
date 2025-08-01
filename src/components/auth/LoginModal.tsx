"use client";

import { LoginComponent } from "../Login"; // The component from the previous step

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
};

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: LoginModalProps) {
  if (!isOpen) return null;

  return (
    // Modal backdrop
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      {/* Modal container */}
      <div className="relative z-50">
        {/* We are reusing the exact same LoginComponent from before */}
        <LoginComponent onLoginSuccess={onLoginSuccess} />

        {/* Close button for the modal */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
