// Path: components/auth/LoginComponent.tsx

"use client";

import { useState } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type LoginComponentProps = {
  onLoginSuccess: () => void;
};

export function LoginComponent({ onLoginSuccess }: LoginComponentProps) {
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!isConnected || !address || !chain) {
        throw new Error("Please connect your wallet first.");
      }

      setLoading(true);
      setStatus("Fetching challenge...");

      const nonceRes = await fetch("/api/auth/nonce");
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce from server.");
      const { nonce } = await nonceRes.json();

      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in to MCP Marketplace to continue.",
        uri: window.location.origin,
        version: "1",
        chainId: chain.id,
        nonce: nonce,
      });

      setStatus("Please sign the message in your wallet...");
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      setStatus("Verifying signature...");
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed on the server.");

      const result = await verifyRes.json();
      if (result.ok && result.token) {
        // ✅ Safe localStorage access
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem("authToken", result.token);
        }

        setStatus("✅ Login successful! Redirecting...");
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setStatus(`❌ Error: ${err.message}`);
      setLoading(false);
    }
  };

  // ... rest of the JSX is the same
  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
      <h1 className="text-2xl font-bold mb-2">MCP Marketplace</h1>
      <p className="text-gray-600 mb-6">
        First, connect your wallet. Then, sign in.
      </p>

      <div className="flex justify-center mb-6">
        <ConnectButton />
      </div>

      {isConnected && (
        <div className="flex flex-col items-center gap-4">
          <button
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Sign-In with Ethereum"}
          </button>
        </div>
      )}

      {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
    </div>
  );
}
