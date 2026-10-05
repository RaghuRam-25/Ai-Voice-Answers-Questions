import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socketUrl) return socketUrl.replace(/\/+$/, '').replace(/\/api$/, '');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) return apiUrl.replace(/\/+$/, '').replace(/\/api$/, '');

  return 'http://localhost:5001';
};

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};