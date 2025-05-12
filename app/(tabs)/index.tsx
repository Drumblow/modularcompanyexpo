import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { fetchPayments, fetchCompanyPayments, Payment, PaymentsResponse } from '../../services/paymentService';
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  UserProfileResponse, 
  fetchAdminDashboardSummary, 
  fetchCompanyTimeEntryStats, 
  AdminDashboardSummaryResponse, 
  TimeEntriesSummaryResponse,
  ManagerDashboardSummaryResponse,
  fetchManagerDashboardSummary
} from '../../services/adminService';

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

interface TimeStats {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Admin Specific State ---
  const [adminSummary, setAdminSummary] = useState<AdminDashboardSummaryResponse['dashboard'] | null>(null);
  const [companyTimeStats, setCompanyTimeStats] = useState<TimeStats | null>(null);
  const [managerSummary, setManagerSummary] = useState<ManagerDashboardSummaryResponse | null>(null);

  // --- New State for Company Payments (Admin only) ---
  const [companyPayments, setCompanyPayments] = useState<Payment[]>([]);
  const [loadingCompanyPayments, setLoadingCompanyPayments] = useState(false);

  // New state for the sum of paid amounts in the last 30 days
  const [totalPaidLast30Days, setTotalPaidLast30Days] = useState<number>(0);
  const [loadingPaidLast30Days, setLoadingPaidLast30Days] = useState(false);

  const isAdmin = useMemo(() => userRole === 'ADMIN', [userRole]);
  const isManager = useMemo(() => userRole === 'MANAGER', [userRole]);

