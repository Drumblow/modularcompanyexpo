import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { UserBalanceResponse } from '../../services/paymentService';

type BalanceCardProps = {
  balanceData: UserBalanceResponse;
};

export default function BalanceCard({ balanceData }: BalanceCardProps) {
  // Formatar datas do período, tratando valores inválidos
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return 'N/D'; // Retorna N/D se a string for nula ou undefined
    }
    const parsedDate = parseISO(dateString);
    if (isValid(parsedDate)) {
      return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
    }
    return dateString; // Retorna a string original se não for uma data ISO válida
  };
  
  const startDate = formatDate(balanceData?.period?.startDate);
  const endDate = formatDate(balanceData?.period?.endDate);
  
  // Obter largura da tela para ajustes responsivos
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 360;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saldo atual</Text>
        <View style={styles.periodContainer}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.periodText}>
            {startDate} - {endDate}
          </Text>
        </View>
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceAmount}>
          R$ {balanceData.balance.balance.toFixed(2).replace('.', ',')}
        </Text>
        <Text style={styles.balanceLabel}>Valor a receber</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statsRow, isSmallScreen && styles.statsRowSmall]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{balanceData.balance.totalApprovedHours}h</Text>
            <Text style={styles.statLabel}>Horas aprovadas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{balanceData.balance.unpaidHours}h</Text>
            <Text style={styles.statLabel}>Horas não pagas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>R$ {balanceData.balance.totalPaid.toFixed(2).replace('.', ',')}</Text>
            <Text style={styles.statLabel}>Total recebido</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>R$ {balanceData.balance.hourlyRate.toFixed(2).replace('.', ',')}</Text>
            <Text style={[styles.statLabel, isSmallScreen && styles.smallText]}>Valor por hora</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  balanceContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0284c7',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsRowSmall: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 11,
  }
}); 