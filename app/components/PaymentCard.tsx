import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Payment } from '../../services/paymentService';

type PaymentCardProps = {
  payment: Payment;
  onPress: (id: string) => void;
};

export default function PaymentCard({ payment, onPress }: PaymentCardProps) {
  const formattedDate = format(parseISO(payment.date), 'dd/MM/yyyy', { locale: ptBR });
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 360;
  
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={isSmallScreen ? 16 : 18} color="#16a34a" />;
      case 'pending':
        return <Ionicons name="time" size={isSmallScreen ? 16 : 18} color="#f59e0b" />;
      case 'failed':
        return <Ionicons name="close-circle" size={isSmallScreen ? 16 : 18} color="#dc2626" />;
      default:
        return <Ionicons name="help-circle" size={isSmallScreen ? 16 : 18} color="#6b7280" />;
    }
  };
  
  const getStatusText = () => {
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

  const getPaymentMethodIcon = () => {
    switch (payment.paymentMethod) {
      case 'bank_transfer':
        return <Ionicons name="card" size={isSmallScreen ? 14 : 16} color="#64748b" />;
      case 'pix':
        return <Ionicons name="flash" size={isSmallScreen ? 14 : 16} color="#64748b" />;
      case 'cash':
        return <Ionicons name="cash" size={isSmallScreen ? 14 : 16} color="#64748b" />;
      default:
        return <Ionicons name="cash" size={isSmallScreen ? 14 : 16} color="#64748b" />;
    }
  };

  const getPaymentMethodText = () => {
    switch (payment.paymentMethod) {
      case 'bank_transfer':
        return 'Transferência';
      case 'pix':
        return 'PIX';
      case 'cash':
        return 'Dinheiro';
      default:
        return payment.paymentMethod;
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(payment.id)}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          <Text style={[styles.amount, isSmallScreen && styles.smallAmount]}>
            CAD$ {payment.amount.toFixed(2).replace('.', ',')}
          </Text>
          
          <Text style={styles.description} numberOfLines={1}>
            {payment.description || 'Sem descrição'}
          </Text>
          
          {payment.user && payment.user.name && (
            <View style={styles.recipientContainer}>
              <Ionicons name="person-outline" size={isSmallScreen ? 12 : 14} color="#64748b" />
              <Text style={styles.recipientText}>{payment.user.name}</Text>
            </View>
          )}
          
          <View style={styles.infoContainer}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={isSmallScreen ? 12 : 14} color="#64748b" />
              <Text style={styles.infoText}>{formattedDate}</Text>
            </View>
            
            <View style={styles.methodContainer}>
              {getPaymentMethodIcon()}
              <Text style={styles.infoText}>{getPaymentMethodText()}</Text>
            </View>
            
            <View style={styles.hoursContainer}>
              <Ionicons name="time-outline" size={isSmallScreen ? 12 : 14} color="#64748b" />
              <Text style={styles.infoText}>{payment.totalHours}h</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.rightContent}>
          <View style={styles.statusContainer}>
            {getStatusIcon()}
            <Text style={[
              styles.statusText,
              payment.status === 'completed' && styles.statusCompleted,
              payment.status === 'pending' && styles.statusPending,
              payment.status === 'failed' && styles.statusFailed
            ]}>
              {getStatusText()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={isSmallScreen ? 16 : 18} color="#94a3b8" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 8,
  },
  rightContent: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  smallAmount: {
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  recipientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipientText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 4,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  statusCompleted: {
    color: '#16a34a',
  },
  statusPending: {
    color: '#f59e0b',
  },
  statusFailed: {
    color: '#dc2626',
  },
}); 