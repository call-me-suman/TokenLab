// Create this file at: app/api/sellers/text-to-speech/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY;

  // Configuration check
  if (!apiKey) {
    console.error("GOOGLE_API_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Text-to-speech service is not configured correctly." },
      { status: 500 }
    );
  }

  try {
    const { prompt: textToSpeak } = await req.json();

    if (!textToSpeak) {
      return NextResponse.json(
        { error: "Text to speak (prompt) is required." },
        { status: 400 }
      );
    }

    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    console.log("[TTS Seller] Calling Google Cloud TTS API...");

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text: textToSpeak },
        voice: { languageCode: "en-US", name: "en-US-Wavenet-D" }, // A standard, high-quality voice
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage =
        result.error?.message ||
        `Google TTS API returned status ${response.status}`;
      throw new Error(errorMessage);
    }

    // The API returns the audio content as a base64 encoded string.
    const audioContent = result.audioContent;
    // We need to convert it back into a binary buffer to send it to the client.
    const audioBuffer = Buffer.from(audioContent, "base64");

    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");

    return new NextResponse(audioBuffer, { status: 200, headers });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in text-to-speech service:", errorMessage);
    return NextResponse.json(
      { error: "Failed to synthesize speech.", details: errorMessage },
      { status: 500 }
    );
  }
}
