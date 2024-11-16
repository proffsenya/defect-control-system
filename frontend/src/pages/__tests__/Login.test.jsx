import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
  },
}));

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен отображать форму входа', () => {
    renderWithRouter(<Login />);
    
    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email адрес')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('должен показывать ссылку на регистрацию', () => {
    renderWithRouter(<Login />);
    
    const registerLink = screen.getByText('зарегистрируйтесь');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('должен обновлять значения полей при вводе', () => {
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('должен вызывать login при отправке формы', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      data: {
        data: {
          token: 'test-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      },
    });
    
    authAPI.login = mockLogin;
    
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /войти/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('должен показывать ошибку при неудачной авторизации', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Invalid credentials',
          },
        },
      },
    });
    
    authAPI.login = mockLogin;
    
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /войти/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/ошибка/i)).toBeInTheDocument();
    });
  });

  it('должен показывать состояние загрузки при отправке формы', async () => {
    const mockLogin = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    authAPI.login = mockLogin;
    
    renderWithRouter(<Login />);
    
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /войти/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Вход...')).toBeInTheDocument();
  });
});

