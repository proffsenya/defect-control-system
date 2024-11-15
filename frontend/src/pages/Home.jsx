import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Система управления дефектами
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Эффективное управление дефектами и заказами в одном месте
        </p>

        {isAuthenticated ? (
          <div className="flex gap-4 justify-center">
            <Link
              to="/defects"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium text-lg transition-colors"
            >
              Перейти к дефектам
            </Link>
            <Link
              to="/defects/new"
              className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-md font-medium text-lg transition-colors"
            >
              Создать дефект
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link
              to="/login"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md font-medium text-lg transition-colors"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-md font-medium text-lg transition-colors"
            >
              Зарегистрироваться
            </Link>
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Управление дефектами
            </h3>
            <p className="text-gray-600">
              Создавайте, отслеживайте и управляйте дефектами с удобным интерфейсом
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Отслеживание статусов
            </h3>
            <p className="text-gray-600">
              Отслеживайте статусы дефектов в реальном времени
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Управление пользователями
            </h3>
            <p className="text-gray-600">
              Административный доступ для управления пользователями системы
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

