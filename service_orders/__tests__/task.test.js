const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const taskController = require('../src/controllers/taskController');

const testServer = express();
testServer.use(express.json());
testServer.use('/v1/orders', taskController);

const testUserId = 'cab9fe0b-e964-4147-bb01-ea03f1babcbd';
const testUserId2 = 'bbb9fe0b-e964-4147-bb01-ea03f1babcbd';

const createAuthToken = (userId, roles = ['user']) => {
  return jwt.sign(
    {
      user_id: userId,
      email: 'test@example.com',
      roles,
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '24h' }
  );
};

const userToken = createAuthToken(testUserId);
const userToken2 = createAuthToken(testUserId2);
const adminToken = createAuthToken(testUserId, ['admin']);
const managerToken = createAuthToken(testUserId, ['manager']);
const engineerToken = createAuthToken(testUserId, ['engineer']);

let createdTaskId = '';

describe('Task Service API Tests', () => {
  describe('POST /v1/orders', () => {
    test('должна успешно создать задачу для авторизованного пользователя', async () => {
      const response = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            { name: 'Кирпич', quantity: 100, price: 50.5 },
            { name: 'Цемент', quantity: 50, price: 150 },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('created');
      expect(parseFloat(response.body.data.total)).toBe(12550);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      
      createdTaskId = response.body.data.id;
    });

    test('должна вернуть ошибку при пустом массиве items', async () => {
      const response = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ items: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('должна вернуть ошибку при невалидных данных item', async () => {
      const response = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ name: 'Test', quantity: -1, price: 100 }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('должна вернуть отказ без токена авторизации', async () => {
      const response = await request(testServer)
        .post('/v1/orders')
        .send({
          items: [{ name: 'Test', quantity: 1, price: 100 }],
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /v1/orders/:id', () => {
    test('должна успешно вернуть свою задачу', async () => {
      const createResponse = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ name: 'Test Item', quantity: 1, price: 100 }],
        });

      const taskId = createResponse.body.data.id;

      const response = await request(testServer)
        .get(`/v1/orders/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.user_id).toBe(testUserId);
    });

    test('должна вернуть ошибку при несуществующем ID', async () => {
      const response = await request(testServer)
        .get('/v1/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    test('должна вернуть отказ без токена', async () => {
      const response = await request(testServer)
        .get(`/v1/orders/${createdTaskId || '00000000-0000-0000-0000-000000000000'}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /v1/orders', () => {
    test('должна вернуть список задач с пагинацией', async () => {
      const response = await request(testServer)
        .get('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    test('должна вернуть отказ без токена', async () => {
      const response = await request(testServer)
        .get('/v1/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /v1/orders/:id/status', () => {
    test('должна успешно обновить статус задачи', async () => {
      const createResponse = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ name: 'Test Item', quantity: 1, price: 100 }],
        });

      const taskId = createResponse.body.data.id;

      const response = await request(testServer)
        .patch(`/v1/orders/${taskId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
    });

    test('должна вернуть ошибку при невалидном статусе', async () => {
      const createResponse = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ name: 'Test Item', quantity: 1, price: 100 }],
        });

      const taskId = createResponse.body.data.id;

      const response = await request(testServer)
        .patch(`/v1/orders/${taskId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('должна вернуть отказ без токена', async () => {
      const response = await request(testServer)
        .patch(`/v1/orders/${createdTaskId || '00000000-0000-0000-0000-000000000000'}/status`)
        .send({ status: 'completed' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /v1/orders/:id', () => {
    test('должна успешно отменить задачу', async () => {
      const createResponse = await request(testServer)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ name: 'Test Item', quantity: 1, price: 100 }],
        });

      const taskId = createResponse.body.data.id;

      const response = await request(testServer)
        .delete(`/v1/orders/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
    });

    test('должна вернуть отказ без токена', async () => {
      const response = await request(testServer)
        .delete(`/v1/orders/${createdTaskId || '00000000-0000-0000-0000-000000000000'}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
