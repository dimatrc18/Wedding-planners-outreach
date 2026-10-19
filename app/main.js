// App shell: sign-in, navigation, hash router, re-render on data changes.
import { S, init, onChange, signIn, signOut, startDemo, leaveDemo, syncScores, isDemo } from './store.js';
import { esc, icon, toast, debounce } from './ui.js';
import { todayData } from './actions.js';
import * as today from './views/today.js?v=3.1';
import * as pipeline from './views/pipeline.js?v=3.1';
import * as prospect from './views/prospect.js?v=3.1';
import * as add from './views/add.js?v=3.1';
import * as templates from './views/templates.js?v=3.1';
import * as analytics from './views/analytics.js?v=3.1';
import * as partners from './views/partners.js?v=3.1';
import * as tools from './views/tools.js?v=3.1';
import * as visibility from './views/visibility.js?v=3.1';
import * as settings from './views/settings.js?v=3.1';

const ROUTES = {
  today: { view: today, label: 'Today', icon: 'today' },
  pipeline: { view: pipeline, label: 'Pipeline', icon: 'board' },
  analytics: { view: analytics, label: 'Analytics', icon: 'chart' },
  visibility: { view: visibility, label: 'AI Visibility', icon: 'radar', hidden: true },
  partners: { view: partners, label: 'Partners', icon: 'partners' },
  coverage: { view: partners, label: 'Coverage', icon: 'map', sub: 'coverage' },
  templates: { view: templates, label: 'Sequence & templates', icon: 'template' },
  settings: { view: settings, label: 'Settings', icon: 'settings' },
  tools: { view: tools, label: 'Tools', icon: 'sparkle', hidden: true },
  add: { view: add, label: 'Add prospects', icon: 'plus', hidden: true },
  prospect: { view: prospect, label: 'Prospect', hidden: true },
};

let current = null;
let cleanup = null;
let pending = false;

function parseHash() {
  const h = location.hash.replace(/^#/, '').replace(/^demo&?/, '');
  const [name, ...rest] = h.split('/');
  return { name: ROUTES[name] ? name : 'today', param: rest.join('/') };
}

function badgeCount() {
  if (!['live', 'demo'].includes(S.mode)) return 0;
  const d = todayData();
  return d.drafts.length + d.replies.length;
}

function shell() {
  const root = document.getElementById('root');
  const n = badgeCount();
  const r = parseHash();
  const isTools = r.name === 'tools' || r.name === 'visibility';
  const links = Object.entries(ROUTES).filter(([, v]) => !v.hidden);
  root.innerHTML = `<div class="app">
    <nav class="rail" aria-label="Main">
      <div class="brand">
        <div class="mark">DOROGO</div>
        <div class="sub">${isTools ? 'Creative & AI tools' : 'Partner outreach'}</div>
      </div>
      <!-- Mode Switch Toggle: Outreach vs Tools -->
      <div class="rail-mode-switch" role="tablist" aria-label="Mode">
        <a href="#today" class="rail-mode-btn ${!isTools ? 'active' : ''}">${icon('mail', 14)}<span>Outreach</span></a>
        <a href="#tools" class="rail-mode-btn ${isTools ? 'active' : ''}">${icon('sparkle', 14)}<span>Tools</span></a>
      </div>
      ${isTools ? `
        <a class="nav-link ${r.name === 'tools' ? 'active' : ''}" href="#tools">${icon('sparkle')}<span>AI Watermark Cleaner</span></a>
        <a class="nav-link ${r.name === 'visibility' ? 'active' : ''}" href="#visibility">${icon('radar')}<span>AI Search Visibility</span></a>
        <div class="divider" style="margin: 12px 10px;"></div>
        <a class="nav-link" href="#today">${icon('mail')}<span>← Back to Outreach</span></a>
      ` : `
        ${links.map(([k, v]) => `<a class="nav-link ${r.name === k ? 'active' : ''}" href="#${k}">${icon(v.icon)}<span>${esc(v.label)}</span>${k === 'today' && n ? `<span class="count">${n}</span>` : ''}</a>`).join('')}
        <a class="nav-link" href="#add" style="margin-top:10px">${icon('plus')}<span>Add prospects</span></a>
      `}
      <div class="rail-foot">
        <span class="tiny faint">${esc(S.user?.email || '')}</span>
        ${isDemo() ? '<button class="btn sm" data-act="leave-demo">Leave demo</button>' : '<button class="btn sm ghost" data-act="sign-out">Sign out</button>'}
      </div>
    </nav>
    <main class="main" id="view" tabindex="-1"></main>
    <nav class="tabbar" aria-label="Main">
      ${[
        { k: 'today', label: 'Today', icon: 'today', dot: n },
        { k: 'pipeline', label: 'Pipeline', icon: 'board' },
        { k: 'tools', label: 'Tools', icon: 'sparkle' },
        { k: 'partners', label: 'Partners', icon: 'partners' },
        { k: 'settings', label: 'Settings', icon: 'settings' },
      ].map((tab) => `<a href="#${tab.k}" class="${r.name === tab.k ? 'active' : ''}">${icon(tab.icon, 20)}<span>${esc(tab.label)}</span>${tab.dot ? `<span class="dot">${tab.dot}</span>` : ''}</a>`).join('')}
    </nav>
  </div>`;
  root.querySelector('[data-act="sign-out"]')?.addEventListener('click', () => signOut());
  root.querySelector('[data-act="leave-demo"]')?.addEventListener('click', () => leaveDemo());
}

function banners() {
  const out = [];
  if (isDemo()) out.push(`<div class="banner demo">${icon('sparkle')}<span><b>Demo data.</b> Fictional agencies; nothing is saved or sent.</span></div>`);
  if (S.loadError) out.push(`<div class="banner bad"><b>Could not load data:</b> ${esc(S.loadError)}. Check that your email is on the allowed list.</div>`);
  if (S.settings.kill_switch) out.push(`<div class="banner bad">${icon('power')}<span><b>Kill switch is on.</b> Nothing will be sent.</span><a class="btn sm" href="#settings">Settings</a></div>`);
  return out.join('');
}

function renderView() {
  if (!['live', 'demo'].includes(S.mode)) return;
  const r = parseHash();
  const route = ROUTES[r.name];
  const isTools = r.name === 'tools';
  if (current !== r.name || !document.getElementById('view')) shell();
  else {
    // keep nav badges fresh without rebuilding the shell
    const n = badgeCount();
    document.querySelectorAll('.nav-link .count, .tabbar .dot').forEach((el) => el.remove());
    if (n) {
      document.querySelector('.nav-link[href="#today"]')?.insertAdjacentHTML('beforeend', `<span class="count">${n}</span>`);
      document.querySelector('.tabbar a[href="#today"]')?.insertAdjacentHTML('beforeend', `<span class="dot">${n}</span>`);
    }
  }
  const el = document.getElementById('view');
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  const prevScroll = current === r.name ? window.scrollY : 0;
  current = r.name;
  document.querySelectorAll('.nav-link').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${r.name}`));
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${r.name}`));
  
  el.innerHTML = banners() + '<div id="view-body"></div>';
  cleanup = route.view.render(el.querySelector('#view-body'), r.param, route.sub) || null;
  document.title = isTools ? 'DOROGO Tools · AI Watermark & Metadata Engine' : `${route.label} · DOROGO Partner Outreach`;
  window.scrollTo(0, prevScroll);
}

