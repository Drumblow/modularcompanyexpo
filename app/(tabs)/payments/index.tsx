import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  fetchPayments, 
  getUserBalance, 
  Payment,
  UserBalanceResponse,
  PaymentsResponse,
  CreatePaymentRequest,
  createPayment,
  UserBalance,
  fetchUnpaidTimeEntries,
  TimeEntry,
  fetchCompanyPayments
} from '../../../services/paymentService';
import { fetchCompanyUsers, SelectableUser } from '../../../services/userService';
import PaymentCard from '../../components/PaymentCard';
import BalanceCard from '../../components/BalanceCard';
import { Picker as NativePicker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';

// Helper function added
const dateToString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

type PaymentTab = 'pending' | 'completed' | 'received';

// Adicionar tipos para os filtros de período
type PeriodFilter = 'all' | '30days' | '60days' | 'custom';
type FilterType = 'period' | 'employee';

// Componente de Filtro Reutilizável
const FilterButton = ({ 
  label, 
  isActive, 
  onPress 
}: { 
  label: string; 
  isActive: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterButton, isActive && styles.activeFilterButton]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Componente de Filtro de Período
const PeriodFilterComponent = ({ 
  periodFilter, 
  setPeriodFilter,
  customStartDate,
  customEndDate,
  setCustomStartDate,
  setCustomEndDate,
  showCustomDatePicker,
  setShowCustomDatePicker
}: {
  periodFilter: PeriodFilter;
  setPeriodFilter: (filter: PeriodFilter) => void;
  customStartDate: Date | null;
  customEndDate: Date | null;
  setCustomStartDate: (date: Date | null) => void;
  setCustomEndDate: (date: Date | null) => void;
  showCustomDatePicker: 'start' | 'end' | null;
  setShowCustomDatePicker: (type: 'start' | 'end' | null) => void;
}) => (
  <View style={styles.filterContainer}>
    <View style={styles.filterRow}>
      <FilterButton 
        label="Todos" 
        isActive={periodFilter === 'all'} 
        onPress={() => setPeriodFilter('all')} 
      />
      <FilterButton 
        label="30 Dias" 
        isActive={periodFilter === '30days'} 
        onPress={() => setPeriodFilter('30days')} 
      />
      <FilterButton 
        label="60 Dias" 
        isActive={periodFilter === '60days'} 
        onPress={() => setPeriodFilter('60days')} 
      />
      <FilterButton 
        label="Personalizado" 
        isActive={periodFilter === 'custom'} 
        onPress={() => setPeriodFilter('custom')} 
      />
    </View>

    {periodFilter === 'custom' && (
      <View style={styles.customDateContainer}>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowCustomDatePicker('start')}
        >
          <Text style={styles.dateInputText}>
            {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Data Inicial'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dateSeparator}>até</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowCustomDatePicker('end')}
        >
          <Text style={styles.dateInputText}>
            {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Data Final'}
          </Text>
        </TouchableOpacity>
      </View>
    )}

    {showCustomDatePicker && (
      <DateTimePicker
        value={showCustomDatePicker === 'start' ? (customStartDate || new Date()) : (customEndDate || new Date())}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowCustomDatePicker(null);
          if (selectedDate) {
            if (showCustomDatePicker === 'start') {
              setCustomStartDate(selectedDate);
            } else {
              setCustomEndDate(selectedDate);
            }
          }
        }}
      />
    )}
  </View>
);

// Componente de Filtro de Funcionário
const EmployeeFilterComponent = ({
  selectedUserId,
  setSelectedUserId,
  filterableUsers
}: {
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  filterableUsers: SelectableUser[];
}) => (
  <View style={styles.filterContainer}>
    <View style={styles.filterRow}>
      <Text style={styles.filterButtonText}>Filtrar por Funcionário:</Text>
      <View style={styles.dateInput}>
        <NativePicker
          selectedValue={selectedUserId}
          onValueChange={(value) => setSelectedUserId(value)}
          style={{ width: '100%' }}
        >
          <NativePicker.Item label="Todos" value="" />
          {filterableUsers.map((user) => (
            <NativePicker.Item
              key={user.id}
              label={user.name}
              value={user.id}
            />
          ))}
        </NativePicker>
      </View>
    </View>
  </View>
);

export default function PaymentsScreen() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>('received'); // Default tab

  // State for the "Create Payment" modal (remains the same)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  // ... (all states related to the create modal remain the same) ...
  const [companyUsers, setCompanyUsers] = useState<SelectableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [unpaidTimeEntries, setUnpaidTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<string[]>([]);
  const [fetchingEntries, setFetchingEntries] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date()); 
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false); 
  const [formError, setFormError] = useState<string | null>(null); 
  const [success, setSuccess] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time'>('date');
  const [currentPickerField, setCurrentPickerField] = useState<'date' | null>(null);

  // --- States for Payment Lists & Tabs ---
  const [myReceivedPayments, setMyReceivedPayments] = useState<Payment[]>([]);
  const [pendingCompanyPayments, setPendingCompanyPayments] = useState<Payment[]>([]);
  const [completedCompanyPayments, setCompletedCompanyPayments] = useState<Payment[]>([]);
  
  const [balanceData, setBalanceData] = useState<UserBalanceResponse | null>(null); // Keep balance for received tab
  
  // Loading states per tab
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
      
  // Error states per tab
  const [errorReceived, setErrorReceived] = useState<string | null>(null);
  const [errorPending, setErrorPending] = useState<string | null>(null);
  const [errorCompleted, setErrorCompleted] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // State for the employee filter in the pending tab
  const [filterableUsers, setFilterableUsers] = useState<SelectableUser[]>([]);
  const [selectedFilterUserId, setSelectedFilterUserId] = useState<string>(''); // Empty string for "All"
  const [loadingFilterUsers, setLoadingFilterUsers] = useState(false);

  // Estados para filtros de período
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<'start' | 'end' | null>(null);

  // Determine if the current user is an Admin or Manager
  const isAdminOrManager = useMemo(() => userRole && ['ADMIN', 'MANAGER'].includes(userRole.toUpperCase()), [userRole]);
  const canCreatePayment = isAdminOrManager; // Alias for clarity

  // Set default tab based on role once role is fetched
  useEffect(() => {
    if (isAdminOrManager) {
      setActiveTab('pending'); // Default to pending for admins/managers
    } else {
      setActiveTab('received'); // Default to received for employees
    }
  }, [isAdminOrManager]);

  // Função para calcular datas baseadas no filtro selecionado
  const getFilterDates = useCallback(() => {
    const today = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (periodFilter) {
      case '30days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = today;
        break;
      case '60days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 60);
        endDate = today;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        }
        break;
      case 'all':
      default:
        // Não define datas para mostrar todos os registros
        break;
    }

    return { startDate, endDate };
  }, [periodFilter, customStartDate, customEndDate]);

  // Modificar loadTabData para usar os filtros
  const loadTabData = useCallback(async (tab: PaymentTab, filterUserId: string = '') => {
    if (!userRole) return;

    // Set loading state
    switch (tab) {
      case 'received': setLoadingReceived(true); setErrorReceived(null); break;
      case 'pending': setLoadingPending(true); setErrorPending(null); break;
      case 'completed': setLoadingCompleted(true); setErrorCompleted(null); break;
    }
    setRefreshing(false);

    try {
      let response: PaymentsResponse | null = null;
      let balance: UserBalanceResponse | null = null;

      if (tab === 'received') {
        const { startDate, endDate } = getFilterDates();
        response = await fetchPayments(startDate || undefined, endDate || undefined);
        balance = await getUserBalance(null, startDate || undefined, endDate || undefined);
        setMyReceivedPayments(response.payments || []);
        setBalanceData(balance);
      } else if (isAdminOrManager) {
        const statusFilter = tab === 'pending' ? 'pending' : 'completed';
        const apiParams: any = { status: statusFilter };
        
        // Adicionar filtro de funcionário apenas para a aba de pendentes
        if (tab === 'pending' && filterUserId) {
          apiParams.userId = filterUserId;
        }

        // Adicionar filtros de período para todas as abas
        const { startDate, endDate } = getFilterDates();
        if (startDate) apiParams.startDate = startDate;
        if (endDate) apiParams.endDate = endDate;

        response = await fetchCompanyPayments(apiParams);
        if (tab === 'pending') {
          setPendingCompanyPayments(response.payments || []);
        } else {
          setCompletedCompanyPayments(response.payments || []);
        }
      }
    } catch (err: any) {
      console.error(`Erro ao carregar dados da aba ${tab} (Filtro: ${filterUserId}):`, err);
      const errorMsg = `Não foi possível carregar os dados (${tab}). Tente novamente.`;
      switch (tab) {
        case 'received': setErrorReceived(errorMsg); break;
        case 'pending': setErrorPending(errorMsg); break;
        case 'completed': setErrorCompleted(errorMsg); break;
      }
      // Clear data
      switch (tab) {
        case 'received': setMyReceivedPayments([]); setBalanceData(null); break;
        case 'pending': setPendingCompanyPayments([]); break;
        case 'completed': setCompletedCompanyPayments([]); break;
      }
    } finally {
      // Reset loading state
      switch (tab) {
        case 'received': setLoadingReceived(false); break;
        case 'pending': setLoadingPending(false); break;
        case 'completed': setLoadingCompleted(false); break;
      }
    }
  }, [userRole, isAdminOrManager, getFilterDates]);

  // Atualizar useEffect para recarregar dados quando os filtros mudarem
  useEffect(() => {
    if (userRole) {
      loadTabData(activeTab, activeTab === 'pending' ? selectedFilterUserId : '');
    }
  }, [activeTab, userRole, selectedFilterUserId, periodFilter, customStartDate, customEndDate, loadTabData]);

  // Fetch user role and filterable users on component mount for Admin/Manager
  useEffect(() => {
    const fetchInitialAdminData = async () => {
      let fetchedRole: string | null = null;
      try {
        const userString = await AsyncStorage.getItem('@ModularCompany:user');
        if (userString) {
          const userData = JSON.parse(userString);
          fetchedRole = userData.role || null;
          setUserRole(fetchedRole);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error('Erro ao obter papel do usuário:', err);
        setUserRole(null);
        setErrorReceived('Erro ao verificar permissões.');
      }

      // If user is Admin/Manager, fetch users for the filter dropdown
      if (fetchedRole && ['ADMIN', 'MANAGER'].includes(fetchedRole.toUpperCase())) {
        setLoadingFilterUsers(true);
        try {
          const users = await fetchCompanyUsers();
          setFilterableUsers(users);
        } catch (err: any) {
          console.error('Erro ao buscar usuários para filtro:', err);
          // Set error state for pending tab? Or a general error?
          setErrorPending('Erro ao carregar filtro de funcionários.');
        } finally {
          setLoadingFilterUsers(false);
        }
      }
    };
    fetchInitialAdminData();
  }, []);

  // Refresh function loads data for the current active tab
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Pass the filter when refreshing the pending tab
    await loadTabData(activeTab, activeTab === 'pending' ? selectedFilterUserId : ''); 
    setRefreshing(false); 
  }, [activeTab, selectedFilterUserId, loadTabData]);

  // --- Modal Functions (remain largely the same) ---
  // handlePaymentPress, loadUsersForModal, useEffect for unpaid entries,
  // derivedPaymentData, toggleTimeEntrySelection, resetForm, openModal, closeModal,
  // submitPayment, showAndroidDatePicker, handleDateChange, renderDateTimePicker 
  // ... (These functions are unchanged) ...
  const handlePaymentPress = (paymentId: string) => {
    router.push({
      pathname: "/payment-details",
      params: { id: paymentId }
    });
  };
  const loadUsersForModal = async () => {
    if (!canCreatePayment) return; // Should not happen if button isn't visible, but safeguard
    try {
      setCompanyUsers([]); // Clear previous list
      const users = await fetchCompanyUsers();
      // Filter out the admin/manager themselves if needed? Or maybe not.
      setCompanyUsers(users);
    } catch (err: any) {
       setFormError(err.message || 'Erro ao buscar usuários.');
       setCompanyUsers([]); // Ensure it's empty on error
    }
  };
  useEffect(() => {
    const loadUnpaidEntries = async () => {
      if (selectedUserId) {
        setFetchingEntries(true);
        setUnpaidTimeEntries([]); // Clear previous entries
        setSelectedTimeEntryIds([]); // Clear selected entries
        setFormError(null);
        try {
          const entries = await fetchUnpaidTimeEntries(selectedUserId);
          setUnpaidTimeEntries(entries);
        } catch (err: any) {
          setFormError(err.message || 'Erro ao buscar registros de horas pendentes.');
          setUnpaidTimeEntries([]);
        } finally {
          setFetchingEntries(false);
        }
          } else {
        setUnpaidTimeEntries([]); // Clear if no user selected
        setSelectedTimeEntryIds([]);
      }
    };

    loadUnpaidEntries();
  }, [selectedUserId]);
    const derivedPaymentData = useMemo(() => {
    if (selectedTimeEntryIds.length === 0) {
      return { calculatedAmount: 0, periodStart: null, periodEnd: null, defaultDescription: '', hourlyRateKnown: false };
    }

    let totalAmount = 0;
    let totalHours = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    const selectedUser = companyUsers.find(u => u.id === selectedUserId);
    const hourlyRate = typeof selectedUser?.hourlyRate === 'number' ? selectedUser.hourlyRate : 0;

    selectedTimeEntryIds.forEach(id => {
      const entry = unpaidTimeEntries.find(e => e.id === id);
      if (entry) {
        totalHours += entry.totalHours;
        const rateForEntry = typeof entry.user?.hourlyRate === 'number' ? entry.user.hourlyRate : hourlyRate;
        totalAmount += entry.totalHours * rateForEntry;

        const entryDate = new Date(entry.date);
        if (!minDate || entryDate < minDate) {
          minDate = entryDate;
        }
        if (!maxDate || entryDate > maxDate) {
          maxDate = entryDate;
        }
      }
    });

    let defaultDescription = '';
    if (minDate && maxDate && totalHours > 0) {
        const startDateStr = format(minDate, 'dd/MM/yyyy', { locale: ptBR });
        const endDateStr = format(maxDate, 'dd/MM/yyyy', { locale: ptBR });
        if (startDateStr === endDateStr) {
            defaultDescription = `Pagamento ref. ${totalHours.toFixed(2)}h em ${startDateStr}`;
      } else {
            defaultDescription = `Pagamento ref. ${totalHours.toFixed(2)}h (Período: ${startDateStr} a ${endDateStr})`;
        }
    }

    return {
      calculatedAmount: totalAmount,
      periodStart: minDate ? dateToString(minDate) : null,
      periodEnd: maxDate ? dateToString(maxDate) : null,
      defaultDescription: defaultDescription,
      hourlyRateKnown: hourlyRate > 0 || unpaidTimeEntries.some(e => selectedTimeEntryIds.includes(e.id) && e.user?.hourlyRate && e.user.hourlyRate > 0)
    };
  }, [selectedTimeEntryIds, unpaidTimeEntries, companyUsers, selectedUserId]);
    useEffect(() => {
      const newAmount = derivedPaymentData.calculatedAmount;
      setAmount(newAmount > 0 ? newAmount.toFixed(2) : '');
      
      if (derivedPaymentData.defaultDescription && description !== derivedPaymentData.defaultDescription) {
          setDescription(derivedPaymentData.defaultDescription);
      }
      if (selectedTimeEntryIds.length === 0) {
          setDescription('');
      }

  }, [
      derivedPaymentData.calculatedAmount, 
      derivedPaymentData.defaultDescription, 
      selectedTimeEntryIds.length
  ]);
    const toggleTimeEntrySelection = (id: string) => {
    setSelectedTimeEntryIds(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(entryId => entryId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };
  const resetForm = useCallback(() => {
    setSelectedUserId('');
    setCompanyUsers([]);
    setUnpaidTimeEntries([]);
    setSelectedTimeEntryIds([]);
    setAmount('');
    setPaymentDate(new Date());
    setDescription('');
    setReference('');
    setPaymentMethod('cash');
    setFormError(null);
    setSuccess(false);
    setSubmitting(false);
    setFetchingEntries(false);
    setShowDatePicker(false);
  }, []);
  const openModal = () => {
    resetForm();
    loadUsersForModal();
    setCreateModalVisible(true);
  };
  const closeModal = () => {
    setCreateModalVisible(false);
    setTimeout(resetForm, 300); 
  };
    const submitPayment = async () => {
     setFormError(null);
     setSubmitting(true);
     setSuccess(false);
  
     const finalAmount = derivedPaymentData.calculatedAmount;

     try {
      if (!selectedUserId) {
        throw new Error('Selecione um usuário');
      }
      if (selectedTimeEntryIds.length === 0) {
        throw new Error('Selecione pelo menos um registro de horas para pagar');
      }
      if (isNaN(finalAmount) || finalAmount <= 0) {
        if (!derivedPaymentData.hourlyRateKnown) {
            throw new Error('Valor do pagamento não pôde ser calculado (taxa horária desconhecida). Verifique o cadastro do usuário.');
        } else {
            throw new Error('Valor calculado do pagamento inválido ou não positivo.');
        }
      }
      if (!paymentMethod) {
        throw new Error('Selecione um método de pagamento');
      }
      if (!description.trim()) {
        throw new Error('Adicione uma descrição para o pagamento');
      }
      
      const { periodStart: derivedStart, periodEnd: derivedEnd } = derivedPaymentData;

      if (!derivedStart || !derivedEnd) {
          throw new Error('Não foi possível determinar o período a partir dos registros selecionados.');
      }
      
      const paymentData: CreatePaymentRequest = {
        userId: selectedUserId,
        amount: finalAmount,
        date: dateToString(paymentDate),
        paymentMethod: paymentMethod,
        reference: reference.trim() || undefined,
        description: description.trim(),
        status: 'pending',
        periodStart: derivedStart,
        periodEnd: derivedEnd,
        timeEntryIds: selectedTimeEntryIds,
      };

      console.log('Enviando dados para criar pagamento:', paymentData);

      const response = await createPayment(paymentData);
      
      console.log('Resposta da criação de pagamento:', response);

      if (response.payment && response.payment.id) {
        setSuccess(true);
        Alert.alert('Sucesso', 'Pagamento criado com sucesso!');
      setTimeout(() => {
        closeModal(); 
            loadTabData('pending', selectedFilterUserId); // Reload the pending tab data after creation
      }, 1500);
      } else {
         throw new Error('Falha ao criar pagamento. Resposta inesperada da API.');
      }
      
    } catch (error: any) {
      console.error('Erro ao submeter pagamento:', error);
      setFormError(error.message || 'Ocorreu um erro ao criar o pagamento. Tente novamente.');
      setSuccess(false); 
    } finally {
      setSubmitting(false);
    }
  };
    const showAndroidDatePicker = (field: 'date') => {
    setCurrentPickerField(field);
    setShowDatePicker(true);
  };
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || paymentDate;
    // For Android, hide picker immediately. For iOS, keep open until user confirms.
    setShowDatePicker(Platform.OS === 'ios'); 
    if (selectedDate) {
       setPaymentDate(currentDate);
    }
    // Reset picker field only for Android after selection or cancel
    if (Platform.OS === 'android') {
       setShowDatePicker(false); 
       setCurrentPickerField(null); 
    }
  };
     const renderDateTimePicker = () => {
    if (!showDatePicker || !currentPickerField) {
      return null;
    }

    let value;
    let onChange;

    switch (currentPickerField) {
        case 'date':
           value = paymentDate;
           onChange = handleDateChange;
           break;
      // Remove cases for 'startDate' and 'endDate'
        default:
        return null;
      }
      
         return (
           <DateTimePicker
             value={value}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
             onChange={onChange}
        locale="pt-BR"
      />
    );
  };

  // --- Render Functions ---

  // Get data, loading, and error based on active tab
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'pending': return { data: pendingCompanyPayments, loading: loadingPending, error: errorPending };
      case 'completed': return { data: completedCompanyPayments, loading: loadingCompleted, error: errorCompleted };
      case 'received':
      default: return { data: myReceivedPayments, loading: loadingReceived, error: errorReceived };
    }
  };

  const { data: currentPayments, loading: currentLoading, error: currentError } = getCurrentTabData();

  // Função para renderizar os filtros de período
  const renderPeriodFilters = () => {
    if (activeTab !== 'received') return null;

    return (
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, periodFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setPeriodFilter('all')}
          >
            <Text style={[styles.filterButtonText, periodFilter === 'all' && styles.activeFilterButtonText]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, periodFilter === '30days' && styles.activeFilterButton]}
            onPress={() => setPeriodFilter('30days')}
          >
            <Text style={[styles.filterButtonText, periodFilter === '30days' && styles.activeFilterButtonText]}>
              30 Dias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, periodFilter === '60days' && styles.activeFilterButton]}
            onPress={() => setPeriodFilter('60days')}
          >
            <Text style={[styles.filterButtonText, periodFilter === '60days' && styles.activeFilterButtonText]}>
              60 Dias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, periodFilter === 'custom' && styles.activeFilterButton]}
            onPress={() => setPeriodFilter('custom')}
          >
            <Text style={[styles.filterButtonText, periodFilter === 'custom' && styles.activeFilterButtonText]}>
              Personalizado
            </Text>
          </TouchableOpacity>
        </View>

        {periodFilter === 'custom' && (
          <View style={styles.customDateContainer}>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowCustomDatePicker('start')}
            >
              <Text style={styles.dateInputText}>
                {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Data Inicial'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>até</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowCustomDatePicker('end')}
            >
              <Text style={styles.dateInputText}>
                {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Data Final'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showCustomDatePicker && (
          <DateTimePicker
            value={showCustomDatePicker === 'start' ? (customStartDate || new Date()) : (customEndDate || new Date())}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowCustomDatePicker(null);
              if (selectedDate) {
                if (showCustomDatePicker === 'start') {
                  setCustomStartDate(selectedDate);
                } else {
                  setCustomEndDate(selectedDate);
                }
              }
            }}
          />
        )}
      </View>
    );
  };

  // Render Header conditionally based on tab
  const renderListHeader = () => {
    // Only render header components for the 'received' tab
    if (activeTab === 'received') {
      return (
        <>
          {balanceData && <BalanceCard balanceData={balanceData} />}
          {renderPeriodFilters()} 
        </>
      );
    }
    // Return null for other tabs (pending, completed) as filters are rendered elsewhere
    return null;
  };

  // Render Empty Component based on tab
  const renderEmptyComponent = () => {
    let message = "Nenhum pagamento encontrado";
    if (activeTab === 'pending') message = "Nenhum pagamento pendente de confirmação.";
    else if (activeTab === 'completed') message = "Nenhum recibo de pagamento concluído.";
    else message = "Você ainda não recebeu nenhum pagamento.";

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cash-outline" size={60} color="#94a3b8" />
        <Text style={styles.emptyText}>{message}</Text>
        </View>
    );
  };

  // Render the Employee Filter Picker (only for Admin/Manager on Pending tab)
  const renderEmployeeFilter = () => {
    if (!isAdminOrManager || activeTab !== 'pending') return null;

    return (
      <View style={[styles.filterContainer, { marginTop: 16 }]}>
        <View style={styles.filterRow}>
          <Text style={styles.filterButtonText}>Filtrar por Funcionário:</Text>
          <View style={styles.dateInput}>
            <NativePicker
              selectedValue={selectedFilterUserId}
              onValueChange={(value) => setSelectedFilterUserId(value)}
              style={{ width: '100%' }}
            >
              <NativePicker.Item label="Todos" value="" />
              {filterableUsers.map((user) => (
                <NativePicker.Item
                  key={user.id}
                  label={user.name}
                  value={user.id}
                />
              ))}
            </NativePicker>
          </View>
        </View>
      </View>
    );
  };

  // Render the Tab Bar (only for Admin/Manager)
  const renderTabBar = () => {
    if (!isAdminOrManager) return null;

    const tabs: { key: PaymentTab; label: string }[] = [
      { key: 'pending', label: 'Pendentes' },
      { key: 'completed', label: 'Recibos' },
      { key: 'received', label: 'Meus Recebidos' },
    ];

    return (
      <View style={styles.tabBarContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            disabled={currentLoading} // Disable tabs while loading
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
        </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Modal rendering (remains the same)
  const renderCreatePaymentModal = () => (
      // ... modal JSX unchanged ...
    <Modal
      animationType="slide"
      transparent={true}
      visible={createModalVisible}
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Novo Pagamento</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {formError && <Text style={styles.errorTextModal}>{formError}</Text>}
            {success && <Text style={styles.successTextModal}>Pagamento criado com sucesso!</Text>}

            {/* User Selection */}
            <Text style={styles.label}>Funcionário:</Text>
            <View style={styles.pickerContainer}>
                 <NativePicker
                   selectedValue={selectedUserId}
                onValueChange={(itemValue) => setSelectedUserId(itemValue || '')}
                style={styles.picker}
                   enabled={!submitting && companyUsers.length > 0}
                 >
                <NativePicker.Item label="-- Selecione um Funcionário --" value="" />
                   {companyUsers.map((user) => (
                     <NativePicker.Item key={user.id} label={`${user.name} (${user.email})`} value={user.id} />
                   ))}
                 </NativePicker>
              </View>
            {!companyUsers.length && !selectedUserId && <ActivityIndicator style={{ marginVertical: 10 }}/>} 

            {/* Unpaid Time Entries Section */}
            {selectedUserId && (
              <View style={styles.entriesSection}>
                <Text style={styles.subHeader}>Registros Aprovados e Não Pagos:</Text>
                {fetchingEntries && <ActivityIndicator style={{ marginVertical: 10 }}/>}
                {!fetchingEntries && unpaidTimeEntries.length === 0 && (
                   <Text style={styles.infoText}>Nenhum registro pendente encontrado para este usuário.</Text>
                )}
                {!fetchingEntries && unpaidTimeEntries.length > 0 && (
                  <View style={styles.entriesList}>
                    {unpaidTimeEntries.map((entry) => (
                 <TouchableOpacity 
                         key={entry.id} 
                         style={styles.entryItem} 
                         onPress={() => toggleTimeEntrySelection(entry.id)}
                    disabled={submitting}
                 >
                         <Checkbox
                            value={selectedTimeEntryIds.includes(entry.id)}
                            onValueChange={() => toggleTimeEntrySelection(entry.id)}
                            color={selectedTimeEntryIds.includes(entry.id) ? '#007AFF' : undefined}
                            style={styles.checkbox}
                            disabled={submitting}
                          />
                        <View style={styles.entryDetails}>
                           <Text style={styles.entryDate}>
                              {format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })} - {entry.totalHours.toFixed(2)}h
                  </Text>
                           <Text style={styles.entryProject}>{entry.project || 'Sem projeto'}</Text>
                           {/* TODO: Display calculated value per entry if hourly rate is known */}
                           {/* <Text style={styles.entryValue}>Valor: R$ XXX.XX</Text> */}
                           <Text style={styles.entryObs} numberOfLines={1}>
                              {entry.observation || 'Sem observação'}
                           </Text>
                        </View>
                </TouchableOpacity>
                    ))}
              </View>
                )}
                 </View>
              )}

            {/* Payment Details Section (conditional on entries selected) */}
            {selectedTimeEntryIds.length > 0 && (
              <View>
                 <Text style={styles.subHeader}>Detalhes do Pagamento:</Text>
                 
                 {/* Display Calculated Period */}
                 <View style={styles.derivedInfo}>
                    <Text>Período Calculado: </Text>
                    <Text style={styles.derivedValue}>
                        {derivedPaymentData.periodStart && derivedPaymentData.periodEnd 
                         ? `${format(new Date(derivedPaymentData.periodStart), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(derivedPaymentData.periodEnd), 'dd/MM/yyyy', { locale: ptBR })}`
                         : '--'}
                     </Text>
                  </View>
                 
                 {/* Display Calculated Amount (now read-only) */}
                 <Text style={styles.label}>Valor (CAD $):</Text>
              <TextInput
                    style={[styles.input, styles.readOnlyInput]}
                value={amount}
                    editable={false}
                    placeholder="Calculado automaticamente"
                 />
                 {/* Inform user if rate is unknown */}
                 {selectedTimeEntryIds.length > 0 && !derivedPaymentData.hourlyRateKnown && (
                     <Text style={styles.warningText}>Taxa horária não definida para este usuário. O valor não pode ser calculado.</Text>
                 )}

                 <Text style={styles.label}>Data do Pagamento:</Text>
                 <TouchableOpacity onPress={() => showAndroidDatePicker('date')} style={styles.dateInput} disabled={submitting}>
                    <Text>{format(paymentDate, 'dd/MM/yyyy', { locale: ptBR })}</Text>
                    <Ionicons name="calendar" size={20} color="#666" />
              </TouchableOpacity>

                 <Text style={styles.label}>Descrição:</Text>
              <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Preenchido automaticamente (editável)"
                value={description}
                onChangeText={setDescription}
                    multiline
                    editable={!submitting}
              />
              
                 <Text style={styles.label}>Referência (Opcional):</Text>
              <TextInput
                    style={styles.input}
                    placeholder="Ex: PGTO-MAI-2024"
                value={reference}
                onChangeText={setReference}
                    editable={!submitting}
              />

                 <Text style={styles.label}>Método de Pagamento:</Text>
                  <View style={styles.pickerContainer}>
                     <NativePicker
                        selectedValue={paymentMethod}
                        onValueChange={(itemValue) => setPaymentMethod(itemValue)}
                        style={styles.picker}
                        enabled={!submitting} 
                     >
                        <NativePicker.Item label="Dinheiro" value="cash" />
                        <NativePicker.Item label="Transferência Bancária" value="bank_transfer" />
                        <NativePicker.Item label="E-transfer" value="etransfer" />
                        <NativePicker.Item label="Outro" value="other" />
                     </NativePicker>
                  </View>
              </View>
            )}

            {/* Submit Button - Disable if amount is not positive or rate is unknown */}
              <TouchableOpacity
               style={[styles.submitButton, (submitting || selectedTimeEntryIds.length === 0 || !(derivedPaymentData.calculatedAmount > 0)) && styles.disabledButton]} 
               onPress={submitPayment}
               disabled={submitting || selectedTimeEntryIds.length === 0 || !(derivedPaymentData.calculatedAmount > 0)}
              >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Criar Pagamento</Text>
              )}
              </TouchableOpacity>
          </ScrollView>
           {/* Render DateTimePicker outside ScrollView for better handling on iOS */}
          {renderDateTimePicker()}
            </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // --- Main Screen Return ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {/* Header with Title and Add Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pagamentos</Text>
        {canCreatePayment && (
          <TouchableOpacity style={styles.createButton} onPress={openModal} >
            <Text style={styles.createButtonText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar for Admin/Manager */}
      {renderTabBar()}

      {/* Content Area */}
      <View style={styles.container}>
        {/* Loading Indicator for the active tab */}
        {currentLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        )}
        
        {/* Error Display for the active tab */}
        {currentError && !currentLoading && (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={50} color="#dc2626" />
                <Text style={styles.errorText}>{currentError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadTabData(activeTab, activeTab === 'pending' ? selectedFilterUserId : '')}> 
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* Conditionally render Employee Filter for Pending tab */}
        {isAdminOrManager && activeTab === 'pending' && renderEmployeeFilter()}

        {/* Payment List for the active tab */}
        {!currentLoading && !currentError && (
        <FlatList
            data={currentPayments} // Use data from the active tab
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
              <PaymentCard payment={item} onPress={() => handlePaymentPress(item.id)} />
          )}
            ListHeaderComponent={renderListHeader} // Render header conditionally
            ListEmptyComponent={renderEmptyComponent} // Render empty state based on tab
            contentContainerStyle={currentPayments.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
              <RefreshControl 
                 refreshing={refreshing} 
                 onRefresh={onRefresh} 
                 colors={['#0284c7']} 
              />
          }
        />
        )}
        
        {/* Render the create payment modal (unchanged) */}
        {renderCreatePaymentModal()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
  },
  createButton: {
    backgroundColor: '#0A7EA4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#0A7EA4',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateInputText: {
    color: '#333',
    textAlign: 'center',
  },
  dateSeparator: {
    color: '#666',
    marginHorizontal: 5,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyList: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
  },
  closeButton: {
    padding: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
   textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  picker: {
    height: 50, 
     width: '100%',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  entriesSection: {
     marginTop: 20,
     marginBottom: 15,
     borderTopWidth: 1,
     borderTopColor: '#eee',
     paddingTop: 15,
  },
  subHeader: {
     fontSize: 16,
     fontWeight: '600',
     marginBottom: 10,
     color: '#444',
  },
   entriesList: {
     maxHeight: 200,
   },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
     borderBottomWidth: 1,
     borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    marginRight: 12,
  },
   entryDetails: {
     flex: 1,
  },
  entryDate: {
    fontSize: 14,
     fontWeight: '500',
  },
  entryProject: {
     fontSize: 13,
     color: '#555',
     marginTop: 2,
  },
  entryValue: {
     fontSize: 13,
     color: 'green',
     fontWeight: '500',
     marginTop: 2,
  },
  entryObs: {
     fontSize: 12,
     color: '#777',
     marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
   derivedInfo: {
     flexDirection: 'row',
    alignItems: 'center',
     backgroundColor: '#e9e9e9',
     paddingVertical: 8,
     paddingHorizontal: 12,
     borderRadius: 5,
     marginBottom: 10,
     marginTop: 5,
   },
   derivedValue: {
     fontWeight: 'bold',
     marginLeft: 5,
   },
  errorTextModal: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  successTextModal: {
    color: 'green',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  readOnlyInput: {
     backgroundColor: '#e9ecef',
     color: '#495057',
  },
  warningText: {
      fontSize: 12,
      color: '#ff8c00',
      marginTop: 4,
      marginBottom: 8,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0A7EA4',
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
  },
  tabLabelActive: {
    color: '#0A7EA4',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 20,
  },
}); 