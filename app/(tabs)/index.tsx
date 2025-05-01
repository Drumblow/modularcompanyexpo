import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { fetchPayments, Payment } from '../services/paymentService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
  hourlyRate?: number;
  company?: {
    id: string;
    name: string;
    plan: string;
  };
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const loadPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const response = await fetchPayments();
      // Pegar apenas os 3 pagamentos mais recentes
      setRecentPayments(response.payments.slice(0, 3));
    } catch (error) {
      console.error('Erro ao carregar pagamentos recentes:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userString = await AsyncStorage.getItem('@ModularCompany:user');
        if (userString) {
          const userData = JSON.parse(userString);
          setUser(userData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      loadPayments();
    }
  }, [loading, user, loadPayments]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const renderRoleSpecificCards = () => {
    if (!user?.role) return null;

    switch (user.role) {
      case 'DEVELOPER':
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="business-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Gerenciar Empresas</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Cadastre e gerencie empresas no sistema
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="settings-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Configurações do Sistema</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Configure módulos e permissões
              </Text>
            </TouchableOpacity>
          </>
        );

      case 'ADMIN':
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="people-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Gerenciar Usuários</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Gerencie funcionários e gerentes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="bar-chart-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Relatórios</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Visualize e exporte relatórios completos
              </Text>
            </TouchableOpacity>
          </>
        );

      case 'MANAGER':
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Aprovar Registros</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Verifique e aprove registros de horas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="bar-chart-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Relatórios</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Visualize desempenho e custos
              </Text>
            </TouchableOpacity>
          </>
        );

      default: // EMPLOYEE
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
              onPress={() => router.push('/(tabs)/time-entries')}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Novo Registro</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Registre suas horas trabalhadas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="calendar-outline" size={28} color={colors.tint} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Meus Registros</Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]}>
                Visualize seus registros de horas
              </Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  // Renderizar pagamentos recentes
  const renderRecentPayments = () => {
    if (loadingPayments) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Carregando pagamentos...</Text>
        </View>
      );
    }

    if (recentPayments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Nenhum pagamento encontrado
          </Text>
        </View>
      );
    }

    return recentPayments.map((payment) => (
      <TouchableOpacity 
        key={payment.id}
        style={[styles.paymentCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : 'white' }]}
        onPress={() => router.push({
          pathname: "/payment-details",
          params: { id: payment.id }
        })}
      >
        <View style={styles.paymentHeader}>
          <Text style={[styles.paymentDate, { color: colors.icon }]}>
            {format(parseISO(payment.date), 'dd/MM/yyyy', { locale: ptBR })}
          </Text>
          <View style={styles.paymentStatus}>
            {payment.status === 'completed' ? (
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            ) : (
              <Ionicons name="time" size={16} color="#f59e0b" />
            )}
            <Text style={[styles.paymentStatusText, { color: colors.icon }]}>
              {payment.status === 'completed' ? 'Concluído' : 'Pendente'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.paymentAmount, { color: colors.text }]}>
          R$ {payment.amount.toFixed(2).replace('.', ',')}
        </Text>
        
        <Text 
          style={[styles.paymentDescription, { color: colors.icon }]}
          numberOfLines={2}
        >
          {payment.description || 'Sem descrição'}
        </Text>
      </TouchableOpacity>
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}
          </Text>
          <Text style={[styles.date, { color: colors.icon }]}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Acesso Rápido
          </Text>
          <View style={styles.cardContainer}>
            {renderRoleSpecificCards()}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pagamentos Recentes
            </Text>
          </View>
          {renderRecentPayments()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  card: {
    width: '48%',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardIconContainer: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
  },
  paymentCard: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 13,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 13,
    marginLeft: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  paymentDescription: {
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
