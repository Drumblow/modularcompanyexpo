import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      console.log('Página de SignOut: Executando logout');
      
      try {
        // Limpar storage completamente
        await AsyncStorage.clear();
        console.log('Página de SignOut: AsyncStorage completamente limpo');
        
        if (Platform.OS === 'web') {
          console.log('Página de SignOut: Redirecionando na web');
          
          // Para web: forçar recarregamento completo da página
          window.location.replace(window.location.origin);
        } else {
          // Para nativo
          console.log('Página de SignOut: Redirecionando em app nativo');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Página de SignOut: Erro durante logout:', error);
        router.replace('/(auth)/login');
      }
    };
    
    performLogout();
  }, [router]);

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
    backgroundColor: '#F5F7FA',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#333',
  },
}); 