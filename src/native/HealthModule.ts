import { NativeModules, Platform } from 'react-native';

export interface HealthDataPoint {
  value: number;
  startDate: string;
  endDate: string;
  unit?: string;
}

export interface SleepDataPoint {
  startDate: string;
  endDate: string;
  duration: number; // in hours
  stage?: string; // iOS specific
}

export interface HealthDataResponse {
  steps: HealthDataPoint[];
  heartRate: HealthDataPoint[];
  sleep: SleepDataPoint[];
}

export interface PermissionStatus {
  steps: boolean;
  heartRate: boolean;
  sleep: boolean;
  allGranted: boolean;
}

interface HealthModuleInterface {
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  fetchHealthData(startDate: string, endDate: string): Promise<HealthDataResponse>;
  getTodaySteps(): Promise<number>;
}

const { HealthModule } = NativeModules;

// Platform-specific data transformation
const transformHealthData = (data: any): HealthDataResponse => {
  if (Platform.OS === 'android') {
    return {
      steps: data.steps?.map((item: any) => ({
        value: item.count,
        startDate: item.startTime,
        endDate: item.endTime,
        unit: 'count'
      })) || [],
      heartRate: data.heartRate?.map((item: any) => ({
        value: item.bpm,
        startDate: item.time,
        endDate: item.time,
        unit: 'bpm'
      })) || [],
      sleep: data.sleep?.map((item: any) => ({
        startDate: item.startTime,
        endDate: item.endTime,
        duration: (new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) / (1000 * 60 * 60),
        stage: item.stage
      })) || []
    };
  } else { // iOS
    return {
      steps: data.steps?.map((item: any) => ({
        value: item.value,
        startDate: item.startDate,
        endDate: item.endDate,
        unit: 'count'
      })) || [],
      heartRate: data.heartRate?.map((item: any) => ({
        value: item.value,
        startDate: item.startDate,
        endDate: item.endDate,
        unit: 'bpm'
      })) || [],
      sleep: data.sleep?.map((item: any) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        duration: item.duration,
        stage: item.stage
      })) || []
    };
  }
};

const HealthModuleWrapper: HealthModuleInterface = {
  checkPermissions: HealthModule.checkPermissions,
  requestPermissions: HealthModule.requestPermissions,
  fetchHealthData: async (startDate, endDate) => {
    const data = await HealthModule.fetchHealthData(startDate, endDate);
    return transformHealthData(data);
  },
  getTodaySteps: HealthModule.getTodaySteps
};

export default HealthModuleWrapper;