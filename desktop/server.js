/**
 * ddrReader - Desktop Server & Database Sync Backend
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { initDatabase, getAllBooks, getBookById, upsertBook, deleteBookById, syncBatch } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize SQLite Database
await initDatabase();

// --- Database Sync API ---
app.get('/api/books', (req, res) => {
  const userId = req.headers['x-sync-user-id'] || req.query.userId || 'default_user';
  const books = getAllBooks(userId);
  res.json({ success: true, books });
});

app.get('/api/books/:id', (req, res) => {
  const userId = req.headers['x-sync-user-id'] || req.query.userId || 'default_user';
  const book = getBookById(req.params.id, userId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ success: true, book });
});

app.post('/api/books', (req, res) => {
  const userId = req.headers['x-sync-user-id'] || req.body.userId || 'default_user';
  const book = req.body.book || req.body;
  if (!book || !book.id) return res.status(400).json({ error: 'Invalid book payload' });
  const saved = upsertBook(book, userId);
  res.json({ success: true, book: saved });
});

app.delete('/api/books/:id', (req, res) => {
  const userId = req.headers['x-sync-user-id'] || req.query.userId || 'default_user';
  deleteBookById(req.params.id, userId);
  res.json({ success: true, id: req.params.id });
});

app.post('/api/sync', (req, res) => {
  const userId = req.headers['x-sync-user-id'] || req.body.userId || 'default_user';
  const clientBooks = req.body.books || [];
  const mergedBooks = syncBatch(clientBooks, userId);
  res.json({ success: true, books: mergedBooks });
});

// --- Scraper API ---
app.get('/api/scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL parameter' });
  }

  try {
    const parsedUrl = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    
    const response = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Source server returned HTTP ${response.status}: ${response.statusText}` });
    }

    const html = await response.text();
    return res.json({
      success: true,
      html,
      finalUrl: response.url || parsedUrl.href,
      contentType: response.headers.get('content-type')
    });
  } catch (error) {
    console.error('Desktop scraper error:', error.message);
    return res.status(500).json({ error: `Scraping failed: ${error.message}` });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'desktop', version: '1.0.0', database: 'sqlite' });
});

// Serve built frontend assets
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback to index.html for client-side routing (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(`  ddrReader Desktop Server Running at: ${localUrl}`);
  console.log(`  • SQLite Database & Cross-Device Sync active on /api`);
  console.log(`  • Unrestricted CORS scraper active on /api/scrape`);
  console.log(`======================================================\n`);

  if (!process.env.CI && process.argv.includes('--open')) {
    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} ${localUrl}`, () => {});
  }
});