  const loadUserPayments = useCallback(async () => {
    try {
      setLoadingPayments(true);
      const response = await fetchPayments();
      setRecentPayments(response.payments.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar pagamentos do usuário:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAdminSummary(null);
    setCompanyTimeStats(null);
    setManagerSummary(null);
    setCompanyPayments([]);
    setTotalPaidLast30Days(0);
    setRecentPayments([]);

    try {
      const userString = await AsyncStorage.getItem('@ModularCompany:user');
      if (!userString) {
        throw new Error('User data not found. Please login again.');
      }
      const userData = JSON.parse(userString) as User;
      setUser(userData);
      setUserRole(userData.role);
      setUserName(userData.name || 'Usuário');

      if (userData.role === 'ADMIN') {
        console.log('[fetchData] User is ADMIN. Fetching admin data...');
        try {
          // --- Setup Dates --- 
          const endDateToday = new Date();
          const startDate30DaysAgo = subDays(endDateToday, 30);
          const formattedStartDate = format(startDate30DaysAgo, 'yyyy-MM-dd');
          const formattedEndDate = format(endDateToday, 'yyyy-MM-dd');

          // --- API Calls (Concurrent) ---
          const summaryPromise = fetchAdminDashboardSummary();
          // Fetch time stats for the LAST 30 DAYS
          const statsPromise = fetchCompanyTimeEntryStats(formattedStartDate, formattedEndDate); 
          // Fetch last 10 company payments (for the list)
          const companyPaymentsPromise = fetchCompanyPayments({
            limit: 10, // For the list view
            sortBy: 'date',
            sortOrder: 'desc'
          });
          // Fetch completed payments in the last 30 days (for the sum)
           const paidPaymentsPromise = fetchCompanyPayments({
            startDate: startDate30DaysAgo,
            endDate: endDateToday,
            status: 'completed',
            limit: 1000 // Fetch all completed in range
          });

          // --- Await Promises --- 
          const [summaryRes, statsRes, companyPaymentsRes, paidPaymentsRes] = await Promise.all([
            summaryPromise,
            statsPromise,
            companyPaymentsPromise,
            paidPaymentsPromise
          ]);

          // --- Update State ---
          console.log('[fetchData] Admin Summary Response:', summaryRes);
          setAdminSummary(summaryRes.dashboard);
          
          console.log('[fetchData] Company Time Stats (Last 30 Days) Response:', statsRes);
          setCompanyTimeStats(statsRes.stats); 
          
          console.log('[fetchData] Company Payments (Last 10) Response:', companyPaymentsRes);
          setCompanyPayments(companyPaymentsRes.payments); // For the list

          console.log('[fetchData] Company Payments (Last 30 Days Completed) Response:', paidPaymentsRes);
          const paidSum = paidPaymentsRes.payments.reduce((sum, p) => sum + p.amount, 0);
          setTotalPaidLast30Days(paidSum); // For the summary card
          
          console.log('[fetchData] Admin states updated (summary, stats, company payments list, paid sum)');

        } catch (adminError) {
          console.error('[fetchData] Error fetching ADMIN specific data:', adminError);
          setError('Falha ao carregar dados do administrador.');
          setAdminSummary(null);
          setCompanyTimeStats(null);
          setCompanyPayments([]);
          setTotalPaidLast30Days(0); // Reset sum on error
        }
      } else if (userData.role === 'MANAGER') {
        console.log('[fetchData] User is MANAGER. Fetching manager data...');
        try {
          const managerData = await fetchManagerDashboardSummary();
          console.log('[fetchData] Manager Summary Response:', managerData);
          setManagerSummary(managerData);
          console.log('[fetchData] Manager state updated (summary)');
        } catch (managerError) {
          console.error('[fetchData] Error fetching MANAGER specific data:', managerError);
          setError('Falha ao carregar dados do gerente.');
          setManagerSummary(null);
        }
      } else {
        console.log('Fetching data for role:', userData.role);
      }

      await loadUserPayments();

    } catch (err: any) {
      console.error('Error fetching dashboard data (overall):', err);
      setError(err.message || 'Failed to load dashboard data.');
      setUserRole(null);
      setAdminSummary(null);
      setCompanyTimeStats(null);
      setCompanyPayments([]);
      setRecentPayments([]);
      setTotalPaidLast30Days(0); // Reset sum on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUserPayments]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  console.log('[Render] Checking isAdmin:', isAdmin);
  console.log('[Render] Checking isManager:', isManager);
  console.log('[Render] adminSummary state:', adminSummary);
  console.log('[Render] companyTimeStats state:', companyTimeStats);
  console.log('[Render] managerSummary state:', managerSummary);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // --- Admin Specific Dashboard Cards ---
  const renderAdminDashboardCards = () => {
    // Verifica se os dados necessários estão carregados
    if (!adminSummary || !companyTimeStats) {
      return <ActivityIndicator size="large" color={Colors.light.tint} />;
    }

    const formatCurrency = (value: number): string => {
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    const summaryData = adminSummary.summary; 

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Resumo da Empresa
        </Text>
        <View style={styles.cardContainer}> 
          
          {/* Card: Aprovações Pendentes - Restaurado e como primeiro card */}
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.background }]}
            onPress={() => router.push('/(tabs)/time-entries')}
          >
            <Ionicons name="hourglass-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {summaryData.pendingApprovalCount?.toString() ?? '0'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Aprovações Pendentes</Text>
          </TouchableOpacity>

          {/* Card: Total de Usuários */}
          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
              <Ionicons name="people-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {summaryData.totalUserCount?.toString() ?? '0'}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Usuários Ativos</Text>
          </View>
          
          {/* Card: Aguardando Recibo (Com Link) */}
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: colors.background }]} 
            onPress={() => router.push({ pathname: '/payments', params: { tab: 'pending', filterUser: 'all' } })} 
          >
            <Ionicons name="receipt-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {summaryData.pendingPaymentCount?.toString() ?? '0'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Aguardando Recibo</Text>
          </TouchableOpacity>

          {/* Card: Total Horas (30 dias) */}
          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {summaryData.totalHoursLast30Days?.toFixed(2) ?? '0.00'}h
            </Text> 
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Horas (30 dias)</Text>
          </View>

          {/* Card: Total Pago (30 dias) */}
          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
            <Ionicons name="cash-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(totalPaidLast30Days ?? 0)} 
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Pago (30 dias)</Text>
          </View>

          {/* Placeholder para alinhar a última linha (agora 5 cards) */}
          <View style={[styles.summaryCard, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]} /> 

        </View>
      </View>
    );
  };

  // --- Manager Specific Dashboard Cards ---
  const renderManagerDashboardCards = () => {
    if (!managerSummary) {
      return <ActivityIndicator size="large" color={Colors.light.tint} />;
    }

    const formatCurrency = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return 'R$ 0,00';
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    const formatHours = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return '0.00';
        return value.toFixed(2);
    };

    const summary = managerSummary.summary;
    const myStats = summary.myStatsLast30Days;

    // URLs para onde os cards devem levar (ajustar conforme necessário)
    const timeEntriesUrl = '/(tabs)/time-entries'; 
    const teamTimeEntriesUrl = '/(tabs)/time-entries'; // Talvez filtrar para equipe?
    const teamManagementUrl = '/(tabs)/users'; // Ou uma tela específica de equipe
    const myPaymentsUrl = '/(tabs)/payments'; // Filtrado para o manager

    return (
      <>
        {/* Seção Gestão da Equipe */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gestão da Equipe</Text>
          <View style={styles.cardContainer}>
            {/* Card: Aprovações Pendentes (Equipe) */}
            <TouchableOpacity 
              style={[styles.summaryCard, { backgroundColor: colors.background }]}
              onPress={() => router.push(timeEntriesUrl)} // TODO: Passar filtro de status pendente para equipe
            >
              <Ionicons name="hourglass-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.pendingApprovalCount?.toString() ?? '0'}</Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Aprovações Pendentes</Text>
            </TouchableOpacity>

            {/* Card: Horas da Equipe (30 dias) */}
            <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
              <Ionicons name="bar-chart-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatHours(summary.teamTotalHoursLast30Days)}h</Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Horas da Equipe (30d)</Text>
            </View>

            {/* Card: Membros da Equipe */}
            <TouchableOpacity 
               style={[styles.summaryCard, { backgroundColor: colors.background }]}
               onPress={() => router.push(teamManagementUrl)} // Leva para gerenciamento de usuários/equipe
            >
              <Ionicons name="people-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.teamMemberCount?.toString() ?? '0'}</Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Membros na Equipe</Text>
            </TouchableOpacity>
            
            {/* Placeholder para alinhar */}
             <View style={[styles.summaryCard, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]} /> 
          </View>
        </View>

        {/* Seção Minhas Atividades e Pagamentos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Minhas Atividades e Pagamentos</Text>
          <View style={styles.cardContainer}>

             {/* Card: Minhas Horas (Detalhado) */}
             <View style={[styles.summaryCardWide, { backgroundColor: colors.background }]}>
               <Ionicons name="person-circle-outline" size={28} color={colors.tint} style={styles.summaryIconWide} />
               <View style={styles.cardWideContent}>
                  <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>Minhas Horas (30 dias)</Text>
                  <Text style={styles.detailText}>Total Registrado: {formatHours(myStats.totalHoursRegistered)}h</Text>
                  <Text style={styles.detailText}>Horas Pendentes Pag.: {formatHours(myStats.pendingPaymentHours)}h</Text>
                  <Text style={[styles.detailText, styles.valueText]}>Valor Pendente: {formatCurrency(myStats.pendingPaymentValue)}</Text>
               </View>
            </View>

            {/* Card: Meus Pagamentos Pendentes (Valor Total) */}
            <TouchableOpacity 
               style={[styles.summaryCard, { backgroundColor: colors.background }]} 
               onPress={() => router.push(myPaymentsUrl)} // TODO: Passar filtro de status pendente
             >
              <Ionicons name="wallet-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(summary.myPendingPaymentsTotalValue)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Pagamentos Pendentes</Text>
            </TouchableOpacity>
            
            {/* Card: Total Recebido (30 dias) */}
             <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
              <Ionicons name="cash-outline" size={24} color={colors.tint} style={styles.summaryIcon} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(summary.myReceivedPaymentsLast30Days)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.icon }]}>Recebido (30 dias)</Text>
            </View>

          </View>
        </View>
      </>
    );
  };

  const renderRoleSpecificCards = () => {
    if (!user?.role) return null;

    switch (user.role) {
      case 'ADMIN':
        const adminCardBg = colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA';
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: adminCardBg }]} 
              onPress={() => router.push('/(tabs)/users')} 
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
              style={[styles.card, { backgroundColor: adminCardBg }]} 
              onPress={() => router.push('/(tabs)/reports')} 
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

      case 'DEVELOPER':
        const devCardBg = colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA';
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: devCardBg }]}
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
              style={[styles.card, { backgroundColor: devCardBg }]}
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

      case 'MANAGER':
        const managerCardBg = colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA';
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: managerCardBg }]}
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
              style={[styles.card, { backgroundColor: managerCardBg }]}
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
        const employeeCardBg = colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA';
        return (
          <>
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: employeeCardBg }]}
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
              style={[styles.card, { backgroundColor: employeeCardBg }]}
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

  // Renamed for clarity: Renders payments RECEIVED by the user
  const renderUserRecentPayments = () => {
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
            Nenhum pagamento recebido recentemente
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

  // --- Renders Company Payments (Admin view) ---
  const renderCompanyPayments = () => {
    if (loadingCompanyPayments) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Carregando pagamentos da empresa...</Text>
        </View>
      );
    }
    if (companyPayments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Nenhum pagamento efetuado pela empresa recentemente.
          </Text>
        </View>
      );
    }

    return companyPayments.map((payment) => {
      // Navigate to payment details regardless of status for now.
      // The details screen can handle different statuses.
      const targetPath = '/payment-details'; 
      const targetParams = { id: payment.id };
      
      return (
        <TouchableOpacity 
          key={payment.id}
          style={[styles.paymentCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : 'white' }]}
          onPress={() => router.push({ pathname: targetPath, params: targetParams })}
        >
          <View style={styles.paymentHeader}>
            <Text style={[styles.paymentRecipient, { color: colors.text }]}>
              Para: {payment.user?.name || 'N/A'} 
            </Text>
            <Text style={[styles.paymentDate, { color: colors.icon }]}>
              {format(parseISO(payment.date), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </View>
          
          <View style={styles.paymentDetailsRow}> 
            <Text style={[styles.paymentAmount, { color: colors.text }]}>
              R$ {payment.amount.toFixed(2).replace('.', ',')}
            </Text>
            {payment.createdBy && (
               <Text style={[styles.paymentInitiator, { color: colors.icon }]}>
                 Por: {payment.createdBy.name}
               </Text>
             )}
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
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Olá, {userName}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Render Dashboard Cards (Condicional por Role) */}
        {isAdmin && renderAdminDashboardCards()} 
        {isManager && renderManagerDashboardCards()} 

        {/* Render Role Specific Quick Access Cards (render based on role inside the function) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Acesso Rápido
          </Text>
          <View style={styles.cardContainer}>
            {renderRoleSpecificCards()}
          </View>
        </View>

        {/* Company Payments (Admin Only) */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Últimos Pagamentos da Empresa
              </Text>
            </View>
            {renderCompanyPayments()}
          </View>
        )}

        {/* User's Received Payments (All Roles) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Meus Pagamentos Recentes
            </Text>
          </View>
          {renderUserRecentPayments()}
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
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 16,
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
  paymentRecipient: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentDetailsRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentInitiator: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 13,
    marginLeft: 4,
  },
  paymentDescription: {
    fontSize: 14,
    marginTop: 6,
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
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  summaryCardWide: {
    width: '100%', // Ocupa a largura toda
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row', // Ícone ao lado do conteúdo
    alignItems: 'center', // Alinha ícone e conteúdo verticalmente
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryIconWide: {
    marginRight: 16, // Espaço entre ícone e texto
  },
  cardWideContent: {
    flex: 1, // Permite que o conteúdo textual ocupe o espaço restante
  },
  detailText: {
    fontSize: 14,
    color: '#666', // Cor padrão para detalhes
    marginBottom: 4,
  },
  valueText: {
    fontWeight: 'bold',
    color: '#333', // Cor um pouco mais escura para valores
  },
});
