const request = require('supertest');
const express = require('express');
const accountController = require('../src/controllers/accountController');

const testServer = express();
testServer.use(express.json());
testServer.use('/v1/users', accountController);

const generateTestAccount = () => ({
  email: `test${Date.now()}@example.com`,
  password: 'password123',
  name: 'Test User',
});

let authToken = '';
let accountId = '';

describe('Account Service API Tests', () => {
  describe('POST /v1/users/register', () => {
    test('должна успешно зарегистрировать новый аккаунт', async () => {
      const testAccount = generateTestAccount();
      const response = await request(testServer)
        .post('/v1/users/register')
        .send(testAccount)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(testAccount.email);
      expect(response.body.data.name).toBe(testAccount.name);
      expect(response.body.data.roles).toContain('user');
      
      accountId = response.body.data.id;
    });

    test('должна вернуть ошибку при повторной регистрации с тем же email', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount)
        .expect(201);

      const response = await request(testServer)
        .post('/v1/users/register')
        .send(testAccount)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    test('должна вернуть ошибку валидации при невалидном email', async () => {
      const response = await request(testServer)
        .post('/v1/users/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('должна вернуть ошибку валидации при коротком пароле', async () => {
      const response = await request(testServer)
        .post('/v1/users/register')
        .send({
          email: 'new@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /v1/users/login', () => {
    test('должна успешно авторизовать пользователя с правильными данными', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount);

      const response = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount.email,
          password: testAccount.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(testAccount.email);
      
      authToken = response.body.data.token;
    });

    test('должна вернуть ошибку при неправильном пароле', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount);

      const response = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('должна вернуть ошибку при несуществующем email', async () => {
      const response = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /v1/users/profile - защищённый путь', () => {
    test('должна вернуть отказ при доступе без токена', async () => {
      const response = await request(testServer)
        .get('/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('должна вернуть отказ при невалидном токене', async () => {
      const response = await request(testServer)
        .get('/v1/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('должна успешно вернуть профиль с валидным токеном', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount);

      const loginResponse = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount.email,
          password: testAccount.password,
        });

      const token = loginResponse.body.data.token;

      const response = await request(testServer)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testAccount.email);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('created_at');
    });
  });

  describe('PATCH /v1/users/profile', () => {
    test('должна успешно обновить имя пользователя', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount);

      const loginResponse = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount.email,
          password: testAccount.password,
        });

      const token = loginResponse.body.data.token;

      const response = await request(testServer)
        .patch('/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    test('должна вернуть ошибку при обновлении на занятый email', async () => {
      const testAccount1 = generateTestAccount();
      const testAccount2 = generateTestAccount();
      
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount1);
      
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount2);

      const loginResponse = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount2.email,
          password: testAccount2.password,
        });

      const token = loginResponse.body.data.token;

      const response = await request(testServer)
        .patch('/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: testAccount1.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('GET /v1/users - только для admin', () => {
    test('должна вернуть отказ для обычного пользователя', async () => {
      const testAccount = generateTestAccount();
      await request(testServer)
        .post('/v1/users/register')
        .send(testAccount);

      const loginResponse = await request(testServer)
        .post('/v1/users/login')
        .send({
          email: testAccount.email,
          password: testAccount.password,
        });

      const token = loginResponse.body.data.token;

      const response = await request(testServer)
        .get('/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
