# Руководство по тестированию

## Бэкенд тесты

### Service Users (Account Service)

Тесты находятся в `service_users/__tests__/account.test.js`

Для запуска:
```bash
cd service_users
npm test
```

**Примечание**: Тесты требуют подключения к базе данных. Убедитесь, что:
1. База данных запущена
2. Переменная окружения `DATABASE_URL` настроена
3. Переменная окружения `JWT_SECRET` установлена

### Service Orders (Task Service)

Тесты находятся в:
- `service_orders/__tests__/task.test.js` - тесты API
- `service_orders/__tests__/permissions.test.js` - тесты прав доступа

Для запуска:
```bash
cd service_orders
npm test
```

## Фронтенд тесты

Тесты находятся в `frontend/src/`:
- `pages/__tests__/Login.test.jsx` - тесты компонента входа
- `pages/__tests__/Register.test.jsx` - тесты компонента регистрации
- `pages/__tests__/DefectsList.test.jsx` - тесты списка дефектов
- `pages/__tests__/CreateDefect.test.jsx` - тесты создания дефекта
- `services/__tests__/api.test.js` - тесты API клиента

Для запуска:
```bash
cd frontend
npm test
```

Для запуска с покрытием:
```bash
npm run test:coverage
```

## Структура тестов

### Бэкенд
- Используется Jest и Supertest
- Тесты проверяют API endpoints
- Проверяются валидация, авторизация, права доступа

### Фронтенд
- Используется Vitest и React Testing Library
- Тесты проверяют компоненты React
- Мокируются API вызовы
- Проверяется пользовательский интерфейс

