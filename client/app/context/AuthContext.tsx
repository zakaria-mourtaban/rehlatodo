import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  getAuthHeaders: () => { Authorization: string } | Record<string, never>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create axios instance with interceptors to handle token refresh
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

// Helper to safely access browser APIs
const isBrowser = typeof window !== 'undefined';

// Add a response interceptor to handle token refresh
if (isBrowser) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If the error is 401 (Unauthorized) and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const refreshResponse = await axios.post('http://localhost:5000/api/auth/refresh-token', {}, { withCredentials: true });
          
          if (refreshResponse.data && refreshResponse.data.accessToken) {
            // Store the new token
            window.localStorage.setItem('accessToken', refreshResponse.data.accessToken);
            
            // Update the authorization header
            originalRequest.headers['Authorization'] = `Bearer ${refreshResponse.data.accessToken}`;
            
            // If successful, retry the original request
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, redirect to login
          window.localStorage.removeItem('accessToken');
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
}

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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Safe localStorage initialization - only runs in browser
  useEffect(() => {
    if (isBrowser) {
      const storedToken = window.localStorage.getItem('accessToken');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
  }, []);

  // Set auth header for all axiosInstance requests
  useEffect(() => {
    if (accessToken) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete axiosInstance.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  const getAuthHeaders = () => {
    return accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {} as Record<string, never>;
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    if (!isBrowser) return false;

    try {
      setIsLoading(true);
      
      // Check if we have a token
      const token = window.localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        setAccessToken(null);
        return false;
      }
      
      // Try to get current user info
      const response = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setAccessToken(token);
        return true;
      } else {
        // Try to refresh the token if we have a refresh token cookie
        try {
          const refreshResponse = await axios.post('http://localhost:5000/api/auth/refresh-token', {}, { withCredentials: true });
          if (refreshResponse.data && refreshResponse.data.accessToken) {
            window.localStorage.setItem('accessToken', refreshResponse.data.accessToken);
            setAccessToken(refreshResponse.data.accessToken);
            setUser(refreshResponse.data.user);
            return true;
          }
        } catch (refreshError) {
          // If refresh fails, clear user state
          window.localStorage.removeItem('accessToken');
          setUser(null);
          setAccessToken(null);
          return false;
        }
      }
      
      window.localStorage.removeItem('accessToken');
      setUser(null);
      setAccessToken(null);
      return false;
    } catch (error) {
      // If getting user info fails, try to refresh token
      try {
        const refreshResponse = await axios.post('http://localhost:5000/api/auth/refresh-token', {}, { withCredentials: true });
        if (refreshResponse.data && refreshResponse.data.accessToken) {
          window.localStorage.setItem('accessToken', refreshResponse.data.accessToken);
          setAccessToken(refreshResponse.data.accessToken);
          setUser(refreshResponse.data.user);
          return true;
        }
      } catch (refreshError) {
        // If refresh fails, clear user state
        window.localStorage.removeItem('accessToken');
        setUser(null);
        setAccessToken(null);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status when the component mounts (client-side only)
  useEffect(() => {
    if (isBrowser) {
      checkAuthStatus();
    } else {
      // For server-side rendering, just mark as not loading
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!isBrowser) return false;
    
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password }, { withCredentials: true });
      
      if (response.data && response.data.accessToken) {
        window.localStorage.setItem('accessToken', response.data.accessToken);
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    if (!isBrowser) return;
    
    try {
      setIsLoading(true);
      // Include the access token in the headers for logout
      const headers = getAuthHeaders();
      await axios.post('http://localhost:5000/api/auth/logout', {}, { 
        withCredentials: true,
        headers
      });
      window.localStorage.removeItem('accessToken');
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server logout fails, we should clear the client state
      window.localStorage.removeItem('accessToken');
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuthStatus,
    getAuthHeaders
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};