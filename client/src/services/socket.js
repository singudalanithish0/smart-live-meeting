import { io } from "socket.io-client";

export function createSocketConnection({ user, autoConnect = true } = {}) {
  if (!user || !autoConnect) {
    return null;
  }

  const socketUrl =
    import.meta.env.VITE_SOCKET_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    "http://localhost:5000";

  return io(socketUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"]
  });
}

export function attachSocketDebugHandlers(socket) {
  if (!socket) {
    return;
  }

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error?.message || error);
  });
}

export default createSocketConnection;
