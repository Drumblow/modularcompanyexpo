# Problema de Logout na Versão Web do ModularCompany

## Descrição do Problema

A funcionalidade de logout no aplicativo web não está funcionando conforme esperado. Quando o usuário clica no botão de logout na tela de perfil, o processo de logout inicia, mas apresenta comportamentos inconsistentes:

- Em alguns casos, o aplicativo parece fazer o logout, mas continua mostrando partes da interface que requerem autenticação
- O redirecionamento para a tela de login não ocorre corretamente após limpar os tokens
- Mesmo após o logout, ao recarregar a página manualmente, o usuário às vezes permanece autenticado
- O fluxo de navegação após o logout não segue o comportamento esperado

Este problema ocorre exclusivamente na versão web, enquanto a versão mobile (Android/iOS) funciona corretamente.

## Implementações Atuais

### 1. Implementação no ProfileScreen.tsx

```typescript
// Função de logout no componente ProfileScreen
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
```

### 2. Implementação em signout.tsx (app/signout.tsx)

```typescript
export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      console.log('Página de SignOut: Executando logout');
      
      try {
        // Limpar storage completamente
        await AsyncStorage.clear();
        console.log('Página de SignOut: AsyncStorage completamente limpo');
        
        if (Platform.OS === 'web') {
          console.log('Página de SignOut: Redirecionando na web');
          
          // Para web: forçar recarregamento completo da página
          window.location.replace(window.location.origin);
        } else {
          // Para nativo
          console.log('Página de SignOut: Redirecionando em app nativo');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Página de SignOut: Erro durante logout:', error);
        router.replace('/(auth)/login');
      }
    };
    
    performLogout();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066CC" />
      <Text style={styles.text}>Saindo...</Text>
    </View>
  );
}
```

### 3. Implementação em signout.tsx (app/(auth)/signout.tsx)

```typescript
export default function SignOutScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const logoutUser = async () => {
      try {
        // Remove tokens de autenticação
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        
        // Lidar com logout diferentemente dependendo da plataforma
        if (Platform.OS === 'web') {
          // Para web, redefina completamente
          window.location.href = '/';
        } else {
          // Para aplicativos nativos, use o router
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        // Mesmo se houver erro, tente redirecionar
        if (Platform.OS === 'web') {
          window.location.href = '/';
        } else {
          router.replace('/(auth)/login');
        }
      }
    };

    logoutUser();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066CC" />
      <Text style={styles.text}>Saindo...</Text>
    </View>
  );
}
```

## Soluções Tentadas Sem Êxito

1. **Limpeza de AsyncStorage**
   - Tentamos `AsyncStorage.clear()` para remover todos os itens do storage
   - Tentamos `AsyncStorage.multiRemove()` com chaves específicas
   - Verificamos no console se os tokens estavam sendo efetivamente removidos (parece que sim)

2. **Diferentes abordagens de redirecionamento**
   - `router.replace('/(auth)/login')` usando o router do Expo
   - `window.location.href = '/'` para redirecionamento direto
   - `window.location.replace(window.location.origin)` para forçar recarregamento completo
   - Diferentes arquivos de signout em locais estratégicos do app

3. **Abordagens com expo-router**
   - Tentamos manipular o histórico de navegação
   - Tentamos uma abordagem com segmentos de caminho no roteador do Expo
   - Tentamos usar o `router.push` ao invés do `router.replace`

4. **Forçar atualização do estado da aplicação**
   - Adicionamos estados globais para verificar o status de autenticação
   - Tentamos limpar o cache de autenticação antes do redirecionamento

5. **Verificações de Token**
   - Implementamos verificações adicionais para garantir que o token foi removido
   - Adicionamos logs para depurar o processo de logout

## Possíveis Causas e Investigações Futuras

1. **Cache de navegação na Web**
   - Investigar se há algum mecanismo de cache no navegador que está preservando o estado
   - Verificar se a PWA (Progressive Web App) está armazenando dados em outros locais além do AsyncStorage

2. **Implementação do AsyncStorage na Web**
   - Verificar se a implementação web do AsyncStorage funciona de maneira diferente da nativa
   - Pesquisar problemas conhecidos com AsyncStorage na web

3. **Fluxo de Navegação no Expo Router**
   - Investigar mais profundamente como o Expo Router gerencia estados de navegação na web
   - Verificar se há algum problema com o contexto de autenticação não sendo atualizado corretamente

4. **Ajuste das Chaves de AsyncStorage**
   - Verificar a consistência das chaves utilizadas em diferentes partes do app:
     - No arquivo `app/(auth)/signout.tsx` usamos: `['token', 'refreshToken', 'user']`
     - No arquivo `ProfileScreen.tsx` usamos: `['@ModularCompany:token', '@ModularCompany:refreshToken', '@ModularCompany:user']`

## Próximos Passos Recomendados

1. **Implementar um mecanismo de verificação de token global**
   - Criar um hook ou contexto que verifica o token em cada navegação
   - Forçar redirecionamento para login quando o token não for encontrado

2. **Padronizar as chaves de AsyncStorage**
   - Criar constantes para as chaves usadas em AsyncStorage
   - Garantir que todas as partes do app usem as mesmas chaves

3. **Implementar técnicas avançadas de limpeza de estado**
   - Investigar o uso de `sessionStorage` e `localStorage` para garantir limpeza completa no ambiente web
   - Considerar o uso de cookies HTTP-only para autenticação na web, com controle de expiração no servidor

4. **Implementar testes automatizados para o fluxo de logout**
   - Criar testes que validam o processo completo de logout
   - Verificar especificamente o comportamento na web

5. **Considerar uma implementação alternativa para autenticação na web**
   - Avaliar se uma abordagem diferente, como OAuth com redirecionamento, seria mais adequada para a versão web

## Impacto e Mitigação Temporária

Embora o problema persista, os usuários ainda podem fazer logout manualmente:
1. Limpando o cache do navegador
2. Acessando a aplicação em modo anônimo/privado
3. Fechando e reabrindo o navegador

Recomenda-se adicionar instruções temporárias para os usuários sobre como proceder caso o logout não funcione conforme esperado.

---

Este documento será atualizado à medida que novas tentativas de solução forem implementadas e testadas. 