import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

export default function DashboardLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@ModularCompany:token');
        if (!token) {
          // Se não estiver autenticado, redirecionar para login
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.replace('/(auth)/login');
      }
    };
    
    checkAuth();
  }, []);
  
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 