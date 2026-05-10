(function () {
  'use strict';

  const STYLE_ID = 'chatgpt-center-theme-style';
  const LABEL_CLASS = 'cgt-label';
  const PROCESSED_ATTR = 'data-cgt-processed';

  // Force light mode at the root so ChatGPT renders white/black natively
  const html = document.documentElement;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    html.classList.add('light');
  }
  try {
    localStorage.setItem('theme', 'light');
  } catch (e) {}

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Center the conversation turns */
      [data-message-author-role] {
        justify-content: center !important;
      }

      /* Override the inner wrapper for both user and assistant */
      [data-message-author-role] > div,
      [data-message-author-role] > div > div {
        margin-left: auto !important;
        margin-right: auto !important;
        max-width: 48rem !important;
        width: 100% !important;
      }

      /* Strip ALL bubble styling from user messages + force black text */
      [data-message-author-role="user"] * {
        background-color: transparent !important;
        background-image: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        border: none !important;
        color: #111111 !important;
      }
      [data-message-author-role="assistant"] {
        color: #111111 !important;
      }

      /* Remove right-alignment / flex-end on user turns */
      [data-message-author-role="user"],
      [data-message-author-role="user"] > div,
      [data-message-author-role="user"] > div > div {
        justify-content: flex-start !important;
        align-items: flex-start !important;
        text-align: left !important;
      }

      /* Ensure text is left-aligned (not centered) inside the centered column */
      [data-message-author-role] .text-message,
      [data-message-author-role] .whitespace-pre-wrap,
      [data-message-author-role] [class*="markdown"] {
        text-align: left !important;
      }

      /* Flatten user message padding that creates bubble spacing */
      [data-message-author-role="user"] [class*="px-"],
      [data-message-author-role="user"] [class*="py-"] {
        padding-left: 0 !important;
        padding-right: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      /* Label styling */
      .${LABEL_CLASS} {
        font-weight: 700;
        font-size: 0.95rem;
        margin-bottom: 0.35rem;
        display: block;
        text-align: left;
      }
      .${LABEL_CLASS}.user-label {
        color: #2563eb !important;
      }
      .${LABEL_CLASS}.assistant-label {
        color: #dc2626 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function forceBlackText(article) {
    if (article.getAttribute('data-cgt-colors-fixed')) return;
    const role = article.getAttribute('data-message-author-role');
    if (role !== 'user') return;
    article.querySelectorAll('*').forEach(el => {
      if (!el.classList.contains(LABEL_CLASS)) {
        el.style.setProperty('color', '#111111', 'important');
      }
    });
    article.setAttribute('data-cgt-colors-fixed', 'true');
  }

  function addLabel(article) {
    if (article.hasAttribute(PROCESSED_ATTR)) return;
    const role = article.getAttribute('data-message-author-role');
    if (!role || (role !== 'user' && role !== 'assistant')) return;

    // Find the message content container — try a few common selectors
    let container = article.querySelector('[class*="text-message"]');
    if (!container) {
      container = article.querySelector('.whitespace-pre-wrap');
    }
    if (!container) {
      // Fallback: find the deepest div that isn't a button/row
      const candidates = article.querySelectorAll('div');
      for (const div of candidates) {
        if (div.children.length === 0 || div.querySelector('p, ol, ul, pre')) {
          container = div;
          break;
        }
      }
    }
    if (!container) return;

    // Don't add if label already exists
    if (container.parentElement && container.parentElement.querySelector(`.${LABEL_CLASS}`)) {
      article.setAttribute(PROCESSED_ATTR, 'true');
      return;
    }

    const label = document.createElement('div');
    label.className = `${LABEL_CLASS} ${role === 'user' ? 'user-label' : 'assistant-label'}`;
    label.textContent = role === 'user' ? 'User' : 'ChatGPT';

    // Insert before the content container if possible, otherwise prepend
    if (container.parentElement && container.parentElement !== article) {
      container.parentElement.insertBefore(label, container);
    } else {
      article.insertBefore(label, article.firstChild);
    }

    article.setAttribute(PROCESSED_ATTR, 'true');
  }

  function processAll() {
    injectCSS();
    const articles = document.querySelectorAll('[data-message-author-role]');
    articles.forEach(article => {
      forceBlackText(article);
      addLabel(article);
    });
  }

  // Initial run
  processAll();

  // Watch for new messages
  const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('[data-message-author-role]')) {
              shouldRun = true;
            } else if (node.querySelectorAll) {
              const found = node.querySelectorAll('[data-message-author-role]');
              if (found.length > 0) shouldRun = true;
            }
          }
        }
      }
    }
    if (shouldRun) processAll();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
