// Time-zone and Italian calendar helpers. No dependencies: uses Intl only.

const DAY_MS = 86400000;

// Wall-clock parts of `date` in time zone `tz`.
export function localParts(date, tz = 'Europe/Rome') {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second, dow };
}

// UTC instant for a wall-clock time in `tz` (handles DST by correcting the offset twice).
export function zonedTimeToUtc(y, m, d, hh, mm, tz = 'Europe/Rome') {
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess), tz);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm);
    guess += Date.UTC(y, m - 1, d, hh, mm) - asUtc;
  }
  return new Date(guess);
}

export const ymd = (p) => `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
export const localDateKey = (date, tz) => ymd(localParts(date, tz));
export const parseHHMM = (s) => { const [h, m] = String(s).split(':').map(Number); return { hh: h || 0, mm: m || 0 }; };

// Gregorian Easter Sunday (anonymous algorithm).
export function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { y: year, m: month, d: day };
}

// Italian national holidays plus Sant'Ambrogio (Milan, 7 December), as YYYY-MM-DD keys.
export function italianHolidays(year) {
  const fixed = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-07', '12-08', '12-25', '12-26'];
  const keys = new Set(fixed.map((md) => `${year}-${md}`));
  const e = easterSunday(year);
  const em = new Date(Date.UTC(e.y, e.m - 1, e.d) + DAY_MS);
  keys.add(em.toISOString().slice(0, 10)); // Pasquetta (Easter Monday)
  return keys;
}

export function isItalianHoliday(dateKey) {
  return italianHolidays(+dateKey.slice(0, 4)).has(dateKey);
}

export const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
export const daysBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;
