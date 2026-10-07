// Small UI toolkit: escaping, formatting, toasts, dialogs. No framework.

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function ago(d) {
  if (!d) return '';
  const s = (new Date(d).getTime() - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return 'just now';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return rtf.format(Math.round(s / (86400 * 30)), 'month');
}
export const fmtDate = (d, o = {}) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...o, timeZone: 'Europe/Rome' }) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : '');
export const eur = (n) => (n === null || n === undefined || n === '' ? '–' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(+n));
export const pct = (x, digits = 0) => (x === null || x === undefined || Number.isNaN(x) ? '–' : `${(x * 100).toFixed(digits)}%`);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function toast(msg, kind = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  box.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, kind === 'error' ? 6000 : 3200);
}

// Modal dialog. `body` is HTML; `onMount(el, close)` wires it up. Returns a promise resolved by close(value).
export function dialog({ title, body, wide = false, onMount }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'dialog-backdrop';
    wrap.innerHTML = `<div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${attr(title)}">
      <header class="dialog-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></header>
      <div class="dialog-body">${body}</div></div>`;
    const close = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) close(null); });
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    onMount && onMount(wrap.querySelector('.dialog'), close);
    const first = wrap.querySelector('input, textarea, select, button:not([data-close])');
    first && first.focus();
  });
}

export async function confirmDialog(title, text, okLabel = 'Confirm', danger = false) {
  return dialog({
    title,
    body: `<p class="muted">${esc(text)}</p><div class="row end gap"><button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div>`,
    onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', () => close(true)),
  });
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied'); } catch { toast('Select the text and copy it', 'error'); }
    ta.remove(); return false;
  }
}

export function download(filename, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ICONS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  today: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>',
  board: '<rect x="3.5" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="16.5" y="4" width="4" height="7" rx="1.5"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/>',
  partners: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.4.6 2.4 2 2.9 4.2"/>',
  map: '<path d="M9 4l6 2 5-2v14l-5 2-6-2-5 2V6z"/><path d="M9 4v14M15 6v14"/>',
  template: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  ig: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".8" fill="currentColor"/>',
  phone: '<path d="M6 4h3l1.5 4-2 1.5a10 10 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  skip: '<path d="M6 6l7 6-7 6zM16 6v12"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  sparkle: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  power: '<path d="M12 4v8"/><path d="M7 7.5a7 7 0 1 0 10 0"/>',
  reply: '<path d="M10 8L5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  flow: '<rect x="3" y="5" width="3.5" height="14" rx="1"/><rect x="10.5" y="4" width="3.5" height="8" rx="1"/><rect x="10.5" y="14" width="3.5" height="6" rx="1"/><rect x="18" y="4" width="3.5" height="5" rx="1"/><rect x="18" y="11" width="3.5" height="9" rx="1"/><path d="M6.5 9c2 0 2-2 4-2M6.5 15c2 0 2 2 4 2M14 7c2 0 2-1 4-1M14 10c2 0 2 5 4 5"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  node: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 9l4 3-4 3M13 15h3"/>',
};

export const icon = (name, size = 18) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// Debounce for search inputs and realtime bursts.
export const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export const initials = (s = '') => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
