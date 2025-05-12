import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://modularcompany.vercel.app/';

export type ApiRequestOptions = {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
};

/**
 * Função utilitária para fazer requisições à API
 */
export const apiRequest = async <T>({
  endpoint,
  method,
  body,
  headers = {},
}: ApiRequestOptions): Promise<T> => {
  try {
    // Recupera o token de autenticação
    const token = await AsyncStorage.getItem('@ModularCompany:token');
    
    // Configura os headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
    };
    
    // Adiciona o token de autenticação se disponível
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Configura as opções da requisição
    const options: RequestInit = {
      method,
      headers: requestHeaders,
    };
    
    // Adiciona o corpo da requisição para métodos que não são GET
    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }
    
    // Realiza a requisição
    const finalUrl = new URL(endpoint, API_BASE_URL).href;
    const response = await fetch(finalUrl, options);
    
    // Verifica se a resposta é ok (status 2xx)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        errorData.message || 
        `Erro na requisição: ${response.status} - ${response.statusText}`
      );
    }
    
    // Converte a resposta para JSON
    const data = await response.json();
    return data as T;
    
  } catch (error) {
    console.error('Erro na API:', error);
    throw error;
  }
}; 