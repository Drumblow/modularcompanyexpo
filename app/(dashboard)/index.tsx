import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';

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

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userString = await AsyncStorage.getItem('@ModularCompany:user');
        if (userString) {
          const userData = JSON.parse(userString);
          setUser(userData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['@ModularCompany:token', '@ModularCompany:user']);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Dashboard
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.welcomeCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Bem-vindo(a), {user?.name}!
          </Text>
          <Text style={[styles.roleText, { color: colors.icon }]}>
            {user?.role === 'ADMIN' ? 'Administrador' :
             user?.role === 'MANAGER' ? 'Gerente' :
             user?.role === 'EMPLOYEE' ? 'Funcionário' : 'Desenvolvedor'}
          </Text>
          {user?.company && (
            <Text style={[styles.companyText, { color: colors.text }]}>
              {user.company.name}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Acesso Rápido
        </Text>

        <View style={styles.quickAccessGrid}>
          <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}>
            <Ionicons name="time-outline" size={32} color={colors.tint} />
            <Text style={[styles.quickAccessText, { color: colors.text }]}>Registrar Horas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}>
            <Ionicons name="list-outline" size={32} color={colors.tint} />
            <Text style={[styles.quickAccessText, { color: colors.text }]}>Meus Registros</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.tint} />
            <Text style={[styles.quickAccessText, { color: colors.text }]}>Relatórios</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F0F7FA' }]}>
            <Ionicons name="person-outline" size={32} color={colors.tint} />
            <Text style={[styles.quickAccessText, { color: colors.text }]}>Perfil</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    marginBottom: 8,
  },
  companyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAccessCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 120,
  },
  quickAccessText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 