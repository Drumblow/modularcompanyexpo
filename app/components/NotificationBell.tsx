import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definição da URL base da API
const API_URL = 'https://modularcompany.vercel.app/api';

interface NotificationBellProps {
  updateKey?: number;
  color?: string;
}

const NotificationBell = ({ updateKey, color }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar se o usuário está autenticado
  const checkAuthentication = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      const isAuth = !!token;
      setIsAuthenticated(isAuth);
      return isAuth;
    } catch (err) {
      console.log('Erro ao verificar autenticação (NotificationBell):', err);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  // Buscar contagem de notificações não lidas
  const fetchUnreadCount = useCallback(async () => {
    try {
      console.log('[NotificationBell] Iniciando busca de contagem de notificações');
      
      // Verificar autenticação primeiro
      const authenticated = await checkAuthentication();
      if (!authenticated) {
        console.log('[NotificationBell] Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      console.log('[NotificationBell] Fazendo requisição para obter contagem de notificações');
      
      // Atualizado: uso do endpoint correto para contagem de notificações
      // De acordo com a documentação, o endpoint correto está dentro da resposta de /mobile-notifications
      const response = await axios.get(`${API_URL}/mobile-notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          page: 1,
          limit: 10 // Aumentado para 10 para ter uma amostra maior para calcular contagem não lida
        }
      });

      console.log('[NotificationBell] Resposta recebida:', 
        JSON.stringify({
          status: response.status,
          hasData: !!response.data,
          unreadCount: response.data && response.data.unreadCount
        })
      );

      // Verificar se temos notificações na resposta
      if (response.data && Array.isArray(response.data.notifications)) {
        // Calcular manualmente notificações não lidas (read=false)
        const unreadNotifs = response.data.notifications.filter((notif: any) => notif && notif.read === false);
        const unreadCount = unreadNotifs.length;
        
        console.log(`[NotificationBell] Encontradas ${unreadCount} notificações não lidas de ${response.data.notifications.length} totais`);
        setUnreadCount(unreadCount);
      }
      // Se a API fornece unreadCount diretamente e parece ser apenas não lidas, use isso
      else if (response.data && typeof response.data.unreadCount === 'number') {
        // Mostrar o valor da API, mas com cautela (pode ser contagem total)
        console.log(`[NotificationBell] Usando unreadCount da API: ${response.data.unreadCount}`);
        setUnreadCount(response.data.unreadCount);
      } else {
        console.log('[NotificationBell] Formato de resposta inesperado:', JSON.stringify(response.data));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[NotificationBell] Erro ao buscar contagem de notificações:', err);
      
      if (axios.isAxiosError(err)) {
        const status = err.response?.status || 'desconhecido';
        const responseData = err.response?.data ? JSON.stringify(err.response.data) : 'sem dados';
        console.log(`[NotificationBell] Status do erro: ${status}, Dados: ${responseData}`);
      }
      
      // Em caso de erro, não mostramos o contador
      setUnreadCount(0);
    } finally {
      console.log('[NotificationBell] Finalizando busca de contagem (setIsLoading)');
      setIsLoading(false);
    }
  }, [checkAuthentication]);

  // Buscar contagem quando o componente é montado e quando updateKey muda
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount, updateKey]);

  // Navegar para a tela de notificações
  const navigateToNotifications = () => {
    router.push('/(tabs)/notifications');
  };

  if (!isAuthenticated || isLoading) {
    // Se não está autenticado ou ainda está carregando, mostrar ícone sem contador
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={navigateToNotifications}
        accessibilityLabel="Notificações"
      >
        <Ionicons name="notifications-outline" size={24} color={color || "#333"} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToNotifications}
      accessibilityLabel={`${unreadCount} notificações não lidas`}
    >
      <Ionicons name="notifications-outline" size={24} color={color || "#333"} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NotificationBell; 