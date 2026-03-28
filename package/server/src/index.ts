import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";
// @ts-expect-error - moduleResolution setting prevents loading these types
import { setupWSConnection } from "@y/websocket-server/utils";
import { serverConfig } from "./config";

const wss = new WebSocketServer({ port: serverConfig.PORT });

console.log(`WebSocket Server (Yjs) running on port ${serverConfig.PORT}`);

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
  // Parse the URL to extract the token from query parameters
  const parsedUrl = parse(req.url || "", true);
  const token = parsedUrl.query.token as string | undefined;

  if (!token) {
    console.log("Connection rejected: No token provided");
    ws.close(1008, "Authentication required: No token provided");
    return;
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, serverConfig.NEXTAUTH_SECRET) as {
      id?: string;
      userId?: string;
    };
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      console.log("Connection rejected: Invalid token payload");
      ws.close(1008, "Authentication failed: Invalid token payload");
      return;
    }

    // Store userId on the WebSocket for later use
    ws.userId = userId;
    ws.isAlive = true;

    console.log(`Client connected: ${req.socket.remoteAddress}, User: ${userId}`);

    // Setup ping/pong for connection health monitoring
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // y-websocket handles all Yjs document syncing, awareness, and persistence
    setupWSConnection(ws, req);

  } catch (error) {
    console.log("Connection rejected: Invalid token", error instanceof Error ? error.message : "Unknown error");
    ws.close(1008, "Authentication failed: Invalid or expired token");
  }

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Heartbeat to detect broken connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const authWs = ws as AuthenticatedWebSocket;
    if (authWs.isAlive === false) {
      return authWs.terminate();
    }
    authWs.isAlive = false;
    authWs.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

console.log("JWT Authentication enabled for WebSocket connections");
