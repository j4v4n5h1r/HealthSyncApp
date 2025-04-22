export type HealthData = {
  steps: number;
  heartRate: number;
  sleepHours: number;
  lastUpdated: string;
};

export type HealthPermissionStatus = {
  steps: boolean;
  heartRate: boolean;
  sleep: boolean;
};