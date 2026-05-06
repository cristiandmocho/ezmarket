import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connect without a database selected so we can CREATE DATABASE
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  multipleStatements: true,
});

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

try {
  await connection.query(sql);
  console.log('Database initialised successfully.');
} finally {
  await connection.end();
}
