/**
 * ddrReader - Desktop SQLite Database
 * Stores virtual books persistently on disk using Node.js built-in sqlite.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '..', 'ddr_reader.sqlite');

let db = null;

export async function initDatabase() {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(DB_FILE);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        sync_user_id TEXT DEFAULT 'default_user',
        title TEXT,
        author TEXT,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_user ON books(sync_user_id);
    `);
    console.log(`  • SQLite Database active at: ${DB_FILE}`);
  } catch (err) {
    console.warn(`  • Using JSON File Storage fallback (SQLite error: ${err.message})`);
    initJsonFallback();
  }
}

// Fallback if node:sqlite is not accessible
const FALLBACK_FILE = path.join(__dirname, '..', 'ddr_reader_db.json');
function initJsonFallback() {
  if (!fs.existsSync(FALLBACK_FILE)) {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify({ books: [] }, null, 2));
  }
}

function getJsonFallbackBooks() {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
    return data.books || [];
  } catch {
    return [];
  }
}

function saveJsonFallbackBooks(books) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify({ books }, null, 2));
  } catch (e) {
    console.error('JSON fallback save error:', e);
  }
}

export function getAllBooks(userId = 'default_user') {
  if (db) {
    const stmt = db.prepare('SELECT id, data, updated_at FROM books WHERE sync_user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId);
    return rows.map(r => JSON.parse(r.data));
  } else {
    const books = getJsonFallbackBooks();
    return books.filter(b => !b.sync_user_id || b.sync_user_id === userId);
  }
}

export function getBookById(id, userId = 'default_user') {
  if (db) {
    const stmt = db.prepare('SELECT data FROM books WHERE id = ? AND sync_user_id = ?');
    const row = stmt.get(id, userId);
    return row ? JSON.parse(row.data) : null;
  } else {
    const books = getJsonFallbackBooks();
    return books.find(b => b.id === id) || null;
  }
}

export function upsertBook(book, userId = 'default_user') {
  const now = Date.now();
  const bookToSave = { ...book, updatedAt: book.updatedAt || now };
  const jsonStr = JSON.stringify(bookToSave);

  if (db) {
    const stmt = db.prepare(`
      INSERT INTO books (id, sync_user_id, title, author, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        author = excluded.author,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    stmt.run(bookToSave.id, userId, bookToSave.title || 'Untitled', bookToSave.author || '', jsonStr, bookToSave.updatedAt);
  } else {
    let books = getJsonFallbackBooks();
    const idx = books.findIndex(b => b.id === bookToSave.id);
    if (idx >= 0) {
      books[idx] = { ...bookToSave, sync_user_id: userId };
    } else {
      books.unshift({ ...bookToSave, sync_user_id: userId });
    }
    saveJsonFallbackBooks(books);
  }
  return bookToSave;
}

export function deleteBookById(id, userId = 'default_user') {
  if (db) {
    const stmt = db.prepare('DELETE FROM books WHERE id = ? AND sync_user_id = ?');
    stmt.run(id, userId);
  } else {
    let books = getJsonFallbackBooks();
    books = books.filter(b => b.id !== id);
    saveJsonFallbackBooks(books);
  }
  return true;
}

export function syncBatch(clientBooks, userId = 'default_user') {
  const serverBooks = getAllBooks(userId);
  const serverMap = new Map(serverBooks.map(b => [b.id, b]));
  const updatedClientBooks = [];

  for (const clientBook of clientBooks) {
    const serverBook = serverMap.get(clientBook.id);
    if (!serverBook) {
      upsertBook(clientBook, userId);
      serverMap.set(clientBook.id, clientBook);
    } else {
      const clientTime = clientBook.updatedAt || clientBook.lastReadAt || 0;
      const serverTime = serverBook.updatedAt || serverBook.lastReadAt || 0;
      if (clientTime > serverTime) {
        upsertBook(clientBook, userId);
        serverMap.set(clientBook.id, clientBook);
      }
    }
  }

  return Array.from(serverMap.values());
}
