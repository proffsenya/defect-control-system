require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');
const { validateJWT } = require('./middleware/security');

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const server = express();
const PORT = process.env.PORT || 3000;

server.use(cors());

server.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = req.id;
  next();
});

server.use(pinoHttp({ logger: log }));

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

server.use(requestLimiter);

const publicPaths = ['/v1/users/register', '/v1/users/login', '/health'];

server.use((req, res, next) => {
  const isPublicPath = publicPaths.some((path) => req.path.startsWith(path));
  if (!isPublicPath) {
    return validateJWT(req, res, next);
  }
  next();
});

const ACCOUNT_SERVICE_URL = process.env.SERVICE_USERS_URL || 'http://service_users:3001';
const TASK_SERVICE_URL = process.env.SERVICE_ORDERS_URL || 'http://service_orders:3002';

server.use(
  '/v1/users',
  createProxyMiddleware({
    target: ACCOUNT_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Request-ID', req.id);
    },
    onError: (err, req, res) => {
      log.error({ err, requestId: req.id }, 'Proxy error to account service');
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Account service is unavailable',
        },
      });
    },
  })
);

server.use(
  '/v1/orders',
  createProxyMiddleware({
    target: TASK_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Request-ID', req.id);
    },
    onError: (err, req, res) => {
      log.error({ err, requestId: req.id }, 'Proxy error to task service');
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Task service is unavailable',
        },
      });
    },
  })
);

server.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

server.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

server.listen(PORT, () => {
  log.info(`API Gateway listening on port ${PORT}`);
});

