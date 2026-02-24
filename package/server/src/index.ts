import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

console.log("WebSocket Server running on port 8080");

wss.on("connection", (ws) => {
  console.log("Client  is connected");

  ws.on("message", (msg) => {
    console.log("Received:", msg.toString());
    ws.send("Echo: " + msg);
  });

  ws.on("close", () => {
    console.log("Client  is disconnected");
  });
});