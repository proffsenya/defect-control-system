# Доменные события

## Обзор

Сервис заказов публикует доменные события при изменении состояния заказов. События используются для:

- Интеграции с другими сервисами
- Аудита операций

## Архитектура

```
Order Operation
    ↓
EventBus.publish()
    ↓
├─→ Event Handler (логирование)
└─→ Message Broker (опционально)
```

## События

### 1. order.created

**Когда:** При успешном создании нового заказа

**Payload:**
```json
{
  "name": "order.created",
  "id": "9f295792-3359-4d1a-8d6d-2871614fe478",
  "timestamp": "2025-11-14T04:48:34.784Z",
  "data": {
    "orderId": "b8277747-b378-4d6d-8ec8-2d9b1548dd96",
    "userId": "cab9fe0b-e964-4147-bb01-ea03f1babcbd",
    "items": [
      {
        "name": "Кирпич",
        "quantity": 100,
        "price": 50.5
      }
    ],
    "total": "5050.00",
    "status": "created"
  }
}
```

**Пример лога:**
```json
{
  "level": 30,
  "time": 1763095714785,
  "eventId": "9f295792-3359-4d1a-8d6d-2871614fe478",
  "orderId": "b8277747-b378-4d6d-8ec8-2d9b1548dd96",
  "userId": "cab9fe0b-e964-4147-bb01-ea03f1babcbd",
  "total": "5050.00",
  "msg": "Order created event received"
}
```

### 2. order.status.updated

**Когда:** При изменении статуса заказа

**Payload:**
```json
{
  "name": "order.status.updated",
  "id": "aec986f6-0153-4d56-a718-a77435d3dc1e",
  "timestamp": "2025-11-14T04:49:09.604Z",
  "data": {
    "orderId": "b8277747-b378-4d6d-8ec8-2d9b1548dd96",
    "userId": "cab9fe0b-e964-4147-bb01-ea03f1babcbd",
    "oldStatus": "created",
    "newStatus": "in_progress"
  }
}
```

**Пример лога:**
```json
{
  "level": 30,
  "eventId": "aec986f6-0153-4d56-a718-a77435d3dc1e",
  "orderId": "b8277747-b378-4d6d-8ec8-2d9b1548dd96",
  "oldStatus": "created",
  "newStatus": "in_progress",
  "msg": "Order status updated event received"
}
```

### 3. order.cancelled

**Когда:** При отмене заказа

**Payload:**
```json
{
  "name": "order.cancelled",
  "id": "uuid",
  "timestamp": "ISO-8601",
  "data": {
    "orderId": "uuid",
    "userId": "uuid",
    "oldStatus": "in_progress",
    "newStatus": "cancelled"
  }
}
```

## Использование

### Подписка на события

```javascript
const eventBus = require('./events/EventBus');
const eventTypes = require('./events/eventTypes');

eventBus.subscribe(eventTypes.ORDER_CREATED, (event) => {
  console.log('Новый заказ:', event.data.orderId);
});
```

### Публикация события

```javascript
eventBus.publish(eventTypes.ORDER_CREATED, {
  orderId: order.id,
  userId: order.user_id,
  items: order.items,
  total: order.total,
  status: order.status,
});
```

## Интеграция с брокером сообщений

События автоматически публикуются в брокер сообщений (RabbitMQ/Kafka), если включена интеграция:

```env
MESSAGE_BROKER_ENABLED=true
MESSAGE_BROKER_TYPE=rabbitmq
MESSAGE_BROKER_HOST=localhost
MESSAGE_BROKER_PORT=5672
```

### Routing keys

- `order.created` → создание заказа
- `order.status.updated` → обновление статуса
- `order.cancelled` → отмена заказа

### Exchange

По умолчанию: `orders_exchange` (topic)

## Просмотр событий в логах

```bash
docker-compose logs service_orders | grep "domain event"
```

Или для конкретного типа:

```bash
docker-compose logs service_orders | grep "order.created"
docker-compose logs service_orders | grep "order.status.updated"
```

## Очередь событий

EventBus хранит историю событий в памяти:

```javascript
const eventBus = require('./events/EventBus');

const queuedEvents = eventBus.getQueuedMessages();
console.log('Всего событий:', queuedEvents.length);

eventBus.clearQueue();
```
