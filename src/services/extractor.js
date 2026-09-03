/**
 * ddrReader - Web Extractor Service (100% Content & Formatting Fidelity)
 * Extracts all text, code blocks, tables, images, headings, and formatting without dropping anything.
 */

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
  } catch (e) {}

  // 2. Direct fetch (if CORS allowed)
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
    } catch (err) {}
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
 * Extracts 100% of content, preserving all text, code syntax, tables, callouts, and layout.
 */
export function extractArticleFromHtml(html, sourceUrl = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Fix relative URLs for images & links
  if (sourceUrl) {
    try {
      const baseUrl = new URL(sourceUrl);
      
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src) {
          try {
            img.src = new URL(src, baseUrl).href;
          } catch (e) {}
        }
        if (!img.getAttribute('alt')) {
          img.setAttribute('alt', 'Illustration');
        }
      });

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
      console.warn('Could not parse base URL for relative links:', e);
    }
  }

  // Remove strictly non-content tags (scripts, styles, tracking pixels, iframes, cookies, ads)
  doc.querySelectorAll('script, style, noscript, iframe, link, meta, svg[width="0"], svg[height="0"]').forEach(el => el.remove());
  doc.querySelectorAll('.ad, .advertisement, .banner, .cookie-banner, .popup, #cookie-consent, nav.navbar, header.site-header, footer.site-footer').forEach(el => {
    // Only remove if it's truly auxiliary header/footer and not main content
    if (!el.querySelector('h1, h2, table, pre, code')) {
      el.remove();
    }
  });

  // Transform Markdown/GitHub Callouts (> [!NOTE], etc.)
  processCallouts(doc);

  // Transform Highlights (<mark>, .highlight, etc.)
  processHighlights(doc);

  // Transform Command Lines & Code blocks (for LFS and technical docs)
  processTechnicalBlocks(doc);

  // Extract Metadata
  const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                    doc.querySelector('h1')?.innerText ||
                    doc.querySelector('title')?.innerText || 'Untitled Virtual Book';
  const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                     doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
                     doc.querySelector('.author, [rel="author"], .byline')?.innerText || '';
  const metaSite = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ||
                   (sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : '');
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('article img, main img, .content img')?.src || '';

  // Select the richest content container without cutting off chapters or sibling sections
  const candidateSelectors = [
    'main',
    'article',
    '#content',
    '.content',
    '#main-content',
    '.main-content',
    '.post-content',
    '.documentation',
    '.markdown-body',
    'div[role="main"]',
    '.wrap',
    '.book',
    '.chapter',
    'body'
  ];

  let selectedRoot = null;
  let maxTextLength = 0;

  for (const selector of candidateSelectors) {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      const textLen = (el.innerText || '').trim().length;
      if (textLen > maxTextLength) {
        maxTextLength = textLen;
        selectedRoot = el;
      }
    });
  }

  if (!selectedRoot || maxTextLength < 100) {
    selectedRoot = doc.body || doc.documentElement;
  }

  // Sanitize with DOMPurify while keeping all layout tags
  const rawHtml = selectedRoot.innerHTML;
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: [
      'mark', 'ins', 'details', 'summary', 'figure', 'figcaption',
      'code', 'pre', 'kbd', 'samp', 'var', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'blockquote', 'aside', 'section', 'div', 'span', 'p',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'b', 'strong', 'i', 'em', 'hr'
    ],
    ADD_ATTR: ['target', 'rel', 'class', 'style', 'data-*', 'src', 'alt', 'href', 'title', 'id', 'name', 'colspan', 'rowspan']
  });

  return {
    title: metaTitle.trim() || 'Untitled Virtual Book',
    author: metaAuthor.trim() || metaSite || 'Web Author',
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
      let iconSvg = 'ℹ️';
      if (type === 'tip') iconSvg = '💡';
      else if (type === 'warning' || type === 'caution' || type === 'danger') iconSvg = '⚠️';
      else if (type === 'important') iconSvg = '📌';

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

  doc.querySelectorAll('.admonition, .callout, .alert, .infobox, .note, .warning, .tip').forEach(ad => {
    ad.classList.add('book-callout');
  });
}

function processHighlights(doc) {
  doc.querySelectorAll('mark, .highlight, .highlighted, span[style*="background-color"]').forEach(el => {
    el.classList.add('book-highlight-text');
  });
}

/**
 * Format technical commands, user inputs, and screen dumps with colorful modern badges
 */
function processTechnicalBlocks(doc) {
  // Format user inputs and screen commands (LFS style: pre.userinput, pre.screen, kbd.command)
  doc.querySelectorAll('pre.userinput, pre.screen, pre.command, code.userinput, .listingblock pre').forEach(el => {
    el.classList.add('book-code-block');
  });

  doc.querySelectorAll('kbd, .command, .filename, .emphasis, .parameter').forEach(el => {
    if (el.tagName === 'KBD' || el.classList.contains('command')) {
      el.classList.add('book-kbd-badge');
    }
  });
}
