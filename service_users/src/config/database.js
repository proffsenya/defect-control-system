const { Pool } = require('pg');

const dbConnection = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { dbConnection };

