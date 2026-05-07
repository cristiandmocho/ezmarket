const RECENT_KEY = 'ezm_recent_searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 220;

const form        = document.getElementById('search-form');
const input       = document.getElementById('search-input');
const clearBtn    = document.getElementById('search-clear');
const dropdown    = document.getElementById('search-autocomplete');
const idleSection = document.getElementById('search-idle');
const recentSec   = document.getElementById('recent-section');
const recentsEl   = document.getElementById('search-recents');
const recentClear = document.getElementById('recent-clear');

const EUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

// ── Recent searches ──────────────────────────────────────────────────────────

function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(q) {
  const list = [q, ...getRecents().filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

function renderRecents() {
  if (!recentSec) return;
  const recents = getRecents();
  if (!recents.length) { recentSec.hidden = true; return; }
  recentSec.hidden = false;
  recentsEl.innerHTML = recents.map(r =>
    `<button class="search-recent-chip" type="button" data-q="${escHtml(r)}">
      <span class="mdi">history</span>${escHtml(r)}
    </button>`
  ).join('');
}

function clearRecents() {
  localStorage.removeItem(RECENT_KEY);
  if (recentSec) recentSec.hidden = true;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Autocomplete ─────────────────────────────────────────────────────────────

let debounceTimer = null;
let activeIdx = -1;
let currentItems = [];

function hideDropdown() {
  dropdown.hidden = true;
  activeIdx = -1;
  currentItems = [];
}

function showDropdown(items) {
  if (!items.length) { hideDropdown(); return; }
  currentItems = items;
  activeIdx = -1;

  dropdown.innerHTML = items.map((item, i) => {
    const img = item.image_url
      ? `<img class="search-autocomplete-item__img" src="${escHtml(item.image_url)}" alt="" width="40" height="40" loading="lazy" decoding="async" onerror="this.replaceWith(mkPlaceholder())">`
      : `<span class="search-autocomplete-item__img-placeholder"><span class="mdi">grocery</span></span>`;
    const price = item.min_price ? `<span class="search-autocomplete-item__price">${EUR.format(item.min_price)}</span>` : '';
    const brand = item.brand ? `<span class="search-autocomplete-item__brand">${escHtml(item.brand)}</span>` : '';
    return `<li class="search-autocomplete-item" role="option" aria-selected="false" data-idx="${i}" data-q="${escHtml(item.listing_name)}">
      ${img}
      <span class="search-autocomplete-item__text">
        <span class="search-autocomplete-item__name">${escHtml(item.listing_name)}</span>
        ${brand}
      </span>
      ${price}
    </li>`;
  }).join('');

  dropdown.hidden = false;
}

function setActive(idx) {
  const items = dropdown.querySelectorAll('.search-autocomplete-item');
  items.forEach((el, i) => el.setAttribute('aria-selected', i === idx ? 'true' : 'false'));
  activeIdx = idx;
  if (idx >= 0 && items[idx]) {
    input.value = currentItems[idx].listing_name;
  }
}

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const items = await res.json();
    showDropdown(items);
  } catch { /* network error — fail silently */ }
}

function onInput() {
  const q = input.value.trim();
  clearBtn.hidden = !q;

  clearTimeout(debounceTimer);
  if (!q) { hideDropdown(); return; }

  debounceTimer = setTimeout(() => fetchSuggestions(q), DEBOUNCE_MS);
}

function navigate(q) {
  if (!q) return;
  saveRecent(q);
  window.location.href = `/search?q=${encodeURIComponent(q)}`;
}

// ── Keyboard navigation ──────────────────────────────────────────────────────

input.addEventListener('keydown', e => {
  if (dropdown.hidden) return;
  const count = currentItems.length;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive((activeIdx + 1) % count);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive((activeIdx - 1 + count) % count);
  } else if (e.key === 'Escape') {
    hideDropdown();
  }
});

// ── Event wiring ─────────────────────────────────────────────────────────────

input.addEventListener('input', onInput);

input.addEventListener('focus', () => {
  if (input.value.trim()) onInput();
});

document.addEventListener('click', e => {
  if (!form.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
});

dropdown.addEventListener('click', e => {
  const item = e.target.closest('[data-q]');
  if (item) navigate(item.dataset.q);
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.hidden = true;
  hideDropdown();
  input.focus();
});

if (recentClear) recentClear.addEventListener('click', clearRecents);

// Trending + category buttons navigate directly
document.querySelectorAll('[data-q]').forEach(btn => {
  if (btn === clearBtn) return;
  btn.addEventListener('click', () => navigate(btn.dataset.q));
});

// Recent chips (rendered dynamically)
if (recentsEl) {
  recentsEl.addEventListener('click', e => {
    const chip = e.target.closest('[data-q]');
    if (chip) navigate(chip.dataset.q);
  });
}

// On form submit, save the query to recents
form.addEventListener('submit', () => {
  const q = input.value.trim();
  if (q) saveRecent(q);
});

// Init
renderRecents();
