/**
 * ddrReader - Web Extractor Service
 * Robust article fetching, HTML parsing, Readability extraction,
 * and structured content normalization.
 */

import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

export async function fetchWebpage(url, onProgress = () => {}) {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  onProgress('Connecting to source...');

  // 1. Check if local backend proxy is available (Desktop mode)
  try {
    const isDesktopAvailable = await checkDesktopBackend();
    if (isDesktopAvailable) {
      onProgress('Fetching via desktop scraper...');
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(cleanUrl)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.html) {
          return { html: data.html, finalUrl: data.finalUrl || cleanUrl };
        }
      }
    }
  } catch (e) {
    // Desktop backend not available, proceed to client-side proxies
  }

  // 2. Direct fetch (in case URL has open CORS)
  try {
    onProgress('Attempting direct connection...');
    const res = await fetch(cleanUrl, { mode: 'cors' });
    if (res.ok) {
      const html = await res.text();
      return { html, finalUrl: cleanUrl };
    }
  } catch (e) {}

  // 3. Cascading CORS Proxies for Web / GitHub Pages
  const proxies = [
    {
      name: 'corsproxy.io',
      getUrl: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
    },
    {
      name: 'allorigins',
      getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
    },
    {
      name: 'codetabs',
      getUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    }
  ];

  let lastError = null;
  for (const proxy of proxies) {
    try {
      onProgress(`Connecting via ${proxy.name}...`);
      const target = proxy.getUrl(cleanUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(target, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        if (html && html.length > 200) {
          return { html, finalUrl: cleanUrl };
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Could not fetch the webpage from "${cleanUrl}". If the site blocks external proxies, you can paste the HTML or text directly using the "Paste Content" option.`);
}

async function checkDesktopBackend() {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Parses raw HTML, applies Readability, fixes URLs, transforms callouts, code blocks, and highlights.
 */
export function extractArticleFromHtml(html, sourceUrl = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Fix relative URLs for images & links
  if (sourceUrl) {
    try {
      const baseUrl = new URL(sourceUrl);
      
      // Fix images
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src) {
          try {
            img.src = new URL(src, baseUrl).href;
          } catch (e) {}
        }
        // Preserve alt text
        if (!img.getAttribute('alt')) {
          img.setAttribute('alt', 'Illustration');
        }
      });

      // Fix links
      doc.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            a.href = new URL(href, baseUrl).href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          } catch (e) {}
        }
      });
    } catch (e) {
      console.warn('Could not parse base URL for relative link resolution:', e);
    }
  }

  // Preserve pre/code classes before readability might strip them
  doc.querySelectorAll('pre, code').forEach(el => {
    const cls = el.getAttribute('class') || '';
    if (cls) el.setAttribute('data-preserve-class', cls);
  });

  // Transform Markdown/GitHub Callouts (> [!NOTE], etc.)
  processCallouts(doc);

  // Transform Highlights (<mark>, .highlight, etc.)
  processHighlights(doc);

  // Extract metadata
  const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                    doc.querySelector('title')?.innerText || 'Untitled Book';
  const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                     doc.querySelector('meta[property="article:author"]')?.getAttribute('content') || '';
  const metaSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                   (sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : '');
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('article img')?.src || '';

  // Run Readability
  let article = null;
  try {
    const reader = new Readability(doc, {
      charThreshold: 50,
      classesToPreserve: ['language-*', 'highlight', 'callout', 'admonition', 'alert', 'note', 'tip', 'warning', 'important', 'caution']
    });
    article = reader.parse();
  } catch (e) {
    console.warn('Readability failed, using fallback parser:', e);
  }

  let finalTitle = metaTitle;
  let finalAuthor = metaAuthor;
  let finalContentHtml = '';

  if (article && article.content) {
    finalTitle = article.title || metaTitle;
    finalAuthor = article.byline || metaAuthor;
    finalContentHtml = article.content;
  } else {
    // Fallback: extract main / article / body
    const mainEl = doc.querySelector('main, article, #content, .content, .post, .article') || doc.body;
    finalContentHtml = mainEl ? mainEl.innerHTML : html;
  }

  // Sanitize with DOMPurify while keeping rich elements
  const cleanHtml = DOMPurify.sanitize(finalContentHtml, {
    ADD_TAGS: ['mark', 'ins', 'details', 'summary', 'figure', 'figcaption', 'code', 'pre'],
    ADD_ATTR: ['target', 'rel', 'class', 'style', 'data-*', 'src', 'alt', 'href']
  });

  return {
    title: finalTitle.trim() || 'Untitled Book',
    author: finalAuthor.trim() || metaSite || 'Web Author',
    siteName: metaSite,
    sourceUrl: sourceUrl,
    description: metaDescription,
    coverImage: metaImage,
    rawContentHtml: cleanHtml,
    createdAt: Date.now()
  };
}

/**
 * Handles GitHub callout blocks (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION])
 * and common documentation callouts.
 */
function processCallouts(doc) {
  const blockquotes = doc.querySelectorAll('blockquote');
  blockquotes.forEach(bq => {
    const text = bq.innerHTML.trim();
    const match = text.match(/^<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|DANGER)\]\s*(?:<br>)?([\s\S]*?)<\/p>/i);
    
    if (match) {
      const type = match[1].toLowerCase();
      const restOfFirstPara = match[2];
      const otherChildren = Array.from(bq.children).slice(1);

      const callout = doc.createElement('div');
      callout.className = `book-callout book-callout-${type}`;
      
      const title = type.charAt(0).toUpperCase() + type.slice(1);
      let iconSvg = '';
      if (type === 'tip') {
        iconSvg = '💡';
      } else if (type === 'warning' || type === 'caution' || type === 'danger') {
        iconSvg = '⚠️';
      } else if (type === 'important') {
        iconSvg = '📌';
      } else {
        iconSvg = 'ℹ️';
      }

      callout.innerHTML = `
        <div class="callout-header">
          <span class="callout-icon">${iconSvg}</span>
          <span class="callout-title">${title}</span>
        </div>
        <div class="callout-body">
          ${restOfFirstPara ? `<p>${restOfFirstPara}</p>` : ''}
        </div>
      `;

      const calloutBody = callout.querySelector('.callout-body');
      otherChildren.forEach(child => calloutBody.appendChild(child));
      bq.parentNode.replaceChild(callout, bq);
    }
  });

  // Handle Docusaurus / Sphinx / MkDocs style callouts
  const docAdmonitions = doc.querySelectorAll('.admonition, .callout, .alert, .infobox');
  docAdmonitions.forEach(ad => {
    ad.classList.add('book-callout');
  });
}

/**
 * Ensures highlights from web formatting are properly preserved and styled.
 */
function processHighlights(doc) {
  doc.querySelectorAll('mark, .highlight, .highlighted, span[style*="background-color"]').forEach(el => {
    el.classList.add('book-highlight-text');
  });
}
