/**
 * ddrReader - Book Builder Service (100% Content & Structure Fidelity)
 * Partitions any complex HTML document into structured chapters and Table of Contents,
 * guaranteeing 100% of all paragraphs, code blocks, tables, images, and notes are preserved.
 */

const COVER_THEMES = [
  { id: 'sapphire', name: 'Sapphire Night', bg: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', text: '#f8fafc', accent: '#60a5fa', spine: '#172554', glow: 'rgba(56, 189, 248, 0.25)' },
  { id: 'emerald', name: 'Emerald Forest', bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', text: '#f0fdf4', accent: '#34d399', spine: '#022c22', glow: 'rgba(52, 211, 153, 0.25)' },
  { id: 'ruby', name: 'Crimson Velvet', bg: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)', text: '#fff1f2', accent: '#fb7185', spine: '#4c0519', glow: 'rgba(251, 113, 133, 0.25)' },
  { id: 'amber', name: 'Warm Amber', bg: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', text: '#fef3c7', accent: '#f59e0b', spine: '#451a03', glow: 'rgba(245, 158, 11, 0.25)' },
  { id: 'obsidian', name: 'Obsidian & Gold', bg: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', text: '#fafafa', accent: '#eab308', spine: '#000000', glow: 'rgba(234, 179, 8, 0.25)' },
  { id: 'royal', name: 'Royal Amethyst', bg: 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)', text: '#faf5ff', accent: '#c084fc', spine: '#2e1065', glow: 'rgba(192, 132, 252, 0.25)' }
];

export function buildVirtualBook(extractedData) {
  const { title, author, siteName, sourceUrl, description, coverImage, rawContentHtml } = extractedData;

  const { chapters, totalWords } = parseChaptersFromHtml(rawContentHtml, title);

  const themeIndex = Math.abs(hashString(title)) % COVER_THEMES.length;
  const coverTheme = COVER_THEMES[themeIndex];

  const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const pages = generateBookPages({
    title,
    author,
    siteName,
    sourceUrl,
    description,
    coverTheme,
    readingTimeMinutes,
    totalWords,
    chapters
  });

  return {
    id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    author,
    siteName,
    sourceUrl,
    description,
    coverImage,
    coverTheme,
    readingTimeMinutes,
    totalWords,
    chapters: chapters.map(c => ({ id: c.id, title: c.title, pageNumber: c.targetPageNumber || 0 })),
    pages,
    totalPages: pages.length,
    bookmarkPage: 0,
    progressPercent: 0,
    customBookmarks: [],
    createdAt: Date.now(),
    lastReadAt: Date.now()
  };
}

/**
 * Robust hierarchical chapter parser that preserves 100% of DOM content.
 */
function parseChaptersFromHtml(html, defaultTitle) {
  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());

  // Detect heading hierarchy (h1, h2, h3, or custom section titles)
  let headings = Array.from(container.querySelectorAll('h2, .sect1 > h2, .sect1 > .title, .chapter > .title, h1:not(:first-child)'));
  if (headings.length === 0) {
    headings = Array.from(container.querySelectorAll('h3, .sect2 > .title, .sect2 > h3'));
  }
  if (headings.length === 0) {
    headings = Array.from(container.querySelectorAll('h1'));
  }

  const chapters = [];
  let totalWords = 0;

  if (headings.length === 0) {
    // Single chapter with all content
    const chapterHtml = container.innerHTML;
    const words = (container.innerText || '').split(/\s+/).filter(Boolean).length;
    totalWords += words;

    chapters.push({
      id: 'chap_1',
      index: 1,
      title: defaultTitle || 'Main Content',
      html: chapterHtml,
      wordCount: words
    });
  } else {
    // Collect all top-level or child nodes
    const allNodes = Array.from(container.childNodes);
    let currentChapter = {
      id: 'chap_intro',
      index: 0,
      title: 'Introduction & Overview',
      elements: [],
      wordCount: 0
    };

    let headingIndex = 0;

    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE && headings.includes(node)) {
        // New chapter starts
        if (currentChapter.elements.length > 0) {
          const temp = document.createElement('div');
          currentChapter.elements.forEach(el => temp.appendChild(el.cloneNode(true)));
          const words = (temp.innerText || '').split(/\s+/).filter(Boolean).length;
          currentChapter.html = temp.innerHTML;
          currentChapter.wordCount = words;
          totalWords += words;
          chapters.push(currentChapter);
        }

        headingIndex++;
        currentChapter = {
          id: `chap_${headingIndex}`,
          index: headingIndex,
          title: node.innerText.trim() || `Chapter ${headingIndex}`,
          elements: [],
          wordCount: 0
        };
        return;
      }

      // If this element contains any of our target headings inside it, recurse into children
      const containsHeading = headings.some(h => node.contains && node.contains(h));
      if (containsHeading && node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(child => walk(child));
      } else {
        // Collect node into current chapter
        currentChapter.elements.push(node);
      }
    }

    allNodes.forEach(node => walk(node));

    // Commit final chapter
    if (currentChapter.elements.length > 0) {
      const temp = document.createElement('div');
      currentChapter.elements.forEach(el => temp.appendChild(el.cloneNode(true)));
      const words = (temp.innerText || '').split(/\s+/).filter(Boolean).length;
      currentChapter.html = temp.innerHTML;
      currentChapter.wordCount = words;
      totalWords += words;
      chapters.push(currentChapter);
    }
  }

  // Filter out any completely blank empty chapters
  const validChapters = chapters.filter(c => (c.html && c.html.trim().length > 0) || c.wordCount > 0);

  return {
    chapters: validChapters.length > 0 ? validChapters : [{ id: 'chap_1', index: 1, title: defaultTitle || 'Content', html: container.innerHTML, wordCount: totalWords }],
    totalWords
  };
}

/**
 * Generates all structured pages for the 3D Virtual Book
 */
function generateBookPages(bookMeta) {
  const pages = [];
  const { title, author, siteName, sourceUrl, coverTheme, readingTimeMinutes, totalWords, chapters } = bookMeta;

  // --- Page 0: Front Cover ---
  pages.push({
    type: 'cover',
    pageNumber: 1,
    html: `
      <div class="book-cover-page" style="background: ${coverTheme.bg}; color: ${coverTheme.text};">
        <div class="book-cover-border" style="border-color: ${coverTheme.accent}">
          <div class="book-cover-header">
            <span class="book-cover-tag" style="background: ${coverTheme.accent}; color: ${coverTheme.spine}">ddrReader Edition</span>
            ${siteName ? `<span class="book-cover-site">${escapeHtml(siteName)}</span>` : ''}
          </div>
          <div class="book-cover-main">
            <h1 class="book-cover-title">${escapeHtml(title)}</h1>
            <div class="book-cover-divider" style="background: ${coverTheme.accent}"></div>
            <p class="book-cover-author">By ${escapeHtml(author || 'Unknown Author')}</p>
          </div>
          <div class="book-cover-footer">
            <span>${totalWords.toLocaleString()} Words</span>
            <span>•</span>
            <span>~${readingTimeMinutes} min read</span>
          </div>
        </div>
      </div>
    `
  });

  // --- Page 1: Title & Imprint Page ---
  pages.push({
    type: 'imprint',
    pageNumber: 2,
    html: `
      <div class="book-page-content imprint-page">
        <div class="imprint-header">
          <div class="imprint-ornament">❦</div>
          <h2 class="imprint-title">${escapeHtml(title)}</h2>
          <p class="imprint-author">Authored by ${escapeHtml(author || 'Author')}</p>
          <div class="imprint-divider"></div>
        </div>
        <div class="imprint-details">
          <p><strong>Original Source:</strong> <a href="${sourceUrl}" target="_blank" rel="noopener">${escapeHtml(sourceUrl || siteName || 'Web Page')}</a></p>
          <p><strong>Estimated Reading Time:</strong> ${readingTimeMinutes} minutes</p>
          <p><strong>Total Words:</strong> ${totalWords.toLocaleString()} words</p>
          <p><strong>Virtual Book Created:</strong> ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="imprint-footer">
          <p class="imprint-notice">Rendered into a 3D Virtual Edition by ddrReader.</p>
        </div>
      </div>
    `
  });

  // --- Page 2: Table of Contents ---
  const tocPageIndex = pages.length;
  pages.push({
    type: 'toc',
    pageNumber: 3,
    html: ''
  });

  // --- Chapter Content Pages ---
  let currentPageNum = pages.length + 1;

  chapters.forEach((chapter) => {
    chapter.targetPageNumber = currentPageNum;
    const chapterPages = paginateChapterContent(chapter, title, currentPageNum);
    
    chapterPages.forEach(p => {
      pages.push(p);
      currentPageNum++;
    });
  });

  // Populate Table of Contents
  pages[tocPageIndex].html = `
    <div class="book-page-content toc-page">
      <div class="toc-header">
        <h2 class="toc-title">Table of Contents</h2>
        <div class="toc-divider"></div>
      </div>
      <div class="toc-list">
        ${chapters.map((ch, i) => `
          <div class="toc-item" data-page="${ch.targetPageNumber}">
            <span class="toc-num">${i + 1}.</span>
            <span class="toc-text">${escapeHtml(ch.title)}</span>
            <span class="toc-dots"></span>
            <span class="toc-page-num">${ch.targetPageNumber}</span>
          </div>
        `).join('')}
      </div>
      <div class="toc-footer" style="text-align: center; font-size: 0.72rem; opacity: 0.6; margin-top: auto; padding-top: 0.5rem;">
        <span>Click any chapter to jump directly</span>
      </div>
    </div>
  `;

  // --- Back Cover Page ---
  pages.push({
    type: 'back-cover',
    pageNumber: pages.length + 1,
    html: `
      <div class="book-cover-page back-cover" style="background: ${coverTheme.bg}; color: ${coverTheme.text};">
        <div class="book-cover-border" style="border-color: ${coverTheme.accent}">
          <div class="back-cover-ornament">❧</div>
          <h3>End of Virtual Book</h3>
          <p class="back-cover-title">${escapeHtml(title)}</p>
          <div class="back-cover-stats">
            <p><strong>${chapters.length}</strong> Chapters</p>
            <p><strong>${pages.length + 1}</strong> Virtual Pages</p>
          </div>
          <p class="back-cover-quote">"A reader lives a thousand lives before he dies."</p>
          <div class="back-cover-logo">ddrReader</div>
        </div>
      </div>
    `
  });

  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    p.totalBookPages = pages.length;
  });

  return pages;
}

