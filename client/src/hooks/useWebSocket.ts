import { useState, useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { WebSocketManager } from "@/lib/websocket";

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    if (user) {
      wsManagerRef.current = new WebSocketManager(user.id);
      
      const unsubscribeConnection = wsManagerRef.current.on('connection', (data) => {
        setIsConnected(data.connected);
      });

      const unsubscribeMessage = wsManagerRef.current.on('message', (data) => {
        setLastMessage(data);
      });

      wsManagerRef.current.connect();

      return () => {
        unsubscribeConnection();
        unsubscribeMessage();
        wsManagerRef.current?.disconnect();
      };
    }
  }, [user]);

  const sendMessage = (type: string, data: any) => {
    wsManagerRef.current?.send(type, data);
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}
