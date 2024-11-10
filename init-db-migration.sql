-- Миграция для добавления системы ролей и назначения дефектов

-- Добавляем поле assigned_to (инженер, на которого назначен дефект)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE orders ADD CONSTRAINT fk_orders_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id);

-- Добавляем индекс для быстрого поиска по назначенному инженеру
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);

-- Обновляем существующие записи: assigned_to = user_id (владелец становится инженером)
UPDATE orders SET assigned_to = user_id WHERE assigned_to IS NULL;

-- Создаем первого администратора (если нужно)
-- INSERT INTO users (id, email, password_hash, name, roles, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@system.local',
--   '$2a$10$YourHashedPasswordHere', -- Замените на реальный хеш пароля
--   'System Administrator',
--   ARRAY['admin'],
--   NOW(),
--   NOW()
-- ) ON CONFLICT (email) DO NOTHING;

