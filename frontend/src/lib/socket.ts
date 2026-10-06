import { io, Socket } from 'socket.io-client';

export const getSocketUrl = (): string => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socketUrl) return socketUrl.replace(/\/+$/, '').replace(/\/api$/, '');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/+$/, '').replace(/\/api$/, '');

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('[SOCKET] WARNING: NEXT_PUBLIC_SOCKET_URL / NEXT_PUBLIC_API_URL is not configured for production!');
  }

  return 'http://localhost:5001';
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const targetUrl = getSocketUrl();
    console.log(`[SOCKET] Initializing socket connection to: ${targetUrl}`);
    socket = io(targetUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    socket.on('connect', () => {
      console.log(`[SOCKET] Connected successfully (id: ${socket?.id})`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[SOCKET] Connection error:`, err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected (${reason})`);
    });
  }
  return socket;
};