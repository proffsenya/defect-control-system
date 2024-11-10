CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    roles TEXT[] DEFAULT ARRAY['user']::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    assigned_to UUID,
    items JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'created',
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_users_email ON users(email);


INSERT INTO users (id, email, password_hash, name, roles, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@system.local',
  '$2a$10$ugiqycK.yNIIETasCm4/E.g4VFEeksa3Bi0NCOqtOLZTrit3atXsG',
  'System Administrator',
  ARRAY['admin'],
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

