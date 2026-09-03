/**
 * ddrReader - Reader Settings & Appearance Modal
 */

import { storage } from '../services/storage.js';
import { audioService } from '../services/audioService.js';

export class SettingsModal {
  constructor({ onSettingsChanged, showToast }) {
    this.onSettingsChanged = onSettingsChanged;
    this.showToast = showToast || console.log;
  }

  render(container) {
    const settings = storage.getSettings();

    container.innerHTML = `
      <div class="modal-overlay" id="settings-modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Reader Appearance & Preferences</h3>
            <button class="icon-btn" id="btn-close-settings">✕</button>
          </div>

          <div class="modal-body">
            <!-- Theme Selection -->
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: block;">Page Theme</label>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 0.5rem;">
                <button class="theme-option-btn ${settings.theme === 'sepia' ? 'active' : ''}" data-theme="sepia" style="background: #fcf6e8; color: #2e261f; border: 2px solid ${settings.theme === 'sepia' ? 'var(--accent)' : 'transparent'}; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                  📜 Sepia
                </button>
                <button class="theme-option-btn ${settings.theme === 'white' ? 'active' : ''}" data-theme="white" style="background: #ffffff; color: #1a1a1a; border: 2px solid ${settings.theme === 'white' ? 'var(--accent)' : 'transparent'}; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                  📄 White
                </button>
                <button class="theme-option-btn ${settings.theme === 'cream' ? 'active' : ''}" data-theme="cream" style="background: #f5eedb; color: #3b3026; border: 2px solid ${settings.theme === 'cream' ? 'var(--accent)' : 'transparent'}; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                  ☕ Cream
                </button>
                <button class="theme-option-btn ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark" style="background: #1e222b; color: #e2e8f0; border: 2px solid ${settings.theme === 'dark' ? 'var(--accent)' : 'transparent'}; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                  🌙 Dark
                </button>
                <button class="theme-option-btn ${settings.theme === 'cyberpunk' ? 'active' : ''}" data-theme="cyberpunk" style="background: #0b0f19; color: #38bdf8; border: 2px solid ${settings.theme === 'cyberpunk' ? 'var(--accent)' : 'transparent'}; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem;">
                  ⚡ Cyber
                </button>
              </div>
            </div>

            <!-- Font Family -->
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: block;">Typography</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <button class="font-option-btn ${settings.fontFamily === 'serif' ? 'active' : ''}" data-font="serif" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; font-family: var(--font-serif); font-size: 0.9rem;">
                  Serif (Book)
                </button>
                <button class="font-option-btn ${settings.fontFamily === 'sans' ? 'active' : ''}" data-font="sans" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; font-family: var(--font-sans); font-size: 0.9rem;">
                  Sans-Serif (Clean)
                </button>
                <button class="font-option-btn ${settings.fontFamily === 'dyslexic' ? 'active' : ''}" data-font="dyslexic" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; font-size: 0.85rem;">
                  Dyslexic-Friendly
                </button>
                <button class="font-option-btn ${settings.fontFamily === 'mono' ? 'active' : ''}" data-font="mono" style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem;">
                  Monospace (Code)
                </button>
              </div>
            </div>

            <!-- Paper Turn Sound -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-top: 1px solid var(--border-color);">
              <div>
                <strong style="font-size: 0.9rem;">Realistic Page Turn Sound</strong>
                <p style="font-size: 0.75rem; color: var(--text-secondary);">Plays physical paper flipping audio on every page turn.</p>
              </div>
              <input type="checkbox" id="setting-sound-toggle" ${settings.soundEnabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;" />
            </div>

            <!-- TTS Speed -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                <span>Read Aloud Speed</span>
                <span id="label-tts-speed">${settings.readingSpeed || 1.0}x</span>
              </div>
              <input type="range" id="setting-tts-speed" min="0.75" max="1.75" step="0.25" value="${settings.readingSpeed || 1.0}" style="width: 100%; accent-color: var(--accent);" />
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    const overlay = container.querySelector('#settings-modal-overlay');
    const closeBtn = container.querySelector('#btn-close-settings');

    closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Theme buttons
    container.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        const updated = storage.saveSettings({ theme });
        container.querySelectorAll('.theme-option-btn').forEach(b => {
          b.style.borderColor = b.getAttribute('data-theme') === theme ? 'var(--accent)' : 'transparent';
        });
        if (this.onSettingsChanged) this.onSettingsChanged(updated);
      });
    });

    // Font buttons
    container.querySelectorAll('.font-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fontFamily = btn.getAttribute('data-font');
        const updated = storage.saveSettings({ fontFamily });
        container.querySelectorAll('.font-option-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-font') === fontFamily);
        });
        if (this.onSettingsChanged) this.onSettingsChanged(updated);
      });
    });

    // Sound toggle
    const soundToggle = container.querySelector('#setting-sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        const soundEnabled = e.target.checked;
        audioService.setEnabled(soundEnabled);
        const updated = storage.saveSettings({ soundEnabled });
        if (this.onSettingsChanged) this.onSettingsChanged(updated);
      });
    }

    // TTS Speed
    const ttsSpeed = container.querySelector('#setting-tts-speed');
    const ttsLabel = container.querySelector('#label-tts-speed');
    if (ttsSpeed && ttsLabel) {
      ttsSpeed.addEventListener('input', (e) => {
        const readingSpeed = parseFloat(e.target.value);
        ttsLabel.innerText = `${readingSpeed}x`;
        const updated = storage.saveSettings({ readingSpeed });
        if (this.onSettingsChanged) this.onSettingsChanged(updated);
      });
    }
  }

  open() {
    const overlay = document.querySelector('#settings-modal-overlay');
    if (overlay) overlay.classList.add('open');
  }

  close() {
    const overlay = document.querySelector('#settings-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
}
