const DEFAULT_RETRY_MS = 1500;
const MAX_RETRY_MS = 8000;

function resolveSocketUrl() {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const normalized = base.startsWith('ws://') || base.startsWith('wss://') ? base : base.replace(/^http/, 'ws');
  return `${normalized}/ws/security`;
}

export function createSocketClient({ onOpen, onMessage, onClose, onError } = {}) {
  let socket = null;
  let reconnectTimer = null;
  let reconnectDelayMs = DEFAULT_RETRY_MS;
  let manuallyClosed = false;

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RETRY_MS);
      connect();
    }, reconnectDelayMs);
  };

  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    manuallyClosed = false;
    try {
      socket = new WebSocket(resolveSocketUrl());
      socket.onopen = () => {
        reconnectDelayMs = DEFAULT_RETRY_MS;
        onOpen?.();
      };
      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          onMessage?.(payload);
        } catch (error) {
          onError?.(error);
        }
      };
      socket.onerror = event => {
        onError?.(event);
      };
      socket.onclose = () => {
        onClose?.();
        if (!manuallyClosed) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      onError?.(error);
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    manuallyClosed = true;
    clearReconnect();
    if (socket) {
      socket.close();
      socket = null;
    }
  };

  return {
    connect,
    disconnect,
    isOpen: () => Boolean(socket && socket.readyState === WebSocket.OPEN),
    getSocket: () => socket
  };
}
