import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { fetchPaymentDetails, Payment, TimeEntry, confirmPayment } from '../services/paymentService';
import { getCurrentUserId } from '../services/userService';
import ConfirmPaymentModal from './components/ConfirmPaymentModal';

type PaymentTimeEntry = Pick<
  TimeEntry, 
  'id' | 'date' | 'startTime' | 'endTime' | 'totalHours' | 'observation' | 'project'
> & { amount: number };

type TimeEntryItemProps = {
  item: PaymentTimeEntry;
};

const TimeEntryItem = ({ item }: TimeEntryItemProps) => {
  const formattedDate = format(parseISO(item.date), 'dd/MM/yyyy', { locale: ptBR });
  const startTime = format(parseISO(item.startTime), 'HH:mm', { locale: ptBR });
  const endTime = format(parseISO(item.endTime), 'HH:mm', { locale: ptBR });

  return (
    <View style={styles.entryItem}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formattedDate}</Text>
        <Text style={styles.entryHours}>{item.totalHours}h</Text>
      </View>
      
      <View style={styles.entryTimePeriod}>
        <Text style={styles.entryTime}>{startTime} - {endTime}</Text>
        <Text style={styles.entryAmount}>CAD$ {item.amount.toFixed(2).replace('.', ',')}</Text>
      </View>
      
      {item.project && (
        <Text style={styles.entryProject}>{item.project}</Text>
      )}
      
      {item.observation && (
        <Text style={styles.entryObservation} numberOfLines={2}>
          {item.observation}
        </Text>
      )}
    </View>
  );
};

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchId = async () => {
      const userId = await getCurrentUserId();
      console.log('[PaymentDetails] Current User ID:', userId);
      setCurrentUserId(userId);
    };
    fetchId();
  }, []);

  const loadPaymentDetails = async () => {
    if (!id) {
      setError('ID do pagamento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetchPaymentDetails(id!);
      console.log('[PaymentDetails] API Response for Payment:', JSON.stringify(response.payment, null, 2));
      setPayment(response.payment);
    } catch (err) {
      console.error('Erro ao carregar detalhes do pagamento:', err);
      setError('Não foi possível carregar os detalhes do pagamento. Tente novamente.');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setConfirmModalVisible(true);
  };

  const handlePaymentConfirmed = () => {
    loadPaymentDetails();
  };

  useEffect(() => {
    loadPaymentDetails();
  }, [id]);

  const getFormattedDate = (dateString: string) => {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getPaymentStatusIcon = () => {
    if (!payment) return null;

    switch (payment.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#16a34a" />;
      case 'pending':
        return <Ionicons name="time" size={20} color="#f59e0b" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#dc2626" />;
      default:
        return <Ionicons name="help-circle" size={20} color="#6b7280" />;
    }
  };

  const getPaymentStatusText = () => {
    if (!payment) return '';

    switch (payment.status) {
      case 'completed':
        return 'Concluído';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return payment.status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Carregando detalhes do pagamento...</Text>
      </View>
    );
  }

  if (error || !payment) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={50} color="#dc2626" />
        <Text style={styles.errorText}>{error || 'Erro ao carregar os detalhes do pagamento'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log('[PaymentDetails] Checking confirmation:', {
    status: payment.status,
    currentUserId,
    recipientId: payment.user?.id
  });
  const canConfirm = payment.status === 'pending' && currentUserId === payment.user?.id;

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Detalhes do Pagamento</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.reference}>Referência: {payment.reference}</Text>
            
            <View style={styles.statusContainer}>
              {getPaymentStatusIcon()}
              <Text style={styles.statusText}>{getPaymentStatusText()}</Text>
            </View>
          </View>
          
          <Text style={styles.amount}>
            CAD$ {payment.amount.toFixed(2).replace('.', ',')}
          </Text>
          
          <Text style={styles.description}>
            {payment.description || 'Sem descrição'}
          </Text>
          
          {payment.user && payment.createdBy && payment.user.id !== payment.createdBy.id && (
             <View style={styles.infoRow}>
               <View style={[styles.infoItem, {flexBasis: '100%'}]}> 
                 <Text style={styles.infoLabel}>Para</Text>
                 <Text style={styles.infoValue}>{payment.user.name}</Text>
               </View>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data</Text>
              <Text style={styles.infoValue}>{getFormattedDate(payment.date)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Total de Horas</Text>
              <Text style={styles.infoValue}>{payment.totalHours}h</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Método</Text>
              <Text style={styles.infoValue}>
                {payment.paymentMethod === 'bank_transfer' ? 'Transferência Bancária' :
                 payment.paymentMethod === 'etransfer' ? 'E-transfer' :
                 payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Criado por</Text>
              <Text style={styles.infoValue}>{payment.createdBy?.name || 'Desconhecido'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Período</Text>
              <Text style={styles.infoValue}>
                {getFormattedDate(payment.periodStart)} - {getFormattedDate(payment.periodEnd)}
              </Text>
            </View>
          </View>

          {canConfirm && (
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirmPayment}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Confirmar Recebimento</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {payment.timeEntries && payment.timeEntries.length > 0 && (
        <View style={styles.entriesSection}>
          <Text style={styles.entriesSectionTitle}>Registros Incluídos</Text>
          
          <FlatList
            data={payment.timeEntries}
            keyExtractor={(item) => item.id}
              renderItem={({ item }) => <TimeEntryItem item={item as PaymentTimeEntry} />}
            scrollEnabled={false}
            style={styles.entriesList}
          />
        </View>
        )}
      </ScrollView>

      {payment && (
        <ConfirmPaymentModal
          isVisible={confirmModalVisible}
          onClose={() => setConfirmModalVisible(false)}
          paymentId={payment.id}
          onConfirmed={handlePaymentConfirmed}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollViewContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
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
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reference: {
    fontSize: 14,
    color: '#64748b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#64748b',
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  entriesSection: {
    marginTop: 4,
    marginBottom: 24,
  },
  entriesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  entriesList: {
    marginTop: 8,
  },
  entryItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  entryHours: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  entryTimePeriod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  entryTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  entryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
  entryProject: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#4b5563',
    marginBottom: 4,
  },
  entryObservation: {
    fontSize: 13,
    color: '#374151',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 5,
  },
}); 