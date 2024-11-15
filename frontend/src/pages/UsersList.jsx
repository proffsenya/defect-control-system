import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const roleLabels = {
  user: 'Пользователь',
  engineer: 'Инженер',
  manager: 'Менеджер',
  director: 'Руководитель',
  customer: 'Заказчик',
  admin: 'Администратор',
};

const roleColors = {
  user: 'bg-gray-100 text-gray-800',
  engineer: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  director: 'bg-yellow-100 text-yellow-800',
  customer: 'bg-orange-100 text-orange-800',
  admin: 'bg-purple-100 text-purple-800',
};

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [filters, setFilters] = useState({
    role: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.getUsers(filters);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters.role, filters.page]);

  const handleRoleChange = (e) => {
    setFilters({ ...filters, role: e.target.value, page: 1 });
  };

  const handleEditRoles = (user) => {
    setEditingUser(user);
    setSelectedRoles([...user.roles]);
  };

  const handleRoleToggle = (role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSaveRoles = async () => {
    if (selectedRoles.length === 0) {
      setError('Необходимо выбрать хотя бы одну роль');
      return;
    }

    try {
      await authAPI.updateUserRoles(editingUser.id, selectedRoles);
      setEditingUser(null);
      setSelectedRoles([]);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Ошибка обновления ролей');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (loading && !users.length) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Пользователи</h1>
          <p className="mt-2 text-sm text-gray-700">
            Список всех пользователей системы
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="max-w-xs">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Фильтр по роли
          </label>
          <select
            id="role"
            value={filters.role}
            onChange={handleRoleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Все роли</option>
            <option value="user">Пользователь</option>
            <option value="engineer">Инженер</option>
            <option value="manager">Менеджер</option>
            <option value="director">Руководитель</option>
            <option value="customer">Заказчик</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <p className="text-gray-500">Пользователи не найдены</p>
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
                          Имя
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Email
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Роли
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Дата регистрации
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Действия</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {user.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-3 py-4 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {user.roles?.map((role) => (
                                <span
                                  key={role}
                                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                    roleColors[role] || 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {roleLabels[role] || role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => handleEditRoles(user)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Изменить роли
                            </button>
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

      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Изменить роли для {editingUser.name}
            </h3>
            <div className="space-y-2 mb-4">
              {Object.keys(roleLabels).map((role) => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{roleLabels[role]}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveRoles}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setSelectedRoles([]);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;

