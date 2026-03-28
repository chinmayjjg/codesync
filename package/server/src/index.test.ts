import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { createCodeSyncWebSocketServer } from "./index";

const TEST_SECRET = "codesync-websocket-test-secret";
const jwtSign = (jwt as unknown as {
  sign: (payload: object, secret: string, options: { expiresIn: string }) => string;
}).sign;

function createToken(userId: string) {
  return jwtSign({ id: userId }, TEST_SECRET, { expiresIn: "1h" });
}

function waitForWebSocketClose(socket: WebSocket) {
  return new Promise<{ code: number; reason: string }>((resolve) => {
    socket.once("close", (code, reason) => {
      resolve({
        code,
        reason: reason.toString(),
      });
    });
  });
}

function waitForProviderStatus(
  provider: WebsocketProvider,
  expectedStatus: "connected" | "disconnected"
) {
  return new Promise<void>((resolve) => {
    const handleStatus = (event: {
      status: "connected" | "disconnected" | "connecting";
    }) => {
      if (event.status !== expectedStatus) {
        return;
      }

      provider.off("status", handleStatus);
      resolve();
    };

    provider.on("status", handleStatus);
  });
}

function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 20
) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Timed out waiting for condition"));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

function createProvider(baseUrl: string, room: string, token: string, doc: Y.Doc) {
  return new WebsocketProvider(baseUrl, room, doc, {
    WebSocketPolyfill:
      WebSocket as unknown as typeof globalThis.WebSocket,
    params: {
      token,
    },
  });
}

describe("CodeSync websocket server", () => {
  let server: Awaited<ReturnType<typeof createCodeSyncWebSocketServer>>;
  let baseUrl: string;

  beforeEach(async () => {
    server = await createCodeSyncWebSocketServer({
      port: 0,
      nextAuthSecret: TEST_SECRET,
      logger: { log: () => undefined },
      heartbeatIntervalMs: 1000,
    });
    baseUrl = `ws://127.0.0.1:${server.port}`;
  });

  afterEach(async () => {
    await server.close();
  });

  it("rejects websocket connections without a JWT token", async () => {
    const socket = new WebSocket(`${baseUrl}/missing-token-room`);

    const result = await waitForWebSocketClose(socket);

    expect(result.code).toBe(1008);
    expect(result.reason).toContain("Authentication required");
  });

  it("rejects websocket connections with an invalid JWT token", async () => {
    const socket = new WebSocket(`${baseUrl}/invalid-token-room?token=bad-token`);

    const result = await waitForWebSocketClose(socket);

    expect(result.code).toBe(1008);
    expect(result.reason).toContain("Authentication failed");
  });

  it("allows multiple authenticated clients to join the same room and sync content", async () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const providerA = createProvider(baseUrl, "shared-file-room", createToken("user-a"), docA);
    const providerB = createProvider(baseUrl, "shared-file-room", createToken("user-b"), docB);

    await Promise.all([
      waitForProviderStatus(providerA, "connected"),
      waitForProviderStatus(providerB, "connected"),
    ]);

    const textA = docA.getText("monaco");
    const textB = docB.getText("monaco");

    textA.insert(0, "console.log('synced');");

    await waitForCondition(() => textB.toString() === "console.log('synced');");

    providerA.destroy();
    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it("syncs state correctly after a client disconnects and reconnects", async () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const providerA = createProvider(baseUrl, "reconnect-room", createToken("user-a"), docA);
    const providerB = createProvider(baseUrl, "reconnect-room", createToken("user-b"), docB);

    await Promise.all([
      waitForProviderStatus(providerA, "connected"),
      waitForProviderStatus(providerB, "connected"),
    ]);

    const textA = docA.getText("monaco");
    const textB = docB.getText("monaco");

    textA.insert(0, "hello");
    await waitForCondition(() => textB.toString() === "hello");

    providerA.destroy();
    docA.destroy();

    const reconnectDoc = new Y.Doc();
    const reconnectProvider = createProvider(
      baseUrl,
      "reconnect-room",
      createToken("user-a"),
      reconnectDoc
    );

    await waitForProviderStatus(reconnectProvider, "connected");

    const reconnectText = reconnectDoc.getText("monaco");
    await waitForCondition(() => reconnectText.toString() === "hello");

    reconnectText.insert(reconnectText.length, " world");
    await waitForCondition(() => textB.toString() === "hello world");

    reconnectProvider.destroy();
    providerB.destroy();
    reconnectDoc.destroy();
    docB.destroy();
  });
});
