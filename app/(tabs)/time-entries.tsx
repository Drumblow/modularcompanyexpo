import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';

const API_URL = 'https://modularcompany.vercel.app/api';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
  project?: string;
  approved: boolean | null;
  rejected: boolean | null;
  rejectionReason?: string;
  isPaid?: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    role: string;
  };
}

interface TimeEntriesResponse {
  timeEntries: TimeEntry[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
}

function TimeEntriesScreenComponent() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 1)));
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [observation, setObservation] = useState('');
  const [project, setProject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'mine'>('mine');
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const loadUserData = async () => {
    try {
      const userString = await AsyncStorage.getItem('@ModularCompany:user');
      if (userString) {
        const userData: User = JSON.parse(userString);
        setUserRole(userData.role);
        setCurrentUser(userData);
        if (userData.role === 'MANAGER') {
          setActiveTab('team');
        } else {
          setActiveTab('mine');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const fetchTimeEntries = async () => {
    if (!currentUser) {
      console.log('Usuário atual não carregado, abortando fetchTimeEntries.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      
      if (!token) {
        console.error('Token não encontrado');
        setTimeEntries([]); // Limpa as entradas se não houver token
        throw new Error('Token não encontrado');
      }
      
      console.log('Fetching time entries for user:', currentUser.id, 'Role:', currentUser.role, 'Active Tab:', activeTab);
      
      const endpoint = `${API_URL}/mobile-time-entries`;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: { period: 'all' } as Record<string, any>
      };
      
      // Parâmetro útil para todos os papéis que podem ver detalhes
      if (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.role === 'MANAGER') {
        config.params.includeUserDetails = true;
      }

      if (currentUser.role === 'MANAGER') {
        if (activeTab === 'mine') {
          config.params.userId = currentUser.id;
          // A API mobile doc sugere includeOwnEntries=true com userId para ver apenas os próprios.
          // Se a API web/mobile já faz isso por padrão ao passar o userId do manager, ótimo.
          // Caso contrário, este parâmetro pode ser necessário se a API espera.
          config.params.includeOwnEntries = true; 
          console.log('MANAGER: Buscando MINHAS HORAS. Params:', config.params);
        } else { // activeTab === 'team'
          // A API mobile doc sugere que, por padrão, manager não vê os seus.
          // Se `managedUsers=true` for o parâmetro da API web para isso, usamos.
          // Se a API web para manager, por padrão, já retorna apenas subordinados, não precisamos de managedUsers.
          config.params.managedUsers = true; // Assumindo que este é o parâmetro para a API web/mobile
          console.log('MANAGER: Buscando REGISTROS DA EQUIPE. Params:', config.params);
        }
      } else if (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER') {
        // Admin/Developer pode precisar de filtros específicos se tiverem abas,
        // por enquanto, busca geral (a API deve filtrar por empresa para Admin).
        // Se eles tiverem uma aba 'mine', a lógica do manager (activeTab === 'mine') se aplicaria.
        console.log('ADMIN/DEVELOPER: Buscando registros. Params:', config.params);
      } else if (currentUser.role === 'EMPLOYEE') {
        // Employee sempre vê apenas os seus, geralmente sem parâmetros extras, a API já filtra.
        config.params.userId = currentUser.id; // Garantir que estamos buscando explicitamente pelo ID do funcionário
        console.log('EMPLOYEE: Buscando MINHAS HORAS. Params:', config.params);
      }
      
      const response = await axios.get<TimeEntriesResponse>(endpoint, config);
      
      if (currentUser.role === 'MANAGER' && activeTab === 'mine') {
        console.log('MANAGER MINE - Raw API Response Status:', response.status);
        console.log('MANAGER MINE - Raw API Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('MANAGER MINE - Raw API Response Data:', JSON.stringify(response.data, null, 2));
      } else if (currentUser.role === 'MANAGER' && activeTab === 'team') {
        console.log('MANAGER TEAM - Raw API Response Status:', response.status);
        console.log('MANAGER TEAM - Raw API Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('MANAGER TEAM - Raw API Response Data:', JSON.stringify(response.data, null, 2));
      }

      let entries = response.data?.timeEntries || [];
      console.log(`Recebidos ${entries.length} registros.`);

      // Filtro frontend para manager na aba 'team' SE a API não excluir os dele com managedUsers=true
      // Este é um fallback. O ideal é a API fazer isso.
      // if (currentUser.role === 'MANAGER' && activeTab === 'team' && /* condição se a API não filtrou */) {
      //  console.log('MANAGER: Filtrando entradas próprias da visualização da equipe no frontend.');
      //  entries = entries.filter(entry => entry.userId !== currentUser.id);
      // }

      setTimeEntries(entries);
    } catch (error) {
      console.error('Erro ao buscar registros de horas:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        Alert.alert('Sessão expirada', 'Sua sessão expirou. Por favor, faça login novamente.');
        // Aqui você pode adicionar navegação para a tela de login
      } else {
        // Para outros erros, mantém a lista vazia ou exibe uma mensagem genérica
        setTimeEntries([]); 
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTimeEntries();
    }
  }, [activeTab, currentUser]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimeEntries();
  };

  // Função para determinar se o usuário logado pode gerenciar (aprovar/rejeitar) uma entrada específica
  const canManageEntry = (entry: TimeEntry): boolean => {
    if (!currentUser) return false;

    // ADMIN e DEVELOPER podem gerenciar qualquer registro, exceto os seus próprios.
    if (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER') {
      return entry.userId !== currentUser.id;
    }

    // MANAGER só pode gerenciar na aba "team" E se o registro não for dele.
    if (currentUser.role === 'MANAGER') {
      return activeTab === 'team' && entry.userId !== currentUser.id;
    }

    return false; // EMPLOYEE não gerencia aprovações.
  };

  const getFilteredEntries = () => {
    let filtered = timeEntries;
    
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(entry => entry.approved === null && entry.rejected === null);
        break;
      case 'approved':
        filtered = filtered.filter(entry => entry.approved === true);
        break;
      case 'rejected':
        filtered = filtered.filter(entry => entry.rejected === true);
        break;
    }
    
    if (searchQuery.trim() !== '' && (userRole === 'ADMIN' || userRole === 'DEVELOPER' || userRole === 'MANAGER')) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(entry => 
        entry.user && 
        (entry.user.name.toLowerCase().includes(query) || 
         (entry.project && entry.project.toLowerCase().includes(query)))
      );
    }
    
    return filtered;
  };

  const getStatusColor = (entry: TimeEntry) => {
    if (entry.isPaid) return '#28A745'; // Verde para pago
    if (entry.approved) return colors.tint;
    if (entry.rejected) return '#FF4D4F';
    return '#FFA940'; // Laranja para pendente
  };

  const getStatusText = (entry: TimeEntry) => {
    if (entry.isPaid) return 'Pago';
    if (entry.approved) return 'Aprovado';
    if (entry.rejected) return 'Rejeitado';
    return 'Pendente';
  };

  const getStatusIcon = (entry: TimeEntry) => {
    if (entry.approved) return 'checkmark-circle';
    if (entry.rejected) return 'close-circle';
    return 'time';
  };

  const formatDate = (dateString: string) => {
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) {
      return format(parsedDate, "dd 'de' MMMM", { locale: ptBR });
    }
    return 'Data inválida';
  };

  const formatTime = (dateTimeString: string) => {
    const parsedDate = parseISO(dateTimeString);
    if (isValid(parsedDate)) {
      return format(parsedDate, 'HH:mm');
    }
    return 'Hora inválida';
  };

  const handleCreateTimeEntry = async () => {
    if (!date || !startTime || !endTime) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Erro', 'O horário final deve ser maior que o horário inicial.');
      return;
    }

    setSubmitting(true);

    const formattedDate = format(date, 'yyyy-MM-dd');
    
    const startDateTime = new Date(date);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    
    const endDateTime = new Date(date);
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    
    const formattedStartTime = format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss");
    const formattedEndTime = format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss");

    try {
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      
      if (!token) {
        console.error('Token não encontrado');
        setSubmitting(false);
        return;
      }
      
      const timeEntryData = {
        date: formattedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        observation,
        project
      };
      
      const response = await axios.post(`${API_URL}/mobile-time-entries`, timeEntryData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 201) {
        Alert.alert('Sucesso', 'Registro de horas criado com sucesso.');
        setModalVisible(false);
        clearForm();
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Erro ao criar registro de horas:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 409) {
          Alert.alert('Erro', 'Existe um conflito de horário com um registro existente.');
        } else {
          Alert.alert('Erro', error.response.data?.error || 'Erro ao criar registro de horas.');
        }
      } else {
        Alert.alert('Erro', 'Não foi possível criar o registro. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date(new Date().setHours(new Date().getHours() + 1)));
    setObservation('');
    setProject('');
  };

  const openModal = () => {
    clearForm();
    setModalVisible(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const openApprovalModal = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setRejectionReason('');
    setApprovalModalVisible(true);
  };

  const handleApproveTimeEntry = async () => {
    if (!selectedEntry) return;
    
    try {
      setProcessingApproval(true);
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      console.log(`Aprovando entrada ${selectedEntry.id}`);
      
      const response = await axios.put(
        `${API_URL}/mobile-time-entries/${selectedEntry.id}/approve`,
        { approved: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Resposta da aprovação:', response.status);
      
      if (response.status === 200) {
        Alert.alert('Sucesso', 'Entrada de tempo aprovada com sucesso');
        setApprovalModalVisible(false);
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Erro ao aprovar entrada de tempo:', error);
      if (axios.isAxiosError(error)) {
        console.log('Status:', error.response?.status);
        console.log('Dados:', JSON.stringify(error.response?.data, null, 2));
      }
      Alert.alert('Erro', 'Não foi possível aprovar a entrada de tempo');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectTimeEntry = async () => {
    if (!selectedEntry) return;
    
    if (!rejectionReason.trim()) {
      Alert.alert('Erro', 'O motivo da rejeição é obrigatório');
      return;
    }
    
    try {
      setProcessingApproval(true);
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      console.log(`Rejeitando entrada ${selectedEntry.id}`);
      
      const response = await axios.put(
        `${API_URL}/mobile-time-entries/${selectedEntry.id}/approve`,
        { 
          approved: false,
          rejectionReason: rejectionReason.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Resposta da rejeição:', response.status);
      
      if (response.status === 200) {
        Alert.alert('Sucesso', 'Entrada de tempo rejeitada com sucesso');
        setApprovalModalVisible(false);
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Erro ao rejeitar entrada de tempo:', error);
      if (axios.isAxiosError(error)) {
        console.log('Status:', error.response?.status);
        console.log('Dados:', JSON.stringify(error.response?.data, null, 2));
      }
      Alert.alert('Erro', 'Não foi possível rejeitar a entrada de tempo');
    } finally {
      setProcessingApproval(false);
    }
  };

  const renderTimeEntry = ({ item }: { item: TimeEntry }) => (
    <TouchableOpacity
      style={[
        styles.entryCard,
        { 
          backgroundColor: item.isPaid ? (colorScheme === 'dark' ? '#2a3b2a' : '#D4EDDA') : (colorScheme === 'dark' ? '#1E1E1E' : '#F8F9FA'),
          borderColor: item.isPaid ? '#28A745' : (canManageEntry(item) && item.approved === null && item.rejected === null ? '#FFA940' : 'transparent'),
          borderWidth: item.isPaid ? 1 : (canManageEntry(item) && item.approved === null && item.rejected === null ? 4 : 0),
          borderLeftWidth: canManageEntry(item) && item.approved === null && item.rejected === null && !item.isPaid ? 4 : (item.isPaid ? 1 : 0),
        },
        // A borda especial para gerenciáveis só se aplica se não estiver pago
        canManageEntry(item) && 
        item.approved === null && item.rejected === null && !item.isPaid ? 
          { borderLeftColor: '#FFA940' } : {}
      ]}
      onPress={() => {
        if (canManageEntry(item) && item.approved === null && item.rejected === null) {
          openApprovalModal(item);
        } else {
          // Futuramente, pode abrir um modal de visualização de detalhes apenas
          console.log('Visualizando entrada (sem ação de gerenciamento disponível):', item.id);
        }
      }}
      disabled={!(canManageEntry(item) && item.approved === null && item.rejected === null)} // Desabilita o card se não puder gerenciar
    >
      <View style={styles.entryHeader}>
        <Text style={[styles.entryDate, { color: colors.text }]}>
          {formatDate(item.date)}
        </Text>
        <View style={styles.statusContainer}>
          {item.isPaid && (
            <Ionicons
              name="checkmark-done-circle-outline" // Ícone para pago
              size={16}
              color={getStatusColor(item)} // Usa a cor verde definida
              style={styles.statusIcon}
            />
          )}
          <Ionicons
            name={item.isPaid ? 'cash-outline' : getStatusIcon(item) as any} // Muda ícone se pago, senão usa o ícone de status normal
            size={16}
            color={getStatusColor(item)}
            style={[styles.statusIcon, item.isPaid && { marginLeft: 4 }]} // Adiciona margem se ambos os ícones são mostrados
          />
          <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
            {getStatusText(item)}
          </Text>
        </View>
      </View>
      
      {(userRole === 'ADMIN' || userRole === 'DEVELOPER' || userRole === 'MANAGER') && item.user && (
        <View style={styles.userInfoContainer}>
          <Text style={[styles.userNameText, { color: colors.text }]}>
            {item.user.name}
          </Text>
          <Text style={[styles.userRoleText, { color: colors.icon }]}>
            {item.user.role === 'ADMIN' ? 'Administrador' : 
             item.user.role === 'MANAGER' ? 'Gerente' : 
             item.user.role === 'DEVELOPER' ? 'Desenvolvedor' : 'Funcionário'}
          </Text>
        </View>
      )}
      
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: colors.text }]}>
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </Text>
        <Text style={[styles.hoursText, { color: colors.icon }]}>
          {item.totalHours} {item.totalHours === 1 ? 'hora' : 'horas'}
        </Text>
      </View>
      
      {item.project && (
        <Text style={[styles.projectText, { color: colors.text }]}>
          Projeto: {item.project}
        </Text>
      )}
      
      {item.observation && (
        <Text style={[styles.observationText, { color: colors.icon }]}>
          {item.observation}
        </Text>
      )}
      
      {item.rejected && item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Motivo da rejeição:</Text>
          <Text style={styles.rejectionReason}>{item.rejectionReason}</Text>
        </View>
      )}
      
      {(userRole === 'ADMIN' || userRole === 'DEVELOPER' || userRole === 'MANAGER') && 
       item.approved === null && item.rejected === null && (
        <View style={styles.actionButtonsContainer}>
          {/* Os botões de Aprovar/Rejeitar são mostrados dentro do ApprovalModal, 
              aqui apenas indicamos que a entrada é "analisável" pelo card e onPress. 
              Se houvesse botões diretos no card, eles seriam condicionados por canManageEntry também.
          */}
          <Text style={{color: colors.text, fontStyle: 'italic'}}>
            {canManageEntry(item) ? 'Toque para analisar' : 'Visualização'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'all' && { backgroundColor: colors.tint + '20' }
        ]}
        onPress={() => setFilter('all')}
      >
        <Text
          style={[
            styles.filterText,
            { color: filter === 'all' ? colors.tint : colors.icon }
          ]}
        >
          Todos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'pending' && { backgroundColor: '#FFA94020' }
        ]}
        onPress={() => setFilter('pending')}
      >
        <Text
          style={[
            styles.filterText,
            { color: filter === 'pending' ? '#FFA940' : colors.icon }
          ]}
        >
          Pendentes
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'approved' && { backgroundColor: colors.tint + '20' }
        ]}
        onPress={() => setFilter('approved')}
      >
        <Text
          style={[
            styles.filterText,
            { color: filter === 'approved' ? colors.tint : colors.icon }
          ]}
        >
          Aprovados
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'rejected' && { backgroundColor: '#FF4D4F20' }
        ]}
        onPress={() => setFilter('rejected')}
      >
        <Text
          style={[
            styles.filterText,
            { color: filter === 'rejected' ? '#FF4D4F' : colors.icon }
          ]}
        >
          Rejeitados
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => {
    if (userRole !== 'ADMIN' && userRole !== 'DEVELOPER' && userRole !== 'MANAGER') {
      return null;
    }
    
    return (
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }
        ]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nome ou projeto..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderDateTimePicker = () => {
    return (
      <>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
        
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartTimeChange}
            minuteInterval={15}
          />
        )}
        
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndTimeChange}
            minuteInterval={15}
          />
        )}
      </>
    );
  };

  const renderAddModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Registro de Hora</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Data *</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {format(date, 'dd/MM/yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.icon} />
            </TouchableOpacity>
            
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Início *</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={[styles.timeButtonText, { color: colors.text }]}>
                    {format(startTime, 'HH:mm')}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeInputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Fim *</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }]}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={[styles.timeButtonText, { color: colors.text }]}>
                    {format(endTime, 'HH:mm')}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Projeto</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5', color: colors.text }]}
              placeholder="Nome do projeto"
              placeholderTextColor={colors.icon}
              value={project}
              onChangeText={setProject}
            />
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Observação</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5', color: colors.text }]}
              placeholder="Descreva suas atividades"
              placeholderTextColor={colors.icon}
              value={observation}
              onChangeText={setObservation}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
            onPress={handleCreateTimeEntry}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {renderDateTimePicker()}
    </Modal>
  );

  const renderApprovalModal = () => {
    if (!selectedEntry) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={approvalModalVisible}
        onRequestClose={() => setApprovalModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Aprovar/Rejeitar Registro</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setApprovalModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.entryDetailsContainer}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Data:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDate(selectedEntry.date)}
                </Text>
              </View>
              
              <View style={styles.entryDetailsContainer}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Horário:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatTime(selectedEntry.startTime)} - {formatTime(selectedEntry.endTime)}
                </Text>
              </View>
              
              <View style={styles.entryDetailsContainer}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Total de Horas:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedEntry.totalHours} {selectedEntry.totalHours === 1 ? 'hora' : 'horas'}
                </Text>
              </View>
              
              {selectedEntry.user && (
                <View style={styles.entryDetailsContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Funcionário:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedEntry.user.name}
                  </Text>
                </View>
              )}
              
              {selectedEntry.project && (
                <View style={styles.entryDetailsContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Projeto:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedEntry.project}
                  </Text>
                </View>
              )}
              
              {selectedEntry.observation && (
                <View style={styles.entryDetailsContainer}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Observação:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedEntry.observation}
                  </Text>
                </View>
              )}
              
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 20 }]}>
                Motivo da rejeição (obrigatório para rejeitar)
              </Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5', color: colors.text }]}
                placeholder="Informe o motivo da rejeição"
                placeholderTextColor={colors.icon}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>
            
            <View style={styles.approvalButtonsContainer}>
              <TouchableOpacity
                style={[styles.rejectButton, { opacity: processingApproval ? 0.7 : 1 }]}
                onPress={handleRejectTimeEntry}
                disabled={processingApproval}
              >
                {processingApproval ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Rejeitar</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.approveButton, { opacity: processingApproval ? 0.7 : 1 }]}
                onPress={handleApproveTimeEntry}
                disabled={processingApproval}
              >
                {processingApproval ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Aprovar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Registros de Horas</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredEntries = getFilteredEntries();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Registros de Horas</Text>
        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {currentUser?.role === 'MANAGER' && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'team' && styles.activeTabButton, {backgroundColor: activeTab === 'team' ? colors.tint : colors.border }]}
            onPress={() => setActiveTab('team')}
          >
            <Text style={[styles.tabButtonText, {color: activeTab === 'team' ? 'white' : colors.text}, activeTab === 'team' && styles.activeTabButtonText]}>Registros da Equipe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mine' && styles.activeTabButton, {backgroundColor: activeTab === 'mine' ? colors.tint : colors.border}]}
            onPress={() => setActiveTab('mine')}
          >
            <Text style={[styles.tabButtonText, {color: activeTab === 'mine' ? 'white' : colors.text}, activeTab === 'mine' && styles.activeTabButtonText]}>Minhas Horas</Text>
          </TouchableOpacity>
        </View>
      )}
      {renderFilters()}
      {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.role === 'MANAGER') && renderSearchBar()}
      {renderAddModal()}
      {renderApprovalModal()}
      
      {timeEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.icon} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Nenhum registro de hora encontrado
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.icon }]}>
            Toque no botão + para adicionar um novo registro
          </Text>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="filter-outline" size={64} color={colors.icon} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Nenhum registro encontrado para o filtro selecionado
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          renderItem={renderTimeEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.tint]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

export default TimeEntriesScreenComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A7EA4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 15,
  },
  hoursText: {
    fontSize: 15,
  },
  projectText: {
    fontSize: 15,
    marginBottom: 4,
  },
  observationText: {
    fontSize: 14,
  },
  rejectionContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FF4D4F15',
    borderRadius: 8,
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4D4F',
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: 13,
    color: '#FF4D4F',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    maxHeight: '80%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textarea: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInputContainer: {
    width: '48%',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  timeButtonText: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#0A7EA4',
    width: '90%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionHint: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  approvalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  approveButton: {
    backgroundColor: '#52C41A',
    width: '48%',
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF4D4F',
    width: '48%',
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  entryDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  activeTabButton: {
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabButtonText: {
    fontWeight: 'bold',
  },
}); 