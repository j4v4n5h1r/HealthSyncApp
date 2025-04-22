import React, {useState, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import HealthDataDisplay from './components/HealthDataDisplay';
import HealthModule from './modules/HealthModule';
import {HealthData, HealthPermissionStatus} from './types/health';

const App = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [permissions, setPermissions] = useState<HealthPermissionStatus | null>(null);

  useEffect(() => {
    checkPermissions();
    fetchHealthData();
  }, []);

  const checkPermissions = async () => {
    try {
      const status = await HealthModule.checkPermissions();
      setPermissions(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const fetchHealthData = async () => {
    try {
      const data = await HealthModule.fetchHealthData();
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await HealthModule.requestPermissions();
      setPermissions(granted);
      if (granted.steps && granted.heartRate && granted.sleep) {
        fetchHealthData();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  return (
    <View style={styles.container}>
      <HealthDataDisplay
        healthData={healthData}
        onRefresh={fetchHealthData}
        onRequestPermissions={requestPermissions}
        permissions={permissions}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
});

export default App;