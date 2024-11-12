const pino = require('pino');

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const handleTaskCreated = (event) => {
  log.info(
    {
      eventId: event.id,
      taskId: event.data.orderId,
      userId: event.data.userId,
      total: event.data.total,
      timestamp: event.timestamp,
    },
    'Task created event received'
  );
};

const handleTaskStatusChanged = (event) => {
  log.info(
    {
      eventId: event.id,
      taskId: event.data.orderId,
      oldStatus: event.data.oldStatus,
      newStatus: event.data.newStatus,
      timestamp: event.timestamp,
    },
    'Task status changed event received'
  );
};

const registerEventHandlers = (eventDispatcher, EVENT_TYPES) => {
  eventDispatcher.subscribeToEvent(EVENT_TYPES.TASK_CREATED, handleTaskCreated);
  eventDispatcher.subscribeToEvent(EVENT_TYPES.TASK_STATUS_CHANGED, handleTaskStatusChanged);
};

module.exports = { registerEventHandlers };

