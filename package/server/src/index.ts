import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { setupWSConnection } from "y-websocket/bin/utils";

const PORT = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket Server (Yjs) running on port ${PORT}`);

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  console.log("Client connected:", req.socket.remoteAddress);

  // y-websocket handles all Yjs document syncing, awareness, and persistence
  setupWSConnection(ws, req);

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});