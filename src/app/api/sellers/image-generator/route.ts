// Create this file at: app/api/sellers/image-generator/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    // Pollinations.AI uses a simple URL structure to generate images.
    // We encode the prompt to ensure it's URL-safe.
    const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}`;
    console.log(`[Image Seller] Fetching image from: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        `Pollinations.AI API returned status ${imageResponse.status}`
      );
    }

    // Get the image data as a readable stream.
    const imageStream = imageResponse.body;

    if (!imageStream) {
      throw new Error("No image stream received from Pollinations.AI");
    }

    // Set the content type header so the browser knows it's an image
    const headers = new Headers();
    headers.set("Content-Type", "image/jpeg");

    // Stream the image directly back as the response
    return new NextResponse(imageStream, { status: 200, headers });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in image generation service:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate image.", details: errorMessage },
      { status: 500 }
    );
  }
}
