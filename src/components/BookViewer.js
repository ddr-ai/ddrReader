/**
 * ddrReader - 3D Virtual Book Viewer Component
 * Features Fullscreen Immersive Mode, Top-Center Floating Dynamic Island Pill,
 * TOC Sidebar, Full-Text Search, Bookmark Ribbon, and 100% Responsive Page Flipping.
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
    this.activeDrawer = null; // 'toc' | 'search' | 'bookmarks' | 'theme' | null
    this.isTtsPlaying = false;
    this.speechUtterance = null;
    this.keyHandler = null;
    this.resizeObserver = null;
    this.resizeTimeout = null;
    this.containerRef = null;
    this.isPillMinimized = false;
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
    this.containerRef = container;

    const book = this.currentBook;
    const settings = storage.getSettings();
    const totalPages = book.pages ? book.pages.length : 1;
    const startPage = Math.min(this.currentPage, totalPages - 1);

    container.innerHTML = `
      <div class="book-viewer-container theme-${settings.theme} font-${settings.fontFamily}" id="viewer-root">
        
        <!-- Top-Middle Floating Dynamic Island Capsule -->
        <div class="reader-floating-pill ${this.isPillMinimized ? 'minimized' : ''}" id="reader-dynamic-island">
          
          <!-- Compact Island Dot / Trigger (shown when minimized) -->
          <div class="island-mini-trigger" id="island-expand-btn" title="Expand Reader Tools">
            <span class="island-glow-icon">📖</span>
            <span class="island-mini-title">${escapeHtml(book.title)}</span>
            <span class="island-mini-badge">Page ${startPage + 1}</span>
          </div>

          <!-- Expanded Island Control Capsule -->
          <div class="island-expanded-content">
            
            <!-- Left Group: Library Return & Book Title -->
            <div class="island-group">
              <button class="island-btn primary-island-btn" id="btn-viewer-library" title="Back to Library (Esc)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                <span>Library</span>
              </button>
              
              <div class="island-book-badge" title="${escapeHtml(book.title)}">
                <span class="badge-dot"></span>
                <span class="badge-text">${escapeHtml(book.title)}</span>
              </div>
            </div>

            <!-- Middle Group: Primary Tools -->
            <div class="island-group tools-group">
              <!-- Sidebar TOC Trigger Button -->
              <button class="island-tool-btn" id="btn-toggle-toc" title="Table of Contents (T)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <span class="tool-label">TOC</span>
              </button>

              <!-- Search Button -->
              <button class="island-tool-btn" id="btn-toggle-search" title="Search in Book (S)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span class="tool-label">Search</span>
              </button>

              <!-- Bookmarks Button -->
              <button class="island-tool-btn" id="btn-toggle-bookmarks" title="Saved Bookmarks (B)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
                <span class="tool-label">Bookmarks</span>
              </button>

              <!-- TTS Read Aloud Button -->
              <button class="island-tool-btn" id="btn-toggle-tts" title="Read Aloud / Text-to-Speech">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                <span class="tool-label" id="tts-label">Listen</span>
              </button>

              <!-- Quick Theme Switcher -->
              <div class="island-dropdown-wrapper">
                <button class="island-tool-btn" id="btn-toggle-theme-pop" title="Color Theme & Appearance">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
                  </svg>
                  <span class="tool-label">Theme</span>
                </button>
                <div class="theme-quick-popover" id="theme-quick-popover">
                  <button class="theme-pill-btn" data-set-theme="sepia">Sepia</button>
                  <button class="theme-pill-btn" data-set-theme="dark">Dark</button>
                  <button class="theme-pill-btn" data-set-theme="cream">Cream</button>
                  <button class="theme-pill-btn" data-set-theme="cyberpunk">Neon</button>
                  <button class="theme-pill-btn" data-set-theme="white">White</button>
                </div>
              </div>

              <!-- Fullscreen Toggle Button -->
              <button class="island-tool-btn" id="btn-toggle-fullscreen" title="Toggle Fullscreen (F)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                <span class="tool-label">Full</span>
              </button>
            </div>

            <!-- Right Group: Minimize Island -->
            <div class="island-group">
              <button class="island-tool-btn icon-only" id="btn-minimize-island" title="Minimize Controls for Distraction-Free Reading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
            </div>

          </div>
        </div>

        <!-- 3D Virtual Book Stage -->
        <div class="book-stage" id="book-stage">
          <button class="flip-nav-btn flip-prev-btn" id="flip-prev" title="Previous Page (←)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div class="virtual-book-wrapper" id="flipbook-container">
            <!-- StPageFlip mounts here -->
          </div>

          <button class="flip-nav-btn flip-next-btn" id="flip-next" title="Next Page (→ / Space)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <!-- Bottom Floating Page Status Capsule -->
        <div class="book-bottom-capsule">
          <div class="page-indicator-pill">
            <span>Page</span>
            <strong id="bar-current-page">${startPage + 1}</strong>
            <span style="opacity: 0.5;">/</span>
            <span>${totalPages}</span>
            <span class="pill-dot">•</span>
            <span id="bar-progress-percent">${Math.round(((startPage + 1) / totalPages) * 100)}%</span>
          </div>

          <div class="capsule-slider-wrap">
            <input 
              type="range" 
              id="book-page-slider" 
              class="book-slider" 
              min="0" 
              max="${totalPages - 1}" 
              value="${startPage}" 
            />
          </div>

          <button class="quick-bookmark-capsule-btn" id="btn-quick-bookmark" title="Bookmark This Page">
            <span>🔖 Bookmark</span>
          </button>
        </div>

        <!-- Table of Contents Sidebar Drawer -->
        <div class="reader-drawer" id="drawer-toc">
          <div class="drawer-header">
            <div class="drawer-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span>Table of Contents</span>
            </div>
            <button class="drawer-close-btn" data-close-drawer title="Close Sidebar">✕</button>
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
            <div class="drawer-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search in Book</span>
            </div>
            <button class="drawer-close-btn" data-close-drawer>✕</button>
          </div>
          <div style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color);">
            <input type="text" id="search-book-input" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 12px; width: 100%; color: var(--text-primary);" placeholder="Search keywords..." />
          </div>
          <div class="drawer-content" id="drawer-search-results">
            <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1.5rem;">Type a keyword to find all matching pages.</p>
          </div>
        </div>

        <!-- Bookmarks Drawer -->
        <div class="reader-drawer" id="drawer-bookmarks">
          <div class="drawer-header">
            <div class="drawer-title-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
              <span>Saved Bookmarks</span>
            </div>
            <button class="drawer-close-btn" data-close-drawer>✕</button>
          </div>
          <div class="drawer-content" id="drawer-bookmarks-content"></div>
        </div>

        <!-- Drawer Backdrop Overlay -->
        <div class="drawer-backdrop" id="reader-drawer-backdrop"></div>
      </div>
    `;

    // Initialize Flipbook with initial sizing
    setTimeout(() => {
      this.initFlipBook(container, startPage);
    }, 60);

    this.bindEvents(container);
  }

  initFlipBook(container, initialPage) {
    if (!this.currentBook) return;

    const flipContainer = container.querySelector('#flipbook-container');
    if (!flipContainer) return;

    // Destroy previous PageFlip if exists
    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
      } catch (e) {}
      this.pageFlip = null;
    }

    // Reconstruct inner HTML for fresh PageFlip initialization
    flipContainer.innerHTML = `
      <div id="flipbook" class="flipbook">
        ${this.currentBook.pages.map((p) => `
          <div class="st-page ${p.type === 'cover' || p.type === 'back-cover' ? '--hard' : ''}" data-density="${p.type === 'cover' || p.type === 'back-cover' ? 'hard' : 'soft'}">
            ${p.html}
          </div>
        `).join('')}
      </div>
    `;

    const flipElement = flipContainer.querySelector('#flipbook');
    const stage = container.querySelector('#book-stage');
    if (!stage || !flipElement) return;

    const rect = stage.getBoundingClientRect();
    const stageWidth = rect.width > 0 ? rect.width : window.innerWidth;
    const stageHeight = rect.height > 0 ? rect.height : (window.innerHeight - 80);

    const isPortrait = stageWidth < 820 || (stageWidth / stageHeight < 1.25);

    let pageWidth = 0;
    let pageHeight = 0;

    if (isPortrait) {
      // Single-page responsive view (mobile / portrait tablet)
      pageWidth = Math.min(stageWidth - 20, 540);
      pageHeight = Math.min(stageHeight - 20, Math.floor(pageWidth * 1.44));
      if (pageHeight > stageHeight - 20) {
        pageHeight = stageHeight - 20;
        pageWidth = Math.floor(pageHeight / 1.44);
      }
    } else {
      // Dual-page responsive spread (desktop / laptop / landscape tablet)
      const maxSpreadWidth = stageWidth - 50;
      pageWidth = Math.min(500, Math.floor(maxSpreadWidth / 2));
      pageHeight = Math.min(stageHeight - 30, Math.floor(pageWidth * 1.42));
      if (pageHeight > stageHeight - 30) {
        pageHeight = stageHeight - 30;
        pageWidth = Math.floor(pageHeight / 1.42);
      }
    }

    try {
      this.pageFlip = new PageFlip(flipElement, {
        width: Math.max(250, Math.floor(pageWidth)),
        height: Math.max(360, Math.floor(pageHeight)),
        size: 'fixed',
        minWidth: 240,
        maxWidth: 600,
        minHeight: 340,
        maxHeight: 840,
        maxShadowOpacity: 0.5,
        showCover: true,
        usePortrait: isPortrait,
        mobileScrollSupport: false,
        useMouseEvents: true,
        flippingTime: 650,
        drawShadow: true
      });

      this.pageFlip.loadFromHTML(flipElement.querySelectorAll('.st-page'));

      this.pageFlip.on('flip', (e) => {
        this.onPageTurn(e.data);
      });

      if (initialPage > 0) {
        setTimeout(() => {
          try {
            this.pageFlip.flip(initialPage, 'top');
          } catch (e) {
            this.pageFlip.turnToPage(initialPage);
          }
        }, 120);
      }

      highlightCodeInElement(flipElement);

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

    audioService.playPageFlip();
    storage.updateBookmark(this.currentBook.id, pageNum);

    const curLabel = document.querySelector('#bar-current-page');
    const progLabel = document.querySelector('#bar-progress-percent');
    const slider = document.querySelector('#book-page-slider');
    const miniBadge = document.querySelector('.island-mini-badge');

    if (curLabel) curLabel.innerText = pageNum + 1;
    if (progLabel) progLabel.innerText = `${Math.round(((pageNum + 1) / totalPages) * 100)}%`;
    if (slider) slider.value = pageNum;
    if (miniBadge) miniBadge.innerText = `Page ${pageNum + 1}`;

    if (this.isTtsPlaying) {
      this.readCurrentPageTts();
    }
  }

  bindEvents(container) {
    // Return to Library
    const libBtn = container.querySelector('#btn-viewer-library');
    if (libBtn) {
      libBtn.addEventListener('click', () => {
        this.stopTts();
        if (this.onBackToLibrary) this.onBackToLibrary();
      });
    }

    // Mini Island Trigger Expand/Minimize
    const miniTrigger = container.querySelector('#island-expand-btn');
    const minBtn = container.querySelector('#btn-minimize-island');
    const island = container.querySelector('#reader-dynamic-island');

    if (miniTrigger) {
      miniTrigger.addEventListener('click', () => {
        this.isPillMinimized = false;
        if (island) island.classList.remove('minimized');
      });
    }

    if (minBtn) {
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isPillMinimized = true;
        if (island) island.classList.add('minimized');
      });
    }

    // Prev / Next Page Buttons
    const prevBtn = container.querySelector('#flip-prev');
    const nextBtn = container.querySelector('#flip-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.pageFlip && this.pageFlip.flipPrev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.pageFlip && this.pageFlip.flipNext());

    // Page Slider
    const slider = container.querySelector('#book-page-slider');
    if (slider) {
      slider.addEventListener('change', (e) => {
        const target = parseInt(e.target.value, 10);
        if (this.pageFlip && !isNaN(target)) {
          this.pageFlip.flip(target);
        }
      });
    }

    // Quick Bookmark
    const bookmarkBtn = container.querySelector('#btn-quick-bookmark');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        storage.addCustomBookmark(this.currentBook.id, `Bookmarked Page ${this.currentPage + 1}`, this.currentPage);
        audioService.playBookmarkSound();
        this.showToast(`Bookmark added for Page ${this.currentPage + 1}!`, 'success');
        this.updateBookmarksList();
      });
    }

    // Sidebar & Drawer triggers
    const tocBtn = container.querySelector('#btn-toggle-toc');
    const searchBtn = container.querySelector('#btn-toggle-search');
    const bmBtn = container.querySelector('#btn-toggle-bookmarks');
    const ttsBtn = container.querySelector('#btn-toggle-tts');
    const fullBtn = container.querySelector('#btn-toggle-fullscreen');
    const themePopBtn = container.querySelector('#btn-toggle-theme-pop');
    const themePop = container.querySelector('#theme-quick-popover');
    const backdrop = container.querySelector('#reader-drawer-backdrop');

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

    if (fullBtn) {
      fullBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    if (themePopBtn && themePop) {
      themePopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themePop.classList.toggle('open');
      });

      document.addEventListener('click', () => {
        themePop.classList.remove('open');
      });

      container.querySelectorAll('.theme-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const theme = btn.getAttribute('data-set-theme');
          this.setTheme(theme);
          themePop.classList.remove('open');
        });
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeDrawers());
    }

    container.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', () => this.closeDrawers());
    });

    container.querySelectorAll('#drawer-toc .toc-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = parseInt(item.getAttribute('data-jump-page'), 10) - 1;
        if (this.pageFlip && !isNaN(page)) {
          this.pageFlip.flip(page);
          this.closeDrawers();
        }
      });
    });

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
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (this.activeDrawer) {
          this.closeDrawers();
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // ResizeObserver on the Stage
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    const stage = container.querySelector('#book-stage');
    if (stage && window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          if (this.containerRef && this.currentBook) {
            this.initFlipBook(this.containerRef, this.currentPage);
          }
        }, 200);
      });
      this.resizeObserver.observe(stage);
    }
  }

  setTheme(themeName) {
    const viewerRoot = document.getElementById('viewer-root');
    if (viewerRoot) {
      const currentClasses = Array.from(viewerRoot.classList).filter(c => !c.startsWith('theme-'));
      currentClasses.push(`theme-${themeName}`);
      viewerRoot.className = currentClasses.join(' ');
      storage.saveSettings({ theme: themeName });
      this.showToast(`Switched theme to ${themeName}`, 'info');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  detachKeyboardEvents() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  toggleDrawer(drawerName) {
    const backdrop = document.querySelector('#reader-drawer-backdrop');
    const drawers = ['toc', 'search', 'bookmarks'];

    if (this.activeDrawer === drawerName) {
      this.closeDrawers();
      return;
    }

    drawers.forEach(name => {
      const el = document.querySelector(`#drawer-${name}`);
      if (el) {
        if (name === drawerName) {
          el.classList.add('open');
        } else {
          el.classList.remove('open');
        }
      }
    });

    if (backdrop) backdrop.classList.add('open');
    this.activeDrawer = drawerName;
  }

  closeDrawers() {
    document.querySelectorAll('.reader-drawer').forEach(d => d.classList.remove('open'));
    const backdrop = document.querySelector('#reader-drawer-backdrop');
    if (backdrop) backdrop.classList.remove('open');
    this.activeDrawer = null;
  }

  updateBookmarksList() {
    const list = document.querySelector('#drawer-bookmarks-content');
    if (!list || !this.currentBook) return;

    const book = storage.getBook(this.currentBook.id);
    const bookmarks = (book && book.customBookmarks) || [];

    if (bookmarks.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">🔖</p>
          <p style="font-weight: 600;">No bookmarks saved yet</p>
          <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-secondary);">Click the "Bookmark" button at the bottom to pin pages.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = bookmarks.map(bm => `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <div style="cursor: pointer; flex: 1;" data-jump-bookmark="${bm.page}">
          <strong style="color: var(--gold); font-size: 0.88rem;">Page ${bm.page + 1}</strong>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(bm.note)}</div>
        </div>
        <button class="card-action-btn delete" data-delete-bookmark="${bm.id}" title="Delete Bookmark" style="color: var(--text-muted); font-size: 1rem; padding: 4px 8px;">✕</button>
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
      resultsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1.5rem;">Type a keyword to find all matching pages.</p>`;
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
      resultsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; margin-top: 1.5rem;">No results found for "${escapeHtml(query)}"</p>`;
      return;
    }

    resultsContainer.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--accent); margin-bottom: 0.75rem; font-weight: 700;">
        Found ${matches.length} matches:
      </div>
      ${matches.map(m => `
        <div class="search-match-card" data-jump-search="${m.pageIndex}" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.2s;">
          <div style="font-size: 0.78rem; color: var(--accent); font-weight: 700;">Page ${m.pageNumber}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">...${escapeHtml(m.snippet)}...</div>
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
    const btn = document.querySelector('#btn-toggle-tts');
    const label = document.querySelector('#tts-label');
    if (btn) btn.classList.add('active');
    if (label) label.innerText = 'Pause';
    this.readCurrentPageTts();
  }

  stopTts() {
    this.isTtsPlaying = false;
    const btn = document.querySelector('#btn-toggle-tts');
    const label = document.querySelector('#tts-label');
    if (btn) btn.classList.remove('active');
    if (label) label.innerText = 'Listen';
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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
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

