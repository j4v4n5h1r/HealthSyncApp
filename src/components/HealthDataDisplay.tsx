import React from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { HealthDataResponse, PermissionStatus } from '../native/HealthModule';

type Props = {
  healthData: HealthDataResponse | null;
  isLoading: boolean;
  error: string | null;
  permissions: PermissionStatus;
  onRefresh: () => void;
  onRequestPermissions: () => void;
  onSync: () => void;
};

const HealthDataDisplay: React.FC<Props> = ({
  healthData,
  isLoading,
  error,
  permissions,
  onRefresh,
  onRequestPermissions,
  onSync,
}) => {
  const calculateTotal = (data: any[]) => 
    data.reduce((sum, item) => sum + (item.value || item.duration || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Data Sync</Text>
      
      {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!permissions.allGranted ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.text}>Required permissions not granted</Text>
          <Button 
            title="Request Health Permissions" 
            onPress={onRequestPermissions} 
            disabled={isLoading}
          />
        </View>
      ) : (
        <View style={styles.dataContainer}>
          {healthData ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Steps</Text>
                <Text>{calculateTotal(healthData.steps)} total</Text>
                <Text>Last: {healthData.steps[0]?.value} at {
                  new Date(healthData.steps[0]?.startDate).toLocaleTimeString()}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Heart Rate</Text>
                <Text>Avg: {
                  (healthData.heartRate.reduce((sum, item) => sum + item.value, 0) / 
                  (healthData.heartRate.length || 1)
                } bpm</Text>
                <Text>Last: {healthData.heartRate[0]?.value} bpm at {
                  new Date(healthData.heartRate[0]?.startDate).toLocaleTimeString()}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sleep</Text>
                <Text>{calculateTotal(healthData.sleep)} hours</Text>
                <Text>Last session: {
                  new Date(healthData.sleep[0]?.startDate).toLocaleTimeString()} - {
                  new Date(healthData.sleep[0]?.endDate).toLocaleTimeString()}
                </Text>
              </View>
            </>
          ) : (
            <Text>No health data available</Text>
          )}

          <View style={styles.buttonGroup}>
            <Button 
              title="Refresh Data" 
              onPress={onRefresh} 
              disabled={isLoading}
            />
            <Button 
              title="Sync to Server" 
              onPress={onSync} 
              disabled={isLoading}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: '#d32f2f',
  },
  permissionContainer: {
    marginTop: 20,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff3e0',
    borderRadius: 5,
  },
  dataContainer: {
    marginTop: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  text: {
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});

export default HealthDataDisplay;