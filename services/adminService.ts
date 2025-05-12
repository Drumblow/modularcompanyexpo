import { apiRequest } from './apiService'; // Corrected import: Use named import if apiService uses named export

// Define TimeEntryStats locally based on API documentation
interface TimeEntryStats {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

// Interface para a resposta do dashboard summary do Admin
export interface AdminDashboardSummaryResponse {
  dashboard: {
    summary: {
      pendingApprovalCount: number;
      totalUserCount: number;
      unreadNotificationCount: number;
      pendingPaymentCount: number;
      pendingPaymentAmountMonth: number;
      totalPendingPaymentAmount?: number;
      totalHoursLast30Days: number;
      totalPaidLast30Days: number;
    };
    user: {
      id: string;
      name: string;
      role: string;
    };
    company: {
      id: string;
      name: string;
    };
  };
}

// Interface para a resposta do perfil do usuário (para reutilizar se necessário)
export interface UserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    hourlyRate?: number;
    createdAt: string;
    company: {
      id: string;
      name: string;
      plan: string;
    };
  };
}


export const fetchAdminDashboardSummary = async (): Promise<AdminDashboardSummaryResponse> => {
  try {
    const response = await apiRequest<AdminDashboardSummaryResponse>({
       endpoint: '/api/mobile-admin/dashboard-summary',
       method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching admin dashboard summary:', error);
    throw error;
  }
};

// Interface para a resposta de time entries, using the locally defined TimeEntryStats
export interface TimeEntriesSummaryResponse {
  timeEntries: any[]; // ou tipo mais específico
  period: {
    startDate: string;
    endDate: string;
  };
  pagination: any;
  stats: TimeEntryStats; // Use the locally defined interface
  appliedFilters: any;
}

export const fetchCompanyTimeEntryStats = async (startDate?: string, endDate?: string): Promise<TimeEntriesSummaryResponse> => {
  try {
    let url = '/api/mobile-time-entries';
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await apiRequest<TimeEntriesSummaryResponse>({
       endpoint: url,
       method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching company time entry stats:', error);
    throw error;
  }
};

// --- Manager Dashboard ---

// Interface para a resposta do dashboard summary do Manager
export interface ManagerDashboardSummaryResponse {
  summary: {
    pendingApprovalCount: number;          
    teamTotalHoursLast30Days: number;  
    teamMemberCount: number;               
    myStatsLast30Days: {
       totalHoursRegistered: number;     
       pendingPaymentHours: number;     
       pendingPaymentValue: number;    
    };
    myPendingPaymentsTotalValue: number; 
    myReceivedPaymentsLast30Days: number;
  };
  managerInfo: {
     id: string;
     name: string;
     hourlyRate?: number | null; // Tornar opcional ou nulo por segurança
  }
}

// Função para buscar o resumo do dashboard do Manager
export const fetchManagerDashboardSummary = async (): Promise<ManagerDashboardSummaryResponse> => {
  try {
    const response = await apiRequest<ManagerDashboardSummaryResponse>({
       endpoint: '/api/mobile-manager/dashboard-summary', // Endpoint específico do Manager
       method: 'GET'
    });
    return response;
  } catch (error) {
    console.error('Error fetching manager dashboard summary:', error);
    throw error;
  }
}; 