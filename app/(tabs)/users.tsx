import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  TextInput, ActivityIndicator, Modal, ScrollView, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { 
  fetchCompanyUsers, 
  SelectableUser, // Use this type for fetched users
  createUser, 
  CreateUserData, 
  getCurrentUserData,
  updateUser,       // Added updateUser
  UpdateUserData    // Added UpdateUserData
} from '../../services/userService';
import { Picker as NativePicker } from '@react-native-picker/picker'; // For Role selection

// Use SelectableUser which matches the API response for listing
type User = SelectableUser;

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null); // Store logged in user data
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // --- State for Create User Modal ---
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE'); // Default to Employee
  const [newUserHourlyRate, setNewUserHourlyRate] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  // --- New fields state ---
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserDob, setNewUserDob] = useState(''); // YYYY-MM-DD
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserCity, setNewUserCity] = useState('');
  const [newUserProvince, setNewUserProvince] = useState('');
  const [newUserPostalCode, setNewUserPostalCode] = useState('');
  // --- End Create Modal State ---

  // --- State for Edit User Modal ---
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  // --- End Edit Modal State ---

  // Fetch logged-in user data and their role initially
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const userData = await getCurrentUserData();
        if (userData) {
          setCurrentUserData(userData); // Store user data
          const role = userData.role;
          setUserRole(role);
          
          // Fetch company users if authorized
          if (role && ['ADMIN', 'MANAGER', 'DEVELOPER'].includes(role)) {
            await fetchUsers(); // Use await here
          } else {
             setLoading(false); // Stop loading if not authorized to view users
          }
        } else {
          // Handle case where user data couldn't be fetched
          setUserRole(null);
          setLoading(false); 
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setUserRole(null);
        setLoading(false);
      }
      // setLoading(false) moved inside conditions or to finally if needed
    };

    fetchInitialData();
  }, []);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchCompanyUsers();
      // Ensure fetchedUsers is always an array
      const usersArray = Array.isArray(fetchedUsers) ? fetchedUsers : [];
      setUsers(usersArray); 
      setFilteredUsers(usersArray); 
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]); // Clear users on error
      setFilteredUsers([]);
      // Optionally set an error state to display to the user
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // --- Modal Functions ---
  const resetCreateForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserConfirmPassword('');
    setNewUserRole('EMPLOYEE');
    setNewUserHourlyRate('');
    setCreateUserError(null);
    setCreatingUser(false);
    // Reset new fields
    setNewUserPhone('');
    setNewUserDob('');
    setNewUserAddress('');
    setNewUserCity('');
    setNewUserProvince('');
    setNewUserPostalCode('');
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
    resetCreateForm(); // Reset form when closing
  };

  const handleCreateUser = async () => {
    setCreateUserError(null);

    // Validation
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword || !newUserConfirmPassword) {
      setCreateUserError('Preencha todos os campos obrigatórios (Nome, Email, Senha).');
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      setCreateUserError('As senhas não coincidem.');
      return;
    }
    if (newUserRole === 'EMPLOYEE' && !newUserHourlyRate.trim()) {
        // Make hourly rate mandatory for employees for now
        setCreateUserError('Taxa Horária é obrigatória para Funcionários.');
        return;
    }
    const hourlyRateValue = newUserRole === 'EMPLOYEE' ? parseFloat(newUserHourlyRate.replace(',', '.')) : undefined;
    if (newUserRole === 'EMPLOYEE') {
        if (!newUserHourlyRate.trim()) {
            setCreateUserError('Taxa Horária é obrigatória para Funcionários.');
            return;
        }
        if (typeof hourlyRateValue !== 'number' || isNaN(hourlyRateValue)) {
           setCreateUserError('Taxa Horária inválida.');
           return;
        }
        if (hourlyRateValue < 0) {
            setCreateUserError('Taxa Horária não pode ser negativa.');
            return;
        }
    }

    setCreatingUser(true);

    const userData = {
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      password: newUserPassword,
      role: newUserRole,
      hourlyRate: hourlyRateValue,
      // Re-adding fields based on updated docs, with mapping
      phone: newUserPhone.trim() || undefined,
      birthDate: newUserDob.trim() || undefined, // Map dob to birthDate (ensure format YYYY-MM-DD)
      address: newUserAddress.trim() || undefined,
      city: newUserCity.trim() || undefined,
      state: newUserProvince.trim() || undefined, // Map province to state
      zipCode: newUserPostalCode.trim().toUpperCase() || undefined, // Map postalCode to zipCode
    };

    // Remove undefined fields before sending, if API expects missing fields to be omitted
    // Alternatively, the API should handle null/undefined gracefully
    const finalUserData = Object.entries(userData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // Type assertion to ensure key is valid for CreateUserData
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as CreateUserData); // Start with an empty object typed as CreateUserData

    try {
      // Pass the cleaned user data
      const response = await createUser(finalUserData);
      console.log('User created successfully:', response);
      closeCreateModal();
      fetchUsers(); // Refresh user list
      // Optionally show a success toast/alert
      Alert.alert("Sucesso", "Usuário criado com sucesso!");

    } catch (error: any) {
      console.error('Failed to create user:', error);
      setCreateUserError(error.message || 'Ocorreu um erro ao criar o usuário.');
    } finally {
      setCreatingUser(false);
    }
  };
  // --- End Modal Functions ---

  // --- Edit Modal Functions ---
  const resetEditForm = () => {
    setEditingUser(null);
    setEditName('');
    setEditEmail('');
    setEditRole('EMPLOYEE');
    setEditHourlyRate('');
    setEditUserError(null);
    setUpdatingUser(false);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    // Ensure role is one of the allowed values, default if not
    const currentRole = user.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
    setEditRole(currentRole);
    setEditHourlyRate(user.hourlyRate !== null && user.hourlyRate !== undefined ? String(user.hourlyRate) : '');
    setEditUserError(null); // Clear previous errors
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    resetEditForm(); // Reset form state on close
  };

  const handleUpdateUser = async () => {
    if (!editingUser) {
      setEditUserError("Nenhum usuário selecionado para edição.");
      return;
    }
    setEditUserError(null);

    // Validation
    if (!editName.trim() || !editEmail.trim()) {
      setEditUserError('Nome e Email são obrigatórios.');
      return;
    }
    const hourlyRateValue = editRole === 'EMPLOYEE' ? parseFloat(editHourlyRate.replace(',', '.')) : undefined;
    if (editRole === 'EMPLOYEE') {
        if (!editHourlyRate.trim()) {
            setEditUserError('Taxa Horária é obrigatória para Funcionários.');
            return;
        }
        if (typeof hourlyRateValue !== 'number' || isNaN(hourlyRateValue)) {
             setEditUserError('Taxa Horária inválida (deve ser um número).');
             return;
        }
        if (hourlyRateValue < 0) { 
            setEditUserError('Taxa Horária não pode ser negativa.');
            return;
        }
    }

    setUpdatingUser(true);

    const updateData: UpdateUserData = {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      role: editRole,
      // Garante que enviamos 'number' ou 'null'
      hourlyRate: editRole === 'EMPLOYEE' && hourlyRateValue !== undefined && !isNaN(hourlyRateValue)
        ? hourlyRateValue 
        : null, // Envia null se não for EMPLOYEE ou se valor for inválido/undefined
    };

    try {
      const response = await updateUser(editingUser.id, updateData);
      console.log('User updated successfully:', response);
      closeEditModal();
      fetchUsers(); // Refresh user list
      Alert.alert("Sucesso", `Usuário ${editName} atualizado com sucesso!`);

    } catch (error: any) {
      console.error('Failed to update user:', error);
      setEditUserError(error.message || 'Ocorreu um erro ao atualizar o usuário.');
    } finally {
      setUpdatingUser(false);
    }
  };
  // --- End Edit Modal Functions ---

  const getRoleText = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return 'Desenvolvedor';
      case 'ADMIN':
        return 'Administrador';
      case 'MANAGER':
        return 'Gerente';
      case 'EMPLOYEE':
        return 'Funcionário';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return '#722ED1';
      case 'ADMIN':
        return '#1890FF';
      case 'MANAGER':
        return '#52C41A';
      case 'EMPLOYEE':
        return '#FA8C16';
      default:
        return colors.icon;
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View
      key={item.id}
      style={[
        styles.userCard, 
        { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F8F9FA' }
      ]}
    >
      <View style={styles.userCardContent}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#E9F5FF' }]}>
          <Text style={[styles.userInitials, { color: colors.tint }]}>
              {item.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.userEmail, { color: colors.icon }]}>{item.email}</Text>
          <View style={styles.roleContainer}>
            <View 
              style={[
                styles.roleBadge, 
                { backgroundColor: `${getRoleColor(item.role)}20` }
              ]}
            >
              <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                {getRoleText(item.role)}
              </Text>
            </View>
              {item.hourlyRate !== null && item.hourlyRate !== undefined && (
                  <Text style={[styles.hourlyRate, { color: colors.icon }]}>
                    CAD$ {item.hourlyRate.toFixed(2)}/h
                  </Text>
               )}
              </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={styles.editButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil" size={20} color={colors.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  // Caso o usuário não tenha permissão para acessar esta área
  if (!userRole || !['ADMIN', 'MANAGER', 'DEVELOPER'].includes(userRole)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Você não tem permissão para acessar esta área
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Allow Admins to add users
  const canAddUser = userRole === 'ADMIN'; 

  // --- Render Create User Modal ---
  const renderCreateUserModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={createModalVisible}
      onRequestClose={closeCreateModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalScrollView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Criar Novo Usuário</Text>
              <TouchableOpacity onPress={closeCreateModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={colors.icon} />
          </TouchableOpacity>
            </View>

            {createUserError && (
              <Text style={styles.errorText}>{createUserError}</Text>
            )}

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nome Completo"
              placeholderTextColor={colors.icon}
              value={newUserName}
              onChangeText={setNewUserName}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Email"
              placeholderTextColor={colors.icon}
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Senha"
              placeholderTextColor={colors.icon}
              value={newUserPassword}
              onChangeText={setNewUserPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Confirmar Senha"
              placeholderTextColor={colors.icon}
              value={newUserConfirmPassword}
              onChangeText={setNewUserConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Função:</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <NativePicker
                selectedValue={newUserRole}
                onValueChange={(itemValue) => setNewUserRole(itemValue as 'MANAGER' | 'EMPLOYEE')}
                style={[styles.picker, Platform.OS === 'ios' ? { color: colors.text } : {}]}
                itemStyle={Platform.OS === 'ios' ? { color: colors.text, backgroundColor: colors.background } : {}}
                dropdownIconColor={colors.icon}
              >
                <NativePicker.Item label="Gerente (Manager)" value="MANAGER" />
                <NativePicker.Item label="Funcionário (Employee)" value="EMPLOYEE" />
              </NativePicker>
      </View>

            {newUserRole === 'EMPLOYEE' && (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Taxa Horária (ex: 25.50)"
                placeholderTextColor={colors.icon}
                value={newUserHourlyRate}
                onChangeText={setNewUserHourlyRate}
                keyboardType="numeric"
              />
            )}

            {/* --- New Form Fields --- */}
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Telefone"
              placeholderTextColor={colors.icon}
              value={newUserPhone}
              onChangeText={setNewUserPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Data de Nascimento (YYYY-MM-DD)"
              placeholderTextColor={colors.icon}
              value={newUserDob}
              onChangeText={setNewUserDob}
              // maxLength={10} // Optional: Enforce format length
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Endereço"
              placeholderTextColor={colors.icon}
              value={newUserAddress}
              onChangeText={setNewUserAddress}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Cidade"
              placeholderTextColor={colors.icon}
              value={newUserCity}
              onChangeText={setNewUserCity}
              autoCapitalize="words"
            />
             <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Estado/Província"
              placeholderTextColor={colors.icon}
              value={newUserProvince}
              onChangeText={setNewUserProvince}
              autoCapitalize="words"
            />
          <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="CEP / Código Postal"
            placeholderTextColor={colors.icon}
              value={newUserPostalCode}
              onChangeText={setNewUserPostalCode}
              autoCapitalize="characters"
          />
            {/* --- End New Form Fields --- */}

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleCreateUser}
              disabled={creatingUser}
            >
              {creatingUser ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Criar Usuário</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={closeCreateModal}
              disabled={creatingUser}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  // --- End Render Create User Modal ---

  // --- Render Edit User Modal ---
  const renderEditUserModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={closeEditModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.modalScrollView}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Usuário</Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={colors.icon} />
              </TouchableOpacity>
      </View>

            {editUserError && (
              <Text style={styles.errorText}>{editUserError}</Text>
            )}

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Nome Completo"
              placeholderTextColor={colors.icon}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Email"
              placeholderTextColor={colors.icon}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Função:</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <NativePicker
                selectedValue={editRole}
                onValueChange={(itemValue) => setEditRole(itemValue as 'MANAGER' | 'EMPLOYEE')}
                style={[styles.picker, Platform.OS === 'ios' ? { color: colors.text } : {}]}
                itemStyle={Platform.OS === 'ios' ? { color: colors.text, backgroundColor: colors.background } : {}}
                dropdownIconColor={colors.icon}
              >
                <NativePicker.Item label="Gerente (Manager)" value="MANAGER" />
                <NativePicker.Item label="Funcionário (Employee)" value="EMPLOYEE" />
              </NativePicker>
            </View>

            {editRole === 'EMPLOYEE' && (
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="Taxa Horária (ex: 25.50)"
                placeholderTextColor={colors.icon}
                value={editHourlyRate}
                onChangeText={setEditHourlyRate}
                keyboardType="numeric"
              />
            )}
        
        <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleUpdateUser}
              disabled={updatingUser}
            >
              {updatingUser ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Salvar Alterações</Text>
              )}
        </TouchableOpacity>
        <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={closeEditModal}
              disabled={updatingUser}
        >
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
        </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  // --- End Render Edit User Modal ---

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Gerenciar Usuários</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Novo Usuário</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFF' }]}
        placeholder="Pesquisar por nome ou email..."
        placeholderTextColor={colors.icon}
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={[styles.emptyListText, { color: colors.icon }]}>
              {users.length === 0 ? 'Nenhum usuário encontrado.' : 'Nenhum usuário corresponde à pesquisa.'}
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchUsers}
      />

      {renderCreateUserModal()}
      {renderEditUserModal()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    height: 45,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInitials: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  hourlyRate: {
    fontSize: 12,
     marginTop: 4,
  },
  editButton: {
     padding: 8,
     marginLeft: 'auto',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyListText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollView: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
     padding: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    height: 50,
  },
  picker: {
     height: 50,
     width: '100%',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  unauthorizedContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
  },
  unauthorizedText: {
     fontSize: 18,
    textAlign: 'center',
     marginBottom: 20,
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
}); 