import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      
      // Se não houver token, redirecione para o login
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Verificar se o token ainda é válido
      try {
        await axios.get('https://modularcompany.vercel.app/api/mobile-profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Se chegar aqui, o token é válido, redirecione para o dashboard
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Token inválido ou expirado:', error);
        // Token inválido, limpar storage e redirecionar para login
        await AsyncStorage.removeItem('@ModularCompany:token');
        await AsyncStorage.removeItem('@ModularCompany:user');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    }
  };

  const forceLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
    }
  };

  // Mostrar tela de carregamento com botão de logout de emergência
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066CC" />
      <Text style={styles.loadingText}>Verificando autenticação...</Text>
      
      <TouchableOpacity style={styles.emergencyButton} onPress={forceLogout}>
        <Text style={styles.emergencyButtonText}>Forçar Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  emergencyButton: {
    marginTop: 30,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 