// Create this file at: components/forms/RegisterServerForm.tsx

"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

// Define a type for the form's state
interface FormState {
  name: string;
  description: string;
  keywords: string; // We'll handle this as a comma-separated string in the UI
  endpointUrl: string;
  pricePerQuery: number;
  payoutAddress: string;
}

export function RegisterServerForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>({
    name: "",
    description: "",
    keywords: "",
    endpointUrl: "",
    pricePerQuery: 0.1,
    payoutAddress: "",
  });

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // 3. Use useEffect to read from localStorage when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setAuthToken(token);
  }, []); // The empty array [] means this runs only once

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      // Convert the comma-separated keywords string into an array
      const keywordsArray = formData.keywords
        .split(",")
        .map((kw) => kw.trim())
        .filter(Boolean);

      if (!authToken) {
        setStatus("❌ Error: Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }
      const response = await fetch("/api/marketplace/server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          //   IMPORTANT: You must get the auth token from your session/storage
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...formData,
          keywords: keywordsArray,
        }),
      });

      const result = await response.json();
      // const res = await fetch(
      //   `${process.env.ROUTER_WORKER_URL}/admin/services`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${process.env.CLOUDFLARE_ADMIN_TOKEN}`,
      //     },
      //     body: {
      // },
      //   }
      // );

      if (!response.ok) {
        throw new Error(result.error || "Failed to register server.");
      }

      setStatus("✅ Server registered successfully! Redirecting...");
      // Redirect to a dashboard or a page showing the seller's servers
      router.push("/marketplace/servers");
    } catch (error: any) {
      console.error("Registration Error:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Register a New MCP Server
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Server Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="My Awesome Image Generator"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what your server does so our router can find it."
          />
        </div>

        <div>
          <label
            htmlFor="keywords"
            className="block text-sm font-medium text-gray-700"
          >
            Keywords (comma-separated)
          </label>
          <input
            type="text"
            id="keywords"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="image, art, generator, draw"
          />
        </div>

        <div>
          <label
            htmlFor="endpointUrl"
            className="block text-sm font-medium text-gray-700"
          >
            Endpoint URL
          </label>
          <input
            type="url"
            id="endpointUrl"
            name="endpointUrl"
            value={formData.endpointUrl}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://api.myserver.com/query"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="pricePerQuery"
              className="block text-sm font-medium text-gray-700"
            >
              Price per Query (HYPN)
            </label>
            <input
              type="number"
              id="pricePerQuery"
              name="pricePerQuery"
              value={formData.pricePerQuery}
              onChange={handleChange}
              required
              min="0"
              step="0.001"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="payoutAddress"
              className="block text-sm font-medium text-gray-700"
            >
              Payout Wallet Address
            </label>
            <input
              type="text"
              id="payoutAddress"
              name="payoutAddress"
              value={formData.payoutAddress}
              onChange={handleChange}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0x..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register Server"}
        </button>

        {status && (
          <p className="mt-4 text-sm text-center text-gray-700">{status}</p>
        )}
      </form>
    </div>
  );
}
