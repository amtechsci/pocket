import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string }>;
  loginWithOTP: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  sendOTP: (phone: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      apiService.setToken(token);
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Try to refresh user profile, but don't fail if backend is down
        refreshUser().catch(() => {
          // Backend might be down, but we have user data from localStorage
          console.log('Backend unavailable, using cached user data');
        });
      } catch (error) {
        console.error('Failed to parse user data:', error);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true, message: response.message };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Registration failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      apiService.setToken(null);
      localStorage.removeItem('authToken');
    }
  };

  const loginWithOTP = async (phone: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // For demo purposes, simulate OTP verification
      // In real implementation, this would call the backend OTP verification API
      if (otp === '123456') {
        // Create a mock user for demo
        const mockUser: User = {
          id: 1,
          email: `${phone}@pocketcredit.com`,
          phone: `+91${phone}`,
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: '',
          status: 'active',
          member_id: 1,
          tier_name: 'new_member',
          tier_display_name: 'New Member',
          email_verified: true,
          phone_verified: true,
          kyc_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        };

        // Set mock token and user
        const mockToken = 'mock-jwt-token';
        apiService.setToken(mockToken);
        setUser(mockUser);
        
        // Save to localStorage for persistence
        localStorage.setItem('userData', JSON.stringify(mockUser));
        
        return { success: true, message: 'Login successful!' };
      } else {
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }
    } catch (error) {
      console.error('OTP login error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'OTP verification failed' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      
      // For demo purposes, simulate sending OTP
      // In real implementation, this would call the backend OTP sending API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'OTP sent successfully!' };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send OTP' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        // Token might be invalid, logout
        await logout();
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    loginWithOTP,
    sendOTP,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
