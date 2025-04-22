import {NativeModules} from 'react-native';
import {HealthData, HealthPermissionStatus} from '../types/health';

const {HealthModule} = NativeModules;

export default {
  checkPermissions: async (): Promise<HealthPermissionStatus> => {
    return await HealthModule.checkPermissions();
  },
  requestPermissions: async (): Promise<HealthPermissionStatus> => {
    return await HealthModule.requestPermissions();
  },
  fetchHealthData: async (): Promise<HealthData> => {
    return await HealthModule.fetchHealthData();
  },
};