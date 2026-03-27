import jwt from "jsonwebtoken";

/**
 * Creates a JWT token for WebSocket authentication.
 * Uses the same secret as NextAuth for consistency.
 */
export function createWebSocketToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "fallback-secret";
  return jwt.sign({ id: userId }, secret, { expiresIn: "24h" });
}

/**
 * Verifies a WebSocket token and returns the user ID if valid.
 */
export function verifyWebSocketToken(token: string): string | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "fallback-secret";
    const decoded = jwt.verify(token, secret) as { id?: string; userId?: string };
    return decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
}
