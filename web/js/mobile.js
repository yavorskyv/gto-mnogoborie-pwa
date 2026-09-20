export let GTO_CALENDAR_EVENTS = [];
export let GTO_OFFICIAL_NEWS = [];
export let GTO_RECORDS = [];
export let GTO_VIDEOS = [];
export let GTO_FEDERATIONS = [];
export let GTO_FEDERATION_INFO = null;
export let HOME_SUMMARY = null;

// Dynamic CSS loader (v169)
const loadedScreenCss = new Set();
export function loadScreenCss(href) {
  if (loadedScreenCss.has(href)) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.querySelector(`link[href*="${href}"]`);
    if (existing) {
      loadedScreenCss.add(href);
      return resolve();
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => {
      loadedScreenCss.add(href);
      resolve();
    };
    link.onerror = () => {
      console.warn('Failed to load screen CSS:', href);
      resolve();
    };
    document.head.appendChild(link);
  });
}

import { getTournamentByAlbumId, getTournamentByVideoUrl, getTournamentMedia } from './tournament_media.js?v=173';
import { GTO_STAGES, getStageByAge, getNormsForStage, evaluateTest, getBadgeRequirements, MANDATORY_TEST_IDS, MANDATORY_GROUPS } from './gto_norms_data.js?v=173';
import { GTO_OVZ_CATEGORIES, getOvzNorms } from './gto_ovz_data.js?v=173';
import { GTO_AMBASSADORS } from './ambassadors_data.js?v=173';
import { GTO_FAQ_CATEGORIES, GTO_FAQ_ITEMS } from './faq_data.js?v=173';
import { EVSK_DISCIPLINES, EVSK_RANKS } from './evsk_norms_data.js?v=173';
import { GTO_STANDARDS } from './standards_data.js?v=173';
import { GtoTimer, soundEngine } from './audio_timer.js?v=173';
import { GTO_REGIONS, normalizeRegionName, getRegionById, buildRegionStats, DISTRICT_NAMES } from './regions_data.js?v=173';
import { getUnifiedRecords, getUnifiedNews, getUnifiedEvents, getUnifiedFederations, getUnifiedStandards, setSyncDataSources } from './ecosystem_sync.js?v=173';
import { fetchMasterAthlete, fetchEventParticipants } from './master_api.js?v=173';

// Lazy dataset loaders
let calendarPromise = null;
export async function loadCalendar() {
  if (GTO_CALENDAR_EVENTS.length > 0) return GTO_CALENDAR_EVENTS;
  if (!calendarPromise) {
    calendarPromise = fetch('./data/calendar.json?v=173')
      .then(res => res.json())
      .then(data => {
        GTO_CALENDAR_EVENTS = Array.isArray(data) ? data : [];
        if (typeof window !== 'undefined') window.__GTO_CALENDAR_EVENTS = GTO_CALENDAR_EVENTS;
        setSyncDataSources({ events: GTO_CALENDAR_EVENTS });
        indexTournamentSlugs();
        setupEventYears();
        setupEventFilters();
        setupResultsFilters();
        syncDatasetCounts();
        return GTO_CALENDAR_EVENTS;
      })
      .catch(err => {
        console.warn('Failed to load calendar.json, falling back to gto_data.js', err);
        return import('./gto_data.js?v=173').then(m => {
          GTO_CALENDAR_EVENTS = m.GTO_CALENDAR_EVENTS || [];
          if (typeof window !== 'undefined') window.__GTO_CALENDAR_EVENTS = GTO_CALENDAR_EVENTS;
          setSyncDataSources({ events: GTO_CALENDAR_EVENTS });
          indexTournamentSlugs();
          setupEventYears();
          setupEventFilters();
          setupResultsFilters();
          syncDatasetCounts();
          return GTO_CALENDAR_EVENTS;
        });
      });
  }
  return calendarPromise;
}

let newsPromise = null;
export async function loadNews() {
  if (GTO_OFFICIAL_NEWS.length > 0) return GTO_OFFICIAL_NEWS;
  if (!newsPromise) {
    newsPromise = fetch('./data/news.json?v=173')
      .then(res => res.json())
      .then(data => {
        GTO_OFFICIAL_NEWS = Array.isArray(data) ? data : [];
        if (typeof window !== 'undefined') window.__GTO_OFFICIAL_NEWS = GTO_OFFICIAL_NEWS;
        setSyncDataSources({ news: GTO_OFFICIAL_NEWS });
        setupNewsFilters();
        return GTO_OFFICIAL_NEWS;
      })
      .catch(err => {
        console.warn('Failed to load news.json, falling back to gto_data.js', err);
        return import('./gto_data.js?v=173').then(m => {
          GTO_OFFICIAL_NEWS = m.GTO_OFFICIAL_NEWS || [];
          if (typeof window !== 'undefined') window.__GTO_OFFICIAL_NEWS = GTO_OFFICIAL_NEWS;
          setSyncDataSources({ news: GTO_OFFICIAL_NEWS });
          setupNewsFilters();
          return GTO_OFFICIAL_NEWS;
        });
      });
  }
  return newsPromise;
}

let recordsPromise = null;
export async function loadRecords() {
  if (GTO_RECORDS.length > 0) return GTO_RECORDS;
  if (!recordsPromise) {
    recordsPromise = fetch('./data/records.json?v=173')
      .then(res => res.json())
      .then(data => {
        GTO_RECORDS = Array.isArray(data) ? data : [];
        if (typeof window !== 'undefined') window.__GTO_RECORDS = GTO_RECORDS;
        setSyncDataSources({ records: GTO_RECORDS });
        setupRecordFilters();
        return GTO_RECORDS;
      })
      .catch(err => {
        console.warn('Failed to load records.json, falling back to gto_data.js', err);
        return import('./gto_data.js?v=173').then(m => {
          GTO_RECORDS = m.GTO_RECORDS || [];
          if (typeof window !== 'undefined') window.__GTO_RECORDS = GTO_RECORDS;
          setSyncDataSources({ records: GTO_RECORDS });
          setupRecordFilters();
          return GTO_RECORDS;
        });
      });
  }
  return recordsPromise;
}

let videosPromise = null;
export async function loadVideos() {
  if (GTO_VIDEOS.length > 0) return GTO_VIDEOS;
  if (!videosPromise) {
    videosPromise = fetch('./data/videos.json?v=173')
      .then(res => res.json())
      .then(data => {
        GTO_VIDEOS = Array.isArray(data) ? data : [];
        if (typeof window !== 'undefined') window.__GTO_VIDEOS = GTO_VIDEOS;
        setSyncDataSources({ videos: GTO_VIDEOS });
        sortGtoVideos();
        syncDatasetCounts();
        return GTO_VIDEOS;
      })
      .catch(err => {
        console.warn('Failed to load videos.json, falling back to gto_data.js', err);
        return import('./gto_data.js?v=173').then(m => {
          GTO_VIDEOS = m.GTO_VIDEOS || [];
          if (typeof window !== 'undefined') window.__GTO_VIDEOS = GTO_VIDEOS;
          setSyncDataSources({ videos: GTO_VIDEOS });
          sortGtoVideos();
          syncDatasetCounts();
          return GTO_VIDEOS;
        });
      });
  }
  return videosPromise;
}

let federationsPromise = null;
export async function loadFederations() {
  if (GTO_FEDERATIONS.length > 0) return GTO_FEDERATIONS;
  if (!federationsPromise) {
    federationsPromise = fetch('./data/federations.json?v=173')
      .then(res => res.json())
      .then(data => {
        GTO_FEDERATIONS = data.federations || [];
        GTO_FEDERATION_INFO = data.info || null;
        if (typeof window !== 'undefined') {
          window.__GTO_FEDERATIONS = GTO_FEDERATIONS;
          window.__GTO_FEDERATION_INFO = GTO_FEDERATION_INFO;
        }
        setSyncDataSources({ federations: GTO_FEDERATIONS });
        syncDatasetCounts();
        return GTO_FEDERATIONS;
      })
      .catch(err => {
        console.warn('Failed to load federations.json, falling back to gto_data.js', err);
        return import('./gto_data.js?v=173').then(m => {
          GTO_FEDERATIONS = m.GTO_FEDERATIONS || [];
          GTO_FEDERATION_INFO = m.GTO_FEDERATION_INFO || null;
          if (typeof window !== 'undefined') {
            window.__GTO_FEDERATIONS = GTO_FEDERATIONS;
            window.__GTO_FEDERATION_INFO = GTO_FEDERATION_INFO;
          }
          setSyncDataSources({ federations: GTO_FEDERATIONS });
          syncDatasetCounts();
          return GTO_FEDERATIONS;
        });
      });
  }
  return federationsPromise;
}

let homeSummaryPromise = null;
export async function loadHomeSummary() {
  if (HOME_SUMMARY) return HOME_SUMMARY;
  if (!homeSummaryPromise) {
    homeSummaryPromise = fetch('./data/home_summary.json?v=173')
      .then(res => res.json())
      .then(data => {
        HOME_SUMMARY = data;
        syncDatasetCounts();
        return HOME_SUMMARY;
      })
      .catch(err => {
        console.warn('Failed to load home_summary.json', err);
        return null;
      });
  }
  return homeSummaryPromise;
}

let _resultsManifestPromise = null;
export async function loadResultsManifest() {
  if (state.resultsManifest) return state.resultsManifest;
  if (!_resultsManifestPromise) {
    _resultsManifestPromise = fetch('./data/results/manifest.json?v=173')
      .then(r => r.json())
      .then(m => {
        state.resultsManifest = m;
        return m;
      })
      .catch(err => {
        console.warn('Failed to load results manifest:', err);
        return { events: {} };
      });
  }
  return _resultsManifestPromise;
}

export async function ensureScreenData(screen) {
  switch (screen) {
    case 'home':
      await loadHomeSummary();
      break;
    case 'events':
    case 'event':
      await loadCalendar();
      break;
    case 'results':
      await Promise.all([loadCalendar(), loadResultsManifest()]);
      break;
    case 'news':
    case 'article':
      await Promise.all([loadNews(), loadCalendar()]);
      break;
    case 'records':
    case 'record':
      await loadRecords();
      break;
    case 'media':
      await Promise.all([loadVideos(), loadCalendar()]);
      break;
    case 'regions':
    case 'region':
      await Promise.all([loadFederations(), loadCalendar(), loadRecords()]);
      break;
    case 'athlete-search':
    case 'athlete':
      await loadCalendar();
      break;
  }
}



// Ленивая подгрузка фотобазы VK (2.3 МБ) по требованию (v169)
export let GTO_VK_ALBUMS = [];
let _vkAlbumsPromise = null;
export async function getVkAlbums() {
  if (!_vkAlbumsPromise) {
    _vkAlbumsPromise = import('./vk_albums_data.js?v=173')
      .then(m => {
        GTO_VK_ALBUMS = m.GTO_VK_ALBUMS || [];
        return GTO_VK_ALBUMS;
      })
      .catch(err => {
        console.warn('Failed to load vk_albums_data:', err);
        return [];
      });
  }
  return _vkAlbumsPromise;
}

// Ленивая подгрузка модуля «Герой ГТО» (369 КБ) (v169)
let _heroModulePromise = null;
export async function getHeroModule() {
  if (!_heroModulePromise) {
    _heroModulePromise = import('./herogto_module.js?v=173');
  }
  return _heroModulePromise;
}
export async function initHeroGtoScreen(...args) {
  const m = await getHeroModule();
  return m.initHeroGtoScreen(...args);
}
export async function initHeroHubScreen(...args) {
  const m = await getHeroModule();
  return m.initHeroHubScreen(...args);
}
export async function setHeroActiveTournament(...args) {
  const m = await getHeroModule();
  return m.setHeroActiveTournament(...args);
}
export async function renderPassportScreen(...args) {
  const m = await getHeroModule();
  return m.renderPassportScreen(...args);
}
export async function setActiveHeroTab(...args) {
  const m = await getHeroModule();
  return m.setActiveHeroTab(...args);
}

// Lazy-loaded modules for code-splitting (v169)
const CameraState = { IDLE: 'IDLE', STARTING: 'STARTING', RECORDING: 'RECORDING', PAUSED: 'PAUSED', FINISHED: 'FINISHED', PREVIEW: 'PREVIEW' };
const TimerState = { IDLE: 'IDLE', RUNNING: 'RUNNING', PAUSED: 'PAUSED', FINISHED: 'FINISHED' };
let GtoCameraRecorder = null;
let cameraModulePromise = null;
export async function ensureCameraModule() {
  if (GtoCameraRecorder) return GtoCameraRecorder;
  if (!cameraModulePromise) {
    cameraModulePromise = import('./camera_timer.js?v=173')
      .then(m => {
        GtoCameraRecorder = m.GtoCameraRecorder;
        return GtoCameraRecorder;
      })
      .catch(err => {
        console.warn('Failed to load camera_timer.js:', err);
        return null;
      });
  }
  return cameraModulePromise;
}

let adminModulePromise = null;
export function getAdminModule() {
  if (!adminModulePromise) adminModulePromise = import('./admin_module.js?v=173');
  return adminModulePromise;
}

function getVideoDateScore(v) {
  let dateStr = '';
  if (v.thumb) {
    const m = v.thumb.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) dateStr = m[1];
  }
  if (!dateStr) {
    dateStr = (v.year || 2020) + '-01-01';
  }
  return dateStr;
}

export let SORTED_GTO_VIDEOS = [];
export function sortGtoVideos() {
  SORTED_GTO_VIDEOS = [...GTO_VIDEOS].sort((a, b) => {
    const da = getVideoDateScore(a);
    const db = getVideoDateScore(b);
    if (da !== db) return db.localeCompare(da);
    const dayA = Number((a.title.match(/день\s*(\d+)/i) || [])[1] || 0);
    const dayB = Number((b.title.match(/день\s*(\d+)/i) || [])[1] || 0);
    if (dayA !== dayB) return dayB - dayA;
    return Number(b.id) - Number(a.id);
  });
}

const state = {
  screen: (() => {
    let s = (location.hash || '').slice(1).split('?')[0].split('/')[0] || 'home';
    if (s === 'herogto' || s === 'hero-gto') s = 'hero';
    return s;
  })(),
  eventYear: 'all',
  eventStatus: 'all',
  eventFormat: 'all',
  eventProgram: 'all',
  eventCity: 'all',
  eventType: 'all',
  eventQuery: '',
  newsQuery: '',
  newsYear: 'all',
  newsType: 'all',
  newsEvent: 'all',
  recordQuery: '',
  recordLimit: 30,
  sex: 'ALL',
  age: 'all',
  discipline: 'all',
  group: 'discipline',
  media: 'video',
  mediaLinkFilter: 'all',
  videoPlatform: 'all',
  mediaYear: 'all',
  mediaQuery: '',
  videoLimit: 24,
  albumLimit: 24,
  activeMediaVideo: null,
  eventResultQuery: '',
  eventResultCategory: 'all',
  eventResultSex: 'all',
  eventResultAge: 'all',
  eventResultComplex: 'all',
  eventResultStanding: 'all',
  eventResultPrintAll: false,
  currentEventResults: null,
  currentEventId: null,
  currentEventMediaHtml: '',
  regionQuery: '',
  districtQuery: 'all',
  mapMode: 'athletes',
  selectedRegionId: null,
  currentRegionId: null,
  regionStats: null,
  regionSummary: null,
  mapZoom: 1,
  mapPanX: 0,
  mapPanY: 0,
  mapSvgLoaded: false,
  eventManifest: { events: {} },
  vkLocal: { albums: {} },
  videoThumbs: {},
  gallery: null,
  // Calculator & Athlete Search
  calcAge: 25,
  calcSex: 'M',
  calcValues: {},
  calcSelectedAlt: {
    speed: 'run_short',
    endurance: 'run_long',
    strength: 'pull_up',
    flexibility: 'lean'
  },
  calcMode: 'general', // 'general' | 'ovz'
  calcOvzCategory: 'hearing', // 'hearing' | 'vision' | 'poda_limb' | 'poda_wheelchair' | 'cp' | 'intellect'
  faqCategory: 'all',
  faqQuery: '',
  faqExpanded: new Set(),
  athleteQuery: '',
  athleteIndex: null,
  athleteLoading: false,
  deferredPrompt: null,
  shareData: null,
  // Standards & Timer
  standardCat: 'all',
  // Scroll restoration
  eventsScrollTop: 0,
  lastEventId: null,
  // Navigation return state
  athleteReturnScreen: null,
  athleteReturnEventId: null,
  athleteReturnPane: null,
  selectedAthleteId: null,
  selectedAthlete: null,
  athleteProfileReturnScreen: 'athlete-search',
  selectedRecordId: null,
  selectedRecord: null,
  recordReturnScreen: 'records',
  _lastOverallBadge: 'none'
};

// Restore calculator state from localStorage (A2)
try {
  const savedCalc = JSON.parse(localStorage.getItem('gto_calc_v1') || 'null');
  if (savedCalc && typeof savedCalc === 'object') {
    if (typeof savedCalc.age === 'number' && savedCalc.age >= 6 && savedCalc.age <= 85) state.calcAge = savedCalc.age;
    if (savedCalc.sex === 'M' || savedCalc.sex === 'W') state.calcSex = savedCalc.sex;
    if (savedCalc.mode === 'general' || savedCalc.mode === 'ovz') state.calcMode = savedCalc.mode;
    if (savedCalc.ovzCategory) state.calcOvzCategory = savedCalc.ovzCategory;
    if (savedCalc.values && typeof savedCalc.values === 'object') state.calcValues = savedCalc.values;
    if (savedCalc.selectedAlt && typeof savedCalc.selectedAlt === 'object') {
      state.calcSelectedAlt = Object.assign(state.calcSelectedAlt, savedCalc.selectedAlt);
    }
  }
} catch (e) {}

export function saveCalculatorState() {
  try {
    localStorage.setItem('gto_calc_v1', JSON.stringify({
      age: state.calcAge,
      sex: state.calcSex,
      mode: state.calcMode,
      ovzCategory: state.calcOvzCategory,
      values: state.calcValues,
      selectedAlt: state.calcSelectedAlt
    }));
  } catch (e) {}
}

const valid = new Set([
  'home', 'events', 'event', 'results', 'news', 'article', 'media', 'records', 'record', 'more',
  'about', 'history', 'disciplines', 'structure', 'documents', 'antidoping',
  'regions', 'region', 'calculator', 'athlete-search', 'athlete', 'timer', 'standards', 'hero', 'herohub', 'passport', 'admin',
  'path', 'ambassadors', 'faq'
]);

export function getTournamentTitleClass(title) {
  const len = (title || '').trim().length;
  if (len > 45) return 'title-extra-long is-long-title';
  if (len >= 28) return 'title-long is-long-title';
  return 'title-normal';
}

export const TOURNAMENT_BY_SLUG = {};
export function indexTournamentSlugs() {
  GTO_CALENDAR_EVENTS.forEach(ev => {
    if (ev.id) {
      TOURNAMENT_BY_SLUG[ev.id] = ev;
      TOURNAMENT_BY_SLUG[String(ev.id)] = ev;
      TOURNAMENT_BY_SLUG[`EVT-${String(ev.id).padStart(4, '0')}`] = ev;
    }
    const slug = (ev.url || '').replace(/.*\/sorevnovaniya\/?/, '').replace(/\/$/, '');
    if (slug) TOURNAMENT_BY_SLUG[slug] = ev;
    if (ev.slug) TOURNAMENT_BY_SLUG[ev.slug] = ev;
  });
}

function findTournamentForCompetition(c) {
  if (!c) return null;
  if (c.event_id && TOURNAMENT_BY_SLUG[c.event_id]) return TOURNAMENT_BY_SLUG[c.event_id];
  if (c.id && TOURNAMENT_BY_SLUG[c.id]) return TOURNAMENT_BY_SLUG[c.id];
  if (c.tournament_slug && TOURNAMENT_BY_SLUG[c.tournament_slug]) return TOURNAMENT_BY_SLUG[c.tournament_slug];

  const rawSlug = (c.tournament_slug || '').toLowerCase();
  const rawTitle = (c.tournament_title || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');

  return GTO_CALENDAR_EVENTS.find(ev => {
    if (rawSlug && (ev.url || '').toLowerCase().includes(rawSlug)) return true;
    if (rawSlug && ev.slug && ev.slug.toLowerCase() === rawSlug) return true;
    if (rawTitle) {
      const evT = (ev.title || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
      if (evT && (evT.includes(rawTitle) || rawTitle.includes(evT))) return true;
    }
    return false;
  }) || null;
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clean = v => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const esc = v => clean(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeUrl = v => /^https?:\/\//.test(v || '') ? esc(v) : '#';
const safeImage = v => v && !String(v).startsWith('http') ? esc(v) : (/^https:\/\//.test(v || '') ? esc(v) : './assets/logo-clean.png');
window.__imageFallback = e => { e.currentTarget.src = './assets/logo-clean.png'; e.currentTarget.onerror = null; };

let userActive = false;
addEventListener('pointerdown', e => {
  userActive = true;
  console.log('CLICK TARGET:', e.target);
}, { capture: true });

try {
  addEventListener('load', () => {
    setTimeout(() => {
      try {
        console.log(
          'CENTER ELEMENT:',
          document.elementsFromPoint(
            window.innerWidth / 2,
            window.innerHeight / 2
          )
        );
      } catch (_) {}
    }, 500);
  });
} catch (_) {}
const haptic = (ms = 10) => {
  try {
    if (userActive && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch (_) {}
};

const svgIcon = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

function disciplineIcon(d) {
  const s = (d || '').toLowerCase();
  if (/лыж/.test(s)) return svgIcon('<circle cx="12" cy="4" r="2"/><path d="M12 6v6l4 2M8 22l6-10M4 18l4-4"/>');
  if (/кросс/.test(s)) return svgIcon('<path d="M4 19l4-4 4 2 4-5 4 3"/><circle cx="8" cy="7" r="2"/>');
  if (/снаряд|метани/.test(s)) return svgIcon('<circle cx="6" cy="18" r="2"/><path d="M7 16l8-8M17 6l4-2-2 4M13 10l3 3"/>');
  if (/бег|спринт|челнок|дистанц/.test(s)) return svgIcon('<circle cx="14" cy="4.5" r="1.7"/><path d="M5 20l3-4 2.5-1.6L9 9 5.5 12"/><path d="M10.5 14.4 14 16l1.8 4"/><path d="M10 9l4-1.2 2 2.6 3 .8"/>');
  if (/подтяг|перекладин/.test(s)) return svgIcon('<path d="M4 5h16"/><path d="M8 5v3a4 4 0 0 0 8 0V5"/><circle cx="12" cy="12.5" r="1.6"/><path d="M12 14v5"/>');
  if (/гир|рывок/.test(s)) return svgIcon('<path d="M9.3 7.2a2.7 2.7 0 0 1 5.4 0"/><path d="M7.4 8h9.2l1 8.2A2 2 0 0 1 14.6 18.5H9.4a2 2 0 0 1-2-2.3z"/>');
  if (/отжим/.test(s)) return svgIcon('<circle cx="5.5" cy="9" r="1.6"/><path d="M4 15h11l4.5-2M8 13l1-3 4 1"/>');
  if (/прыж|длин/.test(s)) return svgIcon('<circle cx="13" cy="5" r="1.6"/><path d="M5 19l4-3 2-4 3 2 4-1M11 12 9 9"/>');
  if (/наклон|гибк/.test(s)) return svgIcon('<circle cx="12" cy="4.5" r="1.6"/><path d="M12 6.5v5l3 6M12 11.5l-3 6M8.5 9h7"/>');
  if (/пресс|туловищ|поднимани/.test(s)) return svgIcon('<circle cx="7" cy="8" r="1.6"/><path d="M4 18l5-2 3-6 4 8M9 16h9"/>');
  if (/плаван/.test(s)) return svgIcon('<circle cx="8" cy="7.5" r="1.7"/><path d="M4 16c2-1.2 3 .8 5 0s3-.8 5 0 3 .8 5 0M6.5 14l4-3 3 1.2"/>');
  if (/стрель|мет/.test(s)) return svgIcon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>');
  return svgIcon('<circle cx="12" cy="14" r="5.5"/><path d="M8.5 3.5 12 9l3.5-5.5M12 11.8v4.4M10 14h4"/>');
}

const regionInitials = r => ((String(r || '').replace(/[«»"().]/g, '').split(/[\s-]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2)) || 'ГТ').toUpperCase();
const REGION_COAT = {"Россия (Центральный аппарат)":"1705658866","Москва":"1704977561","Московская область":"1705326009","Санкт-Петербург":"1705329839","Ленинградская область":"1729165316","Приморский край":"1705327997","Хабаровский край":"1705331443","Амурская область":"1705304782","Камчатский край":"1705307049","Сахалинская область":"1705329985","Забайкальский край":"1705306639","Республика Саха (Якутия)":"1705328972","Чукотский АО":"1727254924","Еврейская АО":"1747223619","Красноярский край":"1706595605","Кемеровская область — Кузбасс":"1705307383","Новосибирская область":"1717403711","Омская область":"1705326837","Томская область":"1705330768","Алтайский край":"1734942675","Тюменская область":"1705330911","ХМАО — Югра":"1705331574","Челябинская область":"1705331718","Курганская область":"1705325500","Пермский край":"1705327769","Республика Башкортостан":"1705328228","Удмуртская Республика":"1705331063","Ульяновская область":"1705331310","Пензенская область":"1705327220","Оренбургская область":"1734513099","Нижегородская область":"1760439708","Краснодарский край":"1705325313","Ставропольский край":"1705330607","Ростовская область":"1705329146","Волгоградская область":"1705305861","Республика Крым":"1705328776","Севастополь":"1705330438","Республика Ингушетия":"1705328553","Белгородская область":"1710347051","Воронежская область":"1704811639","Брянская область":"1734513572","Смоленская область":"1747822115","Тульская область":"1737638053","Липецкая область":"1717404716","Костромская область":"1760438202","Архангельская область":"1705305650","Мурманская область":"1747648225","Псковская область":"1710346549","Калининградская область":"1760434137"};
const regionCoat = region => REGION_COAT[region] ? `./assets/coats/${REGION_COAT[region]}.png` : '';
const regionLogo = (region, photo) => {
  const coat = regionCoat(region);
  if (coat) return `<span class="region-emblem region-coat"><img loading="lazy" src="${coat}" alt="Герб: ${esc(region)}" onerror="window.__imageFallback(event)"></span>`;
  if (photo) return `<img loading="lazy" referrerpolicy="no-referrer" src="${safeImage(photo)}" alt="" onerror="window.__imageFallback(event)">`;
  return `<span class="region-emblem region-logo"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 41 8.5v13.5c0 10.2-7.2 16.4-17 21.5-9.8-5.1-17-11.3-17-21.5V8.5z" fill="#13253d" stroke="#3979a6" stroke-width="1.6"/><path d="M24 3 41 8.5V15H7V8.5z" fill="#d0272e"/><text x="24" y="26.5" text-anchor="middle" font-family="Unbounded,sans-serif" font-weight="800" font-size="11.5" fill="#fff">ГТО</text><text x="24" y="38" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="9" fill="#8fb4ff">${esc(regionInitials(region))}</text></svg></span>`;
};
const realPresident = p => p && !/руководитель\s+регион/i.test(p) ? p : '';
export const formatPhone = phone => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return String(phone);
};

// ==========================================================
// v85 — CENTRAL DETERMINISTIC NAVIGATION ARCHITECTURE
// ==========================================================
export const appNavigationStack = [];

export const scrollStore = new Map();

export function getRouteKey(screen, params = {}) {
  if (params && params.id) {
    return `${screen}/${params.id}`;
  }
  return screen;
}

export function currentRoute() {
  return appNavigationStack.length
    ? appNavigationStack[appNavigationStack.length - 1]
    : { screen: state.screen || 'home', params: {}, scrollY: 0 };
}

export function saveCurrentScroll() {
  const top = currentRoute();
  if (!top || !top.screen) return 0;
  const key = getRouteKey(top.screen, top.params);
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  scrollStore.set(key, y);
  top.scrollY = y;
  return y;
}

export function resetScrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const app = $('#app');
  if (app) app.scrollTop = 0;
  const containers = [
    '#region-detail',
    '#athlete-profile-detail',
    '#record-detail-container',
    '#event-detail',
    '.region-page-container',
    '.athlete-profile-container',
    '.record-detail-page'
  ];
  containers.forEach(sel => {
    const el = $(sel);
    if (el) el.scrollTop = 0;
  });
  $$('.screen').forEach(s => { s.scrollTop = 0; });
}

export function pushRoute(route) {
  if (!route || !route.screen) return;
  // Always save current scroll before pushing forward
  saveCurrentScroll();

  const top = currentRoute();
  if (top.screen === route.screen && JSON.stringify(top.params || {}) === JSON.stringify(route.params || {})) {
    return;
  }

  if (top.screen === 'event') {
    const activeTab = $('.detail-tabs button.active');
    top.params = top.params || {};
    top.params.pane = activeTab ? activeTab.dataset.pane : (state.lastEventPane || 'about');
    top.params.filters = {
      query: state.eventResultQuery,
      category: state.eventResultCategory,
      sex: state.eventResultSex,
      age: state.eventResultAge,
      complex: state.eventResultComplex,
      standing: state.eventResultStanding,
      groupBy: state.eventResultGroupBy
    };
  }

  const rootScreens = ['home', 'events', 'news', 'media', 'records', 'more', 'regions'];
  if (rootScreens.includes(route.screen) && (!route.params || Object.keys(route.params).length === 0)) {
    appNavigationStack.length = 0;
  }
  appNavigationStack.push({ screen: route.screen, params: { ...route.params }, scrollY: 0 });
  console.log('[NAV:PUSH]', { to: route.screen, params: route.params, stack: appNavigationStack.map(r => `${r.screen}${r.params?.id ? '/' + r.params.id : ''}`) });
}

export function popRoute() {
  if (appNavigationStack.length > 1) {
    const popped = appNavigationStack.pop();
    const prev = appNavigationStack[appNavigationStack.length - 1];
    console.log('[NAV:POP]', { from: popped.screen, to: prev.screen, stack: appNavigationStack.map(r => `${r.screen}${r.params?.id ? '/' + r.params.id : ''}`) });
    return prev;
  }
  return null;
}

export function restoreScrollPosition(restoreScrollY) {
  if (typeof restoreScrollY !== 'number' || restoreScrollY < 0) return;
  const doRestore = () => {
    window.scrollTo({ top: restoreScrollY, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = restoreScrollY;
    document.body.scrollTop = restoreScrollY;
  };
  requestAnimationFrame(() => {
    doRestore();
    setTimeout(doRestore, 40);
    setTimeout(doRestore, 120);
    setTimeout(doRestore, 260);
  });
}

export function navigateBack() {
  haptic(10);
  // Pop current screen from stack
  const current = appNavigationStack.pop();
  if (current) {
    const curKey = getRouteKey(current.screen, current.params);
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    scrollStore.set(curKey, y);
  }

  const prev = appNavigationStack.length ? appNavigationStack[appNavigationStack.length - 1] : null;
  let restoreScrollY = (prev && typeof prev.scrollY === 'number') ? prev.scrollY : null;
  if (prev && restoreScrollY === null) {
    const prevKey = getRouteKey(prev.screen, prev.params);
    restoreScrollY = scrollStore.get(prevKey) ?? null;
  }

  if (prev) {
    console.log('[NAV:BACK_TO_STACK]', prev, 'restoreScrollY:', restoreScrollY);
    if (prev.screen === 'athlete' && prev.params?.id) openAthleteProfile(prev.params.id, false, restoreScrollY);
    else if (prev.screen === 'record' && prev.params?.id) openRecordDetail(prev.params.id, false, restoreScrollY);
    else if (prev.screen === 'region' && prev.params?.id) openRegion(prev.params.id, false, restoreScrollY);
    else if (prev.screen === 'event' && prev.params?.id) {
      if (prev.params?.filters) {
        state.eventResultQuery = prev.params.filters.query || '';
        state.eventResultCategory = prev.params.filters.category || 'all';
        state.eventResultSex = prev.params.filters.sex || 'all';
        state.eventResultAge = prev.params.filters.age || 'all';
        state.eventResultComplex = prev.params.filters.complex || 'all';
        state.eventResultStanding = prev.params.filters.standing || 'all';
        state.eventResultGroupBy = prev.params.filters.groupBy || 'category';
      }
      openEvent(prev.params.id, prev.params?.pane || 'about', false, restoreScrollY);
    }
    else if (prev.screen === 'article' && prev.params?.id) openArticle(prev.params.id, false, restoreScrollY);
    else go(prev.screen, false, restoreScrollY);
    return;
  }

  // Fallback when accessed directly without history stack
  console.log('[NAV:BACK_FALLBACK]', state.screen, state.athleteProfileReturnScreen);
  if (state.screen === 'athlete') {
    const ret = state.athleteProfileReturnScreen || 'athlete-search';
    if (ret === 'record' && state.selectedRecordId) {
      openRecordDetail(state.selectedRecordId, false);
    } else if (ret === 'region' && state.currentRegionId) {
      openRegion(state.currentRegionId, false);
    } else if (ret === 'event' && state.athleteReturnEventId) {
      openEvent(state.athleteReturnEventId, state.athleteReturnPane || 'results', false);
    } else if (ret === 'records') {
      go('records', false);
    } else {
      go('athlete-search', false);
    }
    return;
  }

  if (state.screen === 'record') {
    const ret = state.recordReturnScreen || 'records';
    if (ret === 'region' && state.currentRegionId) {
      openRegion(state.currentRegionId, false);
    } else if (ret === 'athlete' && state.selectedAthleteId) {
      openAthleteProfile(state.selectedAthleteId, false);
    } else if (ret === 'event' && state.athleteReturnEventId) {
      openEvent(state.athleteReturnEventId, state.athleteReturnPane || 'results', false);
    } else {
      go('records', false);
    }
    return;
  }

  if (state.screen === 'region') {
    if (state.regionReturnScreen === 'event' && state.currentEventId) {
      openEvent(state.currentEventId, state.currentEventPane || 'results', false);
    } else {
      go('regions', false);
    }
    return;
  }

  if (state.screen === 'event') {
    go('events', false);
    return;
  }

  if (state.screen === 'article') {
    go('news', false);
    return;
  }

  if (state.screen === 'athlete-search') {
    if (state.athleteReturnScreen === 'event' && state.athleteReturnEventId) {
      openEvent(state.athleteReturnEventId, state.athleteReturnPane || 'results', false);
    } else {
      go('events', false);
    }
    return;
  }

  if (state.screen === 'calculator' || state.screen === 'timer' || state.screen === 'standards') {
    go('home', false);
    return;
  }

  go('home', false);
}

export function openMobileDrawer() {
  const drawer = $('#mobile-nav-drawer');
  const backdrop = $('#mobile-nav-backdrop');
  const toggleBtn = $('#mobile-menu-toggle');
  if (!drawer || !backdrop) return;
  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.classList.add('nav-drawer-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  });
}

export function closeMobileDrawer() {
  const drawer = $('#mobile-nav-drawer');
  const backdrop = $('#mobile-nav-backdrop');
  const toggleBtn = $('#mobile-menu-toggle');
  if (!drawer || !backdrop) return;
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.body.classList.remove('nav-drawer-open');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!drawer.classList.contains('is-open')) {
      drawer.hidden = true;
      backdrop.hidden = true;
    }
  }, 320);
}

function go(screen, push = true, restoreScrollY = null) {
  if (screen === 'herogto' || screen === 'hero-gto') screen = 'hero';
  if (!valid.has(screen)) screen = 'home';
  if (screen === 'region' && !($('#region-detail') && $('#region-detail').innerHTML.trim())) screen = 'regions';
  state.screen = screen;
if (typeof window !== 'undefined') window.go = go;
  haptic(10);
  if (push) {
    pushRoute({ screen, params: {} });
  }

  // --- Smooth screen transition ---
  const prevActive = $('.screen.active');
  const nextScreen = $(`.screen[data-screen="${screen}"]`);
  if (prevActive && nextScreen && prevActive !== nextScreen) {
    prevActive.classList.add('screen-leaving');
    prevActive.classList.remove('active');
    setTimeout(() => prevActive.classList.remove('screen-leaving'), 180);
    nextScreen.classList.add('screen-entering');
    nextScreen.classList.add('active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => nextScreen.classList.remove('screen-entering'));
    });
  } else {
    $$('.screen').forEach(x => x.classList.toggle('active', x.dataset.screen === screen));
  }
  const mobileSection = screen === 'event' ? 'events'
    : screen === 'article' ? 'news'
    : (screen === 'record' ? 'records' : screen);
  $$('.bottom-nav button').forEach(x => {
    const active = x.dataset.go === mobileSection;
    x.classList.toggle('active', active);
    if (active) x.setAttribute('aria-current', 'page');
    else x.removeAttribute('aria-current');
  });
  const desktopSection = screen === 'event' ? 'events'
    : screen === 'results' ? 'results'
    : screen === 'article' ? 'news'
    : screen === 'region' ? 'regions'
    : screen === 'record' ? 'records'
    : ['about', 'history', 'disciplines', 'structure', 'documents', 'antidoping', 'more', 'path', 'ambassadors'].includes(screen) ? 'more'
    : screen;
  const toolScreens = ['calculator', 'athlete-search', 'timer', 'standards', 'faq'];
  const isToolActive = toolScreens.includes(desktopSection);
  const toolsBtn = $('#tools-dropdown-btn') || $('#services-dropdown-btn');
  if (toolsBtn) {
    toolsBtn.classList.toggle('active', isToolActive);
  }
  $$('.desktop-main-nav [data-go]').forEach(x => {
    const active = x.dataset.go === desktopSection;
    x.classList.toggle('active', active);
    if (active) x.setAttribute('aria-current', 'page');
    else x.removeAttribute('aria-current');
  });
  $$('#mobile-nav-drawer [data-go]').forEach(x => {
    const active = x.dataset.go === screen ||
      (screen === 'event' && x.dataset.go === 'events') ||
      (screen === 'record' && x.dataset.go === 'records') ||
      (screen === 'article' && x.dataset.go === 'news') ||
      (screen === 'region' && x.dataset.go === 'regions') ||
      (['about', 'history', 'disciplines', 'structure', 'documents', 'antidoping', 'path', 'ambassadors'].includes(screen) && x.dataset.go === 'more');
    x.classList.toggle('active', active);
  });
  const isSub = ['event', 'article', 'region', 'record', 'calculator', 'timer', 'standards', 'athlete-search', 'athlete', 'about', 'history', 'disciplines', 'structure', 'documents', 'antidoping', 'hero', 'herohub', 'passport', 'path', 'ambassadors', 'faq'].includes(screen);
  const headerBack = $('#header-back-btn');
  if (headerBack) {
    headerBack.hidden = !isSub;
    if (isSub) {
      const label = screen === 'event' ? 'Старты'
        : screen === 'article' ? 'Новости'
        : screen === 'region' ? 'Регионы'
        : screen === 'hero' ? 'Главная'
        : screen === 'herohub' ? 'Главная'
        : screen === 'passport' ? 'Кабинет'
        : screen === 'path' ? 'Главная'
        : screen === 'ambassadors' ? 'Ещё'
        : screen === 'faq' ? 'Ещё'
        : screen === 'record' ? (state.recordReturnScreen === 'region' ? 'Регион' : state.recordReturnScreen === 'athlete' ? 'Атлет' : 'Рекорды')
        : screen === 'athlete' ? (state.athleteProfileReturnScreen === 'record' ? 'Рекорд' : state.athleteProfileReturnScreen === 'records' ? 'Рекорды' : state.athleteProfileReturnScreen === 'event' ? 'Турнир' : state.athleteProfileReturnScreen === 'region' ? 'Регион' : 'Атлеты')
        : screen === 'athlete-search' ? 'Назад'
        : 'Назад';
      const span = headerBack.querySelector('span');
      if (span) span.textContent = label;
    }
  }
  const hashTarget = (screen === 'athlete' && state.selectedAthleteId) ? `#athlete/${state.selectedAthleteId}`
    : (screen === 'record' && state.selectedRecordId) ? `#record/${state.selectedRecordId}`
    : (screen === 'passport' && location.hash.includes('?')) ? location.hash
    : `#${screen}`;
  if (push && location.hash !== hashTarget) history.pushState({ screen, athleteId: state.selectedAthleteId, recordId: state.selectedRecordId }, '', hashTarget);
  else if (!push && location.hash !== hashTarget) history.replaceState({ screen, athleteId: state.selectedAthleteId, recordId: state.selectedRecordId }, '', hashTarget);
  if (push) {
    resetScrollToTop();
  } else if (typeof restoreScrollY === 'number') {
    restoreScrollPosition(restoreScrollY);
  } else if (scrollStore.has(screen)) {
    restoreScrollPosition(scrollStore.get(screen));
  } else if (screen === 'events' && (state.eventsScrollTop > 0 || state.lastEventId)) {
    const restoreY = state.eventsScrollTop;
    const targetId = state.lastEventId;
    const doRestore = () => {
      if (targetId) {
        const card = $(`[data-event="${targetId}"]`);
        if (card) {
          card.scrollIntoView({ block: 'center', inline: 'nearest' });
          return;
        }
      }
      if (restoreY > 0) {
        window.scrollTo({ top: restoreY, behavior: 'instant' });
      }
    };
    requestAnimationFrame(() => {
      doRestore();
      setTimeout(doRestore, 40);
    });
  }
  $('#app').focus({ preventScroll: true });
  
  if (['herohub', 'hero', 'passport'].includes(screen)) {
    loadScreenCss('./css/herogto.css?v=173');
  } else if (screen === 'admin') {
    loadScreenCss('./css/admin.css?v=173');
  }
  const dataPromise = ensureScreenData(screen).then(() => {
    if (screen === 'events') { setupEventYears(); setupEventFilters(); renderEvents(); }
    else if (screen === 'news') { setupNewsFilters(); renderNews(); }
    else if (screen === 'records') { setupRecordFilters(); renderRecords(); }
    else if (screen === 'media') { renderMedia(); }
    else if (screen === 'results') { setupResultsFilters(); renderResultsScreen(); }
    else if (screen === 'regions') { renderRegions(); }
  });

  if (screen === 'calculator') renderCalculator();

  if (screen === 'athlete-search') {
    const backBtn = $('#athlete-search-back');
    if (backBtn) {
      if (state.athleteReturnScreen === 'event' && state.athleteReturnEventId) {
        backBtn.textContent = '← Назад к турниру';
        backBtn.dataset.returnEvent = String(state.athleteReturnEventId);
        backBtn.dataset.returnPane = state.athleteReturnPane || 'results';
      } else {
        backBtn.textContent = '← Старты';
        delete backBtn.dataset.returnEvent;
        delete backBtn.dataset.returnPane;
      }
    }
    renderAthleteSearch();
  }
  if (screen === 'athlete') {
    const backBtn = $('#athlete-detail-back');
    if (backBtn) {
      const ret = state.athleteProfileReturnScreen || 'athlete-search';
      if (ret === 'records') backBtn.textContent = '← Рекорды России';
      else if (ret === 'event' && state.athleteReturnEventId) backBtn.textContent = '← Назад к турниру';
      else backBtn.textContent = '← К поиску атлетов';
    }
    if (state.selectedAthlete) {
      renderAthleteProfileScreen(state.selectedAthlete);
    } else if (state.selectedAthleteId) {
      openAthleteProfile(state.selectedAthleteId, false);
    }
  }
  if (screen !== 'timer' && typeof cameraRecorderInstance !== 'undefined' && cameraRecorderInstance) {
    cameraRecorderInstance.stopCamera();
  }
  if (screen === 'timer') renderTimer();
  if (screen === 'standards') renderStandards();
  if (screen === 'path') renderAthletePath();
  if (screen === 'ambassadors') renderAmbassadors();
  if (screen === 'faq') renderFaq();
  if (screen === 'about') renderAbout();
  if (screen === 'history') renderHistory();
  if (screen === 'disciplines') renderDisciplines();
  if (screen === 'structure') renderStructure();
  if (screen === 'documents') renderDocuments();
  if (screen === 'antidoping') renderAntidoping();
  if (screen === 'hero') initHeroGtoScreen();
  if (screen === 'herohub') initHeroHubScreen();
  if (screen === 'passport') renderPassportScreen();
  if (screen === 'admin') {
    const matchTab = (location.hash || '').match(/tab=([a-z0-9_-]+)/i);
    if (matchTab && matchTab[1]) {
      try {
        const raw = localStorage.getItem('gto_admin_store_v1');
        const adStore = raw ? JSON.parse(raw) : {};
        if (adStore && typeof adStore === 'object') {
          adStore.activeTab = matchTab[1];
          localStorage.setItem('gto_admin_store_v1', JSON.stringify(adStore));
        }
      } catch (_) {}
    }
    const adminRoot = document.getElementById('admin-root');
    if (adminRoot) getAdminModule().then(m => m.initAdminScreen(adminRoot)).catch(console.error);
  }
  return dataPromise;
}
window.navigateTo = go;

function eventYear(x) {
  const text = `${x.title || ''} ${x.period || ''} ${x.location || ''}`;
  const years = [...text.matchAll(/(?:^|\D)(20\d{2})(?!\d)/g)].map(m => Number(m[1])).filter(y => y >= 2020 && y <= new Date().getFullYear() + 2);
  if (years.length) return Math.max(...years);
  // The official calendar is exported in chronological year blocks, but many
  // regional entries omit the year in their visible date.
  const id = Number(x.id);
  if (id >= 8 && id <= 46) return 2024;
  if (id >= 47 && id <= 94) return 2025;
  if (id >= 95 && id <= 113) return 2026;
  return 0;
}

// --- Дизайн-система: Плюрализация, Монограммы атлетов и Бэйджи турниров (v84) ---
export function pluralize(n, [one, few, many]) {
  const num = Math.abs(Number(n) || 0);
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${num.toLocaleString('ru-RU')} ${many}`;
  if (mod10 === 1) return `${num.toLocaleString('ru-RU')} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${num.toLocaleString('ru-RU')} ${few}`;
  return `${num.toLocaleString('ru-RU')} ${many}`;
}

export function getAthleteInitials(name) {
  if (!name) return 'ГТ';
  const cleanName = String(name).replace(/[«»"().]/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ГТ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function getAvatarColorIndex(idOrName) {
  if (typeof idOrName === 'number' && !isNaN(idOrName)) return Math.abs(idOrName) % 8;
  let hash = 0;
  const str = String(idOrName || '');
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(hash) % 8;
}

window.__athleteAvatarFallback = (imgEl, initials, colorIdx, size) => {
  if (!imgEl) return;
  const mono = document.createElement('span');
  mono.className = `athlete-avatar-monogram color-${colorIdx}`;
  mono.style.width = `${size}px`;
  mono.style.height = `${size}px`;
  mono.setAttribute('aria-hidden', 'true');
  mono.textContent = initials;
  if (imgEl.parentElement && imgEl.parentElement.classList.contains('athlete-avatar-wrap')) {
    imgEl.parentElement.replaceWith(mono);
  } else {
    imgEl.replaceWith(mono);
  }
};

window.__tournamentBadgeFallback = (imgEl, tag, yrShort, colorIdx, size) => {
  if (!imgEl) return;
  const badge = document.createElement('span');
  badge.className = `tournament-badge-fallback color-${colorIdx}`;
  badge.style.width = `${size}px`;
  badge.style.height = `${size}px`;
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = `<span class="tbf-tag">${esc(tag)}</span><strong class="tbf-year">'${esc(yrShort)}</strong>`;
  if (imgEl.parentElement && imgEl.parentElement.classList.contains('tournament-badge-wrap')) {
    imgEl.parentElement.replaceWith(badge);
  } else {
    imgEl.replaceWith(badge);
  }
};

window.__eventCoverFallback = (imgEl, tag, yrShort, colorIdx) => {
  if (!imgEl) return;
  const badge = document.createElement('div');
  badge.className = `event-cover-fallback color-${colorIdx}`;
  badge.innerHTML = `<span class="tbf-tag">${esc(tag)}</span><strong class="tbf-year">'${esc(yrShort)}</strong>`;
  imgEl.replaceWith(badge);
};

window.__tournamentThumbFallback = (imgEl, tag, yrShort, colorIdx) => {
  if (!imgEl) return;
  const badge = document.createElement('span');
  badge.className = `tournament-badge-fallback color-${colorIdx}`;
  badge.setAttribute('aria-hidden', 'true');
  badge.innerHTML = `<span class="tbf-tag">${esc(tag)}</span><strong class="tbf-year">'${esc(yrShort)}</strong>`;
  imgEl.replaceWith(badge);
};

export function getTournamentThumbnailHtml(event) {
  const ev = event || {};
  const poster = ev.localPoster || ev.poster || ev.img;
  const yr = eventYear(ev) || (ev.period && String(ev.period).match(/\d{4}/)?.[0]) || '26';
  const yrShort = String(yr).slice(-2);

  let tag = 'ГТО';
  const titleLower = (ev.title || '').toLowerCase();
  if (titleLower.includes('чемпионат')) tag = 'ЧР';
  else if (titleLower.includes('кубок')) tag = 'КУБОК';
  else if (titleLower.includes('первенство')) tag = 'ПР';
  else if (titleLower.includes('игры')) tag = 'ИГРЫ';
  else if (titleLower.includes('восток') || titleLower.includes('дфо')) tag = 'ДФО';

  const colorIdx = getAvatarColorIndex(ev.id || ev.title);

  if (poster && poster !== './assets/logo-clean.png' && poster !== 'assets/icon-192.png' && !poster.includes('logo-clean')) {
    return `<img loading="lazy" src="${safeImage(poster)}" alt="" onload="if(this.naturalWidth && this.naturalHeight && (this.naturalWidth/this.naturalHeight <= 1.35)) { this.classList.add('media-portrait'); if(this.parentElement) this.parentElement.classList.add('is-portrait'); }" onerror="window.__tournamentThumbFallback(this, '${tag}', '${yrShort}', ${colorIdx})">`;
  }
  return `<span class="tournament-badge-fallback color-${colorIdx}" aria-hidden="true"><span class="tbf-tag">${tag}</span><strong class="tbf-year">'${yrShort}</strong></span>`;
}

export function getAthleteAvatarHtml(athlete, size = 52) {
  const a = athlete || {};
  const name = a.name || 'Спортсмен';
  const initials = getAthleteInitials(name);
  const colorIdx = getAvatarColorIndex(a.id || name);
  const photo = a.photo_url || a.photo || a.avatar;

  if (photo && photo !== './assets/logo-clean.png' && photo !== 'assets/icon-192.png' && !photo.includes('logo-clean')) {
    return `<span class="athlete-avatar-wrap" style="width:${size}px;height:${size}px"><img class="athlete-avatar-img" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer" src="${safeImage(photo)}" alt="Фото: ${esc(name)}" onerror="window.__athleteAvatarFallback(this, '${esc(initials)}', ${colorIdx}, ${size})"></span>`;
  }
  return `<span class="athlete-avatar-monogram color-${colorIdx}" style="width:${size}px;height:${size}px" aria-hidden="true">${esc(initials)}</span>`;
}

export function getTournamentBadgeHtml(event, size = 56) {
  const ev = event || {};
  const poster = ev.localPoster || ev.poster || ev.img;
  const yr = eventYear(ev) || (ev.period && String(ev.period).match(/\d{4}/)?.[0]) || '26';
  const yrShort = String(yr).slice(-2);

  let tag = 'ГТО';
  const titleLower = (ev.title || '').toLowerCase();
  if (titleLower.includes('чемпионат')) tag = 'ЧР';
  else if (titleLower.includes('кубок')) tag = 'КУБОК';
  else if (titleLower.includes('первенство')) tag = 'ПР';
  else if (titleLower.includes('игры')) tag = 'ИГРЫ';
  else if (titleLower.includes('восток') || titleLower.includes('дфо')) tag = 'ДФО';

  const colorIdx = getAvatarColorIndex(ev.id || ev.title);

  if (poster && poster !== './assets/logo-clean.png' && poster !== 'assets/icon-192.png' && !poster.includes('logo-clean')) {
    return `<span class="tournament-badge-wrap" style="width:${size}px;height:${size}px"><img class="tournament-badge-img" width="${size}" height="${size}" loading="lazy" src="${safeImage(poster)}" alt="" onerror="window.__tournamentBadgeFallback(this, '${tag}', '${yrShort}', ${colorIdx}, ${size})"></span>`;
  }
  return `<span class="tournament-badge-fallback color-${colorIdx}" style="width:${size}px;height:${size}px" aria-hidden="true"><span class="tbf-tag">${tag}</span><strong class="tbf-year">'${yrShort}</strong></span>`;
}

export function getResultPlaceBadgeHtml(rank) {
  const raw = String(rank || '').trim();
  const num = parseInt(raw.replace(/[^\d]/g, ''), 10);
  const lower = raw.toLowerCase();

  if (num === 1 || lower.includes('золот') || lower === '1' || lower.includes('1 место') || lower.includes('1-е')) {
    return '<span class="place-badge place-gold">🥇 1 место</span>';
  }
  if (num === 2 || lower.includes('серебр') || lower === '2' || lower.includes('2 место') || lower.includes('2-е')) {
    return '<span class="place-badge place-silver">🥈 2 место</span>';
  }
  if (num === 3 || lower.includes('бронз') || lower === '3' || lower.includes('3 место') || lower.includes('3-е')) {
    return '<span class="place-badge place-bronze">🥉 3 место</span>';
  }
  if (num && num > 0 && num < 999999) {
    return `<span class="place-badge place-rank">№ ${num}</span>`;
  }
  if (raw && raw !== '-' && raw !== '—') {
    return `<span class="place-badge place-rank">${esc(raw)}</span>`;
  }
  return '<span class="place-badge place-participant">Участник</span>';
}

function getVideoYear(v) {
  if (v.year) return Number(v.year);
  if (v.thumb) {
    const m = String(v.thumb).match(/(20\d{2})-\d{2}-\d{2}/);
    if (m) return Number(m[1]);
  }
  return 0;
}

const linkedEvent = id => GTO_CALENDAR_EVENTS.find(x => Number(x.id) === Number(id));
const mediaMeta = (item, type) => {
  const id = type === 'album' ? getTournamentByAlbumId(item.id) : getTournamentByVideoUrl(item.embedUrl);
  const event = linkedEvent(id);
  const rawYear = (event ? eventYear(event) : 0) || (type === 'video' ? getVideoYear(item) : (item.year || 0)) || (item.title ? eventYear({ title: item.title }) : 0) || (type === 'album' && Number(item.id) === 285395191 ? 2022 : 0) || eventYear(item) || 0;
  return { id, event, year: rawYear };
};

const NOW_Y = new Date().getFullYear(), NOW_M = new Date().getMonth() + 1;
const MONTHS = [['январ', 1], ['феврал', 2], ['март', 3], ['марта', 3], ['апрел', 4], ['мая', 5], ['май', 5], ['июн', 6], ['июл', 7], ['август', 8], ['авгус', 8], ['сентябр', 9], ['октябр', 10], ['ноябр', 11], ['декабр', 12]];

function eventMonth(x) {
  const s = `${x.period || ''}`.toLowerCase();
  for (const [k, m] of MONTHS) if (s.includes(k)) return m;
  return 0;
}

function eventDateRange(x) {
  const year = eventYear(x);
  if (!year) return null;
  const text = String(x.period || '').toLowerCase();
  const points = [];
  const re = /(\d{1,2})\s+(январ\w*|феврал\w*|март\w*|апрел\w*|ма[йя]|июн\w*|июл\w*|август\w*|сентябр\w*|октябр\w*|ноябр\w*|декабр\w*)/g;
  for (const match of text.matchAll(re)) {
    const month = MONTHS.find(([stem]) => match[2].startsWith(stem))?.[1];
    if (month) points.push({ day: Number(match[1]), month });
  }
  if (!points.length) return null;
  const first = points[0];
  let last = points.at(-1);
  // A few source rows contain a bogus "— 01 января" suffix. It must not
  // prolong a one-day competition into the following year.
  if (last.month < first.month) last = first;
  return {
    start: new Date(year, first.month - 1, first.day, 0, 0, 0, 0),
    end: new Date(year, last.month - 1, last.day, 23, 59, 59, 999)
  };
}

function isPast(x) {
  const range = eventDateRange(x);
  if (range) return new Date() > range.end;
  const y = eventYear(x);
  return Boolean(y && y < NOW_Y);
}

function eventStatus(x) {
  const meta = state.eventManifest?.events?.[String(x.id)] || {};
  const hasReg = Boolean((Array.isArray(meta.registrations) && meta.registrations.length > 0) || Number(meta.registrations) > 0 || x.regUrl);
  if (!isPast(x) && hasReg) return { k: 'registration', label: 'Идёт регистрация', cls: 'st-reg' };
  if (isPast(x)) return { k: 'past', label: 'Завершено', cls: 'st-past' };
  const range = eventDateRange(x);
  if (range && new Date() >= range.start) return { k: 'upcoming', label: 'Идёт сейчас', cls: 'st-reg' };
  return { k: 'upcoming', label: 'Предстоит', cls: 'st-up' };
}

function compareEvents(a, b) {
  const aStatus = eventStatus(a).k;
  const bStatus = eventStatus(b).k;
  const priority = { registration: 0, upcoming: 1, past: 2 };
  const statusOrder = (priority[aStatus] ?? 3) - (priority[bStatus] ?? 3);
  if (statusOrder) return statusOrder;
  const aRange = eventDateRange(a);
  const bRange = eventDateRange(b);
  const aTime = aRange ? (aStatus === 'past' ? aRange.end : aRange.start).getTime() : 0;
  const bTime = bRange ? (bStatus === 'past' ? bRange.end : bRange.start).getTime() : 0;
  return aStatus === 'past' ? bTime - aTime : aTime - bTime;
}

function renderHomeRegistrations() {
  const container = $('#home-registrations');
  if (container) {
    container.hidden = true;
    container.innerHTML = '';
  }
}

function renderHome() {
  renderHomeRegistrations();
  const news = getUnifiedNews();
  $('#home-news').innerHTML = news.slice(0, 5).map(x => `
    <button class="story" data-article="${x.id}">
      <img src="${safeImage(x.img)}" alt="" onerror="window.__imageFallback(event)">
      <div><small>${esc(x.date)}</small><b>${esc(x.title)}</b></div>
    </button>
  `).join('');
}

function setupEventYears() {
  const el = $('#event-year');
  if (!el) return;
  const years = [...new Set(GTO_CALENDAR_EVENTS.map(eventYear).filter(Boolean))].sort((a, b) => b - a);
  el.innerHTML = `<option value="all">Все годы</option>${years.map(y => `<option value="${y}">${y}</option>`).join('')}`;
  el.value = String(state.eventYear);
}

function setupEventFilters() {
  const citySelect = $('#event-city');
  if (!citySelect) return;
  const cities = new Set();
  GTO_CALENDAR_EVENTS.forEach(x => {
    if (!x.location) return;
    const parts = x.location.split(',').map(p => p.trim());
    if (parts[0] && parts[0].length > 2) cities.add(parts[0]);
  });
  const sortedCities = [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
  citySelect.innerHTML = '<option value="all">Все регионы и города</option>' + sortedCities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}

function getEventFormat(ev) {
  if (!ev) return 'OFFLINE';
  if (ev.format) {
    const f = String(ev.format).trim().toUpperCase();
    if (f === 'HYBRID' || f.includes('ГИБРИД')) return 'HYBRID';
    if (f === 'ONLINE' || f.includes('ОНЛАЙН')) return 'ONLINE';
    return 'OFFLINE';
  }
  const loc = String(ev.location || '').toLowerCase();
  const tit = String(ev.title || '').toLowerCase();
  if (ev.hasOnline && loc && !loc.includes('онлайн')) return 'HYBRID';
  if (ev.hasOnline || tit.includes('онлайн') || loc.includes('онлайн')) return 'ONLINE';
  return 'OFFLINE';
}

function getEventPrograms(ev) {
  if (!ev) return ['allround'];
  if (Array.isArray(ev.programs) && ev.programs.length) return ev.programs;
  const progs = ['allround'];
  const t = `${ev.title || ''} ${ev.location || ''} ${ev.description || ''}`.toLowerCase();
  if (ev.hasOnline || /герой|отбор|онлайн|wod/i.test(t)) progs.push('herogto');
  if (/рекорд|иду на рекорд|силов/i.test(t)) progs.push('records');
  return progs;
}

function updateEventsActiveChips() {
  const bar = $('#events-active-bar');
  const container = $('#events-active-chips');
  if (!bar || !container) return;

  const chips = [];
  if (state.eventYear && state.eventYear !== 'all') {
    chips.push({ key: 'year', label: `Год: ${state.eventYear}` });
  }
  if (state.eventStatus && state.eventStatus !== 'all') {
    const stMap = { registration: 'Регистрация', upcoming: 'Предстоящие', past: 'Прошедшие' };
    chips.push({ key: 'status', label: `Статус: ${stMap[state.eventStatus] || state.eventStatus}` });
  }
  if (state.eventCity && state.eventCity !== 'all') {
    chips.push({ key: 'city', label: `Город: ${state.eventCity}` });
  }
  if (state.eventFormat && state.eventFormat !== 'all') {
    const fmtMap = { offline: 'Очный', online: 'Онлайн', hybrid: 'Гибридный' };
    chips.push({ key: 'format', label: `Формат: ${fmtMap[state.eventFormat] || state.eventFormat}` });
  }
  if (state.eventProgram && state.eventProgram !== 'all') {
    const progMap = { allround: 'Многоборье', herogto: 'Герой ГТО', records: 'Иду на рекорд' };
    chips.push({ key: 'program', label: `Программа: ${progMap[state.eventProgram] || state.eventProgram}` });
  }
  if (state.eventType && state.eventType !== 'all') {
    const typeMap = { cup: 'Кубок / Первенство', champ: 'Чемпионат России', games: 'Игры ГТО', vostok: 'Дальний Восток' };
    chips.push({ key: 'type', label: `Уровень: ${typeMap[state.eventType] || state.eventType}` });
  }
  if (state.eventQuery) {
    chips.push({ key: 'query', label: `Поиск: «${state.eventQuery}»` });
  }

  if (chips.length > 0) {
    bar.style.display = 'flex';
    container.innerHTML = chips.map(c => `
      <span class="active-chip" data-event-chip="${c.key}">
        <span>${esc(c.label)}</span>
        <span class="active-chip-remove" aria-label="Удалить фильтр">✕</span>
      </span>
    `).join('');
  } else {
    bar.style.display = 'none';
    container.innerHTML = '';
  }
}

export function resetEventsFilters() {
  state.eventYear = 'all';
  state.eventStatus = 'all';
  state.eventCity = 'all';
  state.eventFormat = 'all';
  state.eventProgram = 'all';
  state.eventType = 'all';
  state.eventQuery = '';
  state.eventsDisplayLimit = 20;

  const sInput = $('#event-search');
  if (sInput) sInput.value = '';
  const ySel = $('#event-year');
  if (ySel) ySel.value = 'all';
  const cSel = $('#event-city');
  if (cSel) cSel.value = 'all';
  const fSel = $('#event-format');
  if (fSel) fSel.value = 'all';
  const pSel = $('#event-program');
  if (pSel) pSel.value = 'all';
  const tSel = $('#event-type');
  if (tSel) tSel.value = 'all';
  $$('#event-status button').forEach(b => b.classList.toggle('active', b.dataset.eventStatus === 'all'));

  renderEvents();
}

function renderEvents() {
  const q = state.eventQuery.toLowerCase();
  const items = GTO_CALENDAR_EVENTS.filter(x => {
    if (state.eventYear !== 'all' && eventYear(x) !== Number(state.eventYear)) return false;
    if (state.eventStatus !== 'all' && eventStatus(x).k !== state.eventStatus && !(state.eventStatus === 'upcoming' && eventStatus(x).k === 'registration')) return false;
    if (state.eventCity !== 'all' && !String(x.location || '').toLowerCase().includes(state.eventCity.toLowerCase())) return false;
    if (state.eventFormat !== 'all') {
      const fmt = getEventFormat(x).toLowerCase();
      if (fmt !== state.eventFormat.toLowerCase()) return false;
    }
    if (state.eventProgram !== 'all') {
      const progs = getEventPrograms(x);
      if (!progs.includes(state.eventProgram)) return false;
    }
    if (state.eventType !== 'all') {
      const t = `${x.title} ${x.location}`.toLowerCase();
      if (state.eventType === 'cup' && !/кубок|первенств/i.test(t)) return false;
      if (state.eventType === 'champ' && !/чемпионат/i.test(t)) return false;
      if (state.eventType === 'games' && !/игры гто/i.test(t)) return false;
      if (state.eventType === 'vostok' && !/восток|дфо|владивосток|хабаровск/i.test(t)) return false;
    }
    return `${x.title} ${x.period} ${x.location}`.toLowerCase().includes(q);
  }).sort(compareEvents);

  state.eventsDisplayLimit = state.eventsDisplayLimit || 20;
  const totalEvents = items.length;
  const visibleEvents = items.slice(0, state.eventsDisplayLimit);

  $('#event-count').textContent = `${totalEvents} событий${totalEvents > visibleEvents.length ? ` (показано ${visibleEvents.length})` : ''}`;

  updateEventsActiveChips();

  let loadMoreHtml = '';
  if (totalEvents > visibleEvents.length) {
    const remaining = totalEvents - visibleEvents.length;
    const chunk = Math.min(20, remaining);
    loadMoreHtml = `<button type="button" class="load-more" id="events-load-more">Показать ещё ${chunk} (осталось ${remaining})</button>`;
  }

  $('#event-list').innerHTML = visibleEvents.length ? visibleEvents.map(x => {
    const meta = state.eventManifest?.events?.[String(x.id)] || {};
    const media = getTournamentMedia(x.id, x);
    const hasResults = Boolean(meta.results || (state.resultsManifest?.events?.[String(x.id)]));
    const hasPhotos = Boolean((media.albums && media.albums.length > 0) || ((x.media || []).length > 0));
    const hasVideos = Boolean(media.videos && media.videos.length > 0);
    const st = eventStatus(x);
    const poster = x.localPoster || x.poster || x.img;
    const yr = eventYear(x) || (x.period && String(x.period).match(/\d{4}/)?.[0]) || '26';
    const yrShort = String(yr).slice(-2);
    let tag = 'ГТО';
    const titleLower = (x.title || '').toLowerCase();
    if (titleLower.includes('чемпионат')) tag = 'ЧР';
    else if (titleLower.includes('кубок')) tag = 'КУБОК';
    else if (titleLower.includes('первенство')) tag = 'ПР';
    else if (titleLower.includes('игры')) tag = 'ИГРЫ';
    else if (titleLower.includes('восток') || titleLower.includes('дфо')) tag = 'ДФО';
    const colorIdx = getAvatarColorIndex(x.id || x.title);
    const coverHtml = (poster && poster !== './assets/logo-clean.png' && poster !== 'assets/icon-192.png' && !poster.includes('logo-clean'))
      ? `<img loading="lazy" src="${safeImage(poster)}" alt="" onerror="window.__eventCoverFallback(this, '${tag}', '${yrShort}', ${colorIdx})">`
      : `<div class="event-cover-fallback color-${colorIdx}" aria-hidden="true"><span class="tbf-tag">${tag}</span><strong class="tbf-year">'${yrShort}</strong></div>`;

    const evFmt = getEventFormat(x);
    const evFmtBadge = evFmt === 'HYBRID'
      ? '<span class="event-fmt-badge hybrid" title="Гибридный турнир: онлайн-отбор + очный финал">⚡ Гибрид</span>'
      : (evFmt === 'ONLINE' ? '<span class="event-fmt-badge online" title="Дистанционный онлайн-турнир">🌐 Онлайн</span>' : '<span class="event-fmt-badge offline" title="Очный турнир на арене">🏟️ Офлайн</span>');

    const evProgs = getEventPrograms(x);
    const progChipsHtml = evProgs.map(p => {
      if (p === 'herogto') return '<span class="event-prog-chip herogto">⚡ Герой ГТО</span>';
      if (p === 'records') return '<span class="event-prog-chip records">🏆 Иду на рекорд</span>';
      return '<span class="event-prog-chip allround">Многоборье</span>';
    }).join('');

    const hasReg = Boolean(st.k === 'registration' || x.regUrl);
    const regBtn = hasReg ? `<button type="button" class="ec-btn ec-btn-reg" data-event="${x.id}" data-event-pane="reg" aria-label="Регистрация на турнир"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Регистрация</span></button>` : '';
    const resultsBtn = hasResults ? `<button type="button" class="ec-btn ec-btn-results" data-event="${x.id}" data-event-pane="results" aria-label="Протоколы и результаты"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span>Протоколы</span></button>` : '';
    const photosBtn = hasPhotos ? `<button type="button" class="ec-btn ec-btn-photos" data-event="${x.id}" data-event-pane="event-photos" aria-label="Фотографии"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>Фото</span></button>` : '';
    const videosBtn = hasVideos ? `<button type="button" class="ec-btn ec-btn-videos" data-event="${x.id}" data-event-pane="event-videos" aria-label="Видеозаписи"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/></svg><span>Видео</span></button>` : '';
    const overviewBtn = `<button type="button" class="ec-btn ec-btn-overview" data-event="${x.id}" data-event-pane="about" aria-label="Подробнее о турнире"><span>Обзор</span> <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>`;

    return `<article class="event-card" data-event="${x.id}" data-status="${st.k}">
      <button type="button" class="event-card-main" data-event="${x.id}" data-event-pane="about" aria-label="${esc(x.title)}">
        ${coverHtml}
        <div class="event-card-content">
          <div class="event-card-head-row">
            <div class="event-head-tags">
              <time>${esc(x.period || eventYear(x) || 'Дата на странице')}${eventYear(x) ? ' · ' + eventYear(x) : ''}</time>
              ${evFmtBadge}
            </div>
            <span class="event-status ${st.cls}">${st.label}</span>
          </div>
          <b>${esc(x.title)}</b>
          <p>${esc(x.location)}</p>
          <div class="event-card-programs">${progChipsHtml}</div>
        </div>
      </button>
      <div class="event-card-btn-bar" role="toolbar" aria-label="Разделы турнира">
        ${regBtn}
        ${resultsBtn}
        ${photosBtn}
        ${videosBtn}
        ${overviewBtn}
      </div>
    </article>`;
  }).join('') + loadMoreHtml : `
    <div class="empty" style="text-align:center;padding:32px 16px;">
      <p style="font-weight:600;font-size:15px;margin-bottom:8px;color:#fff;">Ничего не найдено по выбранным параметрам</p>
      <p style="font-size:13px;color:#94a3b8;margin-bottom:16px;">Попробуйте смягчить условия поиска или сбросить фильтры</p>
      <button type="button" class="reset-filters-btn" id="events-empty-reset" style="margin:0 auto;display:inline-flex;padding:8px 16px;font-size:13px;">✕ Сбросить все фильтры</button>
    </div>
  `;
}


let resultsFiltersInitialized = false;
function setupResultsFilters() {
  if (resultsFiltersInitialized) return;
  const yearSelect = $('#results-year-filter');
  const citySelect = $('#results-city-filter');
  if (!yearSelect || !citySelect) return;
  
  const years = [...new Set(GTO_CALENDAR_EVENTS.map(eventYear).filter(Boolean))].sort((a, b) => b - a);
  yearSelect.innerHTML = `<option value="all">Все годы</option>${years.map(y => `<option value="${y}">${y}</option>`).join('')}`;

  const cities = new Set();
  GTO_CALENDAR_EVENTS.forEach(x => {
    if (x.city) cities.add(x.city.trim());
    else if (x.location) {
      const parts = x.location.split(',').map(p => p.trim());
      if (parts[0] && parts[0].length < 40) cities.add(parts[0].replace(/^г\.\s*/i, ''));
    }
  });
  const sortedCities = [...cities].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));
  citySelect.innerHTML = `<option value="all">Все регионы и города</option>${sortedCities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}`;
  resultsFiltersInitialized = true;
}

export function renderResultsScreen() {
  const q = (state.resultsQuery || '').toLowerCase();
  const manifestEvents = state.resultsManifest?.events || {};
  setupResultsFilters();

  const items = GTO_CALENDAR_EVENTS.filter(x => {
    const hasManifest = Boolean(manifestEvents[String(x.id)]);
    const hasResults = Boolean((x.results && x.results.length > 0) || (x.actionText && /результат|протокол/i.test(x.actionText)));
    const isPastEv = x.status === 'past' || isPast(x);
    if (!hasManifest && !hasResults && !isPastEv) return false;

    if (state.resultsYear && state.resultsYear !== 'all' && String(eventYear(x)) !== String(state.resultsYear)) return false;
    if (state.resultsProgram && state.resultsProgram !== 'all') {
      const progs = getEventPrograms(x);
      if (!progs.includes(state.resultsProgram)) return false;
    }
    if (state.resultsCity && state.resultsCity !== 'all') {
      const loc = `${x.location || ''} ${x.city || ''}`.toLowerCase();
      if (!loc.includes(state.resultsCity.toLowerCase())) return false;
    }

    if (q) {
      const haystack = `${x.title} ${x.location || ''} ${x.city || ''} ${x.period || ''} ${x.year || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const yA = Number(eventYear(a)) || 0;
    const yB = Number(eventYear(b)) || 0;
    if (yA !== yB) return yB - yA;
    return (b.id || 0) - (a.id || 0);
  });

  state.resultsDisplayLimit = state.resultsDisplayLimit || 20;
  const total = items.length;
  const visible = items.slice(0, state.resultsDisplayLimit);

  const countEl = $('#results-count');
  if (countEl) countEl.textContent = `${total} турниров с результатами${total > visible.length ? ` (показано ${visible.length})` : ''}`;

  let loadMoreHtml = '';
  if (total > visible.length) {
    const remaining = total - visible.length;
    const chunk = Math.min(20, remaining);
    loadMoreHtml = `<button type="button" class="load-more" id="results-load-more">Показать ещё ${chunk} (осталось ${remaining})</button>`;
  }

  const listEl = $('#results-catalog-list');
  if (!listEl) return;

  listEl.innerHTML = visible.length ? visible.map(x => {
    const manifestInfo = manifestEvents[String(x.id)];
    const poster = x.localPoster || x.poster || x.img;
    const yr = eventYear(x) || (x.period && String(x.period).match(/\d{4}/)?.[0]) || '26';
    const yrShort = String(yr).slice(-2);
    const colorIdx = getAvatarColorIndex(x.id || x.title);
    const coverHtml = (poster && poster !== './assets/logo-clean.png' && poster !== 'assets/icon-192.png' && !poster.includes('logo-clean'))
      ? `<img loading="lazy" src="${safeImage(poster)}" alt="" onerror="window.__eventCoverFallback(this, 'ПРОТОКОЛ', '${yrShort}', ${colorIdx})">`
      : `<div class="event-cover-fallback color-${colorIdx}" aria-hidden="true"><span class="tbf-tag">ПРОТОКОЛ</span><strong class="tbf-year">'${yrShort}</strong></div>`;

    const countText = manifestInfo ? `${manifestInfo.count} результатов` : 'Официальный протокол';
    const evProgs = getEventPrograms(x);
    const progChipsHtml = evProgs.map(p => {
      if (p === 'herogto') return '<span class="event-prog-chip herogto">⚡ Герой ГТО</span>';
      if (p === 'records') return '<span class="event-prog-chip records">🏆 Иду на рекорд</span>';
      return '<span class="event-prog-chip allround">Многоборье</span>';
    }).join('');

    return `<article class="event-card" data-event="${x.id}" data-event-pane="results" data-status="past">
      <button type="button" class="event-card-main" data-event="${x.id}" data-event-pane="results" aria-label="Протокол: ${esc(x.title)}">
        ${coverHtml}
        <div class="event-card-content">
          <div class="event-card-head-row">
            <div class="event-head-tags">
              <time>${esc(x.period || eventYear(x) || '')}${eventYear(x) ? ' · ' + eventYear(x) : ''}</time>
            </div>
            <span class="event-status status-past">Завершён</span>
          </div>
          <b>${esc(x.title)}</b>
          <p>${esc(x.city || x.location || '')} · <span style="color:#60a5fa;font-weight:700;">${countText}</span></p>
          <div class="event-card-programs">${progChipsHtml}</div>
        </div>
      </button>
      <div class="event-card-btn-bar" role="toolbar" aria-label="Действия">
        <button type="button" class="ec-btn ec-btn-results" data-event="${x.id}" data-event-pane="results" aria-label="Смотреть протокол"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span>Смотреть протокол</span></button>
        <button type="button" class="ec-btn ec-btn-overview" data-event="${x.id}" data-event-pane="about" aria-label="Обзор турнира"><span>Обзор</span> <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
      </div>
    </article>`;
  }).join('') + loadMoreHtml : '<div class="empty">Протоколов по заданным критериям не найдено.</div>';
}

const HEADER_TOKENS = /^(№|n|nn|no|место|п\/п|пп|фамилия|команда|участник|имя|отчество|фио|ф\.и\.о|регион|город|результат|очки|балл|баллы|время|пол|возраст|категория|дисциплина|разряд|итог|сумма|звание)\.?$/i;

function tableHtml(rows) {
  if (!rows || !rows.length) return '';
  const maxCols = Math.max(1, ...rows.map(r => r.length));
  let headerDone = false;
  let athleteCol = -1;
  const body = rows.map(row => {
    const cells = row.map(c => String(c == null ? '' : c));
    if (cells.filter(c => c.trim()).length === 1 && maxCols > 1) {
      headerDone = false;
      athleteCol = -1;
      return `<tr class="tbl-group"><td colspan="${maxCols}">${esc(cells.find(c => c.trim()) || '')}</td></tr>`;
    }
    const hits = cells.filter(c => HEADER_TOKENS.test(c.trim())).length;
    const firstNum = /^\d+$/.test((cells[0] || '').trim());
    const isHeader = !headerDone && cells.length > 1 && hits >= 2 && !firstNum;
    if (isHeader) {
      headerDone = true;
      const lower = cells.map(c => c.trim().toLowerCase());
      athleteCol = lower.findIndex(h => /^(фамилия|участник|спортсмен|атлет|фио|ф\.и\.о)$/i.test(h));
      if (athleteCol < 0) athleteCol = lower.findIndex(h => /фамилия|участник|спортсмен/i.test(h));
      return `<tr class="tbl-head">${cells.map(c => `<th>${esc(c)}</th>`).join('')}</tr>`;
    }
    return `<tr>${cells.map((c, colIdx) => {
      const val = c.trim();
      if (colIdx === athleteCol && val && val.length >= 3 && !/^\d+$/.test(val) && !HEADER_TOKENS.test(val)) {
        return `<td><button type="button" class="athlete-table-link" data-athlete-query="${esc(val)}"><b>${esc(c)}</b> <span class="athlete-link-icon">↗</span></button></td>`;
      }
      return `<td>${esc(c)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  return `<div class="table-scroll-wrap"><div class="table-scroll-hint"><span>↔ Листайте вправо для просмотра всех колонок таблицы</span></div><div class="table-scroll"><table class="result-table">${body}</table></div></div>`;
}

const MEDAL_RE = /^(золото|серебро|бронза)$/i;
const medalCls = v => /золото/i.test(v) ? 'm-gold' : /серебро/i.test(v) ? 'm-silver' : /бронза/i.test(v) ? 'm-bronze' : '';

const findHeaderRow = rows => {
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i].map(x => String(x == null ? '' : x));
    if (c.filter(x => x.trim()).length <= 1) continue;
    if (c.filter(x => HEADER_TOKENS.test(x.trim())).length >= 2) return i;
  }
  return -1;
};

function resultsView(rows) {
  if (!rows || rows.length < 2) return null;
  const hi = findHeaderRow(rows);
  if (hi < 0) return null;
  const H = rows[hi].map(x => String(x == null ? '' : x).trim().toLowerCase());
  const find = re => H.findIndex(h => re.test(h));
  const iSurname = find(/фамил/), iName = find(/^имя|^ф\.?и\.?о/);
  if (iSurname < 0 && iName < 0) return null;
  const iRegion = find(/регион|город|субъект|область|край/), iCat = find(/категор/), iAge = find(/возраст/);
  let iGender = find(/^пол$/);
  const data = rows.filter((r, i) => i !== hi && r.map(x => String(x == null ? '' : x)).filter(x => x.trim()).length > 1);
  const col = idx => data.map(r => String(r[idx] == null ? '' : r[idx]).trim());
  if (iGender < 0) {
    for (let j = 0; j < H.length; j++) {
      if (j === iSurname || j === iName) continue;
      const vals = col(j).filter(Boolean);
      if (vals.length && vals.filter(v => /^(м|ж|муж|жен|m|w|f)\.?$/i.test(v)).length / vals.length > 0.6) {
        iGender = j;
        break;
      }
    }
  }
  let iRank = H.findIndex(h => /^(№|nn|n|п\/п|пп|место)$/i.test(h));
  if (iRank >= 0 && col(iRank).filter(Boolean).some(v => MEDAL_RE.test(v))) iRank = -1;
  if (iRank < 0) {
    for (let j = 0; j < H.length; j++) {
      const vals = col(j).filter(Boolean);
      if (vals.length && vals.filter(v => /^\d{1,3}$/.test(v)).length / vals.length > 0.7) {
        iRank = j;
        break;
      }
    }
  }
  const iResult = find(/результат|очки|балл|сумма|итог|время|разряд|звание/);
  let n = 0, out = '';
  for (let i = 0; i < rows.length; i++) {
    if (i === hi) continue;
    const cells = rows[i].map(x => String(x == null ? '' : x));
    const filled = cells.filter(x => x.trim());
    if (filled.length <= 1) {
      if (filled.length === 1) out += `<div class="rc-group">${esc(filled[0])}</div>`;
      continue;
    }
    n++;
    const rank = iRank >= 0 && cells[iRank] ? esc(cells[iRank].trim()) : String(n);
    const nm = [iSurname, iName].filter(x => x >= 0).map(x => cells[x]).filter(v => v && v.trim()).join(' ') || '—';
    const g = iGender >= 0 && cells[iGender] ? cells[iGender].trim().toUpperCase().replace(/^М.*/, 'М').replace(/^(Ж|W|F).*/, 'Ж') : '';
    const meta = [iRegion >= 0 ? cells[iRegion] : '', [iCat >= 0 ? cells[iCat] : '', iAge >= 0 ? cells[iAge] : ''].filter(v => v && String(v).trim()).join(' '), g].filter(v => v && String(v).trim()).map(esc).join(' · ');
    const medal = cells.find(c => MEDAL_RE.test(String(c).trim()));
    const mc = medal ? medalCls(medal) : '';
    const right = medal ? `<span class="rc-medal ${mc}">${esc(medal)}</span>` : (iResult >= 0 && cells[iResult] && cells[iResult].trim() ? `<span class="rc-res">${esc(cells[iResult])}</span>` : '');
    out += `<div class="rcard ${mc}"><span class="rc-rank">${rank}</span><div class="rc-main"><button type="button" class="athlete-name-btn" data-athlete-query="${esc(nm)}"><b>${esc(nm)}</b><span class="athlete-link-icon">↗</span></button>${meta ? `<small>${meta}</small>` : ''}</div>${right}</div>`;
  }
  return `<div class="result-cards">${out}</div>`;
}

function formatSectionParagraph(p) {
  if (!p) return '';
  const text = String(p).trim();
  if (!text) return '';
  if (/^[•·\-\*]\s+/.test(text)) {
    const lines = text.split(/\r?\n/).map(l => l.replace(/^[•·\-\*]\s+/, '').trim()).filter(Boolean);
    return `<ul class="detail-list">${lines.map(li => `<li>${esc(li)}</li>`).join('')}</ul>`;
  }
  const clean = esc(text).replace(/\s+([вскониудапообза])\s+/gi, ' $1&nbsp;');
  return `<p>${clean}</p>`;
}

const sectionsHtml = sections => (sections && sections.length) ? sections.map(s => {
  const hasTables = (s.tables || []).length > 0;
  const rawParas = (s.paragraphs || []).filter(p => !(hasTables && String(p).length > 280));
  const paras = rawParas.flatMap(p => String(p).split(/\r?\n\s*\r?\n/)).filter(Boolean);
  return `<section class="detail-section"><h2>${esc(s.title)}</h2>${paras.map(formatSectionParagraph).join('')}${(s.tables || []).map(t => resultsView(t) || tableHtml(t)).join('')}</section>`;
}).join('') : '<div class="empty">На официальной странице этот раздел пока не заполнен.</div>';

function ruPlural(n, one, two, five) {
  const abs = Math.abs(Number(n) || 0) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return five;
  if (rem > 1 && rem < 5) return two;
  if (rem === 1) return one;
  return five;
}

function exportToIcal(ev) {
  haptic(15);
  const y = eventYear(ev) || new Date().getFullYear();
  const m = eventMonth(ev) || (new Date().getMonth() + 1);
  const pad = n => String(n).padStart(2, '0');
  const dtStart = `${y}${pad(m)}01T090000Z`;
  const dtEnd = `${y}${pad(m)}02T180000Z`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `gto-event-${ev.id || 'reg'}-${y}@gto.com.ru`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Федерация многоборья ГТО России//GTO Portal//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${clean(ev.title)}`,
    `DESCRIPTION:${clean(ev.title)} · Официальные соревнования Федерации многоборья ГТО России. Подробнее: ${ev.url || 'https://gto.com.ru/sorevnovaniya/'}`,
    `LOCATION:${clean(ev.location || 'Россия')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Напоминание о соревновании ГТО',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gto-event-${ev.id || 'start'}.ics`;
  a.click();
}

function parseRank(rank) {
  if (!rank || rank === '-' || rank === '—') return 999999;
  const m = String(rank).match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 999999;
}

function extractEventAthletes(protocol, eventData) {
  const map = new Map();

  if (protocol && Array.isArray(protocol.results)) {
    for (const r of protocol.results) {
      const name = (r.participant || '').trim();
      if (!name || name.length < 3 || HEADER_TOKENS.test(name) || (/^(команда|сборная|регион)/i.test(name) && !r.details?.фамилия)) continue;

      const numRank = parseRank(r.rank);
      if (!map.has(name)) {
        map.set(name, {
          name,
          region: r.region && r.region !== name ? r.region : '',
          categories: new Set(),
          bestRank: numRank,
          bestResult: r.result || '',
          medals: { gold: 0, silver: 0, bronze: 0 }
        });
      }
      const a = map.get(name);
      if (r.category) a.categories.add(r.category);
      if (r.region && !a.region && r.region !== name) a.region = r.region;
      if (numRank < a.bestRank) {
        a.bestRank = numRank;
        if (r.result) a.bestResult = r.result;
      }
      if (numRank === 1) a.medals.gold++;
      else if (numRank === 2) a.medals.silver++;
      else if (numRank === 3) a.medals.bronze++;
    }
  }

  if (map.size === 0 && eventData && Array.isArray(eventData.results)) {
    for (const sec of eventData.results) {
      for (const tbl of (sec.tables || [])) {
        const hi = findHeaderRow(tbl);
        if (hi < 0) continue;
        const H = tbl[hi].map(x => String(x || '').trim().toLowerCase());
        const find = re => H.findIndex(h => re.test(h));
        const iSurname = find(/фамил/);
        const iName = find(/^имя|^ф\.?и\.?о/);
        if (iSurname < 0 && iName < 0) continue;
        const iRank = find(/^(№|n|место|п\/п)$/);
        const iRes = find(/результат|очки|балл|сумма|итог/);
        const iReg = find(/регион|город|субъект/);
        const iCat = find(/категор|группа|возраст/);

        for (let i = hi + 1; i < tbl.length; i++) {
          const row = tbl[i];
          const name = [iSurname, iName].filter(x => x >= 0).map(x => row[x]).filter(Boolean).join(' ').trim();
          if (!name || name.length < 3 || HEADER_TOKENS.test(name)) continue;
          const rankStr = iRank >= 0 && row[iRank] ? String(row[iRank]).trim() : '';
          const numRank = parseRank(rankStr);
          const resStr = iRes >= 0 && row[iRes] ? String(row[iRes]).trim() : '';
          const regStr = iReg >= 0 && row[iReg] ? String(row[iReg]).trim() : '';
          const catStr = iCat >= 0 && row[iCat] ? String(row[iCat]).trim() : '';

          if (!map.has(name)) {
            map.set(name, {
              name,
              region: regStr,
              categories: new Set(),
              bestRank: numRank,
              bestResult: resStr,
              medals: { gold: 0, silver: 0, bronze: 0 }
            });
          }
          const a = map.get(name);
          if (catStr) a.categories.add(catStr);
          if (regStr && !a.region) a.region = regStr;
          if (numRank < a.bestRank) {
            a.bestRank = numRank;
            if (resStr) a.bestResult = resStr;
          }
          if (numRank === 1) a.medals.gold++;
          else if (numRank === 2) a.medals.silver++;
          else if (numRank === 3) a.medals.bronze++;
        }
      }
    }
  }

  const list = Array.from(map.values());
  list.forEach(a => {
    a.categoriesStr = Array.from(a.categories).slice(0, 2).join(', ');
  });
  list.sort((a, b) => {
    if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
    return a.name.localeCompare(b.name, 'ru');
  });
  return list;
}

function renderEventAthletesTab(athletes) {
  if (!athletes.length) {
    return '<div class="empty">Именной список участников для этого турнира ещё обрабатывается судейской коллегией.</div>';
  }

  const medalistsCount = athletes.filter(a => a.bestRank >= 1 && a.bestRank <= 3).length;

  return `
    <div class="event-athletes-header">
      <div class="event-athletes-stats">
        <div class="stat-pill">
          <small>УЧАСТНИКОВ</small>
          <strong>${athletes.length}</strong>
        </div>
        ${medalistsCount ? `
          <div class="stat-pill">
            <small>МЕДАЛИСТОВ</small>
            <strong>${medalistsCount}</strong>
          </div>
        ` : ''}
      </div>
      <label class="search event-athletes-search-wrap">
        <span>⌕</span>
        <input id="event-athletes-filter" type="search" placeholder="Быстрый поиск по участникам турнира..." aria-label="Фильтр участников">
      </label>
    </div>
    <div id="event-athletes-list" class="event-athletes-grid">
      ${athletes.map(renderEventAthleteCard).join('')}
    </div>
  `;
}

function renderEventAthleteCard(a) {
  const cardCls = a.bestRank === 1 ? 'gold-athlete' : a.bestRank === 2 ? 'silver-athlete' : a.bestRank === 3 ? 'bronze-athlete' : '';

  return `
    <article class="event-athlete-card ${cardCls}">
      <div class="athlete-card-top">
        ${getAthleteAvatarHtml(a, 44)}
        <div class="athlete-name-wrap">
          <button type="button" class="athlete-name-btn" data-athlete-query="${esc(a.name)}">
            <b>${esc(a.name)}</b>
            <span class="athlete-link-icon">↗</span>
          </button>
          ${a.region ? `<small class="athlete-region">${esc(a.region)}</small>` : ''}
        </div>
        ${getResultPlaceBadgeHtml(a.bestRank)}
      </div>
      <div class="athlete-card-meta">
        ${a.categoriesStr ? `<span class="athlete-cat-badge">${esc(a.categoriesStr)}</span>` : ''}
        ${a.bestResult ? `<span class="athlete-res-badge"><small>Результат:</small> <b>${esc(a.bestResult)}</b></span>` : ''}
      </div>
      <div class="athlete-card-foot">
        <button type="button" class="athlete-profile-link-btn" data-athlete-query="${esc(a.name)}">
          <span>Профиль спортсмена</span>
          <strong>→</strong>
        </button>
      </div>
    </article>
  `;
}

function renderEventPodiumWidget(athletes) {
  const medalists = athletes.filter(a => a.bestRank >= 1 && a.bestRank <= 3).slice(0, 6);
  if (!medalists.length) return '';

  return `
    <section class="detail-section event-podium-section">
      <div class="event-podium-head">
        <div>
          <small>ПЬЕДЕСТАЛ ПОЧЁТА</small>
          <h2>Призёры соревнований</h2>
        </div>
        <button type="button" class="podium-view-all" data-pane="results">Все результаты (${athletes.length}) →</button>
      </div>
      <div class="event-podium-grid">
        ${medalists.map(m => `
          <div class="podium-card rank-${m.bestRank === 1 ? 'gold' : m.bestRank === 2 ? 'silver' : 'bronze'}">
            ${getResultPlaceBadgeHtml(m.bestRank)}
            <button type="button" class="athlete-name-btn" data-athlete-query="${esc(m.name)}">
              <b>${esc(m.name)}</b>
              <span class="athlete-link-icon">↗</span>
            </button>
            <div class="podium-card-sub">
              ${m.region ? `<small>${esc(m.region)}</small>` : ''}
              ${m.categoriesStr ? `<span>${esc(m.categoriesStr)}</span>` : ''}
            </div>
            ${m.bestResult ? `<div class="podium-res"><strong>${esc(m.bestResult)}</strong></div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

async function openEvent(id, initialPane = 'about', push = true, restoreScrollY = null) {
  if (!id) return;
  const cleanId = String(id).replace(/^EVT-0*/i, '') || String(id);
  const numId = Number(cleanId) || id;
  if (state.screen === 'events') {
    state.eventsScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  }
  if (push) {
    pushRoute({ screen: 'event', params: { id: numId, pane: initialPane } });
    resetScrollToTop();
  }
  state.lastEventId = numId;
  state.lastEventPane = initialPane;
  state.eventResultQuery = '';
  state.eventResultCategory = 'all';
  state.eventResultSex = 'all';
  state.eventResultAge = 'all';
  state.eventResultComplex = 'all';
  state.eventResultStanding = 'all';
  state.eventResultGroupBy = state.eventResultGroupBy || 'category';
  state.eventResultLimit = 120;

  if (state.currentEventId === numId && $('#event-detail .detail-tabs')) {
    go('event', false, restoreScrollY);
    let targetInitial = initialPane;
    if (targetInitial === 'event-media') targetInitial = 'event-photos';
    const pane = $(`.detail-tabs [data-pane="${targetInitial}"]`);
    if (pane) {
      $$('.detail-tabs button').forEach(x => x.classList.toggle('active', x === pane));
      $$('.detail-pane').forEach(x => x.classList.toggle('active', x.dataset.paneContent === targetInitial));
    }
    if (targetInitial === 'results') {
      renderEventResults();
    }
    const hashTarget = `#event/${numId}` + (initialPane && initialPane !== 'about' ? `/${initialPane}` : '');
    if (push && location.hash !== hashTarget) {
      history.pushState({ screen: 'event', id: numId, pane: initialPane }, '', hashTarget);
    } else if (location.hash !== hashTarget) {
      history.replaceState({ screen: 'event', id: numId, pane: initialPane }, '', hashTarget);
    }
    if (push) {
      resetScrollToTop();
    } else {
      const finalY = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`event/${numId}`);
      if (typeof finalY === 'number') restoreScrollPosition(finalY);
    }
    return;
  }

  state.currentEventResults = null;
  state.currentEventId = numId;
  state.currentEventPhotosHtml = '';
  state.currentEventVideosHtml = '';
  go('event', false, restoreScrollY);
  const hashTarget = `#event/${numId}` + (initialPane && initialPane !== 'about' ? `/${initialPane}` : '');
  if (push && location.hash !== hashTarget) {
    history.pushState({ screen: 'event', id: numId, pane: initialPane }, '', hashTarget);
  } else if (location.hash !== hashTarget) {
    history.replaceState({ screen: 'event', id: numId, pane: initialPane }, '', hashTarget);
  }
  $('#event-detail').innerHTML = '<div class="detail-loading">Загружаем официальные материалы…</div>';
  const base = GTO_CALENDAR_EVENTS.find(x => Number(x.id) === Number(numId));
  try {
    const [response, protocolResponse] = await Promise.all([
      fetch(`./data/events/${numId}.json?v=18`),
      fetch(`./data/results/${numId}.json?v=92`).catch(() => null),
      getVkAlbums().catch(() => null)
    ]);
    if (!response.ok) throw Error('not imported');
    const d = await response.json();
    const protocol = protocolResponse?.ok ? await protocolResponse.json() : null;
    state.currentEventResults = protocol;
    const past = isPast(base || d);
    const hasReg = Boolean((d.registrations && d.registrations.length) || d.status === 'registration' || (base && base.status === 'registration'));
    const firstRegUrl = (d.registrations && d.registrations.length) ? d.registrations[0].url : '';
    const regs = past ? '' : (d.registrations || []).map(x => `<a class="document-link reg-link" href="${safeUrl(x.url)}" target="_blank" rel="noopener"><span>${esc(x.title || 'Регистрация открыта')}</span><small>зарегистрироваться ↗</small></a>`).join('');
    const regBlock = regs ? `<section class="detail-section"><h2>Регистрация</h2>${regs}</section>` : (past ? '<section class="detail-section"><div class="event-closed">Соревнование завершено — регистрация закрыта. Смотрите результаты во вкладке «Результаты».</div></section>' : '');
    const linkedMedia = getTournamentMedia(id, base || d);
    const eventPhotos = (d.media || []).map(x => `<img loading="lazy" src="${safeImage(x)}" alt="Фото соревнования" onerror="window.__imageFallback(event)">`).join('');
    const eventAlbums = linkedMedia.albums.map(album => {
      const albumIndex = GTO_VK_ALBUMS.findIndex(x => String(x.id) === String(album.id) || (x.vkUrl && album.vkUrl && x.vkUrl === album.vkUrl));
      const idxAttr = albumIndex >= 0 ? `data-album="${albumIndex}"` : `data-pane="event-photos"`;
      return `<button class="event-media-album" ${idxAttr}><img loading="lazy" src="${safeImage(localAlbum(album).cover || album.cover)}" alt="${esc(album.title)}"><span><b>${esc(album.title)}</b><small>${esc(album.totalPhotosText)}</small></span></button>`;
    }).join('');
    const eventVideos = linkedMedia.videos.map(video => `<button class="media-card" data-video="${safeUrl(video.embedUrl)}"><div class="media-thumb-wrap">${vkImg(state.videoThumbs[video.embedUrl] || video.thumb, video.title)}<span class="media-play-icon">▶</span></div><span><b>${esc(video.title)}</b><small>${esc((video.platform || 'video').toUpperCase())}${video.duration ? ' · ' + esc(video.duration) : ''}</small></span></button>`).join('');
    const photosCount = linkedMedia.albums.length + (d.media || []).length;
    const videosCount = linkedMedia.videos.length;

    // Athletes Extraction and Podium
    const athletes = extractEventAthletes(protocol, d);
    const eventPodium = renderEventPodiumWidget(athletes);

    const hasProtocols = Boolean(protocol?.count || (d.results && d.results.length));
    const docsCount = (d.documents || []).length;
    const eventMaterialsNav = (hasReg || hasProtocols || docsCount || photosCount || videosCount) ? `
      <section class="event-materials-nav" aria-label="Разделы турнира">
        <div class="event-materials-head">
          <small>НАВИГАЦИЯ ПО ТУРНИРУ</small>
          <b>Материалы и разделы</b>
          <span>Выберите раздел для быстрого перехода</span>
        </div>
        <div class="event-materials-grid">
          ${hasReg ? `
            <button class="event-mat-card reg" data-pane="reg" type="button">
              <span class="mat-icon">📝</span>
              <span class="mat-info">
                <strong>Регистрация</strong>
                <small>${past ? 'Завершена' : 'Приём заявок открыт'}</small>
              </span>
              <b>Подать заявку →</b>
            </button>` : ''}
          ${hasProtocols ? `
            <button class="event-mat-card results" data-pane="results" type="button">
              <span class="mat-icon">📊</span>
              <span class="mat-info">
                <strong>${protocol?.count || d.results.length}</strong>
                <small>${ruPlural(protocol?.count || d.results.length, 'результат', 'результата', 'результатов')} в протоколе</small>
              </span>
              <b>Смотреть протоколы →</b>
            </button>` : ''}
          ${docsCount ? `
            <button class="event-mat-card docs" data-pane="docs" type="button">
              <span class="mat-icon">📄</span>
              <span class="mat-info">
                <strong>${docsCount}</strong>
                <small>${ruPlural(docsCount, 'документ', 'документа', 'документов')}</small>
              </span>
              <b>Документы турнира →</b>
            </button>` : ''}
          ${photosCount ? `
            <button class="event-mat-card photos" data-pane="event-photos" type="button">
              <span class="mat-icon">📷</span>
              <span class="mat-info">
                <strong>${photosCount}</strong>
                <small>${ruPlural(photosCount, 'фотоальбом', 'фотоальбома', 'фотоальбомов')}${linkedMedia.totalPhotosText ? ' · ' + linkedMedia.totalPhotosText : ''}</small>
              </span>
              <b>Смотреть фото →</b>
            </button>` : ''}
          ${videosCount ? `
            <button class="event-mat-card videos" data-pane="event-videos" type="button">
              <span class="mat-icon">▶</span>
              <span class="mat-info">
                <strong>${videosCount}</strong>
                <small>${ruPlural(videosCount, 'видеозапись', 'видеозаписи', 'видеозаписей')}</small>
              </span>
              <b>Смотреть видео →</b>
            </button>` : ''}
        </div>
      </section>` : '';

    const eventPhotosHtml = photosCount ? `
      ${linkedMedia.albums.length ? `<h2>Фотоальбомы <span class="section-count">${linkedMedia.albums.length}</span></h2><div class="event-album-list">${eventAlbums}</div>` : ''}
      ${eventPhotos ? `<h2>Фотографии турнира <span class="section-count">${(d.media || []).length}</span></h2><div class="media-grid">${eventPhotos}</div>` : ''}
    ` : `
      <div class="detail-section" style="text-align:center;padding:32px 16px;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">📷</span>
        <h2>Фотографии соревнований</h2>
        <p>Фотографии с этого старта готовятся к публикации медиа-службой ФМГТО.</p>
        <div style="margin-top:14px;"><button class="primary-action" data-go="media" data-media-tab="photo" style="height:44px;font-size:13px;"><span>Перейти в фотобанк ФМГТО</span><span>→</span></button></div>
      </div>
    `;
    state.currentEventPhotosHtml = eventPhotosHtml;

    const eventVideosHtml = videosCount ? `
      <h2>Видео и трансляции <span class="section-count">${videosCount}</span></h2>
      <div id="event-video-player-slot"></div>
      <div class="media-list">${eventVideos}</div>
    ` : `
      <div class="detail-section" style="text-align:center;padding:32px 16px;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">▶</span>
        <h2>Видеозаписи и трансляции</h2>
        <p>Видеозаписи соревнований и прямые трансляции готовятся к публикации.</p>
        <div style="margin-top:14px;"><button class="primary-action" data-go="media" data-media-tab="video" style="height:44px;font-size:13px;"><span>Перейти в видео-архив</span><span>→</span></button></div>
      </div>
    `;
    state.currentEventVideosHtml = eventVideosHtml;

    const eventAboutAlbums = linkedMedia.albums.length ? `
      <section class="detail-section">
        <h2>Фотоальбомы соревнований <span class="section-count">${linkedMedia.albums.length}</span></h2>
        <div class="event-album-list">${eventAlbums}</div>
      </section>
    ` : '';

    const eventAboutVideos = linkedMedia.videos.length ? `
      <section class="detail-section">
        <h2>Видеозаписи и трансляции <span class="section-count">${linkedMedia.videos.length}</span></h2>
        <div class="media-list">${eventVideos}</div>
      </section>
    ` : '';

    let heroLocation = d.location || base?.location || '';
    if (heroLocation.length > 80) {
      heroLocation = heroLocation.split(/[.!?]/)[0] + ' · Всероссийские соревнования';
    }

    const eventInfoSummary = `
      <section class="detail-section event-summary-passport">
        <div class="event-passport-grid">
          <div class="passport-item">
            <span class="passport-icon">📅</span>
            <div>
              <small>Сроки проведения</small>
              <b>${esc(d.period || eventYear(base || d) || '2026 год')}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">📍</span>
            <div>
              <small>Место проведения</small>
              <b>${esc(d.location || base?.location || 'Российская Федерация')}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">🏆</span>
            <div>
              <small>Статус соревнования</small>
              <b>${past ? 'Соревнование завершено' : 'Официальный старт ЕКП'}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">🏛</span>
            <div>
              <small>Реестр Минспорта РФ</small>
              <b>ВРВС № 1810001411Я</b>
            </div>
          </div>
        </div>
      </section>
    `;

    let aboutParagraphs = [];
    if (Array.isArray(d.about) && d.about.length) {
      const intro = d.about.find(s => /соревновани|турнир|описани|факт|информац/i.test(s.title || '')) || d.about[0];
      if (intro && Array.isArray(intro.paragraphs)) {
        aboutParagraphs = intro.paragraphs.filter(p => typeof p === 'string' && p.trim().length > 20 && !/^(партнер|спонсор|генеральный|согласие|политик)/i.test(p.trim())).slice(0, 2);
      }
    }
    const aboutBody = aboutParagraphs.length ? aboutParagraphs.map(p => `<p>${esc(p)}</p>`).join('')
      : (base?.description ? `<p>${esc(base.description)}</p>` : `<p>Официальные всероссийские соревнования Всероссийской федерации многоборья ГТО. В соревновании принимают участие сильнейшие атлеты и любители спорта со всех регионов России.</p>`);
    const eventAboutCard = `
      <section class="detail-section event-about-card">
        <h2>О соревновании</h2>
        ${aboutBody}
      </section>
    `;

    const isOnlineStage = Boolean(d.hasOnline === true || d.format === 'ONLINE' || d.format === 'Онлайн-турнир' || (base && (base.hasOnline === true || base.format === 'ONLINE' || base.format === 'Онлайн-турнир')));
    const heroGtoBanner = isOnlineStage ? `
      <section class="detail-section online-hero-banner" style="background:linear-gradient(135deg,rgba(56,189,248,0.12) 0%,rgba(168,85,247,0.12) 100%);border:1px solid rgba(56,189,248,0.3);border-radius:16px;padding:20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:24px">⚡</span>
          <div>
            <span style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.06em">ЕДИНАЯ ЭКОСИСТЕМА ФМГТО</span>
            <h3 style="margin:0;font-size:16px;color:#f8fafc;font-weight:800">Онлайн-турнир · Видеоотбор через «Герой ГТО»</h3>
          </div>
        </div>
        <p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin:0 0 14px">
          Для участия в данном турнире запишите соревновательный комплекс из 3 обязательных упражнений на видеокамеру через специальный таймер «Герой ГТО» и выгрузите видеопопытку в Главную судейскую коллегию.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="primary-action" data-go-herogto-tourn="${id}" style="height:42px;padding:0 18px;font-size:13px;background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px">
            <span>📹 Записать комплекс в Герой ГТО</span><span>→</span>
          </button>
          <button type="button" class="secondary-action" data-pane="results" style="height:42px;padding:0 16px;font-size:13px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
            <span>👥 Участники и протоколы</span>
          </button>
        </div>
      </section>
    ` : '';

    let resultsPaneHtml = '';
    if (protocol?.count) {
      resultsPaneHtml = tournamentResultsShell(protocol);
    } else if (d.results && d.results.length) {
      resultsPaneHtml = sectionsHtml(d.results);
    } else {
      resultsPaneHtml = `
        <div class="detail-section">
          <h2>Реестр участников и протоколы</h2>
          <div id="event-live-participants-slot">
            <div style="padding:18px 0;color:#94a3b8;font-size:13px">Загрузка реестра участников...</div>
          </div>
          ${isOnlineStage ? `
            <div style="margin-top:16px;padding:16px;background:rgba(56,189,248,0.06);border:1px dashed rgba(56,189,248,0.3);border-radius:12px">
              <b style="color:#f8fafc;display:block;margin-bottom:6px">Участвуйте в онлайн-этапе</b>
              <p style="font-size:13px;color:#94a3b8;margin:0 0 10px">Запишите видеокомплекс через мобильный таймер и отправьте судьям.</p>
              <button class="primary-action" data-go-herogto-tourn="${id}" style="height:40px;font-size:13px;">
                <span>Записать комплекс в Герой ГТО</span><span>→</span>
              </button>
            </div>
          ` : `
            <div style="margin-top:14px;">
              <button class="primary-action" data-go="athlete-search" style="height:44px;font-size:13px;">
                <span>Поиск атлетов по базе участников</span><span>→</span>
              </button>
            </div>
          `}
        </div>
      `;
    }

    const docsLinks = (d.documents || []).map(x => `<a class="document-link" href="${safeUrl(x.url)}" target="_blank" rel="noopener"><span>${esc(x.title)}</span><small>скачать ↗</small></a>`).join('');
    const docsPaneHtml = docsLinks ? `
      <div class="detail-section">
        <h2>Официальные документы турнира</h2>
        ${docsLinks}
      </div>
    ` : `
      <div class="detail-section">
        <h2>Официальные документы турнира</h2>
        <p>Специальные регламенты и положения данного старта готовятся к публикации. Вы можете ознакомиться с официальными правилами вида спорта:</p>
        <a class="document-link" href="https://gto.com.ru/data/1703837629/files/1759417287.pdf" target="_blank" rel="noopener"><span>Правила вида спорта «Многоборье ГТО»</span><small>скачать ↗</small></a>
        <a class="document-link" href="https://gto.com.ru/docs/soglasie_na_obrabotku_PD_Narodnye_igry.pdf" target="_blank" rel="noopener"><span>Политика обработки персональных данных</span><small>скачать ↗</small></a>
      </div>
    `;

    const evFormat = getEventFormat(d.format ? d : (base || d));
    const evPrograms = getEventPrograms(d.programs ? d : (base || d));

    const formatPillHtml = evFormat === 'HYBRID'
      ? '<span class="event-format-pill hybrid">⚡ Гибрид (онлайн + арена)</span>'
      : (evFormat === 'ONLINE' ? '<span class="event-format-pill online">🌐 Онлайн-турнир</span>' : '<span class="event-format-pill offline">🏟️ Очный старт</span>');

    const eventProgramsSection = `
      <section class="detail-section event-programs-showcase">
        <div class="eps-header">
          <small>ПРОГРАММЫ СОРЕВНОВАНИЙ ФМГТО</small>
          <h2>Дисциплины и программы турнира</h2>
          <p>В данном турнире участники соревнуются в следующих официальных программах Федерации:</p>
        </div>
        <div class="eps-cards">
          ${evPrograms.includes('allround') ? `
            <div class="eps-card allround">
              <div class="eps-top">
                <span class="eps-badge allround">Многоборье</span>
                <span class="eps-icon">🏅</span>
              </div>
              <h3>Многоборье ГТО</h3>
              <p>Классическое спортивное многоборье: бег, плавание, стрельба, гимнастический комплекс и полоса препятствий (ВРВС № 1810001411Я).</p>
              <div class="eps-tag">Очный зачёт · Награды ЕКП Минспорта</div>
            </div>
          ` : ''}
          ${evPrograms.includes('herogto') ? `
            <div class="eps-card herogto">
              <div class="eps-top">
                <span class="eps-badge herogto">⚡ Герой ГТО</span>
                <span class="eps-icon">📹</span>
              </div>
              <h3>Герой ГТО</h3>
              <p>Дистанционный WOD-комплекс и квалификационный отбор. Записывается на видеокамеру смартфона через встроенный видеотаймер.</p>
              <div class="eps-tag">Видеофиксация · Главная судейская коллегия</div>
              <button type="button" class="eps-btn" data-go-herogto-tourn="${id}">
                <span>Записать WOD в Герой ГТО</span><span>→</span>
              </button>
            </div>
          ` : ''}
          ${evPrograms.includes('records') ? `
            <div class="eps-card records">
              <div class="eps-top">
                <span class="eps-badge records">🏆 Рекорды</span>
                <span class="eps-icon">💪</span>
              </div>
              <h3>Иду на рекорд</h3>
              <p>Официальная попытка установления рекорда России в силовых упражнениях (рывок гири 16 кг, отжимания, подтягивания, наклон).</p>
              <div class="eps-tag">Книга рекордов России ГТО</div>
              <button type="button" class="eps-btn secondary" data-go="records">
                <span>Рекорды России</span><span>→</span>
              </button>
            </div>
          ` : ''}
        </div>
      </section>
    `;

    const regCalloutBanner = (!past && hasReg) ? `
      <section class="detail-section event-reg-callout" style="background:linear-gradient(135deg,rgba(249,115,22,0.12) 0%,rgba(234,88,12,0.18) 100%);border:1.5px solid rgba(249,115,22,0.4);border-radius:16px;padding:18px 20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:24px">📝</span>
          <div>
            <span style="font-size:11px;font-weight:700;color:#fb923c;text-transform:uppercase;letter-spacing:0.06em">ПРИЁМ ЗАЯВОК ОТКРЫТ</span>
            <h3 style="margin:0;font-size:16px;color:#fff;font-weight:800">Регистрация на соревнование</h3>
          </div>
        </div>
        <p style="font-size:13px;color:#fed7aa;line-height:1.5;margin:0 0 14px">
          Подайте официальную заявку на участие в турнире. Для прохождения квалификации запишите комплекс WOD через видеотаймер «Герой ГТО».
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${firstRegUrl ? `
            <a href="${safeUrl(firstRegUrl)}" target="_blank" rel="noopener" class="primary-action" style="height:42px;padding:0 18px;font-size:13px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px;text-decoration:none">
              <span>Подать заявку ↗</span>
            </a>
          ` : ''}
          <button type="button" class="primary-action" data-go-herogto-tourn="${id}" style="height:42px;padding:0 18px;font-size:13px;background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:700;display:inline-flex;align-items:center;gap:6px">
            <span>⚡ Видеоотбор WOD →</span>
          </button>
          <button type="button" class="secondary-action" data-pane="reg" style="height:42px;padding:0 16px;font-size:13px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
            <span>Вкладка регистрации →</span>
          </button>
        </div>
      </section>
    ` : '';

    const regPaneHtml = `
      <div class="detail-section">
        <h2>Регистрация участников турнира</h2>
        ${!past ? `
          <div class="event-reg-programs-box" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:16px">
            <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">ВЫБОР ПРОГРАММ УЧАСТИЯ</div>
            <h4 style="margin:0 0 10px;font-size:15px;color:#fff;font-weight:700">Программы соревнований для атлета:</h4>
            <div style="display:flex;flex-direction:column;gap:10px">
              <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px">
                <input type="checkbox" checked style="margin-top:3px;accent-color:#0284c7">
                <div>
                  <b style="color:#f8fafc;font-size:14px">Многоборье ГТО</b>
                  <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">Классические виды многоборья на спортивной арене</p>
                </div>
              </label>
              <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.25);border-radius:10px">
                <input type="checkbox" ${evPrograms.includes('herogto') ? 'checked' : ''} style="margin-top:3px;accent-color:#0284c7">
                <div>
                  <b style="color:#38bdf8;font-size:14px">⚡ Герой ГТО (Онлайн-отбор WOD)</b>
                  <p style="margin:2px 0 0;font-size:12px;color:#cbd5e1">Видеофиксация соревновательного комплекса с оценкой судей</p>
                </div>
              </label>
              <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.25);border-radius:10px">
                <input type="checkbox" ${evPrograms.includes('records') ? 'checked' : ''} style="margin-top:3px;accent-color:#f59e0b">
                <div>
                  <b style="color:#fbbf24;font-size:14px">🏆 Иду на рекорд</b>
                  <p style="margin:2px 0 0;font-size:12px;color:#cbd5e1">Индивидуальная заявка на рекорд турнира</p>
                </div>
              </label>
            </div>
          </div>

          <div style="background:linear-gradient(135deg,rgba(249,115,22,0.12) 0%,rgba(234,88,12,0.18) 100%);border:1.5px solid rgba(249,115,22,0.4);border-radius:14px;padding:16px;margin-bottom:16px">
            <div style="font-size:11px;font-weight:700;color:#fb923c;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">ОФИЦИАЛЬНАЯ ПОДАЧА ЗАЯВОК</div>
            <h3 style="margin:0 0 8px;font-size:15px;color:#fff;font-weight:800">Электронная форма регистрации</h3>
            <p style="font-size:13px;color:#fed7aa;line-height:1.45;margin:0 0 14px">
              Заполните официальную форму заявки на участие. Выберите категорию участия и прикрепите необходимые документы согласно регламенту соревнований.
            </p>
            ${(d.registrations || []).map(x => `
              <a class="primary-action" href="${safeUrl(x.url)}" target="_blank" rel="noopener" style="height:44px;font-size:13.5px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-weight:700;margin-bottom:8px">
                <span>📝 ${esc(x.title || 'Заполнить форму регистрации')}</span><span>↗</span>
              </a>
            `).join('')}
          </div>

          <div style="background:linear-gradient(135deg,rgba(56,189,248,0.1) 0%,rgba(168,85,247,0.1) 100%);border:1.5px solid rgba(56,189,248,0.35);border-radius:14px;padding:16px;margin-bottom:16px">
            <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">ВИДЕООТБОР И КВАЛИФИКАЦИЯ</div>
            <h3 style="margin:0 0 8px;font-size:15px;color:#fff;font-weight:800">Онлайн-этап в модуле «Герой ГТО»</h3>
            <p style="font-size:13px;color:#cbd5e1;line-height:1.45;margin:0 0 14px">
              Для подтверждения квалификации или дистанционного участия запишите соревновательный комплекс из 3 упражнений на камеру телефона через специальный таймер «Герой ГТО». Видеопопытки передаются сертифицированным судьям ФМГТО.
            </p>
            <button type="button" class="primary-action" data-go-herogto-tourn="${id}" style="width:100%;height:44px;font-size:13.5px;background:linear-gradient(135deg,#0284c7,#2563eb);color:#fff;border-radius:10px;border:none;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px">
              <span>📹 Открыть комплекс WOD в Герой ГТО</span><span>→</span>
            </button>
          </div>

          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px">
            <h4 style="margin:0 0 10px;font-size:14px;color:#f8fafc">Порядок подачи и проверки заявок:</h4>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:#94a3b8;line-height:1.6">
              <li>Заполните электронную форму заявки по кнопке выше.</li>
              <li>При наличии квалификационного отбора запишите 3 видео упражнений в модуле «Герой ГТО».</li>
              <li>Видео поступает в раздел «Видеосудейство» панели организаторов ФМГТО.</li>
              <li>После подтверждения судьями ваш статус отобразится во вкладке «Результаты».</li>
            </ol>
          </div>
        ` : `
          <div class="event-closed">Соревнование завершено — приём заявок закрыт. Итоговые протоколы доступны во вкладке «Результаты».</div>
        `}
      </div>
    `;

    $('#event-detail').innerHTML = `
      <div class="detail-hero tournament-media--hero">
        <div class="detail-hero-media">
          <img src="${safeImage(d.cover)}" alt="" onload="if(this.naturalWidth && this.naturalHeight && (this.naturalWidth/this.naturalHeight <= 1.35)) { this.classList.add('media-portrait'); const p=this.closest('.detail-hero'); if(p) p.classList.add('is-portrait'); }">
        </div>
        <div class="detail-hero-copy">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
            <time>${esc(d.period)}</time>
            ${formatPillHtml}
          </div>
          <h1 class="tournament-hero-title ${getTournamentTitleClass(d.title)}">${esc(d.title)}</h1>
          <p>${esc(heroLocation)}</p>
        </div>
      </div>
      <button class="ics-export-btn" data-event-ics="${id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Добавить в календарь (.ics)</span>
      </button>
      <div class="detail-tabs">
        <button class="active" data-pane="about">Обзор</button>
        <button data-pane="reg">Регистрация ${!past && hasReg ? '🟢' : ''}</button>
        <button data-pane="results">Результаты ${protocol?.count ? '· ' + protocol.count : (d.results && d.results.length ? '· ' + d.results.length : '')}</button>
        <button data-pane="event-photos">Фото ${photosCount ? '· ' + photosCount : ''}</button>
        <button data-pane="event-videos">Видео ${videosCount ? '· ' + videosCount : ''}</button>
        <button data-pane="docs">Документы ${docsCount ? '· ' + docsCount : ''}</button>
      </div>
      <div class="detail-pane active" data-pane-content="about">${regCalloutBanner}${eventMaterialsNav}${eventInfoSummary}${eventProgramsSection}${heroGtoBanner}${eventAboutCard}${eventAboutAlbums}${eventAboutVideos}${eventPodium}${regBlock}</div>
      <div class="detail-pane" data-pane-content="reg">${regPaneHtml}</div>
      <div class="detail-pane" data-pane-content="results">${resultsPaneHtml}</div>
      <div class="detail-pane event-photos-pane" data-pane-content="event-photos">${eventPhotosHtml}</div>
      <div class="detail-pane event-videos-pane" data-pane-content="event-videos">${eventVideosHtml}</div>
      <div class="detail-pane" data-pane-content="docs">${docsPaneHtml}</div>
      <a class="source-action" href="${safeUrl(d.sourceUrl)}" target="_blank" rel="noopener">Сверить с первоисточником <span>↗</span></a>
    `;

    const partSlot = $('#event-live-participants-slot');
    if (partSlot) {
      fetchEventParticipants(numId).then(parts => {
        if (!parts || !parts.length) {
          partSlot.innerHTML = '<div class="empty" style="padding:14px 0">Итоговые протоколы обрабатываются судейской коллегией ФМГТО.</div>';
          return;
        }
        partSlot.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">Всего атлетов в реестре: <b style="color:#38bdf8">${parts.length}</b></div>
            ${parts.map(p => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px">
                <div>
                  <b style="font-size:14px;color:#f8fafc;cursor:pointer" data-athlete="${esc(p.athlete_id)}">${esc(p.name)}</b>
                  <div style="font-size:12px;color:#94a3b8;margin-top:2px">${esc(p.region || 'Россия')} · <span style="color:#cbd5e1">${esc(p.category || 'Любители')}</span></div>
                </div>
                <div style="text-align:right;display:flex;align-items:center;gap:8px">
                  <div>
                    <strong style="color:#38bdf8;font-size:14px;display:block">${esc(p.result || '—')}</strong>
                    <small style="color:#94a3b8">${esc(p.status === 'confirmed' ? 'В протоколе' : 'Видео на судействе')}</small>
                  </div>
                  ${p.videos && p.videos.length ? `
                    <a href="${esc(p.videos[0].url)}" target="_blank" rel="noopener" style="padding:4px 8px;font-size:11px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);border-radius:6px;text-decoration:none">▶ Видео</a>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }).catch(() => {});
    }
    renderEventResults();
    let targetInitial = initialPane;
    if (targetInitial === 'event-media') targetInitial = 'event-photos';
    if (targetInitial && targetInitial !== 'about') {
      const pane = $(`.detail-tabs [data-pane="${targetInitial}"]`);
      if (pane) {
        $$('.detail-tabs button').forEach(x => x.classList.toggle('active', x === pane));
        $$('.detail-pane').forEach(x => x.classList.toggle('active', x.dataset.paneContent === targetInitial));
      }
    }
    if (push) {
      resetScrollToTop();
    } else {
      const finalY = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`event/${id}`);
      if (typeof finalY === 'number') restoreScrollPosition(finalY);
    }
  } catch (e) {
    if (!base) {
      $('#event-detail').innerHTML = '<div class="detail-error">Событие не найдено.</div>';
      return;
    }
    const st = eventStatus(base);
    const hasSrc = /gto\.com\.ru\/sorevnovaniya\/[a-z0-9]/i.test(base.url || '');
    const link = hasSrc ? base.url : 'https://gto.com.ru/sorevnovaniya/';
    const linkedMedia = getTournamentMedia(id, base);
    const eventAlbums = linkedMedia.albums.map(album => {
      const albumIndex = GTO_VK_ALBUMS.findIndex(x => String(x.id) === String(album.id) || (x.vkUrl && album.vkUrl && x.vkUrl === album.vkUrl));
      const idxAttr = albumIndex >= 0 ? `data-album="${albumIndex}"` : `data-pane="event-photos"`;
      return `<button class="event-media-album" ${idxAttr}><img loading="lazy" src="${safeImage(localAlbum(album).cover || album.cover)}" alt="${esc(album.title)}"><span><b>${esc(album.title)}</b><small>${esc(album.totalPhotosText)}</small></span></button>`;
    }).join('');
    const eventVideos = linkedMedia.videos.map(video => `<button class="media-card" data-video="${safeUrl(video.embedUrl)}"><div class="media-thumb-wrap">${vkImg(state.videoThumbs[video.embedUrl] || video.thumb, video.title)}<span class="media-play-icon">▶</span></div><span><b>${esc(video.title)}</b><small>${esc((video.platform || 'video').toUpperCase())}${video.duration ? ' · ' + esc(video.duration) : ''}</small></span></button>`).join('');
    const photosCount = linkedMedia.albums.length;
    const videosCount = linkedMedia.videos.length;
    const eventPhotosHtml = photosCount ? `<h2>Фотоальбомы <span class="section-count">${photosCount}</span></h2><div class="event-album-list">${eventAlbums}</div>` : `
      <div class="detail-section" style="text-align:center;padding:32px 16px;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">📷</span>
        <h2>Фотографии соревнований</h2>
        <p>Фотографии с этого старта готовятся к публикации медиа-службой ФМГТО.</p>
        <div style="margin-top:14px;"><button class="primary-action" data-go="media" data-media-tab="photo" style="height:44px;font-size:13px;"><span>Перейти в фотобанк ФМГТО</span><span>→</span></button></div>
      </div>
    `;
    state.currentEventPhotosHtml = eventPhotosHtml;
    const eventVideosHtml = videosCount ? `<h2>Видео и трансляции <span class="section-count">${videosCount}</span></h2><div id="event-video-player-slot"></div><div class="media-list">${eventVideos}</div>` : `
      <div class="detail-section" style="text-align:center;padding:32px 16px;">
        <span style="font-size:32px;display:block;margin-bottom:8px;">▶</span>
        <h2>Видеозаписи и трансляции</h2>
        <p>Видеозаписи соревнований и прямые трансляции готовятся к публикации.</p>
        <div style="margin-top:14px;"><button class="primary-action" data-go="media" data-media-tab="video" style="height:44px;font-size:13px;"><span>Перейти в видео-архив</span><span>→</span></button></div>
      </div>
    `;
    state.currentEventVideosHtml = eventVideosHtml;

    const eventMaterialsNav = `
      <section class="event-materials-nav" aria-label="Разделы турнира">
        <div class="event-materials-head">
          <small>НАВИГАЦИЯ ПО ТУРНИРУ</small>
          <b>Материалы и протоколы</b>
          <span>Все материалы и документы соревнований</span>
        </div>
        <div class="event-materials-grid">
          <button class="event-mat-card results" data-pane="results" type="button">
            <span class="mat-icon">📊</span>
            <span class="mat-info">
              <strong>Протоколы</strong>
              <small>Реестр результатов</small>
            </span>
            <b>Смотреть протоколы →</b>
          </button>
          <button class="event-mat-card docs" data-pane="docs" type="button">
            <span class="mat-icon">📄</span>
            <span class="mat-info">
              <strong>Документы</strong>
              <small>Положения и правила</small>
            </span>
            <b>Документы турнира →</b>
          </button>
          ${photosCount ? `
            <button class="event-mat-card photos" data-pane="event-photos" type="button">
              <span class="mat-icon">📷</span>
              <span class="mat-info">
                <strong>${photosCount}</strong>
                <small>${ruPlural(photosCount, 'фотоальбом', 'фотоальбома', 'фотоальбомов')}</small>
              </span>
              <b>Смотреть фото →</b>
            </button>` : ''}
          ${videosCount ? `
            <button class="event-mat-card videos" data-pane="event-videos" type="button">
              <span class="mat-icon">▶</span>
              <span class="mat-info">
                <strong>${videosCount}</strong>
                <small>${ruPlural(videosCount, 'видеозапись', 'видеозаписи', 'видеозаписей')}</small>
              </span>
              <b>Смотреть видео →</b>
            </button>` : ''}
        </div>
      </section>`;

    const eventInfoSummary = `
      <section class="detail-section event-summary-passport">
        <div class="event-passport-grid">
          <div class="passport-item">
            <span class="passport-icon">📅</span>
            <div>
              <small>Сроки проведения</small>
              <b>${esc(base.period || eventYear(base) || '2026 год')}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">📍</span>
            <div>
              <small>Место проведения</small>
              <b>${esc(base.location || 'Российская Федерация')}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">🏆</span>
            <div>
              <small>Статус соревнования</small>
              <b>${esc(st.label || 'Официальный старт ЕКП')}</b>
            </div>
          </div>
          <div class="passport-item">
            <span class="passport-icon">🏛</span>
            <div>
              <small>Реестр Минспорта РФ</small>
              <b>ВРВС № 1810001411Я</b>
            </div>
          </div>
        </div>
      </section>
    `;

    const eventAboutCard = `
      <section class="detail-section event-about-card">
        <h2>О соревновании</h2>
        <p>${esc(base.description || 'Официальный старт календаря соревнований Всероссийской федерации многоборья ГТО.')}</p>
      </section>
    `;

    const eventAboutAlbums = linkedMedia.albums.length ? `
      <section class="detail-section">
        <h2>Фотоальбомы соревнований <span class="section-count">${linkedMedia.albums.length}</span></h2>
        <div class="event-album-list">${eventAlbums}</div>
      </section>
    ` : '';

    const eventAboutVideos = linkedMedia.videos.length ? `
      <section class="detail-section">
        <h2>Видеозаписи и трансляции <span class="section-count">${linkedMedia.videos.length}</span></h2>
        <div class="media-list">${eventVideos}</div>
      </section>
    ` : '';

    $('#event-detail').innerHTML = `
      <div class="detail-hero tournament-media--hero">
        <div class="detail-hero-media">
          <img src="${safeImage(base.localPoster || base.poster || base.img)}" alt="" onerror="window.__imageFallback(event)" onload="if(this.naturalWidth && this.naturalHeight && (this.naturalWidth/this.naturalHeight <= 1.35)) { this.classList.add('media-portrait'); const p=this.closest('.detail-hero'); if(p) p.classList.add('is-portrait'); }">
        </div>
        <div class="detail-hero-copy">
          <time>${esc(base.period || eventYear(base) || '')}</time>
          <h1 class="tournament-hero-title ${getTournamentTitleClass(base.title)}">${esc(base.title)}</h1>
          <p>${esc(base.location || '')}</p>
        </div>
      </div>
      <button class="ics-export-btn" data-event-ics="${id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Добавить в календарь (.ics)</span>
      </button>
      <div class="detail-tabs">
        <button class="active" data-pane="about">О событии</button>
        <button data-pane="results">Результаты</button>
        <button data-pane="docs">Документы</button>
        <button data-pane="event-photos">Фото ${photosCount ? '· ' + photosCount : ''}</button>
        <button data-pane="event-videos">Видео ${videosCount ? '· ' + videosCount : ''}</button>
      </div>
      <div class="detail-pane active" data-pane-content="about">${eventMaterialsNav}${eventInfoSummary}${eventAboutCard}${eventAboutAlbums}${eventAboutVideos}</div>
      <div class="detail-pane" data-pane-content="results">
        <div class="detail-section">
          <h2>Протоколы и результаты</h2>
          <p>Итоговые протоколы этого турнира обрабатываются судейской коллегией. Вы можете найти результаты атлетов через сквозной поиск по базе.</p>
          <div style="margin-top:14px;"><button class="primary-action" data-go="athlete-search" style="height:44px;font-size:13px;"><span>Поиск атлетов по базе участников</span><span>→</span></button></div>
        </div>
      </div>
      <div class="detail-pane" data-pane-content="docs">
        <div class="detail-section">
          <h2>Официальные документы</h2>
          <a class="document-link" href="https://gto.com.ru/data/1703837629/files/1759417287.pdf" target="_blank" rel="noopener"><span>Правила вида спорта «Многоборье ГТО»</span><small>скачать ↗</small></a>
          <a class="document-link" href="https://gto.com.ru/docs/soglasie_na_obrabotku_PD_Narodnye_igry.pdf" target="_blank" rel="noopener"><span>Политика обработки персональных данных</span><small>скачать ↗</small></a>
        </div>
      </div>
      <div class="detail-pane event-photos-pane" data-pane-content="event-photos">${eventPhotosHtml}</div>
      <div class="detail-pane event-videos-pane" data-pane-content="event-videos">${eventVideosHtml}</div>
      <a class="source-action" href="${safeUrl(link)}" target="_blank" rel="noopener">${hasSrc ? 'Сверить с первоисточником' : 'Календарь на gto.com.ru'} <span>↗</span></a>
    `;
    let targetInitial = initialPane;
    if (targetInitial === 'event-media') targetInitial = 'event-photos';
    if (targetInitial && targetInitial !== 'about') {
      const pane = $(`.detail-tabs [data-pane="${targetInitial}"]`);
      if (pane) {
        $$('.detail-tabs button').forEach(x => x.classList.toggle('active', x === pane));
        $$('.detail-pane').forEach(x => x.classList.toggle('active', x.dataset.paneContent === targetInitial));
      }
    }
    if (push) {
      resetScrollToTop();
    } else {
      const finalY = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`event/${id}`);
      if (typeof finalY === 'number') restoreScrollPosition(finalY);
    }
  }
}

export function normalizeProtocolRow(row) {
  if (!row || typeof row !== 'object') return null;

  // 1. Detect and discard junk table headers parsed as rows
  const rawParticipant = (row.participant || '').trim();
  const rawTeam = (row.team || '').trim();
  const rawResult = (row.result || '').trim();
  const rawRank = String(row.rank || '').trim().toLowerCase();

  const isHeaderString = str => /^(название\s*команд|имя\s*участника|фио|спортсмен|участник|место|время|очки|балл|сумма|итоговая\s*сумма|сумма\s*мест|триатлон\s*гто)$/i.test(str.trim());

  if (isHeaderString(rawParticipant) || (rawParticipant === '' && isHeaderString(rawTeam))) {
    return null;
  }
  if (rawRank === 'место' || rawRank === 'rank') {
    return null;
  }
  if (isHeaderString(rawResult) && isHeaderString(rawTeam)) {
    return null;
  }

  // 2. Identify participant_type and clean fields
  let participantType = row.participant_type;
  let regionId = row.region_id || null;
  let teamId = row.team_id || null;
  let athleteId = row.athlete_id || null;
  let displayName = row.display_name;

  if (!participantType) {
    if (rawParticipant) {
      participantType = 'individual';
      displayName = rawParticipant;
    } else if (rawTeam) {
      const reg = normalizeRegionName(rawTeam);
      if (reg) {
        participantType = 'regional_team';
        regionId = reg;
        displayName = rawTeam;
      } else {
        participantType = 'team';
        displayName = rawTeam;
      }
    } else {
      participantType = 'individual';
      displayName = 'Не указано';
    }
  }

  if (!displayName || displayName === 'Команда' || displayName === 'Участник') {
    if (participantType === 'regional_team' && (row.region || row.team)) {
      displayName = row.region || row.team;
    } else if (rawParticipant) {
      displayName = rawParticipant;
    } else if (rawTeam && rawTeam !== 'Команда') {
      displayName = rawTeam;
    } else {
      displayName = 'Не указано';
    }
  }

  if (participantType === 'regional_team' && !regionId) {
    regionId = normalizeRegionName(displayName) || normalizeRegionName(row.team || '') || normalizeRegionName(row.region || '');
  }

  return {
    ...row,
    participant_type: participantType,
    display_name: displayName,
    region_id: regionId,
    team_id: teamId,
    athlete_id: athleteId
  };
}

function tournamentResultsShell(protocol) {
  const categories = [...new Set(protocol.results.map(x => x.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const ages = [...new Set(protocol.results.map(resultAge).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  const complexes = [...new Set(protocol.results.flatMap(resultComplexes).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  const groupBy = state.eventResultGroupBy || 'category';

  const isTeamView = state.eventResultStanding === 'team' || /команд|эстафет|сборн/i.test(state.eventResultCategory || '');

  return `<div class="tournament-results">
    <div class="result-explorer-head">
      <span>
        <b>Официальный протокол</b>
        <small>${protocol.count.toLocaleString('ru-RU')} строк · ${esc(protocol.title)}</small>
      </span>
      <div class="result-export-actions">
        <button data-results-export="csv" aria-label="Скачать результаты в CSV">CSV ↓</button>
        <button data-results-export="pdf" aria-label="Распечатать или сохранить результаты в PDF">PDF / печать</button>
      </div>
    </div>
    <div class="result-quick-filters" aria-label="Фильтры результатов">
      <div class="result-filter-group">
        <small>Зачёт</small>
        <div class="result-segments">
          <button class="${state.eventResultStanding === 'all' ? 'active' : ''}" data-result-standing="all">Весь</button>
          <button class="${state.eventResultStanding === 'individual' ? 'active' : ''}" data-result-standing="individual">Личный</button>
          <button class="${state.eventResultStanding === 'team' ? 'active' : ''}" data-result-standing="team">Командный</button>
        </div>
      </div>
      <div class="result-filter-group">
        <small>Группировка</small>
        <div class="result-segments">
          <button class="${groupBy === 'category' ? 'active' : ''}" data-result-group="category">По категориям</button>
          <button class="${groupBy === 'rank' ? 'active' : ''}" data-result-group="rank">По местам</button>
          ${complexes.length ? `<button class="${groupBy === 'complex' ? 'active' : ''}" data-result-group="complex">По комплексам</button>` : ''}
          <button class="${groupBy === 'all' ? 'active' : ''}" data-result-group="all">Все</button>
        </div>
      </div>
      <div class="result-filter-group ${isTeamView ? 'filter-disabled-team' : ''}">
        <small>Пол ${isTeamView ? '<span class="filter-note-inline">(личный)</span>' : ''}</small>
        <div class="result-segments">
          <button class="${state.eventResultSex === 'all' ? 'active' : ''}" data-result-sex="all" ${isTeamView ? 'disabled' : ''}>Все</button>
          <button class="${state.eventResultSex === 'male' ? 'active' : ''}" data-result-sex="male" ${isTeamView ? 'disabled' : ''}>Мужчины (М)</button>
          <button class="${state.eventResultSex === 'female' ? 'active' : ''}" data-result-sex="female" ${isTeamView ? 'disabled' : ''}>Женщины (Ж)</button>
        </div>
      </div>
    </div>
    <div class="result-explorer-controls">
      <label class="search">
        <span>⌕</span>
        <input id="event-result-search" type="search" value="${esc(state.eventResultQuery)}" placeholder="Фамилия, команда или регион" aria-label="Поиск по протоколу">
      </label>
      <label class="filter-pill-wrap">
        <span class="filter-pill-label">Категория</span>
        <select id="event-result-category">
          <option value="all">Все категории (${categories.length})</option>
          ${categories.map(x => `<option value="${esc(x)}" ${state.eventResultCategory === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
      </label>
      <label class="filter-pill-wrap ${isTeamView ? 'filter-disabled-team' : ''}">
        <span class="filter-pill-label">Возраст</span>
        <select id="event-result-age" ${isTeamView ? 'disabled' : ''}>
          <option value="all">${isTeamView ? 'Не применимо к командам' : `Все возрасты (${ages.length})`}</option>
          ${!isTeamView ? ages.map(x => `<option value="${esc(x)}" ${state.eventResultAge === x ? 'selected' : ''}>${esc(x)}</option>`).join('') : ''}
        </select>
      </label>
      <label class="filter-pill-wrap">
        <span class="filter-pill-label">Комплекс / дисциплина</span>
        <select id="event-result-complex">
          <option value="all">Все комплексы (${complexes.length})</option>
          ${complexes.map(x => `<option value="${esc(x)}" ${state.eventResultComplex === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
        </select>
      </label>
    </div>
    <div id="event-result-summary" class="result-line"></div>
    <div class="result-table-head" aria-hidden="true">
      <span>Место</span>
      <span>Участник / команда</span>
      <span>Результат</span>
    </div>
    <div id="event-result-list" class="event-result-list"></div>
  </div>`;
}

function resultText(row) {
  return `${row.category || ''} ${row.subgroup || ''} ${row.pageTitle || ''} ${Object.entries(row.details || {}).map(([k, v]) => `${k} ${v}`).join(' ')}`.toLowerCase();
}

function resultSex(row) {
  const text = resultText(row);
  if (/женщ|девоч|юниорок|women|female/.test(text)) return 'female';
  if (/мужчин|мальчик|юниор(?!ок)|\bmen\b|male/.test(text)) return 'male';
  return '';
}

function resultAge(row) {
  const text = `${row.subgroup || ''} ${row.category || ''} ${row.pageTitle || ''}`;
  const range = text.match(/(?:от\s*)?(\d{1,2})\s*(?:[-–—]\s*(\d{1,2})|\+|лет|года?)/i);
  if (!range) return '';
  if (/\+/.test(range[0])) return `${range[1]}+ лет`;
  return range[2] ? `${range[1]}–${range[2]} лет` : `${range[1]} лет`;
}

function resultStanding(row) {
  if (row.participant_type === 'regional_team' || row.participant_type === 'team') return 'team';
  return row.team || /команд|эстафет/.test(resultText(row)) ? 'team' : 'individual';
}

function resultComplexes(row) {
  const named = Object.keys(row.details || {}).filter(key => /^комплекс(?:\s|$)/i.test(key));
  if (named.length) return named;
  const source = `${row.category || ''} ${row.pageTitle || ''}`;
  const patterns = [['Пресс', /пресс/i], ['Подтягивания', /подтяг/i], ['Рывок гири', /рывок гир/i], ['Гонка', /гонк/i], ['День 1', /день\s*1/i], ['День 2', /день\s*2/i], ['День 3', /день\s*3/i], ['День 4', /день\s*4/i]];
  return patterns.filter(([, re]) => re.test(source)).map(([name]) => name);
}

function filteredEventResults() {
  const protocol = state.currentEventResults;
  if (!protocol || !Array.isArray(protocol.results)) return [];
  const q = (state.eventResultQuery || '').trim().toLowerCase();
  const isTeamStanding = state.eventResultStanding === 'team';
  const isIndividualStanding = state.eventResultStanding === 'individual';
  const isTeamCategory = /команд|эстафет|сборн/i.test(state.eventResultCategory || '');

  const validRows = [];
  for (const rawRow of protocol.results) {
    const row = normalizeProtocolRow(rawRow);
    if (!row) continue;

    const pType = row.participant_type || (row.participant ? 'individual' : 'team');
    const isTeamItem = pType === 'regional_team' || pType === 'team';

    if (isTeamStanding && !isTeamItem) continue;
    if (isIndividualStanding && isTeamItem) continue;

    if (state.eventResultCategory !== 'all' && row.category !== state.eventResultCategory) {
      continue;
    }

    // Gender filter: only apply to individual participants
    if (!isTeamItem && !isTeamCategory && state.eventResultSex !== 'all') {
      const sex = resultSex(row);
      if (sex && sex !== state.eventResultSex) continue;
    }

    // Age filter: only apply to individual participants
    if (!isTeamItem && !isTeamCategory && state.eventResultAge !== 'all') {
      const age = resultAge(row);
      if (age && age !== state.eventResultAge) continue;
    }

    if (state.eventResultStanding !== 'all' && resultStanding(row) !== state.eventResultStanding) {
      continue;
    }

    if (state.eventResultComplex !== 'all') {
      if (!resultComplexes(row).includes(state.eventResultComplex)) continue;
    }

    if (q) {
      const dName = (row.display_name || '').toLowerCase();
      const pName = (row.participant || '').toLowerCase();
      const tName = (row.team || '').toLowerCase();
      const rName = (row.region || '').toLowerCase();
      const cName = (row.category || '').toLowerCase();
      const sName = (row.subgroup || '').toLowerCase();
      const detailsStr = Object.values(row.details || {}).join(' ').toLowerCase();
      const haystack = `${dName} ${pName} ${tName} ${rName} ${cName} ${sName} ${detailsStr}`;
      if (!haystack.includes(q)) continue;
    }

    validRows.push(row);
  }

  return validRows;
}

export function sortProtocolRows(a, b) {
  const rankA = parseRank(a.rank);
  const rankB = parseRank(b.rank);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  const numA = parseFloat(String(a.result || '').replace(',', '.').replace(/[^\d.]/g, ''));
  const numB = parseFloat(String(b.result || '').replace(',', '.').replace(/[^\d.]/g, ''));
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    if (String(a.result || '').includes(':')) {
      return numA - numB;
    }
    return numB - numA;
  }
  const nameA = a.display_name || a.participant || a.team || '';
  const nameB = b.display_name || b.participant || b.team || '';
  return nameA.localeCompare(nameB, 'ru');
}

function updateResultFiltersState() {
  const isTeamView = state.eventResultStanding === 'team' || /команд|эстафет|сборн/i.test(state.eventResultCategory || '');
  const sexGroup = document.querySelector('[data-result-sex]')?.closest('.result-filter-group');
  if (sexGroup) {
    sexGroup.classList.toggle('filter-disabled-team', isTeamView);
    $$('[data-result-sex]').forEach(btn => {
      btn.disabled = isTeamView;
    });
  }
  const ageWrap = $('#event-result-age')?.closest('.filter-pill-wrap');
  const ageSelect = $('#event-result-age');
  if (ageWrap && ageSelect) {
    ageWrap.classList.toggle('filter-disabled-team', isTeamView);
    ageSelect.disabled = isTeamView;
  }
}

function eventResultCardHtml(rawRow) {
  const row = normalizeProtocolRow(rawRow);
  if (!row) return '';

  const pType = row.participant_type || 'individual';
  const displayName = row.display_name || row.participant || row.team || 'Не указано';
  const regionName = row.region || '';
  const numRank = parseRank(row.rank);

  let rankCls = '';
  if (numRank === 1) rankCls = 'rank-gold';
  else if (numRank === 2) rankCls = 'rank-silver';
  else if (numRank === 3) rankCls = 'rank-bronze';

  const details = Object.entries(row.details || {}).filter(([key, value]) => value && !/^(фамилия|имя|регион|место)$/i.test(key));
  const meta = details.filter(([key]) => /^(категория|возраст|пол|возрастная группа)$/i.test(key) || !key).slice(0, 4);
  const metrics = details.filter(([key]) => key && !/^(категория|возраст|пол|возрастная группа)$/i.test(key));
  const category = row.category && row.category !== row.pageTitle && !/^результаты$/i.test(row.category) ? row.category : '';

  const seenValues = new Set();
  const badges = [];
  if (category) {
    seenValues.add(category.toLowerCase().trim());
    badges.push([category, '']);
  }
  for (const [key, value] of meta) {
    const valClean = String(value).toLowerCase().trim();
    if (!seenValues.has(valClean)) {
      seenValues.add(valClean);
      badges.push([value, key]);
    }
  }
  const subgroupClean = row.subgroup ? String(row.subgroup).toLowerCase().trim() : '';
  const subgroupBadge = (row.subgroup && !seenValues.has(subgroupClean)) 
    ? `<span>${esc(row.subgroup)}</span>` 
    : '';

  // Extract complexes breakdown for prominent athletic display
  const complexDetails = Object.entries(row.details || {}).filter(([k, v]) => {
    if (!v) return false;
    const lk = k.toLowerCase();
    return lk.includes('комплекс') || lk.includes('сила') || lk.includes('вынослив') || lk.includes('гимнаст') || lk.includes('бег') || lk.includes('wod') || lk.includes('забег') || lk.includes('повторен') || lk.includes('вес') || lk.includes('тур2');
  });

  const complexChips = complexDetails.length ? `
    <div class="result-complex-chips">
      ${complexDetails.slice(0, 4).map(([k, v]) => `
        <span class="complex-chip">
          <span class="chip-name">${esc(k.replace(/^комплекс\s*/i, 'К: ').replace(/[«»]/g, ''))}</span>
          <b class="chip-val">${esc(v)}</b>
        </span>
      `).join('')}
    </div>
  ` : '';

  const placeBadgeHtml = getResultPlaceBadgeHtml(row.rank);

  // Type badge and entity CTA configuration
  let typeBadgeHtml = '';
  let entityTitleHtml = '';
  let subtitleHtml = '';
  let ctaButtonHtml = '';

  if (pType === 'regional_team') {
    const regId = row.region_id || normalizeRegionName(displayName) || normalizeRegionName(regionName);
    typeBadgeHtml = '<span class="result-type-badge type-regional-team">Сборная региона</span>';
    entityTitleHtml = regId
      ? `<button type="button" class="region-name-btn" data-open-region="${esc(regId)}"><b>${esc(displayName)}</b><span class="athlete-link-icon">↗</span></button>`
      : `<b class="region-title-text">${esc(displayName)}</b>`;
    subtitleHtml = regionName && regionName !== displayName ? `<small>${esc(regionName)}</small>` : '<small>Командный зачёт региона</small>';
    ctaButtonHtml = regId
      ? `<button type="button" class="region-profile-btn" data-open-region="${esc(regId)}">Регион <span>→</span></button>`
      : '<small class="result-type-note">Сборная субъекта РФ</small>';
  } else if (pType === 'team') {
    typeBadgeHtml = '<span class="result-type-badge type-team">Команда</span>';
    entityTitleHtml = `<b class="team-title-text">${esc(displayName)}</b>`;
    subtitleHtml = regionName ? `<small>${esc(regionName)}</small>` : '<small>Командный зачёт</small>';
    ctaButtonHtml = `<span class="result-team-badge">Командный зачёт</span>`;
  } else {
    // individual
    typeBadgeHtml = '<span class="result-type-badge type-individual">Атлет</span>';
    entityTitleHtml = `<button type="button" class="athlete-name-btn" data-athlete-query="${esc(displayName)}"><b>${esc(displayName)}</b><span class="athlete-link-icon">↗</span></button>`;
    subtitleHtml = regionName ? `<small>${esc(regionName)}</small>` : (row.team ? `<small>${esc(row.team)}</small>` : '');
    ctaButtonHtml = `<button type="button" class="athlete-profile-btn" data-athlete-query="${esc(displayName)}">Профиль атлета <span>→</span></button>`;
  }

  return `<article class="event-result-card ${rankCls} result-type-${pType}">
    <div class="event-result-card-top">
      <div class="result-rank-slot">
        ${placeBadgeHtml}
      </div>
      <div class="result-person">
        <div class="result-person-head">
          ${typeBadgeHtml}
        </div>
        ${entityTitleHtml}
        ${subtitleHtml}
      </div>
      ${row.result ? `<div class="result-score"><small>Результат</small><strong>${esc(row.result)}</strong></div>` : ''}
    </div>
    ${badges.length || subgroupBadge ? `<div class="result-chips-row">${badges.map(([value]) => `<span class="result-chip">${esc(value)}</span>`).join('')}${subgroupBadge ? `<span class="result-chip">${esc(row.subgroup)}</span>` : ''}</div>` : ''}
    ${complexChips}
    <div class="result-actions">
      ${metrics.length ? `<details class="result-details"><summary>Все показатели (${metrics.length})</summary><dl>${metrics.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></details>` : '<span></span>'}
      ${ctaButtonHtml}
    </div>
  </article>`;
}

function renderEventResults() {
  const protocol = state.currentEventResults;
  const list = $('#event-result-list');
  if (!protocol || !list) return;

  updateResultFiltersState();

  const filtered = filteredEventResults();
  const limit = state.eventResultLimit || 120;
  const shown = state.eventResultPrintAll ? filtered : filtered.slice(0, limit);
  const isTeamView = state.eventResultStanding === 'team' || /команд|эстафет|сборн/i.test(state.eventResultCategory || '');
  const countWord = isTeamView ? ruPlural(filtered.length, 'команда', 'команды', 'команд') : ruPlural(filtered.length, 'участник', 'участника', 'участников');
  
  $('#event-result-summary').innerHTML = `
    <span>Найдено: <b>${filtered.length.toLocaleString('ru-RU')}</b> ${countWord}</span>
    <small>${filtered.length > shown.length ? `показано ${shown.length} из ${filtered.length}` : 'все строки'}</small>
  `;

  if (!filtered.length) {
    list.innerHTML = '<div class="empty">В этой категории совпадений нет. Измените запрос или сбросьте фильтр.</div>';
    return;
  }

  const groupBy = state.eventResultGroupBy || 'category';
  let html = '';

  if (groupBy === 'category') {
    const groups = new Map();
    shown.forEach(row => {
      const cat = row.category || row.pageTitle || 'Основной зачёт';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(row);
    });

    for (const [catName, rows] of groups) {
      rows.sort(sortProtocolRows);
      const isTeamCat = /команд|эстафет|сборн/i.test(catName);
      const groupCountWord = isTeamCat ? ruPlural(rows.length, 'команда', 'команды', 'команд') : ruPlural(rows.length, 'участник', 'участника', 'участников');
      html += `
        <div class="result-group-header">
          <div class="result-group-title">
            <span class="result-group-tag">Категория</span>
            <h3>${esc(catName)}</h3>
          </div>
          <span class="result-group-count">${rows.length} ${groupCountWord}</span>
        </div>
        ${rows.map(eventResultCardHtml).join('')}
      `;
    }
  } else if (groupBy === 'rank') {
    const sorted = [...shown].sort(sortProtocolRows);
    const tiers = [
      { id: 'p1', title: '🥇 Победители (1 место)', tag: 'Золото', filter: r => parseRank(r.rank) === 1 },
      { id: 'p2', title: '🥈 Серебряные призёры (2 место)', tag: 'Серебро', filter: r => parseRank(r.rank) === 2 },
      { id: 'p3', title: '🥉 Бронзовые призёры (3 место)', tag: 'Бронза', filter: r => parseRank(r.rank) === 3 },
      { id: 'top10', title: 'Топ-10 участников (4–10 места)', tag: 'Топ-10', filter: r => { const n = parseRank(r.rank); return n >= 4 && n <= 10; } },
      { id: 'rest', title: 'Участники турнира (11+ места)', tag: 'Зачёт', filter: r => { const n = parseRank(r.rank); return n > 10 && n < 999999; } },
      { id: 'norank', title: 'Без места в протоколе', tag: 'Протокол', filter: r => parseRank(r.rank) >= 999999 }
    ];

    for (const tier of tiers) {
      const tierRows = sorted.filter(tier.filter);
      if (tierRows.length) {
        html += `
          <div class="result-group-header">
            <div class="result-group-title">
              <span class="result-group-tag">${esc(tier.tag)}</span>
              <h3>${esc(tier.title)}</h3>
            </div>
            <span class="result-group-count">${tierRows.length} ${ruPlural(tierRows.length, 'участник', 'участника', 'участников')}</span>
          </div>
          ${tierRows.map(eventResultCardHtml).join('')}
        `;
      }
    }
  } else if (groupBy === 'complex') {
    const complexes = [...new Set(filtered.flatMap(resultComplexes).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
    if (complexes.length) {
      for (const comp of complexes) {
        const compRows = shown.filter(r => resultComplexes(r).includes(comp));
        if (compRows.length) {
          compRows.sort(sortProtocolRows);
          html += `
            <div class="result-group-header">
              <div class="result-group-title">
                <span class="result-group-tag">Комплекс</span>
                <h3>${esc(comp)}</h3>
              </div>
              <span class="result-group-count">${compRows.length} ${ruPlural(compRows.length, 'участник', 'участника', 'участников')}</span>
            </div>
            ${compRows.map(eventResultCardHtml).join('')}
          `;
        }
      }
    } else {
      const sorted = [...shown].sort(sortProtocolRows);
      html += `
        <div class="result-group-header">
          <div class="result-group-title">
            <span class="result-group-tag">Общий зачёт</span>
            <h3>Итоговые результаты турнира</h3>
          </div>
          <span class="result-group-count">${sorted.length} ${ruPlural(sorted.length, 'участник', 'участника', 'участников')}</span>
        </div>
        ${sorted.map(eventResultCardHtml).join('')}
      `;
    }
  } else {
    const sorted = [...shown].sort(sortProtocolRows);
    html = sorted.map(eventResultCardHtml).join('');
  }

  if (filtered.length > shown.length && !state.eventResultPrintAll) {
    const remain = filtered.length - shown.length;
    html += `<button class="load-more-results" data-results-more="true">Показать ещё ${Math.min(remain, 120)} из ${remain} оставшихся ↓</button>`;
  }

  list.innerHTML = html;
}

function exportEventResultsCsv() {
  const protocol = state.currentEventResults;
  const rows = filteredEventResults();
  if (!protocol || !rows.length) return;
  const detailKeys = [...new Set(rows.flatMap(row => Object.keys(row.details || {})))];
  const columns = ['Место', 'Участник', 'Команда', 'Регион', 'Пол', 'Возраст', 'Зачёт', 'Категория', 'Подгруппа', 'Результат', ...detailKeys];
  const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const data = [columns, ...rows.map(row => [row.rank, row.participant, row.team, row.region, resultSex(row) === 'female' ? 'Женщины' : resultSex(row) === 'male' ? 'Мужчины' : '', resultAge(row), resultStanding(row) === 'team' ? 'Командный' : 'Личный', row.category, row.subgroup, row.result, ...detailKeys.map(key => row.details?.[key] || '')])];
  const blob = new Blob(['\ufeff' + data.map(line => line.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gto-results-${protocol.eventId || 'tournament'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printEventResults() {
  state.eventResultPrintAll = true;
  renderEventResults();
  document.body.classList.add('printing-results');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-results');
    state.eventResultPrintAll = false;
    renderEventResults();
  }, 800);
}

function articleBody(item) {
  const doc = new DOMParser().parseFromString(item.fullContentHtml || `<p>${esc(item.text)}</p>`, 'text/html');
  const blocks = [];
  doc.body.querySelectorAll('p,li,img').forEach(node => {
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (/^https:\/\/gto\.com\.ru\//.test(src)) blocks.push(`<img loading="lazy" src="${safeImage(src)}" alt="">`);
    } else {
      const value = clean(node.textContent);
      if (value) blocks.push(node.tagName === 'LI' ? `<li>${esc(value)}</li>` : `<p>${esc(value)}</p>`);
    }
  });
  return blocks.join('') || `<p>${esc(item.text)}</p>`;
}

function openArticle(id, push = true, restoreScrollY = null) {
  const newsList = getUnifiedNews();
  const idStr = String(id);
  const item = newsList.find(x => String(x.id) === idStr);
  if (!item) return;
  if (push) {
    pushRoute({ screen: 'article', params: { id: idStr } });
  }
  go('article', false, restoreScrollY);
  const hashTarget = `#article/${idStr}`;
  if (push && location.hash !== hashTarget) {
    history.pushState({ screen: 'article', id: idStr }, '', hashTarget);
  } else if (location.hash !== hashTarget) {
    history.replaceState({ screen: 'article', id: idStr }, '', hashTarget);
  }
  $('#article-detail').innerHTML = `<div class="article-hero"><img src="${safeImage(item.img)}" alt="" onerror="window.__imageFallback(event)"><div><time>${esc(item.date)}</time><h1>${esc(item.title)}</h1></div></div><div class="article-body">${articleBody(item)}</div><a class="source-action" href="${safeUrl(item.url)}" target="_blank" rel="noopener">Оригинал публикации <span>↗</span></a>`;
  if (typeof restoreScrollY === 'number') {
    restoreScrollPosition(restoreScrollY);
  }
}

export function formatNewsType(t) {
  if (t === 'announcement') return 'Анонс';
  if (t === 'event_report') return 'Итоги соревнований';
  if (t === 'official') return 'Официально';
  return 'Новость';
}

let newsFiltersInitialized = false;
export function setupNewsFilters() {
  const newsList = getUnifiedNews();
  const yearSelect = $('#news-year-filter');
  const eventSelect = $('#news-event-filter');
  const typeSelect = $('#news-type-filter');

  if (yearSelect && (yearSelect.options.length <= 1 || !newsFiltersInitialized)) {
    const years = [...new Set(newsList.map(n => {
      if (n.publicationDate) return n.publicationDate.slice(0, 4);
      if (n.date) {
        const m = n.date.match(/\d{4}/);
        if (m) return m[0];
      }
      return null;
    }).filter(Boolean))].sort((a, b) => b - a);
    yearSelect.innerHTML = `<option value="all">Все годы</option>${years.map(y => `<option value="${y}">${y}</option>`).join('')}`;
    if (state.newsYear) yearSelect.value = state.newsYear;
  }

  if (eventSelect && (eventSelect.options.length <= 1 || !newsFiltersInitialized)) {
    const eventIdsWithNews = new Set();
    newsList.forEach(n => {
      if (n.eventId) eventIdsWithNews.add(String(n.eventId));
    });
    const evOptions = [];
    eventIdsWithNews.forEach(evId => {
      const ev = GTO_CALENDAR_EVENTS.find(e => String(e.id) === String(evId));
      if (ev) {
        evOptions.push({ id: evId, title: ev.title, year: eventYear(ev) });
      }
    });
    evOptions.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, 'ru'));
    eventSelect.innerHTML = `<option value="all">Все турниры</option>${evOptions.map(o => `<option value="${o.id}">${esc(o.title)}</option>`).join('')}`;
    if (state.newsEvent) eventSelect.value = state.newsEvent;
  }

  if (typeSelect && state.newsType) {
    typeSelect.value = state.newsType;
  }

  if (!newsFiltersInitialized) {
    newsFiltersInitialized = true;
    yearSelect?.addEventListener('change', e => {
      state.newsDisplayLimit = 20;
      state.newsYear = e.target.value;
      renderNews();
    });
    typeSelect?.addEventListener('change', e => {
      state.newsDisplayLimit = 20;
      state.newsType = e.target.value;
      renderNews();
    });
    eventSelect?.addEventListener('change', e => {
      state.newsDisplayLimit = 20;
      state.newsEvent = e.target.value;
      renderNews();
    });
    $('#news-reset-filters')?.addEventListener('click', () => {
      resetNewsFilters();
    });
  }
}

export function updateNewsActiveChips() {
  const bar = $('#news-active-bar');
  const container = $('#news-active-chips');
  if (!bar || !container) return;

  const chips = [];
  if (state.newsYear && state.newsYear !== 'all') {
    chips.push({ key: 'year', label: `Год: ${state.newsYear}` });
  }
  if (state.newsType && state.newsType !== 'all') {
    chips.push({ key: 'type', label: `Тип: ${formatNewsType(state.newsType)}` });
  }
  if (state.newsEvent && state.newsEvent !== 'all') {
    const ev = GTO_CALENDAR_EVENTS.find(e => String(e.id) === String(state.newsEvent));
    const evTitle = ev ? ev.title : `Турнир #${state.newsEvent}`;
    chips.push({ key: 'event', label: `Турнир: ${evTitle.slice(0, 25)}${evTitle.length > 25 ? '...' : ''}` });
  }
  if (state.newsQuery) {
    chips.push({ key: 'query', label: `Поиск: «${state.newsQuery}»` });
  }

  if (chips.length > 0) {
    bar.style.display = 'flex';
    container.innerHTML = chips.map(c => `
      <span class="active-chip" data-news-chip="${c.key}">
        <span>${esc(c.label)}</span>
        <span class="active-chip-remove" aria-label="Удалить фильтр">✕</span>
      </span>
    `).join('');
  } else {
    bar.style.display = 'none';
    container.innerHTML = '';
  }
}

export function resetNewsFilters() {
  state.newsYear = 'all';
  state.newsType = 'all';
  state.newsEvent = 'all';
  state.newsQuery = '';
  state.newsDisplayLimit = 20;
  const sInput = $('#news-search');
  if (sInput) sInput.value = '';
  const ySel = $('#news-year-filter');
  if (ySel) ySel.value = 'all';
  const tSel = $('#news-type-filter');
  if (tSel) tSel.value = 'all';
  const eSel = $('#news-event-filter');
  if (eSel) eSel.value = 'all';
  renderNews();
}

function renderNews() {
  const q = (state.newsQuery || '').toLowerCase();
  const newsList = getUnifiedNews();
  const items = newsList.filter(x => {
    if (state.newsYear && state.newsYear !== 'all') {
      const yr = x.publicationDate ? x.publicationDate.slice(0, 4) : (x.date ? x.date.match(/\d{4}/)?.[0] : null);
      if (String(yr) !== String(state.newsYear)) return false;
    }
    if (state.newsType && state.newsType !== 'all') {
      const ct = x.contentType || 'news';
      if (ct !== state.newsType) return false;
    }
    if (state.newsEvent && state.newsEvent !== 'all') {
      if (String(x.eventId) !== String(state.newsEvent)) return false;
    }
    if (q) {
      const haystack = `${x.title || ''} ${x.text || ''} ${x.date || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  state.newsDisplayLimit = state.newsDisplayLimit || 20;
  const totalNews = items.length;
  const visibleNews = items.slice(0, state.newsDisplayLimit);

  const countEl = $('#news-count');
  if (countEl) {
    countEl.textContent = `${totalNews} публикаций${totalNews > visibleNews.length ? ` (показано ${visibleNews.length})` : ''}`;
  }

  updateNewsActiveChips();

  let loadMoreHtml = '';
  if (totalNews > visibleNews.length) {
    const remaining = totalNews - visibleNews.length;
    const chunk = Math.min(20, remaining);
    loadMoreHtml = `<button type="button" class="load-more" id="news-load-more">Показать ещё ${chunk} (осталось ${remaining})</button>`;
  }

  const listEl = $('#news-list');
  if (listEl) {
    listEl.innerHTML = visibleNews.length ? visibleNews.map(x => `
      <button class="news-card" data-article="${x.id}">
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <time>${esc(x.date)}</time>
            ${x.contentType && x.contentType !== 'news' ? `<span class="event-fmt-badge" style="font-size:10px;padding:2px 6px;">${esc(formatNewsType(x.contentType))}</span>` : ''}
          </div>
          <b>${esc(x.title)}</b>
          <p>${esc(x.text)}</p>
        </div>
        <img loading="lazy" src="${safeImage(x.img)}" alt="" onerror="window.__imageFallback(event)">
      </button>
    `).join('') + loadMoreHtml : `
      <div class="empty" style="text-align:center;padding:32px 16px;">
        <p style="font-weight:600;font-size:15px;margin-bottom:8px;color:#fff;">Новостей по выбранным фильтрам не найдено</p>
        <p style="font-size:13px;color:#94a3b8;margin-bottom:16px;">Попробуйте выбрать другой год или сбросить фильтры</p>
        <button type="button" class="reset-filters-btn" id="news-empty-reset" style="margin:0 auto;display:inline-flex;padding:8px 16px;font-size:13px;">✕ Сбросить все фильтры</button>
      </div>
    `;
  }
}


function setupRecordFilters() {
  const allRecs = getUnifiedRecords();
  const ages = [...new Set(allRecs.map(x => clean(x.ageGroup || x.age)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  const disciplines = [...new Set(allRecs.map(x => clean(x.discipline || x.ex)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  $('#record-age').innerHTML = '<option value="all">Все возрасты</option>' + ages.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('#record-discipline').innerHTML = '<option value="all">Все дисциплины</option>' + disciplines.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
}

const eventByTitleCache = new Map();
export function findEventByTitleOrRecord(eventTitle) {
  if (!eventTitle) return null;
  const t = String(eventTitle).toLowerCase().trim();
  if (eventByTitleCache.has(t)) return eventByTitleCache.get(t);
  let found = GTO_CALENDAR_EVENTS.find(e => e.title && e.title.toLowerCase().trim() === t);
  if (found) {
    eventByTitleCache.set(t, found);
    return found;
  }
  found = GTO_CALENDAR_EVENTS.find(e => e.title && (e.title.toLowerCase().includes(t) || t.includes(e.title.toLowerCase())));
  if (found) {
    eventByTitleCache.set(t, found);
    return found;
  }
  const words = t.replace(/[«»"'\-—–.,]/g, ' ').split(/\s+/).filter(w => w.length >= 4);
  if (words.length) {
    found = GTO_CALENDAR_EVENTS.find(e => {
      const et = (e.title || '').toLowerCase();
      return words.filter(w => et.includes(w)).length >= Math.min(2, words.length);
    });
  }
  const result = found || null;
  eventByTitleCache.set(t, result);
  return result;
}

export function renderUnifiedRecordCard(x, opts = {}) {
  if (!x) return '';
  const recId = x.id || (GTO_RECORDS.find(r => r.holder === x.holder && r.discipline === x.discipline)?.id) || '';
  const discipline = x.discipline || 'Многоборье ГТО';
  const result = x.result || x.record || '';
  const holder = x.holder || x.name || 'Рекордсмен';
  const city = x.city || opts.defaultCity || '';
  const event = x.event || x.tournament || '';
  const sex = x.sex || '';
  const sexLabel = sex === 'W' ? 'Женщины' : (sex === 'M' ? 'Мужчины' : '');
  const ageGroup = x.ageGroup || x.age_group || '';

  const metaParts = [sexLabel, ageGroup, city].filter(Boolean);
  const metaString = metaParts.join(' • ');

  let athleteId = x.athleteId || x.athlete_id || null;
  if (!athleteId && state.athleteIndex && state.athleteIndex.length) {
    const match = findAthleteByName(holder);
    if (match) athleteId = match.id;
  }

  let eventId = x.eventId || x.event_id || null;
  if (!eventId && event) {
    const evMatch = findEventByTitleOrRecord(event);
    if (evMatch) eventId = evMatch.id;
  }

  const recJson = esc(JSON.stringify({
    type: 'record',
    id: recId,
    holder,
    discipline,
    result,
    sex,
    age: ageGroup,
    city,
    event
  }));

  return `
    <article class="record-card unified-record-card" data-record-id="${recId}" data-share-data="${recJson}" tabindex="0" role="button" aria-label="Рекорд: ${esc(discipline)} — ${esc(holder)}">
      <div class="urc-header">
        <div class="urc-disc-wrap">
          <span class="urc-icon" aria-hidden="true">${disciplineIcon(discipline)}</span>
          <span class="urc-discipline">${esc(discipline)}</span>
        </div>
        <span class="urc-head-arrow" aria-hidden="true">→</span>
      </div>

      <div class="urc-result-row">
        <strong class="urc-value">${esc(result)}</strong>
        <span class="urc-status-badge">🥇 Рекорд России</span>
      </div>

      <div class="urc-athlete-section">
        <button type="button" class="urc-athlete-btn rrc-athlete-btn" data-record-athlete="${esc(holder)}" ${athleteId ? `data-athlete-id="${athleteId}"` : ''} title="Открыть профиль спортсмена">
          <b class="urc-athlete-name">${esc(holder)}</b>
          <span class="urc-link-arrow" aria-hidden="true">↗</span>
        </button>
        ${metaString ? `<div class="urc-meta-line text-wrap-safe">${esc(metaString)}</div>` : ''}
      </div>

      ${event ? `
        <div class="urc-event-row">
          <button type="button" class="urc-event-btn rrc-event-btn" data-record-event="${esc(event)}" ${eventId ? `data-event-id="${eventId}"` : ''} title="Открыть турнир">
            <span class="urc-event-icon" aria-hidden="true">🏆</span>
            <span class="urc-event-name">${esc(event)}</span>
            <span class="urc-link-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      ` : ''}

      <div class="urc-footer">
        <span class="urc-more-link">Подробнее <span class="urc-arrow" aria-hidden="true">→</span></span>
      </div>
    </article>
  `;
}

export function renderRecordDetailScreen(rec) {
  const container = $('#record-detail-container');
  if (!container || !rec) return;

  const holder = rec.holder || 'Рекордсмен';
  const discipline = rec.discipline || 'Многоборье ГТО';
  const result = rec.result || rec.record || '';
  const city = rec.city || 'Россия';
  const event = rec.event || 'Официальный старт Федерации';
  const ageGroup = rec.ageGroup || rec.age_group || 'Без ограничений';
  const sex = rec.sex === 'W' ? 'Женщины' : (rec.sex === 'M' ? 'Мужчины' : 'Не указан');

  let athleteMatch = null;
  if (state.athleteIndex) {
    athleteMatch = findAthleteByName(holder);
  }

  let eventMatch = findEventByTitleOrRecord(event);
  const regId = normalizeRegionName(`${city} ${event}`);
  const regionMatch = regId ? getRegionById(regId) : null;

  const allRecs = getUnifiedRecords();
  const relatedRecords = allRecs.filter(r => (r.discipline === rec.discipline || r.ex === rec.discipline) && String(r.id) !== String(rec.id)).slice(0, 3);

  container.innerHTML = `
    <div class="record-detail-hero-card">
      <div class="rd-status-pill">
        <span>🥇 Официальный рекорд России</span>
      </div>
      <div class="rd-val">${esc(result)}</div>
      <h1 class="rd-disc">${esc(discipline)}</h1>
      <div class="rd-actions-row">
        <button type="button" class="rd-action-btn" data-record-athlete="${esc(holder)}" ${athleteMatch ? `data-athlete-id="${athleteMatch.id}"` : ''}>
          <span>Профиль спортсмена: <b>${esc(holder)}</b></span>
          <span>→</span>
        </button>
        ${eventMatch ? `
          <button type="button" class="rd-action-btn secondary" data-record-event="${esc(event)}" data-event-id="${eventMatch.id}">
            <span>Турнир: <b>${esc(eventMatch.title)}</b></span>
            <span>→</span>
          </button>
        ` : (event ? `
          <button type="button" class="rd-action-btn secondary" data-record-event="${esc(event)}">
            <span>Турнир: <b>${esc(event)}</b></span>
            <span>→</span>
          </button>
        ` : '')}
      </div>
    </div>

    <div class="detail-section">
      <h2>Параметры и регистрация рекорда</h2>
      <div class="record-detail-grid">
        <div class="rd-card-item">
          <span class="rd-label">Спортсмен</span>
          <span class="rd-text">${esc(holder)}</span>
        </div>
        <div class="rd-card-item">
          <span class="rd-label">Результат</span>
          <span class="rd-text" style="color:#f59e0b;font-weight:700;">${esc(result)}</span>
        </div>
        <div class="rd-card-item">
          <span class="rd-label">Пол</span>
          <span class="rd-text">${esc(sex)}</span>
        </div>
        <div class="rd-card-item">
          <span class="rd-label">Возрастная категория</span>
          <span class="rd-text">${esc(ageGroup)}</span>
        </div>
        <div class="rd-card-item">
          <span class="rd-label">Регион / Город</span>
          <span class="rd-text">${esc(city)}</span>
        </div>
        <div class="rd-card-item">
          <span class="rd-label">Место проведения</span>
          <span class="rd-text">${esc(eventMatch?.city || city || 'Россия')}</span>
        </div>
        <div class="rd-card-item" style="grid-column: 1 / -1;">
          <span class="rd-label">Официальный турнир</span>
          <span class="rd-text">${esc(event)}</span>
        </div>
        <div class="rd-card-item" style="grid-column: 1 / -1;">
          <span class="rd-label">Статус</span>
          <span class="rd-text" style="color:#31c987;">Действующий рекорд России · Утверждён судейской коллегией Федерации многоборья ГТО</span>
        </div>
      </div>
    </div>

    ${regionMatch ? `
      <div class="detail-section">
        <h2>Регион рекорда</h2>
        <p>Рекорд установлен атлетом, представляющим <b>${esc(regionMatch.name)}</b>.</p>
        <button class="primary-action" data-open-region="${regionMatch.id}" style="height:44px;font-size:13px;margin-top:10px;">
          <span>Открыть карту и рекорды региона</span>
          <span>→</span>
        </button>
      </div>
    ` : ''}

    ${relatedRecords.length ? `
      <div class="region-section-block" style="margin-top:10px;">
        <div class="region-section-head">
          <h3>Другие рекорды в этой дисциплине (${relatedRecords.length})</h3>
        </div>
        <div class="region-records-grid">
          ${relatedRecords.map(r => renderUnifiedRecordCard(r)).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

export async function openRecordDetail(id, push = true, restoreScrollY = null) {
  const allRecs = getUnifiedRecords();
  const idStr = String(id);
  const rec = allRecs.find(r => String(r.id) === idStr) || allRecs[0];
  if (!rec) return;

  state.selectedRecordId = rec.id;
  state.selectedRecord = rec;

  if (state.screen !== 'record') {
    state.recordReturnScreen = state.screen;
  }

  if (push) {
    pushRoute({ screen: 'record', params: { id: rec.id } });
    resetScrollToTop();
  }

  go('record', false, push ? null : restoreScrollY);
  renderRecordDetailScreen(rec);

  const hashTarget = `#record/${rec.id}`;
  if (push && location.hash !== hashTarget) {
    history.pushState({ screen: 'record', id: rec.id }, '', hashTarget);
  } else if (location.hash !== hashTarget) {
    history.replaceState({ screen: 'record', id: rec.id }, '', hashTarget);
  }

  if (push) {
    resetScrollToTop();
  } else {
    const y = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`record/${rec.id}`);
    if (typeof y === 'number') {
      restoreScrollPosition(y);
    } else {
      resetScrollToTop();
    }
  }

  const backBtn = $('#record-detail-back');
  if (backBtn) {
    const ret = state.recordReturnScreen || 'records';
    if (ret === 'region' && state.currentRegionId) backBtn.textContent = '← Назад в регион';
    else if (ret === 'athlete' && state.selectedAthleteId) backBtn.textContent = '← В профиль спортсмена';
    else if (ret === 'event' && state.athleteReturnEventId) backBtn.textContent = '← Назад к турниру';
    else backBtn.textContent = '← Все рекорды России';
  }
}

const recordCard = x => renderUnifiedRecordCard(x);

function renderRecords() {
  const q = state.recordQuery.toLowerCase();
  const allRecords = getUnifiedRecords();
  const items = allRecords.filter(x => {
    const s = (x.sex || x.gender || 'M').toUpperCase();
    const ag = (x.ageGroup || x.age || '18-29');
    const disc = (x.discipline || x.ex || '');
    const holder = (x.holder || x.athlete || '');
    const city = (x.city || x.tournament || '');
    return (state.sex === 'ALL' || s === state.sex) &&
      (state.age === 'all' || clean(ag) === state.age) &&
      (state.discipline === 'all' || clean(disc) === state.discipline) &&
      `${holder} ${disc} ${city} ${ag}`.toLowerCase().includes(q);
  });
  $('#record-count').textContent = `${items.length} записей`;
  if (!items.length) {
    $('#record-list').innerHTML = '<div class="empty">Записей не найдено.</div>';
    return;
  }

  const limit = state.recordLimit || 30;
  const visibleItems = items.slice(0, limit);
  const remaining = items.length - visibleItems.length;

  let loadMoreHtml = '';
  if (remaining > 0) {
    loadMoreHtml = `
      <div style="text-align: center; margin: 24px 0 16px; grid-column: 1 / -1; width: 100%;">
        <button class="load-more" id="records-load-more" type="button" style="max-width: 420px; margin: 0 auto; height: 48px; font-size: 13px;">
          Показать ещё рекорды · осталось ${remaining}
        </button>
      </div>
    `;
  }

  if (state.group === 'none') {
    $('#record-list').innerHTML = visibleItems.map(recordCard).join('') + loadMoreHtml;
    return;
  }

  const key = x => state.group === 'discipline' ? clean(x.discipline || x.ex) || 'Без дисциплины' : state.group === 'age' ? clean(x.ageGroup || x.age) || 'Возраст не указан' : (x.sex || x.gender) === 'W' ? 'Женщины' : 'Мужчины';
  
  const totalInGroups = new Map();
  items.forEach(x => {
    const name = key(x);
    totalInGroups.set(name, (totalInGroups.get(name) || 0) + 1);
  });

  const groups = new Map();
  visibleItems.forEach(x => {
    const name = key(x);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(x);
  });

  const groupsHtml = [...groups].map(([name, values]) => {
    const total = totalInGroups.get(name) || values.length;
    const countBadge = values.length < total ? `${values.length} из ${total}` : `${total}`;
    return `<h2 class="record-group-title">${esc(name)} <span class="record-group-count">${countBadge}</span></h2>${values.map(recordCard).join('')}`;
  }).join('');

  $('#record-list').innerHTML = groupsHtml + loadMoreHtml;
}

const vkImg = (src, alt = '', cls = '') => `<img class="${cls}" loading="lazy" referrerpolicy="no-referrer" src="${safeImage(src)}" alt="${esc(alt)}" onerror="window.__imageFallback(event)">`;
const VIDEO_PLATFORMS = [['all', 'Все'], ['rutube', 'Rutube'], ['vk', 'VK']];

function renderMedia() {
  state.media === 'video' ? renderVideoTab() : renderPhotoTab();
}

function mediaControls(items, type) {
  const years = [...new Set(items.map(x => mediaMeta(x, type).year).filter(Boolean))].sort((a, b) => b - a);
  const totalCount = items.length;

  const yearChips = `
    <div class="chips media-year-chips" id="media-year-chips" aria-label="Фильтр по годам" style="padding-bottom: 6px; margin-bottom: 8px;">
      <button class="${state.mediaYear === 'all' ? 'active' : ''}" data-media-year="all">Все годы <i>${totalCount}</i></button>
      ${years.map(y => {
        const count = items.filter(x => String(mediaMeta(x, type).year) === String(y)).length;
        return `<button class="${String(y) === String(state.mediaYear) ? 'active' : ''}" data-media-year="${y}">${y} <i>${count}</i></button>`;
      }).join('')}
    </div>
  `;

  return `
    <div class="media-toolbar">
      <label class="search media-search">
        <span>⌕</span>
        <input id="media-search" type="search" value="${esc(state.mediaQuery)}" placeholder="${type === 'video' ? 'Поиск по видео, турниру или году' : 'Поиск по фотоальбомам, турниру или году'}">
      </label>
      <div class="filter-pills-row media-filter-row" style="margin-bottom: 10px;">
        <label class="filter-pill-wrap ${type === 'album' ? 'single-filter' : ''}">
          <span class="filter-pill-label">Год</span>
          <select id="media-year">
            <option value="all">Все годы (${totalCount})</option>
            ${years.map(y => {
              const count = items.filter(x => String(mediaMeta(x, type).year) === String(y)).length;
              return `<option value="${y}" ${String(y) === String(state.mediaYear) ? 'selected' : ''}>${y} год (${count})</option>`;
            }).join('')}
          </select>
        </label>
        ${type === 'video' ? `
        <label class="filter-pill-wrap">
          <span class="filter-pill-label">Платформа</span>
          <select id="media-platform">
            <option value="all" ${state.videoPlatform === 'all' ? 'selected' : ''}>Все платформы (${SORTED_GTO_VIDEOS.length})</option>
            <option value="rutube" ${state.videoPlatform === 'rutube' ? 'selected' : ''}>Rutube (${SORTED_GTO_VIDEOS.filter(v => v.platform === 'rutube').length})</option>
            <option value="vk" ${state.videoPlatform === 'vk' ? 'selected' : ''}>VK Video (${SORTED_GTO_VIDEOS.filter(v => v.platform === 'vk').length})</option>
          </select>
        </label>
        ` : ''}
      </div>
      ${yearChips}
    </div>
  `;
}

function mediaFiltered(items, type) {
  const q = (state.mediaQuery || '').trim().toLowerCase();
  return items.filter(x => {
    const m = mediaMeta(x, type);
    if (state.mediaYear !== 'all' && String(m.year) !== String(state.mediaYear)) return false;
    if (!q) return true;
    const haystack = `${x.title || ''} ${m.event?.title || ''} ${m.year || ''} ${m.year ? m.year + ' год' : ''} ${x.badge || ''} ${x.categoryLabel || ''}`.toLowerCase();
    return haystack.includes(q);
  });
}

function renderVideoTab() {
  const linkFilterEl = $('#media-link-filter');
  if (linkFilterEl) {
    linkFilterEl.style.display = 'flex';
    $$('#media-link-filter button').forEach(b => {
      b.classList.toggle('active', (b.dataset.mediaLink || 'all') === (state.mediaLinkFilter || 'all'));
    });
  }

  const platform = state.videoPlatform === 'all' ? SORTED_GTO_VIDEOS : SORTED_GTO_VIDEOS.filter(v => v.platform === state.videoPlatform);
  let videos = mediaFiltered(platform, 'video');
  if (state.mediaLinkFilter === 'linked') {
    videos = videos.filter(v => Boolean(mediaMeta(v, 'video').event));
  }
  const current = videos[0];
  const baseForCounts = state.mediaYear === 'all' ? SORTED_GTO_VIDEOS : SORTED_GTO_VIDEOS.filter(v => String(mediaMeta(v, 'video').year) === String(state.mediaYear));
  const chips = VIDEO_PLATFORMS.map(([k, label]) => {
    const n = k === 'all' ? baseForCounts.length : baseForCounts.filter(v => v.platform === k).length;
    return `<button class="${state.videoPlatform === k ? 'active' : ''}" data-vplat="${k}">${label} <i>${n}</i></button>`;
  }).join('');
  const limit = state.videoLimit || 24;
  const shownVideos = videos.slice(0, limit);
  const restCount = videos.length - shownVideos.length;

  const playerHtml = state.activeMediaVideo ? `
    <div id="media-video-player-slot" class="video-feature-slot">
      <iframe id="video-player" class="video-feature" src="${safeUrl(state.activeMediaVideo)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Видео"></iframe>
    </div>
  ` : current ? `
    <div id="media-video-player-slot" class="video-feature-slot">
      <div class="video-feature-poster" data-video="${safeUrl(current.embedUrl)}" role="button" tabindex="0" aria-label="Смотреть видео: ${esc(current.title)}">
        <img src="${safeImage(state.videoThumbs[current.embedUrl] || current.thumb)}" alt="" loading="eager" onerror="window.__imageFallback(event)">
        <div class="video-feature-overlay">
          <span class="video-feature-play">▶</span>
          <div class="video-feature-copy">
            <span class="video-feature-badge">${esc((current.platform || 'video').toUpperCase())}</span>
            <b>${esc(current.title)}</b>
            <small>Нажмите для воспроизведения видео</small>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  const groups = mediaGroups(shownVideos, 'video');
  const contentHtml = videos.length === 0 ? `
    <div class="empty" style="padding: 36px 16px; text-align: center; color: var(--muted); border: 1px dashed rgba(255,255,255,0.12); border-radius: 20px; background: rgba(12,24,40,0.4); margin-top: 12px;">
      <p style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Видео не найдены</p>
      <p style="font-size: 13px; margin-bottom: 16px; color: #94a3b8;">Попробуйте выбрать другой год или сбросить фильтры</p>
      <button class="gto-btn-outline" data-media-reset style="padding: 9px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;">Сбросить фильтры</button>
    </div>
  ` : `
    ${playerHtml}
    <div class="media-tournament-list">
      ${groups.map(group => `<section class="media-tournament-group ${group.event ? '' : 'unlinked'}">
        <div class="media-group-head"><span><small>${group.event ? esc(eventYear(group.event) || '') : 'Официальный медиацентр'}</small><b>${esc(group.event?.title || 'Другие видео Федерации')}</b></span>${group.event ? `<button data-event="${group.event.id}" data-event-pane="event-videos">К видео турнира →</button>` : ''}<i>${group.items.length}</i></div>
        <div class="media-list">${group.items.map((x) => {
        const m = mediaMeta(x, 'video');
        const isCurrent = state.activeMediaVideo ? x.embedUrl === state.activeMediaVideo : x === current;
        return `
          <button class="media-card ${isCurrent ? 'playing' : ''}" data-video="${safeUrl(x.embedUrl)}">
            <div class="media-thumb-wrap">
              ${vkImg(state.videoThumbs[x.embedUrl] || x.thumb, x.title)}
              <span class="media-play-icon">▶</span>
            </div>
            <span>
              <b>${esc(x.title)}</b>
              <small>${esc((x.platform || 'video').toUpperCase())}${m.year ? ' · ' + m.year : ''}${m.event ? ' · ' + esc(m.event.title) : ''}</small>
            </span>
          </button>
        `;
        }).join('')}</div>
      </section>`).join('')}
    </div>
    ${restCount > 0 ? `<button class="load-more" id="media-video-more">Показать ещё видео · осталось ${restCount}</button>` : ''}
  `;

  $('#media-content').innerHTML = `
    ${mediaControls(SORTED_GTO_VIDEOS, 'video')}
    <div class="chips media-filter" id="video-filter" style="margin-top: -2px; margin-bottom: 12px;">${chips}</div>
    ${contentHtml}
  `;
  bindMediaControls();
}

function mediaGroups(items, type) {
  const groups = new Map();
  items.forEach(item => {
    const meta = mediaMeta(item, type);
    const key = meta.event ? String(meta.event.id) : 'other';
    if (!groups.has(key)) groups.set(key, { event: meta.event, items: [] });
    groups.get(key).items.push(item);
  });
  if (type === 'album') {
    groups.forEach(group => group.items.sort((a, b) => Number(b.id) - Number(a.id)));
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.event) return 1;
    if (!b.event) return -1;
    return eventYear(b.event) - eventYear(a.event) || Number(b.event.id) - Number(a.event.id);
  });
}

function localAlbum(album) {
  const local = state.vkLocal.albums[String(album.id)] || {};
  const photos = local.photos?.length ? local.photos : (album.photos || []);
  return {
    ...local,
    photos,
    cover: local.cover || album.cover || photos[0]?.thumb || photos[0]?.src || ''
  };
}

function bindMediaControls() {
  $('#media-search')?.addEventListener('input', e => { state.mediaQuery = e.target.value.trim(); renderMedia(); });
  $('#media-year')?.addEventListener('change', e => { state.mediaYear = e.target.value; renderMedia(); });
  $('#media-platform')?.addEventListener('change', e => { state.videoPlatform = e.target.value; renderMedia(); });
  $('#media-video-more')?.addEventListener('click', () => {
    state.videoLimit = (state.videoLimit || 24) + 24;
    renderVideoTab();
  });
  $('#media-album-more')?.addEventListener('click', () => {
    state.albumLimit = (state.albumLimit || 24) + 24;
    renderPhotoTab();
  });
}

async function renderPhotoTab() {
  const linkFilterEl = $('#media-link-filter');
  if (linkFilterEl) linkFilterEl.style.display = 'none';
  await getVkAlbums();
  const albums = mediaFiltered(GTO_VK_ALBUMS, 'album');
  const limit = state.albumLimit || 24;
  const shownAlbums = albums.slice(0, limit);
  const restCount = albums.length - shownAlbums.length;
  const groups = mediaGroups(shownAlbums, 'album');

  const contentHtml = albums.length === 0 ? `
    <div class="empty" style="padding: 36px 16px; text-align: center; color: var(--muted); border: 1px dashed rgba(255,255,255,0.12); border-radius: 20px; background: rgba(12,24,40,0.4); margin-top: 12px;">
      <p style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;">Фотоальбомы не найдены</p>
      <p style="font-size: 13px; margin-bottom: 16px; color: #94a3b8;">Попробуйте выбрать другой год или сбросить фильтры</p>
      <button class="gto-btn-outline" data-media-reset style="padding: 9px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.07); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;">Сбросить фильтры</button>
    </div>
  ` : `
    <div class="trust-note" style="margin-top: 4px; margin-bottom: 16px;">
      <span>✓</span>
      <p><b>${albums.length} официальных фотоальбомов</b><small>Превью открываются внутри сайта, оригиналы доступны во VK.</small></p>
    </div>
    <div class="media-tournament-list">
      ${groups.map(group => `<section class="media-tournament-group ${group.event ? '' : 'unlinked'}"><div class="media-group-head"><span><small>${group.event ? esc(eventYear(group.event) || '') : 'Официальный медиацентр'}</small><b>${esc(group.event?.title || 'Другие фотоальбомы')}</b></span>${group.event ? `<button data-event="${group.event.id}" data-event-pane="event-photos">К фото турнира →</button>` : ''}<i>${group.items.length}</i></div><div class="album-list">
      ${group.items.map(x => {
        const i = GTO_VK_ALBUMS.indexOf(x), local = localAlbum(x), m = mediaMeta(x, 'album');
        return `
          <button class="album-card" data-album="${i}">
            <div class="album-cover-wrap">
              ${vkImg(local.cover, x.title)}
              <span class="album-count-badge">${esc(x.totalPhotosText)}</span>
            </div>
            <span>
              <b>${esc(x.title)}</b>
              <small>${m.year ? m.year + ' год' : ''}${m.event ? ' · ' + esc(m.event.title) : ''}</small>
            </span>
          </button>
        `;
      }).join('')}</div></section>`).join('')}
    </div>
    ${restCount > 0 ? `<button class="load-more" id="media-album-more">Показать ещё альбомы · осталось ${restCount}</button>` : ''}
  `;

  $('#media-content').innerHTML = `
    ${mediaControls(GTO_VK_ALBUMS, 'album')}
    ${contentHtml}
  `;
  bindMediaControls();
}

async function openAlbum(index, limit = 60) {
  await getVkAlbums();
  const album = GTO_VK_ALBUMS[Number(index)];
  if (!album) return;
  const local = localAlbum(album);
  const shown = (local.photos || []).slice(0, limit);
  const rest = (local.photos || []).length - shown.length;
  const isEvent = state.screen === 'event';
  const eventTarget = $('[data-pane-content="event-photos"]') || $('[data-pane-content="event-media"]');
  const target = (isEvent && eventTarget) ? eventTarget : $('#media-content');
  if (!target) return;

  if (isEvent) {
    const activeTab = $('.detail-tabs [data-pane="event-photos"]') || $('.detail-tabs [data-pane="event-media"]');
    if (activeTab) {
      $$('.detail-tabs button').forEach(x => x.classList.toggle('active', x === activeTab));
      $$('.detail-pane').forEach(x => x.classList.toggle('active', x.dataset.paneContent === activeTab.dataset.pane));
    }
  }

  target.innerHTML = `
    <div class="gallery-head">
      <div>
        <b>${esc(album.title)}</b>
        <small>${esc(album.totalPhotosText)}</small>
      </div>
      <button ${isEvent ? 'data-event-photos-back' : 'data-media="photo"'}>← Все альбомы</button>
    </div>
    <div class="photo-grid">
      ${shown.map((x, i) => `<button class="photo-item" data-photo="${i}" data-photo-album="${index}">${vkImg(x.src, x.title)}</button>`).join('')}
    </div>
    ${rest > 0 ? `<button class="load-more" data-album-more="${index}" data-limit="${limit + 60}">Показать ещё · осталось ${rest}</button>` : ''}
    <a class="source-action" href="${safeUrl(album.vkUrl)}" target="_blank" rel="noopener">Исходный альбом во VK <span>↗</span></a>
  `;

  if (isEvent) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function showPhoto(albumIndex, index) {
  await getVkAlbums();
  const album = GTO_VK_ALBUMS[albumIndex], photos = localAlbum(album).photos || [];
  if (!photos.length) return;
  const opening = !state.gallery;
  if (opening) state.galleryTrigger = document.activeElement;
  index = (index + photos.length) % photos.length;
  state.gallery = { albumIndex, index };
  let box = $('#lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lightbox';
    box.className = 'lightbox';
    document.body.append(box);
  }
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', `Фотография из альбома «${album.title}»`);
  box.innerHTML = `<button data-lightbox-close aria-label="Закрыть галерею"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><button data-lightbox-prev aria-label="Предыдущая фотография"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><img src="${safeImage(photos[index].src)}" alt="${esc(photos[index].title || album.title)}"><button data-lightbox-next aria-label="Следующая фотография"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><small aria-live="polite">${index + 1} / ${photos.length}</small>`;
  box.classList.add('open');
  document.body.classList.add('lightbox-open');
  if (opening) requestAnimationFrame(() => box.querySelector('[data-lightbox-close]')?.focus());
}

function closeLightbox() {
  $('#lightbox')?.classList.remove('open');
  document.body.classList.remove('lightbox-open');
  state.gallery = null;
  const trigger = state.galleryTrigger;
  state.galleryTrigger = null;
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}

const FEDERATION = {
  name: 'Федерация многоборья ГТО России',
  definition: 'Многоборье ГТО — официально признанный вид спорта, направленный на развитие общефизической подготовки. Это непрерывное последовательное прохождение дистанции с упражнениями на силу, скорость, гибкость, выносливость, меткость и ловкость.',
  stats: [['50 000+', 'участников в год'], ['100+', 'стартов в год'], [String(GTO_FEDERATIONS.length), 'региональных федераций в каталоге'], ['с 6 лет', 'возраст атлетов']],
  history: [
    'Комплекс ГТО зародился в СССР в 1930-х годах как государственная программа физической подготовки. Сдача нормативов и знак ГТО считались престижными и массовыми.',
    'В декабре 2020 года в Кисловодске прошёл первый в современной России чемпионат по многоборью ГТО — этот старт положил начало возрождению движения.',
    'В 2022 году, после серии соревнований в формате «Игры ГТО», была учреждена Федерация многоборья ГТО России.',
    '28 марта 2023 года многоборье ГТО официально признано самостоятельным видом спорта. К концу 2024 года действовало 45 региональных федераций (28 из них государственно аккредитованы), проводилось более 100 соревнований и участвовало свыше 50 000 спортсменов ежегодно.'
  ],
  qualities: ['Сила', 'Скорость', 'Гибкость', 'Выносливость', 'Меткость', 'Ловкость'],
  links: [
    ['Руководство', 'structure', true],
    ['Региональные федерации', 'regions', true],
    ['Официальные документы', 'documents', true],
    ['Антидопинг', 'antidoping', true],
    ['Полный перечень дисциплин', 'https://gto.com.ru/o-federacii/discipliny-mnogoborya-gotov-k-trudu-i-oborone/', false]
  ]
};

const FED_STRUCTURE = [
  { role: 'Президент Федерации', people: [{ name: 'Кемал Шаманов', photo: 'kemal-shamanov' }] },
  { role: 'Высший наблюдательный совет', people: [{ name: 'Кемал Шаманов', photo: 'kemal-shamanov' }, { name: 'Михаил Стенин', photo: 'mikhail-stenin' }, { name: 'Владимир Войтеховский', photo: 'vladimir-voytekhovsky', note: 'Генеральный секретарь' }, { name: 'Алексей Михайлин', photo: 'alexey-mikhaylin' }] },
  { role: 'Вице-президент', people: [{ name: 'Павел Филатов', photo: 'pavel-filatov' }] },
  { role: 'Руководитель проекта «Салки ГТО»', people: [{ name: 'Александр Песков', photo: 'alexander-peskov' }] }
];

const FED_DOCUMENTS = [
  { title: 'Устав Федерации', url: 'https://gto.com.ru/data/1705579404/files/1743175982.pdf' },
  { title: 'Свидетельство о регистрации', url: 'https://gto.com.ru/data/1705579404/files/1778745849.pdf' },
  { title: 'Свидетельство ИНН', url: 'https://gto.com.ru/data/1705579404/files/1738243218.pdf' },
  { title: 'Протокол учредительной конференции · 12 сентября 2022', url: 'https://gto.com.ru/data/1763371044/files/1778745490.pdf' },
  { title: 'Протокол внеочередной конференции · 29 мая 2023', url: 'https://gto.com.ru/data/1763371044/files/1778745526.pdf' },
  { title: 'Протокол конференции · 20 декабря 2024', url: 'https://gto.com.ru/data/1763371044/files/1778745568.pdf' },
  { title: 'Правила вида спорта «многоборье ГТО»', url: 'https://gto.com.ru/data/1703837629/files/1759417287.pdf' }
];

const FED_ANTIDOPING = {
  intro: 'Федерация ведёт системную антидопинговую работу совместно с РАА «РУСАДА» в соответствии с Всемирным антидопинговым кодексом и общероссийскими антидопинговыми правилами.',
  contact: { name: 'Свищев Иосиф Юрьевич', role: 'Специалист по антидопинговому обеспечению', phone: '+79646457534', phoneText: '8 (964) 645-75-34', email: 'iosif@gto.com.ru' },
  notes: ['РАА «РУСАДА» запустило портал онлайн-образования: спортсмены и их персонал проходят обязательные антидопинговые курсы в удобное время.', 'Сервис проверки субстанций показывает статус лекарственных средств по действующему Запрещённому списку ВАДА.'],
  docs: ['Общероссийские антидопинговые правила 2026', 'Запрещённый список 2026', 'Обзор основных изменений 2026', 'Нарушения антидопинговых правил', 'Памятка по правам спортсменов', 'Памятка для тренера', 'Информация для родителей юных спортсменов', 'План по борьбе с допингом ФМГТОР на 2026', 'Всемирный антидопинговый кодекс 2021'],
  links: [['Сайт РАА «РУСАДА»', 'https://rusada.ru/'], ['Проверка субстанций (list.rusada.ru)', 'https://list.rusada.ru/'], ['Все антидопинговые документы', 'https://gto.com.ru/o-federacii/antidoping/']]
};

function renderStructure() {
  $('#structure-content').innerHTML = `<div class="page-title"><span>Руководящие органы</span><h1>Руководство</h1><p>Официальный состав и фотографии.</p></div>${FED_STRUCTURE.map(g => `<div class="org-block"><h2>${esc(g.role)}</h2>${g.people.map(p => `<div class="org-person">${p.photo ? `<img src="./assets/leadership/${p.photo}.webp" alt="${esc(p.name)}">` : ''}<span><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}</span></div>`).join('')}</div>`).join('')}<div class="legal">Фото и состав синхронизированы с официальной страницей Федерации.</div>`;
}

function renderDocuments() {
  $('#documents-content').innerHTML = `<div class="page-title"><span>Официально</span><h1>Документы</h1><p>Учредительные и уставные документы Федерации. Файлы открываются с официального сайта.</p></div><div class="link-stack">${FED_DOCUMENTS.map(d => `<a href="${safeUrl(d.url)}" target="_blank" rel="noopener"><span><b>${esc(d.title)}</b><small>PDF · gto.com.ru</small></span><strong>↓</strong></a>`).join('')}</div><a class="source-action" href="https://gto.com.ru/o-federacii/dokumenty/" target="_blank" rel="noopener">Все документы на сайте <span>↗</span></a>`;
}

function renderAntidoping() {
  const a = FED_ANTIDOPING;
  $('#antidoping-content').innerHTML = `<div class="page-title"><span>Чистый спорт</span><h1>Антидопинг</h1><p>${esc(a.intro)}</p></div><div class="about-history">${a.notes.map(n => `<p>${esc(n)}</p>`).join('')}</div><div class="section-head"><div><span>Ответственный</span><h2>Контакт по антидопингу</h2></div></div><div class="link-stack"><a href="tel:${esc(a.contact.phone)}"><span><b>${esc(a.contact.name)}</b><small>${esc(a.contact.role)} · ${esc(a.contact.phoneText)}</small></span><strong>→</strong></a><a href="mailto:${esc(a.contact.email)}"><span><b>${esc(a.contact.email)}</b><small>Написать по антидопингу</small></span><strong>→</strong></a></div><div class="section-head"><div><span>Материалы</span><h2>Документы и памятки</h2></div></div><div class="quality-chips">${a.docs.map(d => `<span>${esc(d)}</span>`).join('')}</div><div class="section-head"><div><span>Ресурсы</span><h2>Полезные ссылки</h2></div></div><div class="link-stack">${a.links.map(([t, u]) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener"><span><b>${esc(t)}</b></span><strong>↗</strong></a>`).join('')}</div>`;
}

async function ensureRegionStats() {
  if (state.regionStats && state.athleteIndex) return state.regionStats;
  let athletes = state.athleteIndex;
  if (!athletes) {
    if (!state.athleteLoading) {
      buildAthleteIndex().then(() => {
        if (state.athleteIndex) {
          const { stats, summary } = buildRegionStats(state.athleteIndex, GTO_CALENDAR_EVENTS, GTO_RECORDS, GTO_FEDERATIONS);
          state.regionStats = stats;
          state.regionSummary = summary;
          updateMapHeatmap();
          syncMapSummaryCards();
          if (state.screen === 'region' && state.currentRegionId) {
            openRegion(state.currentRegionId, false);
          }
        }
      });
    }
    athletes = [];
  }
  const { stats, summary } = buildRegionStats(athletes, GTO_CALENDAR_EVENTS, GTO_RECORDS, GTO_FEDERATIONS);
  state.regionStats = stats;
  state.regionSummary = summary;
  syncMapSummaryCards();
  return stats;
}

function syncMapSummaryCards() {
  const sum = state.regionSummary;
  if (!sum) return;
  const cards = $$('.map-summary-strip .map-summary-card b');
  if (cards.length >= 4) {
    if (sum.totalAthletes) cards[0].textContent = sum.totalAthletes.toLocaleString('ru-RU');
    if (sum.totalRegions) cards[1].textContent = String(sum.totalRegions);
    if (sum.totalTournaments) cards[2].textContent = String(sum.totalTournaments);
    if (sum.totalRecords) cards[3].textContent = String(sum.totalRecords);
  }
}

function updateMapHeatmap() {
  const svgWrap = $('#russia-map-svg-wrap');
  if (!svgWrap) return;
  const els = svgWrap.querySelectorAll('.russia-region, .region-hit-area');
  if (!els.length || !state.regionStats) return;

  const mode = state.mapMode || 'athletes';

  els.forEach(el => {
    const regId = Number(el.dataset.regionId);
    const item = state.regionStats[regId];
    let val = 0;
    if (item) {
      if (mode === 'athletes') val = item.athletes_count || 0;
      else if (mode === 'tournaments') val = item.tournaments_count || 0;
      else if (mode === 'records') val = item.records_count || 0;
      else if (mode === 'all') val = (item.athletes_count || 0) + (item.tournaments_count || 0) * 5 + (item.records_count || 0) * 6;
    }

    let heat = 0;
    if (mode === 'athletes') {
      if (val === 0) heat = 0;
      else if (val <= 15) heat = 1;
      else if (val <= 50) heat = 2;
      else if (val <= 150) heat = 3;
      else heat = 4;
    } else if (mode === 'tournaments') {
      if (val === 0) heat = 0;
      else if (val === 1) heat = 1;
      else if (val <= 3) heat = 2;
      else if (val <= 8) heat = 3;
      else heat = 4;
    } else if (mode === 'records') {
      if (val === 0) heat = 0;
      else if (val === 1) heat = 1;
      else if (val <= 3) heat = 2;
      else if (val <= 6) heat = 3;
      else heat = 4;
    } else { // 'all'
      if (val === 0) heat = 0;
      else if (val <= 25) heat = 1;
      else if (val <= 80) heat = 2;
      else if (val <= 200) heat = 3;
      else heat = 4;
    }

    el.setAttribute('data-heat', String(heat));
  });
}

function applyMapTransform() {
  const svg = $('#russia-map-svg-wrap svg');
  if (svg) {
    svg.style.transform = `translate(${state.mapPanX}px, ${state.mapPanY}px) scale(${state.mapZoom})`;
  }
}

function zoomMapBy(delta) {
  state.mapZoom = Math.min(3.5, Math.max(1.0, Number((state.mapZoom + delta).toFixed(2))));
  if (state.mapZoom === 1.0) {
    state.mapPanX = 0;
    state.mapPanY = 0;
  }
  applyMapTransform();
}

function resetMapZoom() {
  state.mapZoom = 1.0;
  state.mapPanX = 0;
  state.mapPanY = 0;
  applyMapTransform();
}

function regionHaptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(15);
  } catch (_) {}
}

function updateMapFloatingIndicator(reg) {
  const ind = $('#map-floating-indicator');
  const nameEl = $('#mfi-name');
  const distEl = $('#mfi-district');
  if (!ind || !nameEl || !distEl) return;

  if (!reg) {
    ind.hidden = true;
    return;
  }

  nameEl.textContent = reg.name.toUpperCase();
  distEl.textContent = `${reg.district} · Субъект №${reg.id}`;
  ind.hidden = false;
}

function updateMapSelectedCard(reg) {
  const card = $('#map-selected-card');
  const nameEl = $('#msc-name');
  const distEl = $('#msc-district');
  const statsEl = $('#msc-stats');
  const actionBtn = $('#msc-action-btn');
  if (!card || !nameEl || !statsEl) return;

  if (!reg) {
    card.classList.remove('is-active');
    nameEl.textContent = 'Выберите регион на карте';
    if (distEl) distEl.hidden = true;
    statsEl.innerHTML = '<span>Нажмите на любой субъект РФ для просмотра статистики</span>';
    if (actionBtn) actionBtn.hidden = true;
    return;
  }

  card.classList.add('is-active');
  nameEl.textContent = reg.name;
  if (distEl) {
    distEl.textContent = reg.district;
    distEl.hidden = false;
  }

  const st = state.regionStats?.[reg.id];
  if (st && (st.athletes_count > 0 || st.tournaments_count > 0 || st.records_count > 0)) {
    const parts = [];
    if (st.athletes_count > 0) parts.push(`👤 <b>${pluralize(st.athletes_count, ['атлет', 'атлета', 'атлетов'])}</b>`);
    if (st.tournaments_count > 0) parts.push(`🏆 <b>${pluralize(st.tournaments_count, ['турнир', 'турнира', 'турниров'])}</b>`);
    if (st.records_count > 0) parts.push(`⭐ <b>${pluralize(st.records_count, ['рекорд', 'рекорда', 'рекордов'])}</b>`);
    statsEl.innerHTML = `<span>${parts.join(' &nbsp;•&nbsp; ')}</span>`;
  } else {
    statsEl.innerHTML = `<span>Центр: <b>${esc(reg.capital)}</b> &nbsp;•&nbsp; Официальные данные формируются</span>`;
  }

  if (actionBtn) {
    actionBtn.hidden = false;
    actionBtn.dataset.openRegionId = String(reg.id);
  }
}

function focusRegionOnMap(regionId) {
  const svg = $('#russia-map-svg-wrap svg');
  if (!svg) return;
  const target = svg.querySelector(`[data-region-id="${regionId}"]`);
  if (!target) return;

  try {
    if (typeof target.getBBox === 'function') {
      const bbox = target.getBBox();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        const isMobile = window.innerWidth <= 768;
        const maxScale = isMobile ? 1.25 : 1.6;
        const minScale = 1.05;
        const factor = Math.min(maxScale, Math.max(minScale, 480 / Math.max(bbox.width, bbox.height)));
        state.mapZoom = Number(factor.toFixed(2));
        const container = $('#russia-map-container');
        const cw = container ? container.clientWidth : (isMobile ? 360 : 900);
        const ch = container ? container.clientHeight : (isMobile ? 280 : 500);
        const scale = Math.min(cw / 1090, ch / 620);
        const rawPanX = (545 - cx) * scale * 0.35;
        const rawPanY = (310 - cy) * scale * 0.35;
        const maxPanX = cw * 0.15;
        const maxPanY = ch * 0.15;
        state.mapPanX = Math.max(-maxPanX, Math.min(maxPanX, rawPanX));
        state.mapPanY = Math.max(-maxPanY, Math.min(maxPanY, rawPanY));
        applyMapTransform();
      }
    }
  } catch (_) {}
}

function updateDistrictHighlights() {
  const svgWrap = $('#russia-map-svg-wrap');
  if (!svgWrap) return;
  const d = state.districtQuery;
  const paths = svgWrap.querySelectorAll('.russia-region');
  if (!d || d === 'all') {
    paths.forEach(p => {
      p.classList.remove('is-district-match', 'is-district-dim');
    });
  } else {
    paths.forEach(p => {
      const match = p.dataset.district === d;
      p.classList.toggle('is-district-match', match);
      p.classList.toggle('is-district-dim', !match);
    });
  }
}

function selectRegion(regionId, { source = 'map' } = {}) {
  const reg = getRegionById(regionId);
  if (!reg) return;

  state.selectedRegionId = reg.id;
  regionHaptic();

  // Update SVG elements: remove .is-selected from previous, add to current
  const svgWrap = $('#russia-map-svg-wrap');
  if (svgWrap) {
    svgWrap.querySelectorAll('.russia-region, .region-hit-area').forEach(el => {
      const isSel = Number(el.dataset.regionId) === reg.id;
      el.classList.toggle('is-selected', isSel);
    });
  }

  // Update In-Map Floating Indicator
  updateMapFloatingIndicator(reg);

  // Update Compact Status Card
  updateMapSelectedCard(reg);

  // If on mobile and clicked on map, also show bottom sheet
  if (window.innerWidth <= 768 && source === 'map') {
    showRegionBottomSheet(reg.id);
  }

  // If from search, center/focus on map
  if (source === 'search') {
    focusRegionOnMap(reg.id);
  }
}

function showRegionBottomSheet(regId) {
  const reg = getRegionById(regId);
  if (!reg) return;
  const st = state.regionStats?.[reg.id];
  const fed = st?.federation || GTO_FEDERATIONS.find(f => normalizeRegionName(f.region) === reg.id);
  const pres = fed ? realPresident(fed.president) : '';

  const sheet = $('#region-bottom-sheet');
  const backdrop = $('#region-bottom-sheet-backdrop');
  if (!sheet) return;

  sheet.innerHTML = `
    <div class="bottom-sheet-handle"></div>
    <button class="bottom-sheet-close" id="region-sheet-close" aria-label="Закрыть">✕</button>
    <div class="sheet-head">
      <span class="sheet-badge">${esc(reg.district)} · Субъект №${reg.id}</span>
      <h3>${esc(reg.name)}</h3>
      <small>Центр: ${esc(reg.capital)}</small>
    </div>
    <div class="sheet-stats-grid">
      <div class="sheet-stat-box">
        <b>${st ? st.athletes_count : 0}</b>
        <span>${pluralize(st ? st.athletes_count : 0, ['спортсмен', 'спортсмена', 'спортсменов']).replace(/^\d+[\s\u00A0]*/, '')}</span>
      </div>
      <div class="sheet-stat-box">
        <b>${st ? st.tournaments_count : 0}</b>
        <span>${pluralize(st ? st.tournaments_count : 0, ['турнир', 'турнира', 'турниров']).replace(/^\d+[\s\u00A0]*/, '')}</span>
      </div>
      <div class="sheet-stat-box">
        <b>${st ? st.records_count : 0}</b>
        <span>${pluralize(st ? st.records_count : 0, ['рекорд', 'рекорда', 'рекордов']).replace(/^\d+[\s\u00A0]*/, '')}</span>
      </div>
    </div>
    ${pres ? `
      <div class="sheet-fed-preview">
        <small>Председатель отделения</small>
        <b>${esc(pres)}</b>
      </div>
    ` : ''}
    <button class="sheet-open-btn" data-open-region-id="${reg.id}">
      <span>ОТКРЫТЬ РЕГИОН</span>
      <strong>→</strong>
    </button>
  `;

  sheet.hidden = false;
  if (backdrop) backdrop.hidden = false;
  requestAnimationFrame(() => {
    sheet.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
  });
}

function hideRegionBottomSheet() {
  const sheet = $('#region-bottom-sheet');
  const backdrop = $('#region-bottom-sheet-backdrop');
  if (sheet) {
    sheet.classList.remove('is-open');
    setTimeout(() => { sheet.hidden = true; }, 220);
  }
  if (backdrop) {
    backdrop.classList.remove('is-open');
    setTimeout(() => { backdrop.hidden = true; }, 220);
  }
}

let mapEventsBound = false;

async function renderRegionMap() {
  await ensureRegionStats();

  const svgWrap = $('#russia-map-svg-wrap');
  if (!svgWrap) return;

  if (!state.mapSvgLoaded) {
    try {
      const res = await fetch('./assets/maps/russia-regions.svg?v=84');
      if (res.ok) {
        const svgContent = await res.text();
        svgWrap.innerHTML = svgContent;
        state.mapSvgLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load Russia map SVG', e);
    }
  }

  updateMapHeatmap();
  updateDistrictHighlights();

  if (state.selectedRegionId) {
    const activeReg = getRegionById(state.selectedRegionId);
    if (activeReg) {
      svgWrap.querySelectorAll('.russia-region, .region-hit-area').forEach(el => {
        el.classList.toggle('is-selected', Number(el.dataset.regionId) === activeReg.id);
      });
      updateMapFloatingIndicator(activeReg);
      updateMapSelectedCard(activeReg);
    }
  }

  if (mapEventsBound) return;
  mapEventsBound = true;

  const container = $('#russia-map-container');
  const tooltip = $('#region-map-tooltip');

  // Heatmap mode buttons
  const modeChips = $$('#map-heatmap-modes button');
  modeChips.forEach(btn => {
    btn.addEventListener('click', () => {
      modeChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mapMode = btn.dataset.mode;
      haptic(10);
      updateMapHeatmap();
    });
  });

  // Search input
  const mapSearchInput = $('#map-search-input');
  if (mapSearchInput) {
    mapSearchInput.addEventListener('input', e => {
      const query = (e.target.value || '').trim().toLowerCase();
      const allPaths = svgWrap.querySelectorAll('.russia-region, .region-hit-area');
      allPaths.forEach(p => p.classList.remove('is-search-match'));

      if (!query) return;

      const matches = GTO_REGIONS.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.capital.toLowerCase().includes(query) ||
        String(r.id) === query ||
        r.aliases.some(a => a.toLowerCase().includes(query))
      );

      matches.forEach(m => {
        svgWrap.querySelectorAll(`[data-region-id="${m.id}"]`).forEach(p => {
          p.classList.add('is-search-match');
        });
      });

      if (matches.length === 1 || query.length >= 4) {
        const topMatch = matches[0];
        if (topMatch && topMatch.id !== state.selectedRegionId) {
          selectRegion(topMatch.id, { source: 'search' });
        }
      }
    });

    mapSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const query = (mapSearchInput.value || '').trim().toLowerCase();
        if (!query) return;
        const match = GTO_REGIONS.find(r =>
          r.name.toLowerCase().includes(query) ||
          r.capital.toLowerCase().includes(query) ||
          String(r.id) === query ||
          r.aliases.some(a => a.toLowerCase().includes(query))
        );
        if (match) {
          openRegion(match.id);
        }
      }
    });
  }

  // Zoom buttons
  $('#map-zoom-in')?.addEventListener('click', () => { haptic(10); zoomMapBy(0.35); });
  $('#map-zoom-out')?.addEventListener('click', () => { haptic(10); zoomMapBy(-0.35); });
  $('#map-zoom-reset')?.addEventListener('click', () => { haptic(10); resetMapZoom(); });

  // Tooltip & hover
  function showTooltipAt(e, regId) {
    if (!tooltip) return;
    const reg = getRegionById(regId);
    if (!reg) return;
    const st = state.regionStats?.[reg.id];

    tooltip.innerHTML = `
      <div class="tooltip-title">
        <b>${esc(reg.name)}</b>
        <span class="tooltip-badge">${esc(reg.district)}</span>
      </div>
      <div class="tooltip-stats">
        <span>👤 <b>${st ? st.athletes_count : 0}</b> атлетов</span>
        <span>🏆 <b>${st ? st.tournaments_count : 0}</b> турниров</span>
        <span>⭐ <b>${st ? st.records_count : 0}</b> рекордов</span>
      </div>
      ${st && st.federation ? `<div class="tooltip-fed">🏛 ${esc(st.federation.name)}</div>` : ''}
    `;

    tooltip.hidden = false;

    const pad = 12;
    let left = e.clientX + pad;
    let top = e.clientY + pad;

    if (left + 220 > window.innerWidth) left = e.clientX - 225;
    if (top + 100 > window.innerHeight) top = e.clientY - 105;

    tooltip.style.left = `${Math.max(6, left)}px`;
    tooltip.style.top = `${Math.max(6, top)}px`;
  }

  function hideTooltip() {
    if (tooltip) tooltip.hidden = true;
    svgWrap.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
  }

  if (container) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;
    let hasMoved = false;

    container.addEventListener('pointerdown', e => {
      const targetRegion = e.target.closest('.russia-region, .region-hit-area');
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      initialPanX = state.mapPanX;
      initialPanY = state.mapPanY;
    });

    window.addEventListener('pointermove', e => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.hypot(dx, dy) > 5) {
          hasMoved = true;
          if (state.mapZoom > 1.0) {
            state.mapPanX = initialPanX + dx;
            state.mapPanY = initialPanY + dy;
            applyMapTransform();
          }
        }
      }

      if (!isDragging && container.contains(e.target)) {
        const target = e.target.closest('.russia-region, .region-hit-area');
        if (target) {
          const regId = Number(target.dataset.regionId);
          svgWrap.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
          svgWrap.querySelectorAll(`[data-region-id="${regId}"]`).forEach(el => el.classList.add('is-hovered'));
          if (window.innerWidth > 768) {
            showTooltipAt(e, regId);
          }
        } else {
          hideTooltip();
        }
      }
    });

    window.addEventListener('pointerup', e => {
      if (isDragging) {
        isDragging = false;
      }
    });

    container.addEventListener('pointerleave', () => {
      if (!isDragging) hideTooltip();
    });

    // Wheel zoom inside map container
    container.addEventListener('wheel', e => {
      if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        zoomMapBy(delta);
      }
    }, { passive: false });

    // Region Click / Tap
    container.addEventListener('click', e => {
      const target = e.target.closest('.russia-region, .region-hit-area');
      if (!target || hasMoved) return;

      e.preventDefault();
      const regId = Number(target.dataset.regionId);
      if (!regId) return;

      if (state.selectedRegionId === regId) {
        // Second tap on already selected region -> open region page!
        hideRegionBottomSheet();
        openRegion(regId);
      } else {
        selectRegion(regId, { source: 'map' });
      }
    });

    // Keyboard accessibility for regions
    container.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('.russia-region, .region-hit-area');
        if (target) {
          e.preventDefault();
          const regId = Number(target.dataset.regionId);
          if (regId) {
            if (state.selectedRegionId === regId) {
              openRegion(regId);
            } else {
              selectRegion(regId, { source: 'keyboard' });
            }
          }
        }
      }
    });
  }
}

const DISTRICTS = [
  { code: 'ЦФО', re: /москв|белгород|брянск|владимир|воронеж|иванов|калуж|костром|курск|липецк|орлов|рязан|смоленск|тамбов|твер|тул|ярослав/i },
  { code: 'СЗФО', re: /петербург|ленинград|архангельск|волог|калининград|карел|коми|мурманск|новгород|псков|ненецк/i },
  { code: 'ЮФО', re: /краснодар|ростов|волгоград|астрахан|адыге|калмык|крым|севастопол/i },
  { code: 'СКФО', re: /дагестан|ингушет|кабардин|карачаев|осети|ставропол|чечен/i },
  { code: 'ПФО', re: /башкортостан|татарстан|удмурт|чуваш|марий|мордови|перм|киров|нижегород|оренбург|пензен|самар|саратов|ульянов/i },
  { code: 'УФО', re: /свердлов|челябинск|тюмен|курган|хмао|янао|югр/i },
  { code: 'СФО', re: /красноярск|алтай|иркутск|кемеров|новосибирск|омск|томск|хакас|тыва/i },
  { code: 'ДФО', re: /примор|хабаровск|амур|сахалин|камчат|магадан|якут|бурят|забайкал|чукот|еврейск/i }
];

function getDistrict(regName) {
  for (const d of DISTRICTS) {
    if (d.re.test(regName || '')) return d.code;
  }
  return 'ЦФО';
}

function renderRegions() {
  const q = state.regionQuery.toLowerCase();
  const items = GTO_FEDERATIONS.filter(f => {
    if (state.districtQuery !== 'all' && getDistrict(f.region) !== state.districtQuery) return false;
    return `${f.name} ${f.region} ${f.address} ${f.president}`.toLowerCase().includes(q);
  });

  $('#region-count').textContent = `${items.length} отделений`;
  $('#region-list').innerHTML = items.length ? items.map(f => {
    const pres = realPresident(f.president);
    const emblem = regionLogo(f.region, f.photo);
    const yandexUrl = `https://yandex.ru/maps/?text=${encodeURIComponent((f.region || '') + ' ' + (f.address || ''))}`;
    return `<div class="region-card" data-region="${f.id}">
      ${emblem}
      <div>
        <b>${esc(f.region)} <span class="standard-tag" style="margin-left:4px;font-size:9px">${getDistrict(f.region)}</span></b>
        ${pres ? `<small class="reg-pres">Председатель · ${esc(pres)}</small>` : '<small class="reg-pres">Региональное отделение</small>'}
        ${f.address ? `<small>${esc(f.address)}</small>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="link-action" style="padding:0" data-region-open="${f.id}">Страница региона →</button>
          <a class="route-btn" href="${yandexUrl}" target="_blank" rel="noopener">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            <span>Маршрут</span>
          </a>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="empty">В этом округе отделений пока не найдено.</div>';

  renderRegionMap();
}

async function openRegion(idOrCodeOrSlug, push = true, restoreScrollY = null) {
  let reg = getRegionById(idOrCodeOrSlug);
  if (!reg) {
    const fed = GTO_FEDERATIONS.find(f => String(f.id) === String(idOrCodeOrSlug));
    if (fed) {
      const regId = normalizeRegionName(`${fed.region} ${fed.name}`);
      if (regId) reg = getRegionById(regId);
    }
  }
  if (!reg) {
    const regId = normalizeRegionName(String(idOrCodeOrSlug));
    if (regId) reg = getRegionById(regId);
  }
  if (!reg) return;

  if (push) {
    pushRoute({ screen: 'region', params: { id: reg.id } });
    resetScrollToTop();
  }

  state.currentRegionId = reg.id;
  await ensureRegionStats();

  const st = state.regionStats?.[reg.id] || {
    region: reg,
    athletes_count: 0,
    tournaments_count: 0,
    records_count: 0,
    podiums_count: 0,
    wins_count: 0,
    athletes: [],
    tournaments: [],
    records: [],
    federation: null,
    topAthletes: []
  };

  const fed = st.federation || GTO_FEDERATIONS.find(f => normalizeRegionName(f.region) === reg.id);
  const pres = fed ? realPresident(fed.president) : '';
  const yandexUrl = fed ? `https://yandex.ru/maps/?text=${encodeURIComponent((reg.name || '') + ' ' + (fed.address || ''))}` : '';

  const detailEl = $('#region-detail');
  if (!detailEl) return;

  detailEl.innerHTML = `
    <div class="region-page-container">
      <div class="region-hero region-hero-card">
        <div class="region-hero-logo region-hero-emblem">${regionLogo(reg.name, fed?.photo)}</div>
        <div class="region-hero-content region-hero-info">
          <div class="region-meta region-district-tag text-wrap-safe">${esc(reg.district)} · Субъект №${reg.id}</div>
          <h1 class="region-title region-hero-name text-wrap-safe">${esc(reg.name)}</h1>
          <div class="region-center region-hero-capital text-wrap-safe">Центр: <b>${esc(reg.capital)}</b></div>
        </div>
      </div>

      <div class="region-stats-grid">
        <div class="region-stat-card blue">
          <b>${st.athletes_count.toLocaleString('ru-RU')}</b>
          <span>${pluralize(st.athletes_count, ['спортсмен', 'спортсмена', 'спортсменов']).replace(/^\d+[\s\u00A0]*/, '')}</span>
        </div>
        <div class="region-stat-card red">
          <b>${st.tournaments_count}</b>
          <span>${pluralize(st.tournaments_count, ['турнир', 'турнира', 'турниров']).replace(/^\d+[\s\u00A0]*/, '')}</span>
        </div>
        <div class="region-stat-card amber">
          <b>${st.records_count}</b>
          <span>${pluralize(st.records_count, ['рекорд', 'рекорда', 'рекордов']).replace(/^\d+[\s\u00A0]*/, '')}</span>
        </div>
        <div class="region-stat-card emerald">
          <b>${st.wins_count || 0} • ${st.podiums_count || 0}</b>
          <span>${pluralize(st.wins_count || 0, ['победа', 'победы', 'побед']).replace(/^\d+[\s\u00A0]*/, '')} • ${pluralize(st.podiums_count || 0, ['подиум', 'подиума', 'подиумов']).replace(/^\d+[\s\u00A0]*/, '')}</span>
        </div>
      </div>

      <div class="region-federation-card">
        ${fed ? `
          <div class="region-federation-details">
            <span class="standard-tag" style="width:fit-content">Официальное региональное отделение</span>
            <h3 class="region-federation-title text-wrap-safe">${esc(fed.name)}</h3>
            ${pres ? `<p class="text-wrap-safe"><b>Председатель:</b> ${esc(pres)}</p>` : ''}
            ${fed.address ? `<p class="text-wrap-safe"><b>Адрес:</b> ${esc(fed.address)}</p>` : ''}
            <div class="region-federation-contacts">
              ${fed.phone ? `<a class="region-contact-btn contact-chip" href="tel:${esc(String(fed.phone).replace(/[^+\d]/g, ''))}">📞 ${esc(formatPhone(fed.phone))}</a>` : ''}
              ${fed.email ? `<a class="region-contact-btn contact-chip" href="mailto:${esc(fed.email)}" title="${esc(fed.email)}">✉ ${esc(fed.email)}</a>` : ''}
              ${yandexUrl ? `<a class="region-contact-btn contact-chip" href="${yandexUrl}" target="_blank" rel="noopener">↗ Яндекс Карты</a>` : ''}
            </div>
          </div>
        ` : `
          <div class="region-federation-details">
            <span class="standard-tag" style="width:fit-content;background:rgba(255,255,255,0.08);color:#94a3b8">Федерация</span>
            <h3 class="region-federation-title text-wrap-safe">Региональное отделение формируется</h3>
            <p class="text-wrap-safe">В ${esc(reg.name)} формируется официальное представительство Федерации многоборья ГТО России.</p>
            <div class="region-federation-contacts">
              <a class="region-contact-btn contact-chip" href="mailto:info@gto.com.ru">✉ Подать заявку: info@gto.com.ru</a>
              <a class="region-contact-btn contact-chip" href="tel:+79863333333">📞 +7 (986) 333-33-33</a>
            </div>
          </div>
        `}
      </div>

      ${st.tournaments.length ? `
        <div class="region-section-block">
          <div class="region-section-head">
            <h3>Турниры в регионе (${st.tournaments.length})</h3>
          </div>
          <div class="region-tournaments-grid">
            ${st.tournaments.map(t => {
              const isLong = (t.title || '').length > 45;
              return `
              <article class="region-tournament-card" data-event="${t.id}">
                <div class="region-tournament-thumb">
                  ${getTournamentThumbnailHtml(t)}
                </div>
                <div class="region-tournament-body region-tournament-content">
                  <span class="rtc-city text-wrap-safe">${esc(t.city || reg.capital)}</span>
                  <h4 class="rtc-title region-tournament-title text-wrap-safe ${isLong ? 'is-extra-long' : ''}">${esc(t.title)}</h4>
                  <time class="rtc-date">${esc(t.date || t.year || '')}</time>
                  <span class="rtc-link">Протоколы и результаты →</span>
                </div>
              </article>
            `;}).join('')}
          </div>
        </div>
      ` : ''}

      ${st.records.length ? `
        <div class="region-section-block">
          <div class="region-section-head">
            <h3>Рекорды России региона (${st.records.length})</h3>
          </div>
          <div class="region-records-grid">
            ${st.records.map(r => renderUnifiedRecordCard(r, { defaultCity: reg.name })).join('')}
          </div>
        </div>
      ` : ''}

      ${st.topAthletes.length ? `
        <div class="region-section-block">
          <div class="region-section-head">
            <h3>Лидеры региона</h3>
            <span style="font-size:12px;color:#94a3b8">Топ-${st.topAthletes.length} по победам и подиумам</span>
          </div>
          <div class="region-athletes-grid region-leaders-grid">
            ${st.topAthletes.map(a => `
              <div class="region-athlete-card region-leader-card" data-open-athlete-id="${a.id}">
                <div class="region-leader-avatar">
                  ${getAthleteAvatarHtml(a, 48)}
                </div>
                <div class="region-athlete-info region-leader-info">
                  <b class="region-leader-name text-wrap-safe">${esc(a.name)}</b>
                  <span class="text-wrap-safe">${esc(a.club || a.city || reg.capital)} · ${a.gender === 'W' ? 'Женщины' : 'Мужчины'}</span>
                </div>
                <div class="region-athlete-badges region-leader-badges">
                  ${(a.wins_count || 0) > 0 ? `<span class="reg-badge-win">🥇 ${a.wins_count}</span>` : ''}
                  ${(a.podiums_count || 0) > 0 ? `<span class="reg-badge-rec">🏆 ${a.podiums_count}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${st.athletes.length ? `
        <div class="region-section-block" id="region-all-athletes-section">
          <div class="region-section-head">
            <h3>Все атлеты региона (${st.athletes.length})</h3>
          </div>
          <label class="search" style="margin-bottom:8px">
            <span>⌕</span>
            <input id="region-athlete-filter" type="search" placeholder="Поиск спортсмена по фамилии...">
          </label>
          <div class="region-athletes-grid" id="region-athletes-list">
            ${st.athletes.slice(0, 30).map(a => `
              <div class="region-athlete-card region-leader-card" data-open-athlete-id="${a.id}">
                <div class="region-leader-avatar">
                  ${getAthleteAvatarHtml(a, 44)}
                </div>
                <div class="region-athlete-info region-leader-info">
                  <b class="region-leader-name text-wrap-safe">${esc(a.name)}</b>
                  <span class="text-wrap-safe">${esc(a.club || a.city || reg.capital)}</span>
                </div>
                <div class="region-athlete-badges region-leader-badges">
                  ${(a.competitions && a.competitions.length) ? `<span class="reg-badge-rec">${a.competitions.length} ст.</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          ${st.athletes.length > 30 ? `
            <div style="text-align:center;margin-top:12px">
              <button class="sheet-open-btn" id="region-load-more-athletes" style="max-width:260px;margin:0 auto">
                Показать ещё атлетов
              </button>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="legal" style="margin-top:24px">
        Статистика сформирована на основе 21 официального протокола Минспорта РФ, 3 203 профилей атлетов и открытых данных Федерации многоборья ГТО.
      </div>
    </div>
  `;

  // Attach search filter for athletes list
  const athleteFilterInput = $('#region-athlete-filter');
  const athletesList = $('#region-athletes-list');
  let renderedCount = 30;

  if (athleteFilterInput && athletesList) {
    athleteFilterInput.addEventListener('input', e => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = q ? st.athletes.filter(a => (a.name || '').toLowerCase().includes(q)) : st.athletes.slice(0, renderedCount);
      athletesList.innerHTML = filtered.length ? filtered.map(a => `
        <div class="region-athlete-card region-leader-card" data-open-athlete-id="${a.id}">
          <div class="region-leader-avatar">
            ${getAthleteAvatarHtml(a, 44)}
          </div>
          <div class="region-athlete-info region-leader-info">
            <b class="region-leader-name text-wrap-safe">${esc(a.name)}</b>
            <span class="text-wrap-safe">${esc(a.club || a.city || reg.capital)}</span>
          </div>
          <div class="region-athlete-badges region-leader-badges">
            ${(a.competitions && a.competitions.length) ? `<span class="reg-badge-rec">${a.competitions.length} ст.</span>` : ''}
          </div>
        </div>
      `).join('') : '<div class="empty">Спортсменов по данному запросу не найдено.</div>';
    });
  }

  const loadMoreBtn = $('#region-load-more-athletes');
  if (loadMoreBtn && athletesList) {
    loadMoreBtn.addEventListener('click', () => {
      renderedCount += 30;
      const q = (athleteFilterInput?.value || '').trim().toLowerCase();
      const slice = q ? st.athletes.filter(a => (a.name || '').toLowerCase().includes(q)) : st.athletes.slice(0, renderedCount);
      athletesList.innerHTML = slice.map(a => `
        <div class="region-athlete-card region-leader-card" data-open-athlete-id="${a.id}">
          <div class="region-leader-avatar">
            ${getAthleteAvatarHtml(a, 44)}
          </div>
          <div class="region-athlete-info region-leader-info">
            <b class="region-leader-name text-wrap-safe">${esc(a.name)}</b>
            <span class="text-wrap-safe">${esc(a.club || a.city || reg.capital)}</span>
          </div>
          <div class="region-athlete-badges region-leader-badges">
            ${(a.competitions && a.competitions.length) ? `<span class="reg-badge-rec">${a.competitions.length} ст.</span>` : ''}
          </div>
        </div>
      `).join('');
      if (renderedCount >= st.athletes.length) {
        loadMoreBtn.remove();
      }
    });
  }

  go('region', false, push ? null : restoreScrollY);

  const hashTarget = `#region/${reg.id}`;
  if (push && location.hash !== hashTarget) {
    history.pushState({ screen: 'region', id: reg.id }, '', hashTarget);
  } else if (location.hash !== hashTarget) {
    history.replaceState({ screen: 'region', id: reg.id }, '', hashTarget);
  }

  if (push) {
    resetScrollToTop();
  } else {
    const y = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`region/${reg.id}`);
    if (typeof y === 'number') {
      restoreScrollPosition(y);
    } else {
      resetScrollToTop();
    }
  }
}

const HISTORY = [
  ['1930-е', 'Комплекс «Готов к труду и обороне» появился в СССР как система физической подготовки и быстро стал массовым движением.'],
  ['2020', 'В декабре в Кисловодске прошёл первый в современной России чемпионат по многоборью ГТО — «Игры ГТО».'],
  ['2022', 'После региональных и всероссийских стартов была создана Федерация многоборья ГТО России.'],
  ['2023', '28 марта многоборье ГТО официально признано самостоятельным видом спорта.'],
  ['Сегодня', 'Соревнования объединяют упражнения на силу, скорость, гибкость, выносливость, меткость и ловкость.']
];

const DISCIPLINES = [
  ['3-Борье с бегом', 'Бег 800 / 1000 / 2000 м или 1000 / 1500 / 3000 м, комплекс функциональных упражнений и стрельба ПК-10 или К-25.'],
  ['3-Борье с плаванием', 'Плавание 50 / 100 / 200 / 400 м, комплекс функциональных упражнений и стрельба ПК-10 или К-25.'],
  ['3-Борье с лыжной гонкой', 'Лыжная гонка 1000 / 2500 м либо дистанция 3000 / 5000 м, функциональный комплекс и стрельба.'],
  ['Салки ГТО', 'Индивидуальный формат 1×1 или командный до 6 человек; 6–12 раундов до 30 секунд с препятствиями и упражнениями на ловкость.']
];

function renderHistory() {
  $('#history-content').innerHTML = `<div class="page-title"><span>Официальная хронология</span><h1>История</h1><p>Как комплекс ГТО стал современным соревновательным видом спорта.</p></div><div class="history-timeline">${HISTORY.map(([year, copy]) => `<div class="history-item"><span class="history-dot">${esc(year)}</span><div class="history-copy"><b>${esc(year)}</b><p>${esc(copy)}</p></div></div>`).join('')}</div><div class="legal">Материал импортирован из официального раздела «История» Федерации.</div>`;
}

function renderDisciplines() {
  $('#disciplines-content').innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">
      Главная / О Федерации / Дисциплины Многоборья Готов к труду и обороне
    </div>
    <div class="page-title" style="margin-bottom:16px">
      <span style="color:#ef4444;font-weight:700">Официально признанный вид спорта (ВРВС 1810001411Я)</span>
      <h1 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:22px;line-height:1.2;margin:4px 0 8px">
        ДИСЦИПЛИНЫ МНОГОБОРЬЯ ГОТОВ К ТРУДУ И ОБОРОНЕ
      </h1>
      <p style="font-size:13px;color:#94a3b8;line-height:1.5">
        Многоборье ГТО объединяет беговые, лыжные, плавательные дистанции, комплексы функциональных силовых упражнений, стрельбу и динамичные командные салки.
      </p>
    </div>

    <!-- КАРТОЧКИ ДИСЦИПЛИН В СТИЛЕ ЭТАЛОНА GTO.COM.RU -->
    <div class="gto-disciplines-grid" style="display:flex;flex-direction:column;gap:18px">
      
      <!-- 1. 3-БОРЬЕ С БЕГОМ -->
      <article class="gto-disc-fullcard" style="background:radial-gradient(circle at 50% 0%, rgba(30,58,138,0.45) 0%, rgba(7,17,31,0.95) 100%);border:1px solid rgba(56,189,248,0.3);border-radius:20px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#ef4444,#b91c1c);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 14px rgba(239,68,68,0.4)">
            🏃
          </div>
          <div>
            <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:20px;color:#fff;margin:0;letter-spacing:0.5px">3-БОРЬЕ С БЕГОМ</h2>
            <small style="color:#38bdf8;font-weight:600">Бег + Функциональный комплекс + Стрельба</small>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px">
          <div>
            <div style="color:#38bdf8;font-weight:800;font-size:15px;margin-bottom:4px">
              Бег 800 / 1000 / 2000 м
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение ПК-10
            </div>
          </div>
          <div style="height:1px;background:rgba(255,255,255,0.08)"></div>
          <div>
            <div style="color:#38bdf8;font-weight:800;font-size:15px;margin-bottom:4px">
              Бег 1000 / 1500 / 3000 м
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение К-25
            </div>
          </div>
        </div>

        <div style="font-size:12.5px;color:#94a3b8;line-height:1.6">
          <b style="color:#e2e8f0;display:block;margin-bottom:4px">Возрастные категории спортсменов (или команд из 6 спортсменов):</b>
          <div>+ Девушки и юноши 14-15 лет</div>
          <div>+ Девушки и юноши 16-17 лет</div>
          <div>+ Юниорки и юниоры 18-20 лет</div>
          <div>+ Юниорки и юниоры 21-23 года</div>
          <div>+ Женщины и мужчины 24-34 года, 35+ лет</div>
        </div>
      </article>

      <!-- 2. 3-БОРЬЕ С ПЛАВАНИЕМ -->
      <article class="gto-disc-fullcard" style="background:radial-gradient(circle at 50% 0%, rgba(14,116,144,0.45) 0%, rgba(7,17,31,0.95) 100%);border:1px solid rgba(6,182,212,0.3);border-radius:20px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#06b6d4,#0e7490);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 14px rgba(6,182,212,0.4)">
            🏊
          </div>
          <div>
            <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:20px;color:#fff;margin:0;letter-spacing:0.5px">3-БОРЬЕ С ПЛАВАНИЕМ</h2>
            <small style="color:#67e8f9;font-weight:600">Плавание + Силовая гимнастика + Стрельба</small>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px">
          <div>
            <div style="color:#67e8f9;font-weight:800;font-size:15px;margin-bottom:4px">
              Плавание 50 / 100 / 200 м
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение ПК-10
            </div>
          </div>
          <div style="height:1px;background:rgba(255,255,255,0.08)"></div>
          <div>
            <div style="color:#67e8f9;font-weight:800;font-size:15px;margin-bottom:4px">
              Плавание 50 / 100 / 200 / 400 м
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение К-25
            </div>
          </div>
        </div>

        <div style="font-size:12.5px;color:#94a3b8;line-height:1.6">
          <b style="color:#e2e8f0;display:block;margin-bottom:4px">Возрастные категории спортсменов (или команд из 6 спортсменов):</b>
          <div>+ Девушки и юноши 14-15 лет</div>
          <div>+ Девушки и юноши 16-17 лет</div>
          <div>+ Юниорки и юниоры 18-20 лет</div>
          <div>+ Юниорки и юниоры 21-23 года</div>
          <div>+ Женщины и мужчины 24-34 года, 35+ лет</div>
        </div>
      </article>

      <!-- 3. 3-БОРЬЕ С ЛЫЖНОЙ ГОНКОЙ -->
      <article class="gto-disc-fullcard" style="background:radial-gradient(circle at 50% 0%, rgba(79,70,229,0.45) 0%, rgba(7,17,31,0.95) 100%);border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#4338ca);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 14px rgba(99,102,241,0.4)">
            ⛷️
          </div>
          <div>
            <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:20px;color:#fff;margin:0;letter-spacing:0.5px">3-БОРЬЕ С ЛЫЖНОЙ ГОНКОЙ</h2>
            <small style="color:#a5b4fc;font-weight:600">Лыжная гонка / Кросс + Комплекс + Стрельба</small>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px">
          <div>
            <div style="color:#a5b4fc;font-weight:800;font-size:15px;margin-bottom:4px">
              Лыжная гонка 1000 / 2500 м
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение ПК-10
            </div>
          </div>
          <div style="height:1px;background:rgba(255,255,255,0.08)"></div>
          <div>
            <div style="color:#a5b4fc;font-weight:800;font-size:15px;margin-bottom:4px">
              Бег 3000 / 5000 м или Лыжная гонка
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5">
              + Комплекс функциональных упражнений<br>
              + Стрельба – упражнение К-25
            </div>
          </div>
        </div>

        <div style="font-size:12.5px;color:#94a3b8;line-height:1.6">
          <b style="color:#e2e8f0;display:block;margin-bottom:4px">Возрастные категории спортсменов (или команд из 6 спортсменов):</b>
          <div>+ Девушки и юноши 14-15 лет</div>
          <div>+ Девушки и юноши 16-17 лет</div>
          <div>+ Юниорки и юниоры 18-20 лет</div>
          <div>+ Юниорки и юниоры 21-23 года</div>
        </div>
      </article>

      <!-- 4. САЛКИ ГТО -->
      <article class="gto-disc-fullcard" style="background:radial-gradient(circle at 50% 0%, rgba(217,119,6,0.45) 0%, rgba(7,17,31,0.95) 100%);border:1px solid rgba(245,158,11,0.3);border-radius:20px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 14px rgba(245,158,11,0.4)">
            ⚡
          </div>
          <div>
            <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:20px;color:#fff;margin:0;letter-spacing:0.5px">САЛКИ ГТО (TAG SPORT)</h2>
            <small style="color:#fde68a;font-weight:600">Скорость, ловкость и преодоление полосы препятствий</small>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
          <div style="font-size:13.5px;color:#fde68a;font-weight:700">
            Индивидуальный зачёт: 1х1 (6–12 раундов, каждый до 30 секунд)
          </div>
          <div style="font-size:13.5px;color:#fde68a;font-weight:700">
            Командный зачёт: 2х2, 3х3, 4х4, 5х5, 6х6 (6–12 раундов до 30 секунд)
          </div>
          <p style="font-size:12.5px;color:#cbd5e1;line-height:1.5;margin:4px 0 0">
            Прыжки в длину и высоту, перелезания, пролазанья, кувырки, челночный бег, упражнения на гибкость, моторику, реакцию и пространственную ловкость.
          </p>
        </div>

        <div style="font-size:12.5px;color:#94a3b8;line-height:1.6">
          <b style="color:#e2e8f0;display:block;margin-bottom:4px">Возрастные категории:</b>
          <div>+ Девушки и юноши: 14-15 лет, 16-17 лет</div>
          <div>+ Юниорки и юниоры: 18-20 лет, 21-23 года</div>
          <div>+ Женщины и мужчины: 24-34 года, 35+ лет</div>
        </div>
      </article>

      <!-- 5. ГЕРОЙ ГТО / НАРОДНЫЕ ИГРЫ -->
      <article class="gto-disc-fullcard" style="background:radial-gradient(circle at 50% 0%, rgba(220,38,38,0.45) 0%, rgba(7,17,31,0.95) 100%);border:1px solid rgba(239,68,68,0.35);border-radius:20px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#ef4444,#991b1b);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 14px rgba(239,68,68,0.4)">
            🔥
          </div>
          <div>
            <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:20px;color:#fff;margin:0;letter-spacing:0.5px">ГЕРОЙ ГТО</h2>
            <small style="color:#fca5a5;font-weight:600">Многоборье гибридного атлета (Кардио + Сила)</small>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
          <div style="color:#fff;font-size:13.5px;line-height:1.5">
            Уникальный формат проверки атлета в силовой и кардионагрузке одновременно:
            <b style="color:#38bdf8;display:block;margin-top:6px">
              Бег + 5 последовательных функциональных станций:
            </b>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;margin-top:8px;font-size:12px;color:#cbd5e1">
              <span style="background:rgba(255,255,255,0.05);padding:6px;border-radius:8px;text-align:center">1. Строгие подтягивания</span>
              <span style="background:rgba(255,255,255,0.05);padding:6px;border-radius:8px;text-align:center">2. Отжимания</span>
              <span style="background:rgba(255,255,255,0.05);padding:6px;border-radius:8px;text-align:center">3. Приседания</span>
              <span style="background:rgba(255,255,255,0.05);padding:6px;border-radius:8px;text-align:center">4. Зашагивания на короб</span>
              <span style="background:rgba(255,255,255,0.05);padding:6px;border-radius:8px;text-align:center">5. Пресс</span>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="font-size:12px;color:#94a3b8">
            Категории: «Первая попытка» (6+), «Любители» (12+), «Продвинутые» (14+), «Профессионалы» (16+)
          </div>
          <button type="button" data-go="hero" class="link-action" style="padding:8px 14px;font-size:12px">
            Перейти в кабинет Героя ГТО ↗
          </button>
        </div>
      </article>

    </div>

    <!-- ЕВСК СПОРТИВНЫЕ РАЗРЯДЫ -->
    <div class="section-head" style="margin-top:32px">
      <div>
        <span style="color:#38bdf8;font-weight:700">Минспорт России · ЕВСК</span>
        <h2 style="font-family:'TT Squares','Unbounded',sans-serif;font-size:18px">Спортивные разряды по Многоборью ГТО</h2>
      </div>
    </div>
    <p class="fact-source" style="margin-bottom:14px">
      Официальные разрядные нормативы Единой всероссийской спортивной классификации по виду спорта «Многоборье ГТО» (номер-код ВРВС: 1810001411Я).

    </p>

    <div class="evsk-disciplines">
      ${EVSK_DISCIPLINES.map(disc => `
        <div class="evsk-disc-block" style="background:rgba(7,17,31,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px;margin-bottom:16px">
          <h3 style="color:#fff;margin:0 0 6px;font-size:16px">${esc(disc.title)}</h3>
          <p style="font-size:12.5px;color:#94a3b8;margin:0 0 12px;line-height:1.4">${esc(disc.description)}</p>
          <div class="table-scroll">
            <table class="result-table" style="width:100%;font-size:12px">
              <tr class="tbl-head" style="background:rgba(255,255,255,0.04);color:#38bdf8">
                <th style="padding:8px">Разряд</th>
                <th style="padding:8px">Мужчины</th>
                <th style="padding:8px">Женщины</th>
                <th style="padding:8px">Условия выполнения</th>
              </tr>
              ${disc.malePoints.map((mp, idx) => {
                const fp = disc.femalePoints[idx] || {};
                return `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                    <td style="padding:8px"><b style="color:#fff">${esc(mp.rank)}</b></td>
                    <td style="padding:8px">${esc(mp.points)}${typeof mp.points === 'number' ? ' очков' : ''}</td>
                    <td style="padding:8px">${esc(fp.points || '—')}${typeof fp.points === 'number' ? ' очков' : ''}</td>
                    <td style="padding:8px"><small style="color:#94a3b8">${esc(mp.conditions)}</small></td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAbout() {
  $('#about-content').innerHTML = `<div class="page-title"><span>Официально</span><h1>О Федерации</h1><p>${esc(FEDERATION.definition)}</p></div>
<div class="fact-grid">${FEDERATION.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div><p class="fact-source">Показатели опубликованы на gto.com.ru (данные на конец 2024 года).</p>
<div class="section-head"><div><span>Как всё начиналось</span><h2>История</h2></div></div><div class="about-history">${FEDERATION.history.map(p => `<p>${esc(p)}</p>`).join('')}</div>
<div class="section-head"><div><span>Что развивает спорт</span><h2>Дисциплины</h2></div></div><div class="quality-chips">${FEDERATION.qualities.map(q => `<span>${esc(q)}</span>`).join('')}</div>
<div class="section-head"><div><span>Разделы Федерации</span><h2>Подробнее</h2></div></div><div class="link-stack">${FEDERATION.links.map(([t, u, go]) => go ? `<button data-go="${esc(u)}"><span><b>${esc(t)}</b></span><strong>→</strong></button>` : `<a href="${safeUrl(u)}" target="_blank" rel="noopener"><span><b>${esc(t)}</b></span><strong>↗</strong></a>`).join('')}</div>
<div class="legal">Раздел собран из открытых официальных материалов Федерации. Имена и составы руководящих органов не публикуются здесь во избежание неточностей — открывайте первоисточник.</div>`;
}

// ----------------------------------------------------
// БЕНЧМАРКИ И КАЛЬКУЛЯТОР 18 СТУПЕНЕЙ ГТО
// ----------------------------------------------------
function findRecordBenchmark(testName, sex) {
  const s = (testName || '').toLowerCase();
  let kw = null;
  if (/подтяг/.test(s)) kw = 'подтягивани';
  else if (/отжим/.test(s)) kw = 'отжимания';
  else if (/гир|рывок/.test(s)) kw = 'рывок';
  else if (/прыж/.test(s)) kw = 'прыжок';
  else if (/наклон|гибк/.test(s)) kw = 'наклон';
  else if (/60\s*м/.test(s)) kw = '60';
  else if (/3000\s*м/.test(s)) kw = '3000';
  if (!kw) return null;
  return GTO_RECORDS.find(r => (sex === 'ALL' || r.sex === sex) && (r.discipline || '').toLowerCase().includes(kw));
}

function formatNormVal(t, val) {
  if (t.isTime) {
    const m = Math.floor(val / 60);
    const s = String(val % 60).padStart(2, '0');
    return `${m}:${s}`;
  }
  return String(val);
}

function parseTestValue(t, val) {
  if (val == null || val === '') return null;
  val = String(val).trim();
  if (t.isTime && val.includes(':')) {
    const parts = val.split(':');
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function testBenchmarkHtml(t, userVal) {
  const bench = findRecordBenchmark(t.name, state.calcSex);
  if (!bench) return '';
  let diffStr = '';
  const numVal = parseTestValue(t, userVal);
  if (numVal !== null) {
    let numRec = parseFloat(String(bench.result).replace(',', '.'));
    if (t.isTime && String(bench.result).includes(':')) {
      const parts = String(bench.result).split(':');
      numRec = (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    }
    if (!isNaN(numRec)) {
      const diff = Math.round(Math.abs(numRec - numVal) * 10) / 10;
      if (t.lowerIsBetter) {
        diffStr = numVal <= numRec ? 'Вы побили рекорд РФ!' : `До рекорда: +${diff} ${t.unit}`;
      } else {
        diffStr = numVal >= numRec ? 'Вы побили рекорд РФ!' : `До рекорда: ${diff} ${t.unit}`;
      }
    }
  }
  return `<div class="calc-benchmark-badge">
    <span>Рекорд РФ: <b>${esc(bench.result)}</b> (<button type="button" class="athlete-name-btn inline" data-athlete-query="${esc(bench.holder)}">${esc(bench.holder)} ↗</button>)</span>
    ${diffStr ? `<span>${esc(diffStr)}</span>` : ''}
  </div>`;
}


function getActiveCalculatorTests() {
  if (state.calcMode === 'ovz') {
    return getOvzNorms(state.calcOvzCategory, state.calcSex);
  }
  const stage = getStageByAge(state.calcAge);
  return getNormsForStage(stage.id, state.calcSex);
}

function calculateStructureBadge(tests, stage) {
  const req = state.calcMode === 'ovz'
    ? { gold: { mandatory: 4, optional: 2, total: 6 }, silver: { mandatory: 4, optional: 1, total: 5 }, bronze: { mandatory: 4, optional: 1, total: 5 } }
    : getBadgeRequirements(stage ? stage.id : 8);

  let mandGold = 0, mandSilver = 0, mandBronze = 0, mandFilled = 0;
  let totalMandatory = 4;
  let totalFilled = 0;
  const optCandidateResults = [];

  if (state.calcMode === 'ovz') {
    totalMandatory = tests.filter(t => t.mandatory).length;
    tests.forEach(t => {
      const userVal = state.calcValues[t.id];
      const numVal = parseTestValue(t, userVal);
      const grade = numVal !== null ? evaluateTest(t, numVal) : null;
      if (grade) {
        totalFilled++;
        if (t.mandatory) {
          mandFilled++;
          if (grade === 'gold') mandGold++;
          else if (grade === 'silver') mandSilver++;
          else if (grade === 'bronze') mandBronze++;
        } else {
          optCandidateResults.push({ id: t.id, grade, weight: grade === 'gold' ? 3 : grade === 'silver' ? 2 : 1 });
        }
      }
    });
  } else {
    // Общий комплекс: 4 обязательные группы (скорость, выносливость, сила, гибкость)
    const mandGroups = ['speed', 'endurance', 'strength', 'flexibility'];
    totalMandatory = mandGroups.length;

    mandGroups.forEach(grp => {
      const grpTests = tests.filter(t => t.mandatory && t.group === grp);
      const selId = state.calcSelectedAlt?.[grp] || grpTests[0]?.id;

      let bestTest = null;
      let bestWeight = 0;
      const surplusTests = [];

      grpTests.forEach(t => {
        const userVal = state.calcValues[t.id];
        const numVal = parseTestValue(t, userVal);
        const grade = numVal !== null ? evaluateTest(t, numVal) : null;
        if (grade) {
          totalFilled++;
          const weight = grade === 'gold' ? 3 : grade === 'silver' ? 2 : 1;
          if (!bestTest || (t.id === selId && bestWeight < weight) || weight > bestWeight) {
            if (bestTest) surplusTests.push(bestTest);
            bestTest = { id: t.id, grade, weight };
            bestWeight = weight;
          } else {
            surplusTests.push({ id: t.id, grade, weight });
          }
        }
      });

      if (bestTest) {
        mandFilled++;
        if (bestTest.grade === 'gold') mandGold++;
        else if (bestTest.grade === 'silver') mandSilver++;
        else if (bestTest.grade === 'bronze') mandBronze++;
      }

      // Дополнительные сданные нормативы из обязательной группы идут в зачёт тестов по выбору!
      surplusTests.forEach(st => optCandidateResults.push(st));
    });

    // Собираем результаты тестов по выбору
    tests.filter(t => !t.mandatory || t.group === 'optional').forEach(t => {
      const userVal = state.calcValues[t.id];
      const numVal = parseTestValue(t, userVal);
      const grade = numVal !== null ? evaluateTest(t, numVal) : null;
      if (grade) {
        totalFilled++;
        optCandidateResults.push({ id: t.id, grade, weight: grade === 'gold' ? 3 : grade === 'silver' ? 2 : 1 });
      }
    });
  }

  // Сортируем результаты по выбору по убыванию ранга (Золото > Серебро > Бронза)
  optCandidateResults.sort((a, b) => b.weight - a.weight);

  const optFilled = optCandidateResults.length;
  const optGoldPlus = optCandidateResults.filter(x => x.weight >= 3).length;
  const optSilverPlus = optCandidateResults.filter(x => x.weight >= 2).length;
  const optBronzePlus = optCandidateResults.filter(x => x.weight >= 1).length;

  const mandGoldPlus = mandGold;
  const mandSilverPlus = mandGold + mandSilver;
  const mandBronzePlus = mandGold + mandSilver + mandBronze;

  let overallBadge = 'none';
  if (mandGoldPlus >= req.gold.mandatory && optGoldPlus >= req.gold.optional) {
    overallBadge = 'gold';
  } else if (mandSilverPlus >= req.silver.mandatory && optSilverPlus >= req.silver.optional) {
    overallBadge = 'silver';
  } else if (mandBronzePlus >= req.bronze.mandatory && optBronzePlus >= req.bronze.optional) {
    overallBadge = 'bronze';
  }

  // Выбираем ID тестов, которые идут в зачёт знака
  const needOptCount = overallBadge === 'gold' ? req.gold.optional : overallBadge === 'silver' ? req.silver.optional : req.bronze.optional;
  const contributingOptIds = optCandidateResults.slice(0, needOptCount).map(x => x.id);

  let hint = '';
  if (overallBadge === 'gold') {
    hint = '🎉 Поздравляем! Вы закрыли все обязательные испытания и тесты по выбору на ЗОЛОТОЙ знак отличия ГТО!';
  } else if (overallBadge === 'silver') {
    const needMand = Math.max(0, req.gold.mandatory - mandGoldPlus);
    const needOpt = Math.max(0, req.gold.optional - optGoldPlus);
    if (needMand === 0 && needOpt === 0) {
      hint = '🥈 Серебряный знак закрыт! Чтобы получить Золото, улучшите сданные тесты с серебра до золотого норматива.';
    } else {
      hint = `🥈 Серебряный знак закрыт! До Золота нужно сдать на золотой стандарт: ${needMand ? needMand + ' обязат. ' : ''}${needOpt ? needOpt + ' по выбору' : ''}.`;
    }
  } else if (overallBadge === 'bronze') {
    const needMand = Math.max(0, req.silver.mandatory - mandSilverPlus);
    const needOpt = Math.max(0, req.silver.optional - optSilverPlus);
    hint = `🥉 Бронзовый знак закрыт! До Серебра осталось сдать не ниже серебра: ${needMand ? needMand + ' обязат. ' : ''}${needOpt ? needOpt + ' по выбору' : ''}.`;
  } else {
    const needMand = Math.max(0, req.bronze.mandatory - mandBronzePlus);
    const needOpt = Math.max(0, req.bronze.optional - optBronzePlus);
    if (totalFilled === 0) {
      hint = `🎯 Чтобы получить знак: сдайте 4 обязательных вида (по 1 из каждой группы) и любые ${req.gold.optional} по выбору. Выберите удобные дисциплины ниже.`;
    } else {
      const mandLeft = Math.max(0, totalMandatory - mandFilled);
      const optLeft = Math.max(0, req.gold.optional - optFilled);
      hint = `📊 Сдано тестов: ${totalFilled}. Для знака осталось сдать: ${mandLeft > 0 ? mandLeft + ' из обязательных групп, ' : 'все обязательные сданы! '}${optLeft > 0 ? optLeft + ' по выбору' : 'тесты по выбору закрыты'}.`;
    }
  }

  const totalOptional = state.calcMode === 'ovz'
    ? tests.filter(t => !t.mandatory).length
    : tests.filter(t => !t.mandatory || t.group === 'optional').length;

  return {
    overallBadge,
    req,
    totalFilled,
    mandFilled,
    totalMandatory,
    optFilled,
    totalOptional,
    mandGoldPlus,
    optGoldPlus,
    contributingOptIds,
    hint
  };
}

function renderNormGaugeHtml(t, userVal) {
  const numVal = parseTestValue(t, userVal);
  const isTime = Boolean(t.isTime);
  const b = t.bronze;
  const s = t.silver;
  const g = t.gold;

  if (numVal === null || !userVal) {
    return `
      <div class="calc-norm-gauge">
        <div class="cng-track-wrap">
          <div class="cng-zones">
            <div class="cng-zone bronze" style="width:33.3%"></div>
            <div class="cng-zone silver" style="width:33.3%"></div>
            <div class="cng-zone gold" style="width:33.4%"></div>
          </div>
        </div>
        <div class="cng-footer">
          <span class="cng-hint need">Коснитесь норматива выше или сдвиньте регулятор</span>
          <span style="font-size:10px;color:#94a3b8">Золото: ${formatNormVal(t, g)} ${esc(t.unit)}</span>
        </div>
      </div>
    `;
  }

  const grade = evaluateTest(t, numVal);
  let pct = 0;
  let gaugeHint = '';
  let hintCls = grade || 'need';

  if (!isTime) {
    if (numVal < b) {
      pct = Math.max(4, Math.min(30, (numVal / (b || 1)) * 33.3));
      const diff = b - numVal;
      gaugeHint = `До Бронзы: ещё ${diff % 1 === 0 ? diff : diff.toFixed(1)} ${t.unit}`;
      hintCls = 'need';
    } else if (numVal < s) {
      const seg = (numVal - b) / ((s - b) || 1);
      pct = 33.3 + Math.min(32, seg * 33.3);
      const diff = s - numVal;
      gaugeHint = `🥉 Бронза! До Серебра: ещё ${diff % 1 === 0 ? diff : diff.toFixed(1)} ${t.unit}`;
      hintCls = 'bronze';
    } else if (numVal < g) {
      const seg = (numVal - s) / ((g - s) || 1);
      pct = 66.6 + Math.min(30, seg * 30);
      const diff = g - numVal;
      gaugeHint = `🥈 Серебро! До Золота: ещё ${diff % 1 === 0 ? diff : diff.toFixed(1)} ${t.unit} 🥇`;
      hintCls = 'silver';
    } else {
      const extra = numVal - g;
      pct = Math.min(97, 92 + Math.min(5, (extra / (g || 1)) * 10));
      gaugeHint = extra > 0 ? `🥇 Золото! (+${extra % 1 === 0 ? extra : extra.toFixed(1)} сверх нормы)` : `🥇 Золотой норматив выполнен!`;
      hintCls = 'gold';
    }
  } else {
    if (numVal > b) {
      const diff = numVal - b;
      pct = Math.max(4, 25 - Math.min(20, (diff / (b || 1)) * 30));
      gaugeHint = `До Бронзы: сбросить ${diff.toFixed(1)} сек`;
      hintCls = 'need';
    } else if (numVal > s) {
      const seg = (b - numVal) / ((b - s) || 1);
      pct = 33.3 + Math.min(32, seg * 33.3);
      const diff = numVal - s;
      gaugeHint = `🥉 Бронза! До Серебра: сбросить ${diff.toFixed(1)} сек`;
      hintCls = 'bronze';
    } else if (numVal > g) {
      const seg = (s - numVal) / ((s - g) || 1);
      pct = 66.6 + Math.min(30, seg * 30);
      const diff = numVal - g;
      gaugeHint = `🥈 Серебро! До Золота: ещё ${diff.toFixed(1)} сек 🥇`;
      hintCls = 'silver';
    } else {
      const extra = g - numVal;
      pct = Math.min(97, 92 + Math.min(5, (extra / (g || 1)) * 10));
      gaugeHint = extra > 0 ? `🥇 Золото! (быстрее нормы на ${extra.toFixed(1)} сек)` : `🥇 Золотой норматив выполнен!`;
      hintCls = 'gold';
    }
  }

  const ptrCls = grade || 'need';

  return `
    <div class="calc-norm-gauge">
      <div class="cng-track-wrap">
        <div class="cng-zones">
          <div class="cng-zone bronze" style="width:33.3%"></div>
          <div class="cng-zone silver" style="width:33.3%"></div>
          <div class="cng-zone gold" style="width:33.4%"></div>
        </div>
        <div class="cng-pointer ${ptrCls}" style="left:${pct.toFixed(1)}%">
          <span class="cng-pointer-dot"></span>
        </div>
      </div>
      <div class="cng-footer">
        <span class="cng-hint ${hintCls}">${gaugeHint}</span>
        <span style="font-size:9.5px;color:#64748b">З: ${formatNormVal(t, g)}</span>
      </div>
    </div>
  `;
}

function renderHeroBadgeBannerHtml(struct, curBadge, overallBadge, stage, isOvz) {
  const mandReq = struct.req?.gold?.mandatory || 4;
  const optReq = struct.req?.gold?.optional || 2;
  const mandPct = Math.min(100, Math.round((struct.mandFilled / mandReq) * 100));
  const optPct = Math.min(100, Math.round((struct.optFilled / optReq) * 100));

  const c1 = 238.76;
  const off1 = c1 * (1 - mandPct / 100);

  const c2 = 188.5;
  const off2 = c2 * (1 - optPct / 100);

  const trophyEmoji = overallBadge === 'gold' ? '🥇' : overallBadge === 'silver' ? '🥈' : overallBadge === 'bronze' ? '🥉' : '🎯';
  const badgeClass = overallBadge === 'gold' ? 'calc-gold' : overallBadge === 'silver' ? 'calc-silver' : overallBadge === 'bronze' ? 'calc-bronze' : 'calc-none';

  const sharePayload = esc(JSON.stringify({
    type: 'badge',
    badge: overallBadge,
    stage: isOvz ? 'ОВЗ / Адаптивный спорт' : stage.label,
    ageRange: isOvz ? (GTO_OVZ_CATEGORIES.find(c => c.id === state.calcOvzCategory)?.shortName || 'ОВЗ') : stage.ageRange,
    sex: state.calcSex === 'M' ? 'Мужчины' : 'Женщины',
    age: state.calcAge,
    filled: struct.totalFilled,
    total: struct.req?.gold?.total || 6
  }));

  return `
    <div id="calc-badge-banner" class="calc-hero-badge-wrap ${badgeClass}">
      <div class="calc-rings-box">
        <svg class="calc-rings-svg" viewBox="0 0 90 90">
          <defs>
            <linearGradient id="calc-grad-mand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#2563eb"/>
            </linearGradient>
            <linearGradient id="calc-grad-opt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#34d399"/>
              <stop offset="100%" stop-color="#059669"/>
            </linearGradient>
          </defs>
          <!-- Внешнее кольцо: обязательные -->
          <circle class="calc-ring-bg" cx="45" cy="45" r="38" stroke-width="6"/>
          <circle class="calc-ring-meter calc-ring-mand" cx="45" cy="45" r="38" stroke-width="6"
            stroke-dasharray="${c1.toFixed(1)}" stroke-dashoffset="${off1.toFixed(1)}"/>
          <!-- Внутреннее кольцо: по выбору -->
          <circle class="calc-ring-bg" cx="45" cy="45" r="30" stroke-width="5"/>
          <circle class="calc-ring-meter calc-ring-opt" cx="45" cy="45" r="30" stroke-width="5"
            stroke-dasharray="${c2.toFixed(1)}" stroke-dashoffset="${off2.toFixed(1)}"/>
        </svg>
        <div class="calc-trophy-center">
          <span>${trophyEmoji}</span>
        </div>
      </div>

      <div class="calc-hero-info">
        <div class="calc-hero-rank-tag">
          <span>${overallBadge === 'gold' ? '★ ВЫСШИЙ СТАНДАРТ' : overallBadge === 'silver' ? '★ ВЫСОКИЙ УРОВЕНЬ' : overallBadge === 'bronze' ? '★ НОРМАТИВ ВЫПОЛНЕН' : '● В ПРОЦЕССЕ СДАЧИ'}</span>
        </div>
        <h3 class="calc-hero-title">${curBadge.title}</h3>
        <p class="calc-hero-desc">${curBadge.sub}</p>
        
        <div class="calc-hero-legend">
          <div class="calc-hero-leg-item">
            <span class="calc-hero-leg-dot mand"></span>
            <span>Обязательные: <b>${struct.mandFilled}/${mandReq}</b></span>
          </div>
          <div class="calc-hero-leg-item">
            <span class="calc-hero-leg-dot opt"></span>
            <span>По выбору: <b>${struct.optFilled}/${optReq}</b></span>
          </div>
        </div>
      </div>

      ${overallBadge !== 'none' ? `
        <button class="calc-share-btn" data-share-data="${sharePayload}" style="margin-left:auto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          <span>Поделиться</span>
        </button>
      ` : ''}
    </div>
  `;
}

function applyCalculatorPreset(targetGrade) {
  const tests = getActiveCalculatorTests();
  const stage = getStageByAge(state.calcAge);
  const req = state.calcMode === 'ovz'
    ? { gold: { mandatory: 4, optional: 2 }, silver: { mandatory: 4, optional: 1 } }
    : getBadgeRequirements(stage ? stage.id : 8);

  const reqTarget = targetGrade === 'gold' ? req.gold : req.silver;
  state.calcValues = {};

  if (state.calcMode === 'ovz') {
    const mand = tests.filter(t => t.mandatory);
    const opt = tests.filter(t => !t.mandatory);
    mand.forEach(t => {
      state.calcValues[t.id] = formatNormVal(t, t[targetGrade]);
    });
    opt.slice(0, reqTarget.optional).forEach(t => {
      state.calcValues[t.id] = formatNormVal(t, t[targetGrade]);
    });
  } else {
    const mandGroups = ['speed', 'endurance', 'strength', 'flexibility'];
    state.calcSelectedAlt = state.calcSelectedAlt || {};
    mandGroups.forEach(grp => {
      const grpTests = tests.filter(t => t.mandatory && t.group === grp);
      const selId = state.calcSelectedAlt[grp] || grpTests[0]?.id;
      const t = grpTests.find(x => x.id === selId) || grpTests[0];
      if (t) {
        state.calcValues[t.id] = formatNormVal(t, t[targetGrade]);
      }
    });

    const optionalTests = tests.filter(t => !t.mandatory || t.group === 'optional');
    optionalTests.slice(0, reqTarget.optional).forEach(t => {
      state.calcValues[t.id] = formatNormVal(t, t[targetGrade]);
    });
  }

  saveCalculatorState();
  renderCalculator();
}

function renderStructureCardHtml(struct, curBadge, overallBadge) {
  const badgeShort = overallBadge === 'gold' ? 'Золото' : overallBadge === 'silver' ? 'Серебро' : overallBadge === 'bronze' ? 'Бронза' : 'В процессе';
  const mandPct = Math.min(100, Math.round((struct.mandFilled / struct.req.gold.mandatory) * 100));
  const optPct = Math.min(100, Math.round((struct.optFilled / struct.req.gold.optional) * 100));
  const isGuideOpen = Boolean(state.calcGuideOpen);

  return `
    <div class="calc-structure-card">
      <div class="calc-struct-header">
        <span class="calc-struct-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/></svg>
          Структура знака отличия
        </span>
        <span class="calc-struct-badge ${overallBadge}">${badgeShort}</span>
      </div>
      <div class="calc-struct-bars">
        <div class="calc-bar-item">
          <div class="calc-bar-label">
            <span>Обязательные тесты</span>
            <b>${struct.mandFilled} / ${struct.req.gold.mandatory}</b>
          </div>
          <div class="calc-progress-track">
            <div class="calc-progress-fill mandatory" style="width: ${mandPct}%"></div>
          </div>
        </div>
        <div class="calc-bar-item">
          <div class="calc-bar-label">
            <span>Тесты по выбору</span>
            <b>${struct.optFilled} / ${struct.req.gold.optional}</b>
          </div>
          <div class="calc-progress-track">
            <div class="calc-progress-fill optional" style="width: ${optPct}%"></div>
          </div>
        </div>
      </div>
      <div class="calc-struct-hint">${esc(struct.hint)}</div>

      <div class="calc-rules-accordion">
        <button type="button" class="calc-rules-toggle ${isGuideOpen ? 'open' : ''}" id="calc-rules-toggle-btn">
          <span>💡 Как рассчитывается знак отличия? (Правила)</span>
          <span class="calc-rules-arrow">▼</span>
        </button>
        <div class="calc-rules-content" id="calc-rules-dropdown" ${isGuideOpen ? '' : 'hidden'}>
          <div class="calc-rule-step gold">
            <b>🥇 Золотой знак</b>
            <p>Выполнить <b>все 4 обязательных</b> вида на золото + <b>любые ${struct.req.gold.optional} по выбору</b> на золото.</p>
          </div>
          <div class="calc-rule-step silver">
            <b>🥈 Серебряный знак</b>
            <p>Все зачётные испытания (4 обязательных + ${struct.req.silver.optional} по выбору) выполнены <b>не ниже серебра</b>.</p>
          </div>
          <div class="calc-rule-step bronze">
            <b>🥉 Бронзовый знак</b>
            <p>Все зачётные испытания (4 обязательных + ${struct.req.bronze.optional} по выбору) выполнены <b>не ниже бронзы</b>.</p>
          </div>
          <div class="calc-rule-note">
            <span class="cr-note-ic">⚖️</span>
            <div><b>Правило низшего знака:</b> итоговый знак присваивается по наименьшему результату среди зачётных тестов. Например, 5 видов на золото и 1 на серебро дают <b>Серебряный знак</b>.</div>
          </div>
          <div class="calc-rule-note">
            <span class="cr-note-ic">🎯</span>
            <div><b>Свобода выбора:</b> если вы сдали лишний норматив на более низкий знак, он не ухудшит общую награду! Калькулятор автоматически берёт в зачёт только ваши наивысшие баллы.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateCalculatorBadge(stage, tests) {
  const struct = calculateStructureBadge(tests, stage);
  const overallBadge = struct.overallBadge;

  const badgeMeta = {
    gold: { title: 'Золотой знак отличия ГТО', cls: 'calc-gold', sub: 'Все требования структуры знака выполнены на высший стандарт!' },
    silver: { title: 'Серебряный знак отличия ГТО', cls: 'calc-silver', sub: 'Норматив структуры знака закрыт на Серебряный знак' },
    bronze: { title: 'Бронзовый знак отличия ГТО', cls: 'calc-bronze', sub: 'Нормативы комплекса ГТО успешно сданы на Бронзу' },
    none: { title: 'Проверьте свои нормативы', cls: 'calc-none', sub: struct.totalFilled ? `Сдано ${struct.totalFilled} из ${struct.req?.gold?.total || 6} необходимых тестов` : 'Введите результаты для расчёта знака' }
  };
  const curBadge = badgeMeta[overallBadge];

  const bannerEl = $('#calc-badge-banner');
  if (bannerEl) {
    bannerEl.outerHTML = renderHeroBadgeBannerHtml(struct, curBadge, overallBadge, stage, state.calcMode === 'ovz');
  }

  const structBox = $('#calc-structure-container');
  if (structBox) {
    structBox.innerHTML = renderStructureCardHtml(struct, curBadge, overallBadge);
  }

  // --- Update section counter chips ---
  const isOvz = state.calcMode === 'ovz';
  const mandFilled = (() => {
    const mTests = isOvz
      ? tests.filter(t => t.mandatory)
      : ['speed', 'endurance', 'strength', 'flexibility'].map(grp => {
          const grpTs = tests.filter(t => t.mandatory && t.group === grp);
          const sel = state.calcSelectedAlt?.[grp];
          return grpTs.find(t => t.id === sel) || grpTs[0];
        }).filter(Boolean);
    return mTests.filter(t => {
      const v = state.calcValues[t.id];
      const n = parseTestValue(t, v);
      return n !== null && evaluateTest(t, n);
    }).length;
  })();
  const mandTotal = isOvz ? tests.filter(t => t.mandatory).length : 4;
  const optRequired = struct.req.gold.optional;
  const optFilled = struct.optFilled;

  const mandChip = $('#calc-mand-chip');
  if (mandChip) {
    mandChip.textContent = `${mandFilled}/${mandTotal}`;
    mandChip.className = `csh-chip${mandFilled === mandTotal && mandTotal > 0 ? ' chip-done' : ''}`;
  }
  const optChip = $('#calc-opt-chip');
  if (optChip) {
    optChip.textContent = `${optFilled}/${optRequired}`;
    optChip.className = `csh-chip${optFilled >= optRequired ? ' chip-done' : ''}`;
  }

  // --- Update mini sticky badge ---
  const miniBadge = $('#calc-mini-badge');
  if (miniBadge) {
    const emoji = overallBadge === 'gold' ? '🥇' : overallBadge === 'silver' ? '🥈' : overallBadge === 'bronze' ? '🥉' : null;
    if (emoji) {
      miniBadge.textContent = emoji + ' ' + curBadge.title;
      miniBadge.className = `calc-mini-badge visible ${overallBadge}`;
    } else {
      miniBadge.className = 'calc-mini-badge';
    }
  }

  // --- Celebration burst when earning Gold badge (A3) ---
  if (overallBadge === 'gold' && state._lastOverallBadge !== 'gold') {
    haptic([35, 50, 45]);
    setTimeout(fireGoldConfetti, 120);
  }
  state._lastOverallBadge = overallBadge;
}

function fireGoldConfetti() {
  const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#ffffff', '#eab308', '#38bdf8'];
  const banner = $('#calc-badge-banner');
  const rect = banner ? banner.getBoundingClientRect() : { left: window.innerWidth / 2, top: 200, width: 0, height: 0 };
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.4;
    const distance = 90 + Math.random() * 160;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 40;
    const rot = (Math.random() - 0.5) * 720;
    const size = 6 + Math.random() * 6;

    el.style.cssText = `
      position: fixed;
      left: ${originX}px;
      top: ${originY}px;
      width: ${size.toFixed(1)}px;
      height: ${(size * (Math.random() > 0.5 ? 1.4 : 1)).toFixed(1)}px;
      background: ${colors[i % colors.length]};
      border-radius: ${Math.random() > 0.4 ? '2px' : '50%'};
      pointer-events: none;
      z-index: 99999;
      --dx: ${dx.toFixed(1)}px;
      --dy: ${dy.toFixed(1)}px;
      --rot: ${rot.toFixed(0)}deg;
      animation: confettiBurst 1.6s cubic-bezier(0.15, 0.9, 0.3, 1) forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
}

function getTestSliderConfig(t) {
  const isTime = Boolean(t.isTime);
  const lower = Boolean(t.lowerIsBetter);
  const b = Number(t.bronze) || 0;
  const s = Number(t.silver) || 0;
  const g = Number(t.gold) || 0;

  if (isTime) {
    const minSec = Math.max(30, Math.round(g * 0.75));
    const maxSec = Math.round(b * 1.3);
    return {
      type: 'time',
      min: minSec,
      max: maxSec,
      step: 5,
      lowerIsBetter: true
    };
  }

  if (lower) {
    const minSec = Math.max(5.0, Math.round((g * 0.8) * 10) / 10);
    const maxSec = Math.round((b * 1.3) * 10) / 10;
    return {
      type: 'sprint',
      min: minSec,
      max: maxSec,
      step: 0.1,
      lowerIsBetter: true
    };
  }

  let minVal = 0;
  if (t.id === 'lean') minVal = -5;
  let maxVal = Math.max(Math.round(g * 1.4), g + 10);
  if (t.unit === 'см') {
    maxVal = Math.max(Math.round(g * 1.25), g + 40);
  }
  let stepVal = 1;
  if (t.unit === 'м' || t.unit === 'с') {
    stepVal = 0.1;
  }

  return {
    type: 'reps',
    min: minVal,
    max: maxVal,
    step: stepVal,
    lowerIsBetter: false
  };
}

function getSliderCurrentValue(t, userVal, cfg) {
  const numVal = parseTestValue(t, userVal);
  if (numVal !== null) {
    return Math.max(cfg.min, Math.min(cfg.max, numVal));
  }
  return cfg.lowerIsBetter ? cfg.max : cfg.min;
}

function renderTestSliderHtml(t, userVal) {
  const cfg = getTestSliderConfig(t);
  const sliderVal = getSliderCurrentValue(t, userVal, cfg);
  const numVal = parseTestValue(t, userVal);
  const displayVal = numVal !== null ? `${formatNormVal(t, numVal)}${t.unit ? ' ' + t.unit : ''}` : 'Передвиньте регулятор';
  const passB = numVal !== null && (t.lowerIsBetter ? numVal <= t.bronze : numVal >= t.bronze);
  const passS = numVal !== null && (t.lowerIsBetter ? numVal <= t.silver : numVal >= t.silver);
  const passG = numVal !== null && (t.lowerIsBetter ? numVal <= t.gold : numVal >= t.gold);

  return `
    <div class="calc-slider-wrap">
      <div class="calc-slider-header">
        <span class="calc-slider-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/></svg>
          Плавный регулятор:
        </span>
        <span class="calc-slider-val" id="slider-val-${t.id}">${displayVal}</span>
      </div>
      <div class="calc-range-track-container">
        <input type="range" class="calc-touch-slider" data-test-id="${t.id}" id="calc-slider-${t.id}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${sliderVal}">
        <div class="calc-slider-benchmarks">
          <button type="button" class="csb-mark csb-bronze ${passB ? 'passed' : ''}" data-set-test-val="${formatNormVal(t, t.bronze)}" data-test-id="${t.id}" title="Бронза: ${formatNormVal(t, t.bronze)}">
            <span>🥉 ${formatNormVal(t, t.bronze)}</span>
          </button>
          <button type="button" class="csb-mark csb-silver ${passS ? 'passed' : ''}" data-set-test-val="${formatNormVal(t, t.silver)}" data-test-id="${t.id}" title="Серебро: ${formatNormVal(t, t.silver)}">
            <span>🥈 ${formatNormVal(t, t.silver)}</span>
          </button>
          <button type="button" class="csb-mark csb-gold ${passG ? 'passed' : ''}" data-set-test-val="${formatNormVal(t, t.gold)}" data-test-id="${t.id}" title="Золото: ${formatNormVal(t, t.gold)}">
            <span>🥇 ${formatNormVal(t, t.gold)}</span>
            ${t.unit ? `<small>${esc(t.unit)}</small>` : ''}
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateCalculatorValue(testId, val, source = 'all') {
  state.calcValues[testId] = val;
  const stage = getStageByAge(state.calcAge);
  const tests = getActiveCalculatorTests();
  const t = tests.find(x => x.id === testId);
  if (!t) return;

  const numVal = parseTestValue(t, val);
  const grade = numVal !== null ? evaluateTest(t, numVal) : null;
  const gName = grade === 'gold' ? 'Золото' : grade === 'silver' ? 'Серебро' : grade === 'bronze' ? 'Бронза' : (val ? 'Ниже нормы' : '—');

  const card = $(`#test-card-${testId}`);
  if (card) {
    card.classList.remove('grade-gold', 'grade-silver', 'grade-bronze', 'grade-none');
    if (grade) card.classList.add(`grade-${grade}`);

    // Synchronize text input if update didn't come from typing in it
    if (source !== 'text') {
      const txtInput = card.querySelector(`.calc-test-input[data-test-id="${testId}"]`) || card.querySelector(`input[data-test-id="${testId}"]:not([type="range"])`);
      if (txtInput && txtInput.value !== String(val || '')) {
        txtInput.value = val || '';
      }
    }

    // Synchronize touch slider if update didn't come from dragging it
    if (source !== 'slider') {
      const slider = card.querySelector(`.calc-touch-slider[data-test-id="${testId}"]`);
      if (slider && numVal !== null) {
        slider.value = numVal;
      }
    }

    // --- VISUAL v159: Slider track gradient fill ---
    const sliderEl = card.querySelector(`.calc-touch-slider[data-test-id="${testId}"]`);
    if (sliderEl && numVal !== null) {
      const cfg = getTestSliderConfig(t);
      const range = cfg.max - cfg.min;
      const fillPct = range > 0 ? Math.max(0, Math.min(100, ((numVal - cfg.min) / range) * 100)) : 0;
      const trackFillPct = cfg.lowerIsBetter ? (100 - fillPct) : fillPct;
      const fillColor = grade === 'gold' ? '#f59e0b'
        : grade === 'silver' ? '#94a3b8'
        : grade === 'bronze' ? '#b45309'
        : 'rgba(255,255,255,0.25)';
      sliderEl.style.background = `linear-gradient(to right, ${fillColor} ${trackFillPct.toFixed(1)}%, rgba(255,255,255,0.1) ${trackFillPct.toFixed(1)}%)`;
    } else if (sliderEl && !numVal) {
      sliderEl.style.background = '';
    }

    // --- VISUAL v159: Input border glows per grade ---
    const inputEl = card.querySelector(`.calc-test-input[data-test-id="${testId}"]`);
    if (inputEl) {
      inputEl.classList.remove('result-gold', 'result-silver', 'result-bronze');
      if (grade) inputEl.classList.add(`result-${grade}`);
    }

    // Update slider readout label
    const sliderValEl = $(`#slider-val-${testId}`);
    if (sliderValEl) {
      sliderValEl.textContent = val ? `${val} ${t.unit ? t.unit : ''}` : 'Передвиньте регулятор';
    }

    const pill = card.querySelector('.calc-grade-pill');
    if (pill) {
      pill.className = `calc-grade-pill ${grade || ''}`;
      pill.textContent = gName;
    }
    const benchEl = card.querySelector('.calc-benchmark-badge');
    const newBenchHtml = testBenchmarkHtml(t, val);
    if (benchEl && newBenchHtml) {
      benchEl.outerHTML = newBenchHtml;
    } else if (benchEl && !newBenchHtml) {
      benchEl.remove();
    } else if (!benchEl && newBenchHtml) {
      card.insertAdjacentHTML('beforeend', newBenchHtml);
    }
    const gaugeEl = card.querySelector('.calc-norm-gauge');
    const newGaugeHtml = renderNormGaugeHtml(t, val);
    if (gaugeEl) {
      gaugeEl.outerHTML = newGaugeHtml;
    } else {
      card.insertAdjacentHTML('beforeend', newGaugeHtml);
    }

    // Toggle group-done class and badge checkmark
    card.classList.toggle('group-done', Boolean(grade));
    const grpBadge = card.querySelector('.calc-group-badge');
    if (grpBadge) {
      const existingCheck = grpBadge.querySelector('.calc-group-check');
      if (grade) {
        if (!existingCheck) grpBadge.insertAdjacentHTML('beforeend', ' <span class="calc-group-check">✓</span>');
      } else if (existingCheck) {
        existingCheck.remove();
      }
    }

    // Toggle passed highlights on the 3 full-width benchmark buttons
    const bBtn = card.querySelector(`.csb-bronze[data-test-id="${testId}"]`);
    const sBtn = card.querySelector(`.csb-silver[data-test-id="${testId}"]`);
    const gBtn = card.querySelector(`.csb-gold[data-test-id="${testId}"]`);
    if (bBtn && sBtn && gBtn) {
      const passB = numVal !== null && (t.lowerIsBetter ? numVal <= t.bronze : numVal >= t.bronze);
      const passS = numVal !== null && (t.lowerIsBetter ? numVal <= t.silver : numVal >= t.silver);
      const passG = numVal !== null && (t.lowerIsBetter ? numVal <= t.gold : numVal >= t.gold);
      bBtn.classList.toggle('passed', Boolean(passB));
      sBtn.classList.toggle('passed', Boolean(passS));
      gBtn.classList.toggle('passed', Boolean(passG));
    }
  }

  updateCalculatorBadge(stage, tests);
  saveCalculatorState();
}

function renderCalculator() {
  const box = $('#calculator-content');
  if (!box) return;

  const isOvz = state.calcMode === 'ovz';
  const stage = getStageByAge(state.calcAge);
  const tests = getActiveCalculatorTests();

  state.calcSelectedAlt = state.calcSelectedAlt || {
    speed: 'run_short',
    endurance: 'run_long',
    strength: state.calcSex === 'W' ? 'push_up' : 'pull_up',
    flexibility: 'lean'
  };

  const struct = calculateStructureBadge(tests, stage);
  const overallBadge = struct.overallBadge;

  // --- Compute mandatory fill count for section header ---
  const mandFilled = (() => {
    const mTests = isOvz
      ? tests.filter(t => t.mandatory)
      : ['speed', 'endurance', 'strength', 'flexibility'].map(grp => {
          const grpTs = tests.filter(t => t.mandatory && t.group === grp);
          const sel = state.calcSelectedAlt?.[grp];
          return grpTs.find(t => t.id === sel) || grpTs[0];
        }).filter(Boolean);
    return mTests.filter(t => {
      const v = state.calcValues[t.id];
      const n = parseTestValue(t, v);
      return n !== null && evaluateTest(t, n);
    }).length;
  })();
  const mandTotal = isOvz ? tests.filter(t => t.mandatory).length : 4;
  const optRequired = struct.req.gold.optional;
  const optFilled = struct.optFilled;

  const badgeMeta = {
    gold: { title: 'Золотой знак отличия ГТО', cls: 'calc-gold', sub: 'Все нормативы выполнены на высший стандарт' },
    silver: { title: 'Серебряный знак отличия ГТО', cls: 'calc-silver', sub: 'Отличный уровень физической подготовки' },
    bronze: { title: 'Бронзовый знак отличия ГТО', cls: 'calc-bronze', sub: 'Нормативы комплекса ГТО успешно сданы' },
    none: { title: 'Проверьте свои нормативы', cls: 'calc-none', sub: struct.totalFilled ? `Сдано ${struct.totalFilled} из ${struct.req.gold.total} необходимых тестов` : 'Введите результаты для расчёта знака' }
  };
  const curBadge = badgeMeta[overallBadge];

  const sharePayload = esc(JSON.stringify({
    type: 'badge',
    badge: overallBadge,
    stage: isOvz ? 'ОВЗ / Адаптивный спорт' : stage.label,
    ageRange: isOvz ? (GTO_OVZ_CATEGORIES.find(c => c.id === state.calcOvzCategory)?.shortName || 'ОВЗ') : stage.ageRange,
    sex: state.calcSex === 'M' ? 'Мужчины' : 'Женщины',
    age: state.calcAge,
    filled: struct.totalFilled,
    total: struct.req.gold.total
  }));

  const optionalTests = isOvz ? tests.filter(t => !t.mandatory) : tests.filter(t => !t.mandatory || t.group === 'optional');

  const renderTestCard = (t, isOptional = false) => {
    const userVal = state.calcValues[t.id];
    const numVal = parseTestValue(t, userVal);
    const grade = numVal !== null ? evaluateTest(t, numVal) : null;
    const gCls = grade ? `grade-${grade}` : '';
    const gName = grade === 'gold' ? 'Золото' : grade === 'silver' ? 'Серебро' : grade === 'bronze' ? 'Бронза' : (userVal ? 'Ниже нормы' : '—');
    const benchHtml = testBenchmarkHtml(t, userVal);
    const placeholder = t.isTime ? 'мин:сек (напр. 12:30)' : `Ваш результат (${esc(t.unit)})`;

    let optTagHtml = '';
    if (isOptional && grade) {
      const inBadge = struct.contributingOptIds?.includes(t.id);
      optTagHtml = inBadge
        ? `<div class="calc-in-badge-tag active">✓ В зачёте знака отличия</div>`
        : `<div class="calc-in-badge-tag extra">+ Дополнительно сдан</div>`;
    }

    return `
      <div class="calc-test-card ${gCls} ${t.group ? 'cat-' + t.group : ''}" id="test-card-${t.id}">
        <div class="calc-test-header">
          <span class="calc-test-icon">${disciplineIcon(t.name)}</span>
          <div class="calc-test-name">
            <b>${esc(t.name)}</b>
          </div>
        </div>
        <div class="calc-test-input-row">
          <input type="${t.isTime ? 'text' : 'number'}" class="calc-test-input" inputmode="${t.isTime ? 'text' : 'decimal'}" step="0.1" data-test-id="${t.id}" value="${esc(userVal || '')}" placeholder="${placeholder}">
          <span class="calc-grade-pill ${grade || ''}">${gName}</span>
        </div>
        ${renderTestSliderHtml(t, userVal)}
        ${renderNormGaugeHtml(t, userVal)}
        ${benchHtml}
        ${optTagHtml}
      </div>
    `;
  };

  const MANDATORY_GROUP_CONFIG = [
    { id: 'speed', title: 'Скорость', icon: '⚡', desc: 'Бег 60 м или челночный бег' },
    { id: 'endurance', title: 'Выносливость', icon: '🏃', desc: 'Бег на стадионе, лыжные гонки или кросс' },
    { id: 'strength', title: 'Сила', icon: '💪', desc: 'Подтягивания, рывок гири 16 кг или отжимания' },
    { id: 'flexibility', title: 'Гибкость', icon: '🧘', desc: 'Наклон вперед на гимнастической скамье' }
  ];

  const renderMandatoryGroupCard = (groupConf) => {
    const grpTests = tests.filter(t => t.mandatory && t.group === groupConf.id);
    if (!grpTests.length) return '';

    let selId = state.calcSelectedAlt?.[groupConf.id];
    if (!selId || !grpTests.some(t => t.id === selId)) {
      selId = grpTests[0].id;
      state.calcSelectedAlt[groupConf.id] = selId;
    }
    const activeTest = grpTests.find(t => t.id === selId) || grpTests[0];

    const userVal = state.calcValues[activeTest.id];
    const numVal = parseTestValue(activeTest, userVal);
    const grade = numVal !== null ? evaluateTest(activeTest, numVal) : null;
    const gCls = grade ? `grade-${grade}` : '';
    const gName = grade === 'gold' ? 'Золото' : grade === 'silver' ? 'Серебро' : grade === 'bronze' ? 'Бронза' : (userVal ? 'Ниже нормы' : '—');
    const benchHtml = testBenchmarkHtml(activeTest, userVal);
    const placeholder = activeTest.isTime ? '0:00 (мин:сек)' : `Ваш результат (${esc(activeTest.unit)})`;

    return `
      <div class="calc-test-card ${gCls} cat-${groupConf.id} ${grade ? 'group-done' : ''}" id="test-card-${activeTest.id}">
        <div class="calc-test-header">
          <span class="calc-test-icon">${disciplineIcon(activeTest.name)}</span>
          <div class="calc-test-name">
            <span class="calc-group-badge">${groupConf.icon} ${groupConf.title}${grade ? ' <span class="calc-group-check">✓</span>' : ''}</span>
            <b>${esc(activeTest.name)}</b>
          </div>
        </div>

        ${grpTests.length > 1 ? `
          <div class="calc-alt-selector">
            <div class="calc-alt-label">Альтернативы (выберите 1 вид):</div>
            <div class="calc-alt-pills">
              ${grpTests.map(gt => {
                const isAct = gt.id === activeTest.id;
                const hasV = Boolean(state.calcValues[gt.id]);
                const ic = gt.id === 'ski' ? '⛷️' : gt.id === 'cross' ? '🌲' : gt.id === 'kettlebell' ? '🏋️' : gt.id === 'push_up' ? '⚡' : gt.id === 'shuttle_run' ? '🔄' : gt.id === 'pull_up_low' ? '🤸' : gt.id === 'pull_up' ? '💪' : '🏃';
                const shortName = gt.id === 'ski' ? 'Лыжи'
                  : gt.id === 'cross' ? 'Кросс'
                  : gt.id === 'run_long' ? 'Бег'
                  : gt.id === 'run_short' ? 'Бег 60м'
                  : gt.id === 'shuttle_run' ? '3×10м'
                  : gt.id === 'pull_up' ? 'Турник'
                  : gt.id === 'kettlebell' ? 'Гиря 16кг'
                  : gt.id === 'push_up' ? 'Отжимания'
                  : gt.id === 'pull_up_low' ? 'Низк. турник'
                  : gt.name;
                return `
                  <button type="button" class="calc-alt-pill ${isAct ? 'active' : ''} ${hasV ? 'has-val' : ''}" data-alt-group="${groupConf.id}" data-test-id="${gt.id}" title="${esc(gt.name)}">
                    <span>${ic} ${esc(shortName)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="calc-test-input-row">
          <input type="${activeTest.isTime ? 'text' : 'number'}" class="calc-test-input" inputmode="${activeTest.isTime ? 'text' : 'decimal'}" step="0.1" data-test-id="${activeTest.id}" value="${esc(userVal || '')}" placeholder="${placeholder}">
          <span class="calc-grade-pill ${grade || ''}">${gName}</span>
        </div>
        ${renderTestSliderHtml(activeTest, userVal)}
        ${renderNormGaugeHtml(activeTest, userVal)}
        ${benchHtml}
      </div>
    `;
  };

  box.innerHTML = `
    <div id="calc-mini-badge" class="calc-mini-badge"></div>

    <div class="calc-mode-switch">
      <button class="${!isOvz ? 'active' : ''}" data-calc-mode="general">Общие нормативы (I–XVIII)</button>
      <button class="${isOvz ? 'active' : ''}" data-calc-mode="ovz">Лица с ОВЗ / Инвалидность</button>
    </div>

    <div class="calc-presets-bar">
      <span class="calc-presets-label"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true" style="vertical-align:-2px"><path d="M13 2 3 14h8l-1 8 10-12h-8z"/></svg> Демо-цели:</span>
      <div class="calc-presets-chips">
        <button type="button" class="calc-preset-chip" id="calc-preset-gold"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5b544" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 3h5M15.5 10 18 3h-5"/></svg> Все на Золото</button>
        <button type="button" class="calc-preset-chip" id="calc-preset-silver"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#c7d0da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 3h5M15.5 10 18 3h-5"/></svg> На Серебро</button>
        <button type="button" class="calc-preset-chip reset" id="calc-preset-reset"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"/></svg> Сбросить</button>
      </div>
    </div>

    ${isOvz ? `
      <div class="calc-ovz-selector">
        <div class="calc-ovz-chips">
          ${GTO_OVZ_CATEGORIES.map(c => `
            <button class="calc-ovz-chip ${state.calcOvzCategory === c.id ? 'active' : ''}" data-calc-ovz="${c.id}" title="${esc(c.desc)}">
              <span>${c.icon}</span>
              <span>${esc(c.shortName)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="calc-params">
      <div class="calc-param-group">
        <label>Пол участника</label>
        <div class="segmented-control calc-sex-toggle">
          <button class="${state.calcSex === 'M' ? 'active' : ''}" data-calc-sex="M">Мужской</button>
          <button class="${state.calcSex === 'W' ? 'active' : ''}" data-calc-sex="W">Женский</button>
        </div>
      </div>
      ${!isOvz ? `
        <div class="calc-param-group">
          <div class="calc-label-row">
            <label for="calc-age-range">Возраст участника</label>
            <div class="calc-age-stepper">
              <button type="button" class="calc-step-btn" id="calc-age-minus" aria-label="Уменьшить возраст">−</button>
              <span class="calc-age-display" id="calc-age-val">${state.calcAge} лет</span>
              <button type="button" class="calc-step-btn" id="calc-age-plus" aria-label="Увеличить возраст">+</button>
            </div>
          </div>
          <input id="calc-age-range" type="range" min="6" max="79" value="${state.calcAge}">
          <div class="calc-age-scale">
            <span>6 лет</span>
            <span>18 лет</span>
            <span>30 лет</span>
            <span>50 лет</span>
            <span>70+</span>
          </div>
        </div>
      ` : ''}
    </div>
    
    ${!isOvz ? `
      <div class="calc-stage-banner">
        <div class="calc-stage-badge">${stage.label}</div>
        <div class="calc-stage-info">
          <b>${stage.ageRange}</b>
          <small>Приказ Минспорта России № 114 (18 ступеней)</small>
        </div>
      </div>
    ` : `
      <div class="calc-stage-banner" style="border-left-color:#38bdf8">
        <div class="calc-stage-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border-color:rgba(56,189,248,0.3)">ОВЗ</div>
        <div class="calc-stage-info">
          <b>${esc(GTO_OVZ_CATEGORIES.find(c => c.id === state.calcOvzCategory)?.name || 'Адаптивный спорт')}</b>
          <small>${esc(GTO_OVZ_CATEGORIES.find(c => c.id === state.calcOvzCategory)?.desc || 'Специализированные нормы Минспорта РФ')}</small>
        </div>
      </div>
    `}
    
    <div id="calc-structure-container">
      ${renderStructureCardHtml(struct, curBadge, overallBadge)}
    </div>

    ${renderHeroBadgeBannerHtml(struct, curBadge, overallBadge, stage, isOvz)}
    
    <div class="calc-tests-grid">
      <!-- СЕКЦИЯ 1: ОБЯЗАТЕЛЬНЫЕ -->
      <div class="calc-section calc-section-mandatory">
        <div class="calc-section-header">
          <div class="csh-icon-wrap mand-icon">📌</div>
          <div class="csh-info">
            <div class="csh-title">Обязательные</div>
            <div class="csh-sub">Все ${mandTotal} вида — нужно сдать</div>
          </div>
          <div id="calc-mand-chip" class="csh-chip ${mandFilled === mandTotal && mandTotal > 0 ? 'chip-done' : ''}">
            ${mandFilled}/${mandTotal}
          </div>
        </div>
        <div class="calc-section-cards">
          ${isOvz
            ? tests.filter(t => t.mandatory).map(t => renderTestCard(t, false)).join('')
            : MANDATORY_GROUP_CONFIG.map(renderMandatoryGroupCard).join('')
          }
        </div>
      </div>

      <!-- СЕКЦИЯ 2: ПО ВЫБОРУ -->
      <div class="calc-section calc-section-optional">
        <div class="calc-section-header">
          <div class="csh-icon-wrap opt-icon">🎯</div>
          <div class="csh-info">
            <div class="csh-title">По выбору</div>
            <div class="csh-sub">Выберите любые ${optRequired} из ${optionalTests.length}</div>
          </div>
          <div id="calc-opt-chip" class="csh-chip ${optFilled >= optRequired ? 'chip-done' : ''}">
            ${optFilled}/${optRequired}
          </div>
        </div>
        <div class="csh-opt-hint">
          🏆 Система учтёт лучшие — лишние результаты не ухудшат знак
        </div>
        <div class="calc-section-cards">
          ${optionalTests.map(t => renderTestCard(t, true)).join('')}
        </div>
      </div>
    </div>
    
    <div class="calc-bonuses">
      <h3>Государственные льготы за знак отличия ГТО</h3>
      <div class="bonus-item">
        <b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg> Налоговый вычет по НДФЛ</b>
        <p>С 2025 года при сдаче нормативов ГТО и прохождении диспансеризации предоставляется стандартный налоговый вычет 18 000 руб. в год (возврат 2 340 руб. налога, ст. 218 НК РФ).</p>
      </div>
      <div class="bonus-item">
        <b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1 3 2.4 6 2.4s6-1.4 6-2.4v-5M22 9v5"/></svg> Дополнительные баллы к ЕГЭ</b>
        <p>Золотой, серебряный и бронзовый знаки дают до 10 дополнительных баллов при поступлении в высшие учебные заведения России.</p>
      </div>
      <div class="bonus-item">
        <b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="15" r="6"/><path d="M8.5 3.5 12 10l3.5-6.5M12 12.5v5M9.7 15h4.6"/></svg> Повышенная стипендия</b>
        <p>Студенты очных отделений вузов с золотым знаком отличия ГТО могут претендовать на повышенную государственную академическую стипендию.</p>
      </div>
    </div>
  `;

  // --- VISUAL v159: Post-render init — slider track fills & input glow for saved values ---
  requestAnimationFrame(() => {
    tests.forEach(t => {
      const savedVal = state.calcValues[t.id];
      if (savedVal) updateCalculatorValue(t.id, savedVal, 'all');
    });

    // Mini badge IntersectionObserver: show floating pill when hero badge scrolls out of view
    const heroBanner = $('#calc-badge-banner');
    const miniBadge = $('#calc-mini-badge');
    if (heroBanner && miniBadge && 'IntersectionObserver' in window) {
      if (window._calcBadgeObserver) window._calcBadgeObserver.disconnect();
      window._calcBadgeObserver = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            miniBadge.classList.add('visible-scroll');
          } else {
            miniBadge.classList.remove('visible-scroll');
          }
        },
        { threshold: 0.1 }
      );
      window._calcBadgeObserver.observe(heroBanner);
    }
  });
}

// ----------------------------------------------------
// ИНФОГРАФИКА «ПУТЬ АТЛЕТА: 5 ШАГОВ К РАЗРЯДУ»
// ----------------------------------------------------
export function renderAthletePath() {
  const box = $('#path-content');
  if (!box) return;

  box.innerHTML = `
    <div class="path-stepper">
      <!-- Шаг 1 -->
      <div class="path-step-card step-1">
        <div class="path-step-badge-num">
          <span>Шаг</span>
          <b>01</b>
        </div>
        <div class="path-step-body">
          <span class="path-step-tag red">Регистрация</span>
          <h3 class="path-step-title">Получение УИН на официальном портале gto.ru</h3>
          <p class="path-step-desc">Зарегистрируйтесь на федеральном портале и получите уникальный 11-значный идентификационный номер. Номер привязывается к вашему профилю Госуслуг и действует бессрочно.</p>
          <div class="path-step-perks">
            <span class="path-step-perk">🔑 УИН из 11 цифр</span>
            <span class="path-step-perk">🇷🇺 Привязка к Госуслугам</span>
            <span class="path-step-perk">👶 До 14 лет — через родителей</span>
          </div>
          <a href="https://gto.ru" target="_blank" rel="noopener" class="path-step-action">
            <span>Регистрация на gto.ru</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      <!-- Шаг 2 -->
      <div class="path-step-card step-2">
        <div class="path-step-badge-num">
          <span>Шаг</span>
          <b>02</b>
        </div>
        <div class="path-step-body">
          <span class="path-step-tag orange">Медицина</span>
          <h3 class="path-step-title">Медицинский допуск и диспансеризация</h3>
          <p class="path-step-desc">Пройдите плановый медосмотр в поликлинике по месту жительства и получите медицинскую справку-допуск (форма № 1144-н). Прохождение диспансеризации в том же году открывает право на <b>налоговый вычет 18 000 ₽</b>.</p>
          <div class="path-step-perks">
            <span class="path-step-perk">🩺 Справка № 1144-н</span>
            <span class="path-step-perk">💰 Вычет 18 000 ₽ (ст. 218 НК РФ)</span>
            <span class="path-step-perk">🏥 По ОМС бесплатно</span>
          </div>
          <button type="button" class="path-step-action" data-go="faq">
            <span>Как оформить вычет? (FAQ)</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Шаг 3 -->
      <div class="path-step-card step-3">
        <div class="path-step-badge-num">
          <span>Шаг</span>
          <b>03</b>
        </div>
        <div class="path-step-body">
          <span class="path-step-tag blue">Тренинг</span>
          <h3 class="path-step-title">Подготовка и тренировки с таймером ФМГТО</h3>
          <p class="path-step-desc">Тренируйтесь по профессиональным интервальным протоколам Табата, EMOM и AMRAP с встроенным звуковым таймером приложения. Изучите официальные судейские критерии, чтобы избежать срывов повторений No-Rep.</p>
          <div class="path-step-perks">
            <span class="path-step-perk">⏱️ WOD-таймер без интернета</span>
            <span class="path-step-perk">📏 Судейские стандарты No-Rep</span>
            <span class="path-step-perk">💪 3-борье и функционал</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="path-step-action" data-go="timer">
              <span>Открыть WOD-таймер</span>
              <span>→</span>
            </button>
            <button type="button" class="path-step-action" data-go="standards">
              <span>Стандарты No-Rep</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Шаг 4 -->
      <div class="path-step-card step-4">
        <div class="path-step-badge-num">
          <span>Шаг</span>
          <b>04</b>
        </div>
        <div class="path-step-body">
          <span class="path-step-tag green">Тестирование</span>
          <h3 class="path-step-title">Выполнение нормативов на Золотой знак</h3>
          <p class="path-step-desc">Запишитесь в центр тестирования и выполните испытания своей возрастной ступени. Наш калькулятор заранее рассчитает, сколько обязательных тестов и видов по выбору вам необходимо сдать.</p>
          <div class="path-step-perks">
            <span class="path-step-perk">🥇 Золотой знак Минспорта РФ</span>
            <span class="path-step-perk">🎓 До 10 баллов к ЕГЭ в вузы</span>
            <span class="path-step-perk">📈 Повышенная стипендия</span>
          </div>
          <button type="button" class="path-step-action" data-go="calculator">
            <span>Рассчитать нормы в калькуляторе</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Шаг 5 -->
      <div class="path-step-card step-5">
        <div class="path-step-badge-num">
          <span>Шаг</span>
          <b>05</b>
        </div>
        <div class="path-step-body">
          <span class="path-step-tag gold">Спорт высших достижений</span>
          <h3 class="path-step-title">Турниры ФМГТО РФ и спортивные разряды ЕВСК</h3>
          <p class="path-step-desc">Переходите из любителей в официальный спорт! Участвуйте в соревнованиях Единого календарного плана Минспорта (№ 216), шоу «Иду на рекорд», Играх ГТО и выполняйте спортивные разряды от 3-го юношеского до Мастера спорта России.</p>
          <div class="path-step-perks">
            <span class="path-step-perk">📜 Разряды ЕВСК (1810001411Я)</span>
            <span class="path-step-perk">🏆 114 официальных стартов</span>
            <span class="path-step-perk">🎖️ Мастер спорта России</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="path-step-action" data-go="events">
              <span>Календарь соревнований</span>
              <span>→</span>
            </button>
            <button type="button" class="path-step-action" data-go="records">
              <span>Рекорды России</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// РАЗДЕЛ «ЗВЁЗДЫ И АМБАССАДОРЫ МНОГОБОРЬЯ ГТО РОССИИ»
// ----------------------------------------------------
export function renderAmbassadors() {
  const box = $('#ambassadors-content');
  if (!box) return;

  box.innerHTML = `
    <div class="ambassadors-grid">
      ${GTO_AMBASSADORS.map(a => `
        <div class="ambassador-card" id="ambassador-${a.id}">
          <div class="ambassador-top">
            <div class="ambassador-avatar-wrap">
              <img class="ambassador-avatar" src="${esc(a.avatar)}" alt="${esc(a.name)}" onerror="window.__imageFallback(event)" loading="lazy">
              <span class="ambassador-badge-tag">${esc(a.badge)}</span>
            </div>
            <div class="ambassador-info">
              <h3 class="ambassador-name">${esc(a.name)}</h3>
              <div class="ambassador-title">${esc(a.title)}</div>
              <div class="ambassador-city">📍 ${esc(a.city)} · ${esc(a.role)}</div>
            </div>
          </div>

          <div class="ambassador-stats-row">
            ${a.stats.map(s => `
              <div class="ambassador-stat-col">
                <b>${esc(s.val)}</b>
                <small>${esc(s.label)}</small>
              </div>
            `).join('')}
          </div>

          <div class="ambassador-quote">${esc(a.quote)}</div>

          <ul class="ambassador-achievements">
            ${a.achievements.map(ach => `<li>${esc(ach)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// ИНТЕРАКТИВНАЯ БАЗА ЗНАНИЙ И FAQ
// ----------------------------------------------------
export function renderFaq() {
  const box = $('#faq-content');
  if (!box) return;

  const currentCat = state.faqCategory || 'all';
  const query = (state.faqQuery || '').toLowerCase().trim();

  const filteredItems = GTO_FAQ_ITEMS.filter(item => {
    if (currentCat !== 'all' && item.cat !== currentCat) return false;
    if (query) {
      const qText = (item.q + ' ' + item.badge + ' ' + item.answer).toLowerCase();
      if (!qText.includes(query)) return false;
    }
    return true;
  });

  box.innerHTML = `
    <div class="faq-search-wrap">
      <span>⌕</span>
      <input type="search" id="faq-search-input" value="${esc(state.faqQuery)}" placeholder="Поиск (налог, вычет 18 000, ЕГЭ, No-Rep, приказы)...">
    </div>

    <div class="faq-filter-chips">
      <button class="faq-chip ${currentCat === 'all' ? 'active' : ''}" data-faq-cat="all">Все вопросы</button>
      ${GTO_FAQ_CATEGORIES.map(c => `
        <button class="faq-chip ${currentCat === c.id ? 'active' : ''}" data-faq-cat="${c.id}">
          <span>${c.icon}</span>
          <span>${esc(c.name)}</span>
        </button>
      `).join('')}
    </div>

    <div class="faq-accordion-list">
      ${filteredItems.length === 0 ? `
        <div style="text-align:center;padding:30px 20px;color:#94a3b8">По вашему запросу вопросов не найдено. Попробуйте скорректировать поиск.</div>
      ` : filteredItems.map(item => {
        const isOpen = state.faqExpanded.has(item.id);
        return `
          <div class="faq-accordion-item ${isOpen ? 'open' : ''}" id="faq-item-${item.id}">
            <div class="faq-header" data-faq-toggle="${item.id}">
              <div class="faq-header-content">
                <span class="faq-badge-tag">${esc(item.badge)}</span>
                <h4 class="faq-question-title">${esc(item.q)}</h4>
              </div>
              <div class="faq-chevron">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            ${isOpen ? `<div class="faq-body">${item.answer}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}


// ----------------------------------------------------
// ТРЕНИРОВОЧНЫЙ ТАЙМЕР WOD & INTERVALS / ЗАПИСЬ ОТБОРА
// ----------------------------------------------------
let timerEngine = null;
let cameraRecorderInstance = null;
let timerActiveTab = 'timer'; // 'timer' | 'camera'
let isVideoSavedOrShared = false;
let exitConfirmDiscardAction = null;
let exitConfirmKeepAction = null;
let isCameraSessionExiting = false;

function showExitConfirmDialog({ title, desc, keepText, discardText, onDiscard, onKeep }) {
  const modal = $('#camera-confirm-modal');
  if (!modal) return;
  const titleEl = $('#camera-confirm-title');
  const descEl = $('#camera-confirm-desc');
  const keepEl = $('#camera-confirm-keep-btn');
  const discardEl = $('#camera-confirm-discard-btn');

  if (titleEl) titleEl.textContent = title || 'Выйти из записи?';
  if (descEl) descEl.textContent = desc || 'Текущая запись будет удалена.';
  if (keepEl) {
    keepEl.textContent = keepText || 'ПРОДОЛЖИТЬ ЗАПИСЬ';
    keepEl.disabled = false;
  }
  if (discardEl) {
    discardEl.textContent = discardText || 'ВЫЙТИ И УДАЛИТЬ';
    discardEl.disabled = false;
  }

  exitConfirmDiscardAction = onDiscard || null;
  exitConfirmKeepAction = onKeep || null;
  modal.style.display = 'flex';
}

function closeExitConfirmDialog() {
  const modal = $('#camera-confirm-modal');
  if (modal) modal.style.display = 'none';
  const discardBtn = $('#camera-confirm-discard-btn');
  const keepBtn = $('#camera-confirm-keep-btn');
  if (discardBtn) {
    discardBtn.disabled = false;
    discardBtn.textContent = 'ВЫЙТИ И УДАЛИТЬ';
  }
  if (keepBtn) keepBtn.disabled = false;
  exitConfirmDiscardAction = null;
  exitConfirmKeepAction = null;
}

async function destroyCameraSession({ discard = true, returnTo = 'training' } = {}) {
  const rec = getCameraRecorder();

  if (isCameraSessionExiting || (rec && rec.isExiting)) {
    console.warn('[CAMERA EXIT] Already in progress, ignoring duplicate call');
    return;
  }
  isCameraSessionExiting = true;
  if (rec) {
    rec.isExiting = true;
    rec.isDiscarding = discard;
  }

  console.log('[CAMERA EXIT 1] confirmed');

  // Immediately disable modal buttons
  const discardBtn = $('#camera-confirm-discard-btn');
  const keepBtn = $('#camera-confirm-keep-btn');
  if (discardBtn) {
    discardBtn.disabled = true;
    discardBtn.textContent = 'Закрываем камеру…';
  }
  if (keepBtn) keepBtn.disabled = true;

  try {
    if (rec) {
      // 2. Stop timers & countdowns
      rec.clearAllTimers();
      rec.timerState = TimerState.IDLE;
      console.log('[CAMERA EXIT 2] timers stopped');

      // 3. Stop RAF animation frame
      rec.stopRenderLoop();
      console.log('[CAMERA EXIT 3] RAF stopped');

      // 4. Stop MediaRecorder through Promise
      await rec.stopRecorderAsync();
      console.log('[CAMERA EXIT 4] recorder stopped');

      // 5. Stop canvasStream tracks & combinedStream tracks
      rec.stopCanvasStreamTracks();
      console.log('[CAMERA EXIT 5] canvas tracks stopped');

      // 6. Stop physical camera & microphone tracks
      rec.stopCameraStreamTracks();
      console.log('[CAMERA EXIT 6] camera tracks stopped');

      const liveTracks = (rec.stream ? rec.stream.getTracks().filter(t => t.readyState === 'live').length : 0);
      console.log('[EXIT CHECK]', liveTracks);

      // 7. Unbind videos & clear Blobs & chunks
      rec.cleanupMediaObjects();
      console.log('[CAMERA EXIT 7] blobs cleared');

      // 8. Remove event listeners
      rec.removeSystemListeners();
      console.log('[CAMERA EXIT 8] listeners removed');

      // 9. Reset camera DOM & hide overlays
      rec.clearCanvas();
      rec.state = CameraState.IDLE;
    }

    closeExitConfirmDialog();
    document.body.classList.remove('camera-recording-active', 'camera-mode');
    console.log('[CAMERA EXIT 9] UI closed');
  } catch (err) {
    console.error('[CAMERA EXIT ERROR]', err);
  } finally {
    if (rec) {
      rec.isExiting = false;
      rec.isDiscarding = false;
      rec.state = CameraState.IDLE;
    }
    isCameraSessionExiting = false;

    // 10. Explicit navigation to training timer without history.back()
    timerActiveTab = 'timer';
    isVideoSavedOrShared = false;
    renderTimer();
    console.log('[CAMERA EXIT 10] navigation complete');
  }
}

function exitToStandardTimer() {
  destroyCameraSession({ discard: true, returnTo: 'training' });
}

function requestExitCamera() {
  const rec = getCameraRecorder();
  if (!rec) {
    destroyCameraSession({ discard: true, returnTo: 'training' });
    return;
  }

  // 1. Если идет активная запись или запуск (RECORDING / STARTING)
  if (rec.state === 'RECORDING' || rec.state === 'STARTING') {
    showExitConfirmDialog({
      title: 'Выйти из записи?',
      desc: 'Текущая запись будет удалена.',
      keepText: 'ПРОДОЛЖИТЬ ЗАПИСЬ',
      discardText: 'ВЫЙТИ И УДАЛИТЬ',
      onDiscard: () => {
        destroyCameraSession({ discard: true, returnTo: 'training' });
      },
      onKeep: () => {}
    });
    return;
  }

  // 2. Если идет обратный отсчет таймера (COUNTDOWN)
  if (rec.timerState === 'COUNTDOWN') {
    rec.cancelCountdown();
    destroyCameraSession({ discard: true, returnTo: 'training' });
    return;
  }

  // 3. Если на экране превью сохраненного видео (PREVIEW)
  if (rec.state === 'PREVIEW' && rec.recordedUrl) {
    if (!isVideoSavedOrShared) {
      showExitConfirmDialog({
        title: 'Закрыть запись?',
        desc: 'Записанное видео будет удалено, если вы его ещё не сохранили.',
        keepText: 'ОСТАТЬСЯ',
        discardText: 'ЗАКРЫТЬ И УДАЛИТЬ',
        onDiscard: () => {
          destroyCameraSession({ discard: true, returnTo: 'training' });
        },
        onKeep: () => {}
      });
      return;
    } else {
      destroyCameraSession({ discard: false, returnTo: 'training' });
      return;
    }
  }

  // 4. До начала записи (CAMERA_READY, IDLE, ERROR, REQUESTING_CAMERA)
  destroyCameraSession({ discard: true, returnTo: 'training' });
}

function getTimer() {
  if (!timerEngine) {
    try {
      timerEngine = new GtoTimer(updateTimerDisplay);
    } catch (e) {
      console.warn('GtoTimer init failed:', e);
    }
  }
  return timerEngine;
}

function getCameraRecorder() {
  const videoEl = $('#camera-raw-video');
  const canvasEl = $('#camera-live-canvas');
  if (!cameraRecorderInstance) {
    cameraRecorderInstance = new GtoCameraRecorder({
      videoEl,
      canvasEl,
      onStateChange: (cState) => {
        updateCameraControls(cState);
      }
    });
  } else {
    if (videoEl) cameraRecorderInstance.videoEl = videoEl;
    if (canvasEl) cameraRecorderInstance.canvasEl = canvasEl;
  }
  return cameraRecorderInstance;
}

function updateCameraControls(cState) {
  if (cameraRecorderInstance && typeof cameraRecorderInstance.updateDebugString === 'function') {
    cameraRecorderInstance.updateDebugString();
  }
  const isBusy = cState.state === 'RECORDING' || cState.state === 'STARTING';
  document.body.classList.toggle('camera-recording-active', isBusy);

  // ТЗ v67.3 п. 3: во время записи модалка настроек гарантированно закрыта
  if (isBusy) {
    const drawer = $('#camera-timer-drawer');
    if (drawer) drawer.style.display = 'none';
  }

  const cornerLeft = $('#camera-corner-left');
  const cornerRight = $('#camera-corner-right');
  const placeholder = $('#camera-placeholder-overlay');
  const previewSlot = $('#camera-preview-slot');

  const timerMode = cState.timerConfig?.mode || 'stopwatch';
  const timerState = cState.timerState || 'READY';
  const isEnv = cState.facingMode === 'environment';

  if (cState.state === 'COUNTDOWN') {
    if (placeholder) placeholder.style.display = 'none';
    if (cornerLeft) {
      cornerLeft.innerHTML = `
        <div class="cam-countdown-pill">
          <span>СТАРТ: <b>${cState.countdownText || '3'}</b></span>
        </div>
      `;
    }
    if (cornerRight) {
      cornerRight.innerHTML = `
        <button type="button" class="cam-ctrl-btn rec-start is-starting" disabled>
          <span>● СТАРТ...</span>
        </button>
      `;
    }
  } else if (cState.state === 'STARTING') {
    if (placeholder) placeholder.style.display = 'none';
    if (cornerLeft) cornerLeft.innerHTML = '';
    if (cornerRight) {
      cornerRight.innerHTML = `
        <button type="button" class="cam-ctrl-btn rec-start is-starting" id="camera-start-rec-btn" disabled>
          <span>● ЗАПУСК...</span>
        </button>
      `;
    }
  } else if (cState.state === 'RECORDING') {
    if (placeholder) placeholder.style.display = 'none';
    if (previewSlot) previewSlot.innerHTML = '';

    document.body.classList.add('recorder-fullscreen');
    document.body.classList.add('camera-recording-active');

    // Правый угол: кнопки действий во время записи (ТЗ v97: +1, No-Rep, ■ Завершить)
    if (cornerRight) {
      cornerRight.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <button type="button" class="cam-ctrl-btn rep-add" id="camera-add-rep-btn" title="+1 Повтор">
            <span>+1</span>
          </button>
          <button type="button" class="cam-ctrl-btn norep-add" id="camera-add-norep-btn" title="No-Rep">
            <span>NO-REP</span>
          </button>
          <button type="button" class="cam-ctrl-btn rec-stop" id="camera-stop-rec-btn" title="Завершить видеозапись">
            <span>■ СТОП</span>
          </button>
        </div>
      `;
    }

    // Левый угол: зависит от статуса таймера
    if (cornerLeft) {
      if (timerMode === 'none') {
        cornerLeft.innerHTML = `
          <div class="cam-rec-status-pill">
            <span class="cam-rec-dot"></span>
            <span>ЗАПИСЬ</span>
          </div>
        `;
      } else if (timerState === 'READY') {
        // До старта таймера (если автостарт выключен): кнопка СТАРТ ТАЙМЕРА (ТЗ v97)
        cornerLeft.innerHTML = `
          <button type="button" class="cam-ctrl-btn timer-start" id="camera-start-timer-btn">
            <span>▶ СТАРТ ТАЙМЕРА</span>
          </button>
        `;
      } else if (timerState === 'COUNTDOWN') {
        cornerLeft.innerHTML = `
          <div class="cam-countdown-pill">
            <span>СТАРТ: <b>${cState.timerCountdownText || '3'}</b></span>
          </div>
        `;
      } else if (timerState === 'RUNNING') {
        cornerLeft.innerHTML = '';
      } else if (timerState === 'FINISHED') {
        cornerLeft.innerHTML = `
          <div class="cam-finished-pill">
            <span>⏱️ Время вышло</span>
          </div>
        `;
      }
    }
  } else if (cState.state === 'STOPPING') {
    document.body.classList.remove('recorder-fullscreen');
    if (cornerLeft) cornerLeft.innerHTML = '';
    if (cornerRight) {
      cornerRight.innerHTML = `
        <button type="button" class="cam-ctrl-btn rec-stop is-starting" id="camera-stop-rec-btn" disabled>
          <span>СОХРАНЕНИЕ...</span>
        </button>
      `;
    }
  } else if (cState.state === 'CAMERA_READY') {
    document.body.classList.remove('recorder-fullscreen');
    if (placeholder) placeholder.style.display = 'none';

    // В левом углу: [ ⚙ Таймер ] и [ ↻ Камера ]
    if (cornerLeft) {
      cornerLeft.innerHTML = `
        <button type="button" class="cam-ctrl-btn sec" id="camera-open-drawer-btn" title="Настройки таймера комплекса">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>⚙ Таймер</span>
        </button>
        <button type="button" class="cam-ctrl-btn sec" id="camera-flip-btn" title="Сменить камеру (${isEnv ? 'основная' : 'селфи'})">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8M4 14c0 4.4 3.6 8 8 8s8-3.6 8-8"/><path d="m20 6 4 4-4 4M4 18l-4-4 4-4"/></svg>
          <span>↻ Камера</span>
        </button>
      `;
    }

    // В правом углу: [ НАЧАТЬ ЗАПИСЬ ] (красная, одинарный символ)
    if (cornerRight) {
      cornerRight.innerHTML = `
        <button type="button" class="cam-ctrl-btn rec-start" id="camera-start-rec-btn">
          <span>● НАЧАТЬ ЗАПИСЬ</span>
        </button>
      `;
    }
  } else if (cState.state === 'PREVIEW' && cState.recordedUrl) {
    document.body.classList.remove('recorder-fullscreen');
    if (cornerLeft) cornerLeft.innerHTML = '';
    if (cornerRight) cornerRight.innerHTML = '';
    if (previewSlot) {
      const isLandscapeRec = cState.recordingWidth > cState.recordingHeight ||
        cState.recordingOrientation === 'landscape' ||
        (cState.canvasEl && cState.canvasEl.width > cState.canvasEl.height);
      const aspectClass = isLandscapeRec ? 'is-landscape' : 'is-portrait';
      const aspectTitle = isLandscapeRec ? '16:9' : '9:16';
      const ext = (cState.actualExtension || 'mp4').toUpperCase();

      const st = cState.getRecordingStats ? cState.getRecordingStats() : null;
      const statsHtml = st ? `
        ${st.wasMinimized ? '<div class="camera-minimized-alert">⚠️ Во время записи приложение было свернуто. Рекомендуется записать комплекс повторно, чтобы избежать претензий судей.</div>' : ''}
        <div class="camera-stats-strip">
          <span class="camera-stat-badge">⏱️ Длительность: <b>${st.durationText}</b></span>
          <span class="camera-stat-badge">🔢 Повторов: <b>${st.reps || 0}${st.noReps ? ' (No-Rep: ' + st.noReps + ')' : ''}</b></span>
          <span class="camera-stat-badge">💾 Размер: <b>${st.sizeText}</b></span>
          <span class="camera-stat-badge">🎬 Разрешение: <b>${st.resolutionText}</b></span>
          <span class="camera-stat-badge">📁 Формат: <b>${st.formatText}</b></span>
        </div>
      ` : '';

      previewSlot.innerHTML = `
        <div class="camera-preview-modal ${aspectClass}" id="camera-recorded-result">
          <div class="camera-preview-title">
            <b>Видеозапись готова для судейства (${aspectTitle})</b>
            <small>Оверлей и таймер встроены</small>
            <button type="button" class="camera-preview-close-btn" id="camera-preview-close-btn" title="Закрыть" aria-label="Закрыть">✕</button>
          </div>
          <div class="preview-frame ${aspectClass}">
            <video src="${cState.recordedUrl}" controls playsinline class="camera-preview-player recording-preview-video ${aspectClass}" style="object-fit:contain;max-height:75vh;width:100%"></video>
          </div>
          ${statsHtml}
          <div class="camera-preview-buttons">
            <button type="button" class="camera-save-primary-btn" id="camera-share-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              <span>СОХРАНИТЬ / ПОДЕЛИТЬСЯ</span>
            </button>
            <button type="button" class="camera-download-sec-btn" id="camera-download-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              <span>СКАЧАТЬ (.${ext})</span>
            </button>
            <button type="button" class="camera-retry-btn" id="camera-retry-btn">
              <span>🔄 ЗАПИСАТЬ ЕЩЁ РАЗ</span>
            </button>
          </div>
        </div>
      `;

      // Динамическая адаптация aspect-ratio по реальным метаданным записанного видео
      const pVideo = previewSlot.querySelector('.camera-preview-player');
      const pFrame = previewSlot.querySelector('.preview-frame');
      const pModal = previewSlot.querySelector('.camera-preview-modal');
      if (pVideo) {
        const applyMetaRatio = () => {
          const vw = pVideo.videoWidth;
          const vh = pVideo.videoHeight;
          if (vw && vh) {
            const isLand = vw >= vh;
            if (pFrame) {
              pFrame.style.aspectRatio = `${vw} / ${vh}`;
              pFrame.classList.toggle('is-landscape', isLand);
              pFrame.classList.toggle('is-portrait', !isLand);
              pFrame.classList.toggle('landscape', isLand);
              pFrame.classList.toggle('portrait', !isLand);
            }
            pVideo.style.aspectRatio = `${vw} / ${vh}`;
            if (pModal) {
              pModal.classList.toggle('is-landscape', isLand);
              pModal.classList.toggle('is-portrait', !isLand);
            }
          }
        };
        if (pVideo.readyState >= 1) {
          applyMetaRatio();
        } else {
          pVideo.onloadedmetadata = applyMetaRatio;
        }
      }

      setTimeout(() => {
        const res = $('#camera-recorded-result');
        if (res) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  } else if (cState.state === 'ERROR') {
    if (placeholder) {
      placeholder.style.display = 'flex';
      const desc = placeholder.querySelector('.camera-placeholder-desc');
      if (desc && cState.errorMessage) desc.textContent = cState.errorMessage;
    }
    if (cornerLeft) cornerLeft.innerHTML = '';
    if (cornerRight) {
      cornerRight.innerHTML = `
        <button type="button" class="cam-ctrl-btn rec-start" id="camera-enable-btn">
          <span>ВКЛЮЧИТЬ КАМЕРУ</span>
        </button>
      `;
    }
  }

  if (cState.errorMessage && cState.state !== 'ERROR') {
    showToast('⚠️ ' + cState.errorMessage);
  }
}

function showToast(msg, duration = 2800) {
  let toast = $('#gto-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gto-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(16,185,129,0.95);color:#fff;font-weight:800;font-size:13px;padding:12px 20px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:999999;pointer-events:none;transition:opacity .25s ease;backdrop-filter:blur(8px);text-align:center;max-width:90vw;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => {
    toast.style.opacity = '0';
  }, duration);
}

function updateTimerDisplay(ts) {
  if (!ts) return;
  const digitsEl = $('#timer-digits');
  const phaseEl = $('#timer-phase');
  const roundEl = $('#timer-round');
  const startBtn = $('#timer-start-btn');

  // Fullscreen Landscape elements
  const fsDigitsEl = $('#timer-fs-digits');
  const fsPhaseEl = $('#timer-fs-phase');
  const fsRoundEl = $('#timer-fs-round');
  const fsStartBtn = $('#timer-fs-start-btn');
  const fsModeLabel = $('#timer-fs-mode-label');

  if (fsModeLabel) {
    const modeNames = { tabata: 'ТАБАТА', emom: 'EMOM', amrap: 'AMRAP', for_time: 'СЕКУНДОМЕР' };
    fsModeLabel.textContent = modeNames[ts.mode] || 'ТАЙМЕР';
  }

  const pad = n => String(n).padStart(2, '0');
  let mins = 0;
  let secs = 0;

  if (ts.status === 'countdown') {
    const cdStr = String(ts.countdownSeconds ?? '');
    if (digitsEl) digitsEl.textContent = cdStr;
    if (fsDigitsEl) fsDigitsEl.textContent = cdStr;
    if (phaseEl) {
      phaseEl.textContent = 'Приготовиться!';
      phaseEl.className = 'timer-phase-badge phase-countdown';
    }
    if (fsPhaseEl) {
      fsPhaseEl.textContent = 'ПРИГОТОВИТЬСЯ!';
      fsPhaseEl.className = 'timer-fs-phase phase-countdown';
    }
  } else if (ts.status === 'finished') {
    if (digitsEl) digitsEl.textContent = 'ФИНИШ';
    if (fsDigitsEl) fsDigitsEl.textContent = '00:00';
    if (phaseEl) {
      phaseEl.textContent = 'Комплекс завершён!';
      phaseEl.className = 'timer-phase-badge phase-finished';
    }
    if (fsPhaseEl) {
      fsPhaseEl.textContent = 'ФИНИШ!';
      fsPhaseEl.className = 'timer-fs-phase phase-finished';
    }
  } else {
    const rem = Number.isFinite(ts.secondsRemaining) ? ts.secondsRemaining : 0;
    mins = Math.floor(rem / 60);
    secs = rem % 60;
    const timeStr = `${pad(mins)}:${pad(secs)}`;
    if (digitsEl) digitsEl.textContent = timeStr;
    if (fsDigitsEl) fsDigitsEl.textContent = timeStr;

    if (phaseEl) {
      if (ts.phase === 'work') {
        phaseEl.textContent = 'РАБОТА';
        phaseEl.className = 'timer-phase-badge phase-work';
      } else {
        phaseEl.textContent = 'ОТДЫХ';
        phaseEl.className = 'timer-phase-badge phase-rest';
      }
    }
    if (fsPhaseEl) {
      if (ts.phase === 'work') {
        fsPhaseEl.textContent = 'РАБОТА';
        fsPhaseEl.className = 'timer-fs-phase phase-work';
      } else {
        fsPhaseEl.textContent = 'ОТДЫХ';
        fsPhaseEl.className = 'timer-fs-phase phase-rest';
      }
    }
  }

  if (roundEl) {
    if (ts.mode === 'tabata' || ts.mode === 'emom') {
      roundEl.innerHTML = `Раунд: <b>${ts.currentRound || 1}</b> из ${ts.totalRounds || 8}`;
    } else if (ts.mode === 'amrap') {
      const capMins = Math.round((ts.settings?.amrap?.duration || 600) / 60);
      const elapsed = Number.isFinite(ts.secondsElapsed) ? ts.secondsElapsed : 0;
      roundEl.innerHTML = `Крышка: <b>${capMins} мин</b> · Прошло: <b>${Math.floor(elapsed / 60)}:${pad(elapsed % 60)}</b>`;
    } else {
      const capMins = Math.round((ts.settings?.for_time?.cap || 1200) / 60);
      roundEl.innerHTML = `Крышка (тайм-кэп): <b>${capMins} мин</b>`;
    }
  }

  if (fsRoundEl) {
    if (ts.mode === 'tabata' || ts.mode === 'emom') {
      fsRoundEl.textContent = `РАУНД ${ts.currentRound || 1} / ${ts.totalRounds || 8}`;
    } else if (ts.mode === 'amrap') {
      const capMins = Math.round((ts.settings?.amrap?.duration || 600) / 60);
      fsRoundEl.textContent = `AMRAP · ${capMins} МИН`;
    } else {
      const capMins = Math.round((ts.settings?.for_time?.cap || 1200) / 60);
      fsRoundEl.textContent = `ТАЙМ-КЭП · ${capMins} МИН`;
    }
  }

  if (startBtn) {
    if (ts.status === 'running' || ts.status === 'countdown') {
      startBtn.textContent = 'Пауза';
      startBtn.className = 'timer-btn pause';
    } else {
      startBtn.textContent = ts.status === 'paused' ? 'Продолжить' : 'СТАРТ';
      startBtn.className = 'timer-btn start';
    }
  }

  if (fsStartBtn) {
    if (ts.status === 'running' || ts.status === 'countdown') {
      fsStartBtn.textContent = 'ПАУЗА';
      fsStartBtn.className = 'timer-fs-ctrl-btn fs-pause';
    } else {
      fsStartBtn.textContent = ts.status === 'paused' ? 'ПРОДОЛЖИТЬ' : 'СТАРТ';
      fsStartBtn.className = 'timer-fs-ctrl-btn fs-start';
    }
  }

  // Toggle timer-running class for animations & glowing digits
  const isRunning = ts.status === 'running' || ts.status === 'countdown';
  const timerCard = $('.timer-display-card');
  if (timerCard) timerCard.classList.toggle('timer-running', isRunning);
  const timerBox = $('#timer-content');
  if (timerBox) timerBox.classList.toggle('timer-running', isRunning);
  const fsOverlay = $('#timer-fullscreen-overlay');
  if (fsOverlay) fsOverlay.classList.toggle('timer-running', isRunning);
}

function ensureTimerFullscreenDom() {
  let overlay = $('#timer-fullscreen-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'timer-fullscreen-overlay';
  overlay.className = 'timer-fullscreen-overlay';
  overlay.style.display = 'none';

  overlay.innerHTML = `
    <div class="timer-fs-topbar">
      <div class="timer-fs-mode-pill" id="timer-fs-mode-label">ТАБАТА</div>
      <div class="timer-fs-actions">
        <button type="button" class="timer-fs-btn-icon" id="timer-fs-settings-btn" title="Настройки режима" aria-label="Настройки">⚙️</button>
        <button type="button" class="timer-fs-btn-icon" id="timer-fs-close-btn" title="Выйти из полноэкранного режима" aria-label="Выйти">✕</button>
      </div>
    </div>
    <div class="timer-fs-main">
      <div id="timer-fs-phase" class="timer-fs-phase phase-work">РАБОТА</div>
      <div id="timer-fs-digits" class="timer-fs-digits">00:20</div>
      <div id="timer-fs-round" class="timer-fs-round">РАУНД 1 / 8</div>
    </div>
    <div class="timer-fs-controls">
      <button type="button" id="timer-fs-reset-btn" class="timer-fs-ctrl-btn fs-reset">СБРОС</button>
      <button type="button" id="timer-fs-start-btn" class="timer-fs-ctrl-btn fs-start">СТАРТ</button>
    </div>
    <div id="timer-fs-drawer" class="timer-fs-drawer-backdrop" style="display:none;">
      <div class="timer-fs-drawer-content">
        <div class="timer-fs-drawer-header">
          <span>⚙️ Настройки таймера</span>
          <button type="button" class="timer-fs-btn-icon" id="timer-fs-drawer-close" style="width:36px;height:36px;font-size:16px;">✕</button>
        </div>
        <div class="timer-fs-drawer-body" id="timer-fs-drawer-body"></div>
        <div class="timer-fs-drawer-footer">
          <button type="button" class="timer-fs-drawer-done-btn" id="timer-fs-drawer-done">✓ ГОТОВО</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function openTimerFullscreen() {
  const overlay = ensureTimerFullscreenDom();
  overlay.style.display = 'flex';
  document.body.classList.add('timer-fullscreen-active');
  const t = getTimer();
  if (t) updateTimerDisplay(t.getState());

  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (err) {}

  try {
    if (screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (err) {}
}

function closeTimerFullscreen(force = false) {
  const overlay = $('#timer-fullscreen-overlay');
  if (!overlay || overlay.style.display === 'none') return;

  const t = getTimer();
  if (t && (t.status === 'running' || t.status === 'countdown') && !force) {
    t.pause?.();
    const ok = confirm('Тренировка активна. Поставить на паузу и выйти в обычный режим?');
    if (!ok) {
      t.start?.();
      return;
    }
  }

  overlay.style.display = 'none';
  document.body.classList.remove('timer-fullscreen-active');
  const drawer = $('#timer-fs-drawer');
  if (drawer) drawer.style.display = 'none';

  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  } catch (err) {}

  try {
    if (screen.orientation?.unlock) {
      screen.orientation.unlock().catch(() => {});
    }
  } catch (err) {}

  renderTimer();
}

function renderTimerFsDrawer() {
  const drawerBody = $('#timer-fs-drawer-body');
  if (!drawerBody) return;
  const t = getTimer();
  const ts = t ? t.getState() : {};
  const mode = ts?.mode || 'tabata';
  const defaultSettings = {
    tabata: { work: 20, rest: 10, rounds: 8 },
    emom: { interval: 60, rounds: 10 },
    amrap: { duration: 600 },
    for_time: { cap: 1200 }
  };
  const tabata = Object.assign({}, defaultSettings.tabata, t?.settings?.tabata, ts?.settings?.tabata);
  const emom = Object.assign({}, defaultSettings.emom, t?.settings?.emom, ts?.settings?.emom);
  const amrap = Object.assign({}, defaultSettings.amrap, t?.settings?.amrap, ts?.settings?.amrap);
  const for_time = Object.assign({}, defaultSettings.for_time, t?.settings?.for_time, ts?.settings?.for_time);
  const countdown = ts?.countdownDuration != null ? ts.countdownDuration : (t?.countdownDuration ?? 5);

  drawerBody.innerHTML = `
    <div class="timer-modes" style="margin-bottom: 12px;">
      <button class="timer-mode-btn ${mode === 'tabata' ? 'active' : ''}" data-timer-fs-mode="tabata">Табата</button>
      <button class="timer-mode-btn ${mode === 'emom' ? 'active' : ''}" data-timer-fs-mode="emom">EMOM</button>
      <button class="timer-mode-btn ${mode === 'amrap' ? 'active' : ''}" data-timer-fs-mode="amrap">AMRAP</button>
      <button class="timer-mode-btn ${mode === 'for_time' ? 'active' : ''}" data-timer-fs-mode="for_time">Секундомер</button>
    </div>

    <div class="timer-config-grid">
      ${mode === 'tabata' ? `
        <div class="timer-stepper-item">
          <label>Раунды</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-rounds" data-step="-1">−</button>
            <span class="stepper-val">${tabata.rounds ?? 8}</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-rounds" data-step="1">+</button>
          </div>
        </div>
        <div class="timer-stepper-item">
          <label>Работа</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-work" data-step="-5">−</button>
            <span class="stepper-val">${tabata.work ?? 20} с</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-work" data-step="5">+</button>
          </div>
        </div>
        <div class="timer-stepper-item">
          <label>Отдых</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-rest" data-step="-5">−</button>
            <span class="stepper-val">${tabata.rest ?? 10} с</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="tabata-rest" data-step="5">+</button>
          </div>
        </div>
      ` : ''}

      ${mode === 'emom' ? `
        <div class="timer-stepper-item">
          <label>Раунды</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="emom-rounds" data-step="-1">−</button>
            <span class="stepper-val">${emom.rounds ?? 10}</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="emom-rounds" data-step="1">+</button>
          </div>
        </div>
        <div class="timer-stepper-item">
          <label>Интервал</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="emom-interval" data-step="-15">−</button>
            <span class="stepper-val">${(emom.interval ?? 60) >= 60 ? Math.floor((emom.interval ?? 60) / 60) + ':' + String((emom.interval ?? 60) % 60).padStart(2, '0') : (emom.interval ?? 60) + ' с'}</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="emom-interval" data-step="15">+</button>
          </div>
        </div>
      ` : ''}

      ${mode === 'amrap' ? `
        <div class="timer-stepper-item" style="grid-column: 1 / -1;">
          <label>Крышка (тайм-кэп)</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="amrap-duration" data-step="-60">−</button>
            <span class="stepper-val">${Math.round((amrap.duration ?? 600) / 60)} мин</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="amrap-duration" data-step="60">+</button>
          </div>
        </div>
      ` : ''}

      ${mode === 'for_time' ? `
        <div class="timer-stepper-item" style="grid-column: 1 / -1;">
          <label>Крышка (тайм-кэп)</label>
          <div class="timer-stepper">
            <button type="button" class="stepper-btn" data-timer-fs-step="fortime-cap" data-step="-60">−</button>
            <span class="stepper-val">${Math.round((for_time.cap ?? 1200) / 60)} мин</span>
            <button type="button" class="stepper-btn" data-timer-fs-step="fortime-cap" data-step="60">+</button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="timer-countdown-row" style="margin-top: 10px;">
      <label>Обратный отсчёт:</label>
      <div class="timer-countdown-chips">
        <button type="button" class="countdown-chip ${countdown === 0 ? 'active' : ''}" data-timer-fs-countdown="0">Без отсчёта</button>
        <button type="button" class="countdown-chip ${countdown === 3 ? 'active' : ''}" data-timer-fs-countdown="3">3 сек</button>
        <button type="button" class="countdown-chip ${countdown === 5 ? 'active' : ''}" data-timer-fs-countdown="5">5 сек</button>
        <button type="button" class="countdown-chip ${countdown === 10 ? 'active' : ''}" data-timer-fs-countdown="10">10 сек</button>
      </div>
    </div>
  `;
}

let currentDeviceOrientation = (typeof window !== 'undefined' && window.innerWidth > window.innerHeight) ? 'landscape' : 'portrait';
function handleTimerOrientationChange() {
  const nextOrientation = (window.innerWidth > window.innerHeight && window.innerWidth >= 500) ? 'landscape' : 'portrait';
  const isTimerTab = timerActiveTab === 'timer';
  const isTimerScreen = state.screen === 'timer' || location.hash === '#timer';
  const overlay = $('#timer-fullscreen-overlay');
  const isFsOpen = overlay && overlay.style.display !== 'none';

  // If orientation hasn't physically changed and timer overlay is open, ignore Safari toolbar collapse/expand
  if (nextOrientation === currentDeviceOrientation && isFsOpen) {
    return;
  }
  currentDeviceOrientation = nextOrientation;

  if (isTimerScreen && isTimerTab && nextOrientation === 'landscape' && !isFsOpen) {
    openTimerFullscreen();
  } else if (isFsOpen && nextOrientation === 'portrait') {
    closeTimerFullscreen(true);
  }
}
window.addEventListener('resize', handleTimerOrientationChange);
if (typeof window !== 'undefined' && window.screen?.orientation) {
  try { window.screen.orientation.addEventListener('change', handleTimerOrientationChange); } catch (e) {}
}

function renderCameraTimerConfig(rec) {
  const cfg = rec?.timerConfig || {};
  const mode = cfg.mode || 'stopwatch';
  const soundEnabled = cfg.soundEnabled !== false;
  const preStart = cfg.preStartSeconds != null ? cfg.preStartSeconds : 5;
  const durSec = cfg.durationSeconds || 600;
  const intSec = cfg.intervalSeconds || 60;
  const rounds = cfg.rounds || 10;

  return `
    <div class="camera-timer-config-card" id="camera-timer-config-card">
      <div class="camera-config-head">
        <div class="camera-config-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/></svg>
          <b>Режим таймера комплекса (ТЗ v67)</b>
        </div>
        <label class="camera-sound-toggle-label">
          <input type="checkbox" id="camera-sound-toggle" ${soundEnabled ? 'checked' : ''}>
          <span>Сигналы 🔔</span>
        </label>
      </div>

      <div class="camera-mode-tabs">
        <button type="button" class="cam-mode-btn ${mode === 'stopwatch' ? 'active' : ''}" data-cam-mode="stopwatch">
          ⏱️ Секундомер
        </button>
        <button type="button" class="cam-mode-btn ${mode === 'countdown' ? 'active' : ''}" data-cam-mode="countdown">
          ⏳ AMRAP / Кэп
        </button>
        <button type="button" class="cam-mode-btn ${mode === 'interval' ? 'active' : ''}" data-cam-mode="interval">
          🔄 EMOM
        </button>
        <button type="button" class="cam-mode-btn ${mode === 'none' ? 'active' : ''}" data-cam-mode="none">
          🚫 Без таймера
        </button>
      </div>

      ${mode !== 'none' ? `
        <div class="camera-presets-row">
          <span class="camera-config-sublabel">Быстрый выбор:</span>
          <div class="camera-preset-chips">
            ${mode === 'countdown' ? `
              <button type="button" class="cam-chip" data-cam-preset="amrap5">AMRAP 5м</button>
              <button type="button" class="cam-chip" data-cam-preset="amrap10">AMRAP 10м</button>
              <button type="button" class="cam-chip" data-cam-preset="amrap12">AMRAP 12м</button>
              <button type="button" class="cam-chip" data-cam-preset="amrap15">AMRAP 15м</button>
              <button type="button" class="cam-chip" data-cam-preset="amrap20">AMRAP 20м</button>
            ` : ''}
            ${mode === 'interval' ? `
              <button type="button" class="cam-chip" data-cam-preset="emom10">EMOM 10 мин</button>
              <button type="button" class="cam-chip" data-cam-preset="emom12">EMOM 12 мин</button>
              <button type="button" class="cam-chip" data-cam-preset="e2mom10">E2MOM 10 мин (2:00)</button>
              <button type="button" class="cam-chip" data-cam-preset="e2mom16">E2MOM 16 мин (2:00)</button>
            ` : ''}
            ${mode === 'stopwatch' ? `
              <button type="button" class="cam-chip" data-cam-preset="nocap">Без лимита</button>
              <button type="button" class="cam-chip" data-cam-preset="cap10">Кэп 10м</button>
              <button type="button" class="cam-chip" data-cam-preset="cap12">Кэп 12м</button>
              <button type="button" class="cam-chip" data-cam-preset="cap15">Кэп 15м</button>
              <button type="button" class="cam-chip" data-cam-preset="cap20">Кэп 20м</button>
            ` : ''}
          </div>
        </div>

        <div class="camera-steppers-grid">
          ${mode === 'countdown' || (mode === 'stopwatch' && durSec > 0) ? `
            <div class="cam-stepper-item">
              <label>${mode === 'countdown' ? 'Крышка (тайм-кэп)' : 'Ограничение (тайм-кэп)'}</label>
              <div class="cam-stepper">
                <button type="button" class="cam-step-btn" data-cam-step="dur" data-step="-60">−</button>
                <span class="cam-step-val">${Math.round(durSec / 60)} мин</span>
                <button type="button" class="cam-step-btn" data-cam-step="dur" data-step="60">+</button>
              </div>
            </div>
          ` : ''}

          ${mode === 'interval' ? `
            <div class="cam-stepper-item">
              <label>Интервал раунда</label>
              <div class="cam-stepper">
                <button type="button" class="cam-step-btn" data-cam-step="interval" data-step="-15">−</button>
                <span class="cam-step-val">${intSec >= 60 ? Math.floor(intSec / 60) + ':' + String(intSec % 60).padStart(2, '0') : intSec + ' с'}</span>
                <button type="button" class="cam-step-btn" data-cam-step="interval" data-step="15">+</button>
              </div>
            </div>
            <div class="cam-stepper-item">
              <label>Всего раундов</label>
              <div class="cam-stepper">
                <button type="button" class="cam-step-btn" data-cam-step="rounds" data-step="-1">−</button>
                <span class="cam-step-val">${rounds}</span>
                <button type="button" class="cam-step-btn" data-cam-step="rounds" data-step="1">+</button>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="camera-countdown-select-row">
          <span class="camera-config-sublabel">Отсчёт до старта видео:</span>
          <div class="camera-prestart-chips">
            <button type="button" class="cam-chip ${preStart === 0 ? 'active' : ''}" data-cam-prestart="0">Без отсчёта</button>
            <button type="button" class="cam-chip ${preStart === 3 ? 'active' : ''}" data-cam-prestart="3">3 сек</button>
            <button type="button" class="cam-chip ${preStart === 5 ? 'active' : ''}" data-cam-prestart="5">5 сек</button>
            <button type="button" class="cam-chip ${preStart === 10 ? 'active' : ''}" data-cam-prestart="10">10 сек</button>
          </div>
        </div>

        <div class="camera-countdown-select-row" style="margin-top:12px">
          <span class="camera-config-sublabel">Старт таймера комплекса (ТЗ v97):</span>
          <div class="camera-prestart-chips">
            <button type="button" class="cam-chip ${cfg.timerAutoStart !== false ? 'active' : ''}" data-cam-autostart="true">⚡ Автостарт с видео</button>
            <button type="button" class="cam-chip ${cfg.timerAutoStart === false ? 'active' : ''}" data-cam-autostart="false">🖐️ Вручную по готовности</button>
          </div>
        </div>

        <div class="camera-countdown-select-row" style="margin-top:12px">
          <span class="camera-config-sublabel">Формат и разрешение видео (ТЗ v97):</span>
          <div class="camera-prestart-chips">
            <button type="button" class="cam-chip ${(cfg.orientation || 'auto') === 'auto' ? 'active' : ''}" data-cam-orient="auto">🔄 Авто</button>
            <button type="button" class="cam-chip ${cfg.orientation === 'portrait' ? 'active' : ''}" data-cam-orient="portrait">📱 Портрет 9:16 (1080×1920)</button>
            <button type="button" class="cam-chip ${cfg.orientation === 'landscape' ? 'active' : ''}" data-cam-orient="landscape">💻 Горизонт 16:9 (1920×1080)</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function refreshCameraConfigCard() {
  if (!cameraRecorderInstance) return;
  const cards = document.querySelectorAll('.camera-timer-config-card');
  cards.forEach(card => {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderCameraTimerConfig(cameraRecorderInstance);
    const newCard = tmp.firstElementChild;
    if (newCard) {
      card.replaceWith(newCard);
    }
  });
}

function renderTimer() {
  const box = $('#timer-content');
  if (!box) return;
  try {
    const timer = getTimer();
    const ts = timer ? timer.getState() : {};
    const mode = ts?.mode || 'tabata';
    const defaultSettings = {
      tabata: { work: 20, rest: 10, rounds: 8 },
      emom: { interval: 60, rounds: 10 },
      amrap: { duration: 600 },
      for_time: { cap: 1200 }
    };
    const tabata = Object.assign({}, defaultSettings.tabata, timer?.settings?.tabata, ts?.settings?.tabata);
    const emom = Object.assign({}, defaultSettings.emom, timer?.settings?.emom, ts?.settings?.emom);
    const amrap = Object.assign({}, defaultSettings.amrap, timer?.settings?.amrap, ts?.settings?.amrap);
    const for_time = Object.assign({}, defaultSettings.for_time, timer?.settings?.for_time, ts?.settings?.for_time);
    const countdown = ts?.countdownDuration != null ? ts.countdownDuration : (timer?.countdownDuration ?? 5);

    const pad = n => String(n).padStart(2, '0');
    const remaining = Number.isFinite(ts?.secondsRemaining) ? ts.secondsRemaining : (tabata.work || 20);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    const subnavHtml = `
      <div class="timer-subnav">
        <button type="button" class="timer-subnav-btn ${timerActiveTab === 'timer' ? 'active' : ''}" data-timer-subnav="timer">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/></svg>
          <span>Таймер тренировок</span>
        </button>
        <button type="button" class="timer-subnav-btn ${timerActiveTab === 'camera' ? 'active' : ''}" data-timer-subnav="camera">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <span>Запись отбора (Камера)</span>
        </button>
      </div>
    `;

    // ----------------------------------------------------
    // ВКЛАДКА 2: ВИДЕОЗАПИСЬ С ТАЙМЕРОМ (WOD QUALIFIER)
    // ----------------------------------------------------
    if (timerActiveTab === 'camera') {
      const rec = getCameraRecorder();

      // Проверяем: если контейнер камеры УЖЕ в DOM — НЕ пересоздаем его через innerHTML!
      const existingWrap = $('#camera-recorder-wrap');
      if (existingWrap) {
        updateCameraControls(rec);
        return;
      }

      const isHttp = location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
      const httpsBanner = isHttp ? `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:14px;padding:10px 14px;margin-bottom:12px;gap:10px;">
          <div style="font-size:11.5px;color:#fbbf24;line-height:1.3;">
            <b>Камера требует HTTPS:</b> Откройте приложение по защищённому адресу для записи.
          </div>
          <a href="https://201-51-30-44.sslip.io/" style="font-size:11.5px;font-weight:800;color:#fff;background:#f59e0b;padding:6px 12px;border-radius:8px;text-decoration:none;white-space:nowrap;">
            Перейти →
          </a>
        </div>
      ` : '';

      box.innerHTML = `
        ${subnavHtml}
        ${httpsBanner}

        <div class="camera-recorder-wrap" id="camera-recorder-wrap">
          <div class="camera-orient-hint">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M12 18h.01"/><path d="M1 9l3-3 3 3"/><path d="M4 6v8"/></svg>
            <span>Поверните телефон <b>горизонтально (16:9)</b> — стандарт видеозаписи отборов на Игры ГТО</span>
          </div>

          <div class="camera-viewfinder-card" id="camera-viewfinder-card">
            <button type="button" class="camera-exit-btn" id="camera-exit-btn" title="Выйти из камеры" aria-label="Выйти из камеры">✕</button>
            <div class="camera-debug-badge" id="camera-debug-badge">SOURCE --×-- | OUTPUT --×-- | --</div>
            <video id="camera-raw-video" class="camera-hidden-video" playsinline webkit-playsinline muted autoplay></video>
            <canvas id="camera-live-canvas" class="camera-live-canvas"></canvas>
            
            <div class="camera-placeholder-overlay" id="camera-placeholder-overlay">
              <div class="camera-placeholder-icon">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </div>
              <div class="camera-placeholder-title">Подключение камеры...</div>
              <div class="camera-placeholder-desc">Активация основной задней камеры смартфона</div>
              <button type="button" class="camera-activate-btn" id="camera-enable-btn">
                <span>Включить камеру</span>
              </button>
            </div>

            <!-- UI элементы управления: левый и правый углы поверх видоискателя -->
            <div class="camera-controls-overlay" id="camera-controls-overlay">
              <div class="camera-corner-left" id="camera-corner-left"></div>
              <div class="camera-corner-right" id="camera-corner-right"></div>
            </div>
          </div>

          <!-- Modal настроек таймера и атлета (ТЗ v67.3) -->
          <div class="camera-timer-drawer-backdrop" id="camera-timer-drawer" style="display:none;">
            <div class="camera-timer-drawer-content">
              <div class="camera-timer-drawer-header">
                <b>⚙️ Настройка таймера</b>
                <button type="button" class="camera-drawer-close-btn" id="camera-close-drawer-btn" title="Закрыть" aria-label="Закрыть">✕</button>
              </div>
              <div class="camera-drawer-body">
                <div class="camera-drawer-meta">
                  <div class="camera-input-group">
                    <label>ФИО атлета</label>
                    <input type="text" id="camera-drawer-athlete-input" placeholder="Иван Иванов" value="${String(rec.athleteName || '').replace(/"/g, '&quot;')}">
                  </div>
                  <div class="camera-input-group">
                    <label>Комплекс / Задание</label>
                    <input type="text" id="camera-drawer-workout-input" placeholder="Комплекс №1" value="${String(rec.workoutTitle || '').replace(/"/g, '&quot;')}">
                  </div>
                </div>
                <div id="camera-drawer-config-slot">
                  ${renderCameraTimerConfig(rec)}
                </div>
              </div>
              <div class="camera-drawer-footer">
                <button type="button" class="camera-drawer-done-btn" id="camera-save-drawer-btn">
                  <span>✓ ГОТОВО</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Диалог подтверждения выхода / отмены записи (ТЗ v67.4) -->
          <div class="camera-confirm-backdrop" id="camera-confirm-modal" style="display:none;">
            <div class="camera-confirm-card">
              <div class="camera-confirm-icon" id="camera-confirm-icon">⚠️</div>
              <div class="camera-confirm-title" id="camera-confirm-title">Выйти из записи?</div>
              <div class="camera-confirm-desc" id="camera-confirm-desc">Текущая запись будет удалена.</div>
              <div class="camera-confirm-actions">
                <button type="button" class="camera-confirm-btn keep" id="camera-confirm-keep-btn">ПРОДОЛЖИТЬ ЗАПИСЬ</button>
                <button type="button" class="camera-confirm-btn discard" id="camera-confirm-discard-btn">ВЫЙТИ И УДАЛИТЬ</button>
              </div>
            </div>
          </div>

          <div id="camera-preview-slot"></div>
        </div>
      `;

      // Привязываем элементы к экземпляру рекордера
      const videoEl = $('#camera-raw-video');
      const canvasEl = $('#camera-live-canvas');
      rec.videoEl = videoEl;
      rec.canvasEl = canvasEl;

      // Первичная отрисовка кнопок управления
      updateCameraControls(rec);

      // Авто-старт задней камеры при первом входе (п. 31 и 32 ТЗ)
      if (!rec.stream && rec.state !== 'REQUESTING_CAMERA') {
        rec.startCamera('environment').catch(err => {
          console.warn('Auto start camera error:', err);
        });
      } else if (rec.stream) {
        rec.startRenderLoop();
      }
      return;
    }

    // ----------------------------------------------------
    // ВКЛАДКА 1: ОБЫЧНЫЙ ТРЕНИРОВОЧНЫЙ ТАЙМЕР
    // ----------------------------------------------------
    const modeSubtitle = mode === 'tabata' 
      ? 'Интервалы работы и отдыха' 
      : mode === 'emom' 
      ? 'Минутные интервалы' 
      : mode === 'amrap' 
      ? 'Максимум раундов за время' 
      : 'Секундомер с ограничением (Time Cap)';

    box.innerHTML = `
      ${subnavHtml}

      <div class="timer-modes">
        <button class="timer-mode-btn ${mode === 'tabata' ? 'active' : ''}" data-timer-mode="tabata">Табата</button>
        <button class="timer-mode-btn ${mode === 'emom' ? 'active' : ''}" data-timer-mode="emom">EMOM</button>
        <button class="timer-mode-btn ${mode === 'amrap' ? 'active' : ''}" data-timer-mode="amrap">AMRAP</button>
        <button class="timer-mode-btn ${mode === 'for_time' ? 'active' : ''}" data-timer-mode="for_time">Секундомер</button>
      </div>

      <div class="timer-config-panel">
        <div class="timer-config-header">
          <span>Параметры тренировки</span>
          <small>${modeSubtitle}</small>
        </div>

        <div class="timer-config-grid">
          ${mode === 'tabata' ? `
            <div class="timer-stepper-item">
              <label>Раунды</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="tabata-rounds" data-step="-1">−</button>
                <span class="stepper-val">${tabata.rounds ?? 8}</span>
                <button type="button" class="stepper-btn" data-timer-step="tabata-rounds" data-step="1">+</button>
              </div>
            </div>
            <div class="timer-stepper-item">
              <label>Работа</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="tabata-work" data-step="-5">−</button>
                <span class="stepper-val">${tabata.work ?? 20} с</span>
                <button type="button" class="stepper-btn" data-timer-step="tabata-work" data-step="5">+</button>
              </div>
            </div>
            <div class="timer-stepper-item">
              <label>Отдых</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="tabata-rest" data-step="-5">−</button>
                <span class="stepper-val">${tabata.rest ?? 10} с</span>
                <button type="button" class="stepper-btn" data-timer-step="tabata-rest" data-step="5">+</button>
              </div>
            </div>
          ` : ''}

          ${mode === 'emom' ? `
            <div class="timer-stepper-item">
              <label>Раунды</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="emom-rounds" data-step="-1">−</button>
                <span class="stepper-val">${emom.rounds ?? 10}</span>
                <button type="button" class="stepper-btn" data-timer-step="emom-rounds" data-step="1">+</button>
              </div>
            </div>
            <div class="timer-stepper-item">
              <label>Интервал</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="emom-interval" data-step="-15">−</button>
                <span class="stepper-val">${(emom.interval ?? 60) >= 60 ? Math.floor((emom.interval ?? 60) / 60) + ':' + String((emom.interval ?? 60) % 60).padStart(2, '0') : (emom.interval ?? 60) + ' с'}</span>
                <button type="button" class="stepper-btn" data-timer-step="emom-interval" data-step="15">+</button>
              </div>
            </div>
          ` : ''}

          ${mode === 'amrap' ? `
            <div class="timer-stepper-item" style="grid-column: 1 / -1;">
              <label>Крышка (тайм-кэп / лимит времени)</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="amrap-duration" data-step="-60">−</button>
                <span class="stepper-val">${Math.round((amrap.duration ?? 600) / 60)} мин</span>
                <button type="button" class="stepper-btn" data-timer-step="amrap-duration" data-step="60">+</button>
              </div>
            </div>
          ` : ''}

          ${mode === 'for_time' ? `
            <div class="timer-stepper-item" style="grid-column: 1 / -1;">
              <label>Крышка (тайм-кэп)</label>
              <div class="timer-stepper">
                <button type="button" class="stepper-btn" data-timer-step="fortime-cap" data-step="-60">−</button>
                <span class="stepper-val">${Math.round((for_time.cap ?? 1200) / 60)} мин</span>
                <button type="button" class="stepper-btn" data-timer-step="fortime-cap" data-step="60">+</button>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="timer-countdown-row">
          <label>Обратный отсчёт:</label>
          <div class="timer-countdown-chips">
            <button type="button" class="countdown-chip ${countdown === 0 ? 'active' : ''}" data-countdown="0">Без отсчёта</button>
            <button type="button" class="countdown-chip ${countdown === 3 ? 'active' : ''}" data-countdown="3">3 сек</button>
            <button type="button" class="countdown-chip ${countdown === 5 ? 'active' : ''}" data-countdown="5">5 сек</button>
            <button type="button" class="countdown-chip ${countdown === 10 ? 'active' : ''}" data-countdown="10">10 сек</button>
          </div>
        </div>
      </div>

      <div class="timer-display-card">
        <span id="timer-phase" class="timer-phase-badge phase-${ts?.phase || 'work'}">${ts?.phase === 'rest' ? 'ОТДЫХ' : 'РАБОТА'}</span>
        <div id="timer-digits" class="timer-digits">${pad(mins)}:${pad(secs)}</div>
        <div id="timer-round" class="timer-round-info">
          ${mode === 'tabata' || mode === 'emom' 
            ? `Раунд: <b>${ts?.currentRound || 1}</b> из ${ts?.totalRounds || (mode === 'tabata' ? tabata.rounds : emom.rounds)}`
            : mode === 'amrap'
            ? `Крышка: <b>${Math.round((amrap.duration || 600) / 60)} мин</b>`
            : `Крышка (тайм-кэп): <b>${Math.round((for_time.cap || 1200) / 60)} мин</b>`}
        </div>
        <button type="button" class="timer-fs-trigger-btn" id="timer-open-fs-btn" title="Полноэкранный режим для зала">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          <span>Во весь экран (Зал)</span>
        </button>
      </div>

      <div class="timer-controls">
        <button id="timer-start-btn" class="timer-btn ${ts?.status === 'running' ? 'pause' : 'start'}">${ts?.status === 'running' ? 'Пауза' : 'СТАРТ'}</button>
        <button id="timer-reset-btn" class="timer-btn reset">Сброс</button>
      </div>

      <div class="timer-presets">
        <h3>Популярные готовые форматы</h3>
        <div class="preset-chips">
          <button class="preset-chip" data-preset="tabata">Табата 8 раундов (20/10 с)</button>
          <button class="preset-chip" data-preset="emom10">EMOM 10 минут</button>
          <button class="preset-chip" data-preset="emom15">EMOM 15 минут</button>
          <button class="preset-chip" data-preset="amrap10">AMRAP 10 минут</button>
          <button class="preset-chip" data-preset="amrap20">AMRAP 20 минут</button>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to render timer:', err);
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏱️</div>
        <h3>Таймер тренировок</h3>
        <p>Нажмите ниже для запуска таймера</p>
        <button class="action-btn" onclick="location.reload()">Перезагрузить таймер</button>
      </div>
    `;
  }
}

// ----------------------------------------------------
// СУДЕЙСКИЕ СТАНДАРТЫ И NO-REP
// ----------------------------------------------------
function renderStandards() {
  const box = $('#standards-content');
  if (!box) return;
  const q = state.standardCat;
  const items = GTO_STANDARDS.filter(s => q === 'all' || s.category.includes(q) || (q === 'Скоростно-силовые качества' && /прыж|скорост/i.test(s.category)));

  box.innerHTML = items.map(s => `
    <article class="standard-card">
      <div class="standard-card-head">
        <div>
          <h2>${esc(s.title)}</h2>
          <p class="std-equip">Снаряд: ${esc(s.equipment)}</p>
        </div>
        <span class="standard-tag">${esc(s.category)}</span>
      </div>
      <div class="std-block" style="background:#ffffff08">
        <b style="color:#cbd5e1;display:block;margin-bottom:4px;font-size:12px">Исходное положение</b>
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5">${esc(s.startingPosition)}</p>
      </div>
      <div class="std-block rep">
        <b>✓ Критерии зачёта (Rep)</b>
        <ul>
          ${s.repStandard.map(r => `<li>${esc(r)}</li>`).join('')}
        </ul>
      </div>
      <div class="std-block no-rep">
        <b>✕ Нарушения (No-Rep / Не зачёт)</b>
        <ul>
          ${s.noRep.map(nr => `<li>${esc(nr)}</li>`).join('')}
        </ul>
      </div>
      <div class="std-tip">
        <b>Судейский комментарий:</b> ${esc(s.judgeTip)}
      </div>
    </article>
  `).join('');
}

// ----------------------------------------------------
// ГЛОБАЛЬНЫЙ ПОИСК АТЛЕТА ПО ВСЕМ 21 ПРОТОКОЛАМ
// ----------------------------------------------------
async function buildAthleteIndex() {
  if (state.athleteIndex) return state.athleteIndex;
  state.athleteLoading = true;
  const countEl = $('#athlete-search-count');
  if (countEl) countEl.textContent = 'Загружаем каталог атлетов…';
  try {
    const response = await fetch('./data/master/athletes.json?v=82');
    if (response.ok) {
      const athletes = await response.json();
      if (Array.isArray(athletes) && athletes.length) {
        state.athleteIndex = athletes.map(athlete => ({ ...athlete, kind: 'profile' }));
        athleteByNameCache.clear();
        state.athleteMap = new Map();
        state.athleteIndex.forEach(a => state.athleteMap.set(Number(a.id), a));
        state.athleteLoading = false;
        return state.athleteIndex;
      }
    }
  } catch (_) {}

  const index = [];
  const eventIds = Object.keys(state.eventManifest.events || {}).filter(id => state.eventManifest.events[id].results);

  await Promise.all(eventIds.map(async id => {
    try {
      const res = await fetch(`./data/events/${id}.json?v=18`);
      if (!res.ok) return;
      const data = await res.json();
      (data.results || []).forEach(sec => {
        (sec.tables || []).forEach(tbl => {
          const hi = findHeaderRow(tbl);
          if (hi < 0) return;
          const H = tbl[hi].map(x => String(x || '').trim().toLowerCase());
          const find = re => H.findIndex(h => re.test(h));
          const iSurname = find(/фамил/);
          const iName = find(/^имя|^ф\.?и\.?о/);
          if (iSurname < 0 && iName < 0) return;
          const iRank = find(/^(№|n|место|п\/п)$/);
          const iRes = find(/результат|очки|балл|сумма|итог/);
          const iCat = find(/категор|группа|возраст/);

          for (let i = hi + 1; i < tbl.length; i++) {
            const row = tbl[i];
            const name = [iSurname, iName].filter(x => x >= 0).map(x => row[x]).filter(Boolean).join(' ').trim();
            if (!name || name.length < 3 || HEADER_TOKENS.test(name)) continue;
            index.push({
              eventId: id,
              eventTitle: data.title || '',
              eventPeriod: data.period || '',
              section: sec.title || '',
              name,
              rank: iRank >= 0 && row[iRank] ? String(row[iRank]).trim() : '',
              result: iRes >= 0 && row[iRes] ? String(row[iRes]).trim() : '',
              cat: iCat >= 0 && row[iCat] ? String(row[iCat]).trim() : ''
            });
          }
        });
      });
    } catch (_) {}
  }));

  state.athleteIndex = index;
  athleteByNameCache.clear();
  state.athleteLoading = false;
  return index;
}

const athleteByNameCache = new Map();
function findAthleteByName(name) {
  if (!state.athleteIndex || !name) return null;
  const n = clean(name).toLowerCase();
  if (athleteByNameCache.has(n)) return athleteByNameCache.get(n);
  let match = state.athleteIndex.find(a => clean(a.name).toLowerCase() === n);
  if (match) {
    athleteByNameCache.set(n, match);
    return match;
  }
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const rev = `${parts[1]} ${parts[0]}`;
    match = state.athleteIndex.find(a => clean(a.name).toLowerCase() === rev);
    if (match) {
      athleteByNameCache.set(n, match);
      return match;
    }
  }
  const partials = state.athleteIndex.filter(a => clean(a.name).toLowerCase().includes(n));
  if (partials.length === 1) {
    athleteByNameCache.set(n, partials[0]);
    return partials[0];
  }
  athleteByNameCache.set(n, null);
  return null;
}
window.findAthleteByName = findAthleteByName;

function formatPlacementBadge(rank) {
  const r = String(rank || '').trim().toLowerCase();
  if (r === '1' || r.includes('золото') || r.includes('1 место') || r.includes('1-е место')) {
    return '<span class="athlete-badge-gold">🥇 1 место</span>';
  }
  if (r === '2' || r.includes('серебро') || r.includes('2 место') || r.includes('2-е место')) {
    return '<span class="athlete-badge-silver">🥈 2 место</span>';
  }
  if (r === '3' || r.includes('бронза') || r.includes('3 место') || r.includes('3-е место')) {
    return '<span class="athlete-badge-bronze">🥉 3 место</span>';
  }
  if (r && r !== '-') {
    return `<span class="athlete-badge-rank">№ ${esc(rank)}</span>`;
  }
  return '<span class="athlete-badge-participant">Участник</span>';
}

function renderAthleteProfileScreen(athlete) {
  const container = $('#athlete-profile-detail');
  if (!container || !athlete) return;

  const records = Array.isArray(athlete.records) ? athlete.records : [];
  const competitions = Array.isArray(athlete.competitions) ? athlete.competitions : [];

  const startsCount = Number(athlete.competitions_count ?? competitions.length);
  const podiumsCount = Number(athlete.podiums_count ?? 0);
  const recordsCount = Number(athlete.records_count ?? records.length);
  const winsCount = Number(athlete.wins_count ?? 0);

  const initials = getAthleteInitials(athlete.name);
  const colorIdx = getAvatarColorIndex(athlete.id || athlete.name);
  const avatarHtml = (athlete.photo_url && athlete.photo_url !== './assets/logo-clean.png' && !athlete.photo_url.includes('logo-clean'))
    ? `<img class="athlete-hero-photo" loading="eager" referrerpolicy="no-referrer" src="${safeImage(athlete.photo_url)}" alt="Фото: ${esc(athlete.name)}" onerror="this.onerror=null;this.className='athlete-hero-avatar-placeholder athlete-avatar-monogram color-${colorIdx}';this.textContent='${esc(initials)}';">`
    : `<div class="athlete-hero-avatar-placeholder athlete-avatar-monogram color-${colorIdx}" aria-hidden="true">${esc(initials)}</div>`;

  const athleteIdStr = athlete.athlete_id || ('ATH-' + String(athlete.id).padStart(7, '0'));
  const shareData = esc(JSON.stringify({
    type: 'athlete',
    id: athleteIdStr,
    name: athlete.name,
    region: athlete.region || 'Российская Федерация',
    gender: athlete.gender || '',
    starts: startsCount,
    podiums: podiumsCount,
    records: recordsCount,
    wins: winsCount,
    topEvents: competitions.slice(0, 3).map(c => c.tournament_title).filter(Boolean)
  }));

  const upcoming = [];
  const past = [];
  competitions.forEach(c => {
    const t = `${c.tournament_title || ''} ${c.tournament_slug || ''}`.toLowerCase();
    if (t.includes('предстоящ') || (t.includes('2026') && !c.rank && !c.result)) {
      upcoming.push(c);
    } else {
      past.push(c);
    }
  });

  athlete._upcomingCompetitions = upcoming;
  athlete._pastCompetitions = past;

  const renderTournCard = (c, cIdx = 0, listType = 'past') => {
    const ev = findTournamentForCompetition(c);
    const title = ev?.title || c.tournament_title || 'Соревнование ГТО';
    const period = ev?.period || c.tournament_date || '';
    const city = ev?.location ? ev.location.slice(0, 45) : (c.city || (c.is_online_platform ? 'Онлайн-этап' : ''));
    const eventId = ev?.id || null;
    const badgeHtml = getResultPlaceBadgeHtml(c.rank || (c.overall_place ? `${c.overall_place} место` : ''));
    const catText = [c.category, c.subgroup].filter(Boolean).join(' · ');
    const teamText = c.team_name ? `Команда: ${c.team_name}` : '';
    const events = Array.isArray(c.events) ? c.events : [];

    const eventsHtml = events.length > 1 ? `
      <details class="athlete-tourn-events-accordion">
        <summary class="athlete-tourn-events-head">
          <span>Этапы и комплексы (${events.length})</span>
          <span class="accordion-arrow" aria-hidden="true">▾</span>
        </summary>
        <div class="athlete-tourn-events-list">
          ${events.map((e, idx) => `
            <div class="athlete-tourn-event-item">
              <div class="athlete-tourn-event-name">
                <span class="athlete-tourn-event-idx">${idx + 1}.</span>
                <span>${esc(e.event_name || `Этап ${idx + 1}`)}</span>
                ${e.subgroup && e.subgroup !== e.event_name ? `<small class="athlete-tourn-event-sub">(${esc(e.subgroup)})</small>` : ''}
              </div>
              <div class="athlete-tourn-event-res">
                ${e.result ? `<span class="athlete-tourn-event-val">${esc(e.result)}</span>` : ''}
                ${e.rank ? `<span class="athlete-tourn-event-rank">${esc(e.rank)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : (events.length === 1 && events[0].event_name && events[0].event_name !== title && events[0].event_name !== c.category ? `
      <div class="athlete-tourn-events-single">
        <span>Дисциплина: <b>${esc(events[0].event_name)}</b></span>
      </div>
    ` : '');

    return `
      <article class="athlete-tourn-card history-card" data-tourn-card-idx="${cIdx}" data-tourn-list="${listType}" style="cursor:pointer;transition:transform 0.15s ease,box-shadow 0.15s ease">
        <div class="athlete-tourn-head history-head">
          <div>
            <h3 class="athlete-tourn-title history-title">${esc(title)}</h3>
            <div class="athlete-tourn-sub history-meta">
              ${period ? `<span>📅 ${esc(period)}</span>` : ''}
              ${city ? `<span>📍 ${esc(city)}</span>` : ''}
            </div>
          </div>
          <div>${badgeHtml}</div>
        </div>
        <div class="athlete-tourn-body">
          <div class="athlete-tourn-tags">
            ${catText ? `<span class="athlete-tourn-pill history-chip">${esc(catText)}</span>` : ''}
            ${teamText ? `<span class="athlete-tourn-pill history-chip" style="color:#60a5fa;border-color:rgba(96,165,250,0.3)">👥 ${esc(teamText)}</span>` : ''}
            ${c.is_online_platform ? `<span class="athlete-tourn-pill history-chip" style="color:#34d399;border-color:rgba(52,211,153,0.3)">🌐 Онлайн-платформа</span>` : ''}
            ${events.length > 1 ? `<span class="athlete-tourn-pill history-chip" style="color:#c084fc;border-color:rgba(192,132,252,0.3)">📊 ${events.length} этапа</span>` : ''}
          </div>
          ${c.result ? `
            <div class="athlete-tourn-result-box history-result-box">
              <span>Итоговый результат:</span>
              <strong class="history-result-value">${esc(c.result)}</strong>
            </div>` : ''}
          ${eventsHtml}
          <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="athlete-protocol-btn history-protocol-btn" data-open-tourn-modal="${cIdx}" data-tourn-list="${listType}" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3)">
              Карточка старта ℹ️
            </button>
            ${eventId ? `
              <button type="button" class="athlete-protocol-btn history-protocol-btn secondary" data-event="${eventId}" data-event-pane="results">
                Протокол турнира →
              </button>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  };

  const renderRecordCard = r => renderUnifiedRecordCard({ ...r, holder: r.holder || athlete.name, athleteId: athlete.id }, { defaultCity: athlete.region });

  const rawRegion = athlete.region || '';
  const regId = normalizeRegionName(rawRegion);
  const regObj = regId ? getRegionById(regId) : null;
  const districtName = regObj ? (DISTRICT_NAMES[regObj.district] || regObj.district) : 'Российская Федерация';
  const regionDisplayName = regObj ? regObj.name : (rawRegion || 'Российская Федерация');

  let teamName = athlete.team_name || athlete.team || athlete.club || '';
  if (!teamName) {
    const compWithTeam = competitions.find(c => c.team_name);
    if (compWithTeam) teamName = compWithTeam.team_name;
  }
  if (!teamName && regObj) {
    teamName = `Сборная ${regObj.shortName || regObj.name}`;
  }
  const coachName = athlete.coach || '';
  const rankTitle = athlete.rank_title || athlete.rank || 'Атлет ФМГТО';

  const teammates = (state.athleteIndex || []).filter(a => {
    if (Number(a.id) === Number(athlete.id) || a.athlete_id === athlete.athlete_id) return false;
    const aRegId = normalizeRegionName(a.region);
    return regId && aRegId === regId;
  }).sort((a, b) => (Number(b.podiums_count || 0) * 2 + Number(b.competitions_count || 0)) - (Number(a.podiums_count || 0) * 2 + Number(a.competitions_count || 0)));

  const regionalEvents = GTO_CALENDAR_EVENTS.filter(e => {
    if (!regObj) return false;
    const loc = (e.location || '').toLowerCase();
    const tit = (e.title || '').toLowerCase();
    return loc.includes(regObj.shortName.toLowerCase()) || loc.includes(regObj.capital.toLowerCase()) || (regObj.aliases || []).some(al => loc.includes(al) || tit.includes(al));
  });

  const regionalRecords = (GTO_RECORDS || []).filter(r => {
    if (!regObj) return false;
    const city = (r.city || '').toLowerCase();
    return city.includes(regObj.shortName.toLowerCase()) || city.includes(regObj.capital.toLowerCase()) || (regObj.aliases || []).some(al => city.includes(al));
  });

  const athleteHierarchyHtml = `
    <div class="athlete-hierarchy-card">
      <div class="athlete-hierarchy-header">
        <span class="ah-icon">🏛️</span>
        <span>Официальная спортивная иерархия</span>
      </div>
      <div class="athlete-hierarchy-chain">
        <div class="ah-step">
          <div class="ah-badge fed">ФМГТО</div>
          <div class="ah-info">
            <span class="ah-sub">Общероссийская Федерация</span>
            <b>Федерация многоборья ГТО России</b>
          </div>
        </div>
        <div class="ah-sep">↓</div>
        <div class="ah-step">
          <div class="ah-badge district">${regObj ? regObj.district : 'РФ'}</div>
          <div class="ah-info">
            <span class="ah-sub">Федеральный округ</span>
            <b>${districtName}</b>
          </div>
        </div>
        <div class="ah-sep">↓</div>
        <div class="ah-step ${regObj ? 'clickable' : ''}" ${regObj ? `data-open-region="${regObj.id}"` : ''} role="button" tabindex="0">
          <div class="ah-badge region">${regObj ? regObj.code : 'РЕГ'}</div>
          <div class="ah-info">
            <span class="ah-sub">Региональное отделение</span>
            <b>${regionDisplayName}</b>
          </div>
          ${regObj ? '<span class="ah-link">Страница отделения →</span>' : ''}
        </div>
        <div class="ah-sep">↓</div>
        <div class="ah-step">
          <div class="ah-badge team">🛡️ КЛУБ</div>
          <div class="ah-info">
            <span class="ah-sub">Клуб / Сборная команда ${coachName ? `· Тренер: ${esc(coachName)}` : ''}</span>
            <b>${esc(teamName || 'Сборная региона')}</b>
          </div>
        </div>
        <div class="ah-sep">↓</div>
        <div class="ah-step">
          <div class="ah-badge rank">🏅 СТАТУС</div>
          <div class="ah-info">
            <span class="ah-sub">Официальный реестровый статус</span>
            <b>${esc(rankTitle)}</b>
          </div>
        </div>
      </div>
    </div>
  `;

  const athleteProgramsHtml = `
    <section class="athlete-section athlete-programs-section">
      <div class="athlete-section-title section-title">
        <span>Соревновательные программы атлета</span>
        <span class="athlete-section-count">3 программы</span>
      </div>
      <div class="athlete-programs-grid">
        <div class="athlete-prog-card">
          <div class="apc-head">
            <span class="apc-badge allround">Многоборье</span>
            <span class="apc-icon">🏅</span>
          </div>
          <h3 class="apc-title">Многоборье ГТО</h3>
          <p class="apc-desc">Официальные очные старты ЕКП: полоса препятствий, эстафеты, силовые комплексы на арене.</p>
          <div class="apc-stat">Стартов в протоколах: <b>${startsCount}</b> · Подиумов: <b>${podiumsCount}</b></div>
          <button type="button" class="apc-btn" data-go="events">Календарь стартов →</button>
        </div>

        <div class="athlete-prog-card active-flow">
          <div class="apc-head">
            <span class="apc-badge herogto">⚡ Герой ГТО</span>
            <span class="apc-icon">📹</span>
          </div>
          <h3 class="apc-title">Герой ГТО</h3>
          <p class="apc-desc">Онлайн-соревнования и видеоквалификация. Запись соревновательных WOD через таймер и судейство ФМГТО.</p>
          <div class="apc-stat">Личный кабинет, WOD-комплексы и видеозаявки</div>
          <button type="button" class="apc-btn primary" data-open-hero-cabinet="${esc(athlete.name)}">Личный кабинет Герой ГТО ⚡</button>
        </div>

        <div class="athlete-prog-card">
          <div class="apc-head">
            <span class="apc-badge records">🏆 Рекорды</span>
            <span class="apc-icon">💪</span>
          </div>
          <h3 class="apc-title">Иду на рекорд</h3>
          <p class="apc-desc">Индивидуальные попытки установления всероссийских и региональных рекордов ГТО в силовых упражнениях.</p>
          <div class="apc-stat">Рекордов России: <b>${recordsCount}</b></div>
          <button type="button" class="apc-btn" data-go="records">Рекорды России →</button>
        </div>
      </div>
    </section>
  `;

  const athleteRegionCommunityHtml = `
    <section class="athlete-section athlete-region-community">
      <div class="athlete-section-title section-title">
        <span>Спортивный регион: ${regionDisplayName}</span>
        ${regObj ? `<button type="button" class="athlete-region-tag-btn" data-open-region="${regObj.id}">Отделение региона →</button>` : ''}
      </div>
      <div class="athlete-region-stats-row">
        <div class="ars-item">
          <span class="ars-val">${teammates.length + 1}</span>
          <span class="ars-lbl">Атлетов в регионе</span>
        </div>
        <div class="ars-item">
          <span class="ars-val">${regionalEvents.length}</span>
          <span class="ars-lbl">Турниров региона</span>
        </div>
        <div class="ars-item">
          <span class="ars-val">${regionalRecords.length}</span>
          <span class="ars-lbl">Рекордов региона</span>
        </div>
      </div>
      ${teammates.length ? `
        <div class="teammates-sub-head">
          <span>Земляки и сборная региона (${teammates.length})</span>
          <small>Нажмите на карточку для перехода в профиль</small>
        </div>
        <div class="teammates-scroll-row">
          ${teammates.slice(0, 16).map(t => {
            const tInit = getAthleteInitials(t.name);
            const tColor = getAvatarColorIndex(t.id || t.name);
            const tPhoto = (t.photo_url && !t.photo_url.includes('logo-clean'))
              ? `<img src="${safeImage(t.photo_url)}" alt="" class="tm-avatar-img" onerror="this.onerror=null;this.className='tm-avatar-monogram color-${tColor}';this.textContent='${esc(tInit)}';">`
              : `<div class="tm-avatar-monogram color-${tColor}">${esc(tInit)}</div>`;
            return `
              <div class="teammate-mini-card" data-open-athlete-id="${t.id}">
                <div class="tm-avatar-wrap">${tPhoto}</div>
                <b class="tm-name">${esc(t.name)}</b>
                <span class="tm-meta">${t.competitions_count || 0} ${ruPlural(t.competitions_count || 0, 'старт', 'старта', 'стартов')}</span>
              </div>
            `;
          }).join('')}
          ${teammates.length > 16 && regObj ? `
            <div class="teammate-mini-card tm-more" data-open-region="${regObj.id}">
              <div class="tm-more-circle">+${teammates.length - 16}</div>
              <b>Все атлеты</b>
              <span>в отделении →</span>
            </div>
          ` : ''}
        </div>
      ` : '<div class="empty" style="padding:12px 0">Спортсмен — первый зарегистрированный представитель региона в системе.</div>'}
    </section>
  `;

  container.innerHTML = `
    <div class="athlete-hero-card athlete-hero">
      <div class="athlete-hero-top">
        <div class="athlete-hero-avatar-wrap athlete-avatar">
          ${avatarHtml}
        </div>
        <div class="athlete-hero-details">
          <span class="athlete-id-pill athlete-id">${esc(athlete.athlete_id || ('ATH-' + String(athlete.id).padStart(7, '0')))}</span>
          <h1 class="athlete-hero-name athlete-name">${esc(athlete.name)}</h1>
          <div class="athlete-hero-meta athlete-location">
            <b>${esc(regionDisplayName)}</b>
            ${athlete.gender ? `<span>•</span> <span>${esc(athlete.gender)}</span>` : ''}
            ${regObj ? `<button type="button" class="athlete-hero-region-badge-btn" data-open-region="${regObj.id}">Отделение ${esc(regObj.code)} →</button>` : ''}
          </div>
        </div>
      </div>
      <div class="athlete-hero-actions athlete-actions">
        <button type="button" class="athlete-hero-btn primary btn" data-share-data="${shareData}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          <span>Поделиться карточкой</span>
        </button>
        <button type="button" class="athlete-hero-btn secondary btn" data-copy-athlete-url="${athlete.athlete_id || athlete.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Ссылка на профиль</span>
        </button>
        <button type="button" class="athlete-hero-btn secondary btn" data-open-hero-cabinet="${esc(athlete.name)}" style="border-color:rgba(56,189,248,0.4);color:#38bdf8">
          <span style="font-size:14px">⚡</span>
          <span>Личный кабинет «Герой ГТО»</span>
        </button>
      </div>
    </div>

    <div class="athlete-metrics-strip athlete-stats-grid">
      <div class="athlete-metric-card athlete-stat-card blue">
        <span class="athlete-metric-val athlete-stat-value">${startsCount}</span>
        <span class="athlete-metric-lbl athlete-stat-label">Старты</span>
      </div>
      <div class="athlete-metric-card athlete-stat-card gold">
        <span class="athlete-metric-val athlete-stat-value">${podiumsCount}</span>
        <span class="athlete-metric-lbl athlete-stat-label">Подиумы</span>
      </div>
      <div class="athlete-metric-card athlete-stat-card green">
        <span class="athlete-metric-val athlete-stat-value">${recordsCount}</span>
        <span class="athlete-metric-lbl athlete-stat-label">Рекорды</span>
      </div>
      <div class="athlete-metric-card athlete-stat-card red">
        <span class="athlete-metric-val athlete-stat-value">${winsCount}</span>
        <span class="athlete-metric-lbl athlete-stat-label">Победы</span>
      </div>
    </div>

    ${athleteHierarchyHtml}

    ${athleteProgramsHtml}

    ${athleteRegionCommunityHtml}

    ${upcoming.length ? `
      <section class="athlete-section">
        <div class="athlete-section-title section-title">
          <span>Предстоящие старты</span>
          <span class="athlete-section-count">${upcoming.length}</span>
        </div>
        ${upcoming.map((c, idx) => renderTournCard(c, idx, 'upcoming')).join('')}
      </section>
    ` : ''}

    <section class="athlete-section">
      <div class="athlete-section-title section-title">
        <span>История турниров</span>
        <span class="athlete-section-count">${past.length}</span>
      </div>
      ${past.length ? past.map((c, idx) => renderTournCard(c, idx, 'past')).join('') : '<div class="empty">Нет завершённых выступлений в протоколах.</div>'}
    </section>

    ${records.length ? `
      <section class="athlete-section">
        <div class="athlete-section-title section-title">
          <span>Рекорды России</span>
          <span class="athlete-section-count">${records.length}</span>
        </div>
        <div class="athlete-records-grid">
          ${records.map(renderRecordCard).join('')}
        </div>
      </section>
    ` : ''}
  `;
}

async function openAthleteProfile(id, push = true, restoreScrollY = null) {
window.openAthleteProfile = openAthleteProfile;
  const strId = String(id).trim();
  const numId = Number(strId.replace(/^ATH-0*/i, ''));
  state.selectedAthleteId = strId;
  if (push) {
    pushRoute({ screen: 'athlete', params: { id: strId } });
    resetScrollToTop();
  }
  const container = $('#athlete-profile-detail');
  if (container) {
    container.innerHTML = '<div class="detail-loading">Загружаем официальный профиль спортсмена…</div>';
  }
  const index = await buildAthleteIndex();
  let athlete = (state.athleteMap && (state.athleteMap.get(numId) || state.athleteMap.get(strId))) || index.find(a => Number(a.id) === numId || a.athlete_id === strId);
  if (!athlete) {
    try {
      athlete = await fetchMasterAthlete(strId);
    } catch (_) {}
  }
  if (!athlete) {
    if (container) container.innerHTML = '<div class="empty">Спортсмен не найден в реестре Федерации.</div>';
    go('athlete', false, restoreScrollY);
    return;
  }
  state.selectedAthlete = athlete;
  go('athlete', false, push ? null : restoreScrollY);
  renderAthleteProfileScreen(athlete);
  const hashTarget = `#athlete/${id}`;
  if (push && location.hash !== hashTarget) {
    history.pushState({ screen: 'athlete', id: strId }, '', hashTarget);
  } else if (location.hash !== hashTarget) {
    history.replaceState({ screen: 'athlete', id: strId }, '', hashTarget);
  }
  if (push) {
    resetScrollToTop();
  } else {
    const y = (typeof restoreScrollY === 'number') ? restoreScrollY : scrollStore.get(`athlete/${id}`);
    if (typeof y === 'number') {
      restoreScrollPosition(y);
    } else {
      resetScrollToTop();
    }
  }
}

async function renderAthleteSearch() {
  const q = (state.athleteQuery || '').trim().toLowerCase();
  const resContainer = $('#athlete-search-results');
  const countEl = $('#athlete-search-count');
  if (!resContainer || !countEl) return;

  if (!q || q.length < 2) {
    countEl.textContent = '3 203 профиля спортсменов';
    resContainer.innerHTML = `
      <div class="athlete-search-guide">
        <div class="asg-card">
          <span class="asg-icon">👤</span>
          <b>Каталог карточек участников соревнований</b>
          <p>В базе собрано 3 203 спортсмена с официальными фотографиями, действующими рекордами и протоколами всех этапов.</p>
        </div>
        <div class="asg-suggestions">
          <small>Быстрый выбор популярных атлетов:</small>
          <div class="asg-chips">
            <button type="button" class="asg-chip" data-quick-athlete="Шавыкина">Шавыкина Анастасия</button>
            <button type="button" class="asg-chip" data-quick-athlete="Королевский">Королевский Алексей</button>
            <button type="button" class="asg-chip" data-quick-athlete="Петренко">Петренко Наталья</button>
            <button type="button" class="asg-chip" data-quick-athlete="Гущина">Гущина Татьяна</button>
            <button type="button" class="asg-chip" data-quick-athlete="Малюгина">Малюгина Ева</button>
            <button type="button" class="asg-chip" data-quick-athlete="Никешин">Никешин Алексей</button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  countEl.textContent = 'Поиск…';
  const index = await buildAthleteIndex();
  const hits = index.filter(x => x.name.toLowerCase().includes(q));
  countEl.textContent = `Найдено атлетов: ${hits.length}`;

  if (!hits.length) {
    resContainer.innerHTML = '<div class="empty">Спортсмен не найден в опубликованных протоколах соревнований.</div>';
    return;
  }

  resContainer.innerHTML = hits.slice(0, 50).map(x => {
    if (x.kind === 'profile') {
      const recordsCount = Number(x.records_count ?? (x.records ? x.records.length : 0));
      const compsCount = Number(x.competitions_count ?? (x.competitions ? x.competitions.length : 0));
      const podiumsCount = Number(x.podiums_count ?? 0);
      const initials = regionInitials(x.region || x.name);

      return `
        <article class="athlete-search-item" data-open-athlete-id="${x.id}">
          <div class="athlete-search-item-left">
            ${getAthleteAvatarHtml(x, 52)}
            <div class="athlete-search-item-info">
              <b>${esc(x.name)}</b>
              <small>${esc([x.region, x.gender].filter(Boolean).join(' • ') || 'Участник соревнований')}</small>
              <div class="athlete-search-item-stats">
                <span class="athlete-search-stat-pill">${compsCount} старт.</span>
                ${podiumsCount > 0 ? `<span class="athlete-search-stat-pill gold">🏆 ${podiumsCount} под.</span>` : ''}
                ${recordsCount > 0 ? `<span class="athlete-search-stat-pill gold">⭐ ${recordsCount} рек.</span>` : ''}
              </div>
            </div>
          </div>
          <span class="athlete-search-item-arrow">→</span>
        </article>
      `;
    }
    return `
      <div class="athlete-card">
        <div class="athlete-card-top">
          <b>${esc(x.name)}</b>
          ${x.rank ? `<span class="athlete-rank-pill">${esc(x.rank)} место</span>` : ''}
        </div>
        <div class="athlete-card-meta">
          <span>${esc(x.eventTitle)}</span> · <small>${esc(x.eventPeriod || '')}</small>
        </div>
        ${x.result || x.cat ? `<div class="athlete-card-sub"><span class="badge-cat">${esc(x.cat || x.section)}</span> <strong>${esc(x.result)}</strong></div>` : ''}
        <div class="athlete-card-act">
          <button class="link-action" data-event="${x.eventId}">Открыть протокол турнира →</button>
        </div>
      </div>
    `;
  }).join('') + (hits.length > 50 ? `<p class="legal">Показано 50 из ${hits.length} совпадений. Уточните запрос.</p>` : '');
}

function openTournamentDetailsModal(c, athlete) {
  if (!c) return;
  haptic(10);
  const ev = findTournamentForCompetition(c);
  const title = ev?.title || c.tournament_title || 'Соревнование ГТО';
  const period = ev?.period || c.tournament_date || '';
  const city = ev?.location || c.city || (c.is_online_platform ? 'Онлайн-платформа ФМГТО' : 'Российская Федерация');
  const eventId = ev?.id || null;
  const events = Array.isArray(c.events) ? c.events : [];
  const badgeHtml = getResultPlaceBadgeHtml(c.rank || (c.overall_place ? `${c.overall_place} место` : 'Участник'));
  const catText = [c.category, c.subgroup].filter(Boolean).join(' · ');
  const isOnline = Boolean(c.is_online_platform || c.hasOnline || ev?.hasOnline || ev?.format === 'ONLINE' || ev?.format === 'Онлайн-турнир');

  document.getElementById('tourn-detail-modal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'share-modal-overlay';
  modal.id = 'tourn-detail-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="share-modal-card" style="max-width:560px;padding:24px;background:#0f172a;border:1px solid rgba(255,255,255,0.14);border-radius:20px;color:#f8fafc;box-shadow:0 25px 50px -12px rgba(0,0,0,0.85);max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.06em">КАРТОЧКА СОРЕВНОВАНИЯ</span>
            ${isOnline ? '<span class="history-chip" style="color:#34d399;border-color:rgba(52,211,153,0.3);font-size:10px;padding:1px 6px">⚡ Онлайн-отбор</span>' : ''}
          </div>
          <h2 style="font-size:18px;font-weight:800;line-height:1.3;margin:0">${esc(title)}</h2>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
            ${period ? `<span>📅 ${esc(period)}</span>` : ''}
            ${city ? `<span>📍 ${esc(city)}</span>` : ''}
          </div>
        </div>
        <button type="button" class="share-modal-close" id="tourn-modal-close-btn" aria-label="Закрыть" style="background:rgba(255,255,255,0.08);border:none;color:#94a3b8;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- Атлет и результат -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:700;color:#f8fafc">${esc(athlete?.name || 'Атлет')}</div>
            <div style="font-size:12px;color:#94a3b8">${esc(athlete?.region || c.city || 'Россия')}</div>
          </div>
          <div>${badgeHtml}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:12px;color:#cbd5e1;margin-top:6px">
          ${catText ? `<span class="history-chip">🏷️ ${esc(catText)}</span>` : ''}
          ${c.team_name ? `<span class="history-chip" style="color:#60a5fa;border-color:rgba(96,165,250,0.3)">👥 ${esc(c.team_name)}</span>` : ''}
        </div>
        ${c.result ? `
          <div style="margin-top:10px;padding:10px 14px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#cbd5e1">Итоговый результат / сумма:</span>
            <strong style="font-size:16px;color:#38bdf8">${esc(c.result)}</strong>
          </div>
        ` : ''}
      </div>

      <!-- Разбор комплексов и этапов -->
      ${events.length ? `
        <div style="margin-bottom:18px">
          <div style="font-size:12px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
            Выступления по дисциплинам и комплексам (${events.length})
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding-right:4px">
            ${events.map((e, idx) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:12px">
                <div>
                  <span style="color:#38bdf8;font-weight:700;margin-right:4px">${idx + 1}.</span>
                  <span style="color:#f8fafc;font-weight:600">${esc(e.event_name || `Комплекс ${idx + 1}`)}</span>
                  ${e.subgroup && e.subgroup !== e.event_name ? `<br><small style="color:#94a3b8">${esc(e.subgroup)}</small>` : ''}
                </div>
                <div style="text-align:right">
                  ${e.result ? `<div style="font-weight:700;color:#38bdf8">${esc(e.result)}</div>` : ''}
                  ${e.rank ? `<small style="color:#94a3b8">${esc(e.rank)}</small>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Кнопки перехода -->
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${eventId ? `
          <button type="button" class="athlete-hero-btn primary btn" id="tourn-modal-open-results" data-event="${eventId}" style="flex:1;justify-content:center;height:42px">
            <span>Протокол турнира 📊</span>
          </button>
          <button type="button" class="athlete-hero-btn secondary btn" id="tourn-modal-open-about" data-event="${eventId}" style="flex:1;justify-content:center;height:42px">
            <span>Страница турнира ↗</span>
          </button>
        ` : (isOnline ? `
          <button type="button" class="athlete-hero-btn primary btn" id="tourn-modal-open-hero" style="flex:1;justify-content:center;height:42px">
            <span>⚡ Записать попытку в Герой ГТО</span>
          </button>
        ` : `
          <button type="button" class="athlete-hero-btn primary btn" id="tourn-modal-close-action" style="flex:1;justify-content:center;height:42px">
            <span>Понятно ✓</span>
          </button>
        `)}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.classList.add('closing');
    setTimeout(() => modal.remove(), 180);
  };

  modal.querySelector('#tourn-modal-close-btn')?.addEventListener('click', closeModal);
  modal.querySelector('#tourn-modal-close-action')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  modal.querySelector('#tourn-modal-open-results')?.addEventListener('click', () => {
    closeModal();
    if (eventId) openEvent(eventId, 'results');
  });

  modal.querySelector('#tourn-modal-open-about')?.addEventListener('click', () => {
    closeModal();
    if (eventId) openEvent(eventId, 'about');
  });

  modal.querySelector('#tourn-modal-open-hero')?.addEventListener('click', () => {
    closeModal();
    go('hero');
  });
}

// ----------------------------------------------------
// ГЕНЕРАТОР СОЦИАЛЬНЫХ КАРТОЧЕК (HTML5 CANVAS 1080×1350)
// ----------------------------------------------------
function openShareModal(data) {
  haptic(15);
  state.shareData = data;
  const modal = $('#share-modal');
  const canvas = $('#share-canvas');
  if (!modal || !canvas) return;
  const titleEl = $('#share-title');
  if (titleEl) {
    if (data.type === 'athlete') titleEl.textContent = 'Официальная карточка атлета';
    else if (data.type === 'record') titleEl.textContent = 'Карточка рекорда России';
    else titleEl.textContent = 'Карточка достижения';
  }
  state.shareTrigger = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  drawShareCanvas(canvas, data);
  requestAnimationFrame(() => $('#share-close')?.focus());
}
window.openShareModal = openShareModal;
window.renderShareCard = openShareModal;

function closeShareModal() {
  const modal = $('#share-modal');
  if (modal) modal.hidden = true;
  document.body.classList.remove('modal-open');
  const trigger = state.shareTrigger;
  state.shareTrigger = null;
  if (trigger?.isConnected) trigger.focus({ preventScroll: true });
}

function drawShareCanvas(canvas, data) {
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;

  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060E1A');
  bg.addColorStop(0.5, '#0B1E38');
  bg.addColorStop(1, '#050B14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Red accent ambient glow
  const radial = ctx.createRadialGradient(W / 2, 220, 40, W / 2, 220, 500);
  radial.addColorStop(0, 'rgba(237, 28, 36, 0.28)');
  radial.addColorStop(1, 'transparent');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, 700);

  if (data.badge === 'gold') {
    const goldGlow = ctx.createRadialGradient(W / 2, 440, 40, W / 2, 440, 320);
    goldGlow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    goldGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = goldGlow;
    ctx.fillRect(0, 200, W, 500);
  }

  // Border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ED1C24';
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('ФЕДЕРАЦИЯ МНОГОБОРЬЯ ГТО РОССИИ', W / 2, 110);

  ctx.strokeStyle = 'rgba(237, 28, 36, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 120, 135);
  ctx.lineTo(W / 2 + 120, 135);
  ctx.stroke();

  if (data.type === 'badge') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 380, 120, 0, Math.PI * 2);
    const mGrad = ctx.createLinearGradient(W / 2 - 120, 260, W / 2 + 120, 500);
    if (data.badge === 'gold') {
      mGrad.addColorStop(0, '#FFDF00');
      mGrad.addColorStop(0.5, '#F59E0B');
      mGrad.addColorStop(1, '#B45309');
    } else if (data.badge === 'silver') {
      mGrad.addColorStop(0, '#FFFFFF');
      mGrad.addColorStop(0.5, '#CBD5E1');
      mGrad.addColorStop(1, '#64748B');
    } else {
      mGrad.addColorStop(0, '#FDBA74');
      mGrad.addColorStop(0.5, '#D97706');
      mGrad.addColorStop(1, '#78350F');
    }
    ctx.fillStyle = mGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#07111F';
    ctx.font = '900 80px sans-serif';
    ctx.fillText('★', W / 2, 408);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const bTitle = data.badge === 'gold' ? 'ЗОЛОТОЙ ЗНАК ГТО' : data.badge === 'silver' ? 'СЕРЕБРЯНЫЙ ЗНАК ГТО' : 'БРОНЗОВЫЙ ЗНАК ГТО';
    ctx.fillText(bTitle, W / 2, 590);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`${data.stage} · ${data.ageRange}`, W / 2, 650);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(100, 720, W - 200, 360);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(100, 720, W - 200, 360);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 28px sans-serif';
    ctx.fillText('ВЫПОЛНЕННЫЕ НОРМАТИВЫ', W / 2, 780);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '800 64px sans-serif';
    ctx.fillText(`${data.filled} из ${data.total}`, W / 2, 870);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 26px sans-serif';
    ctx.fillText('тестов с результатами высшей пробы', W / 2, 920);

    ctx.fillStyle = '#10B981';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('✓ Приказ Минспорта РФ № 114 · Налоговый вычет по НДФЛ', W / 2, 1010);

  } else if (data.type === 'record') {
    ctx.fillStyle = '#ED1C24';
    ctx.font = '800 42px sans-serif';
    ctx.fillText('ОФИЦИАЛЬНЫЙ РЕКОРД РОССИИ', W / 2, 320);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 64px sans-serif';
    ctx.fillText(data.holder || 'Рекордсмен', W / 2, 420);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(`${data.discipline} · ${data.sex === 'W' ? 'Женщины' : 'Мужчины'}`, W / 2, 480);

    ctx.fillStyle = 'rgba(237, 28, 36, 0.15)';
    ctx.fillRect(100, 560, W - 200, 300);
    ctx.strokeStyle = '#ED1C24';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, 560, W - 200, 300);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText('ФИКСИРОВАННЫЙ РЕЗУЛЬТАТ', W / 2, 630);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 84px sans-serif';
    ctx.fillText(data.result || '—', W / 2, 740);

    if (data.city || data.age) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 30px sans-serif';
      ctx.fillText(`${data.city ? data.city + ' · ' : ''}${data.age || ''}`, W / 2, 810);
    }

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 26px sans-serif';
    ctx.fillText('Внесено в реестр рекордов Федерации многоборья ГТО России', W / 2, 940);

  } else if (data.type === 'athlete') {
    ctx.fillStyle = '#38BDF8';
    ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ОФИЦИАЛЬНАЯ КАРТОЧКА СПОРТСМЕНА', W / 2, 300);

    // ID pill
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(W / 2 - 140, 330, 280, 46);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - 140, 330, 280, 46);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 24px monospace';
    ctx.fillText(data.id || 'ATH-0000000', W / 2, 362);

    // Athlete Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 62px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(data.name || 'Атлет ГТО', W / 2, 450);

    // Region
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 30px sans-serif';
    ctx.fillText(data.region || 'Российская Федерация', W / 2, 510);

    // 3 Metrics cards
    const cardY = 570;
    const cardW = 260;
    const cardH = 170;
    const gap = 30;
    const startX = (W - (cardW * 3 + gap * 2)) / 2;

    const metrics = [
      { label: 'СТАРТЫ', val: data.starts ?? 0, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)' },
      { label: 'ПОДИУМЫ', val: data.podiums ?? 0, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
      { label: 'РЕКОРДЫ', val: data.records ?? 0, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' }
    ];

    metrics.forEach((m, idx) => {
      const cx = startX + idx * (cardW + gap);
      ctx.fillStyle = m.bg;
      ctx.fillRect(cx, cardY, cardW, cardH);
      ctx.strokeStyle = m.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cardY, cardW, cardH);

      ctx.fillStyle = m.color;
      ctx.font = '900 64px sans-serif';
      ctx.fillText(String(m.val), cx + cardW / 2, cardY + 90);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(m.label, cx + cardW / 2, cardY + 138);
    });

    // Tournaments history card
    const histY = 780;
    const histH = 260;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(100, histY, W - 200, histH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, histY, W - 200, histH);

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('ИСТОРИЯ ВЫСТУПЛЕНИЙ В ТУРНИРАХ ФМГТО', W / 2, histY + 45);

    const eventsList = Array.isArray(data.topEvents) && data.topEvents.length
      ? data.topEvents
      : ['Кубок Дальнего Востока Игры ГТО', 'Чемпионат России по многоборью ГТО'];

    eventsList.slice(0, 3).forEach((evTitle, i) => {
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 24px sans-serif';
      const cleanTitle = typeof evTitle === 'string' ? evTitle : (evTitle.title || '');
      const truncated = cleanTitle.length > 45 ? cleanTitle.slice(0, 42) + '...' : cleanTitle;
      ctx.fillText(`• ${truncated}`, W / 2, histY + 105 + i * 45);
    });

    ctx.fillStyle = '#10B981';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('✓ Внесено в Единый реестр спортсменов ФМГТО', W / 2, 1100);
  }

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('gto.com.ru · Официальный портал соревнований', W / 2, 1220);
  ctx.fillText('Мобильное приложение Федерации многоборья ГТО России', W / 2, 1260);
}

async function doShareCard() {
  const canvas = $('#share-canvas');
  if (!canvas) return;
  haptic(20);
  canvas.toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], 'gto-achievement.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Моё достижение в ГТО',
          text: 'Федерация многоборья ГТО России (gto.com.ru)'
        });
        return;
      } catch (_) {}
    }
    downloadCard();
  }, 'image/png');
}

function downloadCard() {
  const canvas = $('#share-canvas');
  if (!canvas) return;
  haptic(15);
  const a = document.createElement('a');
  a.download = 'gto-achievement.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ----------------------------------------------------
// ----------------------------------------------------
// ОБРАБОТЧИКИ СОБЫТИЙ И ИНИЦИАЛИЗАЦИЯ
// ----------------------------------------------------
function closeDesktopDropdown() {
  const dd = $('#desktop-tools-dropdown');
  if (dd && dd.classList.contains('open')) {
    dd.classList.remove('open');
    const btn = $('#tools-dropdown-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
}

function toggleDesktopDropdown() {
  const dd = $('#desktop-tools-dropdown');
  const btn = $('#tools-dropdown-btn');
  if (!dd || !btn) return;
  const isOpen = dd.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeMobileDrawer();
    const dd = $('#desktop-tools-dropdown');
    if (dd && dd.classList.contains('open')) {
      closeDesktopDropdown();
      const btn = $('#tools-dropdown-btn');
      if (btn) btn.focus();
    }
  }

  const toolsBtn = e.target.closest('#tools-dropdown-btn');
  if (toolsBtn) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const dd = $('#desktop-tools-dropdown');
      if (dd) {
        dd.classList.add('open');
        toolsBtn.setAttribute('aria-expanded', 'true');
        const firstItem = $('#tools-dropdown-menu [role="menuitem"], #tools-dropdown-menu [data-go]');
        if (firstItem) firstItem.focus();
      }
    }
  }

  const inDropdownMenu = e.target.closest('#tools-dropdown-menu');
  if (inDropdownMenu) {
    const items = Array.from($$('#tools-dropdown-menu [role="menuitem"], #tools-dropdown-menu [data-go]'));
    const currentIndex = items.indexOf(e.target);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }
});

document.addEventListener('click', e => {
  const toolsToggle = e.target.closest('#tools-dropdown-btn, .desktop-nav-dropdown-toggle');
  if (toolsToggle) {
    e.preventDefault();
    toggleDesktopDropdown();
    return;
  }

  if (!e.target.closest('#desktop-tools-dropdown')) {
    closeDesktopDropdown();
  }

  const toggleBtn = e.target.closest('#mobile-menu-toggle');
  if (toggleBtn) {
    e.preventDefault();
    haptic(10);
    const drawer = $('#mobile-nav-drawer');
    if (drawer && drawer.classList.contains('is-open')) {
      closeMobileDrawer();
    } else {
      openMobileDrawer();
    }
    return;
  }

  const closeBtn = e.target.closest('#mobile-menu-close, #mobile-nav-backdrop');
  if (closeBtn) {
    e.preventDefault();
    haptic(10);
    closeMobileDrawer();
    return;
  }

  const drawerLink = e.target.closest('#mobile-nav-drawer a');
  if (drawerLink) {
    closeMobileDrawer();
  }

  const backBtn = e.target.closest('.detail-back, #header-back-btn, #athlete-detail-back, #athlete-search-back, #record-detail-back');
  if (backBtn) {
    e.preventDefault();
    closeMobileDrawer();
    closeDesktopDropdown();
    navigateBack();
    return;
  }

  const g = e.target.closest('[data-go]');
  if (g) {
    e.preventDefault();
    closeMobileDrawer();
    closeDesktopDropdown();
    const target = g.dataset.go;
    const heroTab = g.dataset.heroTab;
    if (target === 'hero' && heroTab && typeof window.setActiveHeroTab === 'function') {
      window.setActiveHeroTab(heroTab);
    }
    go(target);
    return;
  }

  const est = e.target.closest('[data-event-status]');
  if (est) {
    state.eventStatus = est.dataset.eventStatus;
    $$('#event-status button').forEach(x => x.classList.toggle('active', x === est));
    haptic(10);
    renderEvents();
    return;
  }

  const y = e.target.closest('[data-event-year]');
  if (y) {
    state.eventYear = y.dataset.eventYear;
    $$('[data-event-year]').forEach(x => x.classList.toggle('active', x === y));
    haptic(10);
    renderEvents();
    return;
  }

  const ml = e.target.closest('[data-media-link]');
  if (ml) {
    state.mediaLinkFilter = ml.dataset.mediaLink;
    $$('#media-link-filter button').forEach(x => x.classList.toggle('active', x === ml));
    haptic(10);
    renderMedia();
    return;
  }

  const eChip = e.target.closest('[data-event-chip]');
  if (eChip) {
    const k = eChip.dataset.eventChip;
    if (k === 'year') { state.eventYear = 'all'; const el = $('#event-year'); if (el) el.value = 'all'; }
    else if (k === 'status') { state.eventStatus = 'all'; $$('#event-status button').forEach(b => b.classList.toggle('active', b.dataset.eventStatus === 'all')); }
    else if (k === 'city') { state.eventCity = 'all'; const el = $('#event-city'); if (el) el.value = 'all'; }
    else if (k === 'format') { state.eventFormat = 'all'; const el = $('#event-format'); if (el) el.value = 'all'; }
    else if (k === 'program') { state.eventProgram = 'all'; const el = $('#event-program'); if (el) el.value = 'all'; }
    else if (k === 'type') { state.eventType = 'all'; const el = $('#event-type'); if (el) el.value = 'all'; }
    else if (k === 'query') { state.eventQuery = ''; const el = $('#event-search'); if (el) el.value = ''; }
    haptic(10);
    renderEvents();
    return;
  }

  const evReset = e.target.closest('#events-empty-reset, #events-reset-filters');
  if (evReset) {
    haptic(10);
    resetEventsFilters();
    return;
  }

  const nChip = e.target.closest('[data-news-chip]');
  if (nChip) {
    const k = nChip.dataset.newsChip;
    if (k === 'year') { state.newsYear = 'all'; const el = $('#news-year-filter'); if (el) el.value = 'all'; }
    else if (k === 'type') { state.newsType = 'all'; const el = $('#news-type-filter'); if (el) el.value = 'all'; }
    else if (k === 'event') { state.newsEvent = 'all'; const el = $('#news-event-filter'); if (el) el.value = 'all'; }
    else if (k === 'query') { state.newsQuery = ''; const el = $('#news-search'); if (el) el.value = ''; }
    haptic(10);
    renderNews();
    return;
  }

  const nwReset = e.target.closest('#news-empty-reset');
  if (nwReset) {
    haptic(10);
    resetNewsFilters();
    return;
  }

  const icsBtn = e.target.closest('[data-event-ics]');
  if (icsBtn) {
    const evId = icsBtn.dataset.eventIcs;
    const ev = GTO_CALENDAR_EVENTS.find(x => String(x.id) === String(evId)) || { id: evId, title: 'Соревнование ГТО' };
    exportToIcal(ev);
    return;
  }

  const openAthlete = e.target.closest('[data-open-athlete-id]');
  if (openAthlete) {
    state.athleteProfileReturnScreen = state.screen;
    openAthleteProfile(openAthlete.dataset.openAthleteId);
    return;
  }

  const copyAthleteUrl = e.target.closest('[data-copy-athlete-url]');
  if (copyAthleteUrl) {
    const url = `${location.origin}${location.pathname}#athlete/${copyAthleteUrl.dataset.copyAthleteUrl}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        haptic(20);
        const span = copyAthleteUrl.querySelector('span');
        if (span) {
          const prev = span.textContent;
          span.textContent = '✓ Скопировано';
          setTimeout(() => { span.textContent = prev; }, 2000);
        }
      });
    }
    return;
  }

  const heroCabBtn = e.target.closest('[data-open-hero-cabinet]');
  if (heroCabBtn) {
    const athName = heroCabBtn.dataset.openHeroCabinet;
    if (athName) {
      try {
        const HERO_STORE = 'hero_profiles_v1';
        let d = JSON.parse(localStorage.getItem(HERO_STORE)) || { profiles: [], active: 0 };
        if (!Array.isArray(d.profiles)) d.profiles = [];
        let idx = d.profiles.findIndex(p => (p.name || '').trim().toLowerCase() === athName.trim().toLowerCase());
        if (idx < 0) {
          d.profiles.push({
            name: athName,
            athlete_id: state.selectedAthlete?.athlete_id || null,
            region: state.selectedAthlete?.region || '',
            gender: state.selectedAthlete?.gender || '',
            starts_count: state.selectedAthlete?.competitions_count || 0,
            podiums_count: state.selectedAthlete?.podiums_count || 0,
            wins_count: state.selectedAthlete?.wins_count || 0,
            records_count: state.selectedAthlete?.records_count || 0,
            competitions: state.selectedAthlete?.competitions || []
          });
          idx = d.profiles.length - 1;
        } else if (state.selectedAthlete) {
          const p = d.profiles[idx];
          p.athlete_id = state.selectedAthlete.athlete_id || p.athlete_id;
          if (state.selectedAthlete.region) p.region = state.selectedAthlete.region;
          p.starts_count = state.selectedAthlete.competitions_count ?? p.starts_count;
          p.competitions = state.selectedAthlete.competitions || p.competitions;
        }
        d.active = idx;
        localStorage.setItem(HERO_STORE, JSON.stringify(d));
      } catch (_) {}
      go('hero');
    }
    return;
  }

  // 1. Athlete button inside record card or record detail
  const recAthleteBtn = e.target.closest('[data-record-athlete], .rrc-athlete-btn');
  if (recAthleteBtn) {
    e.preventDefault();
    e.stopPropagation();
    haptic(10);
    const aId = recAthleteBtn.dataset.athleteId;
    const aName = recAthleteBtn.dataset.recordAthlete || recAthleteBtn.dataset.athleteQuery;
    if (aId) {
      state.athleteProfileReturnScreen = 'record';
      openAthleteProfile(aId, true);
    } else if (aName) {
      buildAthleteIndex().then(() => {
        const match = findAthleteByName(aName);
        if (match) {
          state.athleteProfileReturnScreen = 'record';
          openAthleteProfile(match.id, true);
        } else {
          state.athleteQuery = aName;
          go('athlete-search');
          const input = $('#global-athlete-search');
          if (input) input.value = state.athleteQuery;
          renderAthleteSearch();
        }
      });
    }
    return;
  }

  // 2. Tournament button inside record card or record detail
  const recEventBtn = e.target.closest('[data-record-event], .rrc-event-btn');
  if (recEventBtn) {
    e.preventDefault();
    e.stopPropagation();
    haptic(10);
    const evId = recEventBtn.dataset.eventId;
    const evTitle = recEventBtn.dataset.recordEvent;
    if (evId) {
      openEvent(evId, 'about', true);
    } else if (evTitle) {
      const match = findEventByTitleOrRecord(evTitle);
      if (match) {
        openEvent(match.id, 'about', true);
      } else {
        state.eventQuery = evTitle;
        go('events');
        const input = $('#event-search');
        if (input) input.value = evTitle;
        renderEvents();
      }
    }
    return;
  }

  // 3. Whole record card tap
  const recCard = e.target.closest('[data-record-id], .unified-record-card');
  if (recCard && recCard.dataset.recordId) {
    e.preventDefault();
    haptic(10);
    openRecordDetail(recCard.dataset.recordId, true);
    return;
  }

  // 4. Open region from record detail or tournament results
  const openRegBtn = e.target.closest('[data-open-region]');
  if (openRegBtn) {
    e.preventDefault();
    haptic(10);
    if (state.screen === 'event') {
      state.regionReturnScreen = 'event';
    } else if (state.screen !== 'region') {
      state.regionReturnScreen = state.screen;
    }
    openRegion(openRegBtn.dataset.openRegion, true);
    return;
  }

  const athleteQuery = e.target.closest('[data-athlete-query]');
  if (athleteQuery) {
    const qName = athleteQuery.dataset.athleteQuery;
    state.athleteQuery = qName;
    if (state.screen === 'event') {
      state.athleteReturnScreen = 'event';
      state.athleteReturnEventId = state.currentEventId;
      const activeTab = $('.detail-tabs button.active');
      state.athleteReturnPane = activeTab ? activeTab.dataset.pane : 'results';
      state.athleteProfileReturnScreen = 'event';
    } else if (state.screen !== 'athlete-search' && state.screen !== 'athlete') {
      state.athleteReturnScreen = state.screen;
      state.athleteReturnEventId = null;
      state.athleteProfileReturnScreen = state.screen;
    }
    buildAthleteIndex().then(index => {
      const match = findAthleteByName(qName);
      if (match) {
        openAthleteProfile(match.id);
      } else {
        go('athlete-search');
        const input = $('#global-athlete-search');
        if (input) input.value = state.athleteQuery;
        const backBtn = $('#athlete-search-back');
        if (backBtn) {
          if (state.athleteReturnScreen === 'event' && state.athleteReturnEventId) {
            backBtn.textContent = '← Назад к турниру';
            backBtn.dataset.returnEvent = String(state.athleteReturnEventId);
            backBtn.dataset.returnPane = state.athleteReturnPane || 'results';
          } else {
            backBtn.textContent = '← Старты';
            delete backBtn.dataset.returnEvent;
            delete backBtn.dataset.returnPane;
          }
        }
        renderAthleteSearch();
      }
    });
    return;
  }

  // Карточка старта в профиле атлета
  const tournCardBtn = e.target.closest('[data-open-tourn-modal]');
  if (tournCardBtn) {
    e.preventDefault();
    const idx = parseInt(tournCardBtn.dataset.openTournModal, 10);
    const listType = tournCardBtn.dataset.tournList || 'past';
    const athlete = state.selectedAthlete;
    const comps = athlete ? (listType === 'upcoming' ? athlete._upcomingCompetitions : athlete._pastCompetitions) : null;
    if (comps && comps[idx]) {
      openTournamentDetailsModal(comps[idx], athlete);
    }
    return;
  }

  const tournCard = e.target.closest('[data-tourn-card-idx]');
  if (tournCard && !e.target.closest('button, a, summary, [data-event]')) {
    e.preventDefault();
    const idx = parseInt(tournCard.dataset.tournCardIdx, 10);
    const listType = tournCard.dataset.tournList || 'past';
    const athlete = state.selectedAthlete;
    const comps = athlete ? (listType === 'upcoming' ? athlete._upcomingCompetitions : athlete._pastCompetitions) : null;
    if (comps && comps[idx]) {
      openTournamentDetailsModal(comps[idx], athlete);
    }
    return;
  }

  // Переход в Герой ГТО из онлайн-турнира
  const heroTournBtn = e.target.closest('[data-go-herogto-tourn]');
  if (heroTournBtn) {
    e.preventDefault();
    const tournId = heroTournBtn.dataset.goHerogtoTourn;
    const base = GTO_CALENDAR_EVENTS.find(x => String(x.id) === String(tournId));
    setHeroActiveTournament(tournId, base?.title || 'Онлайн-турнир ГТО', base?.wodExercises || []);
    go('herohub');
    return;
  }

  // Пагинация списков: Показать ещё
  const eventsMoreBtn = e.target.closest('#events-load-more');
  if (eventsMoreBtn) {
    state.eventsDisplayLimit = (state.eventsDisplayLimit || 20) + 20;
    renderEvents();
    return;
  }
  const newsMoreBtn = e.target.closest('#news-load-more');
  if (newsMoreBtn) {
    state.newsDisplayLimit = (state.newsDisplayLimit || 20) + 20;
    renderNews();
    return;
  }
  const resultsMoreBtn = e.target.closest('#results-load-more');
  if (resultsMoreBtn) {
    state.resultsDisplayLimit = (state.resultsDisplayLimit || 20) + 20;
    renderResultsScreen();
    return;
  }

  // Переход в раздел Результаты
  const allResultsBtn = e.target.closest('[data-event-all-results]');
  if (allResultsBtn) {
    e.preventDefault();
    go('results');
    return;
  }

  const event = e.target.closest('[data-event]');
  if (event) { openEvent(event.dataset.event, event.dataset.eventPane || 'about'); return; }

  const article = e.target.closest('[data-article]');
  if (article) { openArticle(article.dataset.article); return; }

  const pane = e.target.closest('[data-pane]');
  if (pane) {
    let targetPane = pane.dataset.pane;
    if (targetPane === 'event-media') targetPane = 'event-photos';
    const activeTab = $(`.detail-tabs [data-pane="${targetPane}"]`);
    if (activeTab) {
      $$('.detail-tabs button').forEach(x => x.classList.toggle('active', x === activeTab));
      $$('.detail-pane').forEach(x => x.classList.toggle('active', x.dataset.paneContent === targetPane));
      if (!pane.closest('.detail-tabs')) {
        const tabsEl = $('.detail-tabs');
        if (tabsEl) tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (state.lastEventId) {
        state.lastEventPane = targetPane;
        if (appNavigationStack.length && appNavigationStack[appNavigationStack.length - 1].screen === 'event') {
          appNavigationStack[appNavigationStack.length - 1].params = appNavigationStack[appNavigationStack.length - 1].params || {};
          appNavigationStack[appNavigationStack.length - 1].params.pane = targetPane;
        }
        const hashTarget = `#event/${state.lastEventId}` + (targetPane !== 'about' ? `/${targetPane}` : '');
        history.replaceState({ screen: 'event', id: state.lastEventId, pane: targetPane }, '', hashTarget);
      }
    }
    haptic(10);
    return;
  }

  const resultSexFilter = e.target.closest('[data-result-sex]');
  if (resultSexFilter) {
    state.eventResultSex = resultSexFilter.dataset.resultSex;
    $$('[data-result-sex]').forEach(x => x.classList.toggle('active', x === resultSexFilter));
    renderEventResults();
    return;
  }

  const resultStandingFilter = e.target.closest('[data-result-standing]');
  if (resultStandingFilter) {
    state.eventResultStanding = resultStandingFilter.dataset.resultStanding;
    $$('[data-result-standing]').forEach(x => x.classList.toggle('active', x === resultStandingFilter));
    renderEventResults();
    return;
  }

  const resultExport = e.target.closest('[data-results-export]');
  if (resultExport) {
    resultExport.dataset.resultsExport === 'csv' ? exportEventResultsCsv() : printEventResults();
    return;
  }

  const loadMoreRecords = e.target.closest('#records-load-more');
  if (loadMoreRecords) {
    e.preventDefault();
    haptic(10);
    state.recordLimit = (state.recordLimit || 30) + 30;
    renderRecords();
    return;
  }

  const sex = e.target.closest('[data-sex]');
  if (sex) {
    state.recordLimit = 30;
    state.sex = sex.dataset.sex;
    $$('#record-chips button').forEach(x => x.classList.toggle('active', x === sex));
    haptic(10);
    renderRecords();
    return;
  }

  const media = e.target.closest('[data-media]');
  if (media) {
    state.media = media.dataset.media;
    $$('#media-tabs button').forEach(x => x.classList.toggle('active', x.dataset.media === state.media));
    haptic(10);
    renderMedia();
    return;
  }

  const video = e.target.closest('[data-video]');
  if (video) {
    const videoUrl = video.dataset.video;
    state.activeMediaVideo = videoUrl;
    haptic(10);
    const mediaSlot = $('#media-video-player-slot');
    if (state.screen === 'media' && mediaSlot) {
      mediaSlot.innerHTML = `<iframe id="video-player" class="video-feature" src="${safeUrl(videoUrl)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Видео"></iframe>`;
      $$('.media-card').forEach(card => card.classList.toggle('playing', card.dataset.video === videoUrl));
      mediaSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const slot = $('#event-video-player-slot');
    if (slot) {
      slot.innerHTML = `<iframe class="video-feature" src="${safeUrl(videoUrl)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Видео соревнования"></iframe>`;
      $$('.event-videos-pane .media-card, .event-media-pane .media-card').forEach(card => card.classList.toggle('playing', card.dataset.video === videoUrl));
      slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  const album = e.target.closest('[data-album]');
  if (album) { openAlbum(album.dataset.album); return; }

  const eventMediaBack = e.target.closest('[data-event-photos-back], [data-event-media-back]');
  if (eventMediaBack) {
    const target = $('[data-pane-content="event-photos"]') || $('[data-pane-content="event-media"]');
    if (target && (state.currentEventPhotosHtml || state.currentEventMediaHtml)) {
      target.innerHTML = state.currentEventPhotosHtml || state.currentEventMediaHtml;
    }
    return;
  }

  const resultGroup = e.target.closest('[data-result-group]');
  if (resultGroup) {
    state.eventResultGroupBy = resultGroup.dataset.resultGroup;
    $$('[data-result-group]').forEach(x => x.classList.toggle('active', x === resultGroup));
    haptic(10);
    renderEventResults();
    return;
  }

  const resultsMore = e.target.closest('[data-results-more]');
  if (resultsMore) {
    state.eventResultLimit = (state.eventResultLimit || 120) + 120;
    renderEventResults();
    return;
  }

  const my = e.target.closest('[data-media-year]');
  if (my) {
    state.mediaYear = my.dataset.mediaYear;
    haptic(10);
    renderMedia();
    return;
  }

  const mr = e.target.closest('[data-media-reset]');
  if (mr) {
    state.mediaYear = 'all';
    state.videoPlatform = 'all';
    state.mediaQuery = '';
    haptic(10);
    renderMedia();
    return;
  }

  const vplat = e.target.closest('[data-vplat]');
  if (vplat) {
    state.videoPlatform = vplat.dataset.vplat;
    haptic(10);
    renderVideoTab();
    return;
  }

  const albumMore = e.target.closest('[data-album-more]');
  if (albumMore) { openAlbum(albumMore.dataset.albumMore, Number(albumMore.dataset.limit)); return; }

  const cAlt = e.target.closest('[data-alt-group]');
  if (cAlt) {
    e.preventDefault();
    const grp = cAlt.dataset.altGroup;
    const tid = cAlt.dataset.testId;
    state.calcSelectedAlt = state.calcSelectedAlt || {};
    state.calcSelectedAlt[grp] = tid;
    haptic(10);
    renderCalculator();
    return;
  }

  const rulesToggle = e.target.closest('#calc-rules-toggle-btn');
  if (rulesToggle) {
    e.preventDefault();
    state.calcGuideOpen = !state.calcGuideOpen;
    rulesToggle.classList.toggle('open', state.calcGuideOpen);
    const dd = $('#calc-rules-dropdown');
    if (dd) dd.hidden = !state.calcGuideOpen;
    haptic(8);
    return;
  }

  const cSex = e.target.closest('[data-calc-sex]');
  if (cSex) {
    e.preventDefault();
    state.calcSex = cSex.dataset.calcSex;
    state.calcSelectedAlt = state.calcSelectedAlt || {};
    if (state.calcSex === 'W' && state.calcSelectedAlt.strength === 'pull_up') {
      state.calcSelectedAlt.strength = 'push_up';
    } else if (state.calcSex === 'M' && state.calcSelectedAlt.strength === 'pull_up_low') {
      state.calcSelectedAlt.strength = 'pull_up';
    }
    haptic(10);
    renderCalculator();
    return;
  }

  const cMode = e.target.closest('[data-calc-mode]');
  if (cMode) {
    e.preventDefault();
    state.calcMode = cMode.dataset.calcMode;
    haptic(10);
    renderCalculator();
    return;
  }

  const cOvz = e.target.closest('[data-calc-ovz]');
  if (cOvz) {
    e.preventDefault();
    state.calcOvzCategory = cOvz.dataset.calcOvz;
    haptic(10);
    renderCalculator();
    return;
  }

  const pGold = e.target.closest('#calc-preset-gold');
  if (pGold) {
    e.preventDefault();
    applyCalculatorPreset('gold');
    haptic(15);
    return;
  }

  const pSilver = e.target.closest('#calc-preset-silver');
  if (pSilver) {
    e.preventDefault();
    applyCalculatorPreset('silver');
    haptic(15);
    return;
  }

  const calcShare = e.target.closest('.calc-share-btn');
  if (calcShare) {
    e.preventDefault();
    haptic(15);
    const url = `${location.origin}${location.pathname}#calculator`;
    let title = 'Мои результаты ГТО';
    let text = 'Проверьте свои нормативы ГТО в онлайн-калькуляторе!';
    try {
      const data = JSON.parse(calcShare.dataset.shareData || '{}');
      if (data.badge && data.badge !== 'none') {
        const badgeName = data.badge === 'gold' ? 'Золотой знак отличия ГТО' : data.badge === 'silver' ? 'Серебряный знак отличия ГТО' : 'Бронзовый знак отличия ГТО';
        text = `Я выполнил нормативы на ${badgeName} (${data.stage}, ${data.sex}, ${data.age} лет)!`;
      }
    } catch (err) {}

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
        showToast('✓ Результат скопирован в буфер обмена!');
      }).catch(() => {
        showToast('✓ Ссылка скопирована: ' + url);
      });
    } else {
      showToast('✓ Ссылка: ' + url);
    }
    return;
  }

  const pReset = e.target.closest('#calc-preset-reset');
  if (pReset) {
    e.preventDefault();
    state.calcValues = {};
    try { localStorage.removeItem('gto_calc_v1'); } catch (e) {}
    haptic(10);
    renderCalculator();
    showToast('✓ Результаты калькулятора сброшены');
    return;
  }

  const ageMinus = e.target.closest('#calc-age-minus');
  if (ageMinus) {
    e.preventDefault();
    if (state.calcAge > 6) {
      state.calcAge--;
      haptic(10);
      renderCalculator();
    }
    return;
  }

  const agePlus = e.target.closest('#calc-age-plus');
  if (agePlus) {
    e.preventDefault();
    if (state.calcAge < 79) {
      state.calcAge++;
      haptic(10);
      renderCalculator();
    }
    return;
  }

  const setNormBtn = e.target.closest('[data-set-test-val]');
  if (setNormBtn) {
    e.preventDefault();
    const testId = setNormBtn.dataset.testId;
    const targetVal = setNormBtn.dataset.setTestVal;
    haptic(12);
    updateCalculatorValue(testId, targetVal, 'all');
    return;
  }

  const faqCat = e.target.closest('[data-faq-cat]');
  if (faqCat) {
    state.faqCategory = faqCat.dataset.faqCat;
    haptic(10);
    renderFaq();
    return;
  }

  const faqTgl = e.target.closest('[data-faq-toggle]');
  if (faqTgl) {
    const id = faqTgl.dataset.faqToggle;
    if (state.faqExpanded.has(id)) {
      state.faqExpanded.delete(id);
    } else {
      state.faqExpanded.add(id);
    }
    haptic(10);
    renderFaq();
    return;
  }

  const sData = e.target.closest('[data-share-data]');
  if (sData) {
    try {
      const parsed = JSON.parse(sData.dataset.shareData);
      openShareModal(parsed);
    } catch (_) {}
    return;
  }

  // District filter clicks
  const dist = e.target.closest('[data-district]');
  if (dist) {
    state.districtQuery = dist.dataset.district;
    $$('#region-district-chips button').forEach(x => x.classList.toggle('active', x === dist));
    haptic(10);
    renderRegions();
    return;
  }

  // Standards category clicks
  const stdCat = e.target.closest('[data-std-cat]');
  if (stdCat) {
    state.standardCat = stdCat.dataset.stdCat;
    $$('#standards-chips button').forEach(x => x.classList.toggle('active', x === stdCat));
    haptic(10);
    renderStandards();
    return;
  }

  // Timer subnav (Таймер / Камера)
  const subnavBtn = e.target.closest('[data-timer-subnav]');
  if (subnavBtn) {
    haptic(10);
    const tab = subnavBtn.dataset.timerSubnav;
    if (timerActiveTab !== tab) {
      if (timerActiveTab === 'camera' && tab === 'timer') {
        requestExitCamera();
        return;
      }
      timerActiveTab = tab;
      renderTimer();
    }
    return;
  }

  // Camera exit button (✕ в видоискателе)
  if (e.target.closest('#camera-exit-btn')) {
    haptic(10);
    requestExitCamera();
    return;
  }

  // Camera preview close button (✕ на карточке превью)
  if (e.target.closest('#camera-preview-close-btn')) {
    haptic(10);
    requestExitCamera();
    return;
  }

  // Camera exit confirm dialog buttons
  if (e.target.closest('#camera-confirm-keep-btn')) {
    haptic(10);
    const action = exitConfirmKeepAction;
    closeExitConfirmDialog();
    if (typeof action === 'function') {
      action();
    }
    return;
  }

  if (e.target.closest('#camera-confirm-discard-btn')) {
    haptic(10);
    const action = exitConfirmDiscardAction;
    const discardBtn = $('#camera-confirm-discard-btn');
    const keepBtn = $('#camera-confirm-keep-btn');
    if (discardBtn) {
      discardBtn.disabled = true;
      discardBtn.textContent = 'Закрываем камеру…';
    }
    if (keepBtn) keepBtn.disabled = true;
    if (typeof action === 'function') {
      action();
    } else {
      destroyCameraSession({ discard: true, returnTo: 'training' });
    }
    return;
  }

  // Camera timer settings drawer open
  if (e.target.closest('#camera-open-drawer-btn')) {
    haptic(10);
    const drawer = $('#camera-timer-drawer');
    const rec = getCameraRecorder();
    if (drawer && rec) {
      const dAth = $('#camera-drawer-athlete-input');
      const dWork = $('#camera-drawer-workout-input');
      if (dAth) dAth.value = rec.athleteName || '';
      if (dWork) dWork.value = rec.workoutTitle || '';
      refreshCameraConfigCard();
      drawer.style.display = 'flex';
    }
    return;
  }

  // Camera timer settings drawer close (✕ button - returns to camera without resetting)
  if (e.target.closest('#camera-close-drawer-btn')) {
    haptic(10);
    const drawer = $('#camera-timer-drawer');
    const rec = getCameraRecorder();
    if (drawer) {
      if (rec) {
        const dAth = $('#camera-drawer-athlete-input')?.value;
        const dWork = $('#camera-drawer-workout-input')?.value;
        if (dAth != null || dWork != null) {
          rec.setMetadata(dAth || rec.athleteName, dWork || rec.workoutTitle);
        }
      }
      drawer.style.display = 'none';
    }
    return;
  }

  // Camera timer settings drawer save & done
  if (e.target.closest('#camera-save-drawer-btn') || e.target.id === 'camera-timer-drawer') {
    haptic(10);
    const drawer = $('#camera-timer-drawer');
    const rec = getCameraRecorder();
    if (drawer && rec) {
      const dAth = $('#camera-drawer-athlete-input')?.value;
      const dWork = $('#camera-drawer-workout-input')?.value;
      rec.setMetadata(dAth != null ? dAth : rec.athleteName, dWork != null ? dWork : rec.workoutTitle);
      drawer.style.display = 'none';
      showToast('✓ Настройки таймера сохранены');
    }
    return;
  }

  // Camera flip button
  if (e.target.closest('#camera-flip-btn')) {
    haptic(10);
    const rec = getCameraRecorder();
    rec.toggleCamera().catch(err => console.warn('Toggle camera error:', err));
    return;
  }

  // Camera fullscreen toggle
  if (e.target.closest('#camera-fs-btn')) {
    haptic(10);
    const card = $('.camera-viewfinder-card');
    if (card) {
      if (!document.fullscreenElement && !card.classList.contains('is-fullscreen')) {
        if (card.requestFullscreen) {
          card.requestFullscreen().catch(() => {
            card.classList.toggle('is-fullscreen');
          });
        } else {
          card.classList.toggle('is-fullscreen');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        card.classList.remove('is-fullscreen');
      }
    }
    return;
  }

  // Camera enable button
  if (e.target.closest('#camera-enable-btn')) {
    haptic(10);
    const rec = getCameraRecorder();
    rec.startCamera(rec.facingMode).catch(err => {
      console.warn('Camera start error:', err);
    });
    return;
  }

  // Camera sound toggle
  if (e.target.closest('#camera-sound-toggle')) {
    const chk = e.target.closest('#camera-sound-toggle');
    const rec = getCameraRecorder();
    rec.setTimerConfig({ soundEnabled: chk.checked });
    if (chk.checked) {
      rec.playBeep('start');
    }
    return;
  }

  // Camera timer mode selection
  const camModeBtn = e.target.closest('[data-cam-mode]');
  if (camModeBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    rec.setTimerConfig({ mode: camModeBtn.dataset.camMode });
    refreshCameraConfigCard();
    return;
  }

  // Camera timer presets
  const camPresetBtn = e.target.closest('[data-cam-preset]');
  if (camPresetBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    const p = camPresetBtn.dataset.camPreset;
    let cfg = {};
    if (p === 'amrap5') cfg = { mode: 'countdown', durationSeconds: 300 };
    else if (p === 'amrap10') cfg = { mode: 'countdown', durationSeconds: 600 };
    else if (p === 'amrap12') cfg = { mode: 'countdown', durationSeconds: 720 };
    else if (p === 'amrap15') cfg = { mode: 'countdown', durationSeconds: 900 };
    else if (p === 'amrap20') cfg = { mode: 'countdown', durationSeconds: 1200 };
    else if (p === 'emom10') cfg = { mode: 'interval', intervalSeconds: 60, rounds: 10 };
    else if (p === 'emom12') cfg = { mode: 'interval', intervalSeconds: 60, rounds: 12 };
    else if (p === 'e2mom10') cfg = { mode: 'interval', intervalSeconds: 120, rounds: 5 };
    else if (p === 'e2mom16') cfg = { mode: 'interval', intervalSeconds: 120, rounds: 8 };
    else if (p === 'nocap') cfg = { mode: 'stopwatch', durationSeconds: 0 };
    else if (p === 'cap10') cfg = { mode: 'stopwatch', durationSeconds: 600 };
    else if (p === 'cap12') cfg = { mode: 'stopwatch', durationSeconds: 720 };
    else if (p === 'cap15') cfg = { mode: 'stopwatch', durationSeconds: 900 };
    else if (p === 'cap20') cfg = { mode: 'stopwatch', durationSeconds: 1200 };
    rec.setTimerConfig(cfg);
    refreshCameraConfigCard();
    return;
  }

  // Camera timer prestart countdown choice (0, 3, 5, 10s)
  const camPrestartBtn = e.target.closest('[data-cam-prestart]');
  if (camPrestartBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    rec.setTimerConfig({ preStartSeconds: Number(camPrestartBtn.dataset.camPrestart) });
    refreshCameraConfigCard();
    return;
  }

  // Camera format and orientation choice (auto, portrait, landscape) (ТЗ v97)
  const camOrientBtn = e.target.closest('[data-cam-orient]');
  if (camOrientBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    const orient = camOrientBtn.dataset.camOrient;
    rec.setTimerConfig({ orientation: orient });
    rec.targetOrientation = orient;
    rec.configureRecordingOutput();
    refreshCameraConfigCard();
    return;
  }

  // Camera timer auto-start toggle (true / false) (ТЗ v97)
  const camAutoStartBtn = e.target.closest('[data-cam-autostart]');
  if (camAutoStartBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    const autoStart = camAutoStartBtn.dataset.camAutostart === 'true';
    rec.setTimerConfig({ timerAutoStart: autoStart });
    refreshCameraConfigCard();
    return;
  }

  // Camera timer steppers (+ / -)
  const camStepBtn = e.target.closest('[data-cam-step]');
  if (camStepBtn) {
    haptic(10);
    const rec = getCameraRecorder();
    const type = camStepBtn.dataset.camStep;
    const delta = Number(camStepBtn.dataset.step);
    if (type === 'dur') {
      const cur = rec.timerConfig.durationSeconds || 600;
      rec.setTimerConfig({ durationSeconds: Math.max(60, cur + delta) });
    } else if (type === 'interval') {
      const cur = rec.timerConfig.intervalSeconds || 60;
      rec.setTimerConfig({ intervalSeconds: Math.max(15, cur + delta) });
    } else if (type === 'rounds') {
      const cur = rec.timerConfig.rounds || 10;
      rec.setTimerConfig({ rounds: Math.max(1, cur + delta) });
    }
    refreshCameraConfigCard();
    return;
  }

  // Camera start recording (ТЗ v67, ТЗ v97)
  if (e.target.closest('#camera-start-rec-btn')) {
    haptic(15);
    const rec = getCameraRecorder();
    if (rec.state === 'REQUESTING_CAMERA' || rec.state === 'STARTING' || rec.state === 'RECORDING' || rec.state === 'COUNTDOWN') return;

    const athleteInput = $('#camera-drawer-athlete-input') || $('#camera-athlete-input');
    const workoutInput = $('#camera-drawer-workout-input') || $('#camera-workout-input');
    if (athleteInput || workoutInput) {
      rec.setMetadata(athleteInput?.value != null ? athleteInput.value : rec.athleteName, workoutInput?.value != null ? workoutInput.value : rec.workoutTitle);
    }

    isVideoSavedOrShared = false;
    rec.startVideoRecording().then(started => {
      if (started) {
        showToast('● REC · Запись запущена', 1500);
      }
    }).catch(err => {
      console.warn('Start video recording error:', err);
      showToast('⚠️ Ошибка запуска записи: ' + (err.message || err));
    });
    return;
  }

  // Camera add rep (+1) (ТЗ v97)
  if (e.target.closest('#camera-add-rep-btn')) {
    haptic(15);
    const rec = getCameraRecorder();
    rec.addRep();
    return;
  }

  // Camera add no-rep (ТЗ v97)
  if (e.target.closest('#camera-add-norep-btn')) {
    haptic(25);
    const rec = getCameraRecorder();
    rec.addNoRep();
    return;
  }

  // Camera start workout timer
  if (e.target.closest('#camera-start-timer-btn')) {
    haptic(15);
    const rec = getCameraRecorder();
    rec.startTimerNow();
    showToast('⏱️ Таймер комплекса запущен!');
    return;
  }

  // Camera stop recording
  if (e.target.closest('#camera-stop-rec-btn')) {
    haptic(15);
    const rec = getCameraRecorder();
    rec.stopRecording();
    document.body.classList.remove('camera-recording-active');
    document.body.classList.remove('recorder-fullscreen');
    return;
  }

  // Camera download / share / retry
  if (e.target.closest('#camera-download-btn')) {
    haptic(10);
    const rec = getCameraRecorder();
    isVideoSavedOrShared = true;
    rec.downloadVideo();
    showToast(`📥 Файл видео скачивается (.${(rec.actualExtension || 'mp4').toUpperCase()})`);
    return;
  }

  if (e.target.closest('#camera-share-btn')) {
    haptic(10);
    const btn = e.target.closest('#camera-share-btn');
    const rec = getCameraRecorder();
    if (btn) btn.style.opacity = '0.7';
    rec.shareVideo().then(res => {
      if (btn) btn.style.opacity = '1';
      if (res?.success) {
        isVideoSavedOrShared = true;
        showToast('✓ Готово! Выберите «Сохранить видео» или приложение');
      }
    }).catch(() => {
      if (btn) btn.style.opacity = '1';
    });
    return;
  }

  if (e.target.closest('#camera-retry-btn')) {
    haptic(10);
    const rec = getCameraRecorder();
    isVideoSavedOrShared = false;
    const previewSlot = $('#camera-preview-slot');
    if (previewSlot) previewSlot.innerHTML = '';
    rec.retry().catch(err => {
      console.warn('Camera retry error:', err);
    });
    return;
  }

  // Timer mode clicks
  const tMode = e.target.closest('[data-timer-mode]');
  if (tMode) {
    haptic(10);
    const t = getTimer();
    if (t?.setMode) t.setMode(tMode.dataset.timerMode);
    renderTimer();
    return;
  }

  // Timer countdown choice
  const cdBtn = e.target.closest('[data-countdown]');
  if (cdBtn) {
    haptic(10);
    const t = getTimer();
    if (t?.setCountdownDuration) t.setCountdownDuration(Number(cdBtn.dataset.countdown));
    renderTimer();
    return;
  }

  // Timer steppers (+ / -)
  const stepBtn = e.target.closest('[data-timer-step]');
  if (stepBtn) {
    haptic(12);
    const stepType = stepBtn.dataset.timerStep;
    const delta = Number(stepBtn.dataset.step) || 0;
    const t = getTimer();
    if (t) {
      if (!t.settings) {
        t.settings = {
          tabata: { work: 20, rest: 10, rounds: 8 },
          emom: { interval: 60, rounds: 10 },
          amrap: { duration: 600 },
          for_time: { cap: 1200 }
        };
      }
      if (stepType === 'tabata-rounds') {
        const cur = t.settings.tabata?.rounds ?? 8;
        if (t.setRounds) t.setRounds(cur + delta);
      } else if (stepType === 'tabata-work') {
        const cur = t.settings.tabata?.work ?? 20;
        if (t.setIntervals) t.setIntervals(cur + delta, null);
      } else if (stepType === 'tabata-rest') {
        const cur = t.settings.tabata?.rest ?? 10;
        if (t.setIntervals) t.setIntervals(null, cur + delta);
      } else if (stepType === 'emom-rounds') {
        const cur = t.settings.emom?.rounds ?? 10;
        if (t.setRounds) t.setRounds(cur + delta);
      } else if (stepType === 'emom-interval') {
        const cur = t.settings.emom?.interval ?? 60;
        if (t.setIntervals) t.setIntervals(cur + delta, null);
      } else if (stepType === 'amrap-duration') {
        const cur = t.settings.amrap?.duration ?? 600;
        if (t.setTimeCap) t.setTimeCap(cur + delta);
      } else if (stepType === 'fortime-cap') {
        const cur = t.settings.for_time?.cap ?? 1200;
        if (t.setTimeCap) t.setTimeCap(cur + delta);
      }
    }
    renderTimer();
    return;
  }

  // Quick athlete chips in athlete-search
  const quickAth = e.target.closest('[data-quick-athlete]');
  if (quickAth) {
    haptic(10);
    const qName = quickAth.dataset.quickAthlete;
    state.athleteQuery = qName;
    const input = $('#global-athlete-search');
    if (input) input.value = qName;
    renderAthleteSearch();
    return;
  }

  // Timer controls
  if (e.target.closest('#timer-open-fs-btn')) {
    haptic(15);
    openTimerFullscreen();
    return;
  }

  if (e.target.closest('#timer-fs-close-btn')) {
    haptic(15);
    closeTimerFullscreen();
    return;
  }

  if (e.target.closest('#timer-fs-start-btn')) {
    const t = getTimer();
    haptic(20);
    if (t) {
      if (t.status === 'running' || t.status === 'countdown') {
        t.pause?.();
      } else {
        t.start?.();
      }
    }
    return;
  }

  if (e.target.closest('#timer-fs-reset-btn')) {
    haptic(15);
    const t = getTimer();
    t?.reset?.();
    return;
  }

  if (e.target.closest('#timer-fs-settings-btn')) {
    haptic(10);
    const drawer = $('#timer-fs-drawer');
    if (drawer) {
      renderTimerFsDrawer();
      drawer.style.display = 'flex';
    }
    return;
  }

  if (e.target.closest('#timer-fs-drawer-close') || e.target.closest('#timer-fs-drawer-done') || e.target.id === 'timer-fs-drawer') {
    const drawer = $('#timer-fs-drawer');
    if (drawer) drawer.style.display = 'none';
    return;
  }

  const fsModeBtn = e.target.closest('[data-timer-fs-mode]');
  if (fsModeBtn) {
    haptic(10);
    const m = fsModeBtn.dataset.timerFsMode;
    const t = getTimer();
    if (t) t.setMode?.(m);
    renderTimerFsDrawer();
    return;
  }

  const fsStepBtn = e.target.closest('[data-timer-fs-step]');
  if (fsStepBtn) {
    haptic(10);
    const key = fsStepBtn.dataset.timerFsStep;
    const delta = Number(fsStepBtn.dataset.step) || 0;
    const t = getTimer();
    if (t) {
      if (!t.settings) {
        t.settings = {
          tabata: { work: 20, rest: 10, rounds: 8 },
          emom: { interval: 60, rounds: 10 },
          amrap: { duration: 600 },
          for_time: { cap: 1200 }
        };
      }
      if (key === 'tabata-rounds') {
        const cur = t.settings.tabata?.rounds ?? 8;
        t.setRounds?.(cur + delta);
      } else if (key === 'tabata-work') {
        const curW = t.settings.tabata?.work ?? 20;
        const curR = t.settings.tabata?.rest ?? 10;
        t.setIntervals?.(curW + delta, curR);
      } else if (key === 'tabata-rest') {
        const curW = t.settings.tabata?.work ?? 20;
        const curR = t.settings.tabata?.rest ?? 10;
        t.setIntervals?.(curW, curR + delta);
      } else if (key === 'emom-rounds') {
        const cur = t.settings.emom?.rounds ?? 10;
        t.setRounds?.(cur + delta);
      } else if (key === 'emom-interval') {
        const cur = t.settings.emom?.interval ?? 60;
        t.setIntervals?.(cur + delta, null);
      } else if (key === 'amrap-duration') {
        const cur = t.settings.amrap?.duration ?? 600;
        t.setTimeCap?.(cur + delta);
      } else if (key === 'fortime-cap') {
        const cur = t.settings.for_time?.cap ?? 1200;
        t.setTimeCap?.(cur + delta);
      }
    }
    renderTimerFsDrawer();
    return;
  }

  const fsCdChip = e.target.closest('[data-timer-fs-countdown]');
  if (fsCdChip) {
    haptic(10);
    const sec = Number(fsCdChip.dataset.timerFsCountdown) || 0;
    getTimer()?.setCountdownDuration?.(sec);
    renderTimerFsDrawer();
    return;
  }

  if (e.target.closest('#timer-start-btn')) {
    const t = getTimer();
    haptic(15);
    if (t) {
      if (t.status === 'running' || t.status === 'countdown') {
        t.pause?.();
      } else {
        t.start?.();
      }
    }
    return;
  }

  if (e.target.closest('#timer-reset-btn')) {
    haptic(15);
    const t = getTimer();
    t?.reset?.();
    return;
  }

  // Timer presets
  const preset = e.target.closest('[data-preset]');
  if (preset) {
    haptic(10);
    const p = preset.dataset.preset;
    const t = getTimer();
    if (t) {
      if (!t.settings) {
        t.settings = {
          tabata: { work: 20, rest: 10, rounds: 8 },
          emom: { interval: 60, rounds: 10 },
          amrap: { duration: 600 },
          for_time: { cap: 1200 }
        };
      }
      if (p === 'tabata') {
        t.settings.tabata = { work: 20, rest: 10, rounds: 8 };
        t.setMode?.('tabata');
      } else if (p === 'emom10') {
        t.settings.emom = { interval: 60, rounds: 10 };
        t.setMode?.('emom');
      } else if (p === 'emom15') {
        t.settings.emom = { interval: 60, rounds: 15 };
        t.setMode?.('emom');
      } else if (p === 'amrap10') {
        t.settings.amrap = { duration: 600 };
        t.setMode?.('amrap');
      } else if (p === 'amrap20') {
        t.settings.amrap = { duration: 1200 };
        t.setMode?.('amrap');
      }
    }
    renderTimer();
    return;
  }

  const openReg = e.target.closest('[data-open-region-id]');
  if (openReg) {
    hideRegionBottomSheet();
    openRegion(openReg.dataset.openRegionId);
    return;
  }

  const closeSheet = e.target.closest('#region-sheet-close, .bottom-sheet-close, #region-bottom-sheet-backdrop');
  if (closeSheet) {
    hideRegionBottomSheet();
    return;
  }

  const rDot = e.target.closest('#region-map [data-region]');
  if (rDot) { openRegion(rDot.dataset.region); return; }

  const rOpen = e.target.closest('[data-region-open]');
  if (rOpen) { openRegion(rOpen.dataset.regionOpen); return; }

  const p = e.target.closest('[data-photo]');
  if (p) { showPhoto(Number(p.dataset.photoAlbum), Number(p.dataset.photo)); return; }

  if (e.target.closest?.('[data-lightbox-close]') || e.target === $('#lightbox')) { closeLightbox(); return; }
  if (e.target.closest('[data-lightbox-prev]') && state.gallery) { showPhoto(state.gallery.albumIndex, state.gallery.index - 1); return; }
  if (e.target.closest('[data-lightbox-next]') && state.gallery) { showPhoto(state.gallery.albumIndex, state.gallery.index + 1); return; }

  if (e.target.closest?.('#share-close') || e.target === $('#share-modal')) { closeShareModal(); return; }
  if (e.target.closest('#btn-do-share')) { doShareCard(); return; }
  if (e.target.closest('#btn-download-card')) { downloadCard(); return; }

  if (e.target.closest('#pwa-install-btn')) {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      state.deferredPrompt = null;
    }
    $('#pwa-install-banner').hidden = true;
    return;
  }

  if (e.target.closest('#pwa-dismiss-btn')) {
    $('#pwa-install-banner').hidden = true;
    return;
  }
});

function debounce(fn, delay = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedRenderEvents = debounce(() => renderEvents(), 200);
const debouncedRenderNews = debounce(() => renderNews(), 200);
const debouncedRenderResults = debounce(() => renderResultsScreen(), 200);

$('#event-search')?.addEventListener('input', e => {
  state.eventsDisplayLimit = 20;
  state.eventQuery = e.target.value.trim();
  debouncedRenderEvents();
});
$('#event-format')?.addEventListener('change', e => { state.eventsDisplayLimit = 20; state.eventFormat = e.target.value; renderEvents(); });
$('#event-program')?.addEventListener('change', e => { state.eventsDisplayLimit = 20; state.eventProgram = e.target.value; renderEvents(); });
$('#event-city')?.addEventListener('change', e => { state.eventsDisplayLimit = 20; state.eventCity = e.target.value; renderEvents(); });
$('#event-type')?.addEventListener('change', e => { state.eventsDisplayLimit = 20; state.eventType = e.target.value; renderEvents(); });
$('#event-year')?.addEventListener('change', e => { state.eventsDisplayLimit = 20; state.eventYear = e.target.value; renderEvents(); });

$('#news-search')?.addEventListener('input', e => {
  state.newsDisplayLimit = 20;
  state.newsQuery = e.target.value.trim();
  debouncedRenderNews();
});

$('#results-search')?.addEventListener('input', e => {
  state.resultsDisplayLimit = 20;
  state.resultsQuery = e.target.value.trim();
  debouncedRenderResults();
});
$('#results-year-filter')?.addEventListener('change', e => { state.resultsDisplayLimit = 20; state.resultsYear = e.target.value; renderResultsScreen(); });
$('#results-program-filter')?.addEventListener('change', e => { state.resultsDisplayLimit = 20; state.resultsProgram = e.target.value; renderResultsScreen(); });
$('#results-city-filter')?.addEventListener('change', e => { state.resultsDisplayLimit = 20; state.resultsCity = e.target.value; renderResultsScreen(); });

// Доступность: управление с клавиатуры для карточек соревнований
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
    const cardMain = e.target.closest('.event-card-main');
    if (cardMain && cardMain.dataset.event) {
      e.preventDefault();
      openEvent(cardMain.dataset.event, cardMain.dataset.eventPane || 'about');
    }
  }
});
$('#record-search').addEventListener('input', e => { state.recordLimit = 30; state.recordQuery = e.target.value.trim(); renderRecords(); });
$('#region-search').addEventListener('input', e => { state.regionQuery = e.target.value.trim(); renderRegions(); });
$('#record-age').addEventListener('change', e => { state.recordLimit = 30; state.age = e.target.value; renderRecords(); });
$('#record-discipline').addEventListener('change', e => { state.recordLimit = 30; state.discipline = e.target.value; renderRecords(); });
$('#record-group').addEventListener('change', e => { state.recordLimit = 30; state.group = e.target.value; renderRecords(); });
document.addEventListener('change', e => { if (e.target.id === 'calc-age-range') renderCalculator(); });
document.addEventListener('change', e => {
  if (e.target.id === 'event-result-category') {
    state.eventResultCategory = e.target.value;
    renderEventResults();
  }
  if (e.target.id === 'event-result-age') {
    state.eventResultAge = e.target.value;
    renderEventResults();
  }
  if (e.target.id === 'event-result-complex') {
    state.eventResultComplex = e.target.value;
    renderEventResults();
  }
});

// Calculator & Camera inputs
document.addEventListener('input', e => {
  if (e.target.id === 'camera-athlete-input' || e.target.id === 'camera-workout-input' ||
      e.target.id === 'camera-drawer-athlete-input' || e.target.id === 'camera-drawer-workout-input') {
    const rec = getCameraRecorder();
    const isDrawer = e.target.id.includes('drawer');
    const ath = isDrawer ? $('#camera-drawer-athlete-input')?.value : $('#camera-athlete-input')?.value;
    const work = isDrawer ? $('#camera-drawer-workout-input')?.value : $('#camera-workout-input')?.value;
    rec.setMetadata(ath, work);
    if (isDrawer) {
      const mainAth = $('#camera-athlete-input');
      const mainWork = $('#camera-workout-input');
      if (mainAth && ath != null) mainAth.value = ath;
      if (mainWork && work != null) mainWork.value = work;
    } else {
      const dAth = $('#camera-drawer-athlete-input');
      const dWork = $('#camera-drawer-workout-input');
      if (dAth && ath != null) dAth.value = ath;
      if (dWork && work != null) dWork.value = work;
    }
    return;
  }
  if (e.target.id === 'event-result-search') {
    state.eventResultQuery = e.target.value.trim();
    renderEventResults();
    return;
  }
  if (e.target.id === 'faq-search-input') {
    state.faqQuery = e.target.value;
    renderFaq();
    return;
  }
  if (e.target.id === 'calc-age-range') {
    // Плавность: во время перетаскивания обновляем только текст, не перерисовывая слайдер.
    state.calcAge = Number(e.target.value);
    const ageVal = $('#calc-age-val');
    if (ageVal) ageVal.textContent = `${state.calcAge} лет`;
    const stage = getStageByAge(state.calcAge);
    const badge = $('.calc-stage-badge');
    if (badge) badge.textContent = stage.label;
    const info = $('.calc-stage-info b');
    if (info) info.textContent = stage.ageRange;
    return;
  }
  if (e.target.classList && e.target.classList.contains('calc-touch-slider')) {
    const testId = e.target.dataset.testId;
    const tests = getActiveCalculatorTests();
    const t = tests.find(x => x.id === testId);
    if (t) {
      const rawNum = parseFloat(e.target.value);
      const formattedVal = t.isTime
        ? formatNormVal(t, Math.round(rawNum))
        : (t.lowerIsBetter ? rawNum.toFixed(1) : String(rawNum % 1 === 0 ? rawNum : rawNum.toFixed(1)));
      updateCalculatorValue(testId, formattedVal, 'slider');
    }
    return;
  }
  if (e.target.dataset.testId) {
    updateCalculatorValue(e.target.dataset.testId, e.target.value, 'text');
    return;
  }
  if (e.target.id === 'global-athlete-search') {
    state.athleteQuery = e.target.value;
    renderAthleteSearch();
  }
  if (e.target.id === 'event-athletes-filter') {
    const q = (e.target.value || '').toLowerCase().trim();
    const cards = $$('#event-athletes-list .event-athlete-card');
    cards.forEach(c => {
      const txt = c.textContent.toLowerCase();
      c.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
  }
});

addEventListener('popstate', () => {
  const rawHash = (location.hash || '').slice(1).split('?')[0];
  const hashParts = rawHash.split('/');
  let scr = hashParts[0] || 'home';
  if (scr === 'herogto' || scr === 'hero-gto') scr = 'hero';
  const id = hashParts[1] || null;
  const pane = hashParts[2] || null;

  if (scr === 'athletes') scr = 'athlete';
  if (scr === 'events' && id) scr = 'event';
  if (scr === 'regions' && id) scr = 'region';
  if (scr === 'federations' && id) scr = 'region';

  let restoreScrollY = null;
  // If stack has previous item matching this route, pop the top
  if (appNavigationStack.length > 1) {
    const prev = appNavigationStack[appNavigationStack.length - 2];
    if (prev && prev.screen === scr && (!id || String(prev.params?.id) === String(id))) {
      appNavigationStack.pop();
      restoreScrollY = (typeof prev.scrollY === 'number') ? prev.scrollY : null;
    }
  }

  if (scr === 'event') {
    const eventId = id || state.lastEventId || 104;
    const initialPane = pane || 'about';
    openEvent(eventId, initialPane, false, restoreScrollY);
  } else if (scr === 'article' && id) {
    openArticle(id, false, restoreScrollY);
  } else if (scr === 'region' && id) {
    openRegion(id, false, restoreScrollY);
  } else if (scr === 'athlete' && id) {
    openAthleteProfile(id, false, restoreScrollY);
  } else if ((scr === 'record' || scr === 'records') && id) {
    openRecordDetail(id, false, restoreScrollY);
  } else {
    go(scr, false, restoreScrollY);
  }
});

$('#nearest-region').addEventListener('click', () => {
  if (!navigator.geolocation) return;
  $('#nearest-region').textContent = 'Определяем…';
  navigator.geolocation.getCurrentPosition(pos => {
    const rad = x => x * Math.PI / 180;
    const dist = f => {
      const [a, b] = f.coords || [];
      if (!a) return Infinity;
      const dlat = rad(a - pos.coords.latitude), dlon = rad(b - pos.coords.longitude);
      return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dlat / 2) ** 2 + Math.cos(rad(pos.coords.latitude)) * Math.cos(rad(a)) * Math.sin(dlon / 2) ** 2));
    };
    const nearest = GTO_FEDERATIONS.filter(f => f.coords).sort((a, b) => dist(a) - dist(b))[0];
    $('#nearest-region').textContent = `Ближайшее: ${nearest.region} · ${Math.round(dist(nearest))} км`;
    openRegion(nearest.id);
  }, () => {
    $('#nearest-region').textContent = 'Не удалось получить геопозицию';
  });
});

let swipeX = 0;
document.addEventListener('touchstart', e => {
  if (!state.gallery) return;
  const touch = e.touches[0];
  if (touch && touch.clientX <= 30) return; // Leave native iOS edge swipe gesture intact
  swipeX = touch.clientX;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!state.gallery) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  if (Math.abs(dx) > 45) showPhoto(state.gallery.albumIndex, state.gallery.index + (dx < 0 ? 1 : -1));
}, { passive: true });

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeShareModal();
    return;
  }
  const shareModal = $('#share-modal');
  if (shareModal && !shareModal.hidden && e.key === 'Tab') {
    const controls = [...shareModal.querySelectorAll('button:not([disabled]), a[href]')];
    if (!controls.length) return;
    const i = controls.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); controls.at(-1).focus(); }
    else if (!e.shiftKey && i === controls.length - 1) { e.preventDefault(); controls[0].focus(); }
    return;
  }
  if (!state.gallery) return;
  if (e.key === 'Tab') {
    const controls = [...$$('#lightbox button')];
    if (!controls.length) return;
    const i = controls.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); controls.at(-1).focus(); }
    else if (!e.shiftKey && i === controls.length - 1) { e.preventDefault(); controls[0].focus(); }
  }
  if (e.key === 'ArrowRight') showPhoto(state.gallery.albumIndex, state.gallery.index + 1);
  if (e.key === 'ArrowLeft') showPhoto(state.gallery.albumIndex, state.gallery.index - 1);
});

// PWA and Connectivity
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.deferredPrompt = e;
  const banner = $('#pwa-install-banner');
  if (banner) banner.hidden = false;
});

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (isIos && !isStandalone) {
  const banner = $('#pwa-install-banner');
  const text = $('#pwa-banner-text');
  const btn = $('#pwa-install-btn');
  if (banner && text) {
    banner.hidden = false;
    text.textContent = 'Откройте «Поделиться» и выберите «На экран Домой»';
    if (btn) btn.hidden = true;
  }
}

window.addEventListener('online', () => { const el = $('#offline-badge'); if (el) el.hidden = true; });
window.addEventListener('offline', () => { const el = $('#offline-badge'); if (el) el.hidden = false; });
if (!navigator.onLine) { const el = $('#offline-badge'); if (el) el.hidden = false; }

window.addEventListener('popstate', () => {
  if (cameraRecorderInstance && (cameraRecorderInstance.state === 'RECORDING' || cameraRecorderInstance.state === 'STARTING' || timerActiveTab === 'camera')) {
    destroyCameraSession({ discard: true, returnTo: 'training' });
  }
});

function syncDatasetCounts() {
  const counts = [GTO_CALENDAR_EVENTS.length, GTO_FEDERATIONS.length, GTO_VIDEOS.length];
  $$('.desktop-proof-strip strong').slice(0, 3).forEach((el, i) => { el.textContent = String(counts[i]); });

  const moreFacts = $$('[data-screen="more"] .fact-grid b');
  if (moreFacts[2]) moreFacts[2].textContent = String(GTO_FEDERATIONS.length);
  const regionLink = $('[data-screen="more"] .link-stack [data-go="regions"] small');
  if (regionLink) regionLink.textContent = `${GTO_FEDERATIONS.length} отделений — адреса и контакты`;

  const offline = $('#offline-badge');
  const offlineText = offline ? [...offline.childNodes].find(node => node.nodeType === Node.TEXT_NODE && /старт/.test(node.nodeValue || '')) : null;
  if (offlineText) offlineText.nodeValue = ` · Все ${GTO_CALENDAR_EVENTS.length} стартов, рекорды и фото доступны из кэша`;
  const athleteScope = $('#athlete-search-count')?.nextElementSibling;
  if (athleteScope) athleteScope.textContent = '3 203 профиля';
}

async function init() {
  syncDatasetCounts();
  $$('.search > span').forEach(icon => {
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>';
  });
  $$('.search input').forEach(input => {
    if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', input.placeholder || 'Поиск');
  });
  try {
    const [events, vk, thumbs] = await Promise.all([
      fetch('./data/events/manifest.json?v=25').then(r => r.json()),
      fetch('./data/vk_media.json?v=25').then(r => r.json()),
      fetch('./data/video_thumbs.json?v=25').then(r => r.json())
    ]);
    state.eventManifest = events;
    state.vkLocal = vk;
    state.videoThumbs = thumbs;
  } catch {}
  
  renderHome();

  const rawHash = (location.hash || '').slice(1).split('?')[0];
  const hashParts = rawHash.split('/');
  let scr = hashParts[0] || 'home';
  if (scr === 'herogto' || scr === 'hero-gto') scr = 'hero';
  const id = hashParts[1] || null;
  const pane = hashParts[2] || null;

  if (scr === 'athletes') scr = 'athlete';
  if (scr === 'events' && id) scr = 'event';
  if (scr === 'regions' && id) scr = 'region';
  if (scr === 'federations' && id) scr = 'region';
  appNavigationStack.length = 0;
  appNavigationStack.push({ screen: scr, params: { id, pane } });

  await ensureScreenData(scr);

  if (scr === 'event') {
    const eventId = id || state.lastEventId || 104;
    const initialPane = pane || 'about';
    openEvent(eventId, initialPane, false);
  } else if (scr === 'article' && id) {
    openArticle(id, false);
  } else if (scr === 'region' && id) {
    openRegion(id, false);
  } else if (scr === 'athlete' && id) {
    openAthleteProfile(id, false);
  } else if ((scr === 'record' || scr === 'records') && id) {
    openRecordDetail(id, false);
  } else {
    go(scr, false);
  }

  const scrollTopBtn = $('#scroll-top-btn');
  if (scrollTopBtn) {
    let scrollScheduled = false;
    window.addEventListener('scroll', () => {
      if (!scrollScheduled) {
        scrollScheduled = true;
        requestAnimationFrame(() => {
          scrollScheduled = false;
          const show = window.scrollY > 350;
          scrollTopBtn.hidden = !show;
          scrollTopBtn.classList.toggle('visible', show);
        });
      }
    }, { passive: true });
    scrollTopBtn.addEventListener('click', () => {
      haptic(10);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

init();

window.addEventListener('gto-ecosystem-sync', () => {
  if (state.screen === 'records') {
    renderRecords();
  }
});

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NEW_VERSION' && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      reg.update();
      setInterval(() => reg.update(), 60000);
    }).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => reg && reg.update());
    }
  });
  if (typeof window !== 'undefined') {
    window.__GTO_APP_READY__ = true;
  }
}

addEventListener('load', () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const v = $('.hero video');
  if (v) setTimeout(() => v.play().catch(() => {}), 400);
});

window.addEventListener('gto-ecosystem-sync', (e) => {
  try {
    if (state.screen === 'home') renderHome();
    else if (state.screen === 'news') renderNews();
    else if (state.screen === 'records') renderRecords();
    else if (state.screen === 'events') renderEvents();
  } catch (_) {}
});
