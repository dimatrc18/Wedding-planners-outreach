import { S, onChange } from './store.js';
import { toast, setRoute, getRoute } from './ui.js';
import * as today from './views/today.js?v=9.1';
import * as pipeline from './views/pipeline.js?v=9.1';
import * as analytics from './views/analytics.js?v=9.1';
import * as templates from './views/templates.js?v=9.1';
import * as events from './views/events.js?v=9.1';
import * as emailTester from './views/email_tester.js?v=9.1';
import * as docs from './views/docs.js?v=9.1';
import * as partners from './views/partners.js?v=9.0';
import * as tools from './views/tools.js?v=9.1';
import * as visibility from './views/visibility.js?v=9.7';
import * as settings from './views/settings.js?v=9.1';
import * as busPartners from './views/bus_partners.js?v=9.1';
import * as fleetShowcase from './views/fleet_showcase.js?v=9.7';
import * as eventPartners from './views/event_partners.js?v=11.0';

const ROUTES = {
  today: { view: today, label: 'Today', icon: 'today' },
  pipeline: { view: pipeline, label: 'Pipeline', icon: 'board' },
  analytics: { view: analytics, label: 'Analytics', icon: 'chart' },
  visibility: { view: visibility, label: 'AI Search Visibility', icon: 'radar', hidden: true },
  fleet_showcase: { view: fleetShowcase, label: 'Partner Fleet & Rates', icon: 'sparkle', hidden: true },
  partners: { view: partners, label: 'Partners', icon: 'partners' },
  bus_partners: { view: busPartners, label: 'Bus Fleets (41)', icon: 'van' },
  event_partners: { view: eventPartners, label: 'Exhibitors (Abroad)', icon: 'landmark' },
  events: { view: events, label: 'Events & Fairs', icon: 'calendar' },
  templates: { view: templates, label: 'Templates', icon: 'template' },
  email_tester: { view: emailTester, label: 'Email Tester', icon: 'send' },
  tools: { view: tools, label: 'Tools', icon: 'tool' },
  docs: { view: docs, label: 'Docs', icon: 'book' },
  settings: { view: settings, label: 'Settings', icon: 'gear' },
};

function renderNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const current = getRoute();
  nav.innerHTML = Object.entries(ROUTES)
    .filter(([_, r]) => !r.hidden)
    .map(([key, r]) => `
      <a href="#${key}" class="nav-item ${current === key ? 'active' : ''}">
        <span class="nav-icon">${getIcon(r.icon)}</span>
        <span class="nav-label">${r.label}</span>
      </a>
    `).join('');
}

function getIcon(name) {
  const icons = {
    today: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    board: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    radar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><line x1="12" y1="3" x2="12" y2="12"/><line x1="12" y1="12" x2="18" y2="18"/></svg>',
    sparkle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/></svg>',
    partners: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    van: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    landmark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    template: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    tool: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };
  return icons[name] || '';
}

async function renderRoute() {
  const current = getRoute();
  const route = ROUTES[current] || ROUTES.today;
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = '<div class="sail-card" style="padding:24px;text-align:center;color:var(--sail-muted)">Loading...</div>';
  try {
    await route.view.render(main);
  } catch (err) {
    console.error('Route render error:', err);
    main.innerHTML = `<div class="sail-card" style="padding:24px;color:#dc2626">Error rendering view: ${err.message}</div>`;
  }
  renderNav();
}

window.addEventListener('hashchange', renderRoute);

// Shell layout
function renderShell() {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-badge">D</span>
          <span class="brand-title">Dorogo Outreach</span>
        </div>
        <nav id="nav" class="nav"></nav>
        <div class="sidebar-footer">
          <div class="user-pill">
            <span class="user-dot"></span>
            <span class="user-email" id="user-display">Concierge Desk</span>
          </div>
        </div>
      </aside>
      <main id="main" class="main-content"></main>
    </div>
  `;
}

renderShell();
renderRoute();
onChange(() => {
  renderNav();
  const main = document.getElementById('main');
  const current = getRoute();
  const route = ROUTES[current] || ROUTES.today;
  if (main && route.view.render) route.view.render(main);
});
