import React, { useState, useCallback, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import NotificationBell from '../components/NotificationBell';

// Define os papéis de usuário possíveis
type UserRole = 'ADMIN' | 'DEVELOPER' | 'MANAGER' | 'EMPLOYEE' | string;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [notificationUpdateKey, setNotificationUpdateKey] = useState(0);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar o papel do usuário
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const userString = await AsyncStorage.getItem('@ModularCompany:user');
        if (userString) {
          const userData = JSON.parse(userString);
          console.log('[TabLayout] Papel do usuário carregado:', userData.role);
          setUserRole(userData.role);
        } else {
          console.log('[TabLayout] Nenhum dado de usuário encontrado no AsyncStorage');
        }
      } catch (error) {
        console.error('[TabLayout] Erro ao obter o papel do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const handleNotificationUpdate = useCallback(() => {
    setNotificationUpdateKey(prev => prev + 1);
  }, []);

  // Se ainda estiver carregando, retorne null ou um loader
  if (loading) {
    return null;
  }

  // Função de utilidade para verificar o papel do usuário com segurança
  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    return userRole.toUpperCase() === role.toUpperCase();
  };
  
  // Verificar se é desenvolvedor de forma segura
  const isDeveloper = hasRole('DEVELOPER');
  
  console.log('[TabLayout] userRole:', userRole, 'isDeveloper:', isDeveloper);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerRight: () => (
          <NotificationBell 
            key={notificationUpdateKey}
            color={Colors[colorScheme ?? 'light'].text} 
          />
        ),
        headerRightContainerStyle: { paddingRight: 16 }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="time-entries"
        options={{
          title: 'Horas',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments/index"
        options={{
          title: 'Pagamentos',
          tabBarIcon: ({ color }) => <Ionicons name="cash" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificações',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
          // Não mostrar NotificationBell na própria tela de notificações
          headerRight: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Empresas',
          tabBarIcon: ({ color }) => <Ionicons name="business" size={24} color={color} />,
          // Ocultar completamente para usuários não-desenvolvedores
          href: isDeveloper ? undefined : null, // impede navegação para não-desenvolvedores
          tabBarStyle: isDeveloper ? undefined : { display: 'none' }, // oculta o tab completamente
          tabBarItemStyle: isDeveloper ? undefined : { width: 0, height: 0 }, // oculta o espaço
        }}
      />
    </Tabs>
  );
}
