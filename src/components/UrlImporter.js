/**
 * ddrReader - URL & Content Importer Component
 */

import { fetchWebpage, extractArticleFromHtml } from '../services/extractor.js';
import { buildVirtualBook } from '../services/bookBuilder.js';
import { storage } from '../services/storage.js';

export class UrlImporter {
  constructor({ onBookCreated, showToast }) {
    this.onBookCreated = onBookCreated;
    this.showToast = showToast || console.log;
    this.mode = 'url'; // 'url' | 'paste'
    this.isLoading = false;
  }

  render(container) {
    container.innerHTML = `
      <div class="importer-container">
        <div class="importer-card">
          <div class="importer-header">
            <h2>Transform Web into a Virtual Book</h2>
            <p>Enter any webpage URL, article, or technical documentation. ddrReader will extract the complete Table of Contents, code blocks, highlighted notes, and format it into a smooth 3D animated book.</p>
          </div>

          <div class="importer-mode-switch">
            <button class="mode-btn active" id="mode-btn-url">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Webpage URL
            </button>
            <button class="mode-btn" id="mode-btn-paste">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              Paste HTML / Text
            </button>
          </div>

          <div class="importer-body">
            <!-- URL Form -->
            <div id="importer-url-section">
              <div class="url-input-group">
                <div class="url-input-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  <input 
                    type="url" 
                    id="input-web-url" 
                    class="url-input-field" 
                    placeholder="https://en.wikipedia.org/wiki/Computer_science or https://docs.python.org/..." 
                    autocomplete="off"
                  />
                </div>
                <button class="primary-btn create-book-btn" id="btn-create-from-url">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
                    <path d="M6 6h10"></path>
                    <path d="M6 10h10"></path>
                  </svg>
                  <span>Create Book</span>
                </button>
              </div>

              <!-- Sample Quick Links -->
              <div class="samples-section">
                <div class="samples-title">Or Try An Example Article</div>
                <div class="samples-grid">
                  <button class="sample-chip" data-url="https://en.wikipedia.org/wiki/Deep_learning">
                    🧠 Deep Learning (Wikipedia)
                  </button>
                  <button class="sample-chip" data-url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/A_re-introduction_to_JavaScript">
                    🌐 A Re-introduction to JavaScript (MDN)
                  </button>
                  <button class="sample-chip" data-url="https://en.wikipedia.org/wiki/Quantum_computing">
                    ⚛️ Quantum Computing (Wikipedia)
                  </button>
                  <button class="sample-chip" data-url="https://en.wikipedia.org/wiki/History_of_the_Internet">
                    📜 History of the Internet (Wikipedia)
                  </button>
                </div>
              </div>
            </div>

            <!-- Paste Form -->
            <div id="importer-paste-section" style="display: none;">
              <input 
                type="text" 
                id="input-paste-title" 
                class="url-input-field" 
                style="border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; width: 100%; margin-bottom: 1rem; background: var(--bg-primary);" 
                placeholder="Book Title (e.g. My Custom Research Paper)" 
              />
              <textarea 
                id="input-paste-content" 
                class="paste-textarea" 
                placeholder="Paste HTML source code or formatted article text with headings, blockquotes, and code snippets here..."
              ></textarea>
              <button class="primary-btn create-book-btn" id="btn-create-from-paste" style="width: 100%;">
                <span>Compile Into Virtual Book</span>
              </button>
            </div>

            <!-- Progress Box -->
            <div id="importer-progress" class="progress-status-box" style="display: none;">
              <div class="spinner"></div>
              <div class="progress-message" id="importer-progress-text">Analyzing page structure & parsing chapters...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const modeUrlBtn = container.querySelector('#mode-btn-url');
    const modePasteBtn = container.querySelector('#mode-btn-paste');
    const sectionUrl = container.querySelector('#importer-url-section');
    const sectionPaste = container.querySelector('#importer-paste-section');

    modeUrlBtn.addEventListener('click', () => {
      modeUrlBtn.classList.add('active');
      modePasteBtn.classList.remove('active');
      sectionUrl.style.display = 'block';
      sectionPaste.style.display = 'none';
    });

    modePasteBtn.addEventListener('click', () => {
      modePasteBtn.classList.add('active');
      modeUrlBtn.classList.remove('active');
      sectionPaste.style.display = 'block';
      sectionUrl.style.display = 'none';
    });

    // Sample Chips
    container.querySelectorAll('.sample-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.getAttribute('data-url');
        const urlInput = container.querySelector('#input-web-url');
        if (urlInput) {
          urlInput.value = url;
          this.handleCreateFromUrl(container);
        }
      });
    });

    // Create from URL
    const createUrlBtn = container.querySelector('#btn-create-from-url');
    createUrlBtn.addEventListener('click', () => this.handleCreateFromUrl(container));

    const urlInput = container.querySelector('#input-web-url');
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleCreateFromUrl(container);
      }
    });

    // Create from Paste
    const createPasteBtn = container.querySelector('#btn-create-from-paste');
    createPasteBtn.addEventListener('click', () => this.handleCreateFromPaste(container));
  }

  async handleCreateFromUrl(container) {
    if (this.isLoading) return;
    const urlInput = container.querySelector('#input-web-url');
    const url = urlInput.value.trim();

    if (!url) {
      this.showToast('Please enter a valid webpage URL', 'error');
      urlInput.focus();
      return;
    }

    const progressBox = container.querySelector('#importer-progress');
    const progressText = container.querySelector('#importer-progress-text');
    const createBtn = container.querySelector('#btn-create-from-url');

    try {
      this.isLoading = true;
      progressBox.style.display = 'flex';
      createBtn.disabled = true;

      const { html, finalUrl } = await fetchWebpage(url, (status) => {
        if (progressText) progressText.innerText = status;
      });

      if (progressText) progressText.innerText = 'Extracting article and building Table of Contents...';

      const extracted = extractArticleFromHtml(html, finalUrl);
      
      if (progressText) progressText.innerText = 'Generating 3D virtual pages, code highlighters & callouts...';

      const virtualBook = buildVirtualBook(extracted);
      const bookId = storage.saveBook(virtualBook);

      this.showToast(`Virtual book "${virtualBook.title}" created successfully!`, 'success');
      
      urlInput.value = '';
      if (this.onBookCreated) {
        this.onBookCreated(bookId);
      }
    } catch (err) {
      console.error('Book creation error:', err);
      this.showToast(err.message || 'Failed to generate book from URL', 'error');
    } finally {
      this.isLoading = false;
      progressBox.style.display = 'none';
      createBtn.disabled = false;
    }
  }

  handleCreateFromPaste(container) {
    const titleInput = container.querySelector('#input-paste-title');
    const contentInput = container.querySelector('#input-paste-content');

    const title = titleInput.value.trim() || 'Custom Document';
    const content = contentInput.value.trim();

    if (!content) {
      this.showToast('Please paste HTML or text content', 'error');
      contentInput.focus();
      return;
    }

    try {
      const extracted = extractArticleFromHtml(content, '');
      extracted.title = title;
      extracted.author = 'Imported Text';
      
      const virtualBook = buildVirtualBook(extracted);
      const bookId = storage.saveBook(virtualBook);

      this.showToast(`Virtual book "${virtualBook.title}" created!`, 'success');
      titleInput.value = '';
      contentInput.value = '';

      if (this.onBookCreated) {
        this.onBookCreated(bookId);
      }
    } catch (e) {
      this.showToast('Could not compile text: ' + e.message, 'error');
    }
  }
}
