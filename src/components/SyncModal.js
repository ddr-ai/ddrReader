/**
 * ddrReader - Database Connection & Instant Device Pairing Modal
 */

import QRCode from 'qrcode';
import { syncService } from '../services/syncService.js';
import { storage } from '../services/storage.js';

export class SyncModal {
  constructor({ onSyncCompleted, showToast }) {
    this.onSyncCompleted = onSyncCompleted;
    this.showToast = showToast || console.log;
    this.selectedProvider = 'supabase';
    this.activeTab = 'config'; // 'config' | 'pair'
  }

  async render(container) {
    const config = syncService.config;
    const status = syncService.getStatus();
    this.selectedProvider = config.provider === 'server' ? 'server' : 'supabase';

    let qrCodeDataUrl = '';
    const pairingUrl = syncService.generatePairingUrl();
    if (pairingUrl) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(pairingUrl, {
          width: 200,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      } catch (e) {}
    }

    container.innerHTML = `
      <div class="modal-overlay" id="sync-modal-overlay">
        <div class="modal-card" style="max-width: 600px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">☁️</span>
              <h3 class="modal-title">Cross-Device Database & Instant Pairing</h3>
            </div>
            <button class="icon-btn" id="btn-close-sync-modal">✕</button>
          </div>

          <div class="modal-body">
            <!-- Navigation Tabs: Setup vs Pair New Device -->
            <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
              <button class="nav-tab-btn ${this.activeTab === 'config' ? 'active' : ''}" id="tab-sub-config" style="font-size: 0.85rem; padding: 6px 14px;">
                ⚙️ Database Credentials
              </button>
              ${config.enabled ? `
                <button class="nav-tab-btn ${this.activeTab === 'pair' ? 'active' : ''}" id="tab-sub-pair" style="font-size: 0.85rem; padding: 6px 14px; background: rgba(56, 189, 248, 0.15); color: var(--accent);">
                  📱 Pair New Device (QR & Link)
                </button>
              ` : ''}
            </div>

            <!-- TAB 1: PAIR NEW DEVICE (Zero-Typing Instant Connect) -->
            <div id="section-pair-device" style="display: ${this.activeTab === 'pair' && config.enabled ? 'flex' : 'none'}; flex-direction: column; align-items: center; text-align: center; gap: 14px; padding: 1rem 0;">
              <div style="background: white; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: var(--shadow-md);">
                ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="Pairing QR Code" style="display: block; border-radius: 6px; width: 180px; height: 180px;" />` : ''}
              </div>
              <div>
                <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 4px;">Scan with Phone Camera</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 440px;">
                  Open your phone camera, scan this QR code, and your phone will <strong>instantly pair with your Supabase database and load all your virtual books</strong> without entering any keys!
                </p>
              </div>

              <!-- Magic Link -->
              <div style="width: 100%; display: flex; gap: 8px; background: var(--bg-primary); padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); align-items: center;">
                <input type="text" readonly value="${pairingUrl || ''}" class="url-input-field" style="font-size: 0.78rem; opacity: 0.8;" />
                <button class="primary-btn" id="btn-copy-magic-link" style="padding: 6px 12px; font-size: 0.8rem; white-space: nowrap;">
                  <span>Copy Magic Link</span>
                </button>
              </div>
            </div>

            <!-- TAB 2: CREDENTIALS CONFIGURATION -->
            <div id="section-config-device" style="display: ${this.activeTab === 'config' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
              <!-- Status Indicator -->
              <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${status.status === 'connected' ? '#10b981' : status.status === 'syncing' ? '#f59e0b' : status.status === 'error' ? '#ef4444' : '#64748b'}; display: inline-block;"></span>
                  <span style="font-size: 0.85rem; font-weight: 600;">Status: ${status.status.toUpperCase()}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">
                  ${status.lastSyncTime ? `Last synced: ${new Date(status.lastSyncTime).toLocaleTimeString()}` : 'Not synced yet'}
                </div>
              </div>

