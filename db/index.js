import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import env from "dotenv";

env.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => console.error("[db] unexpected error", err));

export async function initializeDatabase() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  try {
    await pool.query(sql);
    console.log("[db] schema initialized");
  } catch (err) {
    console.error("[db] schema initialization failed:", err.message);
    throw err;
  }
}

export async function shutdown() {
  try {
    await pool.end();
    console.log("[db] pool closed");
  } catch (err) {
    console.error("[db] error during shutdown:", err.message);
  }
}
