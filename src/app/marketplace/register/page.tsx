"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  Tag,
  DollarSign,
  Globe,
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles,
} from "lucide-react";

// Define a type for the form's state
interface FormState {
  name: string;
  description: string;
  keywords: string; // We'll handle this as a comma-separated string in the UI
  endpointUrl: string;
  pricePerQuery: number;
  payoutAddress: string;
}

export default function RegisterServerForm() {
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Use useEffect to read from localStorage when the component mounts
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setAuthToken(token);
  }, []);

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
        setStatus("error:Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/marketplace/server-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...formData,
          keywords: keywordsArray,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register server.");
      }

      setStatus("success:Server registered successfully! Redirecting...");
      // Redirect to a dashboard or a page showing the seller's servers
      setTimeout(() => {
        router.push("/marketplace");
      }, 2000);
    } catch (error: any) {
      console.error("Registration Error:", error);
      setStatus(`error:${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (!status) return null;

    const [type, message] = status.split(":");
    const isSuccess = type === "success";

    return (
      <div
        className={`flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm border ${
          isSuccess
            ? "bg-green-500/10 border-green-500/30 text-green-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}
      >
        {isSuccess ? (
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="font-medium">{message}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6 flex items-center justify-center">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-pulse" />
      </div>

      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Server className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Register AI Server
          </h2>
          <p className="text-gray-400">Join the decentralized AI marketplace</p>
        </div>

        <div className="space-y-6">
          {/* Server Name */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Server Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                placeholder="My Awesome AI Service"
              />
              {focusedField === "name" && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Description
            </label>
            <div className="relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onFocus={() => setFocusedField("description")}
                onBlur={() => setFocusedField(null)}
                required
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300 resize-none"
                placeholder="Describe what your AI service does - be specific about capabilities and use cases"
              />
              {focusedField === "description" && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Keywords
              <span className="text-xs text-gray-500">(comma-separated)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                onFocus={() => setFocusedField("keywords")}
                onBlur={() => setFocusedField(null)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                placeholder="image, generation, ai, art, creative, dall-e"
              />
              {focusedField === "keywords" && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Endpoint URL */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Endpoint URL
            </label>
            <div className="relative">
              <input
                type="url"
                name="endpointUrl"
                value={formData.endpointUrl}
                onChange={handleChange}
                onFocus={() => setFocusedField("endpointUrl")}
                onBlur={() => setFocusedField(null)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                placeholder="https://api.myaiservice.com/query"
              />
              {focusedField === "endpointUrl" && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Price and Payout Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Price per Query
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                  tMETIS
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="pricePerQuery"
                  value={formData.pricePerQuery}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("pricePerQuery")}
                  onBlur={() => setFocusedField(null)}
                  required
                  min="0"
                  step="0.001"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                />
                {focusedField === "pricePerQuery" && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                )}
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Payout Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="payoutAddress"
                  value={formData.payoutAddress}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("payoutAddress")}
                  onBlur={() => setFocusedField(null)}
                  required
                  pattern="^0x[a-fA-F0-9]{40}$"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-300"
                  placeholder="0x..."
                />
                {focusedField === "payoutAddress" && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="relative flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Registering Server...
                </>
              ) : (
                <>
                  <Server className="w-5 h-5" />
                  Register AI Server
                </>
              )}
            </div>
          </button>

          {/* Status Message */}
          {renderStatus()}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="text-xs text-gray-400">
              <div className="text-purple-400 font-semibold">Instant Setup</div>
              Go live in minutes
            </div>
            <div className="text-xs text-gray-400">
              <div className="text-pink-400 font-semibold">Global Network</div>
              Worldwide accessibility
            </div>
            <div className="text-xs text-gray-400">
              <div className="text-blue-400 font-semibold">Crypto Payments</div>
              Instant settlements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
