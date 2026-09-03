# 📖 ddrReader

> Transform any webpage, article, or documentation into a **3D animated virtual book** with realistic page turns, complete Table of Contents navigation, syntax-highlighted code blocks, persistent bookmarking, and a virtual library.

Runs both on your **desktop** (with unrestricted local scraping) and in the **browser on GitHub Pages**.

---

## ✨ Key Features

- **🌐 Webpage to 3D Virtual Book**: Converts any web URL or pasted content into a realistic 3D virtual book with hard covers, page creases, and realistic paper physics powered by `StPageFlip`.
- **📑 Full Table of Contents (TOC)**:
  - Detects headings (`h1`-`h6`) and builds an interactive Table of Contents.
  - Ensures **100% of chapter content is preserved** without losing paragraphs, images, tables, or lists.
  - Direct chapter jumping from both the in-book TOC page and the slide-out TOC drawer.
- **🎨 Rich Formatting Preservation**:
  - **Highlighted Text**: Handles `<mark>`, highlighted spans, and color tags.
  - **Syntax-Highlighted Code**: Code blocks are formatted with PrismJS (supporting JS, TS, Python, Bash, Rust, Go, SQL, HTML/CSS) with line numbers, language badges, and one-click copy buttons.
  - **Important Notes & Callouts**: Converts GitHub alerts (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`) and documentation callouts into custom stylized callout boxes with icons.
- **📚 Persistent Virtual Library**:
  - Automatically saves every created book to local storage.
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

## 🚀 Running on Desktop

### 1. Install Dependencies
```bash
pnpm install
# or: npm install
```

### 2. Start Desktop Server (with Unrestricted Scraper)
```bash
pnpm run build
pnpm run desktop
# or: pnpm start
```
Open **`http://localhost:3300`** in your browser. The desktop server includes a local `/api/scrape` proxy that bypasses all browser CORS restrictions.

### 3. Development Mode
```bash
pnpm run dev
```

---

## 🌐 Deploying to GitHub Pages

The project is pre-configured for GitHub Pages:

### Method 1: Automatic via GitHub Actions (Recommended)
1. Create a repository on GitHub named `ddrReader`.
2. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/ddrReader.git
   git branch -M main
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings > Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
   - The `.github/workflows/deploy.yml` workflow will automatically build and publish your site!

### Method 2: Manual Deploy via `gh-pages`
```bash
pnpm run deploy
```

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

---

## 🛠 Tech Stack

- **Page Turning Physics**: [Page-Flip (StPageFlip)](https://nodepkg.com/package/page-flip)
- **DOM & Article Parsing**: `@mozilla/readability` + DOMPurify
- **Syntax Highlighting**: PrismJS
- **Bundler & Dev Server**: Vite
- **Desktop Backend**: Node.js & Express
