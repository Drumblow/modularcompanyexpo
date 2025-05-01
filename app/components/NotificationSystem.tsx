import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Definição da URL base da API
const API_URL = 'https://modularcompany.vercel.app/api';

// Definição do tipo de notificação
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

interface NotificationSystemProps {
  onUpdate?: () => void;
}

const NotificationSystem = ({ onUpdate }: NotificationSystemProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Verificar se o usuário está autenticado
  const checkAuthentication = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      const isAuth = !!token;
      setIsAuthenticated(isAuth);
      return isAuth;
    } catch (err) {
      console.log('Erro ao verificar autenticação (NotificationSystem):', err);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  // Função para buscar notificações
  const fetchNotifications = useCallback(async (pageNumber = 1, refresh = false) => {
    try {
      console.log(`[NotificationSystem] Iniciando busca de notificações. Página: ${pageNumber}, Refresh: ${refresh}`);
      
      // Verificar autenticação primeiro
      const authenticated = await checkAuthentication();
      if (!authenticated) {
        console.log('[NotificationSystem] Usuário não autenticado');
        setLoading(false);
        setError('Usuário não autenticado');
        return;
      }

      // Buscar notificações apenas se estiver autenticado
      setError(null);
      if (pageNumber === 1 && !refresh) setLoading(true);
      if (refresh) setRefreshing(true);
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      console.log(`[NotificationSystem] Fazendo requisição para: ${API_URL}/mobile-notifications`);
      
      try {
        const response = await axios.get(`${API_URL}/mobile-notifications`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            page: pageNumber,
            limit: 10
          }
        });

        console.log('[NotificationSystem] Resposta recebida:', 
          JSON.stringify({
            status: response.status,
            headers: response.headers,
            hasData: !!response.data,
            hasNotifications: response.data && Array.isArray(response.data.notifications),
            unreadCount: response.data && response.data.unreadCount
          })
        );

        // Verificar se a resposta contém notificações
        if (!response.data) {
          console.log('[NotificationSystem] Resposta sem dados');
          setNotifications([]);
          setLocalUnreadCount(0);
          setHasMore(false);
          return;
        }

        // Estamos recebendo o formato correto da API?
        if (!Array.isArray(response.data.notifications)) {
          console.log('[NotificationSystem] Formato de resposta inesperado:', JSON.stringify(response.data));
          
          // Vamos tentar adaptar a resposta se possível (talvez a API mudou o formato)
          let notificationsList = [];
          
          // Se a resposta for um array, talvez as notificações estejam no nível raiz
          if (Array.isArray(response.data)) {
            notificationsList = response.data;
            console.log('[NotificationSystem] Usando array no nível raiz como notificações');
          } 
          // Se a resposta tiver uma propriedade chamada 'data' ou 'items', tente usar isso
          else if (Array.isArray(response.data.data)) {
            notificationsList = response.data.data;
            console.log('[NotificationSystem] Usando response.data.data como notificações');
          } else if (Array.isArray(response.data.items)) {
            notificationsList = response.data.items;
            console.log('[NotificationSystem] Usando response.data.items como notificações');
          } else {
            // Como último recurso, vamos verificar se há alguma propriedade que contenha um array
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                notificationsList = response.data[key];
                console.log(`[NotificationSystem] Usando response.data.${key} como notificações`);
                break;
              }
            }
          }
          
          // Atualizar estado com o que encontramos
          if (pageNumber === 1) {
            setNotifications(notificationsList);
          } else {
            setNotifications(prev => [...prev, ...notificationsList]);
          }
          
          // Calcular manualmente o unreadCount
          const unreadNotifs = notificationsList.filter((notif: any) => notif && notif.read === false).length;
          setLocalUnreadCount(unreadNotifs);
          setHasMore(notificationsList.length === 10);
          return;
        }

        const newNotifications = response.data.notifications || [];
        console.log(`[NotificationSystem] Recebidas ${newNotifications.length} notificações`);
        
        // Calcular manualmente notificações não lidas (read=false)
        const unreadNotifs = newNotifications.filter((notif: Notification) => !notif.read).length;
        console.log(`[NotificationSystem] Encontradas ${unreadNotifs} notificações não lidas de ${newNotifications.length} totais`);
        
        // Definir contagem de não lidas no estado local
        setLocalUnreadCount(unreadNotifs);
        
        // A API também pode fornecer esse valor diretamente
        if (response.data && typeof response.data.unreadCount === 'number') {
          console.log(`[NotificationSystem] unreadCount da API: ${response.data.unreadCount} (usando contagem calculada: ${unreadNotifs})`);
          // Usar o valor calculado localmente em vez do valor da API para garantir consistência
          setUnreadCount(unreadNotifs);
        } else {
          // Usar a contagem calculada localmente se a API não fornecer
          console.log(`[NotificationSystem] unreadCount calculado localmente: ${unreadNotifs}`);
          setUnreadCount(unreadNotifs);
        }
        
        if (pageNumber === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(newNotifications.length === 10);
      } catch (apiError) {
        console.error(`[NotificationSystem] Erro na chamada à API: ${apiError}`);
        if (axios.isAxiosError(apiError)) {
          const status = apiError.response?.status || 'desconhecido';
          const responseData = apiError.response?.data ? JSON.stringify(apiError.response.data) : 'sem dados';
          console.log(`[NotificationSystem] Status do erro: ${status}, Dados: ${responseData}`);
          throw new Error(`Falha ao buscar notificações (status ${status}): ${responseData}`);
        }
        throw apiError;
      }
      
      // Se temos uma função de atualização, chamar ela para atualizar o contador no sino
      if (onUpdate && refresh) {
        console.log('[NotificationSystem] Chamando onUpdate (apenas em refresh manual)');
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao buscar notificações');
      }
      // Em caso de erro, limpar estados para evitar loading infinito
      setNotifications([]);
      setHasMore(false);
    } finally {
      console.log('[NotificationSystem] Finalizando busca de notificações (setLoading e setRefreshing)');
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkAuthentication, onUpdate]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Verificar autenticação primeiro
      const authenticated = await checkAuthentication();
      if (!authenticated) {
        setError('Usuário não autenticado');
        return;
      }

      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      await axios.put(`${API_URL}/mobile-notifications`, {
        id: notificationId,
        read: true
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      
      // Decrementar contador de não lidas
      setLocalUnreadCount(prev => Math.max(0, prev - 1));
      
      // Se temos uma função de atualização, chamar ela para atualizar o contador no sino
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  }, [checkAuthentication, onUpdate]);

  // Função para marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    try {
      // Verificar autenticação
      const isAuth = await checkAuthentication();
      if (!isAuth) {
        return;
      }
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');

      // Atualizar UI imediatamente
      const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
      
      setNotifications(updatedNotifications);
      setLocalUnreadCount(0);
      
      // Atualizar no servidor
      await axios.put(`${API_URL}/mobile-notifications`, 
        { all: true },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err);
      // Reverter mudanças em caso de erro
      fetchNotifications();
    }
  };

  // Função para excluir uma notificação
  const deleteNotification = async (id: string) => {
    try {
      // Verificar autenticação
      const isAuth = await checkAuthentication();
      if (!isAuth) {
        return;
      }
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');

      // Atualizar UI imediatamente
      const notificationToDelete = notifications.find(n => n.id === id);
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      
      // Atualizar contagem local de não lidas
      const decrementCount = notificationToDelete && !notificationToDelete.read ? 1 : 0;
      const newUnreadCount = localUnreadCount - decrementCount;
      
      setNotifications(updatedNotifications);
      if (decrementCount > 0) {
        setLocalUnreadCount(newUnreadCount);
      }
      
      // Excluir no servidor
      await axios.delete(`${API_URL}/mobile-notifications?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
      // Reverter mudanças em caso de erro
      fetchNotifications();
    }
  };

  // Função para navegar para a página relacionada à notificação
  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Verificar autenticação
      const isAuth = await checkAuthentication();
      if (!isAuth) {
        router.push('/(auth)/login');
        return;
      }
      
      // Marcar como lida ao clicar
      if (!notification.read) {
        await markAsRead(notification.id);
      }
      
      // Se não tiver ID relacionado, não tem para onde navegar
      if (!notification.relatedId || !notification.relatedType) {
        return;
      }
      
      // Obter o papel do usuário para determinar a rota correta
      const userData = await AsyncStorage.getItem('@ModularCompany:user');
      if (!userData) {
        throw new Error('Dados do usuário não encontrados');
      }
      
      const user = JSON.parse(userData);
      const role = user.role.toLowerCase() as 'developer' | 'admin' | 'manager' | 'employee';
      
      // Definir a rota com base no tipo de notificação e papel do usuário
      if (notification.relatedType === 'timeEntry') {
        // Definir destino como a tela de time entries (ajustado para o formato correto de rota)
        router.push('/(tabs)/time-entries' as const);
      } else if (notification.relatedType === 'payment') {
        // Redirecionar para a tela de time entries por enquanto (podemos criar uma tela de pagamentos no futuro)
        router.push('/(tabs)/time-entries' as const);
      }
    } catch (err) {
      console.error('Erro ao processar notificação:', err);
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch (err) {
      return dateString;
    }
  };

  // Buscar notificações quando o componente é montado
  useEffect(() => {
    checkAuthentication().then(isAuth => {
      if (isAuth) {
        fetchNotifications();
      } else {
        setLoading(false);
        setError('Usuário não autenticado');
      }
    });
  }, [fetchNotifications, checkAuthentication]);

  // Função para carregar mais notificações
  const loadMore = () => {
    if (!loading && hasMore && isAuthenticated) {
      fetchNotifications(page + 1);
      setPage(prev => prev + 1);
    }
  };

  // Função para recarregar as notificações
  const handleRefresh = () => {
    if (isAuthenticated) {
      setPage(1);
      fetchNotifications(1, true);
    }
  };

  // Renderização de cada item da lista de notificações
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    // Definir ícone e cor com base no tipo de notificação
    let icon: React.ComponentProps<typeof Ionicons>['name'] = 'notifications-outline';
    let iconColor = '#2196F3';
    
    if (item.type === 'success') {
      icon = 'checkmark-circle-outline';
      iconColor = '#4CAF50';
    } else if (item.type === 'warning') {
      icon = 'alert-circle-outline';
      iconColor = '#FF9800';
    } else if (item.type === 'error') {
      icon = 'close-circle-outline';
      iconColor = '#F44336';
    }
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, item.read ? styles.readNotification : styles.unreadNotification]} 
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIconContainer}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => deleteNotification(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando notificações...</Text>
      </View>
    );
  }

  if (error && error !== 'Usuário não autenticado') {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchNotifications(1)}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="lock-closed-outline" size={50} color="#0066CC" />
        <Text style={styles.errorText}>Faça login para ver suas notificações</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllButtonText}>Marcar todas como lidas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>
      </View>
      
      {notifications.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={50} color="#888" />
          <Text style={styles.emptyText}>Você não tem notificações</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          onEndReached={loadMore}
          onEndReachedThreshold={0.1}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loading && hasMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#0066CC" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  markAllButton: {
    marginRight: 16
  },
  markAllButtonText: {
    color: '#0066CC',
    fontWeight: '500'
  },
  refreshButton: {
    padding: 4
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 50 : 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  readNotification: {
    opacity: 0.8
  },
  notificationIconContainer: {
    marginRight: 16,
    alignSelf: 'flex-start'
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333'
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  notificationTime: {
    fontSize: 12,
    color: '#999'
  },
  deleteButton: {
    padding: 4,
    alignSelf: 'flex-start'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  }
});

export default NotificationSystem; 