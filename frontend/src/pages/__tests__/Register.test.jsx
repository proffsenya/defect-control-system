import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../Register';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  authAPI: {
    register: vi.fn(),
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

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен отображать форму регистрации', () => {
    renderWithRouter(<Register />);
    
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Имя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email адрес')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /зарегистрироваться/i })).toBeInTheDocument();
  });

  it('должен показывать ссылку на вход', () => {
    renderWithRouter(<Register />);
    
    const loginLink = screen.getByText('войдите в систему');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('должен обновлять значения полей при вводе', () => {
    renderWithRouter(<Register />);
    
    const nameInput = screen.getByPlaceholderText('Имя');
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(nameInput).toHaveValue('Test User');
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('должен вызывать register при отправке формы', async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: { id: '1', email: 'test@example.com', name: 'Test User' },
      },
    });
    
    authAPI.register = mockRegister;

    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithRouter(<Register />);
    
    const nameInput = screen.getByPlaceholderText('Имя');
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /зарегистрироваться/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
  });

  it('должен показывать ошибку при неудачной регистрации', async () => {
    const mockRegister = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Email already exists',
          },
        },
      },
    });
    
    authAPI.register = mockRegister;
    
    renderWithRouter(<Register />);
    
    const nameInput = screen.getByPlaceholderText('Имя');
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /зарегистрироваться/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/ошибка/i)).toBeInTheDocument();
    });
  });

  it('должен показывать состояние загрузки при отправке формы', async () => {
    const mockRegister = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    authAPI.register = mockRegister;
    
    renderWithRouter(<Register />);
    
    const nameInput = screen.getByPlaceholderText('Имя');
    const emailInput = screen.getByPlaceholderText('Email адрес');
    const passwordInput = screen.getByPlaceholderText('Пароль');
    const submitButton = screen.getByRole('button', { name: /зарегистрироваться/i });
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Регистрация...')).toBeInTheDocument();
  });
});

