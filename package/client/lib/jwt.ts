import jwt from "jsonwebtoken";
import { serverEnv } from "./env.server";

/**
 * Creates a JWT token for WebSocket authentication.
 * Uses the same secret as NextAuth for consistency.
 */
export function createWebSocketToken(userId: string): string {
  return jwt.sign({ id: userId }, serverEnv.NEXTAUTH_SECRET, {
    expiresIn: "24h",
  });
}

/**
 * Verifies a WebSocket token and returns the user ID if valid.
 */
export function verifyWebSocketToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, serverEnv.NEXTAUTH_SECRET) as {
      id?: string;
      userId?: string;
    };
    return decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
}
