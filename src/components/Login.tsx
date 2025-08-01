"use client";

import { useState } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Define a prop type for a success callback
type LoginComponentProps = {
  onLoginSuccess: () => void;
};

export function LoginComponent({ onLoginSuccess }: LoginComponentProps) {
  // Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // State management for UI feedback
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Handles the Sign-In with Ethereum (SIWE) signing process.
   * This function assumes the user is already connected via RainbowKit.
   */
  const handleLogin = async () => {
    try {
      if (!isConnected || !address || !chain) {
        throw new Error("Please connect your wallet first.");
      }

      setLoading(true);
      setStatus("Fetching challenge...");

      // 1. Fetch a unique nonce from the backend
      const nonceRes = await fetch("/api/auth/nonce");
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce from server.");
      const { nonce } = await nonceRes.json();

      // 2. Create the SIWE message to be signed
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in to MCP Marketplace to continue.",
        uri: window.location.origin,
        version: "1",
        chainId: chain.id,
        nonce: nonce,
      });

      // 3. Prompt the user to sign the message
      setStatus("Please sign the message in your wallet...");
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // 4. Send the signed message to the backend for verification
      setStatus("Verifying signature...");
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed on the server.");

      const result = await verifyRes.json();
      if (result.ok) {
        setStatus("✅ Login successful! Redirecting...");
        onLoginSuccess();
      } else {
        throw new Error("Login verification failed.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setStatus(`❌ Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
      <h1 className="text-2xl font-bold mb-2">MCP Marketplace</h1>
      <p className="text-gray-600 mb-6">
        First, connect your wallet. Then, sign in.
      </p>

      {/* Step 1: RainbowKit's Connect Button */}
      <div className="flex justify-center mb-6">
        <ConnectButton />
      </div>

      {/* Step 2: Sign-In Button (only appears after connecting) */}
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

// // 2. Updated Login Page (No changes needed here)
// // This page remains the same, as its only job is to host the component.
// // Path: app/login/page.tsx

// ("use client");

// import { useRouter } from "next/navigation";
// import { LoginComponent } from "@/components/auth/LoginComponent"; // Adjust path as needed

// export default function LoginPage() {
//   const router = useRouter();

//   // Define what happens on a successful login: redirect to the dashboard.
//   const handleLoginSuccess = () => {
//     router.push("/dashboard");
//   };

//   return (
//     <main className="min-h-screen flex items-center justify-center bg-gray-100">
//       <LoginComponent onLoginSuccess={handleLoginSuccess} />
//     </main>
//   );
// }
