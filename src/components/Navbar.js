/**
 * ddrReader - Top Navbar Component
 */

export class Navbar {
  constructor({ onTabChange, onOpenSettings, onToggleFullscreen }) {
    this.onTabChange = onTabChange;
    this.onOpenSettings = onOpenSettings;
    this.onToggleFullscreen = onToggleFullscreen;
    this.currentTab = 'library';
    this.activeBookTitle = null;
  }

  render(container) {
    container.innerHTML = `
      <nav class="app-navbar">
        <div class="nav-brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
              <path d="M6 6h10"></path>
              <path d="M6 10h10"></path>
            </svg>
          </div>
          <div class="brand-title">ddr<span>Reader</span></div>
        </div>

        <div class="nav-tabs">
          <button class="nav-tab-btn active" data-tab="library" id="tab-btn-library">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="3" rx="1"></rect>
              <rect width="7" height="7" x="14" y="14" rx="1"></rect>
              <rect width="7" height="7" x="3" y="14" rx="1"></rect>
            </svg>
            Library
          </button>
          <button class="nav-tab-btn" data-tab="import" id="tab-btn-import">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Virtual Book
          </button>
          <button class="nav-tab-btn" data-tab="reader" id="tab-btn-reader" style="display: none;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span id="nav-active-book-title">Virtual Book</span>
          </button>
        </div>

        <div class="nav-actions">
          <button class="icon-btn" id="nav-fullscreen-btn" title="Toggle Fullscreen" aria-label="Fullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
          <button class="icon-btn" id="nav-settings-btn" title="Reader Settings" aria-label="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </nav>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const tabs = container.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.setActiveTab(tabName);
        if (this.onTabChange) this.onTabChange(tabName);
      });
    });

    const settingsBtn = container.querySelector('#nav-settings-btn');
    if (settingsBtn && this.onOpenSettings) {
      settingsBtn.addEventListener('click', () => this.onOpenSettings());
    }

    const fullscreenBtn = container.querySelector('#nav-fullscreen-btn');
    if (fullscreenBtn && this.onToggleFullscreen) {
      fullscreenBtn.addEventListener('click', () => this.onToggleFullscreen());
    }
  }

  setActiveTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
  }

  setReaderActive(active, bookTitle = 'Virtual Book') {
    const readerTab = document.querySelector('#tab-btn-reader');
    const titleSpan = document.querySelector('#nav-active-book-title');
    if (readerTab) {
      readerTab.style.display = active ? 'inline-flex' : 'none';
      if (titleSpan) {
        titleSpan.innerText = bookTitle.length > 20 ? bookTitle.substring(0, 18) + '...' : bookTitle;
      }
    }
  }
}
