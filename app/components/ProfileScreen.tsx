import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from './LogoutButton';

// URL base da API
const API_URL = 'https://modularcompany.vercel.app/api';

// Tipo para o usuário
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
  hourlyRate?: number;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    plan: string;
  };
}

// Tipo para os papéis de usuário
type UserRole = 'DEVELOPER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

const ProfileScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  // Carregar dados do perfil ao montar o componente
  useEffect(() => {
    checkTokenAndFetchProfile();
  }, []);

  // Verificar token e buscar perfil
  const checkTokenAndFetchProfile = async () => {
    try {
      setLoading(true);
      
      // Verificar se há token
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        console.log('Token não encontrado, redirecionando para login');
        router.replace('/(auth)/login');
        return;
      }
      
      // Token encontrado, buscar perfil
      await fetchUserProfile();
    } catch (err) {
      console.error('Erro ao verificar token:', err);
      setError('Erro ao verificar autenticação');
    }
  };

  // Buscar perfil do usuário
  const fetchUserProfile = async () => {
    try {
      setError(null);
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        console.error('Token não encontrado no AsyncStorage');
        throw new Error('Usuário não autenticado');
      }

      console.log('Buscando perfil com token:', token.substring(0, 15) + '...');
      
      try {
        const response = await axios.get(`${API_URL}/mobile-profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

        console.log('Resposta da API recebida:', response.status);

      if (response.data && response.data.user) {
          console.log('Dados do usuário recebidos:', JSON.stringify(response.data.user).substring(0, 100) + '...');
        setUser(response.data.user);
        setName(response.data.user.name);
        setEmail(response.data.user.email);
        } else {
          console.error('Resposta da API não contém dados do usuário:', response.data);
          throw new Error('Dados do usuário não encontrados na resposta da API');
        }
      } catch (apiError) {
        if (axios.isAxiosError(apiError)) {
          console.error('Erro na requisição à API:', apiError.message, apiError.response?.status, apiError.response?.data);
          
          if (apiError.response?.status === 401) {
            throw new Error('Sessão expirada ou token inválido. Por favor, faça login novamente.');
          } else if (apiError.response?.status === 404) {
            throw new Error('Endpoint não encontrado. Verifique a URL da API.');
          } else if (apiError.response?.data?.error) {
            throw new Error(apiError.response.data.error);
          }
        }
        throw apiError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar perfil';
      setError(errorMessage);
      console.error('Erro ao buscar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  // Salvar alterações no perfil
  const saveProfile = async () => {
    // Validação básica
    if (!name.trim() || !email.trim()) {
      Alert.alert('Erro', 'Nome e e-mail são obrigatórios');
      return;
    }

    // Validação de e-mail com regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'E-mail inválido');
      return;
    }

    try {
      setSavingChanges(true);
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await axios.put(
        `${API_URL}/mobile-profile`,
        { name, email },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data && response.data.user) {
        setUser(response.data.user);
        
        // Atualizar os dados do usuário armazenados localmente
        const userData = await AsyncStorage.getItem('@ModularCompany:user');
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          parsedUserData.name = response.data.user.name;
          parsedUserData.email = response.data.user.email;
          await AsyncStorage.setItem('@ModularCompany:user', JSON.stringify(parsedUserData));
        }
        
        Alert.alert('Sucesso', 'Perfil atualizado com sucesso');
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setSavingChanges(false);
    }
  };

  // Alterar senha do usuário
  const changePassword = async () => {
    // Validação das senhas
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Todos os campos são obrigatórios');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setSavingChanges(true);
      
      const token = await AsyncStorage.getItem('@ModularCompany:token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await axios.post(
        `${API_URL}/mobile-auth/change-password`,
        { 
          currentPassword, 
          newPassword, 
          confirmPassword 
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data && response.data.success) {
        Alert.alert('Sucesso', 'Senha alterada com sucesso');
        
        // Limpar os campos
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Fechar o formulário de alteração de senha
        setIsChangingPassword(false);
      }
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      
      // Verificar se é um erro específico de senha atual incorreta
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        Alert.alert('Erro', err.response.data.error || 'Senha atual incorreta');
      } else {
        Alert.alert('Erro', 'Não foi possível alterar a senha. Tente novamente.');
      }
    } finally {
      setSavingChanges(false);
    }
  };

  // Função de logout - versão direta com múltiplas abordagens
  const handleLogout = async () => {
    try {
      // Limpar dados do usuário e tokens
      await AsyncStorage.multiRemove(['@ModularCompany:token', '@ModularCompany:refreshToken', '@ModularCompany:user']);
              
      // Redirecionar para a página de signout que vai redirecionar apropriadamente para login
      router.replace('/signout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, tente redirecionar
      router.replace('/signout');
              }
  };

  // Formatadores para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleName = (role: string): string => {
    const roles: Record<UserRole, string> = {
      'DEVELOPER': 'Desenvolvedor',
      'ADMIN': 'Administrador',
      'MANAGER': 'Gerente',
      'EMPLOYEE': 'Funcionário'
    };
    
    return (roles as Record<string, string>)[role] || role;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButtonError} onPress={handleLogout}>
          <Ionicons name="exit-outline" size={24} color="white" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Verificação adicional para garantir que temos dados do usuário antes de renderizar
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Não foi possível carregar os dados do usuário.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho do perfil */}
      <View style={styles.headerContainer}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          {!isEditing ? (
            <>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>{user?.role ? getRoleName(user.role) : ''}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nome"
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-mail"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </>
          )}
        </View>
        {!isEditing ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil-outline" size={24} color="#0066CC" />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setIsEditing(false);
                setName(user?.name || '');
                setEmail(user?.email || '');
              }}
            >
              <Ionicons name="close-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={saveProfile}
              disabled={savingChanges}
            >
              {savingChanges ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark-outline" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Informações da empresa */}
      {user?.company && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Empresa</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{user.company.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plano:</Text>
              <Text style={styles.infoValue}>{user.company.plan}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Informações adicionais */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Informações</Text>
        <View style={styles.sectionContent}>
          {user?.hourlyRate !== undefined && user?.hourlyRate !== null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor/Hora:</Text>
              <Text style={styles.infoValue}>R$ {user.hourlyRate.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cadastrado em:</Text>
            <Text style={styles.infoValue}>{user?.createdAt ? formatDate(user.createdAt) : '-'}</Text>
          </View>
        </View>
      </View>

      {/* Formulário de alteração de senha */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Senha</Text>
        
        {!isChangingPassword ? (
          <TouchableOpacity 
            style={styles.changePasswordButton}
            onPress={() => setIsChangingPassword(true)}
          >
            <Text style={styles.changePasswordButtonText}>Alterar senha</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.passwordFormContainer}>
            <TextInput
              style={styles.passwordInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Senha atual"
              secureTextEntry
            />
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova senha"
              secureTextEntry
            />
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar nova senha"
              secureTextEntry
            />
            
            <View style={styles.passwordFormButtons}>
              <TouchableOpacity 
                style={styles.cancelPasswordButton}
                onPress={() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelPasswordButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.savePasswordButton}
                onPress={changePassword}
                disabled={savingChanges}
              >
                {savingChanges ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.savePasswordButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Botão de logout */}
      <LogoutButton />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  cancelButton: {
    padding: 8,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 40,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  sectionContainer: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  changePasswordButton: {
    padding: 16,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
  },
  passwordFormContainer: {
    padding: 16,
  },
  passwordInput: {
    height: 40,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
  },
  passwordFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelPasswordButton: {
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  cancelPasswordButtonText: {
    color: '#666',
  },
  savePasswordButton: {
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  savePasswordButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButtonError: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: '80%',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});

export default ProfileScreen; 