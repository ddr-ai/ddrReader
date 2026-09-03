/**
 * ddrReader - Prism Syntax Highlighter
 * Provides code block syntax highlighting and copy utilities.
 */

import Prism from 'prismjs';
// Core language imports
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

export function highlightCodeInElement(container) {
  if (!container) return;
  const codeBlocks = container.querySelectorAll('pre code, pre');
  codeBlocks.forEach(block => {
    try {
      Prism.highlightElement(block);
    } catch (e) {
      // fallback
    }
  });

  // Attach copy buttons
  const pres = container.querySelectorAll('pre');
  pres.forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    
    // Check language label
    const code = pre.querySelector('code') || pre;
    let lang = 'code';
    code.classList.forEach(cls => {
      if (cls.startsWith('language-')) {
        lang = cls.replace('language-', '');
      }
    });

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span class="code-lang-tag">${lang}</span>
      <button class="code-copy-btn" title="Copy code" aria-label="Copy code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      </button>
    `;

    const copyBtn = header.querySelector('.code-copy-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToCopy = code.innerText || pre.innerText;
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span style="color:#10b981">Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          `;
        }, 2000);
      });
    });

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
}
