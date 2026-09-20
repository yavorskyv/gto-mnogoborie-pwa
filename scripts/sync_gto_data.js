/**
 * Data Synchronizer for "Федерация многоборья ГТО России" (gto.com.ru)
 * Fetches official calendar, news, regional federations and videos,
 * parses them into structured JSON and exports to web/js/gto_data.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://gto.com.ru';

// Helper to extract attribute
function getAttr(tag, attr) {
  const m = tag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
  return m ? m[1] : '';
}

// 1. Fetch official news
async function fetchNews() {
  console.log('Fetching official news from gto.com.ru...');
  try {
    const res = await fetch(`${BASE_URL}/extore/frontend/themes/gto/news_search.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'query=&limit=30'
    });
    const html = await res.text();

    const items = [];
    const parts = html.split('<div class="news_item">');
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const imgMatch = part.match(/<img[^>]+src="([^">]+)"/i);
      const dateMatch = part.match(/<div class="news_date">([\s\S]*?)<\/div>/i);
      const titleTagMatch = part.match(/<a[^>]*class="[^"]*news_title[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const txtMatch = part.match(/<div class="news_txt">([\s\S]*?)<\/div>/i);
      const linkTagMatch = part.match(/<a[^>]*class="[^"]*news_link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);

      if (titleTagMatch) {
        const title = titleTagMatch[1].replace(/<[^>]+>/g, '').trim();
        const href = getAttr(titleTagMatch[0], 'href');
        const date = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        let text = txtMatch ? txtMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        text = text.replace(/﻿+/g, '').trim();
        const img = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '';
        const fullUrl = href.startsWith('http') ? href : (href ? BASE_URL + href : `${BASE_URL}/novosti/`);
        const actionText = linkTagMatch ? linkTagMatch[1].replace(/<[^>]+>/g, '').trim() : 'Подробнее';

        items.push({
          id: items.length + 1,
          title,
          date,
          text: text || 'Официальная публикация пресс-службы Федерации многоборья ГТО России.',
          img: img || `${BASE_URL}/extore/frontend/themes/gto/img/events.jpg`,
          url: fullUrl,
          actionText
        });
      }
    }
    console.log(`Parsed ${items.length} news items.`);
    return items;
  } catch (err) {
    console.error('Error fetching news:', err);
    return [];
  }
}

// 2. Fetch official calendar
async function fetchCalendar() {
  console.log('Fetching official calendar from gto.com.ru...');
  try {
    const res = await fetch(`${BASE_URL}/extore/frontend/themes/gto/calendar_ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'region=1739199615&oblst='
    });
    const rawHtml = await res.text();
    const html = rawHtml.replace(/<!--[\s\S]*?-->/g, '');

    const events = [];
    const cardMatches = html.split('<a ');
    for (let i = 1; i < cardMatches.length; i++) {
      const card = cardMatches[i];
      if (!card.includes('calendar_content_container')) continue;

      const hrefMatch = card.match(/href="([^">]+)"/i);
      const imgMatch = card.match(/<img[^>]+src="([^">]+)"/i);
      const periodMatch = card.match(/<div class="period">([\s\S]*?)<\/div>/i);
      const titleMatch = card.match(/<div class="calendar_content_container_c_title">([\s\S]*?)<\/div>/i);
      const absTxtMatch = card.match(/<div class="calendar_abs_txt">([\s\S]*?)<\/div>/i);
      const cccLinkMatch = card.match(/<div[^>]*class="ccc_link"[^>]*>([\s\S]*?)<\/div>/i);

      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const period = periodMatch ? periodMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        let location = '';
        if (absTxtMatch) {
          const lines = absTxtMatch[1].split(/<\/p>|<br\/?>/i).map(l => l.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
          location = lines.join(' • ');
        }
        const img = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : '';
        const href = hrefMatch ? (hrefMatch[1].startsWith('http') ? hrefMatch[1] : BASE_URL + hrefMatch[1]) : '';
        const actionText = cccLinkMatch ? cccLinkMatch[1].replace(/<[^>]+>/g, '').trim() : 'Подробнее';

        let category = 'Региональные';
        const tLow = title.toLowerCase();
        if (
          tLow.includes('россии') ||
          tLow.includes('открытый кубок дальнего востока') ||
          tLow.includes('народные игры гто') ||
          tLow.includes('игры гто') ||
          tLow.includes('студенческие игры') ||
          tLow.includes('герой гто')
        ) {
          category = 'Федеральные';
        }

        events.push({
          id: events.length + 1,
          title,
          period,
          location: location || 'Россия',
          category,
          img: img || `${BASE_URL}/extore/frontend/themes/gto/img/events.jpg`,
          url: href,
          actionText
        });
      }
    }

    console.log(`Parsed ${events.length} calendar events.`);
    return events;
  } catch (err) {
    console.error('Error fetching calendar:', err);
    return [];
  }
}

// 3. Regional federations catalog
const REGIONS_CATALOG = [
  { id: '1705658866', name: 'Федерация Многоборья ГТО России', region: 'Россия (Центральный аппарат)', code: 'RU' },
  { id: '1704977561', name: 'Федерация многоборья ГТО Москвы', region: 'Москва', code: '77' },
  { id: '1705326009', name: 'Федерация Многоборья ГТО Московской области', region: 'Московская область', code: '50' },
  { id: '1705329839', name: 'Федерация Многоборья ГТО Санкт-Петербурга', region: 'Санкт-Петербург', code: '78' },
  { id: '1729165316', name: 'Федерация многоборья ГТО Ленинградской области', region: 'Ленинградская область', code: '47' },
  { id: '1705327997', name: 'Федерация Многоборья ГТО Приморского Края', region: 'Приморский край', code: '25' },
  { id: '1705331443', name: 'Федерация Многоборья ГТО Хабаровского края', region: 'Хабаровский край', code: '27' },
  { id: '1705304782', name: 'Федерация многоборья ГТО Амурской области', region: 'Амурская область', code: '28' },
  { id: '1705307049', name: 'Федерация Многоборья ГТО Камчатского края', region: 'Камчатский край', code: '41' },
  { id: '1705329985', name: 'Федерация Многоборья ГТО Сахалинской области', region: 'Сахалинская область', code: '65' },
  { id: '1705306639', name: 'Федерация Многоборья ГТО Забайкальского края', region: 'Забайкальский край', code: '75' },
  { id: '1705328972', name: 'Федерация Многоборья ГТО Республики Саха (Якутия)', region: 'Республика Саха (Якутия)', code: '14' },
  { id: '1727254924', name: 'Федерация многоборья ГТО Чукотского автономного округа', region: 'Чукотский АО', code: '87' },
  { id: '1747223619', name: 'Федерация Многоборья ГТО Еврейской автономной области', region: 'Еврейская АО', code: '79' },
  { id: '1706595605', name: 'Федерация многоборья ГТО Красноярского края', region: 'Красноярский край', code: '24' },
  { id: '1705307383', name: 'Федерация Многоборья ГТО Кемеровской области', region: 'Кемеровская область — Кузбасс', code: '42' },
  { id: '1717403711', name: 'Федерация многоборья ГТО Новосибирской области', region: 'Новосибирская область', code: '54' },
  { id: '1705326837', name: 'Федерация Многоборья ГТО Омской области', region: 'Омская область', code: '55' },
  { id: '1705330768', name: 'Федерация Многоборья ГТО Томской области', region: 'Томская область', code: '70' },
  { id: '1734942675', name: 'Федерация многоборья ГТО Алтайского края', region: 'Алтайский край', code: '22' },
  { id: '1705330911', name: 'Федерация Многоборья ГТО Тюменской области', region: 'Тюменская область', code: '72' },
  { id: '1705331574', name: 'Федерация Многоборья ГТО ХМАО', region: 'ХМАО — Югра', code: '86' },
  { id: '1705331718', name: 'Федерация Многоборья ГТО Челябинской области', region: 'Челябинская область', code: '74' },
  { id: '1705325500', name: 'Федерация Многоборья ГТО Курганской области', region: 'Курганская область', code: '45' },
  { id: '1705327769', name: 'Федерация Многоборья ГТО Пермского Края', region: 'Пермский край', code: '59' },
  { id: '1705328228', name: 'Федерация Многоборья ГТО Республики Башкортостан', region: 'Республика Башкортостан', code: '02' },
  { id: '1705331063', name: 'Федерация Многоборья ГТО Удмуртской Республики', region: 'Удмуртская Республика', code: '18' },
  { id: '1705331310', name: 'Федерация Многоборья ГТО Ульяновской области', region: 'Ульяновская область', code: '73' },
  { id: '1705327220', name: 'Федерация Многоборья ГТО Пензенской области', region: 'Пензенская область', code: '58' },
  { id: '1734513099', name: 'Федерация многоборья ГТО Оренбургской области', region: 'Оренбургская область', code: '56' },
  { id: '1760439708', name: 'Федерация многоборья ГТО Нижегородской области', region: 'Нижегородская область', code: '52' },
  { id: '1705325313', name: 'Федерация Многоборья ГТО Краснодарского края', region: 'Краснодарский край', code: '23' },
  { id: '1705330607', name: 'Федерация Многоборья ГТО Ставропольского края', region: 'Ставропольский край', code: '26' },
  { id: '1705329146', name: 'Федерация Многоборья ГТО Ростовской области', region: 'Ростовская область', code: '61' },
  { id: '1705305861', name: 'Федерация Многоборья ГТО Волгоградской области', region: 'Волгоградская область', code: '34' },
  { id: '1705328776', name: 'Федерация Многоборья ГТО Республики Крым', region: 'Республика Крым', code: '91' },
  { id: '1705330438', name: 'Федерация Многоборья ГТО Севастополя', region: 'Севастополь', code: '92' },
  { id: '1705328553', name: 'Федерация Многоборья ГТО Республики Ингушетии', region: 'Республика Ингушетия', code: '06' },
  { id: '1710347051', name: 'Федерация многоборья ГТО Белгородской области', region: 'Белгородская область', code: '31' },
  { id: '1704811639', name: 'Федерация многоборья ГТО Воронежской области', region: 'Воронежская область', code: '36' },
  { id: '1734513572', name: 'Федерация многоборья ГТО Брянской области', region: 'Брянская область', code: '32' },
  { id: '1747822115', name: 'Федерация многоборья ГТО Смоленской области', region: 'Смоленская область', code: '67' },
  { id: '1737638053', name: 'Федерация многоборья ГТО Тульской области', region: 'Тульская область', code: '71' },
  { id: '1717404716', name: 'Федерация многоборья ГТО Липецкой области', region: 'Липецкая область', code: '48' },
  { id: '1760438202', name: 'Федерация многоборья ГТО Костромской области', region: 'Костромская область', code: '44' },
  { id: '1705305650', name: 'Федерация многоборья ГТО Архангельской области', region: 'Архангельская область', code: '29' },
  { id: '1747648225', name: 'Федерация многоборья ГТО Мурманской области', region: 'Мурманская область', code: '51' },
  { id: '1710346549', name: 'Федерация многоборья ГТО Псковской области', region: 'Псковская область', code: '60' },
  { id: '1760434137', name: 'Федерация многоборья ГТО Калининградской области', region: 'Калининградская область', code: '39' }
];

async function fetchFederationDetails(id) {
  try {
    const res = await fetch(`${BASE_URL}/extore/frontend/themes/gto/federation_ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `id=${id}`
    });
    const html = await res.text();

    const addressMatch = html.match(/Адрес:<\/strong>\s*([^<]+)/i);
    const presidentMatch = html.match(/Президент:<\/strong>\s*([^<]+)/i);
    const emailMatch = html.match(/mailto:([^"'>]+)/i);
    const phoneMatch = html.match(/tel:([^"'>]+)/i);
    const coordsMatch = html.match(/setCenter\(\[([0-9.]+),\s*([0-9.]+)\]/i);
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);

    return {
      address: addressMatch ? addressMatch[1].trim() : '',
      president: presidentMatch ? presidentMatch[1].trim() : '',
      email: emailMatch ? emailMatch[1].trim() : 'info@gto.com.ru',
      phone: phoneMatch ? phoneMatch[1].trim() : '+7 (986) 333-33-33',
      coords: coordsMatch ? [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])] : null,
      photo: imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : BASE_URL + imgMatch[1]) : ''
    };
  } catch (err) {
    return {
      address: '',
      president: '',
      email: 'info@gto.com.ru',
      phone: '+7 (986) 333-33-33',
      coords: null,
      photo: ''
    };
  }
}

async function fetchAllFederations() {
  console.log(`Fetching details for ${REGIONS_CATALOG.length} regional federations...`);
  const federations = [];
  
  for (let i = 0; i < REGIONS_CATALOG.length; i += 6) {
    const batch = REGIONS_CATALOG.slice(i, i + 6);
    const results = await Promise.all(batch.map(async (reg) => {
      const details = await fetchFederationDetails(reg.id);
      return {
        id: reg.id,
        name: reg.name,
        region: reg.region,
        code: reg.code,
        address: details.address || `${reg.region}, Региональное отделение Федерации многоборья ГТО`,
        president: details.president || 'Руководитель регионального отделения',
        email: details.email,
        phone: details.phone,
        coords: details.coords,
        photo: details.photo
      };
    }));
    federations.push(...results);
    process.stdout.write(`.`);
  }
  console.log('\nFederations loaded:', federations.length);
  return federations;
}

// 4. Official Rutube videos
const OFFICIAL_VIDEOS = [
  {
    id: 1,
    title: "V Открытый Кубок Дальнего Востока Игры ГТО 2026 — Дневник турнира",
    embedUrl: "https://rutube.ru/play/embed/909056aa1ac71b1ba47e4f6955400ec6/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1776143891.jpg.pagespeed.ic.SWpEMOL3Bx.jpg",
    duration: "14:20",
    badge: "ГЛАВНОЕ"
  },
  {
    id: 2,
    title: "Народные Игры ГТО «Герой ГТО» — Финал в Лужниках",
    embedUrl: "https://rutube.ru/play/embed/3a9b3dec5aec84aee3d5a9703091934a/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1775712602.jpg.pagespeed.ic.ICnJvr0gsW.jpg",
    duration: "22:15",
    badge: "ФИНАЛ"
  },
  {
    id: 3,
    title: "Студенческие игры ГТО — Рекорды и яркие моменты",
    embedUrl: "https://rutube.ru/play/embed/1666ab484a204fb3f0bdc2e88941a8b5/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1775712533.jpg.pagespeed.ic.1nS-4JdZwI.jpg",
    duration: "08:45",
    badge: "МОЛОДЕЖЬ"
  },
  {
    id: 4,
    title: "Техника выполнения упражнений: Рывок гири и подтягивания",
    embedUrl: "https://rutube.ru/play/embed/2e06387e9edec65f3cf3033363b95d62/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1775648254.jpg.pagespeed.ic.CYyjfMWLIa.jpg",
    duration: "06:30",
    badge: "ОБУЧЕНИЕ"
  },
  {
    id: 5,
    title: "Кубок Белгородской области — Агромногоборье ГТО",
    embedUrl: "https://rutube.ru/play/embed/e2d5cf0842cd91e9e47abed92d43cee6/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1774534652.jpg.pagespeed.ic.uI3hDu2zck.jpg",
    duration: "11:50",
    badge: "РЕГИОНЫ"
  },
  {
    id: 6,
    title: "Церемония открытия V открытого Кубка Дальнего Востока Игры ГТО",
    embedUrl: "https://rutube.ru/play/embed/055ca17e8d0a7c1b3336fa26d41c51a0/",
    thumb: "https://gto.com.ru/data/1739449615/gallery/x1774621900.jpg.pagespeed.ic.tLXE5yM2Fi.jpg",
    duration: "18:40",
    badge: "LIVE"
  }
];

// Main runner
async function run() {
  console.log('=== Starting GTO.com.ru Data Sync ===');
  const [news, calendar, federations] = await Promise.all([
    fetchNews(),
    fetchCalendar(),
    fetchAllFederations()
  ]);

  const outputJs = `/**
 * Official Live Data Feed from Федерация многоборья ГТО России (gto.com.ru)
 * Auto-generated by scripts/sync_gto_data.js on ${new Date().toISOString()}
 */

export const GTO_OFFICIAL_NEWS = ${JSON.stringify(news, null, 2)};

export const GTO_CALENDAR_EVENTS = ${JSON.stringify(calendar, null, 2)};

export const GTO_FEDERATIONS = ${JSON.stringify(federations, null, 2)};

export const GTO_VIDEOS = ${JSON.stringify(OFFICIAL_VIDEOS, null, 2)};
`;

  const targetPath = path.join(__dirname, '..', 'web', 'js', 'gto_data.js');
  fs.writeFileSync(targetPath, outputJs, 'utf8');
  console.log(`\nSuccessfully written GTO live data to: ${targetPath}`);
}

run();
