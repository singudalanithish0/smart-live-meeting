import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useMeetingSocket(user) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      return;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000";

    const instance = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socketRef.current = instance;
    setSocket(instance);

    instance.on("connect", () => {
      setConnected(true);
    });

    instance.on("disconnect", () => {
      setConnected(false);
    });

    instance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setConnected(false);
    });

    return () => {
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id, user?._id]);

  return { socket, connected };
}
