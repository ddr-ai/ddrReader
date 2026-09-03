/**
 * ddrReader - 3D Virtual Book Viewer Component
 * Integrates PageFlip (StPageFlip) physics, sound, bookmarks, search, and TTS.
 */

import { PageFlip } from 'page-flip';
import { storage } from '../services/storage.js';
import { highlightCodeInElement } from '../services/prismHighlighter.js';
import { audioService } from '../services/audioService.js';

export class BookViewer {
  constructor({ onBackToLibrary, showToast }) {
    this.onBackToLibrary = onBackToLibrary;
    this.showToast = showToast || console.log;
    this.currentBook = null;
    this.pageFlip = null;
    this.currentPage = 0;
    this.activeDrawer = null; // 'toc' | 'search' | 'bookmarks' | null
    this.isTtsPlaying = false;
    this.speechUtterance = null;
    this.keyHandler = null;
    this.resizeHandler = null;
  }

  loadBook(bookId) {
    const book = storage.getBook(bookId);
    if (!book) {
      this.showToast('Book not found in library', 'error');
      if (this.onBackToLibrary) this.onBackToLibrary();
      return;
    }
    this.currentBook = book;
    this.currentPage = book.bookmarkPage || 0;
  }

  render(container) {
    if (!this.currentBook) return;

    const book = this.currentBook;
    const settings = storage.getSettings();
    const totalPages = book.pages ? book.pages.length : 1;
    const startPage = Math.min(this.currentPage, totalPages - 1);

    container.innerHTML = `
      <div class="book-viewer-container theme-${settings.theme} font-${settings.fontFamily}" id="viewer-root">
        <!-- Top Toolbar -->
        <div class="book-toolbar">
          <div class="toolbar-group">
            <button class="nav-tab-btn" id="btn-viewer-library" style="background: var(--bg-secondary); color: var(--text-primary); padding: 0.4rem 0.85rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Library</span>
            </button>
            <div class="book-title-badge" title="${escapeHtml(book.title)}">
              📖 ${escapeHtml(book.title)}
            </div>
          </div>

          <div class="toolbar-group">
            <button class="icon-btn" id="btn-toggle-toc" title="Table of Contents (T)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button class="icon-btn" id="btn-toggle-search" title="Search in Book (S)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            <button class="icon-btn" id="btn-toggle-bookmarks" title="Bookmarks & Notes (B)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
            </button>
            <button class="icon-btn" id="btn-toggle-tts" title="Read Aloud (TTS)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- 3D Book Stage -->
        <div class="book-stage" id="book-stage">
          <button class="flip-nav-btn flip-prev-btn" id="flip-prev" title="Previous Page (←)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div class="virtual-book-wrapper" id="flipbook-container">
            <div id="flipbook" class="flipbook">
              ${book.pages.map((p, idx) => `
                <div class="st-page ${p.type === 'cover' || p.type === 'back-cover' ? '--hard' : ''}" data-density="${p.type === 'cover' || p.type === 'back-cover' ? 'hard' : 'soft'}">
                  ${p.html}
                </div>
              `).join('')}
            </div>
          </div>

          <button class="flip-nav-btn flip-next-btn" id="flip-next" title="Next Page (→ / Space)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <!-- Bottom Status Bar -->
        <div class="book-bottom-bar">
          <div class="page-indicator-badge">
            <span>Page</span>
            <strong id="bar-current-page">${startPage + 1}</strong>
            <span>of</span>
            <span>${totalPages}</span>
            <span style="opacity: 0.5;">•</span>
            <span id="bar-progress-percent">${Math.round(((startPage + 1) / totalPages) * 100)}%</span>
          </div>

          <div class="slider-container">
            <input 
              type="range" 
              id="book-page-slider" 
              class="book-slider" 
              min="0" 
              max="${totalPages - 1}" 
              value="${startPage}" 
            />
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="primary-btn" id="btn-quick-bookmark" style="padding: 4px 12px; font-size: 0.8rem;">
              <span>🔖 Bookmark Page</span>
            </button>
          </div>
        </div>

        <!-- Table of Contents Drawer -->
        <div class="reader-drawer" id="drawer-toc">
          <div class="drawer-header">
            <div class="drawer-title">Table of Contents</div>
            <button class="icon-btn" data-close-drawer>✕</button>
          </div>
          <div class="drawer-content" id="drawer-toc-content">
            <div class="toc-list">
              ${book.chapters.map((ch, i) => `
                <div class="toc-item" data-jump-page="${ch.pageNumber}">
                  <span class="toc-num">${i + 1}.</span>
                  <span class="toc-text">${escapeHtml(ch.title)}</span>
                  <span class="toc-dots"></span>
                  <span class="toc-page-num">${ch.pageNumber}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Search Drawer -->
        <div class="reader-drawer" id="drawer-search">
          <div class="drawer-header">
            <div class="drawer-title">Search in Book</div>
            <button class="icon-btn" data-close-drawer>✕</button>
          </div>
          <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color);">
            <input type="text" id="search-book-input" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; width: 100%;" placeholder="Search keywords..." />
          </div>
          <div class="drawer-content" id="drawer-search-results">
            <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1rem;">Type a keyword to find all matching pages.</p>
          </div>
        </div>

