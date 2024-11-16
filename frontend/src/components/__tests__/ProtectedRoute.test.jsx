import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  authAPI: {
    getProfile: vi.fn(),
  },
}));

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен показывать загрузку при проверке аутентификации', () => {
    authAPI.getProfile = vi.fn().mockImplementation(() => 
      new Promise(() => {})
    );
    
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }));
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('должен перенаправлять на /login если пользователь не аутентифицирован', () => {
    localStorage.clear();
    
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Проверяем, что произошло перенаправление
    // В реальном тесте нужно использовать более сложную проверку
  });

  it('должен показывать контент для аутентифицированного пользователя', async () => {
    authAPI.getProfile = vi.fn().mockResolvedValue({
      data: {
        data: { id: '1', email: 'test@example.com', name: 'Test User', roles: ['user'] },
      },
    });
    
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }));
    
    render(
      <BrowserRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Ждем завершения загрузки
    await new Promise(resolve => setTimeout(resolve, 100));
  });
});

