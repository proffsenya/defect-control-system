# Система управления дефектами - Микросервисная архитектура

Система управления дефектами и заказами с микросервисной архитектурой, включающая backend API и современный React frontend.

## Быстрый старт

### 1. Запуск проекта

```bash
docker-compose up --build
```

#### Удаление контейнеров и очистка
```bash
docker-compose down -v
```

#### Пересоздание бд
```bash
docker-compose up -d
```

Сервисы будут доступны:

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Service Users**: http://localhost:3001
- **Service Orders**: http://localhost:3002
- **PostgreSQL**: localhost:5432

---

## Структура проекта

```
Defect-system-control/
├── frontend/              # React Frontend (порт 5173)
│   ├── src/
│   │   ├── pages/        # Страницы приложения
│   │   ├── components/   # React компоненты
│   │   ├── context/      # Context API (AuthContext)
│   │   ├── services/     # API клиент
│   │   └── test/         # Тесты
│   ├── Dockerfile
│   └── package.json
│
├── api_gateway/          # API Gateway (порт 3000)
│   ├── src/
│   │   ├── index.js
│   │   └── middleware/
│   └── Dockerfile
│
├── service_users/        # Сервис пользователей (порт 3001)
│   ├── src/
│   │   ├── controllers/
│   │   ├── validators/
│   │   ├── middleware/
│   │   └── config/
│   ├── __tests__/
│   └── Dockerfile
│
├── service_orders/       # Сервис заказов/дефектов (порт 3002)
│   ├── src/
│   │   ├── controllers/
│   │   ├── validators/
│   │   ├── helpers/
│   │   ├── events/
│   │   └── core/
│   ├── __tests__/
│   └── Dockerfile
│
├── docs/                 # Документация
│   ├── openapi.yaml
│   ├── postman-collection.json
│   ├── API_EXAMPLES.md
│   ├── DOMAIN_EVENTS.md
│   ├── TESTING.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml
├── init-db.sql           # Инициализация БД
└── test-api.sh          # E2E тесты
```

---


### Архитектура

- API Gateway с проксированием
- Service Users с JWT
- Service Orders с полным CRUD
- PostgreSQL с автоматической инициализацией
- Docker Compose для всех сервисов
- React Frontend с защищёнными маршрутами

### Функциональные требования

**Frontend:**
- Регистрация и авторизация пользователей
- Создание дефектов/заказов
- Просмотр списка с фильтрацией
- Детальный просмотр дефекта
- Управление профилем
- Административная панель (список пользователей)
- Защита маршрутов с проверкой ролей
- Адаптивный дизайн

**API Gateway:**
- Проксирование `/v1/users` → service_users
- Проксирование `/v1/orders` → service_orders
- Проверка JWT на защищённых путях
- Rate limiting (100 req/15 min)
- CORS

**Service Users:**
- Регистрация с валидацией и проверкой уникальности email
- Вход с выдачей JWT
- Получение и обновление профиля
- Список пользователей для admin (с пагинацией и фильтрами)

**Service Orders:**
- Создание заказа с проверкой пользователя
- Получение заказа по ID (с проверкой прав)
- Список заказов с пагинацией и сортировкой
- Обновление статуса
- Отмена заказа
- Проверка прав на каждой операции

### Доменные события

- Публикация события "создан заказ"
- Публикация события "обновлён статус"

### Формат API

- JSON с полями `{success, data/error}`
- Ошибки с `{code, message}`
- Версионирование `/v1`
- Authorization: Bearer JWT
- Публичные только регистрация/вход

### Данные

- Пользователь: `id(UUID)`, `email`, `password_hash`, `name`, `roles[]`, `timestamps`
- Заказ: `id(UUID)`, `user_id`, `items(JSONB)`, `status(enum)`, `total`, `timestamps`

### Окружения

- Development (docker-compose.yml)
- Test (docs/DEPLOYMENT.md)
- Production (docs/DEPLOYMENT.md)

---

## Технологии

### Frontend
- React
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- Vitest + Testing Library

### Backend
- Node.js + Express
- PostgreSQL
- Docker & Docker Compose
- JWT (jsonwebtoken)
- Zod (валидация)
- Jest + Supertest (тестирование)
- Express Rate Limit
- CORS
- http-proxy-middleware

---

## Конфигурация базы данных

База данных: `defect-control-system-db`

При первом запуске автоматически создаются:
- Таблица `users` с полями: id, email, password_hash, name, roles, created_at, updated_at
- Таблица `orders` с полями: id, user_id, assigned_to, items, status, total, created_at, updated_at
- Индексы для оптимизации запросов
- Администратор по умолчанию: `admin@system.local`

---

### Тестирование

**Backend:**
- Успешная регистрация
- Повторная регистрация → ошибка
- Вход с валидными данными → токен
- Доступ без токена → отказ
- Создание заказа → статус "created"
- Получение своего заказа
- Список с пагинацией
- Попытка обновить чужой заказ → отказ
- Отмена своего заказа → статус "cancelled"

**Frontend:**
- Тесты компонентов (Vitest)
- Тесты защищённых маршрутов
- Тесты контекста авторизации
- Тесты API клиента

**Итого:** 25+ автоматических тестов (Jest/Vitest) + Postman коллекция + E2E bash-скрипт


### Юнит-тесты

```bash
# Service Users
cd service_users && npm install && npm test

# Service Orders
cd service_orders && npm install && npm test

# Frontend
cd frontend && npm install && npm test
```

**Что покрывают:**

- Регистрация и вход пользователей
- Валидация данных
- Защита маршрутов (токены)
- CRUD операции с заказами/дефектами
- Проверка прав доступа (свой/чужой заказ)
- Пагинация и фильтрация
- React компоненты и контекст авторизации

### E2E тесты

```bash
./test-api.sh
```

Проверяет полный цикл: регистрация → вход → создание заказа → обновление → отмена

### Postman

Импортируйте `docs/postman-collection.json` в Postman и запустите коллекцию.

## Документация

- **OpenAPI**: `docs/openapi.yaml` - полная спецификация API
- **Примеры**: `docs/API_EXAMPLES.md` - curl примеры для всех endpoints
- **События**: `docs/DOMAIN_EVENTS.md` - описание доменных событий
- **Тесты**: `docs/TESTING.md` - руководство по тестированию
- **Развёртывание**: `docs/DEPLOYMENT.md` - руководство по развёртыванию
- **Postman**: `docs/postman-collection.json` - коллекция для импорта
