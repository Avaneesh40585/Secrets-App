CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  secret TEXT,
  provider VARCHAR(32) DEFAULT 'local'
);
