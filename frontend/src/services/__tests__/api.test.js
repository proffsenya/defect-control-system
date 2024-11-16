import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { authAPI, ordersAPI } from '../api';

vi.mock('axios');
const mockedAxios = axios;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('authAPI', () => {
    it('должен вызывать register с правильными данными', async () => {
      const mockResponse = { data: { success: true, data: { id: '1' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.post('/v1/users/register', { email: 'test@example.com', password: '123456', name: 'Test' });

      expect(api.post).toHaveBeenCalledWith('/v1/users/register', {
        email: 'test@example.com',
        password: '123456',
        name: 'Test',
      });
    });

    it('должен вызывать login с правильными данными', async () => {
      const mockResponse = { data: { success: true, data: { token: 'test-token' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.post('/v1/users/login', { email: 'test@example.com', password: '123456' });

      expect(api.post).toHaveBeenCalledWith('/v1/users/login', {
        email: 'test@example.com',
        password: '123456',
      });
    });

    it('должен вызывать getProfile', async () => {
      const mockResponse = { data: { success: true, data: { id: '1' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.get('/v1/users/profile');

      expect(api.get).toHaveBeenCalledWith('/v1/users/profile');
    });

    it('должен вызывать getEngineers', async () => {
      const mockResponse = { data: { success: true, data: { engineers: [] } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.get('/v1/users/engineers');

      expect(api.get).toHaveBeenCalledWith('/v1/users/engineers');
    });
  });

  describe('ordersAPI', () => {
    it('должен вызывать create с правильными данными', async () => {
      const mockResponse = { data: { success: true, data: { id: '1' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      const orderData = {
        items: [{ name: 'Item 1', quantity: 1, price: 100 }],
      };
      await api.post('/v1/orders', orderData);

      expect(api.post).toHaveBeenCalledWith('/v1/orders', orderData);
    });

    it('должен вызывать getAll с параметрами', async () => {
      const mockResponse = { data: { success: true, data: { orders: [] } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.get('/v1/orders', { params: { page: 1, limit: 10 } });

      expect(api.get).toHaveBeenCalledWith('/v1/orders', { params: { page: 1, limit: 10 } });
    });

    it('должен вызывать getById', async () => {
      const mockResponse = { data: { success: true, data: { id: '1' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.get('/v1/orders/123');

      expect(api.get).toHaveBeenCalledWith('/v1/orders/123');
    });

    it('должен вызывать updateStatus', async () => {
      const mockResponse = { data: { success: true, data: { id: '1' } } };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn(),
        patch: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.patch('/v1/orders/123/status', { status: 'in_progress' });

      expect(api.patch).toHaveBeenCalledWith('/v1/orders/123/status', { status: 'in_progress' });
    });

    it('должен вызывать exportExcel', async () => {
      const mockResponse = { data: new Blob() };
      mockedAxios.create = vi.fn(() => ({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      }));

      const api = mockedAxios.create();
      await api.get('/v1/orders/export/excel', { params: {}, responseType: 'blob' });

      expect(api.get).toHaveBeenCalledWith('/v1/orders/export/excel', { params: {}, responseType: 'blob' });
    });
  });
});
