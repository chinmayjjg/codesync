import { createHmac, timingSafeEqual } from "node:crypto";
import { serverConfig } from "./config.js";

type WebSocketTokenPayload = {
  id?: string;
  userId?: string;
  exp?: number;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);

  return Buffer.from(padded, "base64").toString("utf8");
}

function signToken(unsignedToken: string, secret: string) {
  return createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function verifyWebSocketToken(token: string): string | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) {
      return null;
    }

    const unsignedToken = `${header}.${payload}`;
    const expectedSignature = signToken(unsignedToken, serverConfig.NEXTAUTH_SECRET);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as WebSocketTokenPayload;
    if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded.id || decoded.userId || null;
  } catch {
    return null;
  }
}