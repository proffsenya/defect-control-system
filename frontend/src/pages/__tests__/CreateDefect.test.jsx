import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateDefect from '../CreateDefect';
import { AuthProvider } from '../../context/AuthContext';
import { ordersAPI, authAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  ordersAPI: {
    create: vi.fn(),
  },
  authAPI: {
    getEngineers: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    canAssignDefects: () => false,
  }),
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

describe('CreateDefect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен отображать форму создания дефекта', () => {
    renderWithRouter(<CreateDefect />);
    
    expect(screen.getByText('Создать дефект')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Название элемента')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Количество')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Цена за единицу')).toBeInTheDocument();
  });

  it('должен добавлять элементы в список', () => {
    renderWithRouter(<CreateDefect />);
    
    const nameInput = screen.getByPlaceholderText('Название элемента');
    const quantityInput = screen.getByPlaceholderText('Количество');
    const priceInput = screen.getByPlaceholderText('Цена за единицу');
    const addButton = screen.getByText('Добавить элемент');
    
    fireEvent.change(nameInput, { target: { value: 'Кирпич' } });
    fireEvent.change(quantityInput, { target: { value: '100' } });
    fireEvent.change(priceInput, { target: { value: '50' } });
    fireEvent.click(addButton);
    
    expect(screen.getByText('Кирпич')).toBeInTheDocument();
  });

  it('должен удалять элементы из списка', () => {
    renderWithRouter(<CreateDefect />);
    
    const nameInput = screen.getByPlaceholderText('Название элемента');
    const quantityInput = screen.getByPlaceholderText('Количество');
    const priceInput = screen.getByPlaceholderText('Цена за единицу');
    const addButton = screen.getByText('Добавить элемент');
    
    fireEvent.change(nameInput, { target: { value: 'Кирпич' } });
    fireEvent.change(quantityInput, { target: { value: '100' } });
    fireEvent.change(priceInput, { target: { value: '50' } });
    fireEvent.click(addButton);
    
    const removeButton = screen.getByText('Удалить');
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('Кирпич')).not.toBeInTheDocument();
  });

  it('должен создавать дефект при отправке формы', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: { id: '1' },
      },
    });
    
    ordersAPI.create = mockCreate;

    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithRouter(<CreateDefect />);
    
    const nameInput = screen.getByPlaceholderText('Название элемента');
    const quantityInput = screen.getByPlaceholderText('Количество');
    const priceInput = screen.getByPlaceholderText('Цена за единицу');
    const addButton = screen.getByText('Добавить элемент');
    const submitButton = screen.getByText('Создать дефект');
    
    fireEvent.change(nameInput, { target: { value: 'Кирпич' } });
    fireEvent.change(quantityInput, { target: { value: '100' } });
    fireEvent.change(priceInput, { target: { value: '50' } });
    fireEvent.click(addButton);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('должен показывать ошибку при неудачном создании', async () => {
    const mockCreate = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Ошибка создания',
          },
        },
      },
    });
    
    ordersAPI.create = mockCreate;
    
    renderWithRouter(<CreateDefect />);
    
    const nameInput = screen.getByPlaceholderText('Название элемента');
    const quantityInput = screen.getByPlaceholderText('Количество');
    const priceInput = screen.getByPlaceholderText('Цена за единицу');
    const addButton = screen.getByText('Добавить элемент');
    const submitButton = screen.getByText('Создать дефект');
    
    fireEvent.change(nameInput, { target: { value: 'Кирпич' } });
    fireEvent.change(quantityInput, { target: { value: '100' } });
    fireEvent.change(priceInput, { target: { value: '50' } });
    fireEvent.click(addButton);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/ошибка/i)).toBeInTheDocument();
    });
  });
});

