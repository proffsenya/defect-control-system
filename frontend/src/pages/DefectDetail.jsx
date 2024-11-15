import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  created: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  created: 'Создан',
  in_progress: 'В работе',
  completed: 'Завершен',
  cancelled: 'Отменен',
};

const DefectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [defect, setDefect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchDefect();
  }, [id]);

  const fetchDefect = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ordersAPI.getById(id);
      setDefect(response.data.data);
      setNewStatus(response.data.data.status);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки дефекта');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === defect.status) return;

    setUpdating(true);
    try {
      const response = await ordersAPI.updateStatus(id, newStatus);
      setDefect(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка обновления статуса');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Вы уверены, что хотите отменить этот дефект?')) {
      return;
    }

    setUpdating(true);
    try {
      await ordersAPI.cancel(id);
      navigate('/defects');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка отмены дефекта');
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const formatTotal = (total) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(total);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !defect) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => navigate('/defects')}
          className="mt-4 text-primary-600 hover:text-primary-500"
        >
          ← Вернуться к списку
        </button>
      </div>
    );
  }

  if (!defect) return null;

  const items = Array.isArray(defect.items) ? defect.items : [];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/defects')}
          className="mb-4 text-primary-600 hover:text-primary-500"
        >
          ← Вернуться к списку
        </button>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Дефект #{id.substring(0, 8)}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Создан: {formatDate(defect.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  statusColors[defect.status] || statusColors.created
                }`}
              >
                {statusLabels[defect.status] || defect.status}
              </span>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="px-6 py-5 space-y-6">
            {defect.assigned_to_name && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Назначенный инженер</h3>
                <p className="text-lg font-semibold text-gray-900">{defect.assigned_to_name}</p>
                {defect.assigned_to_email && (
                  <p className="text-sm text-gray-500">{defect.assigned_to_email}</p>
                )}
              </div>
            )}

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Элементы дефекта</h2>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Название
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Количество
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Цена за единицу
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Итого
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {item.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatTotal(item.price)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {formatTotal(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="py-4 pl-4 pr-3 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                        Общая сумма:
                      </td>
                      <td className="px-3 py-4 text-sm font-bold text-gray-900">
                        {formatTotal(defect.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Управление статусом</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Статус
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={defect.status === 'cancelled' || defect.status === 'completed'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="created">Создан</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Завершен</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </div>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === defect.status || defect.status === 'cancelled' || defect.status === 'completed'}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Обновление...' : 'Обновить статус'}
                </button>
              </div>
            </div>

            {defect.status !== 'cancelled' && defect.status !== 'completed' && (
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={handleCancel}
                  disabled={updating}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отменить дефект
                </button>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6 text-sm text-gray-500">
              <p>Последнее обновление: {formatDate(defect.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefectDetail;

