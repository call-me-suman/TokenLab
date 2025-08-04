// Create this file at: app/api/sellers/text-summarizer/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.APYHUB_API_KEY;

  // Configuration check
  if (!apiKey) {
    console.error("APYHUB_API_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Summarization service is not configured correctly." },
      { status: 500 }
    );
  }

  try {
    const { prompt: textToSummarize } = await req.json();

    if (!textToSummarize) {
      return NextResponse.json(
        { error: "Text to summarize (prompt) is required." },
        { status: 400 }
      );
    }

    console.log("[Summarizer Seller] Calling ApyHub API...");

    const response = await fetch("https://api.apyhub.com/ai/summarize-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apy-token": apiKey,
      },
      body: JSON.stringify({ text: textToSummarize }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Forward the error message from the external API
      throw new Error(
        result.message || `ApyHub API returned status ${response.status}`
      );
    }

    // The ApyHub API nests the result in a `data` object
    return NextResponse.json({ responseText: result.data.summary });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in text summarization service:", errorMessage);
    return NextResponse.json(
      { error: "Failed to summarize text.", details: errorMessage },
      { status: 500 }
    );
  }
}
