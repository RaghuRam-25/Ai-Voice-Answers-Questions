import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export const useSocket = (eventName?: string, callback?: (data: any) => void) => {
  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    if (eventName && callback) {
      socket.on(eventName, callback);
    }

    return () => {
      if (eventName && callback) {
        socket.off(eventName, callback);
      }
    };
  }, [eventName, callback]);

  const emit = (event: string, data: any) => {
    const socket = getSocket();
    socket.emit(event, data);
  };

  return { emit };
};