/**
 * Splits chapter content into balanced page chunks preserving all elements.
 */
function paginateChapterContent(chapter, bookTitle, startPageNum) {
  const chapterPages = [];
  const container = document.createElement('div');
  container.innerHTML = chapter.html;

  const childNodes = Array.from(container.childNodes);
  
  if (childNodes.length === 0) {
    chapterPages.push(createContentPage({
      bookTitle,
      chapterTitle: chapter.title,
      contentHtml: `<p>${chapter.html || 'No content'}</p>`,
      isChapterStart: true
    }));
    return chapterPages;
  }

  let currentPageHtml = '';
  let currentWordCount = 0;
  const WORDS_PER_PAGE = 260;
  let isStart = true;

  childNodes.forEach((node) => {
    const nodeText = node.innerText || node.textContent || '';
    const nodeWords = nodeText.split(/\s+/).filter(Boolean).length;
    const isBigElement = (node.nodeType === Node.ELEMENT_NODE) && 
      (node.tagName === 'PRE' || node.tagName === 'TABLE' || (node.classList && node.classList.contains('book-callout')));

    if (currentWordCount > 0 && (currentWordCount + nodeWords > WORDS_PER_PAGE || (isBigElement && currentWordCount > 100))) {
      chapterPages.push(createContentPage({
        bookTitle,
        chapterTitle: chapter.title,
        contentHtml: currentPageHtml,
        isChapterStart: isStart
      }));
      isStart = false;
      currentPageHtml = '';
      currentWordCount = 0;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      currentPageHtml += node.outerHTML;
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      currentPageHtml += `<p>${escapeHtml(node.textContent)}</p>`;
    }
    
    currentWordCount += Math.max(12, nodeWords);
  });

  if (currentPageHtml.trim()) {
    chapterPages.push(createContentPage({
      bookTitle,
      chapterTitle: chapter.title,
      contentHtml: currentPageHtml,
      isChapterStart: isStart
    }));
  }

  return chapterPages;
}

function createContentPage({ bookTitle, chapterTitle, contentHtml, isChapterStart }) {
  return {
    type: 'content',
    chapterTitle,
    html: `
      <div class="book-page-content ${isChapterStart ? 'chapter-first-page' : ''}">
        <div class="book-page-header">
          <span class="header-book-title">${escapeHtml(bookTitle)}</span>
          <span class="header-chapter-title">${escapeHtml(chapterTitle)}</span>
        </div>
        ${isChapterStart ? `
          <div class="chapter-start-header">
            <h2 class="chapter-main-title">${escapeHtml(chapterTitle)}</h2>
            <div class="chapter-start-divider"></div>
          </div>
        ` : ''}
        <div class="book-page-body">
          ${contentHtml}
        </div>
        <div class="book-page-footer">
          <span class="footer-bookmark-icon">🔖</span>
        </div>
      </div>
    `
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
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

