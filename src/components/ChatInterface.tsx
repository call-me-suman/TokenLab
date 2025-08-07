"use client";
import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
  KeyboardEvent,
} from "react";
import {
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Image,
  Volume2,
  Video,
  Download,
} from "lucide-react";

// Types (you'll need to import these from your types file)
interface Message {
  id: number;
  sender: "user" | "server" | "system";
  text: string;
  content?: "confirmation" | "image" | "audio" | "video" | "file";
  confirmationDetails?: ConfirmationDetails;
}

interface ConfirmationDetails {
  prompt: string;
  serverId: string;
  serverName: string;
  price: number;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "preparing" | "executing" | null
  >(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [focusedButton, setFocusedButton] = useState<"confirm" | "cancel">(
    "confirm"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Read the auth token when the component loads
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setAuthToken(token);
  }, []);

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isLoading]);

  // Focus confirm button when confirmation appears
  useEffect(() => {
    const confirmationMessage = messages.find(
      (msg) => msg.content === "confirmation"
    );
    if (confirmationMessage && confirmButtonRef.current) {
      setTimeout(() => {
        confirmButtonRef.current?.focus();
        setFocusedButton("confirm");
      }, 100);
    }
  }, [messages]);

  // Global keydown handler for typing anywhere - ALPHABETS ONLY
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or interacting with buttons
      if (
        e.target === inputRef.current ||
        e.target === confirmButtonRef.current ||
        e.target === cancelButtonRef.current
      ) {
        return;
      }

      // Check if it's an alphabetic character (a-z, A-Z) only
      const isAlphabetic = /^[a-zA-Z]$/.test(e.key);

      // Only handle alphabetic characters, no modifier keys
      if (isAlphabetic && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        // Add the character to input
        setInput((prev) => prev + e.key);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown as any);
    return () =>
      document.removeEventListener("keydown", handleGlobalKeyDown as any);
  }, []);

  const addMessage = (
    sender: Message["sender"],
    text: string,
    content?: Message["content"],
    confirmationDetails?: ConfirmationDetails
  ) => {
    const newMessage: Message = {
      id: Date.now(),
      sender,
      text,
      content,
      confirmationDetails,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePrepareQuery(e as any);
    }
  };

  const handleConfirmationKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (focusedButton === "confirm") {
        const confirmationMsg = messages.find(
          (msg) => msg.content === "confirmation"
        );
        if (confirmationMsg?.confirmationDetails) {
          handleExecuteQuery(confirmationMsg.confirmationDetails);
        }
      } else {
        handleCancelQuery();
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const newFocus = focusedButton === "confirm" ? "cancel" : "confirm";
      setFocusedButton(newFocus);
      if (newFocus === "confirm") {
        confirmButtonRef.current?.focus();
      } else {
        cancelButtonRef.current?.focus();
      }
    }
  };

  const handlePrepareQuery = async (e?: any) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    addMessage("user", userPrompt);
    setInput("");
    setIsLoading(true);
    setLoadingType("preparing");

    if (!authToken) {
      addMessage("system", "Error: You must be signed in to use the chat.");
      setIsLoading(false);
      setLoadingType(null);
      return;
    }

    try {
      const response = await fetch("/api/chat/router", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare query.");
      }

      const confirmationText = `This will use the "${data.name}" server and cost ${data.price} HYPN. Do you want to proceed?`;
      addMessage("system", confirmationText, "confirmation", {
        prompt: userPrompt,
        serverId: data.serverId,
        serverName: data.name,
        price: data.price,
      });
    } catch (error: any) {
      addMessage("system", `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const handleExecuteQuery = async (details: ConfirmationDetails) => {
    setIsLoading(true);
    setLoadingType("executing");
    setMessages((prev) => prev.filter((msg) => msg.content !== "confirmation"));
    addMessage(
      "system",
      `Confirmed. Running query on "${details.serverName}"...`
    );

    try {
      const response = await fetch(`/api/mcp/${details.serverId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ prompt: details.prompt }),
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const contentType = response.headers.get("content-type") || "";
      console.log("Content-Type:", contentType);

      if (!response.ok) {
        console.log("Response not OK, trying to handle error...");
        const errorText = await response.text();
        console.log("Error response body:", errorText);

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        } catch (parseError) {
          throw new Error(
            errorText ||
              `Server error: ${response.status} ${response.statusText}`
          );
        }
      }

      // Handle successful responses
      console.log("Response OK, handling content...");

      if (contentType.includes("image")) {
        console.log("Handling as image...");
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        addMessage("server", imageUrl, "image");
      } else if (contentType.includes("audio")) {
        console.log("Handling as audio...");
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        addMessage("server", audioUrl, "audio");
      } else if (contentType.includes("video")) {
        console.log("Handling as video...");
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        addMessage("server", videoUrl, "video");
      } else if (
        contentType.includes("application/json") ||
        contentType.includes("text") ||
        contentType === ""
      ) {
        console.log("Handling as JSON/text...");
        try {
          const result = await response.json();
          const responseText =
            result.responseText ||
            result.summary ||
            result.message ||
            JSON.stringify(result, null, 2);
          addMessage("server", responseText);
        } catch (jsonError) {
          console.log("JSON parse failed, trying as text...");
          const textResponse = await response.text();
          addMessage("server", textResponse);
        }
      } else {
        console.log("Handling as unknown file type...");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        addMessage("server", `File received (${contentType}): ${url}`, "file");
      }
    } catch (error: any) {
      console.error("handleExecuteQuery error:", error);
      addMessage("system", `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const handleCancelQuery = () => {
    setMessages((prev) => prev.filter((msg) => msg.content !== "confirmation"));
    addMessage("system", "Request cancelled.");
  };

  const LoadingSpinner = ({ type }: { type: "preparing" | "executing" }) => (
    <div className="flex items-center justify-center space-x-3 py-6">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin"></div>
        <div
          className="absolute inset-0 w-8 h-8 border-4 border-transparent border-t-purple-400 rounded-full animate-spin"
          style={{ animationDelay: "0.15s" }}
        ></div>
      </div>
      <span className="text-gray-300 text-sm font-medium">
        {type === "preparing"
          ? "Finding the best server..."
          : "Generating response..."}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AI Marketplace Chat
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Powered by distributed AI servers
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Send className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Ask me anything! I'll find the best AI server to handle your
                request and show you the cost upfront.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 shadow-lg ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : msg.sender === "server"
                    ? "bg-gray-800 text-gray-100 border border-gray-700"
                    : "bg-gray-750 text-gray-200 border border-gray-600"
                }`}
              >
                {msg.content === "confirmation" && msg.confirmationDetails ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className="flex gap-3 pt-2">
                      <button
                        ref={confirmButtonRef}
                        onClick={() =>
                          handleExecuteQuery(msg.confirmationDetails!)
                        }
                        onKeyDown={handleConfirmationKeyDown}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                          focusedButton === "confirm"
                            ? "bg-green-500 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-gray-700 shadow-lg"
                            : "bg-green-600 hover:bg-green-500 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirm
                      </button>
                      <button
                        ref={cancelButtonRef}
                        onClick={handleCancelQuery}
                        onKeyDown={handleConfirmationKeyDown}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                          focusedButton === "cancel"
                            ? "bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-gray-700 shadow-lg"
                            : "bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : msg.content === "image" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Image className="w-4 h-4" />
                        Image generated
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(
                            msg.text,
                            `generated-image-${msg.id}.png`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-all transform hover:scale-105 shadow-sm hover:shadow-md"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                    <div className="relative group">
                      <img
                        src={msg.text}
                        alt="Generated content"
                        className="rounded-xl max-w-full shadow-xl transition-transform group-hover:scale-[1.02]"
                      />
                    </div>
                  </div>
                ) : msg.content === "audio" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Volume2 className="w-4 h-4" />
                        Audio generated
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(
                            msg.text,
                            `generated-audio-${msg.id}.mp3`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs transition-all transform hover:scale-105 shadow-sm hover:shadow-md"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <audio controls src={msg.text} className="w-full" />
                    </div>
                  </div>
                ) : msg.content === "video" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Video className="w-4 h-4" />
                        Video generated
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(
                            msg.text,
                            `generated-video-${msg.id}.mp4`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs transition-all transform hover:scale-105 shadow-sm hover:shadow-md"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                    <video
                      controls
                      src={msg.text}
                      className="rounded-xl max-w-full shadow-xl"
                    />
                  </div>
                ) : msg.content === "file" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Download className="w-4 h-4" />
                      File received
                    </div>
                    <a
                      href={msg.text.split(": ")[1]}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </a>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.text}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && <LoadingSpinner type={loadingType || "preparing"} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Section */}
      <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="w-full p-4 pr-12 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[56px] max-h-32 shadow-lg transition-all focus:shadow-xl"
                disabled={isLoading}
                rows={1}
                style={{
                  height: "auto",
                  minHeight: "56px",
                  maxHeight: "128px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 128) + "px";
                }}
              />
            </div>
            <button
              onClick={handlePrepareQuery}
              className={`p-4 rounded-2xl font-medium transition-all flex items-center justify-center min-w-[56px] h-[56px] ${
                isLoading || !input.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
              }`}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500 text-center">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
              Enter
            </kbd>{" "}
            to send •
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400 mx-1">
              Shift+Enter
            </kbd>{" "}
            for new line • Start typing letters from anywhere
          </div>
        </div>
      </div>
    </div>
  );
}
