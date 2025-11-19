require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const taskRoutes = require('./controllers/taskController');
const photoRoutes = require('./controllers/photoController');
const commentRoutes = require('./controllers/commentController');
const { handleErrors } = require('./middleware/security');
const { eventDispatcher, EVENT_TYPES } = require('./core/EventDispatcher');
const { registerEventHandlers } = require('./core/eventHandlers');

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
});

registerEventHandlers(eventDispatcher, EVENT_TYPES);
log.info('Domain event handlers registered');

const server = express();
const PORT = process.env.PORT || 3002;

server.use(cors());
server.use(express.json());
server.use(pinoHttp({ logger: log }));

server.use('/v1/orders', taskRoutes);
server.use('/v1/orders', photoRoutes);
server.use('/v1/orders', commentRoutes);

server.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

server.use(handleErrors);

server.listen(PORT, () => {
  log.info(`Task Service listening on port ${PORT}`);
});

