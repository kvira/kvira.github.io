/* Interactivity for the kartikvira.com replica: sticky header, mobile drawer,
   site search and collapsible abstracts. */
(function () {
  'use strict';

  var html = document.documentElement;
  // Site root = the folder that contains assets/. Keeps every link relative so the
  // whole site can be moved (e.g. from /preview/ to /) without edits.
  var ROOT = new URL('../', document.currentScript.src);
  var PAGES = ['', 'cv/', 'research/'];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header turns solid once the page is scrolled -------------------------------- */

  function onScroll() {
    html.classList.toggle('is-scrolled', window.scrollY > 0);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile navigation drawer ------------------------------------------------------ */

  var menuBtn = document.querySelector('.menu-btn');
  var drawer = document.getElementById('drawer');
  var scrim = document.querySelector('.scrim');

  function setDrawer(open) {
    html.classList.toggle('drawer-open', open);
    document.body.classList.toggle('no-scroll', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    if (open) drawer.querySelector('a').focus();
    else if (menuBtn) menuBtn.focus();
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () { setDrawer(true); });
    drawer.querySelector('.drawer-close').addEventListener('click', function () { setDrawer(false); });
  }

  /* Search bar overlay ------------------------------------------------------------ */

  var searchBar = document.querySelector('.search-bar');
  var searchForm = searchBar && searchBar.querySelector('.search-form');
  var searchInput = searchForm && searchForm.querySelector('input');
  var isSearchPage = document.body.classList.contains('search-page');

  function syncClear() {
    searchForm.classList.toggle('has-text', searchInput.value !== '');
  }

  function setSearch(open) {
    html.classList.toggle('search-open', open);
    if (open) searchInput.focus();
  }

  if (searchForm) {
    searchForm.action = new URL('search/', ROOT).pathname;
    searchInput.addEventListener('input', syncClear);
    searchForm.querySelector('.clear-btn').addEventListener('click', function () {
      searchInput.value = '';
      syncClear();
      searchInput.focus();
    });
    searchForm.addEventListener('submit', function (e) {
      if (!searchInput.value.trim()) e.preventDefault();
    });
    searchBar.querySelector('.back-btn').addEventListener('click', function () {
      if (!isSearchPage) return setSearch(false);
      if (document.referrer && new URL(document.referrer).origin === location.origin) history.back();
      else location.href = ROOT.href;
    });
    var searchBtn = document.querySelector('.search-btn');
    if (searchBtn) searchBtn.addEventListener('click', function () { setSearch(true); });
  }

  if (scrim) {
    scrim.addEventListener('click', function () {
      if (html.classList.contains('drawer-open')) setDrawer(false);
      if (html.classList.contains('search-open')) setSearch(false);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (html.classList.contains('drawer-open')) setDrawer(false);
    if (html.classList.contains('search-open')) setSearch(false);
  });

  /* Collapsible text boxes (Research page) ---------------------------------------- */

  function setOpen(item, open, animate) {
    var btn = item.querySelector('.collapse-toggle');
    var body = item.querySelector('.collapsible-body');
    var title = item.querySelector('.paper-title').textContent.trim();

    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', (open ? 'Collapse: ' : 'Expand: ') + title);
    btn.setAttribute('data-tooltip', open ? 'Collapse' : 'Expand');

    if (!animate || reduceMotion) {
      item.classList.toggle('is-open', open);
      body.style.height = '';
      return;
    }

    if (open) {
      item.classList.add('is-open');
      var target = body.scrollHeight;
      body.style.height = '0px';
      body.offsetHeight; // force layout so the transition starts from 0
      body.style.height = target + 'px';
    } else {
      body.style.height = body.scrollHeight + 'px';
      body.offsetHeight;
      body.style.height = '0px';
    }
  }

  document.querySelectorAll('.collapsible').forEach(function (item) {
    var body = item.querySelector('.collapsible-body');

    item.querySelector('.collapsible-header').addEventListener('click', function (e) {
      if (e.target.closest('a')) return; // links in the header just open the link
      var btn = item.querySelector('.collapse-toggle');
      setOpen(item, btn.getAttribute('aria-expanded') !== 'true', true);
    });

    body.addEventListener('transitionend', function (e) {
      if (e.propertyName !== 'height') return;
      var open = item.querySelector('.collapse-toggle').getAttribute('aria-expanded') === 'true';
      if (!open) item.classList.remove('is-open');
      body.style.height = '';
    });
  });

  function openFromHash() {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('collapsible')) setOpen(target, true, false);
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* Search results page ----------------------------------------------------------- */

  if (isSearchPage) runSearch();

  function stem(word) {
    word = word.toLowerCase();
    if (word.length > 4) {
      var m = word.match(/(ies|es|s|ing|ed|y|e)$/);
      if (m) word = word.slice(0, -m[1].length);
    }
    return word;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function snippet(text, pattern) {
    pattern.lastIndex = 0;
    var first = pattern.exec(text);
    var start = Math.max(0, first.index - 50);
    var end = Math.min(text.length, start + 170);
    if (start > 0) start = text.indexOf(' ', start) + 1;
    if (end < text.length) end = text.lastIndexOf(' ', end);
    var slice = text.slice(start, end);
    var out = '';
    var last = 0;
    pattern.lastIndex = 0;
    slice.replace(pattern, function (match, offset) {
      out += escapeHtml(slice.slice(last, offset)) + '<b>' + escapeHtml(match) + '</b>';
      last = offset + match.length;
      return match;
    });
    out += escapeHtml(slice.slice(last));
    return (start > 0 ? '... ' : '') + out + (end < text.length ? ' ...' : '');
  }

  function formatDate(header) {
    var d = header ? new Date(header) : null;
    if (!d || isNaN(d)) return '';
    return 'Last modified on ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function runSearch() {
    var list = document.getElementById('search-results-list');
    var query = (new URLSearchParams(location.search).get('query') || '').trim();
    searchInput.value = query;
    syncClear();
    if (!query) {
      searchInput.focus();
      return;
    }
    document.title = query + ' - Search';

    var stems = query.split(/\s+/).map(stem).filter(Boolean);
    var tests = stems.map(function (s) { return new RegExp('\\b' + escapeRegex(s), 'i'); });
    var pattern = new RegExp('\\b(?:' + stems.map(escapeRegex).join('|') + ')[\\w\\u00C0-\\u024F’\']*', 'gi');

    Promise.all(PAGES.map(function (path) {
      var url = new URL(path, ROOT);
      return fetch(url).then(function (res) {
        if (!res.ok) return null;
        return res.text().then(function (source) {
          var doc = new DOMParser().parseFromString(source, 'text/html');
          var main = doc.querySelector('main');
          return {
            url: url.href,
            title: doc.title,
            text: main ? main.textContent.replace(/\s+/g, ' ').trim() : '',
            modified: res.headers.get('last-modified')
          };
        });
      }).catch(function () { return null; });
    })).then(function (pages) {
      var hits = pages.filter(function (p) {
        return p && tests.every(function (t) { return t.test(p.text); });
      }).map(function (p) {
        p.score = (p.text.match(pattern) || []).length;
        return p;
      }).sort(function (a, b) { return b.score - a.score; });

      if (!hits.length) {
        list.innerHTML = '<p class="search-empty">No results found for “' + escapeHtml(query) + '”</p>';
        return;
      }
      list.innerHTML = hits.map(function (p) {
        var date = formatDate(p.modified);
        return '<div class="search-result">' +
          '<a href="' + escapeHtml(p.url) + '">' + escapeHtml(p.title) + '</a>' +
          '<div class="search-snippet">' + snippet(p.text, pattern) + '</div>' +
          (date ? '<div class="search-date">' + date + '</div>' : '') +
          '</div>';
      }).join('');
    });
  }
})();
