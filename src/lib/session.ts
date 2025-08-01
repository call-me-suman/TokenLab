// lib/session.ts

import type { SessionOptions } from "iron-session";

export interface SessionData {
  nonce?: string; // Store nonce for SIWE login
  address?: string; // Store the wallet address after verification
}

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD!,
  cookieName: "mcp_siwe_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};
