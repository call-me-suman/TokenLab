import { useEffect, useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: LoginModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match the animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center items-center p-4 transition-all duration-300 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      {/* Blurred backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-all duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal container */}
      <div
        className={`relative bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-md 
                   transform transition-all duration-300 ${
                     isAnimating
                       ? "scale-100 translate-y-0 opacity-100"
                       : "scale-95 translate-y-4 opacity-0"
                   }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* We are reusing the exact same LoginComponent from before */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400 mb-6">Sign in to access your account</p>
          <LoginComponent onLoginSuccess={onLoginSuccess} />
        </div>

        {/* Close button for the modal */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 
                     p-2 hover:bg-gray-700 rounded-full"
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

// Placeholder for LoginComponent - replace with your actual component
function LoginComponent({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onLoginSuccess}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg 
                   font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 
                   transform hover:scale-105 shadow-lg"
      >
        Sign In with Wallet
      </button>
    </div>
  );
}
