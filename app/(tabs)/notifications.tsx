import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationSystem from '../components/NotificationSystem';

export default function NotificationsScreen() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    console.log('[NotificationsScreen] Montando tela de notificações');
    return () => {
      console.log('[NotificationsScreen] Desmontando tela de notificações');
    };
  }, []);

  const handleUpdate = useCallback(() => {
    console.log('[NotificationsScreen] Função handleUpdate chamada, incrementando refreshKey');
    // Incrementar a chave para forçar re-renderização
    setRefreshKey(prev => prev + 1);
  }, []);

  console.log('[NotificationsScreen] Renderizando com refreshKey:', refreshKey);

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <View style={styles.content}>
        <NotificationSystem onUpdate={handleUpdate} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
}); 