// Re-render on data changes, but never while someone is typing in the view.
const rerender = debounce(() => {
  const a = document.activeElement;
  if (a && a.closest && a.closest('#view') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { pending = true; return; }
  pending = false;
  renderView();
}, 60);
document.addEventListener('focusout', () => setTimeout(() => { if (pending) rerender(); }, 120));

function renderSignIn() {
  const root = document.getElementById('root');
  root.innerHTML = `<div class="signin"><div class="box">
    <div><div class="mark">DOROGO</div><div class="sub" style="margin-top:8px">Partner outreach</div></div>
    <form class="card stack" id="login">
      <label class="field"><span>Email</span><input id="email" type="email" autocomplete="email" required placeholder="you@dorogo.eu"></label>
      <button class="btn primary" type="submit">Email me a sign-in link</button>
      <p class="small muted" id="login-msg">Only addresses on the team's allowed list can see data.</p>
    </form>
    <button class="btn ghost" id="demo">Explore with demo data</button>
  </div></div>`;
  root.querySelector('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#login-msg');
    try { await signIn(root.querySelector('#email').value.trim()); msg.textContent = 'Check your inbox for the sign-in link.'; }
    catch (err) { msg.textContent = err.message; }
  });
  root.querySelector('#demo').addEventListener('click', () => { location.hash = 'today'; startDemo(); });
}

onChange((why) => {
  if (why === 'auth' && S.mode === 'signed_out') return renderSignIn();
  if (why === 'loaded') { syncScores(); current = null; return renderView(); }
  rerender();
});
window.addEventListener('hashchange', () => { if (['live', 'demo'].includes(S.mode)) renderView(); });
window.addEventListener('error', (e) => toast(`Something broke: ${e.message}`, 'error'));
window.addEventListener('unhandledrejection', (e) => toast(e.reason?.message || String(e.reason), 'error'));

init().catch((e) => { document.getElementById('root').innerHTML = `<div class="signin"><div class="box"><p>${esc(e.message)}</p></div></div>`; });
