import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';

// Tipos
interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  active: boolean;
  employeesCount: number;
  createdAt: string;
}

export default function CompaniesScreen() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  // Verificar a função do usuário e redirecionar se não for DEVELOPER
  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        console.log('[CompaniesScreen] Verificando permissões de acesso...');
        const userString = await AsyncStorage.getItem('@ModularCompany:user');
        if (!userString) {
          console.log('[CompaniesScreen] Usuário não encontrado, redirecionando...');
          router.replace('/(tabs)');
          return;
        }

        const userData = JSON.parse(userString);
        const role = userData.role;
        setUserRole(role);
        console.log('[CompaniesScreen] Papel do usuário verificado:', role);
        
        // Verificar se é DEVELOPER com comparação case-insensitive
        const isDeveloper = role && role.toUpperCase() === 'DEVELOPER';
        
        if (!isDeveloper) {
          console.log('[CompaniesScreen] Usuário não é DEVELOPER, redirecionando imediatamente...');
          // Alertar o usuário antes de redirecionar
          Alert.alert(
            'Acesso Restrito',
            'Esta área é restrita apenas para desenvolvedores.',
            [
              { 
                text: 'OK', 
                onPress: () => router.replace('/(tabs)') 
              }
            ]
          );
        } else {
          // Só busca dados de empresas se for desenvolvedor
          fetchCompanies();
        }
      } catch (error) {
        console.error('[CompaniesScreen] Erro ao verificar permissões:', error);
        setLoading(false);
        router.replace('/(tabs)');
      }
    };

    checkUserPermission();
  }, [router]);

  const fetchCompanies = async () => {
    try {
      // Esta função seria usada para buscar empresas reais da API
      // Por enquanto, usando dados simulados
      const mockCompanies: Company[] = [
        { 
          id: '1', 
          name: 'TechSolutions Ltda', 
          cnpj: '12.345.678/0001-90', 
          email: 'contato@techsolutions.com', 
          active: true, 
          employeesCount: 15,
          createdAt: '2022-05-20'
        },
        { 
          id: '2', 
          name: 'InnovaSoft Sistemas', 
          cnpj: '98.765.432/0001-21', 
          email: 'admin@innovasoft.com', 
          active: true, 
          employeesCount: 8,
          createdAt: '2022-08-12'
        },
        { 
          id: '3', 
          name: 'Global Data Services', 
          cnpj: '45.678.901/0001-34', 
          email: 'contato@globaldata.com', 
          active: false, 
          employeesCount: 23,
          createdAt: '2021-11-05'
        },
        { 
          id: '4', 
          name: 'Nexus Tecnologia', 
          cnpj: '56.789.012/0001-67', 
          email: 'suporte@nexustech.com', 
          active: true, 
          employeesCount: 42,
          createdAt: '2023-01-17'
        },
        { 
          id: '5', 
          name: 'Smart Solutions SA', 
          cnpj: '23.456.789/0001-80', 
          email: 'info@smartsolutions.com', 
          active: true, 
          employeesCount: 31,
          createdAt: '2022-09-30'
        },
      ];
      
      setCompanies(mockCompanies);
      setFilteredCompanies(mockCompanies);
      setLoading(false);
    } catch (error) {
      console.error('[CompaniesScreen] Erro ao buscar empresas:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        company.cnpj.includes(searchQuery) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const formatCNPJ = (cnpj: string) => {
    // CNPJ já está formatado no exemplo, mas em uma implementação real,
    // poderíamos formatar aqui se necessário
    return cnpj;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const renderCompanyItem = ({ item }: { item: Company }) => (
    <TouchableOpacity 
      style={[
        styles.companyCard, 
        { backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F8F9FA' }
      ]}
    >
      <View style={styles.companyInfo}>
        <View style={[styles.companyLogo, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#E9F5FF' }]}>
          <Text style={[styles.companyInitials, { color: colors.tint }]}>
            {item.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </Text>
        </View>
        <View style={styles.companyDetails}>
          <Text style={[styles.companyName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.companyEmail, { color: colors.icon }]}>{item.email}</Text>
          <Text style={[styles.companyCNPJ, { color: colors.icon }]}>CNPJ: {formatCNPJ(item.cnpj)}</Text>
          <View style={styles.companyMetaInfo}>
            <View style={styles.employeeCount}>
              <Ionicons name="people-outline" size={14} color={colors.icon} style={styles.metaIcon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>{item.employeesCount} funcionários</Text>
            </View>
            <View style={styles.dateInfo}>
              <Ionicons name="calendar-outline" size={14} color={colors.icon} style={styles.metaIcon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>Desde {formatDate(item.createdAt)}</Text>
            </View>
            {!item.active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inativa</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.menuButton}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.icon} />
      </TouchableOpacity>
    </TouchableOpacity>
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
  if (!userRole || userRole.toUpperCase() !== 'DEVELOPER') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Você não tem permissão para acessar esta área
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.backButtonText}>Voltar ao Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Empresas</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[
          styles.searchWrapper,
          { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }
        ]}>
          <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar empresas..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.tint + '20' }
          ]}
        >
          <Text style={[styles.filterText, { color: colors.tint }]}>Todas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }
          ]}
        >
          <Text style={[styles.filterText, { color: colors.icon }]}>Ativas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5' }
          ]}
        >
          <Text style={[styles.filterText, { color: colors.icon }]}>Inativas</Text>
        </TouchableOpacity>
      </View>

      {filteredCompanies.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color={colors.icon} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Nenhuma empresa encontrada
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.icon }]}>
            {searchQuery ? 'Tente uma busca diferente' : 'Adicione empresas usando o botão +'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCompanies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  header: {
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 48,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  companyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyInitials: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  companyEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  companyCNPJ: {
    fontSize: 14,
    marginBottom: 6,
  },
  companyMetaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  employeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FF4D4F20',
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF4D4F',
  },
  menuButton: {
    padding: 4,
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
  backButton: {
    marginTop: 20,
    backgroundColor: '#0A7EA4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 