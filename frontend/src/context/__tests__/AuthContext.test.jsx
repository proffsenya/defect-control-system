import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
  },
}));

const wrapper = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('должен предоставлять функции аутентификации', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('register');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('user');
  });

  it('должен загружать пользователя из localStorage при инициализации', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', roles: ['user'] };
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    authAPI.getProfile = vi.fn().mockResolvedValue({
      data: { data: mockUser },
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });
  });

  it('должен выполнять вход пользователя', async () => {
    const mockResponse = {
      data: {
        data: {
          token: 'test-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User', roles: ['user'] },
        },
      },
    };
    
    authAPI.login = vi.fn().mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });
    
    expect(authAPI.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('должен выполнять выход пользователя', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      result.current.logout();
    });
    
    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('должен проверять роли пользователя', async () => {
    const mockUser = { id: '1', email: 'admin@example.com', name: 'Admin', roles: ['admin'] };
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    authAPI.getProfile = vi.fn().mockResolvedValue({
      data: { data: mockUser },
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });
    
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isManager()).toBe(false);
  });
});

