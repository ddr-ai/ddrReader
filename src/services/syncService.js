/**
 * ddrReader - Universal Cloud Database & Cross-Device Sync Service
 * Seamlessly syncs virtual books, chapters, bookmarks, and reading positions across devices.
 * Supports Supabase (PostgreSQL Cloud), Desktop/Custom Server API, and Instant Sync Keys.
 */

import { createClient } from '@supabase/supabase-js';

const SYNC_CONFIG_KEY = 'ddr_reader_sync_config';

export class SyncService {
  constructor() {
    this.config = this.loadConfig();
    this.supabase = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'
    this.lastSyncTime = null;
    this.listeners = new Set();
    this.debounceTimer = null;
    this.realtimeChannel = null;

    if (this.config.enabled && this.config.provider) {
      this.initializeProvider();
    }
  }

  loadConfig() {
    try {
      const data = localStorage.getItem(SYNC_CONFIG_KEY);
      return data ? JSON.parse(data) : {
        enabled: false,
        provider: 'none', // 'supabase' | 'server' | 'synckey'
        supabaseUrl: '',
        supabaseKey: '',
        serverUrl: 'http://localhost:3300/api',
        syncUserId: this.generateDefaultUserId()
      };
    } catch {
      return { enabled: false, provider: 'none', syncUserId: this.generateDefaultUserId() };
    }
  }

  generateDefaultUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 10);
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(this.config));
    this.initializeProvider();
    this.notifyListeners();
  }

  onStatusChange(callback) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const current = this.getStatus();
    this.listeners.forEach(cb => {
      try { cb(current); } catch (e) {}
    });
  }

  getStatus() {
    return {
      status: this.status,
      provider: this.config.provider,
      enabled: this.config.enabled,
      lastSyncTime: this.lastSyncTime,
      syncUserId: this.config.syncUserId
    };
  }

  async initializeProvider() {
    if (!this.config.enabled) {
      this.status = 'disconnected';
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
      this.supabase = null;
      this.notifyListeners();
      return;
    }

    this.status = 'connecting';
    this.notifyListeners();

    try {
      if (this.config.provider === 'supabase') {
        if (!this.config.supabaseUrl || !this.config.supabaseKey) {
          throw new Error('Supabase URL and API Key are required');
        }
        this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
        
        // Test query
        const { error } = await this.supabase
          .from('ddr_books')
          .select('id')
          .limit(1);

        if (error && error.code === '42P01') {
          // Table doesn't exist yet, we will provide SQL instructions
          this.status = 'connected';
        } else if (error) {
          throw error;
        } else {
          this.status = 'connected';
          this.setupSupabaseRealtime();
        }
      } else if (this.config.provider === 'server') {
        const res = await fetch(`${this.config.serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          this.status = 'connected';
        } else {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
      }
    } catch (err) {
      console.warn('Sync connection warning:', err.message);
      this.status = 'error';
    }
    this.notifyListeners();
  }

  setupSupabaseRealtime() {
    if (!this.supabase || !this.config.syncUserId) return;
    try {
      if (this.realtimeChannel) this.realtimeChannel.unsubscribe();

      this.realtimeChannel = this.supabase
        .channel('public:ddr_books')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ddr_books',
          filter: `sync_user_id=eq.${this.config.syncUserId}`
        }, (payload) => {
          this.handleRemoteChange(payload);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  handleRemoteChange(payload) {
    if (this.onRemoteDataReceived) {
      this.onRemoteDataReceived(payload);
    }
  }

  /**
   * Main synchronization routine: pulls from database and merges with local storage.
   */
  async sync(localBooks = []) {
    if (!this.config.enabled || this.status === 'disconnected') {
      return { success: false, reason: 'Sync not enabled' };
    }

    this.status = 'syncing';
    this.notifyListeners();

    try {
      let mergedBooks = localBooks;

      if (this.config.provider === 'supabase' && this.supabase) {
        mergedBooks = await this.syncWithSupabase(localBooks);
      } else if (this.config.provider === 'server') {
        mergedBooks = await this.syncWithServer(localBooks);
      }

      this.lastSyncTime = Date.now();
      this.status = 'connected';
      this.notifyListeners();
      return { success: true, books: mergedBooks };
    } catch (err) {
      console.error('Sync failed:', err);
      this.status = 'error';
      this.notifyListeners();
      return { success: false, error: err.message };
    }
  }

  async syncWithSupabase(localBooks) {
    const userId = this.config.syncUserId;
    
    // Fetch all remote books for this sync user
    const { data: remoteRows, error } = await this.supabase
      .from('ddr_books')
      .select('id, data, updated_at')
      .eq('sync_user_id', userId);

    if (error) throw error;

    const remoteMap = new Map();
    (remoteRows || []).forEach(row => {
      try {
        const bookObj = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        remoteMap.set(row.id, { ...bookObj, updatedAt: row.updated_at });
      } catch (e) {}
    });

    const localMap = new Map(localBooks.map(b => [b.id, b]));
    const uploads = [];

    // Check local books to upload or merge
    for (const [id, localBook] of localMap.entries()) {
      const remoteBook = remoteMap.get(id);
      const localTime = localBook.updatedAt || localBook.lastReadAt || 0;

      if (!remoteBook) {
        uploads.push({
          id,
          sync_user_id: userId,
          title: localBook.title || 'Untitled',
          author: localBook.author || '',
          data: localBook,
          updated_at: localTime
        });
      } else {
        const remoteTime = remoteBook.updatedAt || remoteBook.lastReadAt || 0;
        if (localTime > remoteTime) {
          uploads.push({
            id,
            sync_user_id: userId,
            title: localBook.title || 'Untitled',
            author: localBook.author || '',
            data: localBook,
            updated_at: localTime
          });
        } else {
          localMap.set(id, remoteBook);
        }
      }
    }

    // Add any books that exist on remote but not locally
    for (const [id, remoteBook] of remoteMap.entries()) {
      if (!localMap.has(id)) {
        localMap.set(id, remoteBook);
      }
    }

    // Batch upsert to Supabase
    if (uploads.length > 0) {
      const { error: upsertErr } = await this.supabase
        .from('ddr_books')
        .upsert(uploads);
      if (upsertErr) throw upsertErr;
    }

    return Array.from(localMap.values());
  }

  async syncWithServer(localBooks) {
    const res = await fetch(`${this.config.serverUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-user-id': this.config.syncUserId
      },
      body: JSON.stringify({ books: localBooks, userId: this.config.syncUserId })
    });

    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();
    return data.books || localBooks;
  }

  /**
   * Schedules a debounced background sync
   */
  queueSync(localBooks) {
    if (!this.config.enabled) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.sync(localBooks);
    }, 1200);
  }
}

export const syncService = new SyncService();
