import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateDefect = () => {
  const navigate = useNavigate();
  const { canAssignDefects, user } = useAuth();
  const [items, setItems] = useState([
    { name: '', quantity: 1, price: 0 },
  ]);
  const [assignedTo, setAssignedTo] = useState('');
  const [engineers, setEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canAssignDefects()) {
      fetchEngineers();
    }
  }, [canAssignDefects]);

  const fetchEngineers = async () => {
    setLoadingEngineers(true);
    try {
      const response = await authAPI.getEngineers();
      setEngineers(response.data.data.engineers);
    } catch (err) {
      setError('Ошибка загрузки списка инженеров');
    } finally {
      setLoadingEngineers(false);
    }
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity' || field === 'price') {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидация
    const validItems = items.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      setError('Добавьте хотя бы один элемент');
      return;
    }

    // Валидация для менеджеров/админов
    if (canAssignDefects() && !assignedTo) {
      setError('Необходимо выбрать инженера для назначения дефекта');
      return;
    }

    setLoading(true);
    try {
      const defectData = { items: validItems };
      if (canAssignDefects() && assignedTo) {
        defectData.assigned_to = assignedTo;
      }
      // Для инженеров assigned_to будет установлен автоматически на бэкенде
      await ordersAPI.create(defectData);
      navigate('/defects');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка создания дефекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Создать дефект</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {canAssignDefects() && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-2">
                Назначить инженеру <span className="text-red-500">*</span>
              </label>
              {loadingEngineers ? (
                <div className="text-sm text-gray-500">Загрузка списка инженеров...</div>
              ) : (
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  <option value="">Выберите инженера</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.name} ({engineer.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Элементы дефекта</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md"
              >
                + Добавить элемент
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Описание элемента"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Количество
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Цена за единицу
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Итого: {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                  }).format(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Общая сумма:</span>
              <span className="text-xl font-bold text-primary-600">
                {new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                }).format(calculateTotal())}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Создание...' : 'Создать дефект'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/defects')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDefect;

