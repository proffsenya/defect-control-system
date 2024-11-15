import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const DefectsList = () => {
  const { isManager, isAdmin } = useAuth();
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchDefects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ordersAPI.getAll(filters);
      setDefects(response.data.data.orders);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки дефектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [filters.status, filters.page, filters.sortBy, filters.sortOrder]);

  const handleStatusChange = (e) => {
    setFilters({ ...filters, status: e.target.value, page: 1 });
  };

  const handleSortChange = (e) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    setFilters({ ...filters, sortBy, sortOrder });
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

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await ordersAPI.exportExcel(filters);
      // Создаем blob и скачиваем файл
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `defects_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Ошибка экспорта в Excel');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !defects.length) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Дефекты</h1>
          <p className="mt-2 text-sm text-gray-700">
            Список всех дефектов в системе
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-3">
          {(isManager() || isAdmin()) && (
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="block rounded-md bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Экспорт...' : '📥 Excel'}
            </button>
          )}
          <Link
            to="/defects/new"
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Создать дефект
          </Link>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <div className="flex-1">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Статус
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Все статусы</option>
            <option value="created">Создан</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Завершен</option>
            <option value="cancelled">Отменен</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700">
            Сортировка
          </label>
          <select
            id="sort"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={handleSortChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="created_at-desc">Дата создания (новые)</option>
            <option value="created_at-asc">Дата создания (старые)</option>
            <option value="updated_at-desc">Дата обновления (новые)</option>
            <option value="total-desc">Сумма (больше)</option>
            <option value="total-asc">Сумма (меньше)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {defects.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <p className="text-gray-500">Дефекты не найдены</p>
          <Link
            to="/defects/new"
            className="mt-4 inline-block text-primary-600 hover:text-primary-500"
          >
            Создать первый дефект
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          ID
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Элементы
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Инженер
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Статус
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Сумма
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Создан
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {defects.map((defect) => (
                        <tr key={defect.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {defect.id.substring(0, 8)}...
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {Array.isArray(defect.items) ? defect.items.length : 0} элементов
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {defect.assigned_to_name || 'Не назначен'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                statusColors[defect.status] || statusColors.created
                              }`}
                            >
                              {statusLabels[defect.status] || defect.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatTotal(defect.total)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(defect.created_at)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              to={`/defects/${defect.id}`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Подробнее
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано {((pagination.page - 1) * pagination.limit) + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} из{' '}
                {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.pages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DefectsList;

