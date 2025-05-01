import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('@ModularCompany:token');
        if (!token) {
          // Se não estiver autenticado, redirecionar para login
          router.replace('/(auth)/login');
        } else {
          // Se estiver autenticado, redirecionar para tabs
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.replace('/(auth)/login');
      }
    };
    
    checkAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="(tabs)" 
        options={{
          // Desabilitar o cache para forçar a reinicialização da tela quando navegado
          animation: 'fade'
        }}
      />
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen name="(dashboard)" />
    </Stack>
  );
}
