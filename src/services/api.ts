// API Service for Pocket Credit Platform
// Base URL for the backend API
const API_BASE_URL = 'http://localhost:3002/api';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface User {
  id: number;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  status: string;
  member_id: number;
  tier_name: string;
  tier_display_name: string;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_completed: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  sessionToken: string;
}

export interface UserProfile {
  user: User;
  addresses: Address[];
  employment: Employment | null;
  bankAccounts: BankAccount[];
  kycStatus: KYCStatus | null;
}

export interface Address {
  id: number;
  user_id: number;
  address_type: 'current' | 'permanent' | 'office';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Employment {
  id: number;
  user_id: number;
  employment_type: 'salaried' | 'self_employed' | 'business' | 'unemployed';
  company_name?: string;
  designation?: string;
  work_experience_years: number;
  work_experience_months: number;
  monthly_salary?: number;
  salary_date: number;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  employment_verified: boolean;
  salary_verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: number;
  user_id: number;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  account_type: 'savings' | 'current' | 'salary';
  is_verified: boolean;
  verification_method: 'micro_deposit' | 'instant' | 'manual';
  verified_at?: string;
  status: 'active' | 'inactive' | 'blocked';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface KYCStatus {
  id: number;
  user_id: number;
  overall_status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
  completion_percentage: number;
  pan_verified: boolean;
  aadhaar_verified: boolean;
  address_verified: boolean;
  bank_account_verified: boolean;
  employment_verified: boolean;
  video_kyc_verified: boolean;
  pan_score: number;
  aadhaar_score: number;
  address_score: number;
  bank_score: number;
  employment_score: number;
  video_kyc_score: number;
  overall_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoanApplication {
  id: number;
  user_id: number;
  loan_amount: number;
  loan_purpose: string;
  loan_tenure_days: number;
  requested_disbursal_date?: string;
  processing_fee_rate: number;
  interest_rate_per_day: number;
  processing_fee: number;
  gst_on_processing_fee: number;
  total_processing_fee: number;
  interest_amount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'completed';
  application_date: string;
  loan_id?: number;
}

export interface Loan {
  id: number;
  user_id: number;
  loan_application_id: number;
  loan_amount: number;
  loan_purpose: string;
  loan_tenure_days: number;
  interest_rate_per_day: number;
  processing_fee_rate: number;
  processing_fee: number;
  total_amount: number;
  status: 'pending' | 'active' | 'completed' | 'defaulted';
  disbursal_date?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EligibilityCheck {
  eligibility: {
    is_eligible: boolean;
    reasons: string[];
    warnings: string[];
    recommendations: string[];
  };
  loan_details?: {
    loan_amount: number;
    loan_tenure_days: number;
    processing_fee_rate: number;
    interest_rate_per_day: number;
    processing_fee: number;
    gst_on_processing_fee: number;
    total_processing_fee: number;
    interest_amount: number;
    total_amount: number;
    auto_approval_eligible: boolean;
  };
  user_tier: {
    name: string;
    display_name: string;
  };
}

// API Service Class
class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Get authentication headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic API request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication APIs
  async register(userData: {
    email: string;
    phone: string;
    password: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
  }): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/users/logout', {
      method: 'POST',
    });

    this.setToken(null);
    return response;
  }

