/**
 * ddrReader - Desktop Server & Scraper Backend
 * Runs locally to provide full-speed article extraction without browser CORS restrictions.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

// Scraper API (Desktop unrestricted fetcher)
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
  res.json({ status: 'ok', mode: 'desktop', version: '1.0.0' });
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
  console.log(`  • Unrestricted CORS scraper active on /api/scrape`);
  console.log(`  • 3D Virtual Book Engine Ready`);
  console.log(`======================================================\n`);

  // Open default browser if not in CI
  if (!process.env.CI && process.argv.includes('--open')) {
    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} ${localUrl}`, () => {});
  }
});
