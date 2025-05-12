import { format } from 'date-fns';
import { apiRequest } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TimeEntry {
  id: string;
  date: string; 
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
  project?: string;
  approved: boolean | null;
  rejected: boolean | null;
  rejectionReason?: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    hourlyRate?: number;
    companyId: string;
  };
  payment?: {
    id: string;
    amount: number;
    date: string;
    reference?: string;
    description: string;
    status: string;
  };
  amount?: number; // Specific amount for this entry within a payment context
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string; 
  description: string;
  reference?: string;
  paymentMethod: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  userId?: string; // Added optional userId if API provides it
  user?: { // Optional user details related to the payment
      id: string;
      name: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  timeEntries?: TimeEntry[];
  createdAt: string;
  updatedAt: string;
}

// Export the UserBalance interface
export interface UserBalance {
  totalApprovedHours: number;
  paidHours: number;
  unpaidHours: number;
  hourlyRate: number;
  totalAmountDue: number;
  totalPaid: number;
  balance: number;
  currency: string;
}

export interface UserBalanceResponse {
  balance: UserBalance;
  period: { startDate: string; endDate: string };
}

export interface PaymentsResponse {
  payments: Payment[];
  period: { startDate: string; endDate: string };
}

export interface PaymentDetailResponse {
  payment: Payment;
}

export interface CreatePaymentRequest {
  userId: string;
  amount: number; // Make amount required as per API doc logic
  date: string; // YYYY-MM-DD
  description: string;
  reference?: string;
  paymentMethod: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  timeEntryIds: string[]; 
  status?: string; // Added status field
}

export type ConfirmPaymentRequest = {
  paymentId: string;
  confirmed: boolean;
  notes?: string;
};

/**
 * Fetches payments for the logged-in user.
 */
export const fetchPayments = async (startDate?: Date, endDate?: Date, status?: string): Promise<PaymentsResponse> => {
   try {
    let endpoint = '/api/mobile-payments';
    const params = new URLSearchParams();

    if (startDate) {
      params.append('startDate', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      params.append('endDate', format(endDate, 'yyyy-MM-dd'));
    }
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return await apiRequest<PaymentsResponse>({
      endpoint,
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw new Error('Failed to fetch payments.');
  }
};

/**
 * Fetches details for a specific payment.
 */
export const fetchPaymentDetails = async (id: string): Promise<PaymentDetailResponse> => {
  try {
    return await apiRequest<PaymentDetailResponse>({
      endpoint: `/api/mobile-payments/${id}`,
      method: 'GET',
    });
  } catch (error) {
    console.error(`Error fetching payment details for ID ${id}:`, error);
    throw new Error('Failed to fetch payment details.');
  }
};

/**
 * Fetches the balance for a specific user or the logged-in user.
 * @param userId - Optional ID of the user to fetch balance for. If null/undefined, fetches for the logged-in user.
 * @param startDate - Optional start date for the balance period.
 * @param endDate - Optional end date for the balance period.
 */
export const getUserBalance = async (userId?: string | null, startDate?: Date, endDate?: Date): Promise<UserBalanceResponse> => {
   try {
     let endpoint = '/api/mobile-users/balance';
     const params = new URLSearchParams();
     
     if (userId) {
       params.append('userId', userId);
     }
     if (startDate) {
       params.append('startDate', format(startDate, 'yyyy-MM-dd'));
     }
     if (endDate) {
       params.append('endDate', format(endDate, 'yyyy-MM-dd'));
     }
     
     const queryString = params.toString();
     if (queryString) {
       endpoint += `?${queryString}`;
     }
     
     console.log(`Fetching user balance from: ${endpoint}`); // Log endpoint
 
     return await apiRequest<UserBalanceResponse>({
       endpoint,
       method: 'GET',
     });
   } catch (error) {
     console.error(`Error fetching user balance${userId ? ' for user ' + userId : ''}:`, error);
     // Re-throw or handle as needed
     throw new Error('Failed to fetch user balance.');
   }
 };
 
 /**
  * Creates a new payment.
  * The backend is expected to find and associate unpaid time entries based on userId, period, and amount.
  */
 export const createPayment = async (paymentData: CreatePaymentRequest): Promise<{ payment: Payment }> => {
   try {
     console.log('Creating payment with data:', paymentData);
     // Adjust response type to match API docs: { payment: { ... } }
     const response = await apiRequest<{ payment: Payment }>({
       endpoint: '/api/mobile-payments', // Endpoint confirmed from docs
       method: 'POST',
       body: paymentData, // Send the updated CreatePaymentRequest structure
     });
     console.log('Payment creation response:', response);
     return response;
   } catch (error: any) {
     console.error('Error creating payment:', error);
     // Rethrow with a potentially more informative message from the server
     throw new Error(error.message || 'Failed to create payment. Please try again.');
   }
 };

// Confirmar recebimento de um pagamento
export const confirmPayment = async (data: ConfirmPaymentRequest): Promise<{ success: boolean; message: string }> => {
  return await apiRequest<{ success: boolean; message: string }>({
    endpoint: `/api/mobile-payments/${data.paymentId}/confirm`,
    method: 'PUT',
    body: {
      confirmed: data.confirmed,
      notes: data.notes
    },
  });
};

/**
 * Fetches approved but unpaid time entries for a specific user.
 */
export const fetchUnpaidTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  try {
    const params = new URLSearchParams({
      userId: userId,
      approved: 'true',
      unpaid: 'true',
      limit: '500' // Fetch a large number, assuming pagination isn't needed here
    });
    const endpoint = `/api/mobile-time-entries?${params.toString()}`;

    const response = await apiRequest<{ timeEntries: TimeEntry[] }>({
      endpoint,
      method: 'GET',
    });

    // Ensure the response structure is as expected
    if (response && Array.isArray(response.timeEntries)) {
      return response.timeEntries;
    } else {
      console.warn(`Unexpected response structure from ${endpoint}:`, response);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching unpaid time entries for user ${userId}:`, error);
    throw new Error('Failed to fetch unpaid time entries.');
  }
};

/**
 * Fetches company-wide payments for Admin/Manager view.
 * @param status Optional filter by payment status (e.g., 'pending', 'completed')
 * @param userId Optional filter by specific employee user ID
 * @param page Optional page number for pagination
 * @param limit Optional limit per page
 */
export const fetchCompanyPayments = async (params: {
  status?: string | string[]; // Allow single status or array
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
} = {}): Promise<PaymentsResponse> => {
  try {
    const endpoint = '/api/mobile-admin/payments';
    const queryParams = new URLSearchParams();

    if (params.status) {
      // Handle single status or array of statuses
      const statusString = Array.isArray(params.status) ? params.status.join(',') : params.status;
      queryParams.append('status', statusString);
    }
    if (params.userId) {
      queryParams.append('userId', params.userId);
    }
    if (params.startDate) {
      queryParams.append('startDate', format(params.startDate, 'yyyy-MM-dd'));
    }
    if (params.endDate) {
      queryParams.append('endDate', format(params.endDate, 'yyyy-MM-dd'));
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.sortBy) {
      queryParams.append('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      queryParams.append('sortOrder', params.sortOrder);
    }

    const queryString = queryParams.toString();
    const finalEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    console.log(`Fetching company payments from: ${finalEndpoint}`);

    // Assuming PaymentsResponse is the correct structure based on API docs
    return await apiRequest<PaymentsResponse>({
      endpoint: finalEndpoint,
      method: 'GET',
    });
  } catch (error) {
    console.error('Error fetching company payments:', error);
    throw new Error('Failed to fetch company payments.');
  }
}; 