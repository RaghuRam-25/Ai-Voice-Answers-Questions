export const constants = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  ASSISTANT_STATES: {
    IDLE: 'idle',
    LISTENING: 'listening',
    PROCESSING: 'processing',
    SPEAKING: 'speaking',
    ERROR: 'error',
  } as const,
};
