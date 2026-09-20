import fs from 'node:fs';
import path from 'node:path';
import { GTO_CALENDAR_EVENTS } from '../web/js/gto_data.js';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'database_dumps/gto_all_competition_results.json');
const output = path.join(root, 'web/data/results');
const rows = JSON.parse(fs.readFileSync(source, 'utf8'));
const slugFromUrl = value => {
  try { return new URL(value).pathname.split('/').filter(Boolean).at(-1) || ''; }
  catch { return ''; }
};

fs.mkdirSync(output, { recursive: true });
const bySlug = new Map();
rows.forEach(row => {
  if (!bySlug.has(row.tournament_slug)) bySlug.set(row.tournament_slug, []);
  bySlug.get(row.tournament_slug).push(row);
});

const manifest = { generatedAt: new Date().toISOString(), sourceRows: rows.length, events: {} };
for (const event of GTO_CALENDAR_EVENTS) {
  const slug = slugFromUrl(event.url);
  const eventRows = bySlug.get(slug);
  if (!eventRows?.length) continue;
  let normalizedRows = eventRows;
  if (slug === 'chempionat-po-mnogoboryu-gto') {
    let sex = 'Женщины';
    let firstPlaceSeen = false;
    normalizedRows = eventRows.filter(row => !/^(женщины|мужчины)$/i.test(row.participant || '')).map(row => {
      if (/^1\s*место$/i.test(row.rank || '')) {
        if (firstPlaceSeen) sex = 'Мужчины';
        firstPlaceSeen = true;
      }
      const cells = row.raw_cells || [];
      return {
        ...row,
        category: sex,
        details: {
          'Общий результат': cells[3] ? `${cells[3]} баллов` : row.result,
          'Комплекс «Сила»': [cells[4], cells[5]].filter(Boolean).join(' · '),
          'Комплекс «Гимнастика»': cells[6] || '',
          'Комплекс «Выносливость»': [cells[7], cells[8]].filter(Boolean).join(' · '),
          'Комплекс «Бег»': cells[9] || ''
        }
      };
    });
  }
  const results = normalizedRows.map((row, index) => ({
    id: index + 1,
    participant: row.participant || '',
    team: row.participant ? '' : (row.region || ''),
    region: row.region || '',
    rank: row.rank || '',
    result: row.result || '',
    category: row.category || row.page_title || '',
    subgroup: row.subgroup || '',
    pageTitle: row.page_title || '',
    sourceUrl: row.page_url || '',
    details: row.details || {}
  }));
  const payload = { eventId: event.id, tournamentSlug: slug, title: event.title, count: results.length, results };
  fs.writeFileSync(path.join(output, `${event.id}.json`), JSON.stringify(payload));
  manifest.events[event.id] = { slug, count: results.length, athletes: results.filter(x => x.participant).length, teams: results.filter(x => x.team).length };
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
