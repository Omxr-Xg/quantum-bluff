-- init.sql: Runs automatically on first startup
CREATE DATABASE quantumdb;

\c quantumdb;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username) VALUES ('admin'), ('guest');
