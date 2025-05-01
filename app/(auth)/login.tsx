import { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Image, Text, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';

const API_URL = 'https://modularcompany.vercel.app/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/mobile-auth`,
        {
          email,
          password,
        }
      );

      if (response.data.token) {
        // Salvar token e dados do usuário com as chaves corretas
        await AsyncStorage.setItem('@ModularCompany:token', response.data.token);
        await AsyncStorage.setItem('@ModularCompany:user', JSON.stringify(response.data.user));
        
        // Adicionar log para debug
        console.log('Token armazenado com sucesso:', response.data.token);
        
        router.replace('/(tabs)');
      } else {
        Alert.alert('Erro', 'Credenciais inválidas');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      Alert.alert(
        'Erro',
        'Não foi possível fazer login. Verifique suas credenciais e tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.logoContainer}>
        <View
          style={styles.logoPlaceholder}
        >
          <Text style={[styles.logoText, { color: colors.tint }]}>MC</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>ModularCompany</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>Controle simplificado para sua empresa</Text>
      </View>
      
      <View style={styles.formContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5', color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.icon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5', color: colors.text }]}
          placeholder="Senha"
          placeholderTextColor={colors.icon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.loginButton, { backgroundColor: colors.tint }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loginButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.forgotPasswordButton}>
          <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>Esqueceu sua senha?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 60,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 24,
    padding: 8,
  },
  forgotPasswordText: {
    fontSize: 16,
  },
}); 