              <!-- Provider Tabs -->
              <div style="display: flex; gap: 6px; background: var(--bg-primary); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button class="nav-tab-btn ${this.selectedProvider === 'supabase' ? 'active' : ''}" id="tab-provider-supabase" style="flex: 1;">
                  Supabase (Cloud PostgreSQL)
                </button>
                <button class="nav-tab-btn ${this.selectedProvider === 'server' ? 'active' : ''}" id="tab-provider-server" style="flex: 1;">
                  Desktop / Custom Server
                </button>
              </div>

              <!-- Supabase Form -->
              <div id="form-provider-supabase" style="display: ${this.selectedProvider === 'supabase' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
                <div>
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Supabase Project URL</label>
                  <input type="url" id="input-supabase-url" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; width: 100%; margin-top: 4px;" placeholder="https://xyzcompany.supabase.co" value="${escapeHtml(config.supabaseUrl || '')}" />
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Supabase Anon Public Key</label>
                  <input type="password" id="input-supabase-key" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; width: 100%; margin-top: 4px;" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${escapeHtml(config.supabaseKey || '')}" />
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Your Personal Sync Key / User ID</label>
                  <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <input type="text" id="input-sync-userid" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; flex: 1;" placeholder="e.g. ddr_master_key" value="${escapeHtml(config.syncUserId || '')}" />
                    <button class="nav-tab-btn" id="btn-gen-userid" style="background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.75rem; white-space: nowrap;">Generate New</button>
                  </div>
                </div>

                <!-- SQL Setup Accordion -->
                <details style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; font-size: 0.8rem;">
                  <summary style="cursor: pointer; font-weight: 600; color: var(--accent);">📋 Required Supabase SQL Schema (Click to view)</summary>
                  <pre style="background: #111827; padding: 8px; border-radius: 4px; margin-top: 6px; font-family: var(--font-mono); font-size: 0.75rem; overflow-x: auto; color: #a5f3fc;">
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
                  </pre>
                </details>
              </div>

