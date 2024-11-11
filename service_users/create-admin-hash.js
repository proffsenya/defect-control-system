// Скрипт для генерации хеша пароля администратора
// Запустите из директории service_users: node create-admin-hash.js

const bcrypt = require('bcryptjs');

const password = 'Admin123!';

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('Email: admin@system.local');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nSQL:');
    console.log(`INSERT INTO users (id, email, password_hash, name, roles, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@system.local',
  '${hash}',
  'System Administrator',
  ARRAY['admin'],
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;`);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

