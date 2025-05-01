import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isAfter, isBefore, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipo para o relatório
interface Report {
  title: string;
  user: {
    id: string;
    name: string;
    email: string;
    hourlyRate: number;
  };
  company: {
    id: string;
    name: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEntries: number;
    totalHours: number;
    approvedEntries: number;
    approvedHours: number;
    totalValue: number;
    paidHours: number;
    paidAmount: number;
    unpaidHours: number;
    unpaidAmount: number;
  };
  entries: ReportEntry[];
  payments: ReportPayment[];
  generatedAt: string;
}

// Tipo para entrada de registro no relatório
interface ReportEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  value: number;
  observation: string;
  project: string;
  status: string;
  paid: boolean;
}

// Tipo para pagamento no relatório
interface ReportPayment {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  status: string;
  entriesCount: number;
}

const ReportScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Report | null>(null);
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [includeRejected, setIncludeRejected] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Gerar relatório com base nas datas selecionadas
  const generateReport = async () => {
    // Validação de datas
    if (isAfter(startDate, endDate)) {
      Alert.alert('Erro', 'A data inicial não pode ser posterior à data final');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await axios.post(
        'https://modularcompany.vercel.app/api/mobile-reports/export',
        {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          includeRejected,
          format: 'detailed'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.report) {
        setReportData(response.data.report);
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError('Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  // Selecionar mês atual
  const selectCurrentMonth = () => {
    const now = new Date();
    setStartDate(startOfMonth(now));
    setEndDate(endOfMonth(now));
  };

  // Selecionar mês anterior
  const selectPreviousMonth = () => {
    const previousMonth = addMonths(startDate, -1);
    setStartDate(startOfMonth(previousMonth));
    setEndDate(endOfMonth(previousMonth));
  };

  // Selecionar próximo mês
  const selectNextMonth = () => {
    const nextMonth = addMonths(startDate, 1);
    setStartDate(startOfMonth(nextMonth));
    setEndDate(endOfMonth(nextMonth));
  };

  // Manipular alteração na data inicial
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  // Manipular alteração na data final
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  // Formatar horas
  const formatHours = (hours: number) => {
    return `${hours.toFixed(1).replace('.', ',')}h`;
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (err) {
      console.error('Erro ao formatar data:', err);
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      {/* Seleção de período */}
      <View style={styles.periodSelector}>
        <Text style={styles.sectionTitle}>Período do Relatório</Text>
        
        <View style={styles.dateControls}>
          <TouchableOpacity
            style={styles.monthButton}
            onPress={selectPreviousMonth}
          >
            <Ionicons name="chevron-back" size={20} color="#0066CC" />
          </TouchableOpacity>
          
          <View style={styles.currentPeriod}>
            <Text style={styles.currentPeriodText}>
              {format(startDate, 'MMMM yyyy', { locale: ptBR })}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.monthButton}
            onPress={selectNextMonth}
          >
            <Ionicons name="chevron-forward" size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.datePickersContainer}>
          <View style={styles.datePickerWrapper}>
            <Text style={styles.datePickerLabel}>Data Inicial:</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                {format(startDate, 'dd/MM/yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#0066CC" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerWrapper}>
            <Text style={styles.datePickerLabel}>Data Final:</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                {format(endDate, 'dd/MM/yyyy')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#0066CC" />
            </TouchableOpacity>
          </View>
        </View>
        
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
          />
        )}
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setIncludeRejected(!includeRejected)}
          >
            <View style={[
              styles.checkbox,
              includeRejected && styles.checkboxSelected
            ]}>
              {includeRejected && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
            <Text style={styles.optionText}>Incluir registros rejeitados</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={generateReport}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color="white" style={styles.generateButtonIcon} />
              <Text style={styles.generateButtonText}>Gerar Relatório</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Exibição do relatório */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : reportData ? (
        <ScrollView style={styles.reportContainer}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{reportData.title}</Text>
            <Text style={styles.reportSubtitle}>
              Gerado em {formatDate(reportData.generatedAt)}
            </Text>
          </View>
          
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Resumo</Text>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Registros</Text>
                  <Text style={styles.summaryValue}>{reportData.summary.totalEntries}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total de Horas</Text>
                  <Text style={styles.summaryValue}>{formatHours(reportData.summary.totalHours)}</Text>
                </View>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Registros Aprovados</Text>
                  <Text style={styles.summaryValue}>{reportData.summary.approvedEntries}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Horas Aprovadas</Text>
                  <Text style={styles.summaryValue}>{formatHours(reportData.summary.approvedHours)}</Text>
                </View>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Valor Total</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                    {formatCurrency(reportData.summary.totalValue)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Horas Pagas</Text>
                  <Text style={styles.summaryValue}>{formatHours(reportData.summary.paidHours)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Valor Pago</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(reportData.summary.paidAmount)}</Text>
                </View>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Horas a Receber</Text>
                  <Text style={styles.summaryValue}>{formatHours(reportData.summary.unpaidHours)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Valor a Receber</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                    {formatCurrency(reportData.summary.unpaidAmount)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {reportData.entries.length > 0 && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Registros de Horas</Text>
              
              {reportData.entries.map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    <View style={[
                      styles.entryStatusBadge,
                      entry.status === 'Aprovado' ? styles.approvedBadge : 
                      entry.status === 'Rejeitado' ? styles.rejectedBadge : 
                      styles.pendingBadge
                    ]}>
                      <Text style={styles.entryStatusText}>{entry.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Horário:</Text>
                    <Text style={styles.entryValue}>{entry.startTime} - {entry.endTime}</Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Total de Horas:</Text>
                    <Text style={styles.entryValue}>{formatHours(entry.totalHours)}</Text>
                  </View>
                  
                  {entry.project && (
                    <View style={styles.entryRow}>
                      <Text style={styles.entryLabel}>Projeto:</Text>
                      <Text style={styles.entryValue}>{entry.project}</Text>
                    </View>
                  )}
                  
                  {entry.observation && (
                    <View style={styles.entryRow}>
                      <Text style={styles.entryLabel}>Observação:</Text>
                      <Text style={styles.entryValue}>{entry.observation}</Text>
                    </View>
                  )}
                  
                  <View style={styles.entryFooter}>
                    <Text style={styles.entryLabel}>Valor:</Text>
                    <Text style={styles.entryValueAmount}>{formatCurrency(entry.value)}</Text>
                    {entry.paid ? (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>Pago</Text>
                      </View>
                    ) : (
                      <View style={styles.unpaidBadge}>
                        <Text style={styles.unpaidBadgeText}>A receber</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {reportData.payments.length > 0 && (
            <View style={styles.reportSection}>
              <Text style={styles.reportSectionTitle}>Pagamentos</Text>
              
              {reportData.payments.map(payment => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                    <View style={[
                      styles.paymentStatusBadge,
                      payment.status === 'completed' ? styles.completedBadge : styles.pendingBadge
                    ]}>
                      <Text style={styles.paymentStatusText}>
                        {payment.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Referência:</Text>
                    <Text style={styles.paymentValue}>{payment.reference}</Text>
                  </View>
                  
                  {payment.description && (
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Descrição:</Text>
                      <Text style={styles.paymentValue}>{payment.description}</Text>
                    </View>
                  )}
                  
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Registros:</Text>
                    <Text style={styles.paymentValue}>{payment.entriesCount}</Text>
                  </View>
                  
                  <View style={styles.paymentFooter}>
                    <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : !loading && !generating && (
        <View style={styles.noDataContainer}>
          <Ionicons name="document-outline" size={60} color="#999" />
          <Text style={styles.noDataText}>
            Selecione um período e gere um relatório para visualizar os dados
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  periodSelector: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  currentPeriod: {
    paddingHorizontal: 16,
  },
  currentPeriodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0066CC',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#A1BFE4',
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  reportContainer: {
    flex: 1,
  },
  reportHeader: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  reportSection: {
    backgroundColor: 'white',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  summaryContainer: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  summaryValueHighlight: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  entryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  entryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvedBadge: {
    backgroundColor: '#E6F7EE',
  },
  pendingBadge: {
    backgroundColor: '#FFF9E6',
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
  },
  entryStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  entryLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  entryValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  entryValueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    marginRight: 'auto',
  },
  paidBadge: {
    backgroundColor: '#E6F7EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  unpaidBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unpaidBadgeText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  paymentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#E6F7EE',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  paymentLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});

export default ReportScreen; 