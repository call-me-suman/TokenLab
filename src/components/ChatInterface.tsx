// Create this file at: components/chat/ChatInterface.tsx

"use client";

import { useState, FormEvent, useEffect, useRef } from "react";

// --- Type Definitions ---

// Represents a single message in the chat history
interface Message {
  id: number;
  sender: "user" | "server" | "system";
  text: string;
  // The content can also be a confirmation request or a special media type
  content?: "confirmation" | "image" | "audio";
  // Store confirmation details if the message is a confirmation request
  confirmationDetails?: ConfirmationDetails;
}

// Holds the details for a pending query that needs user confirmation
interface ConfirmationDetails {
  prompt: string;
  serverId: string;
  serverName: string;
  price: number;
}

// --- The Main Component ---

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read the auth token from localStorage when the component loads
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setAuthToken(token);
  }, []);

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper function to add a new message to the chat history
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

  /**
   * Step 1: Handles the initial prompt submission.
   * Calls the "prepare" endpoint to find a server and get confirmation details.
   */
  const handlePrepareQuery = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input;
    addMessage("user", userPrompt);
    setInput("");
    setIsLoading(true);

    if (!authToken) {
      addMessage("system", "Error: You must be signed in to use the chat.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/chat/prepare", {
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

      // Display the confirmation message to the user
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
    }
  };

  /**
   * Step 2: Handles the user's confirmation.
   * Calls the final proxy/payment endpoint to execute the query.
   */
  const handleExecuteQuery = async (details: ConfirmationDetails) => {
    setIsLoading(true);
    // Visually remove the confirmation message
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute query.");
      }

      // Handle different types of responses (image, audio, json)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("image")) {
        const imageUrl = URL.createObjectURL(await response.blob());
        addMessage("server", imageUrl, "image");
      } else if (contentType?.includes("audio")) {
        const audioUrl = URL.createObjectURL(await response.blob());
        addMessage("server", audioUrl, "audio");
      } else {
        const result = await response.json();
        // Look for a known text field, otherwise stringify the whole object
        const responseText =
          result.responseText ||
          result.summary ||
          JSON.stringify(result, null, 2);
        addMessage("server", responseText);
      }
    } catch (error: any) {
      addMessage("system", `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelQuery = () => {
    setMessages((prev) => prev.filter((msg) => msg.content !== "confirmation"));
    addMessage("system", "Request cancelled.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 border rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-lg ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : msg.sender === "server"
                  ? "bg-white text-gray-800 shadow-sm border"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {msg.content === "confirmation" && msg.confirmationDetails ? (
                <div>
                  <p className="text-sm">{msg.text}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        handleExecuteQuery(msg.confirmationDetails!)
                      }
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={handleCancelQuery}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : msg.content === "image" ? (
                <img
                  src={msg.text}
                  alt="Generated content"
                  className="rounded-lg max-w-full"
                />
              ) : msg.content === "audio" ? (
                <audio controls src={msg.text} className="w-full" />
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4 bg-white">
        <form onSubmit={handlePrepareQuery} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask to generate an image or a joke..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
