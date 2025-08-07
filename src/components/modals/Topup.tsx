import { useState, useEffect, FormEvent } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress } from "viem";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [status, setStatus] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // Wagmi hooks for the transaction
  const {
    data: hash,
    error,
    isPending,
    sendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const treasuryAddress = process.env
    .NEXT_PUBLIC_TREASURY_WALLET_ADDRESS as `0x${string}`;

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setTopUpAmount("");
      setStatus("");
    }, 300); // Match the animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleTopUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      setStatus("Please enter a valid amount.");
      return;
    }
    if (!treasuryAddress || !isAddress(treasuryAddress)) {
      setStatus("❌ Error: Treasury address is not configured.");
      return;
    }
    setStatus("Please approve the transaction in your wallet...");
    sendTransaction({
      to: treasuryAddress,
      value: parseEther(topUpAmount),
    });
  };

  // Effect to handle the transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setStatus("✅ Top-up successful! Your balance will update shortly.");
      // Call the onSuccess callback to let the parent know
      onSuccess();
      setTimeout(() => {
        handleClose(); // Close the modal after a delay
      }, 2000);
    }
    if (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  }, [isConfirmed, error, onSuccess]);

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
        <div className="text-center">
          <div
            className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full 
                         flex items-center justify-center mb-4"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0L15 15.182M6.34 6.34a10.018 10.018 0 000 11.32M17.66 6.34a10.018 10.018 0 010 11.32"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Top Up Your Balance
          </h2>
          <p className="text-gray-400 mb-6">
            Deposit tMETIS to add credits to your marketplace account.
          </p>

          <form onSubmit={handleTopUp} className="space-y-6">
            <div>
              <label
                htmlFor="topUpAmount"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Amount (tMETIS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="topUpAmount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white 
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-transparent transition-all duration-200"
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm">
                  tMETIS
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 px-4 
                       rounded-lg font-semibold hover:from-green-700 hover:to-emerald-800 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                       transform hover:scale-105 shadow-lg disabled:transform-none"
            >
              {isPending
                ? "Check Wallet..."
                : isConfirming
                ? "Confirming..."
                : "Top Up Balance"}
            </button>
          </form>

          {status && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                status.includes("✅")
                  ? "bg-green-900/50 text-green-400 border border-green-700"
                  : status.includes("❌")
                  ? "bg-red-900/50 text-red-400 border border-red-700"
                  : "bg-blue-900/50 text-blue-400 border border-blue-700"
              }`}
            >
              {status}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200 
                     p-2 hover:bg-gray-700 rounded-full"
        >
          <svg
            className="w-5 h-5"
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
    </div>
  );
}