        <!-- Bookmarks Drawer -->
        <div class="reader-drawer" id="drawer-bookmarks">
          <div class="drawer-header">
            <div class="drawer-title">Saved Bookmarks</div>
            <button class="icon-btn" data-close-drawer>✕</button>
          </div>
          <div class="drawer-content" id="drawer-bookmarks-content"></div>
        </div>
      </div>
    `;

    this.initFlipBook(container, startPage);
    this.bindEvents(container);
  }

  initFlipBook(container, initialPage) {
    const flipElement = container.querySelector('#flipbook');
    if (!flipElement) return;

    // Determine dimensions based on viewport
    const stage = container.querySelector('#book-stage');
    const stageWidth = stage.clientWidth || 900;
    const stageHeight = stage.clientHeight || 650;

    let pageWidth = Math.min(480, Math.floor((stageWidth - 80) / 2));
    let pageHeight = Math.min(680, stageHeight - 40);

    if (stageWidth < 768) {
      // Single page mobile view
      pageWidth = Math.min(stageWidth - 40, 480);
    }

    try {
      this.pageFlip = new PageFlip(flipElement, {
        width: pageWidth,
        height: pageHeight,
        size: 'fixed',
        minWidth: 320,
        maxWidth: 550,
        minHeight: 460,
        maxHeight: 750,
        maxShadowOpacity: 0.6,
        showCover: true,
        mobileScrollSupport: false,
        useMouseEvents: true,
        flippingTime: 700,
        drawShadow: true
      });

      this.pageFlip.loadFromHTML(flipElement.querySelectorAll('.st-page'));

      // Listen for page turns
      this.pageFlip.on('flip', (e) => {
        this.onPageTurn(e.data);
      });

      // Apply initial page jump if bookmarked
      if (initialPage > 0) {
        setTimeout(() => {
          try {
            this.pageFlip.flip(initialPage, 'top');
          } catch (e) {
            this.pageFlip.turnToPage(initialPage);
          }
        }, 150);
      }

      // Syntax highlight code blocks in pages
      highlightCodeInElement(flipElement);

      // TOC internal link clicks inside the book
      flipElement.querySelectorAll('.toc-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetPage = parseInt(item.getAttribute('data-page'), 10) - 1;
          if (!isNaN(targetPage) && this.pageFlip) {
            this.pageFlip.flip(targetPage);
          }
        });
      });

    } catch (err) {
      console.error('Error initializing PageFlip:', err);
    }
  }

  onPageTurn(pageNum) {
    this.currentPage = pageNum;
    const totalPages = this.currentBook.pages.length;

    // Play realistic audio sound
    audioService.playPageFlip();

    // Persist bookmark position
    storage.updateBookmark(this.currentBook.id, pageNum);

    // Update UI Indicators
    const curLabel = document.querySelector('#bar-current-page');
    const progLabel = document.querySelector('#bar-progress-percent');
    const slider = document.querySelector('#book-page-slider');

    if (curLabel) curLabel.innerText = pageNum + 1;
    if (progLabel) progLabel.innerText = `${Math.round(((pageNum + 1) / totalPages) * 100)}%`;
    if (slider) slider.value = pageNum;

    // If TTS is playing, read the new page
    if (this.isTtsPlaying) {
      this.readCurrentPageTts();
    }
  }

  bindEvents(container) {
    // Back to library
    const libBtn = container.querySelector('#btn-viewer-library');
    if (libBtn) {
      libBtn.addEventListener('click', () => {
        this.stopTts();
        if (this.onBackToLibrary) this.onBackToLibrary();
      });
    }

    // Prev / Next Page Buttons
    const prevBtn = container.querySelector('#flip-prev');
    const nextBtn = container.querySelector('#flip-next');

    if (prevBtn) prevBtn.addEventListener('click', () => this.pageFlip && this.pageFlip.flipPrev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.pageFlip && this.pageFlip.flipNext());

    // Page slider
    const slider = container.querySelector('#book-page-slider');
    if (slider) {
      slider.addEventListener('change', (e) => {
        const target = parseInt(e.target.value, 10);
        if (this.pageFlip && !isNaN(target)) {
          this.pageFlip.flip(target);
        }
      });
    }

    // Quick Bookmark button
    const bookmarkBtn = container.querySelector('#btn-quick-bookmark');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        storage.addCustomBookmark(this.currentBook.id, `Bookmarked Page ${this.currentPage + 1}`, this.currentPage);
        audioService.playBookmarkSound();
        this.showToast(`Bookmark added for Page ${this.currentPage + 1}!`, 'success');
        this.updateBookmarksList();
      });
    }

    // Drawers
    const tocBtn = container.querySelector('#btn-toggle-toc');
    const searchBtn = container.querySelector('#btn-toggle-search');
    const bmBtn = container.querySelector('#btn-toggle-bookmarks');
    const ttsBtn = container.querySelector('#btn-toggle-tts');

    if (tocBtn) tocBtn.addEventListener('click', () => this.toggleDrawer('toc'));
    if (searchBtn) searchBtn.addEventListener('click', () => this.toggleDrawer('search'));
    if (bmBtn) {
      bmBtn.addEventListener('click', () => {
        this.updateBookmarksList();
        this.toggleDrawer('bookmarks');
      });
    }

    if (ttsBtn) {
      ttsBtn.addEventListener('click', () => this.toggleTts());
    }

    // Close drawers
    container.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', () => this.closeDrawers());
    });

    // TOC Jump links in Drawer
    container.querySelectorAll('#drawer-toc .toc-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = parseInt(item.getAttribute('data-jump-page'), 10) - 1;
        if (this.pageFlip && !isNaN(page)) {
          this.pageFlip.flip(page);
          this.closeDrawers();
        }
      });
    });

    // Search in Book input
    const searchInput = container.querySelector('#search-book-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleBookSearch(e.target.value));
    }

    // Keyboard Navigation
    this.detachKeyboardEvents();
    this.keyHandler = (e) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (!this.pageFlip) return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.pageFlip.flipPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.pageFlip.flipNext();
      } else if (e.key === 'Home') {
        this.pageFlip.flip(0);
      } else if (e.key === 'End') {
        this.pageFlip.flip(this.currentBook.pages.length - 1);
      } else if (e.key === 't' || e.key === 'T') {
        this.toggleDrawer('toc');
      } else if (e.key === 's' || e.key === 'S') {
        this.toggleDrawer('search');
      } else if (e.key === 'b' || e.key === 'B') {
        this.toggleDrawer('bookmarks');
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  detachKeyboardEvents() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  toggleDrawer(drawerName) {
    const drawers = ['toc', 'search', 'bookmarks'];
    drawers.forEach(name => {
      const el = document.querySelector(`#drawer-${name}`);
      if (el) {
        if (this.activeDrawer === drawerName && name === drawerName) {
          el.classList.remove('open');
        } else if (name === drawerName) {
          el.classList.add('open');
        } else {
          el.classList.remove('open');
        }
      }
    });

    this.activeDrawer = this.activeDrawer === drawerName ? null : drawerName;
  }

  closeDrawers() {
    document.querySelectorAll('.reader-drawer').forEach(d => d.classList.remove('open'));
    this.activeDrawer = null;
  }

  updateBookmarksList() {
    const list = document.querySelector('#drawer-bookmarks-content');
    if (!list || !this.currentBook) return;

    const book = storage.getBook(this.currentBook.id);
    const bookmarks = (book && book.customBookmarks) || [];

    if (bookmarks.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">
          <p>No bookmarks saved yet.</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem;">Click "Bookmark Page" to save key sections.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = bookmarks.map(bm => `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="cursor: pointer; flex: 1;" data-jump-bookmark="${bm.page}">
          <strong style="color: var(--gold); font-size: 0.85rem;">Page ${bm.page + 1}</strong>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(bm.note)}</div>
        </div>
        <button class="card-action-btn delete" data-delete-bookmark="${bm.id}" title="Delete Bookmark">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-jump-bookmark]').forEach(el => {
      el.addEventListener('click', () => {
        const page = parseInt(el.getAttribute('data-jump-bookmark'), 10);
        if (this.pageFlip && !isNaN(page)) {
          this.pageFlip.flip(page);
          this.closeDrawers();
        }
      });
    });

    list.querySelectorAll('[data-delete-bookmark]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-bookmark');
        storage.removeCustomBookmark(this.currentBook.id, id);
        this.updateBookmarksList();
      });
    });
  }

  handleBookSearch(query) {
    const resultsContainer = document.querySelector('#drawer-search-results');
    if (!resultsContainer || !this.currentBook) return;

    const q = query.trim().toLowerCase();
    if (!q) {
      resultsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1rem;">Type a keyword to find all matching pages.</p>`;
      return;
    }

    const matches = [];
    this.currentBook.pages.forEach((page, idx) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = page.html;
      const text = tempDiv.innerText || '';
      const lowerText = text.toLowerCase();
      
      const pos = lowerText.indexOf(q);
      if (pos !== -1) {
        const snippetStart = Math.max(0, pos - 40);
        const snippetEnd = Math.min(text.length, pos + q.length + 40);
        const snippet = text.substring(snippetStart, snippetEnd);
        matches.push({ pageIndex: idx, pageNumber: idx + 1, snippet });
      }
    });

    if (matches.length === 0) {
      resultsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1rem;">No results found for "${escapeHtml(query)}"</p>`;
      return;
    }

    resultsContainer.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--accent); margin-bottom: 0.75rem; font-weight: 600;">
        Found ${matches.length} matches:
      </div>
      ${matches.map(m => `
        <div class="search-match-card" data-jump-search="${m.pageIndex}" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; cursor: pointer;">
          <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700;">Page ${m.pageNumber}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">...${escapeHtml(m.snippet)}...</div>
        </div>
      `).join('')}
    `;

    resultsContainer.querySelectorAll('[data-jump-search]').forEach(card => {
      card.addEventListener('click', () => {
        const pageIdx = parseInt(card.getAttribute('data-jump-search'), 10);
        if (this.pageFlip && !isNaN(pageIdx)) {
          this.pageFlip.flip(pageIdx);
          this.closeDrawers();
        }
      });
    });
  }

  // --- Text-to-Speech ---
  toggleTts() {
    if (this.isTtsPlaying) {
      this.stopTts();
      this.showToast('Audio playback stopped', 'info');
    } else {
      this.startTts();
      this.showToast('Reading aloud...', 'info');
    }
  }

  startTts() {
    if (!('speechSynthesis' in window)) {
      this.showToast('Text-to-speech not supported in this browser', 'error');
      return;
    }
    this.isTtsPlaying = true;
    this.readCurrentPageTts();
  }

  stopTts() {
    this.isTtsPlaying = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  readCurrentPageTts() {
    if (!this.isTtsPlaying || !this.currentBook) return;
    window.speechSynthesis.cancel();

    const page = this.currentBook.pages[this.currentPage];
    if (!page) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = page.html;
    // Remove headers/footers for speech
    tempDiv.querySelectorAll('.book-page-header, .book-page-footer, .code-copy-btn').forEach(el => el.remove());
    const text = tempDiv.innerText.trim();

    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const settings = storage.getSettings();
    utterance.rate = settings.readingSpeed || 1.0;

    utterance.onend = () => {
      if (this.isTtsPlaying && this.currentPage < this.currentBook.pages.length - 1) {
        if (this.pageFlip) this.pageFlip.flipNext();
      } else {
        this.stopTts();
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  destroy() {
    this.stopTts();
    this.detachKeyboardEvents();
    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
      } catch (e) {}
      this.pageFlip = null;
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
