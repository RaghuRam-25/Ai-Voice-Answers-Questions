import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { Conversation } from '@/types/assistant';

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiClient.get<ApiResponse<Conversation[]>>('/conversations');
    return response.data.data!;
  },

  async getConversationById(id: string): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(`/conversations/${id}`);
    return response.data.data!;
  },
};
