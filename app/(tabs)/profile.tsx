import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import ProfileScreen from '../components/ProfileScreen';

export default function Profile() {
  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <ProfileScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
}); 