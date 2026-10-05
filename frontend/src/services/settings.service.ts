import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';

export interface UserSettings {
  wakeWord: string;
  voice: string;
  language: string;
  volume: number;
  rate: number;
  pitch: number;
  enableWakeWord: boolean;
  enableClapDetection: boolean;
}

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    const response = await apiClient.get<ApiResponse<UserSettings>>('/settings');
    return response.data.data!;
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await apiClient.patch<ApiResponse<UserSettings>>('/settings', settings);
    return response.data.data!;
  },
};
