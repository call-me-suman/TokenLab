"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { LoginModal } from "@/components/auth/LoginModal";
import { TopUpModal } from "./modals/Topup";

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

// Hook to fetch user balance
function useUserBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected } = useAccount();

  const fetchBalance = async () => {
    if (!isConnected) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      } else {
        setBalance(0);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [isConnected]);

  return { balance, isLoading, refetchBalance: fetchBalance };
}

export function Navbar() {
  const { isConnected } = useAccount();
  const { isLoggedIn } = useAuthSession();
  const {
    balance,
    isLoading: balanceLoading,
    refetchBalance,
  } = useUserBalance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  const handleLoginSuccess = () => {
    setIsModalOpen(false);
    // Refetch balance after successful login
    refetchBalance();
    // You might want to refresh the page or user data here
    window.location.reload();
  };

  const handleTopUpSuccess = () => {
    // Refetch balance after successful top-up
    refetchBalance();
    // For a hackathon, reloading the page is a simple and effective way
    // to ensure all user data (like balance) is refreshed.
    window.location.reload();
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModalOpen || isTopUpModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isTopUpModalOpen]);

  const formatBalance = (balance: number | null) => {
    if (balance === null) return "0.00";
    return balance.toFixed(4);
  };

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 shadow-xl">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MCP Marketplace
          </h1>
          <div className="flex items-center gap-4">
            {/* Balance Display */}
            {isConnected && isLoggedIn && (
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium">
                      Balance
                    </span>
                    <div className="flex items-center space-x-1">
                      {balanceLoading ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-300">
                            Loading...
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-white">
                            {formatBalance(balance)}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            tMETIS
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={refetchBalance}
                  className="ml-3 p-1 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-700 rounded"
                  title="Refresh balance"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* RainbowKit's button handles wallet connection, balance, etc. */}
            <ConnectButton />

            {isConnected && (
              <button
                onClick={() => setIsTopUpModalOpen(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold 
                         hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 
                         shadow-lg hover:shadow-xl"
              >
                Top Up
              </button>
            )}

            {/* Show "Sign In" button only if connected but not logged in via SIWE */}
            {isConnected && !isLoggedIn && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold 
                         hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 
                         shadow-lg hover:shadow-xl"
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
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        onSuccess={handleTopUpSuccess}
      />
    </>
  );
}
