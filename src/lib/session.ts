// lib/session.ts

import type { SessionOptions } from "iron-session";
import { SiweMessage } from "siwe";

export interface SessionData {
  nonce?: string;
  siwe?: SiweMessage;
  userId?: string; // This will hold the user's ID from your MongoDB database
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD!,
  cookieName: "mcp_siwe_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};
