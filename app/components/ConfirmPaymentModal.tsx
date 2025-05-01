import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmPayment } from '../services/paymentService';

type ConfirmPaymentModalProps = {
  isVisible: boolean;
  onClose: () => void;
  paymentId: string;
  onConfirmed: () => void;
};

const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  isVisible,
  onClose,
  paymentId,
  onConfirmed
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await confirmPayment({
        paymentId,
        confirmed: true,
        notes: notes.trim() || undefined
      });
      
      setSuccess(true);
      
      // Após 1 segundo, fechar o modal e notificar o componente pai
      setTimeout(() => {
        onConfirmed();
        onClose();
        setSuccess(false);
        setNotes('');
      }, 1000);
      
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      setError('Não foi possível confirmar o pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirmar Recebimento</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#16a34a" />
              <Text style={styles.successText}>Pagamento confirmado com sucesso!</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContainer}>
              <Text style={styles.description}>
                Confirme que você recebeu este pagamento. Esta ação não pode ser desfeita.
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Observações (opcional):</Text>
                <TextInput
                  style={styles.input}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Adicione observações sobre o pagamento..."
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  editable={!loading}
                />
              </View>
              
              {error && (
                <Text style={styles.error}>{error}</Text>
              )}
              
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.confirmButton, loading && styles.disabledButton]} 
                  onPress={handleConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  description: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#334155',
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#0284c7',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.7,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 16,
    color: '#334155',
    marginTop: 12,
    textAlign: 'center',
  },
  scrollContainer: {
    flexGrow: 0,
  },
});

export default ConfirmPaymentModal; 