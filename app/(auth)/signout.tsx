import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useNavigation } from 'expo-router';

export default function SignOutScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const logoutUser = async () => {
      try {
        // Remove tokens de autenticação
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        
        // Lidar com logout diferentemente dependendo da plataforma
        if (Platform.OS === 'web') {
          // Para web, redefina completamente
          window.location.href = '/';
        } else {
          // Para aplicativos nativos, use o router
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        // Mesmo se houver erro, tente redirecionar
        if (Platform.OS === 'web') {
          window.location.href = '/';
        } else {
          router.replace('/(auth)/login');
        }
      }
    };

    logoutUser();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066CC" />
      <Text style={styles.text}>Saindo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
}); 