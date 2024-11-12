const EventEmitter = require('events');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

const log = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const EVENT_TYPES = {
  TASK_CREATED: 'task.created',
  TASK_STATUS_CHANGED: 'task.status.changed',
  TASK_CANCELLED: 'task.cancelled',
};

class EventDispatcher extends EventEmitter {
  constructor() {
    super();
    this.eventQueue = [];
  }

  emitEvent(eventName, eventData) {
    const event = {
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString(),
      id: uuidv4(),
    };

    log.info({ event }, `Publishing domain event: ${eventName}`);

    this.eventQueue.push(event);

    this.emit(eventName, event);

    return event;
  }

  subscribeToEvent(eventName, handler) {
    log.info(`Subscribing to event: ${eventName}`);
    this.on(eventName, handler);
  }

  getQueuedEvents() {
    return [...this.eventQueue];
  }

  clearEventQueue() {
    this.eventQueue = [];
  }

  async publishToMessageBroker(event) {
    log.info({ event }, 'Message broker integration not configured. Event queued for future processing.');
  }
}

const eventDispatcher = new EventDispatcher();

module.exports = { eventDispatcher, EVENT_TYPES };

