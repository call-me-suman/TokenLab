import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function NetworkChecker({ children }) {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkNetwork();

    if (window.ethereum) {
      window.ethereum.on("chainChanged", checkNetwork);
      window.ethereum.on("accountsChanged", checkNetwork);

      return () => {
        window.ethereum.removeListener("chainChanged", checkNetwork);
        window.ethereum.removeListener("accountsChanged", checkNetwork);
      };
    }
  }, []);

  const checkNetwork = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        const isHyperion = network.chainId === 998n;
        setIsCorrectNetwork(isHyperion);
        setCurrentNetwork(network.name || `Chain ID: ${network.chainId}`);
      } catch (error) {
        console.error("Network check failed:", error);
        setCurrentNetwork("Unknown");
      }
    }
    setLoading(false);
  };

  const addHyperionNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x3e6", // 998 in hex
            chainName: "Hyperion Testnet",
            nativeCurrency: {
              name: "Hyperion",
              symbol: "HYN",
              decimals: 18,
            },
            rpcUrls: ["https://rpc.hyperion.tech"],
            blockExplorerUrls: ["https://explorer.hyperion.tech"],
          },
        ],
      });
    } catch (error) {
      console.error("Failed to add network:", error);
      alert("Failed to add Hyperion network. Please add it manually.");
    }
  };

  const switchToHyperion = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x3e6" }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Network not added yet
        await addHyperionNetwork();
      } else {
        console.error("Failed to switch network:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Checking network...</p>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Wrong Network
            </h2>
            <p className="text-gray-600 mb-4">
              Please switch to Hyperion Testnet to use this application.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Current network: {currentNetwork}
            </p>
          </div>

          <button
            onClick={switchToHyperion}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mb-4"
          >
            Switch to Hyperion Testnet
          </button>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">
              Need Test HYN Tokens?
            </h3>
            <p className="text-sm text-blue-600 mb-3">
              Get free test tokens from the Hyperion faucet
            </p>
            <a
              href="https://faucet.hyperion.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
            >
              Visit Faucet
            </a>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <strong>Network Details:</strong>
            <br />
            RPC: https://rpc.hyperion.tech
            <br />
            Chain ID: 998
            <br />
            Symbol: HYN
          </div>
        </div>
      </div>
    );
  }

  return children;
}
