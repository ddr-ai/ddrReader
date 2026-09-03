# 📖 ddrReader

> Transform any webpage, article, or documentation into a **3D animated virtual book** with realistic page turns, complete Table of Contents navigation, syntax-highlighted code blocks, persistent bookmarking, and **Cross-Device Database Synchronization**.

Runs both on your **desktop** (with unrestricted local scraping and SQLite database) and in the **browser on GitHub Pages**.

---

## ✨ Key Features

- **🌐 Webpage to 3D Virtual Book**: Converts any web URL or pasted content into a realistic 3D virtual book with hard covers, page creases, and realistic paper physics powered by `StPageFlip`.
- **☁️ Cross-Device Database Sync**:
  - **Supabase Cloud PostgreSQL**: Access all your virtual books, bookmarks, and reading progress on any device (phone, tablet, laptop, desktop) via cloud sync.
  - **Desktop SQLite Backend**: When running locally, books are automatically persisted in an SQLite database (`ddr_reader.sqlite`) and exposed via REST APIs.
  - **Shared Sync Keys**: Use a personal sync key to instantly link multiple browsers and devices.
  - **Realtime Updates**: Turn a page or create a book on your desktop, and it syncs immediately to your phone.
- **📑 Full Table of Contents (TOC)**:
  - Detects headings (`h1`-`h6`) and builds an interactive Table of Contents.
  - Ensures **100% of chapter content is preserved** without losing paragraphs, images, tables, or lists.
  - Direct chapter jumping from both the in-book TOC page and the slide-out TOC drawer.
- **🎨 Rich Formatting Preservation**:
  - **Highlighted Text**: Handles `<mark>`, highlighted spans, and color tags.
  - **Syntax-Highlighted Code**: Code blocks are formatted with PrismJS (supporting JS, TS, Python, Bash, Rust, Go, SQL, HTML/CSS) with line numbers, language badges, and one-click copy buttons.
  - **Important Notes & Callouts**: Converts GitHub alerts (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`) and documentation callouts into custom stylized callout boxes with icons.
- **📚 Persistent Virtual Library**:
  - Automatically saves every created book to local storage and your connected database.
  - **Last Page Bookmarked**: Automatically saves your exact reading position as you turn pages.
  - **Bookmark Ribbon**: Displays a gold/red ribbon on book cards with a *"Resume Page X"* button.
  - Custom bookmarks & notes support.
  - Search and filter library by title, author, reading progress, or bookmarks.
  - Backup & restore library via JSON export/import.
- **🔊 Realistic Audio & Text-to-Speech**:
  - Procedural paper flipping sound on page turns (generated offline using Web Audio API).
  - Audiobook mode (Text-to-Speech) reads the current page aloud and auto-advances.
- **👓 Themes & Typography**:
  - 5 Themes: Classic Sepia Parchment, Clean White, Warm Cream, Dark Velvet, and Cyberpunk.
  - 4 Fonts: Book Serif (Merriweather), Clean Sans (Inter), Dyslexic-Friendly, and Monospace (JetBrains Mono).

---

## ☁️ Cross-Device Database Setup (Access Books on Any Device)

### Option 1: Free Supabase Cloud (Recommended for Mobile & Web)
1. Create a free project at [supabase.com](https://supabase.com).
2. In your Supabase SQL Editor, run this query once:
   ```sql
   CREATE TABLE IF NOT EXISTS ddr_books (
     id TEXT PRIMARY KEY,
     sync_user_id TEXT NOT NULL,
     title TEXT,
     author TEXT,
     data JSONB NOT NULL,
     updated_at BIGINT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_ddr_books_user ON ddr_books(sync_user_id);
   ALTER TABLE ddr_books ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow sync by user id" ON ddr_books FOR ALL USING (true) WITH CHECK (true);
   ALTER PUBLICATION supabase_realtime ADD TABLE ddr_books;
   ```
3. Open **ddrReader** on any device (e.g. `https://ddr-ai.github.io/ddrReader/`), click **Cloud Sync** in the top navbar, and enter your Supabase URL, Anon Key, and a Personal Sync Key.
4. Enter the same Sync Key on your phone or laptop — all your books, chapters, and bookmarks will synchronize automatically!

### Option 2: Desktop Server SQLite Database
```bash
pnpm run desktop
```
When running `pnpm run desktop`, the backend server automatically runs SQLite on port 3300. Other devices on your local network can connect to `http://<your-computer-ip>:3300/api`.

---

## 🚀 Running on Desktop

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Desktop Server (with Unrestricted Scraper & SQLite)
```bash
pnpm run build
pnpm run desktop
```
Open **`http://localhost:3300`** in your browser.

---

## 🌐 Deploying to GitHub Pages

To deploy changes to GitHub Pages:
```bash
git add .
git commit -m "feat: add cross-device cloud sync"
git push origin main
```
The `.github/workflows/deploy.yml` workflow will automatically build and publish the update.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `→` / `Space` / `PageDown` | Next Page |
| `←` / `PageUp` | Previous Page |
| `Home` | Jump to Cover (Page 1) |
| `End` | Jump to Back Cover |
| `T` | Toggle Table of Contents Drawer |
| `S` | Search inside Book |
| `B` | Saved Bookmarks & Notes |
| `F` | Toggle Fullscreen Mode |
