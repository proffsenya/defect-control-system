import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DefectsList from '../DefectsList';
import { AuthProvider } from '../../context/AuthContext';
import { ordersAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  ordersAPI: {
    getAll: vi.fn(),
    exportExcel: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    isManager: () => false,
    isAdmin: () => false,
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

describe('DefectsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен отображать заголовок списка дефектов', () => {
    ordersAPI.getAll.mockResolvedValue({
      data: {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
      },
    });

    renderWithRouter(<DefectsList />);
    
    expect(screen.getByText('Дефекты')).toBeInTheDocument();
  });

  it('должен загружать и отображать список дефектов', async () => {
    const mockDefects = [
      {
        id: '1',
        items: [{ name: 'Item 1', quantity: 1, price: 100 }],
        status: 'created',
        total: 100,
        created_at: '2024-01-01T00:00:00Z',
        assigned_to_name: 'Engineer 1',
      },
    ];

    ordersAPI.getAll.mockResolvedValue({
      data: {
        success: true,
        data: {
          orders: mockDefects,
          pagination: { page: 1, limit: 10, total: 1, pages: 1 },
        },
      },
    });

    renderWithRouter(<DefectsList />);
    
    await waitFor(() => {
      expect(screen.getByText('Engineer 1')).toBeInTheDocument();
    });
  });

  it('должен показывать состояние загрузки', () => {
    ordersAPI.getAll.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<DefectsList />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('должен показывать ошибку при неудачной загрузке', async () => {
    ordersAPI.getAll.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Ошибка загрузки',
          },
        },
      },
    });

    renderWithRouter(<DefectsList />);
    
    await waitFor(() => {
      expect(screen.getByText(/ошибка/i)).toBeInTheDocument();
    });
  });

  it('должен фильтровать по статусу', async () => {
    ordersAPI.getAll.mockResolvedValue({
      data: {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
      },
    });

    renderWithRouter(<DefectsList />);
    
    await waitFor(() => {
      expect(ordersAPI.getAll).toHaveBeenCalled();
    });

    const statusSelect = screen.getByLabelText('Статус');
    fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
    
    await waitFor(() => {
      expect(ordersAPI.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      );
    });
  });

  it('должен показывать кнопку экспорта для менеджера', async () => {
    vi.mock('../../context/AuthContext', () => ({
      AuthProvider: ({ children }) => children,
      useAuth: () => ({
        isManager: () => true,
        isAdmin: () => false,
      }),
    }));

    ordersAPI.getAll.mockResolvedValue({
      data: {
        success: true,
        data: {
          orders: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
      },
    });

    renderWithRouter(<DefectsList />);
    
    await waitFor(() => {
      expect(screen.getByText('📥 Excel')).toBeInTheDocument();
    });
  });
});

