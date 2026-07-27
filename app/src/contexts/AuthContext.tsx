import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  ID: string;
  username: string;
  name: string;
  role: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, passwordHash: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sap_token');
    const storedUser = localStorage.getItem('sap_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, passwordHash: string): Promise<boolean> => {
    try {
      // POST request to AdminService login action (standard OData v4 structure)
      const response = await api.post('/odata/v4/admin/login', {
        username,
        passwordHash
      });
      
      const result = response.data;
      const data = result.value || result;
      if (data) {
        const { success, token, user: loggedUser } = data;
        if (success) {
          localStorage.setItem('sap_token', token);
          localStorage.setItem('sap_user_id', loggedUser.ID);
          localStorage.setItem('sap_role', loggedUser.role);
          localStorage.setItem('sap_user', JSON.stringify(loggedUser));
          setUser(loggedUser);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('sap_token');
    localStorage.removeItem('sap_user_id');
    localStorage.removeItem('sap_role');
    localStorage.removeItem('sap_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
