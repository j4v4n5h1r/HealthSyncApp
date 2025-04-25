import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import HealthDataDisplay from './components/HealthDataDisplay';
import { useHealthData } from './hooks/useHealthData';
import { useHealthSync } from './hooks/useHealthSync';

const App = () => {
  const [userId] = useState('user-123'); // In a real app, get from auth context
  const [authToken] = useState('auth-token-xyz'); // In a real app, get from auth context
  
  const {
    stepsData,
    heartRateData,
    sleepData,
    totalSteps,
    avgHeartRate,
    totalSleepHours,
    isLoading,
    error,
    permissions,
    checkPermissions,
    requestPermissions,
    fetchHealthData,
  } = useHealthData();

  const { syncAllHealthData } = useHealthSync(userId, authToken);

  useEffect(() => {
    const loadInitialData = async () => {
      await checkPermissions();
      if (permissions.allGranted) {
        await fetchHealthData(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          new Date()
        );
      }
    };
    
    loadInitialData();
  }, []);

  const handleRefresh = async () => {
    await fetchHealthData(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    );
  };

  const handleSync = async () => {
    await syncAllHealthData(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    );
  };

  return (
    <View style={styles.container}>
      <HealthDataDisplay
        healthData={{
          steps: stepsData,
          heartRate: heartRateData,
          sleep: sleepData,
        }}
        isLoading={isLoading}
        error={error}
        permissions={permissions}
        onRefresh={handleRefresh}
        onRequestPermissions={requestPermissions}
        onSync={handleSync}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
});

export default App;