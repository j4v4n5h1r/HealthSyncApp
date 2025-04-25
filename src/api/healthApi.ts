import { HealthDataPoint } from '../native/HealthModule';

const API_BASE_URL = process.env.API_BASE_URL || 'http://your-server-address/api';

interface ApiResponse {
  success: boolean;
  error?: string;
}

export const syncStepsToServer = async (
  userId: string,
  steps: HealthDataPoint[],
  authToken: string
): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/activity-steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ userId, steps }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync steps');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const fetchHistoricalSteps = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  authToken: string
): Promise<HealthDataPoint[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/activity-steps?` + new URLSearchParams({
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item: any) => ({
      value: item.value,
      startDate: item.created_at,
      endDate: item.created_at,
      unit: 'count'
    }));
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};