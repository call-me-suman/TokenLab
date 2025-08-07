// Create this file at: components/dashboard/DashboardClient.tsx

"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, isAddress } from "viem";
import { ChatInterface } from "@/components/ChatInterface";

// Props for the component, including the initial balance fetched from the server
interface DashboardClientProps {
  initialBalance: number;
}

export function DashboardClient({ initialBalance }: DashboardClientProps) {
  const { address } = useAccount();
  const [balance, setBalance] = useState(initialBalance);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [status, setStatus] = useState("");

  // Wagmi hooks for sending the native currency transaction
  const {
    data: hash,
    error,
    isPending,
    sendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Get the treasury address from environment variables
  const treasuryAddress = process.env
    .NEXT_PUBLIC_TREASURY_WALLET_ADDRESS as `0x${string}`;

  // Function to fetch and update the balance from our API
  const refreshBalance = async () => {
    try {
      const res = await fetch("/api/user/balance");
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
      }
    } catch (e) {
      console.error("Failed to refresh balance", e);
    }
  };

  // Handle the form submission for topping up
  const handleTopUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }

    // --- FIX: Validate the treasury address before sending ---
    if (!treasuryAddress || !isAddress(treasuryAddress)) {
      setStatus(
        "❌ Error: Treasury address is not configured correctly. Please contact support."
      );
      console.error(
        "NEXT_PUBLIC_TREASURY_WALLET_ADDRESS is not a valid address or is not set in .env.local"
      );
      return;
    }

    setStatus("Please approve the transaction in your wallet...");
    // Call the sendTransaction function for native currency
    sendTransaction({
      to: treasuryAddress,
      value: parseEther(topUpAmount),
    });
  };

  // Effect to watch for transaction confirmation and then refresh the balance
  useEffect(() => {
    if (isConfirmed) {
      setStatus("✅ Top-up successful! Your balance will update shortly.");
      setTopUpAmount("");
      // Wait a few seconds for the listener script to process the transaction
      setTimeout(() => {
        refreshBalance();
        setStatus("");
      }, 5000); // 5-second delay
    }
    if (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  }, [isConfirmed, error]);

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Balance and Top-Up */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              Your Balance
            </h2>
            <p className="text-4xl font-bold text-gray-900">
              {balance.toFixed(4)}{" "}
              <span className="text-xl font-medium text-gray-500">Credits</span>
            </p>

            <form onSubmit={handleTopUp} className="mt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">
                Top Up Your Account
              </h3>
              <div>
                <label htmlFor="topUpAmount" className="sr-only">
                  Amount
                </label>
                <input
                  type="number"
                  id="topUpAmount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Amount in tMETIS"
                  min="0"
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending
                  ? "Check Wallet..."
                  : isConfirming
                  ? "Confirming..."
                  : "Top Up"}
              </button>
            </form>
            {status && (
              <p className="mt-3 text-sm text-center text-gray-600">{status}</p>
            )}
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="md:col-span-2">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
