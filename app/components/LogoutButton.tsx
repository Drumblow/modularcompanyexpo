import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LogoutButton() {
  const router = useRouter();

  const onPress = () => {
    console.log('LogoutButton: Botão pressionado');
    
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, sair',
          style: 'destructive',
          onPress: () => {
            console.log('LogoutButton: Confirmação aceita');
            
            // Navegar para a página de signout que lidará com o processo completo
            try {
              console.log('LogoutButton: Redirecionando para página de signout');
              router.push('/signout');
            } catch (error) {
              console.error('LogoutButton: Erro ao navegar para signout:', error);
              
              // Fallback para navegação direta em caso de falha
              if (Platform.OS === 'web') {
                window.location.href = '/signout';
              }
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={onPress} testID="logoutButtonComponent">
      <Ionicons name="exit-outline" size={24} color="white" style={styles.icon} />
      <Text style={styles.text}>Sair</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    marginBottom: 40,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 