  // User Profile APIs
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/users/profile');
  }

  async updateUserProfile(profileData: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    marital_status?: string;
  }): Promise<ApiResponse> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Address APIs
  async addAddress(addressData: {
    address_type: 'current' | 'permanent' | 'office';
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  }): Promise<ApiResponse<Address>> {
    return this.request<Address>('/users/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async updateAddress(
    id: number,
    addressData: {
      address_line1?: string;
      address_line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    }
  ): Promise<ApiResponse> {
    return this.request(`/users/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
  }

  // Employment APIs
  async updateEmployment(employmentData: {
    employment_type: 'salaried' | 'self_employed' | 'business' | 'unemployed';
    company_name?: string;
    designation?: string;
    work_experience_years?: number;
    work_experience_months?: number;
    monthly_salary?: number;
    salary_date?: number;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
  }): Promise<ApiResponse<Employment>> {
    return this.request<Employment>('/users/employment', {
      method: 'POST',
      body: JSON.stringify(employmentData),
    });
  }

  // Bank Account APIs
  async addBankAccount(bankData: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_holder_name: string;
    account_type?: 'savings' | 'current' | 'salary';
    is_primary?: boolean;
  }): Promise<ApiResponse<BankAccount>> {
    return this.request<BankAccount>('/users/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(bankData),
    });
  }

  async setPrimaryBankAccount(id: number): Promise<ApiResponse> {
    return this.request(`/users/bank-accounts/${id}/set-primary`, {
      method: 'PUT',
    });
  }

  // KYC APIs
  async getKYCStatus(): Promise<ApiResponse<KYCStatus>> {
    return this.request<KYCStatus>('/users/kyc-status');
  }

  async updateKYCStatus(kycData: {
    pan_verified?: boolean;
    aadhaar_verified?: boolean;
    address_verified?: boolean;
    bank_account_verified?: boolean;
    employment_verified?: boolean;
    video_kyc_verified?: boolean;
    overall_status?: string;
  }): Promise<ApiResponse> {
    return this.request('/users/kyc-status', {
      method: 'PUT',
      body: JSON.stringify(kycData),
    });
  }

  // Verification APIs
  async sendEmailOTP(email: string): Promise<ApiResponse<{ otp?: string }>> {
    return this.request('/verification/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailOTP(email: string, otp: string): Promise<ApiResponse> {
    return this.request('/verification/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async sendPhoneOTP(phone: string): Promise<ApiResponse<{ otp?: string }>> {
    return this.request('/verification/send-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyPhoneOTP(phone: string, otp: string): Promise<ApiResponse> {
    return this.request('/verification/verify-phone-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async initiateDigiLocker(userId: number, documentType: 'aadhaar' | 'pan'): Promise<ApiResponse> {
    return this.request('/verification/digilocker/initiate', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, document_type: documentType }),
    });
  }

  async verifyBankAccount(userId: number, bankAccountId: number): Promise<ApiResponse> {
    return this.request('/verification/bank/verify', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, bank_account_id: bankAccountId }),
    });
  }

  async initiateVideoKYC(userId: number): Promise<ApiResponse> {
    return this.request('/verification/video-kyc/initiate', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async completeVideoKYC(sessionId: string, verificationResult: any): Promise<ApiResponse> {
    return this.request('/verification/video-kyc/complete', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, verification_result: verificationResult }),
    });
  }

  // Loan APIs
  async checkEligibility(loanAmount: number, loanTenureDays: number = 30): Promise<ApiResponse<EligibilityCheck>> {
    return this.request<EligibilityCheck>('/loans/check-eligibility', {
      method: 'POST',
      body: JSON.stringify({ loan_amount: loanAmount, loan_tenure_days: loanTenureDays }),
    });
  }

  async applyForLoan(loanData: {
    loan_amount: number;
    loan_purpose: string;
    loan_tenure_days?: number;
    requested_disbursal_date?: string;
  }): Promise<ApiResponse> {
    return this.request('/loans/apply', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
  }

  async getLoanApplications(status?: string, limit?: number, offset?: number): Promise<ApiResponse<LoanApplication[]>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = `/loans/applications${queryString ? `?${queryString}` : ''}`;
    
    return this.request<LoanApplication[]>(endpoint);
  }

  async getLoanApplication(id: number): Promise<ApiResponse> {
    return this.request(`/loans/applications/${id}`);
  }

  async getLoans(status?: string, limit?: number, offset?: number): Promise<ApiResponse<Loan[]>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = `/loans${queryString ? `?${queryString}` : ''}`;
    
    return this.request<Loan[]>(endpoint);
  }

  async getLoan(id: number): Promise<ApiResponse> {
    return this.request(`/loans/${id}`);
  }

  async makeLoanPayment(
    loanId: number,
    amount: number,
    paymentMethod: string = 'upi',
    paymentReference?: string
  ): Promise<ApiResponse> {
    return this.request(`/loans/${loanId}/pay`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      }),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
