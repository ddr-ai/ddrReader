/**
 * ddrReader - Library & Bookshelf Component with Cloud Sync Status
 */

import { storage } from '../services/storage.js';
import { syncService } from '../services/syncService.js';

export class Library {
  constructor({ onOpenBook, onNavigateImport, onOpenSync, showToast }) {
    this.onOpenBook = onOpenBook;
    this.onNavigateImport = onNavigateImport;
    this.onOpenSync = onOpenSync;
    this.showToast = showToast || console.log;
    this.searchQuery = '';
    this.activeFilter = 'all'; // 'all' | 'reading' | 'completed' | 'bookmarked'
  }

  render(container) {
    const books = storage.getBooks();
    const filteredBooks = this.filterBooks(books);
    const syncStatus = syncService.getStatus();

    container.innerHTML = `
      <div class="library-container">
        <!-- Hero Header -->
        <div class="library-hero">
          <div class="hero-text">
            <h1>Virtual Library</h1>
            <p>Access your converted virtual books, resume reading where you left off, or add new articles.</p>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <button class="nav-tab-btn" id="lib-sync-action-btn" style="background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.85rem; padding: 0.5rem 1rem;">
              <span>☁️</span>
              <span>${syncStatus.status === 'connected' ? 'Synced with Cloud' : 'Connect Cloud Database'}</span>
            </button>
            <button class="primary-btn" id="lib-create-book-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New Virtual Book</span>
            </button>
          </div>
        </div>

        <!-- Controls Bar: Search & Filters -->
        <div class="library-controls">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="lib-search-input" placeholder="Search books by title, author, or site..." value="${escapeHtml(this.searchQuery)}" />
          </div>

          <div class="filter-chips">
            <button class="filter-chip ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">All (${books.length})</button>
            <button class="filter-chip ${this.activeFilter === 'reading' ? 'active' : ''}" data-filter="reading">Reading</button>
            <button class="filter-chip ${this.activeFilter === 'completed' ? 'active' : ''}" data-filter="completed">Completed</button>
            <button class="filter-chip ${this.activeFilter === 'bookmarked' ? 'active' : ''}" data-filter="bookmarked">Bookmarked</button>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-left: auto;">
            <button class="icon-btn" id="lib-sync-now-btn" title="Sync With Database Now">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
            </button>
            <button class="icon-btn" id="lib-export-btn" title="Export Library Backup (JSON)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <label class="icon-btn" title="Import Library Backup (JSON)" style="cursor: pointer;">
              <input type="file" id="lib-import-file" accept=".json" style="display: none;" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </label>
          </div>
        </div>

        <!-- Books Grid -->
        <div class="books-grid" id="lib-books-grid">
          ${filteredBooks.length === 0 ? this.renderEmptyState() : filteredBooks.map(b => this.renderBookCard(b)).join('')}
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  filterBooks(books) {
    let result = books;

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.siteName && b.siteName.toLowerCase().includes(q)) ||
        (b.sourceUrl && b.sourceUrl.toLowerCase().includes(q))
      );
    }

    if (this.activeFilter === 'reading') {
      result = result.filter(b => (b.bookmarkPage || 0) > 0 && (b.progressPercent || 0) < 100);
    } else if (this.activeFilter === 'completed') {
      result = result.filter(b => (b.progressPercent || 0) >= 100);
    } else if (this.activeFilter === 'bookmarked') {
      result = result.filter(b => b.customBookmarks && b.customBookmarks.length > 0);
    }

    return result;
  }

  renderBookCard(book) {
    const theme = book.coverTheme || { bg: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', text: '#fff', accent: '#38bdf8' };
    const lastPage = (book.bookmarkPage || 0) + 1;
    const totalPages = book.totalPages || (book.pages ? book.pages.length : 1);
    const progress = Math.min(100, Math.round((lastPage / totalPages) * 100));
    const hasBookmark = (book.bookmarkPage || 0) > 0;

    return `
      <div class="book-card" data-book-id="${book.id}">
        <!-- 3D Book Cover -->
        <div class="book-card-cover" style="background: ${theme.bg}; color: ${theme.text};">
          ${hasBookmark ? '<div class="bookmark-ribbon" title="Bookmarked at Page ' + lastPage + '"></div>' : ''}
          <div class="book-card-domain" style="background: rgba(0,0,0,0.4); color: ${theme.accent}">
            ${escapeHtml(book.siteName || 'Virtual Book')}
          </div>
          <div>
            <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
            <p class="book-card-author">By ${escapeHtml(book.author || 'Author')}</p>
          </div>
        </div>

        <!-- Book Card Body -->
        <div class="book-card-body">
          <div class="book-card-meta">
            <span>${book.chapters ? book.chapters.length : 1} Chapters</span>
            <span>${totalPages} Pages</span>
            <span>~${book.readingTimeMinutes || 5} min</span>
          </div>

          <!-- Progress -->
          <div class="progress-bar-container">
            <div class="progress-bar-header">
              <span>Progress</span>
              <span><strong>${progress}%</strong></span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${progress}%;"></div>
            </div>
          </div>

          ${hasBookmark ? `
            <div class="bookmark-resume-tag">
              <span>🔖</span>
              <span>Bookmarked: Page ${lastPage} of ${totalPages}</span>
            </div>
          ` : ''}

          <!-- Actions -->
          <div class="book-card-actions">
            <button class="primary-btn card-action-btn" style="padding: 4px 12px;" data-action="open" data-book-id="${book.id}">
              <span>${hasBookmark ? 'Resume Reading' : 'Read Book'}</span>
            </button>
            <div style="display: flex; gap: 4px;">
              <button class="card-action-btn delete" data-action="delete" data-book-id="${book.id}" title="Delete Book">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-library-card">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
            <path d="M6 6h10"></path>
            <path d="M6 10h10"></path>
          </svg>
        </div>
        <div>
          <h3>Your Library is Empty</h3>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Convert a webpage or documentation URL into your first 3D virtual book.</p>
        </div>
        <div>
          <button class="primary-btn" id="btn-empty-import">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Book from URL</span>
          </button>
        </div>
      </div>
    `;
  }

  bindEvents(container) {
    const createBtn = container.querySelector('#lib-create-book-btn');
    if (createBtn && this.onNavigateImport) {
      createBtn.addEventListener('click', () => this.onNavigateImport());
    }

    const syncActionBtn = container.querySelector('#lib-sync-action-btn');
    if (syncActionBtn) {
      syncActionBtn.addEventListener('click', () => {
        const syncModalEl = document.querySelector('#sync-modal-overlay');
        if (syncModalEl) syncModalEl.classList.add('open');
      });
    }

    const syncNowBtn = container.querySelector('#lib-sync-now-btn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        this.showToast('Syncing with database...', 'info');
        const books = await storage.syncWithCloud();
        this.showToast('Library synchronized!', 'success');
        this.render(container);
      });
    }

    const searchInput = container.querySelector('#lib-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render(container);
        const newSearch = container.querySelector('#lib-search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      });
    }

    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeFilter = chip.getAttribute('data-filter');
        this.render(container);
      });
    });

    container.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete"]')) return;
        const bookId = card.getAttribute('data-book-id');
        if (this.onOpenBook) this.onOpenBook(bookId);
      });
    });

    container.querySelectorAll('[data-action="open"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookId = btn.getAttribute('data-book-id');
        if (this.onOpenBook) this.onOpenBook(bookId);
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookId = btn.getAttribute('data-book-id');
        if (confirm('Are you sure you want to remove this book from your library?')) {
          storage.deleteBook(bookId);
          this.showToast('Book removed from library', 'info');
          this.render(container);
        }
      });
    });

    const exportBtn = container.querySelector('#lib-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = storage.exportLibraryJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ddrReader_Library_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Library exported successfully!', 'success');
      });
    }

    const importInput = container.querySelector('#lib-import-file');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const res = storage.importLibraryJson(event.target.result);
            if (res.success) {
              this.showToast(`Imported ${res.count} books to library!`, 'success');
              this.render(container);
            } else {
              this.showToast('Failed to import: ' + res.error, 'error');
            }
          };
          reader.readAsText(file);
        }
      });
    }

    const emptyImportBtn = container.querySelector('#btn-empty-import');
    if (emptyImportBtn && this.onNavigateImport) {
      emptyImportBtn.addEventListener('click', () => this.onNavigateImport());
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
