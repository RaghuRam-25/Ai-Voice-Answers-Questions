import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { AssistantSystemStatus, AssistantTurnResponse } from '@/types/assistant';

export const assistantService = {
  async sendMessage(message: string, language: 'en' | 'bn' = 'en'): Promise<AssistantTurnResponse> {
    const response = await apiClient.post<ApiResponse<AssistantTurnResponse>>('/assistant/message', {
      message,
      language,
    });

    if (!response.data.success || !response.data.data) {
      const errMsg = response.data.error || 'Assistant did not return a response.';
      throw new Error(errMsg);
    }

    return response.data.data;
  },

  async getStatus(): Promise<AssistantSystemStatus> {
    const response = await apiClient.get<ApiResponse<AssistantSystemStatus>>('/assistant/status');
    if (!response.data.success || !response.data.data) {
      const errMsg = response.data.error || 'Assistant status is unavailable.';
      throw new Error(errMsg);
    }
    return response.data.data;
  },
};
