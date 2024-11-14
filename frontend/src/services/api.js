import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обрабатываем ошибки ответов
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API для пользователей
export const authAPI = {
  register: (data) => api.post('/v1/users/register', data),
  login: (data) => api.post('/v1/users/login', data),
  getProfile: () => api.get('/v1/users/profile'),
  updateProfile: (data) => api.patch('/v1/users/profile', data),
  getUsers: (params) => api.get('/v1/users', { params }),
  updateUserRoles: (userId, roles) => api.patch(`/v1/users/${userId}/roles`, { roles }),
  getEngineers: () => api.get('/v1/users/engineers'),
};

// API для заказов/дефектов
export const ordersAPI = {
  create: (data) => api.post('/v1/orders', data),
  getAll: (params) => api.get('/v1/orders', { params }),
  getById: (id) => api.get(`/v1/orders/${id}`),
  updateStatus: (id, status) => api.patch(`/v1/orders/${id}/status`, { status }),
  cancel: (id) => api.delete(`/v1/orders/${id}`),
  exportExcel: (params) => api.get('/v1/orders/export/excel', { params, responseType: 'blob' }),
};

export default api;

