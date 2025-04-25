import { useState, useEffect, useCallback } from 'react';
import HealthModule, { 
  HealthDataResponse, 
  HealthDataPoint, 
  SleepDataPoint, 
  PermissionStatus 
} from '../native/HealthModule';

interface HealthDataState {
  stepsData: HealthDataPoint[];
  heartRateData: HealthDataPoint[];
  sleepData: SleepDataPoint[];
  totalSteps: number;
  avgHeartRate: number;
  totalSleepHours: number;
  isLoading: boolean;
  error: string | null;
  permissions: PermissionStatus;
}

const useHealthData = () => {
  const [state, setState] = useState<HealthDataState>({
    stepsData: [],
    heartRateData: [],
    sleepData: [],
    totalSteps: 0,
    avgHeartRate: 0,
    totalSleepHours: 0,
    isLoading: false,
    error: null,
    permissions: {
      steps: false,
      heartRate: false,
      sleep: false,
      allGranted: false,
    },
  });

  const checkPermissions = useCallback(async () => {
    try {
      const permissions = await HealthModule.checkPermissions();
      setState(prev => ({
        ...prev,
        permissions,
      }));
      return permissions;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to check permissions',
      }));
      throw error;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const permissions = await HealthModule.requestPermissions();
      setState(prev => ({
        ...prev,
        permissions,
        isLoading: false,
      }));
      return permissions;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request permissions',
      }));
      throw error;
    }
  }, []);

  const fetchHealthData = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const data = await HealthModule.fetchHealthData(
        startDate.toISOString(),
        endDate.toISOString()
      );

      const totalSteps = data.steps.reduce((sum, item) => sum + item.value, 0);
      const avgHeartRate = data.heartRate.length > 0 
        ? data.heartRate.reduce((sum, item) => sum + item.value, 0) / data.heartRate.length 
        : 0;
      const totalSleepHours = data.sleep.reduce((sum, item) => sum + item.duration, 0);

      setState(prev => ({
        ...prev,
        stepsData: data.steps,
        heartRateData: data.heartRate,
        sleepData: data.sleep,
        totalSteps,
        avgHeartRate,
        totalSleepHours,
        isLoading: false,
      }));

      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch health data',
      }));
      throw error;
    }
  }, []);

  const getTodaySteps = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const steps = await HealthModule.getTodaySteps();
      setState(prev => ({
        ...prev,
        totalSteps: steps,
        isLoading: false,
      }));
      return steps;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to get today steps',
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...state,
    checkPermissions,
    requestPermissions,
    fetchHealthData,
    getTodaySteps,
  };
};

export default useHealthData;