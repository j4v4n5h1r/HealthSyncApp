import { useCallback } from 'react';
import { syncStepsToServer } from '../api/healthApi';
import HealthModule from '../native/HealthModule';

export const useHealthSync = (userId: string, authToken: string) => {
  const syncAllHealthData = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      // 1. Fetch health data from device
      const healthData = await HealthModule.fetchHealthData(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // 2. Sync steps to server
      await syncStepsToServer(userId, healthData.steps, authToken);

      return healthData;
    } catch (error) {
      console.error('Health sync failed:', error);
      throw error;
    }
  }, [userId, authToken]);

  return { syncAllHealthData };
};