/**
 * ddrReader - Storage Service
 * Manages persistent virtual books, bookmarks, reading progress, and settings.
 */

const STORAGE_KEYS = {
  BOOKS: 'ddr_reader_books',
  SETTINGS: 'ddr_reader_settings',
  ACTIVE_BOOK_ID: 'ddr_reader_active_id'
};

const DEFAULT_SETTINGS = {
  theme: 'sepia', // 'sepia' | 'white' | 'dark' | 'cream' | 'cyberpunk'
  fontFamily: 'serif', // 'serif' | 'sans' | 'dyslexic' | 'mono'
  fontSize: 16, // px
  lineHeight: 1.6,
  soundEnabled: true,
  pageViewMode: 'auto', // 'auto' | 'double' | 'single'
  readingSpeed: 1.0 // for TTS
};

export const storage = {
  // --- Books ---
  getBooks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      if (!data) return [];
      const books = JSON.parse(data);
      return Array.isArray(books) ? books.sort((a, b) => (b.lastReadAt || b.createdAt) - (a.lastReadAt || a.createdAt)) : [];
    } catch (e) {
      console.error('Error loading books from storage:', e);
      return [];
    }
  },

  getBook(id) {
    const books = this.getBooks();
    return books.find(b => b.id === id) || null;
  },

  saveBook(book) {
    try {
      const books = this.getBooks();
      const now = Date.now();
      
      const existingIndex = books.findIndex(b => b.id === book.id);
      if (existingIndex >= 0) {
        books[existingIndex] = {
          ...books[existingIndex],
          ...book,
          updatedAt: now
        };
      } else {
        const newBook = {
          ...book,
          id: book.id || `book_${now}_${Math.random().toString(36).substring(2, 8)}`,
          createdAt: now,
          updatedAt: now,
          lastReadAt: now,
          bookmarkPage: book.bookmarkPage || 0,
          customBookmarks: book.customBookmarks || []
        };
        books.unshift(newBook);
      }
      
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      return book.id || books[0].id;
    } catch (e) {
      console.error('Error saving book to storage:', e);
      throw e;
    }
  },

  updateBookmark(bookId, pageNumber) {
    try {
      const books = this.getBooks();
      const book = books.find(b => b.id === bookId);
      if (book) {
        book.bookmarkPage = pageNumber;
        book.lastReadAt = Date.now();
        // Calculate progress percentage
        if (book.totalPages > 0) {
          book.progressPercent = Math.min(100, Math.round(((pageNumber + 1) / book.totalPages) * 100));
        }
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      }
    } catch (e) {
      console.error('Error updating bookmark:', e);
    }
  },

  addCustomBookmark(bookId, note = '', pageNumber = null) {
    try {
      const books = this.getBooks();
      const book = books.find(b => b.id === bookId);
      if (book) {
        if (!book.customBookmarks) book.customBookmarks = [];
        const page = pageNumber !== null ? pageNumber : book.bookmarkPage || 0;
        
        // Don't add duplicate page bookmarks
        const existing = book.customBookmarks.find(b => b.page === page);
        if (!existing) {
          book.customBookmarks.push({
            id: `bm_${Date.now()}`,
            page,
            note: note || `Page ${page + 1}`,
            createdAt: Date.now()
          });
          book.customBookmarks.sort((a, b) => a.page - b.page);
          localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
        }
        return book.customBookmarks;
      }
    } catch (e) {
      console.error('Error adding custom bookmark:', e);
    }
    return [];
  },

  removeCustomBookmark(bookId, bookmarkId) {
    try {
      const books = this.getBooks();
      const book = books.find(b => b.id === bookId);
      if (book && book.customBookmarks) {
        book.customBookmarks = book.customBookmarks.filter(b => b.id !== bookmarkId);
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
        return book.customBookmarks;
      }
    } catch (e) {
      console.error('Error removing custom bookmark:', e);
    }
    return [];
  },

  deleteBook(id) {
    try {
      let books = this.getBooks();
      books = books.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
      
      if (this.getActiveBookId() === id) {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_BOOK_ID);
      }
      return true;
    } catch (e) {
      console.error('Error deleting book:', e);
      return false;
    }
  },

  // --- Active Session ---
  setActiveBookId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BOOK_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_BOOK_ID);
    }
  },

  getActiveBookId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BOOK_ID);
  },

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving settings:', e);
      return DEFAULT_SETTINGS;
    }
  },

  // --- Export / Import ---
  exportLibraryJson() {
    const books = this.getBooks();
    const settings = this.getSettings();
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books,
      settings
    }, null, 2);
  },

  importLibraryJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.books)) {
        throw new Error('Invalid library data format');
      }
      
      const existingBooks = this.getBooks();
      const existingIds = new Set(existingBooks.map(b => b.id));
      
      let importedCount = 0;
      for (const book of data.books) {
        if (!existingIds.has(book.id)) {
          existingBooks.push(book);
          importedCount++;
        }
      }
      
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(existingBooks));
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return { success: true, count: importedCount };
    } catch (e) {
      console.error('Import failed:', e);
      return { success: false, error: e.message };
    }
  }
};
