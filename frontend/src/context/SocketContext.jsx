// src/context/SocketContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  const fullApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const SOCKET_URL = fullApiUrl.replace("/api", "");

  // 1. Connection Logic
  useEffect(() => {
    const storedToken = localStorage.getItem("klubnikaToken");
    const isReallyAuthenticated = isAuthenticated || !!storedToken;

    if (isReallyAuthenticated && !socketRef.current) {
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        query: user?._id ? { userId: user._id } : {},
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket Connected:", newSocket.id);
      });

      newSocket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket Disconnected:", reason);
        if (reason === "io server disconnect") {
          newSocket.connect();
        }
      });

      newSocket.on("connect_error", (err) => {
        console.error("❌ Socket Connection Error:", err.message);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } else if (!isReallyAuthenticated && socketRef.current) {
      console.log("🔒 Auth & Token lost. Closing socket.");
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, [isAuthenticated, SOCKET_URL, user?._id]);

  // 2. Room Joining Logic (THE FIX IS HERE)
  useEffect(() => {
    const currentSocket = socketRef.current;

    // Check if both socket AND user exist
    if (currentSocket && user?._id) {
      const joinUserRoom = () => {
        console.log("👤 Joining user room:", user._id);
        currentSocket.emit("joinRoom", user._id);
      };

      // If already connected, join now
      if (currentSocket.connected) {
        joinUserRoom();
      }

      // Ensure we re-join if connection drops and comes back
      currentSocket.off("connect", joinUserRoom); // Remove old listener to prevent duplicates
      currentSocket.on("connect", joinUserRoom);

      return () => {
        currentSocket.off("connect", joinUserRoom);
      };
    }
  }, [user?._id, socket]); // <--- ADDED 'socket' HERE

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};