import 'dotenv/config';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await connection.query(`
    ALTER TABLE products
      ADD COLUMN normalised_name VARCHAR(255) NULL AFTER name,
      ADD COLUMN pack_size       VARCHAR(30)  NULL AFTER normalised_name,
      ADD KEY    idx_norm        (normalised_name, brand, pack_size);
  `);
  console.log('Migration applied: normalised_name + pack_size added to products.');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('Migration already applied — skipping.');
  } else {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
} finally {
  await connection.end();
}
