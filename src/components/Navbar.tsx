"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { LoginModal } from "@/components/auth/LoginModal"; // We will create this next

// A simple hook to check the user's session status
function useAuthSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) {
      setIsLoggedIn(false);
      return;
    }
    // Check session status with the backend when the component mounts or connection status changes
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(data.isLoggedIn || false))
      .catch(() => setIsLoggedIn(false));
  }, [isConnected]);

  return { isLoggedIn };
}

export function Navbar() {
  const { isConnected } = useAccount();
  const { isLoggedIn } = useAuthSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLoginSuccess = () => {
    setIsModalOpen(false);
    // You might want to refresh the page or user data here
    window.location.reload();
  };

  return (
    <>
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">MCP Marketplace</h1>
          <div className="flex items-center gap-4">
            {/* RainbowKit's button handles wallet connection, balance, etc. */}
            <ConnectButton />

            {/* Show "Sign In" button only if connected but not logged in via SIWE */}
            {isConnected && !isLoggedIn && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* The Login Modal, which opens when the state is true */}
      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
