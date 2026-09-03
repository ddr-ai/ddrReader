/**
 * ddrReader - Application Orchestrator with Instant Device Pairing
 */

import { Navbar } from './components/Navbar.js';
import { Library } from './components/Library.js';
import { UrlImporter } from './components/UrlImporter.js';
import { BookViewer } from './components/BookViewer.js';
import { SettingsModal } from './components/SettingsModal.js';
import { SyncModal } from './components/SyncModal.js';
import { storage } from './services/storage.js';
import { syncService } from './services/syncService.js';
import { audioService } from './services/audioService.js';

export class App {
  constructor() {
    this.currentView = 'library';
    this.activeBookId = null;

    // Toast utility
    this.showToast = (message, type = 'info') => {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>${message}</span>
        </div>
      `;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    };

    // Components
    this.navbar = new Navbar({
      onTabChange: (tab) => this.switchView(tab),
      onOpenSettings: () => this.settingsModal.open(),
      onOpenSync: () => this.syncModal.open(),
      onToggleFullscreen: () => this.toggleFullscreen()
    });

    this.library = new Library({
      onOpenBook: (bookId) => this.openBook(bookId),
      onNavigateImport: () => this.switchView('import'),
      onOpenSync: () => this.syncModal.open(),
      showToast: this.showToast
    });

    this.urlImporter = new UrlImporter({
      onBookCreated: (bookId) => this.openBook(bookId),
      showToast: this.showToast
    });

    this.bookViewer = new BookViewer({
      onBackToLibrary: () => this.switchView('library'),
      showToast: this.showToast
    });

    this.settingsModal = new SettingsModal({
      onSettingsChanged: (settings) => this.applySettings(settings),
      showToast: this.showToast
    });

    this.syncModal = new SyncModal({
      onSyncCompleted: () => {
        if (this.currentView === 'library') {
          const libContainer = document.getElementById('view-library');
          if (libContainer) this.library.render(libContainer);
        }
      },
      showToast: this.showToast
    });

    // Realtime Remote Updates Handler
    syncService.onRemoteDataReceived = (payload) => {
      this.handleRealtimePayload(payload);
    };
  }

  async init() {
    const settings = storage.getSettings();
    audioService.setEnabled(settings.soundEnabled !== false);

    // Check for Magic Device Pairing URL in hash (#sync=...)
    this.checkMagicPairingHash();

    // Render static shells
    this.navbar.render(document.getElementById('nav-mount'));
    this.settingsModal.render(document.getElementById('modal-mount'));
    
    const syncMount = document.createElement('div');
    syncMount.id = 'sync-modal-mount';
    document.body.appendChild(syncMount);
    this.syncModal.render(syncMount);

    // Initial Cloud Pull
    try {
      await storage.syncWithCloud();
    } catch (e) {}

    // Handle hash routes
    this.handleRouting();
    window.addEventListener('hashchange', () => this.handleRouting());
  }

  checkMagicPairingHash() {
    const hash = window.location.hash;
    if (hash.includes('sync=')) {
      const match = hash.match(/sync=([^&]+)/);
      if (match && match[1]) {
        const res = syncService.importPairingPayload(match[1]);
        if (res.success) {
          // Clear hash for clean URL
          history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            this.showToast('📱 New device paired successfully! Synchronizing your virtual books...', 'success');
          }, 300);
        }
      }
    }
  }

  handleRealtimePayload(payload) {
    if (payload.new && payload.new.data) {
      const bookObj = typeof payload.new.data === 'string' ? JSON.parse(payload.new.data) : payload.new.data;
      storage.saveBook(bookObj, false);
      
      if (this.currentView === 'library') {
        const libContainer = document.getElementById('view-library');
        if (libContainer) this.library.render(libContainer);
      }
    }
  }

  handleRouting() {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('book/')) {
      const bookId = hash.replace('book/', '');
      this.openBook(bookId, false);
    } else if (hash === 'import') {
      this.switchView('import', false);
    } else {
      this.switchView('library', false);
    }
  }

  switchView(viewName, updateHash = true) {
    if (this.currentView === 'reader' && viewName !== 'reader') {
      this.bookViewer.destroy();
    }

    this.currentView = viewName;
    this.navbar.setActiveTab(viewName);

    document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));

    if (viewName === 'library') {
      const libContainer = document.getElementById('view-library');
      libContainer.classList.add('active');
      this.library.render(libContainer);
      if (updateHash) window.location.hash = 'library';
    } else if (viewName === 'import') {
      const importContainer = document.getElementById('view-import');
      importContainer.classList.add('active');
      this.urlImporter.render(importContainer);
      if (updateHash) window.location.hash = 'import';
    } else if (viewName === 'reader' && this.activeBookId) {
      const readerContainer = document.getElementById('view-reader');
      readerContainer.classList.add('active');
      this.bookViewer.loadBook(this.activeBookId);
      this.bookViewer.render(readerContainer);
      if (updateHash) window.location.hash = `book/${this.activeBookId}`;
    }
  }

  openBook(bookId, updateHash = true) {
    const book = storage.getBook(bookId);
    if (!book) {
      this.showToast('Could not find book', 'error');
      this.switchView('library');
      return;
    }

    this.activeBookId = bookId;
    storage.setActiveBookId(bookId);
    this.navbar.setReaderActive(true, book.title);
    this.switchView('reader', updateHash);
  }

  applySettings(settings) {
    const viewerRoot = document.getElementById('viewer-root');
    if (viewerRoot) {
      viewerRoot.className = `book-viewer-container theme-${settings.theme} font-${settings.fontFamily}`;
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        this.showToast(`Fullscreen error: ${err.message}`, 'error');
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}
