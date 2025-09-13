// Global WebSocket broadcast functions
declare global {
  var broadcastToUser: (userId: string, event: { type: string; data: any }) => void;
  var broadcastToAll: (event: { type: string; data: any }) => void;
  var broadcastUserStatus: (userId: string) => Promise<void>;
}

export {};