              <!-- Server Form -->
              <div id="form-provider-server" style="display: ${this.selectedProvider === 'server' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
                <div>
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Server API Endpoint URL</label>
                  <input type="url" id="input-server-url" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; width: 100%; margin-top: 4px;" placeholder="http://192.168.1.50:3300/api" value="${escapeHtml(config.serverUrl || 'http://localhost:3300/api')}" />
                </div>
                <div>
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Personal Sync Key / Device ID</label>
                  <input type="text" id="input-server-userid" class="url-input-field" style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; width: 100%; margin-top: 4px;" value="${escapeHtml(config.syncUserId || '')}" />
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 8px; margin-top: 0.5rem;">
                <button class="primary-btn" id="btn-save-connect-sync" style="flex: 1;">
                  <span>Save & Connect Database</span>
                </button>
                ${config.enabled ? `
                  <button class="card-action-btn delete" id="btn-disconnect-sync" style="padding: 8px 14px; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px;">
                    Disconnect
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const overlay = container.querySelector('#sync-modal-overlay');
    const closeBtn = container.querySelector('#btn-close-sync-modal');

    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Sub Tabs (Config vs Pair)
    const tabConfig = container.querySelector('#tab-sub-config');
    const tabPair = container.querySelector('#tab-sub-pair');
    const sectionConfig = container.querySelector('#section-config-device');
    const sectionPair = container.querySelector('#section-pair-device');

    if (tabConfig && tabPair) {
      tabConfig.addEventListener('click', () => {
        this.activeTab = 'config';
        tabConfig.classList.add('active');
        tabPair.classList.remove('active');
        sectionConfig.style.display = 'flex';
        sectionPair.style.display = 'none';
      });

      tabPair.addEventListener('click', () => {
        this.activeTab = 'pair';
        tabPair.classList.add('active');
        tabConfig.classList.remove('active');
        sectionPair.style.display = 'flex';
        sectionConfig.style.display = 'none';
      });
    }

    // Copy Magic Link Button
    const copyLinkBtn = container.querySelector('#btn-copy-magic-link');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        const pairingUrl = syncService.generatePairingUrl();
        if (pairingUrl) {
          navigator.clipboard.writeText(pairingUrl).then(() => {
            copyLinkBtn.innerText = 'Copied Link!';
            this.showToast('Magic pairing link copied to clipboard!', 'success');
            setTimeout(() => { copyLinkBtn.innerText = 'Copy Magic Link'; }, 2500);
          });
        }
      });
    }

    // Provider Tabs
    const tabSupabase = container.querySelector('#tab-provider-supabase');
    const tabServer = container.querySelector('#tab-provider-server');
    const formSupabase = container.querySelector('#form-provider-supabase');
    const formServer = container.querySelector('#form-provider-server');

    if (tabSupabase && tabServer) {
      tabSupabase.addEventListener('click', () => {
        this.selectedProvider = 'supabase';
        tabSupabase.classList.add('active');
        tabServer.classList.remove('active');
        formSupabase.style.display = 'flex';
        formServer.style.display = 'none';
      });

      tabServer.addEventListener('click', () => {
        this.selectedProvider = 'server';
        tabServer.classList.add('active');
        tabSupabase.classList.remove('active');
        formServer.style.display = 'flex';
        formSupabase.style.display = 'none';
      });
    }

    // Generate User ID
    const genBtn = container.querySelector('#btn-gen-userid');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        const newId = 'ddr_user_' + Math.random().toString(36).substring(2, 10);
        const input = container.querySelector('#input-sync-userid');
        if (input) input.value = newId;
      });
    }

    // Save & Connect
    const saveBtn = container.querySelector('#btn-save-connect-sync');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const provider = this.selectedProvider;
        let newConfig = {
          enabled: true,
          provider
        };

        if (provider === 'supabase') {
          const supabaseUrl = container.querySelector('#input-supabase-url').value.trim();
          const supabaseKey = container.querySelector('#input-supabase-key').value.trim();
          const syncUserId = container.querySelector('#input-sync-userid').value.trim();

          if (!supabaseUrl || !supabaseKey) {
            this.showToast('Please provide both Supabase URL and Key', 'error');
            return;
          }

          newConfig = {
            ...newConfig,
            supabaseUrl,
            supabaseKey,
            syncUserId: syncUserId || 'default_user'
          };
        } else {
          const serverUrl = container.querySelector('#input-server-url').value.trim();
          const syncUserId = container.querySelector('#input-server-userid').value.trim();

          if (!serverUrl) {
            this.showToast('Please provide Server URL', 'error');
            return;
          }

          newConfig = {
            ...newConfig,
            serverUrl,
            syncUserId: syncUserId || 'default_user'
          };
        }

        syncService.saveConfig(newConfig);
        this.showToast('Connecting to database and syncing...', 'info');

        try {
          const result = await storage.syncWithCloud();
          this.showToast('Database synchronized successfully!', 'success');
          this.activeTab = 'pair'; // switch to pairing tab so user can share with phone
          this.render(container);
          if (this.onSyncCompleted) this.onSyncCompleted(result);
        } catch (e) {
          this.showToast('Sync error: ' + e.message, 'error');
        }
      });
    }

    // Disconnect
    const disconnectBtn = container.querySelector('#btn-disconnect-sync');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        syncService.saveConfig({ enabled: false, provider: 'none' });
        this.showToast('Cloud sync disconnected', 'info');
        this.activeTab = 'config';
        this.render(container);
        if (this.onSyncCompleted) this.onSyncCompleted();
      });
    }
  }

  open() {
    const mount = document.getElementById('sync-modal-mount') || document.body;
    this.render(mount).then(() => {
      const overlay = document.querySelector('#sync-modal-overlay');
      if (overlay) overlay.classList.add('open');
    });
  }

  close() {
    const overlay = document.querySelector('#sync-modal-overlay');
    if (overlay) overlay.classList.remove('open');
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
