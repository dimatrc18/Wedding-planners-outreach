// Partners (roster, commission ledger, FAM transfers, re-engagement) and Lake Como coverage.
import * as core from '../../supabase/functions/_shared/core/index.js';
import { S, update } from '../store.js';
import { esc, attr, icon, eur, fmtDate, toast, confirmDialog } from '../ui.js';
import * as A from '../actions.js';
import { oppDialog } from './prospect.js';

const TALKING = ['replied', 'rate_card_sent', 'in_conversation', 'quote_requested', 'fam_offered'];

export function render(el, _param, sub) {
  if (sub === 'coverage') return coverage(el);
  const partners = S.prospects.filter((p) => p.status === 'partner_won');
  const rows = partners.map((p) => {
    const os = A.oppsOf(p.id);
    const won = os.filter((o) => o.stage === 'won');
    const upcoming = os.filter((o) => o.wedding_date && new Date(o.wedding_date) >= new Date() && o.stage !== 'lost').sort((a, b) => new Date(a.wedding_date) - new Date(b.wedding_date));
    const owed = os.reduce((s, o) => s + (+o.commission_owed || 0), 0), paid = os.reduce((s, o) => s + (+o.commission_paid || 0), 0);
    return { p, os, won, upcoming, revenue: won.reduce((s, o) => s + (+o.actual_revenue || 0), 0), owed, paid };
  }).sort((a, b) => b.revenue - a.revenue);
  const ledger = S.opps.filter((o) => (+o.commission_owed || 0) > 0).sort((a, b) => (+a.commission_owed - (+a.commission_paid || 0) > 0 ? -1 : 1) - (+b.commission_owed - (+b.commission_paid || 0) > 0 ? -1 : 1) || new Date(a.wedding_date || 0) - new Date(b.wedding_date || 0));
  const fam = S.prospects.filter((p) => p.fam_status);
  const reengage = S.prospects.filter((p) => (p.status === 'partner_won' && p.reengage_at) || (p.status === 'nurture' && p.nurture_until))
    .map((p) => ({ p, at: p.status === 'partner_won' ? p.reengage_at : p.nurture_until })).sort((a, b) => new Date(a.at) - new Date(b.at));
  const tot = rows.reduce((s, r) => ({ revenue: s.revenue + r.revenue, owed: s.owed + r.owed, paid: s.paid + r.paid }), { revenue: 0, owed: 0, paid: 0 });

  el.innerHTML = `
  <div class="page-head"><div><div class="label eyebrow">${partners.length} active partner${partners.length === 1 ? '' : 's'}</div><h1>Partners</h1></div><a class="btn" href="#coverage">${icon('map', 16)} Coverage</a></div>
  <div class="stack lg">
    <div class="kpis">
      <div class="kpi"><span class="label">Partner revenue</span><span class="val">${eur(tot.revenue)}</span></div>
      <div class="kpi"><span class="label">Commission outstanding</span><span class="val">${eur(tot.owed - tot.paid)}</span><span class="ci">${eur(tot.paid)} paid of ${eur(tot.owed)}</span></div>
      <div class="kpi"><span class="label">Upcoming partner weddings</span><span class="val">${rows.reduce((s, r) => s + r.upcoming.length, 0)}</span></div>
    </div>
    <section class="section"><div class="section-head"><h2>Roster</h2></div>
      ${rows.length ? `<div class="card flush table-wrap"><table><thead><tr><th>Partner</th><th>Model</th><th class="num">Bookings</th><th>Next wedding</th><th class="num">Revenue</th><th class="num">Commission due</th><th>Re-engage</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="clickable" data-open="${attr(r.p.id)}"><td><b>${esc(r.p.agency_name)}</b><div class="small muted">${esc(r.p.location || '')}</div></td><td>${r.p.partner_model === 'referral_12' ? 'A · 5% referral' : r.p.partner_model === 'net_whitelabel' ? 'B · Net / in offer' : '–'}</td>
        <td class="num">${r.won.length}</td><td>${r.upcoming[0] ? `${esc(fmtDate(r.upcoming[0].wedding_date, { year: 'numeric' }))} <span class="small muted">${esc(r.upcoming[0].venue || '')}</span>` : '–'}</td>
        <td class="num">${eur(r.revenue)}</td><td class="num">${eur(r.owed - r.paid)}</td><td class="small">${esc(fmtDate(r.p.reengage_at, { year: 'numeric' }))}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty">No partners yet. A prospect becomes a partner when you move it to Partner Won.</div>'}</section>

    <section class="section"><div class="section-head"><h2>Commission ledger</h2><span class="hint">Model A pays 5% once the couple's balance is settled</span></div>
      ${ledger.length ? `<div class="card flush table-wrap"><table><thead><tr><th>Booking</th><th>Wedding</th><th class="num">Revenue</th><th class="num">Owed</th><th class="num">Paid</th><th></th></tr></thead><tbody>
      ${ledger.map((o) => { const due = (+o.commission_owed || 0) - (+o.commission_paid || 0); return `<tr><td><b>${esc(A.prospectById(o.prospect_id)?.agency_name || '')}</b><div class="small muted">${esc(o.title || '')}</div></td><td>${esc(fmtDate(o.wedding_date, { year: 'numeric' }))}</td><td class="num">${eur(o.actual_revenue)}</td><td class="num">${eur(o.commission_owed)}</td><td class="num">${eur(o.commission_paid)}</td>
        <td>${due > 0 ? `<button class="btn sm" data-pay="${attr(o.id)}">Mark ${eur(due)} paid</button>` : `<span class="chip ok">Paid${o.commission_paid_at ? ` ${esc(fmtDate(o.commission_paid_at))}` : ''}</span>`}</td></tr>`; }).join('')}</tbody></table></div>`
      : '<div class="empty small">No commissions yet.</div>'}</section>

    <div class="grid-2">
      <section class="section"><div class="section-head"><h2>FAM transfers</h2><span class="hint">A free trial ride for the planner</span></div>
        ${fam.length ? `<div class="card flush list">${fam.map((p) => `<div class="list-item"><div class="t"><a href="#prospect/${attr(p.id)}"><b>${esc(p.agency_name)}</b></a><span class="small muted">${esc(p.fam_status)}${p.fam_at ? ` · ${esc(fmtDate(p.fam_at))}` : ''}</span></div>
          ${p.fam_status === 'offered' ? `<button class="btn sm" data-fam="accepted" data-id="${attr(p.id)}">Accepted</button><button class="btn sm ghost" data-fam="declined" data-id="${attr(p.id)}">Declined</button>` : ''}
          ${p.fam_status === 'accepted' ? `<button class="btn sm primary" data-fam="completed" data-id="${attr(p.id)}">Ride done</button>` : ''}
          ${p.fam_status === 'completed' ? '<span class="chip ok">Done</span>' : ''}</div>`).join('')}</div>` : '<div class="empty small">Offer a FAM transfer from a prospect (Partnership & dates).</div>'}</section>
      <section class="section"><div class="section-head"><h2>Next-season re-engagement</h2></div>
        ${reengage.length ? `<div class="card flush list">${reengage.map(({ p, at }) => `<a class="list-item clickable" href="#prospect/${attr(p.id)}" style="color:inherit;text-decoration:none"><span class="dot ${new Date(at) <= new Date() ? 'warn' : 'gold'}"></span><div class="t"><b>${esc(p.agency_name)}</b><span class="small muted">${p.status === 'partner_won' ? 'Partner' : 'Nurture'}</span></div><span class="small num">${esc(fmtDate(at, { year: 'numeric' }))}</span></a>`).join('')}</div>` : '<div class="empty small">Nothing scheduled.</div>'}</section>
    </div>
  </div>`;

  el.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-open]'); if (row && !e.target.closest('button')) { location.hash = `prospect/${row.dataset.open}`; return; }
    const pay = e.target.closest('[data-pay]');
    if (pay) {
      const o = S.opps.find((x) => x.id === pay.dataset.pay);
      if (await confirmDialog('Record commission payment', `Mark ${eur((+o.commission_owed || 0) - (+o.commission_paid || 0))} as paid to ${A.prospectById(o.prospect_id)?.agency_name}?`, 'Mark paid')) {
        await update('opps', o.id, { commission_paid: o.commission_owed, commission_paid_at: new Date().toISOString() }); toast('Payment recorded');
      }
    }
    const f = e.target.closest('[data-fam]');
    if (f) {
      const patch = { fam_status: f.dataset.fam };
      if (f.dataset.fam === 'completed') patch.fam_at = new Date().toISOString();
      await update('prospects', f.dataset.id, patch);
      toast(f.dataset.fam === 'completed' ? 'Ride done. A follow-up draft appears in Today.' : 'Updated');
    }
  });
  void oppDialog;
}

function coverage(el) {
  const norm = (s) => String(s || '').toLowerCase();
  const towns = [...new Set([...core.LAKE_TOWNS, ...S.prospects.map((p) => p.location).filter(Boolean)])];
  const data = towns.map((t) => {
    const here = S.prospects.filter((p) => norm(p.location) === norm(t) || (p.key_venues || []).some((v) => core.LAKE_VENUES.find((x) => x.name === v && norm(x.town) === norm(t))));
    return {
      town: t, lake: core.LAKE_TOWNS.includes(t),
      won: here.filter((p) => p.status === 'partner_won'), talking: here.filter((p) => TALKING.includes(p.status)),
      contacted: here.filter((p) => ['t1_sent', 't2_sent', 't3_sent', 't4_sent'].includes(p.status)), total: here.length,
      venues: core.LAKE_VENUES.filter((v) => norm(v.town) === norm(t)).map((v) => v.name),
    };
  });
  const lake = data.filter((d) => d.lake);
  const gaps = lake.filter((d) => !d.won.length && !d.talking.length);
  el.innerHTML = `
  <div class="page-head"><div><div class="label eyebrow">${lake.length - gaps.length} of ${lake.length} lake towns covered or in talks</div><h1>Lake Como coverage</h1></div><a class="btn" href="#partners">${icon('partners', 16)} Partners</a></div>
  <div class="stack lg">
    <div class="legend"><span><i style="background:var(--ok)"></i>Partner won</span><span><i style="background:var(--gold)"></i>In conversation</span><span><i style="background:var(--surface-3)"></i>Prospect only</span><span class="faint">Dashed = gap: no partner and no live conversation</span></div>
    <div class="towns">${data.filter((d) => d.lake || d.total).map((d) => `<div class="town ${!d.won.length && !d.talking.length ? 'gap' : ''}">
      <div class="row between"><b>${esc(d.town)}</b><span class="small num faint">${d.total}</span></div>
      <div class="bars" aria-hidden="true">${[...d.won.map(() => '<i class="won"></i>'), ...d.talking.map(() => '<i class="talk"></i>'), ...Array(Math.max(0, Math.min(8, d.total - d.won.length - d.talking.length))).fill('<i></i>')].join('') || '<i></i>'}</div>
      <span class="small">${d.won.length ? `${icon('check', 13)} ${d.won.map((p) => `<a href="#prospect/${attr(p.id)}">${esc(p.agency_name)}</a>`).join(', ')}` : d.talking.length ? `In talks: ${d.talking.map((p) => `<a href="#prospect/${attr(p.id)}">${esc(p.agency_name)}</a>`).join(', ')}` : '<span class="muted">No partner yet</span>'}</span>
      ${d.venues.length ? `<span class="tiny faint">${esc(d.venues.join(' · '))}</span>` : ''}
    </div>`).join('')}</div>
    ${gaps.length ? `<p class="small muted">Gaps worth a search: ${gaps.map((g) => esc(g.town)).join(', ')}. Look for planners whose portfolios feature venues there.</p>` : ''}
  </div>`;
}
