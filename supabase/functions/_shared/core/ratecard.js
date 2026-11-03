// 2026 Wedding Partner Rate Card: confidential NET rates (Model B). Internal use only:
// the quote calculator in the opportunity editor reads from here; never render this on a public page.

export const RATE_CARD = {
  year: 2026,
  routes: [
    { key: 'mxp_como', label: 'Malpensa → Como', E: 180, V: 230, S: 290 },
    { key: 'mxp_tremezzina', label: 'Malpensa → Tremezzina / Menaggio', E: 230, V: 290, S: 360 },
    { key: 'mxp_bellagio', label: 'Malpensa → Bellagio', E: 250, V: 320, S: 390 },
    { key: 'lin_como', label: 'Linate → Como', E: 190, V: 240, S: 300 },
    { key: 'milan_como', label: 'Milan centre → Lake Como', E: 180, V: 230, S: 290 },
    { key: 'lugano_como', label: 'Lugano → Lake Como', E: 170, V: 210, S: 280 },
  ],
  hourly: { V: 90, S: 110, min_hours: 3 },
  late_night_shuttle: { V: 450, window: 'late-night block' },
  deposit: 0.25,
  balance_days_before: 7,
  referral_commission: 0.10,
  planner_markup_range: [0.15, 0.25],
};

/** items: [{ kind: 'route', route, vehicle, qty } | { kind: 'hourly', vehicle, hours, qty } | { kind: 'shuttle', qty }] */
export function quoteNet(items = []) {
  let total = 0; const lines = [];
  for (const it of items) {
    const qty = Math.max(0, +it.qty || 0);
    if (!qty) continue;
    if (it.kind === 'route') {
      const r = RATE_CARD.routes.find((x) => x.key === it.route); const unit = r && r[it.vehicle];
      if (!unit) continue; lines.push({ label: `${r.label} · ${it.vehicle}-Class`, qty, unit, sum: unit * qty }); total += unit * qty;
    } else if (it.kind === 'hourly') {
      const unit = RATE_CARD.hourly[it.vehicle]; if (!unit) continue;
      const hours = Math.max(RATE_CARD.hourly.min_hours, +it.hours || 0);
      lines.push({ label: `${it.vehicle}-Class hourly · ${hours} h`, qty, unit: unit * hours, sum: unit * hours * qty }); total += unit * hours * qty;
    } else if (it.kind === 'shuttle') {
      const unit = RATE_CARD.late_night_shuttle.V;
      lines.push({ label: 'Late-night villa shuttle · V-Class', qty, unit, sum: unit * qty }); total += unit * qty;
    }
  }
  return { lines, total, deposit: Math.round(total * RATE_CARD.deposit) };
}

export const commissionFor = (revenue, model) => (model === 'referral_12' ? Math.round((+revenue || 0) * RATE_CARD.referral_commission * 100) / 100 : 0);

export function getRateCardInfo(settings = {}, lang = 'en', audience = 'partner') {
  const cleanLang = (lang || '').toLowerCase().trim();
  const isClient = (audience || '').toLowerCase().trim() === 'client';

  let defaultFilename = isClient ? 'DOROGO_Tariffs_Client_EN.pdf' : 'DOROGO_Tariffs_Logistics_EN.pdf';
  let defaultPath = isClient ? 'rate-card/DOROGO_Tariffs_Client_EN.pdf' : 'rate-card/DOROGO_Tariffs_Logistics_EN.pdf';

  if (cleanLang.startsWith('ru')) {
    defaultFilename = isClient ? 'DOROGO_Tariffs_Client_RU.pdf' : 'DOROGO_Tariffs_Logistics_RU.pdf';
    defaultPath = isClient ? 'rate-card/DOROGO_Tariffs_Client_RU.pdf' : 'rate-card/DOROGO_Tariffs_Logistics_RU.pdf';
  } else if (cleanLang.startsWith('it')) {
    defaultFilename = isClient ? 'DOROGO_Tariffs_Client_IT.pdf' : 'DOROGO_Tariffs_Logistics_IT.pdf';
    defaultPath = isClient ? 'rate-card/DOROGO_Tariffs_Client_IT.pdf' : 'rate-card/DOROGO_Tariffs_Logistics_IT.pdf';
  }

  const prefix = isClient ? 'client_rate_card' : 'rate_card';
  const langPathKey = cleanLang.startsWith('ru') ? `${prefix}_path_ru` : cleanLang.startsWith('it') ? `${prefix}_path_it` : `${prefix}_path_en`;
  const langNameKey = cleanLang.startsWith('ru') ? `${prefix}_filename_ru` : cleanLang.startsWith('it') ? `${prefix}_filename_it` : `${prefix}_filename_en`;

  const path = settings[langPathKey] || (!isClient && cleanLang.startsWith('en') ? settings.rate_card_path : null) || defaultPath;
  const filename = settings[langNameKey] || (!isClient && cleanLang.startsWith('en') ? settings.rate_card_filename : null) || defaultFilename;

  return { path, filename, lang: cleanLang.slice(0, 2) || 'en', audience: isClient ? 'client' : 'partner' };
}
