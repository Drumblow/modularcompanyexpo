// import api from './apiService'; // Removed Axios-style import
import { apiRequest } from './apiService'; // Import the fetch-based request function
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface to represent a simplified user structure for selection
export interface SelectableUser {
  id: string;
  name: string;
  email: string; 
  role: string;
  hourlyRate?: number; // Added missing field from API
  // Add other relevant fields if needed from the API response
}

// Interface for the API response when fetching users
interface FetchUsersResponse {
  users: SelectableUser[];
  // Include pagination info if the API supports it
}

/**
 * Fetches users manageable by the current logged-in user (Admin/Manager).
 * Assumes an endpoint like /mobile-users exists and filters based on the token.
 */
export const fetchCompanyUsers = async (): Promise<SelectableUser[]> => {
  try {
    // Use apiRequest function instead of api.get
    const response = await apiRequest<FetchUsersResponse>({
      endpoint: '/api/mobile-admin/users', // Corrected endpoint
      method: 'GET',
    });
    
    if (response && Array.isArray(response.users)) {
      return response.users;
    } else {
      console.warn('Unexpected response structure from /mobile-users:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching company users:', error);
    // Consider throwing a more specific error or returning an empty array
    // depending on how you want to handle errors upstream.
    throw new Error('Failed to fetch users. Please try again.');
  }
};

// Function to get the current user's ID from storage
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const userString = await AsyncStorage.getItem('@ModularCompany:user');
    if (userString) {
      const userData = JSON.parse(userString);
      return userData.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user ID from storage:', error);
    return null;
  }
};

// --- Add createUser function --- 

// Interface for the data needed to create a user via mobile API
// Aligned with updated docs: /mobile-admin/users
export interface CreateUserData {
  name: string;
  email: string;
  password?: string; // Assuming still needed based on docs example
  role: 'MANAGER' | 'EMPLOYEE'; // Required
  hourlyRate?: number; // Optional
  // Re-adding fields based on updated docs
  phone?: string;
  dob?: string; // Date of Birth (string YYYY-MM-DD format, maps to birthDate)
  address?: string;
  city?: string;
  province?: string; // Maps to state in API
  postalCode?: string; // Maps to zipCode in API
}

// Interface for the expected API response (adjust if needed)
// The docs show the created user object directly in the response
interface CreateUserResponse {
  user: SelectableUser; // Assuming SelectableUser matches the response structure
}

/**
 * Creates a new user (Manager or Employee) within the admin's company.
 * Uses the mobile-specific endpoint.
 */
export const createUser = async (userData: CreateUserData): Promise<CreateUserResponse> => {
  // Basic validation (can be enhanced based on API requirements)
  if (!userData.name || !userData.email || !userData.password || !userData.role) {
     throw new Error('Nome, Email, Senha e Função são obrigatórios.');
  }
  if (userData.role === 'EMPLOYEE' && typeof userData.hourlyRate !== 'number' && userData.hourlyRate !== undefined && userData.hourlyRate !== null ) {
      // Keep allowing optional hourly rate for employee if not strictly required by API
       console.warn('Hourly rate not provided or invalid for new employee, sending undefined.');
       userData.hourlyRate = undefined; // Ensure undefined is sent if invalid or missing
  }

  try {
    const endpoint = '/api/mobile-admin/users'; // Corrected endpoint for mobile user creation
    console.log(`Attempting to create user at ${endpoint} with data:`, {
        ...userData,
        password: '[REDACTED]' // Don't log password
    });

    const response = await apiRequest<CreateUserResponse>({
      endpoint,
      method: 'POST',
      body: userData,
    });
    
    console.log('Create user response:', response);
    // Assuming the response directly contains the user object based on docs
    // Adjust if the actual response nests it differently (e.g., response.data.user)
    return response; 

  } catch (error: any) {
    console.error('Error creating user:', error);
    // Rethrow with a potentially more informative message from the server
    throw new Error(error.message || 'Falha ao criar usuário. Tente novamente.');
  }
};

// --- Add updateUser function ---

// Interface for the data needed to update a user
// Fields are optional as we might only update parts of the data
export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'MANAGER' | 'EMPLOYEE'; // Restrict updatable roles if necessary
  hourlyRate?: number | null; // Allow setting hourlyRate to null/undefined if needed
  // Add other updatable fields as needed
}

// Interface for the expected update response (adjust based on actual API)
interface UpdateUserResponse {
   user: SelectableUser; // Assuming the updated user object is returned
   message?: string;
}

/**
 * Updates an existing user's details.
 * Assumes a PUT endpoint like /mobile-admin/users/{id} exists.
 */
export const updateUser = async (userId: string, userData: UpdateUserData): Promise<UpdateUserResponse> => {
  if (!userId) {
    throw new Error('User ID is required for update.');
  }

  try {
    const endpoint = `/api/mobile-admin/users/${userId}`;
    console.log(`Attempting to update user ${userId} at ${endpoint} with data:`, userData);

    const response = await apiRequest<UpdateUserResponse>({
      endpoint,
      method: 'PUT', // Or PATCH if the API supports partial updates
      body: userData,
    });

    console.log(`Update user ${userId} response:`, response);
    return response;

  } catch (error: any) {
    console.error(`Error updating user ${userId}:`, error);
    throw new Error(error.message || `Falha ao atualizar usuário ${userId}. Tente novamente.`);
  }
};

// Function to get the current user's data (including companyId)
export const getCurrentUserData = async (): Promise<any | null> => {
  try {
    const userString = await AsyncStorage.getItem('@ModularCompany:user');
    if (userString) {
      return JSON.parse(userString);
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user data from storage:', error);
    return null;
  }
}; 