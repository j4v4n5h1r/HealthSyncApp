import React from 'react';
import {View, Text, StyleSheet, Button} from 'react-native';
import {HealthData} from '../types/health';

type Props = {
  healthData: HealthData | null;
  onRefresh: () => void;
  onRequestPermissions: () => void;
  permissions: HealthPermissionStatus | null;
};

const HealthDataDisplay: React.FC<Props> = ({
  healthData,
  onRefresh,
  onRequestPermissions,
  permissions,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Data Sync</Text>
      
      {!permissions ? (
        <Text>Checking permissions...</Text>
      ) : (
        <>
          {(!permissions.steps || !permissions.heartRate || !permissions.sleep) && (
            <View style={styles.permissionWarning}>
              <Text>Some permissions are not granted</Text>
              <Button title="Request Permissions" onPress={onRequestPermissions} />
            </View>
          )}
          
          {healthData ? (
            <View style={styles.dataContainer}>
              <Text>Steps: {healthData.steps}</Text>
              <Text>Heart Rate: {healthData.heartRate} bpm</Text>
              <Text>Sleep: {healthData.sleepHours} hours</Text>
              <Text>Last Updated: {healthData.lastUpdated}</Text>
              <Button title="Refresh Data" onPress={onRefresh} />
            </View>
          ) : (
            <Text>No health data available</Text>
          )}
        </>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dataContainer: {
    marginTop: 20,
    gap: 10,
  },
  permissionWarning: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
});

export default HealthDataDisplay;