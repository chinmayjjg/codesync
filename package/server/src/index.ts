import "dotenv/config";

// Keep ts-node/CJS startup from tripping Yjs' dual-import global warning.
if (!("__ $YJS$ __" in globalThis)) {
  Object.defineProperty(globalThis, "__ $YJS$ __", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: false,
  });
}

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { AddressInfo } from "net";
import { parse } from "url";
import { verifyWebSocketToken } from "./jwt.js";
import { setupWSConnection } from "@y/websocket-server/utils";
import { serverConfig } from "./config.js";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

type Logger = Pick<Console, "log">;

type CodeSyncWebSocketServerOptions = {
  port: number;
  nextAuthSecret: string;
  logger?: Logger;
  heartbeatIntervalMs?: number;
};

export type CodeSyncWebSocketServer = {
  wss: WebSocketServer;
  port: number;
  close: () => Promise<void>;
};

function authenticateConnection(
  ws: AuthenticatedWebSocket,
  req: IncomingMessage,
  nextAuthSecret: string,
  logger: Logger
) {
  const parsedUrl = parse(req.url || "", true);
  const token = parsedUrl.query.token as string | undefined;

  if (!token) {
    logger.log("Connection rejected: No token provided");
    ws.close(1008, "Authentication required: No token provided");
    return false;
  }

  try {
    const userId = verifyWebSocketToken(token);

    if (!userId) {
      logger.log("Connection rejected: Invalid token payload");
      ws.close(1008, "Authentication failed: Invalid token payload");
      return false;
    }

    ws.userId = userId;
    ws.isAlive = true;

    logger.log(`Client connected: ${req.socket.remoteAddress}, User: ${userId}`);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    setupWSConnection(ws, req);
    return true;
  } catch (error) {
    logger.log(
      "Connection rejected: Invalid token",
      error instanceof Error ? error.message : "Unknown error"
    );
    ws.close(1008, "Authentication failed: Invalid or expired token");
    return false;
  }
}

export async function createCodeSyncWebSocketServer({
  port,
  nextAuthSecret,
  logger = console,
  heartbeatIntervalMs = 30000,
}: CodeSyncWebSocketServerOptions): Promise<CodeSyncWebSocketServer> {
  const wss = new WebSocketServer({ port });

  await new Promise<void>((resolve) => {
    if (wss.address()) {
      resolve();
      return;
    }

    wss.once("listening", () => resolve());
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const authWs = client as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        authWs.terminate();
        return;
      }

      authWs.isAlive = false;
      authWs.ping();
    });
  }, heartbeatIntervalMs);

  wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    authenticateConnection(ws, req, nextAuthSecret, logger);

    ws.on("close", () => {
      logger.log("Client disconnected");
    });
  });

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  const resolvedAddress = wss.address();
  const resolvedPort =
    typeof resolvedAddress === "object" && resolvedAddress
      ? (resolvedAddress as AddressInfo).port
      : port;

  logger.log(`WebSocket Server (Yjs) running on port ${resolvedPort}`);
  logger.log("JWT Authentication enabled for WebSocket connections");

  return {
    wss,
    port: resolvedPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        clearInterval(heartbeatInterval);
        wss.clients.forEach((client) => client.terminate());
        wss.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

if (!process.env.VITEST) {
  void createCodeSyncWebSocketServer({
    port: serverConfig.PORT,
    nextAuthSecret: serverConfig.NEXTAUTH_SECRET,
  });
}
