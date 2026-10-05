import { create } from 'zustand';
import { AssistantStatusType, Message } from '@/types/assistant';

export interface DebugState {
  microphone: 'CONNECTED' | 'FAILED' | 'PENDING';
  clapDetector: 'ACTIVE' | 'INACTIVE';
  firstClap: 'WAITING' | 'DETECTED';
  secondClap: 'WAITING' | 'DETECTED';
  doubleClap: 'IDLE' | 'ACTIVATED';
  assistantWindow: 'OPENED' | 'BACKGROUND' | 'FOREGROUNDED';
  tts: 'IDLE' | 'PLAYING' | 'COMPLETED';
  speechRecognition: 'INACTIVE' | 'ACTIVE' | 'LISTENING';
  aiRequest: 'IDLE' | 'SENT' | 'RECEIVED' | 'FAILED';
  conversation: 'IDLE' | 'ACTIVE';
  lastLog: string;
}

interface AssistantState {
  status: AssistantStatusType;
  messages: Message[];
  currentTranscript: string;
  debug: DebugState;
  showDebugPanel: boolean;
  setStatus: (status: AssistantStatusType) => void;
  setTranscript: (text: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  updateDebug: (partial: Partial<DebugState>) => void;
  toggleDebugPanel: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  status: 'idle',
  messages: [],
  currentTranscript: '',
  showDebugPanel: false,
  debug: {
    microphone: 'PENDING',
    clapDetector: 'INACTIVE',
    firstClap: 'WAITING',
    secondClap: 'WAITING',
    doubleClap: 'IDLE',
    assistantWindow: 'OPENED',
    tts: 'IDLE',
    speechRecognition: 'INACTIVE',
    aiRequest: 'IDLE',
    conversation: 'IDLE',
    lastLog: 'System initialized',
  },
  setStatus: (status) => set({ status }),
  setTranscript: (currentTranscript) => set({ currentTranscript }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      debug: { ...state.debug, conversation: 'ACTIVE' },
    })),
  clearMessages: () => set({ messages: [] }),
  updateDebug: (partial) =>
    set((state) => ({
      debug: { ...state.debug, ...partial },
    })),
  toggleDebugPanel: () => set((state) => ({ showDebugPanel: !state.showDebugPanel })),
}));
