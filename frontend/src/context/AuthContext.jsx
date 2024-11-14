import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Проверяем валидность токена
        authAPI.getProfile()
          .then((response) => {
            setUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(response.data.data));
          })
          .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user: userData } = response.data.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const register = async (email, password, name) => {
    await authAPI.register({ email, password, name });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const isAdmin = () => {
    return user?.roles?.includes('admin') || false;
  };

  const isManager = () => {
    return user?.roles?.includes('manager') || false;
  };

  const isEngineer = () => {
    return user?.roles?.includes('engineer') || false;
  };

  const isDirector = () => {
    return user?.roles?.includes('director') || false;
  };

  const isCustomer = () => {
    return user?.roles?.includes('customer') || false;
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role) || false;
  };

  const canAssignDefects = () => {
    return isAdmin() || isManager();
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAdmin,
    isManager,
    isEngineer,
    isDirector,
    isCustomer,
    hasRole,
    canAssignDefects,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

