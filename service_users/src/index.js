require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const accountRoutes = require('./controllers/accountController');
const { handleErrors } = require('./middleware/security');

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const server = express();
const PORT = process.env.PORT || 3001;

server.use(cors());
server.use(express.json());
server.use(pinoHttp({ logger: log }));

server.use('/v1/users', accountRoutes);

server.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

server.use(handleErrors);

server.listen(PORT, () => {
  log.info(`Account Service listening on port ${PORT}`);
});

