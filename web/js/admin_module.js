/**
 * МОДУЛЬ «ВЕБ-АДМИН-ПАНЕЛЬ ФМГТО РОССИИ»
 * По эталону «Герой ГТО» / ТЗ Этап 2 (idunarekord.vercel.app/web/)
 * Федерация многоборья ГТО России · 2026
 */

import { GTO_RECORDS, GTO_CALENDAR_EVENTS } from './gto_data.js';
import { GTO_STANDARDS as GTO_TECHNIQUES } from './standards_data.js';
import { GTO_REGIONS } from './regions_data.js';
import { getAllHeroVideos } from './indexeddb_storage.js';
import { getUnifiedRecords, addUnifiedRecord, getActiveHeroAthlete, syncEcosystemState } from './ecosystem_sync.js?v=128';
import { mergeAthletesApi, fetchMasterAthlete, createOrUpdateMasterEvent, fetchEventParticipants } from './master_api.js?v=128';

const ADMIN_STORAGE_KEY = 'gto_admin_store_v1';

// v119: единая система тостов вместо alert() (не блокирует UI, авто-скрытие, XSS-safe)
function adminToast(message, type = 'success', ms = 3200) {
  try {
    let host = document.getElementById('admin-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'admin-toast-host';
      host.className = 'admin-toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `admin-toast ${type}`;
    el.setAttribute('role', 'status');
    const ic = document.createElement('span');
    ic.className = 'admin-toast-ic';
    ic.textContent = type === 'error' ? '✕' : type === 'info' ? 'ℹ' : '✓';
    const msg = document.createElement('span');
    msg.className = 'admin-toast-msg';
    msg.textContent = message;
    el.appendChild(ic);
    el.appendChild(msg);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const remove = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
    const timer = setTimeout(remove, ms);
    el.addEventListener('click', () => { clearTimeout(timer); remove(); });
  } catch (_) {}
}

// v119: затемняющий бэкдроп под мобильным сайдбаром
function setAdminBackdrop(show) {
  let bd = document.getElementById('admin-backdrop');
  if (show) {
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'admin-backdrop';
      bd.className = 'admin-backdrop';
      // бэкдроп живёт на <body> (вне делегированного контейнера) — вешаем обработчик прямо на него
      bd.addEventListener('click', () => {
        const sb = document.getElementById('admin-sidebar');
        if (sb) sb.classList.remove('is-open');
        setAdminBackdrop(false);
      });
      document.body.appendChild(bd);
    }
    requestAnimationFrame(() => bd.classList.add('show'));
  } else if (bd) {
    bd.classList.remove('show');
    setTimeout(() => bd.remove(), 250);
  }
}

const DEFAULT_USERS = [
  { id: 'u1', name: 'Алексей Михайлин', email: 'admin@gto.com.ru', role: 'organizer', status: 'active', phone: '+7 (985) 111-22-33' },
  { id: 'u2', name: 'Иосиф Свищев', email: 'director@gto.com.ru', role: 'organizer', status: 'active', phone: '+7 (916) 222-33-44' },
  { id: 'u3', name: 'Сергей Морозов', email: 'chief_judge@gto.com.ru', role: 'judge', status: 'active', phone: '+7 (903) 333-44-55' },
  { id: 'u4', name: 'Елена Кузнецова', email: 'moderator1@gto.com.ru', role: 'moderator', status: 'active', phone: '+7 (926) 444-55-66' },
  { id: 'u5', name: 'Дмитрий Соболев', email: 'judge_video@gto.com.ru', role: 'judge', status: 'active', phone: '+7 (915) 555-66-77' },
  { id: 'u6', name: 'Павел Романов', email: 'onsite_sochi@gto.com.ru', role: 'onsite_admin', status: 'active', phone: '+7 (909) 666-77-88' }
];

const DEFAULT_CATALOGS = {
  age_groups: [
    { id: 'ag1', title: '6–7 лет (I ступень)', min: 6, max: 7, stage: 'I' },
    { id: 'ag2', title: '8–9 лет (II ступень)', min: 8, max: 9, stage: 'II' },
    { id: 'ag3', title: '10–11 лет (III ступень)', min: 10, max: 11, stage: 'III' },
    { id: 'ag4', title: '12–13 лет (IV ступень)', min: 12, max: 13, stage: 'IV' },
    { id: 'ag5', title: '14–15 лет (V ступень)', min: 14, max: 15, stage: 'V' },
    { id: 'ag6', title: '16–17 лет (VI ступень)', min: 16, max: 17, stage: 'VI' },
    { id: 'ag7', title: '18–19 лет (VII ступень)', min: 18, max: 19, stage: 'VII' },
    { id: 'ag8', title: '20–24 года (VIII ступень)', min: 20, max: 24, stage: 'VIII' },
    { id: 'ag9', title: '25–29 лет (IX ступень)', min: 25, max: 29, stage: 'IX' },
    { id: 'ag10', title: '30–34 года (X ступень)', min: 30, max: 34, stage: 'X' },
    { id: 'ag11', title: '35–39 лет (XI ступень)', min: 35, max: 39, stage: 'XI' },
    { id: 'ag12', title: '40–44 года (XII ступень)', min: 40, max: 44, stage: 'XII' }
  ],
  divisions: [
    { id: 'div1', title: 'Профессионалы (Elite)', desc: 'Действующие спортсмены, открытый зачёт без ограничений' },
    { id: 'div2', title: 'Продвинутые (Advanced)', desc: 'Опытные участники, стандартные соревновательные веса' },
    { id: 'div3', title: 'Любители (Amateur)', desc: 'Базовый соревновательный уровень для всех желающих' },
    { id: 'div4', title: 'Первая попытка (Rookie)', desc: 'Для новичков многоборья ГТО и выполнения норм ступеней' }
  ],
  documents: [
    { id: 'doc1', title: 'Паспорт гражданина РФ / Свидетельство о рождении', required: true },
    { id: 'doc2', title: 'Медицинский допуск (Справка по форме 1144-н)', required: true },
    { id: 'doc3', title: 'Полис страхования жизни и здоровья от несчастных случаев', required: true },
    { id: 'doc4', title: 'Согласие на обработку персональных данных (для детей — от родителей)', required: true },
    { id: 'doc5', title: 'УИН ВФСК ГТО (при наличии)', required: false }
  ],
  team_formats: [
    { id: 'tf1', title: 'Команда 4 человека (2М + 2Ж)', quotaM: 2, quotaW: 2, desc: 'Классическая смешанная четвёрка Игр ГТО' },
    { id: 'tf2', title: 'Команда 6 человек (3М + 3Ж)', quotaM: 3, quotaW: 3, desc: 'Командный кубок субъектов РФ' },
    { id: 'tf3', title: 'Парный зачёт (М + Ж)', quotaM: 1, quotaW: 1, desc: 'Дуэты' }
  ]
};

let store = null;
let allEventsCache = Array.isArray(GTO_CALENDAR_EVENTS) ? [...GTO_CALENDAR_EVENTS] : [];
let allAthletesCache = [];

function loadAdminStore() {
  const defaults = {
    role: 'organizer', // organizer | moderator | judge | onsite_admin
    activeTab: 'dashboard',
    customEvents: [],
    applications: [],
    checkedInAthletes: [],
    tournamentStage: 'review',
    resultsSubtab: 'results',
    judgeLog: [],
    auditLog: [
      { time: new Date().toLocaleTimeString('ru-RU'), text: 'Вход в панель организатора ФМГТО', user: 'admin@gto.com.ru' }
    ],
    users: Array.isArray(DEFAULT_USERS) ? [...DEFAULT_USERS] : [],
    catalogs: (DEFAULT_CATALOGS && typeof DEFAULT_CATALOGS === 'object') ? { ...DEFAULT_CATALOGS } : {},
    revealedAthletes: []
  };

  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const merged = { ...defaults, ...parsed };
        if (Array.isArray(merged.applications)) {
          merged.applications = merged.applications.filter(a => a && a.id && !a.id.startsWith('APP-10'));
        } else {
          merged.applications = [];
        }
        if (!Array.isArray(merged.checkedInAthletes)) merged.checkedInAthletes = [];
        if (!Array.isArray(merged.customEvents)) merged.customEvents = [];
        if (!Array.isArray(merged.judgeLog)) merged.judgeLog = [];
        if (!Array.isArray(merged.auditLog) || !merged.auditLog.length) merged.auditLog = defaults.auditLog;
        if (!Array.isArray(merged.users) || !merged.users.length) merged.users = defaults.users;
        if (!merged.catalogs || typeof merged.catalogs !== 'object') merged.catalogs = defaults.catalogs;
        if (!Array.isArray(merged.revealedAthletes)) merged.revealedAthletes = [];
        if (!merged.role) merged.role = 'organizer';
        if (!merged.activeTab) merged.activeTab = 'dashboard';
        if (!merged.tournamentStage) merged.tournamentStage = 'review';
        if (!merged.resultsSubtab) merged.resultsSubtab = 'results';
        return merged;
      }
    }
  } catch (_) {}

  return defaults;
}

function saveAdminStore() {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Admin store save error:', err);
  }
}

// По ТЗ HOTFIX 2026: только реальные заявки, без фейковых/выдуманных людей
function seedApplications() {
  return [];
}

export async function initAdminScreen(container) {
  if (!container) return;
  store = loadAdminStore();

  // ⚡ INSTANT RENDER: рендерим интерфейс админки немедленно (0ms задержки, никакого черного экрана)
  try {
    renderAdminLayout(container);
    bindAdminEvents(container);
  } catch (err) {
    console.error('[Admin] Initial render error:', err);
  }

  // Фоновая догрузка и синхронизация реестров без блокировки экрана
  (async () => {
    try {
      if (!allEventsCache.length && Array.isArray(GTO_CALENDAR_EVENTS)) {
        allEventsCache = [...GTO_CALENDAR_EVENTS];
      }
      if (!allAthletesCache.length) {
        try {
          const res = await fetch('./data/master/athletes.json');
          if (res.ok) allAthletesCache = await res.json();
        } catch (_) {}
      }
      const activeHero = getActiveHeroAthlete();
      if (activeHero && !allAthletesCache.some(a => a.uin === activeHero.uin || (a.name && a.name === activeHero.name))) {
        allAthletesCache.unshift({
          id: 'hero_' + (activeHero.id || Date.now()),
          name: activeHero.name,
          fio: activeHero.name,
          gender: activeHero.gender || 'M',
          region: activeHero.region || 'Российская Федерация',
          rank: activeHero.category || 'Герой ГТО',
          uin: activeHero.uin || '26-77-0045129',
          phone: activeHero.phone || '+7 (999) 000-00-00',
          email: activeHero.email || 'hero@gto.com.ru'
        });
      }

      // 1. Загрузка реальных заявок и видеозаписей с серверного API
      try {
        const res = await fetch('/api/hero/videos');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.videos)) {
            const existingIds = new Set((store.applications || []).map(a => a.id));
            const serverApps = json.videos.filter(v => !existingIds.has(v.id)).map(v => ({
              id: v.id,
              athleteName: v.athleteName || 'Атлет',
              uin: v.uin || '—',
              region: v.region || '—',
              eventTitle: v.eventTitle || 'Многоборье ГТО 2026',
              discipline: v.exerciseTitle || v.exerciseId || 'Упражнение',
              format: 'online',
              status: v.status || 'under_review',
              submittedDate: new Date(v.uploadedAt || v.recordedAt).toLocaleDateString('ru-RU'),
              videoUrl: v.url,
              claimedResult: v.result?.reps ? `${v.result.reps} повт.` : '—',
              judgeDecision: v.judgeDecision || null,
              rawVideo: v
            }));
            store.applications = [...(store.applications || []), ...serverApps];
          }
        }
      } catch (_) {}

      // 2. Догрузка локально сохранённых на устройстве видеозаписей из IndexedDB
      try {
        const localVideos = await getAllHeroVideos().catch(() => []);
        const draftRaw = localStorage.getItem('gto_hero_active_draft_v1');
        const complexVideoIds = new Set();
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            if (draft && draft.exercises) {
              draft.exercises.forEach(e => {
                if (e.videoLocalId) complexVideoIds.add(e.videoLocalId);
              });
            }
          } catch (_) {}
        }
        (store.applications || []).forEach(a => {
          if (a.exercises && Array.isArray(a.exercises)) {
            a.exercises.forEach(e => {
              if (e.videoLocalId) complexVideoIds.add(e.videoLocalId);
            });
          }
        });

        if (localVideos && localVideos.length) {
          localVideos.forEach(lv => {
            if (complexVideoIds.has(lv.localId)) return;
            const alreadyIn = store.applications.some(a => a.id === lv.localId || (lv.serverId && a.id === lv.serverId));
            if (!alreadyIn) {
              store.applications.unshift({
                id: lv.localId,
                athleteName: lv.athleteName || 'Атлет',
                uin: '—',
                region: 'Локальное устройство',
                eventTitle: 'Фиксация «Герой ГТО»',
                discipline: lv.exerciseTitle || 'Упражнение',
                format: 'online',
                status: lv.uploadStatus === 'UPLOADED' ? 'under_review' : 'new',
                submittedDate: new Date(lv.createdAt).toLocaleDateString('ru-RU'),
                videoUrl: lv.serverUrl || (lv.blob ? URL.createObjectURL(lv.blob) : null),
                claimedResult: lv.reps ? `${lv.reps} повт.` : '—',
                judgeDecision: null,
                rawVideo: lv
              });
            }
          });
        }
      } catch (_) {}

      // 3. Синхронизация активного онлайн-комплекса WOD (3 упражнения)
      try {
        const draftRaw = localStorage.getItem('gto_hero_active_draft_v1');
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && draft.exercises && (draft.status === 'submitted' || draft.status === 'reshoot_requested' || draft.exercises.some(e => e.recorded))) {
            const draftAppId = 'APP-WOD-' + (draft.tournamentId || '2026').toString().slice(-6);
            const existingComplex = store.applications.find(a => a.id === draftAppId || (a.exercises && a.tournamentId === draft.tournamentId));
            const localVideos = await getAllHeroVideos().catch(() => []);

            const exercisesWithVids = draft.exercises.map(ex => {
              const mv = (localVideos || []).find(v => v.localId === ex.videoLocalId);
              return {
                id: ex.id,
                title: ex.title,
                reps: ex.reps || 0,
                judgeReps: ex.judgeReps,
                videoLocalId: ex.videoLocalId,
                videoUrl: mv?.serverUrl || (mv?.blob ? URL.createObjectURL(mv.blob) : (ex.videoUrl || '')),
                status: ex.status || (ex.recorded ? 'recorded' : 'pending')
              };
            });

            if (!existingComplex) {
              store.applications.unshift({
                id: draftAppId,
                tournamentId: draft.tournamentId || 'gordost-i-slava-2026',
                tournamentName: draft.tournamentTitle || 'Всероссийский турнир «Гордость и Слава 2026»',
                athleteName: 'Алексей Смирнов (Вы)',
                uin: '24-77-0019283',
                region: 'Москва',
                format: 'online',
                discipline: 'Онлайн-комплекс WOD (3 упражнения)',
                claimedResult: exercisesWithVids.map(e => `${e.reps} повт.`).join(' / '),
                status: draft.status === 'reshoot_requested' ? 'reshoot_requested' : 'judging',
                submittedDate: new Date().toLocaleDateString('ru-RU'),
                videoUrl: exercisesWithVids[0]?.videoUrl || '',
                selectedExerciseIdx: 0,
                exercises: exercisesWithVids,
                rawVideo: {
                  reps: exercisesWithVids[0]?.reps || 0,
                  noReps: 0
                }
              });
            } else {
              existingComplex.exercises = exercisesWithVids;
              existingComplex.claimedResult = exercisesWithVids.map(e => `${e.reps} повт.`).join(' / ');
              const curIdx = existingComplex.selectedExerciseIdx || 0;
              if (exercisesWithVids[curIdx]?.videoUrl) {
                existingComplex.videoUrl = exercisesWithVids[curIdx].videoUrl;
              }
            }
          }
        }

        const allComplexVidIds = new Set();
        (store.applications || []).forEach(a => {
          if (a.exercises && a.exercises.length) {
            a.exercises.forEach(e => {
              if (e.videoLocalId) allComplexVidIds.add(e.videoLocalId);
            });
          }
        });
        if (allComplexVidIds.size > 0) {
          store.applications = store.applications.filter(a => {
            if (a.exercises && a.exercises.length) return true;
            return !allComplexVidIds.has(a.id);
          });
        }
      } catch (_) {}

      // Обновляем отображение с актуальными фоновыми данными
      renderAdminLayout(container);
    } catch (err) {
      console.warn('[Admin] Background sync error:', err);
    }
  })();
}
window.initAdminScreen = initAdminScreen;
window.setAdminTab = function(tabName) {
  if (store) {
    store.activeTab = tabName;
    saveAdminStore();
    const container = document.getElementById('admin-root');
    if (container) renderAdminLayout(container);
  }
};

function renderAdminLayout(container) {
  if (!container) return;
  try {
    if (!store) store = loadAdminStore();
    const role = store.role || 'organizer';
    const tab = store.activeTab || 'dashboard';

    const apps = Array.isArray(store.applications) ? store.applications : [];
    const pendingCount = apps.filter(a => a.status === 'under_review' || a.status === 'new').length;
    const judgingCount = apps.filter(a => a.status === 'judging').length;

    container.innerHTML = `
      <div class="admin-wrapper" id="admin-app-root">
      <!-- САЙДБАР -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-brand">
          <img src="./assets/logo-tight.png" alt="ФМГТО">
          <div class="admin-brand-text">
            <b>ФМГТО РОССИИ</b>
            <small>Панель организатора</small>
          </div>
        </div>

        <div class="admin-nav-scroll">
          <div class="admin-nav-group-title">Игры и Турниры</div>
          <button class="admin-nav-item ${tab === 'dashboard' ? 'active' : ''}" data-admin-tab="dashboard">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/></svg></span>
            <span class="admin-nav-label">Дашборд</span>
          </button>

          <button class="admin-nav-item ${tab === 'events' ? 'active' : ''}" data-admin-tab="events">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
            <span class="admin-nav-label">Мероприятия</span>
            <span class="admin-nav-badge blue">${allEventsCache.length || 113}</span>
          </button>

          <button class="admin-nav-item ${tab === 'applications' ? 'active' : ''}" data-admin-tab="applications">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg></span>
            <span class="admin-nav-label">Заявки</span>
            ${pendingCount ? `<span class="admin-nav-badge">${pendingCount}</span>` : ''}
          </button>

          <button class="admin-nav-item ${tab === 'judging' ? 'active' : ''}" data-admin-tab="judging">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 5 3-5 3V9z"/></svg></span>
            <span class="admin-nav-label">Судейство видео</span>
            ${judgingCount ? `<span class="admin-nav-badge blue">${judgingCount}</span>` : ''}
          </button>

          <button class="admin-nav-item ${tab === 'athletes' ? 'active' : ''}" data-admin-tab="athletes">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg></span>
            <span class="admin-nav-label">Участники</span>
            <span class="admin-nav-badge blue">3 203</span>
          </button>

          <div class="admin-nav-group-title">Аналитика</div>
          <button class="admin-nav-item ${tab === 'records' ? 'active' : ''}" data-admin-tab="records">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span>
            <span class="admin-nav-label">Книга рекордов</span>
            <span class="admin-nav-badge blue">${GTO_RECORDS?.length || 321}</span>
          </button>

          <button class="admin-nav-item ${tab === 'results' ? 'active' : ''}" data-admin-tab="results">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg></span>
            <span class="admin-nav-label">Протоколы</span>
          </button>

          <button class="admin-nav-item ${tab === 'statistics' ? 'active' : ''}" data-admin-tab="statistics">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></span>
            <span class="admin-nav-label">Статистика</span>
          </button>

          <div class="admin-nav-group-title">Организация и Допуск</div>
          <button class="admin-nav-item ${tab === 'checkin' ? 'active' : ''}" data-admin-tab="checkin">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20h3v1h-3z"/></svg></span>
            <span class="admin-nav-label">Очный QR-чек-ин</span>
            <span class="admin-nav-badge blue" id="admin-checkin-count-badge">${store.checkedInAthletes?.length || 0}</span>
          </button>

          <button class="admin-nav-item ${tab === 'merch' ? 'active' : ''}" data-admin-tab="merch">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg></span>
            <span class="admin-nav-label">Мерч и дипломы</span>
          </button>

          <button class="admin-nav-item ${tab === 'catalogs' ? 'active' : ''}" data-admin-tab="catalogs">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9 9v11"/></svg></span>
            <span class="admin-nav-label">Справочники</span>
          </button>

          <button class="admin-nav-item ${tab === 'users' ? 'active' : ''}" data-admin-tab="users">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="admin-nav-label">Пользователи / Доступ</span>
          </button>

          <button class="admin-nav-item ${tab === 'profile' ? 'active' : ''}" data-admin-tab="profile">
            <span class="admin-nav-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
            <span class="admin-nav-label">Профиль и аудит</span>
          </button>
        </div>

        <div class="admin-sidebar-footer">
          <div class="admin-user-pill">
            <div class="admin-user-avatar">
              ${role === 'organizer' ? 'ОР' : role === 'judge' ? 'СУ' : role === 'moderator' ? 'МО' : 'АД'}
            </div>
            <div class="admin-user-meta">
              <div class="admin-user-name">
                ${role === 'organizer' ? 'Организатор ФМГТО' : role === 'judge' ? 'Главный судья' : role === 'moderator' ? 'Модератор заявок' : 'Судья площадки'}
              </div>
              <div class="admin-user-role">
                ${role === 'organizer' ? 'Полный доступ (Admin)' : role === 'judge' ? 'Судейство видео' : role === 'moderator' ? 'Очередь заявок' : 'Офлайн протокол'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- ОСНОВНАЯ ЗОНА -->
      <div class="admin-main">
        <header class="admin-topbar">
          <div class="admin-topbar-left">
            <button type="button" class="admin-sidebar-toggle" id="admin-toggle-sidebar" title="Меню">☰</button>
            <div class="admin-page-heading">
              <h2 class="admin-page-title">${getTabTitle(tab)}</h2>
              <p class="admin-page-sub">${getTabSubtitle(tab)}</p>
            </div>
          </div>

          <div class="admin-topbar-right">
            <div class="admin-role-switcher" title="Быстрое переключение роли для тестирования RBAC">
              <label>Роль:</label>
              <select class="admin-role-select" id="admin-role-select">
                <option value="organizer" ${role === 'organizer' ? 'selected' : ''}>Организатор (Full)</option>
                <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Модератор</option>
                <option value="judge" ${role === 'judge' ? 'selected' : ''}>Судья видео</option>
                <option value="onsite_admin" ${role === 'onsite_admin' ? 'selected' : ''}>Судья площадки</option>
              </select>
            </div>

            <button type="button" class="admin-btn secondary" data-go="home" title="Вернуться в клиентское приложение">
              <span>← В приложение</span>
            </button>
          </div>
        </header>

        <div class="admin-content-body" id="admin-content-slot">
          ${renderTabContent(tab, role)}
        </div>
      </div>
    </div>

    <!-- Контейнер модальных окон админки -->
    <div id="admin-modal-container"></div>
  `;
  } catch (renderError) {
    console.error('[Admin] renderAdminLayout fatal error:', renderError);
    container.innerHTML = `
      <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050b14">
        <div style="background:#0d1b2e;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:32px;max-width:540px;width:100%;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.5)">
          <div style="font-size:42px;margin-bottom:12px">🛡️</div>
          <h2 style="color:#fff;font-size:18px;margin:0 0 8px;font-family:'TT Squares','Unbounded',sans-serif">Панель организатора ФМГТО</h2>
          <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 20px">Восстановление сессии администратора. Нажмите кнопку ниже для чистого перезапуска.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button type="button" onclick="localStorage.removeItem('gto_admin_store_v1');location.reload();" style="background:#38bdf8;border:none;color:#000;font-weight:800;padding:10px 20px;border-radius:10px;cursor:pointer">
              🔄 Перезагрузить панель
            </button>
            <button type="button" onclick="location.hash='#home'" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;font-weight:700;padding:10px 20px;border-radius:10px;cursor:pointer">
              ← На главную
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

function getTabTitle(tab) {
  switch (tab) {
    case 'dashboard': return 'Сводный дашборд платформы';
    case 'events': return 'Управление мероприятиями';
    case 'applications': return 'Единый центр заявок';
    case 'judging': return 'Рабочее место судьи (видеофиксация)';
    case 'athletes': return 'Реестр спортсменов';
    case 'records': return 'Книга Рекордов России (321)';
    case 'results': return 'Официальные протоколы соревнований';
    case 'statistics': return 'Аналитика и отчётность';
    case 'checkin': return 'Очная комиссия по допуску (QR-чек-ин)';
    case 'merch': return 'Расчёт мерча, наград и дипломов';
    case 'catalogs': return 'Каталоги и справочники';
    case 'users': return 'Управление персоналом и доступом';
    case 'profile': return 'Профиль администратора и аудит';
    default: return 'Панель управления';
  }
}

function getTabSubtitle(tab) {
  switch (tab) {
    case 'dashboard': return 'Ключевые показатели соревнований, заявок и статусов в реальном времени';
    case 'events': return 'Жизненный цикл турниров ЕКП: от анонса до публикации протоколов';
    case 'applications': return 'Очередь онлайн-заявок с видео и очных заявок с документами';
    case 'judging': return 'Покадровый видеоплеер, стандарты No-Rep и фиксация повторов';
    case 'athletes': return '3 203 верифицированных профиля атлетов с защитой персональных данных';
    case 'records': return 'Реестр высших спортивных достижений Минспорта РФ';
    case 'results': return 'Итоговые таблицы личного и командного первенства';
    case 'statistics': return '6 интерактивных отчётов с выгрузкой в Excel';
    case 'checkin': return 'Сканирование QR-кода атлета, сверка справки 1144н, согласий и выдача стартового номера';
    case 'merch': return 'Сводка размеров экипировки, комплектов медалей и пакетная печать дипломов';
    case 'catalogs': return '6 системных справочников Федерации без вмешательства программистов';
    case 'users': return 'Ролевая модель RBAC: организаторы, судьи, модераторы';
    case 'profile': return 'Безопасность учетной записи и журнал действий';
    default: return 'Федерация многоборья ГТО России';
  }
}

function renderTabContent(tab, role) {
  switch (tab) {
    case 'dashboard': return renderDashboardTab();
    case 'events': return renderEventsTab(role);
    case 'applications': return renderApplicationsTab(role);
    case 'judging': return renderJudgingTab(role);
    case 'athletes': return renderAthletesTab(role);
    case 'records': return renderRecordsTab(role);
    case 'results': return renderResultsTab();
    case 'statistics': return renderStatisticsTab();
    case 'checkin': return renderCheckinTab(role);
    case 'merch': return renderMerchTab();
    case 'catalogs': return renderCatalogsTab(role);
    case 'users': return renderUsersTab(role);
    case 'profile': return renderProfileTab();
    default: return renderDashboardTab();
  }
}

// ---------------- 1. ДАШБОРД ----------------
function renderDashboardTab() {
  const pendingCount = store.applications.filter(a => a.status === 'under_review' || a.status === 'new').length;
  const judgingCount = store.applications.filter(a => a.status === 'judging').length;
  const approvedCount = store.applications.filter(a => a.status === 'approved').length;

  return `
    <div class="admin-metrics-grid">
      <div class="admin-metric-card" data-admin-tab="athletes">
        <div class="admin-metric-head">
          <span class="admin-metric-title">Атлеты в реестре</span>
          <span class="admin-metric-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></span>
        </div>
        <div class="admin-metric-value">${allAthletesCache.length || 3203}</div>
        <div class="admin-metric-foot"><span>Верифицировано в 85 субъектах РФ</span></div>
      </div>

      <div class="admin-metric-card" data-admin-tab="events">
        <div class="admin-metric-head">
          <span class="admin-metric-title">Мероприятий ЕКП</span>
          <span class="admin-metric-icon green"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
        </div>
        <div class="admin-metric-value">${allEventsCache.length || 113}</div>
        <div class="admin-metric-foot"><span>Календарный план Федерации</span></div>
      </div>

      <div class="admin-metric-card" data-admin-tab="applications">
        <div class="admin-metric-head">
          <span class="admin-metric-title">На модерации</span>
          <span class="admin-metric-icon red"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
        </div>
        <div class="admin-metric-value" style="color:#f87171">${pendingCount}</div>
        <div class="admin-metric-foot"><span>Требуют проверки анкеты</span></div>
      </div>

      <div class="admin-metric-card" data-admin-tab="judging">
        <div class="admin-metric-head">
          <span class="admin-metric-title">Очередь судейства</span>
          <span class="admin-metric-icon amber"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>
        </div>
        <div class="admin-metric-value" style="color:#fbbf24">${judgingCount}</div>
        <div class="admin-metric-foot"><span>Видеопопыток на отсмотре</span></div>
      </div>
    </div>

    <!-- Таблица активных турниров -->
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h3 class="admin-panel-title">
          <span>🏆 Текущие и ближайшие соревнования</span>
        </h3>
        <button type="button" class="admin-btn primary" id="admin-create-event-btn">
          <span>+ Новое мероприятие</span>
        </button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Мероприятие</th>
              <th>Город / Локация</th>
              <th>Даты</th>
              <th>Формат</th>
              <th>Статус</th>
              <th>Квота</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${(allEventsCache.slice(0, 6)).map(ev => `
              <tr>
                <td><small style="color:#64748b">#${ev.id}</small></td>
                <td><b>${esc(ev.title)}</b></td>
                <td>${esc(ev.city || '—')}</td>
                <td><small>${esc(ev.dates || '2026')}</small></td>
                <td><span class="admin-badge info">${esc(ev.format || 'Офлайн')}</span></td>
                <td>
                  ${ev.status === 'registration' ? '<span class="admin-badge success">● Регистрация</span>' :
                    ev.status === 'upcoming' ? '<span class="admin-badge warning">Предстоящее</span>' :
                    '<span class="admin-badge neutral">Завершено</span>'}
                </td>
                <td><b>128 / 200</b></td>
                <td>
                  <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px" data-admin-edit-event="${ev.id}">
                    ✏️ Редактор
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Недавние заявки на модерацию -->
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h3 class="admin-panel-title">
          <span>⚡ Срочная очередь: заявки участников</span>
        </h3>
        <button type="button" class="admin-btn secondary" data-admin-tab="applications">
          <span>Все заявки (${store.applications.length}) →</span>
        </button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Атлет</th>
              <th>Турнир</th>
              <th>Упражнение</th>
              <th>Заявленный результат</th>
              <th>Статус</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            ${store.applications.slice(0, 5).map(app => `
              <tr>
                <td><b>${app.id}</b></td>
                <td>${esc(app.athleteName)}<br><small style="color:#64748b">${app.region}</small></td>
                <td><small>${esc(app.eventTitle)}</small></td>
                <td>${esc(app.discipline)}</td>
                <td><b style="color:#38bdf8">${esc(app.claimedResult)}</b></td>
                <td>${renderStatusBadge(app.status)}</td>
                <td>
                  <button type="button" class="admin-btn accent" style="padding:4px 8px;font-size:11px" data-admin-review-app="${app.id}">
                    ${app.status === 'judging' ? '⚖️ Судейство' : '👁️ Модерация'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 2. МЕРОПРИЯТИЯ ----------------
function renderEventsTab(role) {
  const events = allEventsCache.length ? allEventsCache : [];
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <div class="admin-toolbar">
          <input type="search" class="admin-search-input" id="admin-events-search" placeholder="Поиск мероприятия, города...">
          <select class="admin-filter-select" id="admin-events-status-filter">
            <option value="all">Все статусы</option>
            <option value="registration">Идёт регистрация</option>
            <option value="upcoming">Предстоящие</option>
            <option value="past">Завершённые</option>
          </select>
          <select class="admin-filter-select" id="admin-events-format-filter">
            <option value="all">Все форматы</option>
            <option value="games">Игры ГТО</option>
            <option value="cup">Кубки и Первенства</option>
            <option value="champ">Чемпионаты России</option>
          </select>
        </div>
        ${role === 'organizer' ? `
          <button type="button" class="admin-btn primary" id="admin-create-event-btn">
            <span>+ Создать мероприятие</span>
          </button>
        ` : ''}
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название соревнований</th>
              <th>Город</th>
              <th>Сроки</th>
              <th>Формат</th>
              <th>Статус</th>
              <th>Управление</th>
            </tr>
          </thead>
          <tbody id="admin-events-table-body">
            ${events.map(ev => `
              <tr>
                <td><small style="color:#64748b">#${ev.id}</small></td>
                <td>
                  <b>${esc(ev.title)}</b>
                  ${ev.description ? `<br><small style="color:#94a3b8">${esc(ev.description.slice(0, 75))}...</small>` : ''}
                </td>
                <td>${esc(ev.city || '—')}</td>
                <td><small>${esc(ev.dates || '2026')}</small></td>
                <td>
                  <div style="display:flex;flex-direction:column;gap:3px">
                    <span class="admin-badge neutral" style="font-size:11px">${esc(ev.format || 'Очные соревнования')}</span>
                    ${ev.hasOnline ? `
                      <span class="admin-badge info" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:10px">⚡ Онлайн («Герой ГТО»)</span>
                    ` : ''}
                    ${ev.hasRecordTracking ? `
                      <span class="admin-badge warning" style="background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);font-size:10px">🏅 «Иду на рекорд»</span>
                    ` : ''}
                  </div>
                </td>
                <td>
                  ${ev.status === 'registration' ? '<span class="admin-badge success">● Регистрация</span>' :
                    ev.status === 'upcoming' ? '<span class="admin-badge warning">Предстоящее</span>' :
                    '<span class="admin-badge neutral">Завершено</span>'}
                </td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px" data-admin-edit-event="${ev.id}">
                      ✏️ Изменить
                    </button>
                    <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px;color:#a855f7;border-color:rgba(168,85,247,0.3)" data-admin-view-participants="${ev.id}">
                      👥 Участники
                    </button>
                    ${role === 'organizer' ? `
                      <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px;color:#38bdf8" data-admin-merch-event="${ev.id}">
                        👕 Мерч
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 3. ЗАЯВКИ И МОДЕРАЦИЯ ----------------
function renderApplicationsTab(role) {
  const hasApps = store.applications && store.applications.length > 0;
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <div class="admin-toolbar">
          <input type="search" class="admin-search-input" id="admin-apps-search" placeholder="Поиск по фамилии, номеру заявки...">
          <select class="admin-filter-select" id="admin-apps-status-filter">
            <option value="all">Все статусы</option>
            <option value="under_review">На модерации</option>
            <option value="judging">В судействе</option>
            <option value="approved">Одобрена</option>
            <option value="rejected">Отклонена</option>
          </select>
          <select class="admin-filter-select" id="admin-apps-format-filter">
            <option value="all">Любой формат</option>
            <option value="online">Онлайн (с видео)</option>
            <option value="offline">Офлайн (документы)</option>
          </select>
        </div>
        <div style="font-size:12px;color:#94a3b8">
          Всего заявок: <b>${store.applications.length}</b>
        </div>
      </div>

      ${!hasApps ? `
        <div class="admin-empty-state">
          <div class="aes-icon">📭</div>
          <b>Заявок пока нет</b>
          <p>Все новые онлайн-попытки из модуля «Герой ГТО» и очные заявки участников появятся в этом списке автоматически.</p>
        </div>
      ` : `
        <!-- Десктопная таблица заявок -->
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Участник</th>
                <th>Ступень / УИН</th>
                <th>Мероприятие</th>
                <th>Дисциплина</th>
                <th>Результат</th>
                <th>Формат</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody id="admin-apps-table-body">
              ${store.applications.map(app => {
                const isComplex = Boolean(app.exercises && app.exercises.length);
                return `
                <tr data-app-row="${app.id}">
                  <td><b>${esc(app.id)}</b><br><small style="color:#64748b">${esc(app.submittedDate)}</small></td>
                  <td>
                    <b>${esc(app.athleteName)}</b>
                    ${isComplex ? '<br><span class="admin-badge info" style="font-size:10px;margin-top:2px">🏆 Комплекс 3 видео</span>' : ''}
                    <br><small style="color:#64748b">${esc(app.region)}</small>
                  </td>
                  <td><small>${esc(app.uin || '—')}</small></td>
                  <td><small>${esc(app.eventTitle || app.tournamentName || 'Всероссийский турнир')}</small></td>
                  <td>
                    ${esc(app.discipline)}
                    ${isComplex ? `<br><small style="color:#38bdf8">${app.exercises.length} видео комплекса</small>` : ''}
                  </td>
                  <td><b style="color:#38bdf8">${esc(app.claimedResult)}</b></td>
                  <td><span class="admin-badge ${app.format === 'online' ? 'info' : 'neutral'}">${app.format === 'online' ? (isComplex ? '📹 Онлайн WOD' : '📹 Онлайн') : '📋 Офлайн'}</span></td>
                  <td>${renderStatusBadge(app.status)}</td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:nowrap">
                      ${isComplex ? `
                        <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px;white-space:nowrap" data-admin-toggle-complex="${app.id}" title="Развернуть/свернуть 3 видео">
                          <span>${app._isExpanded ? '▲ Свернуть' : '▼ 3 видео'}</span>
                        </button>
                      ` : ''}
                      <button type="button" class="admin-btn accent" style="padding:4px 8px;font-size:11px;white-space:nowrap" data-admin-review-app="${app.id}">
                        ${app.status === 'judging' ? '⚖️ Судейство' : '👁️ Проверить'}
                      </button>
                    </div>
                  </td>
                </tr>
                ${(isComplex && app._isExpanded) ? `
                  <tr class="admin-complex-drawer-row" data-complex-drawer-row="${app.id}">
                    <td colspan="9">
                      <div class="admin-complex-drawer">
                        <div class="admin-complex-drawer-header">
                          <div class="admin-complex-drawer-title">
                            <span>📹 Видеозаписи 3-х упражнений комплекса: <b>${esc(app.athleteName)}</b></span>
                          </div>
                          <div style="font-size:11.5px;color:#94a3b8">
                            Статус комплекса: <b>${app.status === 'approved' ? '✓ Одобрен' : app.status === 'reshoot_requested' ? '⚠️ На пересъёмке' : 'Ожидает судейства'}</b>
                          </div>
                        </div>
                        <div class="admin-complex-cards-grid">
                          ${app.exercises.map((ex, idx) => `
                            <div class="admin-complex-exercise-card">
                              <div class="acec-top">
                                <div class="acec-title"><b>${idx + 1}.</b> ${esc(ex.title)}</div>
                                ${renderExerciseStatusBadge(ex.status)}
                              </div>
                              <div class="acec-meta">
                                <span>Заявлено:</span>
                                <span class="acec-reps">${ex.reps} повт.</span>
                              </div>
                              ${ex.judgeReps !== undefined ? `
                                <div class="acec-meta">
                                  <span>Оценка судьи:</span>
                                  <span class="acec-judge-reps">${ex.judgeReps} повт.</span>
                                </div>
                              ` : ''}
                              <div class="acec-actions">
                                <button type="button" class="admin-btn accent" style="width:100%;padding:6px 10px;font-size:11.5px" data-admin-review-app="${app.id}" data-exercise-idx="${idx}">
                                  <span>⚖️ Открыть видео ${idx + 1} в судействе →</span>
                                </button>
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ` : ''}
              `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Мобильный список карточек (max-width: 768px) -->
        <div class="admin-card-list" id="admin-apps-card-list">
          ${store.applications.map(app => {
            const isComplex = Boolean(app.exercises && app.exercises.length);
            return `
            <div class="admin-app-card" data-app-card="${app.id}">
              <div class="aac-header">
                <span class="aac-id">${esc(app.id)}</span>
                ${renderStatusBadge(app.status)}
              </div>
              <div class="aac-athlete">
                ${esc(app.athleteName)}
                ${isComplex ? ' <span class="admin-badge info" style="font-size:10px">🏆 3 видео</span>' : ''}
              </div>
              <div class="aac-region">${esc(app.region || '—')} · ${esc(app.submittedDate || '')}</div>
              <div class="aac-details-grid">
                <div>
                  <small>Дисциплина</small>
                  <b>${esc(app.discipline || '—')}</b>
                </div>
                <div>
                  <small>Результат</small>
                  <b style="color:#38bdf8">${esc(app.claimedResult || '—')}</b>
                </div>
                <div>
                  <small>Формат</small>
                  <span>${app.format === 'online' ? (isComplex ? '📹 Онлайн WOD' : '📹 Онлайн') : '📋 Офлайн'}</span>
                </div>
                <div>
                  <small>УИН / Ступень</small>
                  <span>${esc(app.uin || '—')}</span>
                </div>
              </div>
              <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
                ${isComplex ? `
                  <button type="button" class="admin-btn secondary" style="flex:1;font-size:11.5px;padding:6px" data-admin-toggle-complex="${app.id}">
                    <span>${app._isExpanded ? '▲ Свернуть 3 видео' : '▼ 3 видео комплекса'}</span>
                  </button>
                ` : ''}
                <button type="button" class="admin-btn accent aac-action-btn" style="flex:1" data-admin-review-app="${app.id}">
                  ${app.status === 'judging' ? '⚖️ Судейство попытки' : '👁️ Проверить видео'}
                </button>
              </div>
              ${(isComplex && app._isExpanded) ? `
                <div class="admin-complex-drawer" style="margin-top:10px;border-radius:8px">
                  <div class="admin-complex-cards-grid">
                    ${app.exercises.map((ex, idx) => `
                      <div class="admin-complex-exercise-card">
                        <div class="acec-top">
                          <div class="acec-title"><b>${idx + 1}.</b> ${esc(ex.title)}</div>
                          ${renderExerciseStatusBadge(ex.status)}
                        </div>
                        <div class="acec-meta">
                          <span>Заявлено:</span>
                          <span class="acec-reps">${ex.reps} повт.</span>
                        </div>
                        ${ex.judgeReps !== undefined ? `
                          <div class="acec-meta">
                            <span>Оценка судьи:</span>
                            <span class="acec-judge-reps">${ex.judgeReps} повт.</span>
                          </div>
                        ` : ''}
                        <button type="button" class="admin-btn accent" style="width:100%;padding:6px 10px;font-size:11.5px" data-admin-review-app="${app.id}" data-exercise-idx="${idx}">
                          <span>⚖️ Открыть видео ${idx + 1} в судействе →</span>
                        </button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// ---------------- 4. СУДЕЙСТВО ВИДЕО ----------------
function renderJudgingTab(role) {
  try { syncEcosystemState(); } catch (_) {}

  let judgingApps = (store.applications || []).filter(a =>
    a.status === 'judging' || a.status === 'under_review' || a.format === 'online' || a.exercises?.length || a.discipline?.includes('рекорд') || a.isRecordAttempt
  );
  if (!judgingApps.length && store.applications?.length) {
    judgingApps = [...store.applications];
  }

  if (judgingApps.length < 2) {
    const demoRecordApp = {
      id: 'APP-REC-202601',
      athleteName: 'Соболев Дмитрий Александрович',
      uin: '26-66-0038491',
      region: 'Свердловская область',
      format: 'offline',
      discipline: 'Очный зачёт «Иду на рекорд» (Подтягивания с весом 16 кг)',
      claimedResult: '32 повт.',
      status: 'judging',
      isRecordAttempt: true,
      submittedDate: new Date().toLocaleDateString('ru-RU'),
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      rawVideo: { reps: 32, noReps: 0 }
    };
    const demoOnlineApp = {
      id: 'APP-WOD-202602',
      tournamentId: 'gordost-i-slava-2026',
      tournamentName: 'Всероссийский турнир «Гордость и Слава 2026»',
      athleteName: 'Васильева Екатерина Сергеевна',
      uin: '24-78-0091421',
      region: 'Санкт-Петербург',
      format: 'online',
      discipline: 'Онлайн-комплекс WOD (3 упражнения)',
      claimedResult: '22 повт. / 35 повт. / 28 повт.',
      status: 'judging',
      submittedDate: new Date().toLocaleDateString('ru-RU'),
      selectedExerciseIdx: 0,
      exercises: [
        { id: 'ex1', title: 'ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)', reps: 22, status: 'accepted', judgeReps: '22', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
        { id: 'ex2', title: 'ОТЖИМАНИЯ В УПОРЕ ЛЁЖА', reps: 35, status: 'pending', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
        { id: 'ex3', title: 'РЫВОК ГИРИ (16 КГ)', reps: 28, status: 'pending', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
      ]
    };
    if (!store.applications.some(a => a.id === demoRecordApp.id)) {
      store.applications.push(demoRecordApp);
      judgingApps.push(demoRecordApp);
    }
    if (!store.applications.some(a => a.id === demoOnlineApp.id)) {
      store.applications.push(demoOnlineApp);
      judgingApps.push(demoOnlineApp);
    }
  }

  const activeApp = (store.selectedAppId && store.applications.find(a => a.id === store.selectedAppId))
    || judgingApps[0]
    || store.applications[0];

  if (!activeApp) {
    return `
      <div class="admin-panel-card">
        <div class="admin-empty-state">
          <div class="aes-icon">⚖️</div>
          <b>Очередь судейства пуста</b>
          <p>Все видеозаписи из «Герой ГТО» после загрузки поступают на проверку главным судьёй. На данный момент нет ожидающих проверки записей.</p>
          <button type="button" class="admin-btn accent" style="margin-top:14px;padding:8px 16px;font-size:12px" data-admin-tab="applications">
            ← Перейти к списку заявок
          </button>
        </div>
      </div>
    `;
  }

  const isComplex = Boolean(activeApp.exercises && activeApp.exercises.length);
  const isRecordAttempt = Boolean(activeApp.isRecordAttempt || activeApp.discipline?.includes('рекорд') || activeApp.format === 'offline');
  const curExIdx = isComplex ? (activeApp.selectedExerciseIdx || 0) : 0;
  const curEx = isComplex ? (activeApp.exercises[curExIdx] || activeApp.exercises[0]) : null;
  const videoSrc = (curEx ? curEx.videoUrl : activeApp.videoUrl) || activeApp.videoUrl || '';
  const currentDiscipline = curEx ? curEx.title : (activeApp.discipline || 'Упражнение');
  const currentClaimed = curEx ? `${curEx.reps} повт.` : (activeApp.claimedResult || '0 повт.');
  const defaultJudgeResult = curEx?.judgeReps !== undefined ? `${curEx.judgeReps} повт.` : currentClaimed;

  return `
    <div class="admin-panel-card" style="margin-bottom:14px;padding:10px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <button type="button" class="admin-btn neutral" style="font-size:12px;padding:5px 10px" data-admin-tab="applications">
          ← К списку заявок
        </button>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="admin-badge ${isRecordAttempt ? 'warning' : 'info'}">${esc(activeApp.id)}</span>
          <span style="font-size:12px;color:#94a3b8">Дата заявки: ${esc(activeApp.submittedDate || '—')}</span>
        </div>
      </div>
    </div>

    <!-- ОЧЕРЕДЬ СУДЕЙСКОГО ОТСМОТРА: ГРУППИРОВКА ПО КАЖДОМУ УЧАСТНИКУ -->
    <div class="admin-judging-athlete-queue">
      <div class="ajaq-header">
        <div class="ajaq-title">
          <span>👥 Очередь судейского отсмотра (сгруппировано по участникам)</span>
        </div>
        <div class="ajaq-stats-badge">
          Участников в очереди: <b>${judgingApps.length}</b>
        </div>
      </div>
      <div class="ajaq-grid">
        ${judgingApps.map(app => {
          const isAct = app.id === activeApp.id;
          const hasExs = Boolean(app.exercises && app.exercises.length);
          const isRec = app.discipline?.includes('рекорд') || app.format === 'offline' || app.isRecordAttempt;
          return `
            <div class="ajaq-card ${isAct ? 'active' : ''}" data-judge-select-app="${app.id}">
              <div class="ajaq-card-top">
                <span class="ajaq-athlete-name">${esc(app.athleteName)}</span>
                <span class="admin-badge ${hasExs ? 'info' : isRec ? 'warning' : 'neutral'}" style="font-size:10px">
                  ${hasExs ? '📹 Комплекс (3 видео)' : isRec ? '🏟️ Иду на рекорд' : 'Видеопопытка'}
                </span>
              </div>
              <div class="ajaq-meta-line">
                <span>${esc(app.region || '—')} · ${esc(app.uin || '—')}</span>
                <span style="color:#38bdf8;font-weight:700">${esc(app.claimedResult || '—')}</span>
              </div>
              ${hasExs ? `
                <div class="ajaq-ex-strip">
                  ${app.exercises.map((ex, idx) => {
                    const isCur = isAct && idx === curExIdx;
                    const stCls = ex.status === 'accepted' ? 'accepted' : ex.status === 'reshoot' ? 'reshoot' : 'pending';
                    return `
                      <div class="ajaq-ex-chip ${isCur ? 'active' : ''}" data-judge-select-app="${app.id}" data-judge-ex-idx="${idx}" title="${esc(ex.title)}: ${ex.reps} повт.">
                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">#${idx + 1} ${ex.reps}п</span>
                        <span class="ajaq-status-dot ${stCls}"></span>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size:11px;color:${isRec ? '#f59e0b' : '#cbd5e1'};display:flex;align-items:center;gap:4px">
                  <span>${isRec ? '🏆 Попытка Рекорда РФ' : esc(app.discipline)}</span>
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${isComplex ? `
      <!-- Переключатель видеозаписей онлайн-комплекса атлета (3 видео) -->
      <div class="admin-judge-ex-switcher" style="margin-bottom:14px">
        ${activeApp.exercises.map((ex, i) => `
          <button type="button" class="admin-judge-ex-tab ${i === curExIdx ? 'active' : ''}" data-judge-ex-idx="${i}" data-app-id="${activeApp.id}">
            <span style="font-size:10px;color:${i === curExIdx ? '#38bdf8' : '#94a3b8'}">ВИДЕО ${i + 1} ИЗ ${activeApp.exercises.length}</span>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ex.title)}</span>
            <span style="font-size:11px;color:${ex.status === 'accepted' ? '#22c55e' : ex.status === 'reshoot' ? '#fbbf24' : '#38bdf8'}">
              ${ex.status === 'accepted' ? '✓ Зачтено: ' : ex.status === 'reshoot' ? '⚠️ Пересъёмка: ' : 'Заявлено: '}<b>${ex.reps} повт.</b>
            </span>
          </button>
        `).join('')}
      </div>
    ` : ''}

    <div class="admin-judging-split">
      <!-- Левая колонка: Видеоплеер -->
      <div class="admin-video-player-card">
        <video class="admin-judging-video" id="admin-video-inspect" src="${esc(videoSrc)}" controls playsinline></video>
        <div class="admin-video-controls">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#94a3b8;font-weight:700">Скорость:</span>
            <button type="button" class="admin-speed-chip active" data-speed="1">1.0x</button>
            <button type="button" class="admin-speed-chip" data-speed="0.5">0.5x</button>
            <button type="button" class="admin-speed-chip" data-speed="0.25">0.25x</button>
          </div>
          ${videoSrc ? `
            <a href="${esc(videoSrc)}" download="hero_${activeApp.id}_ex${curExIdx + 1}.webm" target="_blank" class="admin-btn neutral" style="font-size:11px;padding:3px 8px;text-decoration:none">
              📥 Скачать оригинал
            </a>
          ` : ''}
        </div>
        <div class="admin-judge-hotkeys" aria-label="Горячие клавиши">
          <span><kbd>Space</kbd> пауза</span>
          <span><kbd>←</kbd><kbd>→</kbd> кадр</span>
          <span><kbd>Shift</kbd>+<kbd>←→</kbd> ±1с</span>
          <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> скорость</span>
          <span><kbd>Z</kbd> зачёт</span>
          <span><kbd>X</kbd> no-rep</span>
        </div>
      </div>

      <!-- Правая колонка: Судейская карточка и стандарты -->
      <div class="admin-judging-meta">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span class="admin-badge ${isRecordAttempt ? 'warning' : 'info'}">${esc(activeApp.id)}</span>
            <span style="font-size:12px;color:#94a3b8">Формат: ${isComplex ? '📹 Онлайн WOD' : isRecordAttempt ? '🏟️ Очный зачёт «Иду на рекорд»' : '📋 Заявка'}</span>
          </div>
          <h3 style="margin:4px 0 2px;color:#fff;font-size:16px">${esc(activeApp.athleteName || 'Атлет')}</h3>
          <p style="margin:0;font-size:12px;color:#94a3b8">${esc(activeApp.region || '')} · УИН: ${esc(activeApp.uin || '—')}</p>
        </div>

        ${isComplex ? `
          <!-- Сводная таблица 3 видео комплекса атлета -->
          <div style="background:rgba(7,17,31,0.85);border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700">🏆 Онлайн-комплекс WOD (3 упражнения)</span>
              <span class="admin-badge info">${activeApp.exercises.filter(e => e.status === 'accepted').length} из ${activeApp.exercises.length} зачтено</span>
            </div>
            <table class="admin-complex-summary-table">
              <thead>
                <tr>
                  <th>Упражнение</th>
                  <th style="text-align:right">Заявлено</th>
                  <th style="text-align:right">Судья</th>
                  <th style="text-align:center">Статус</th>
                </tr>
              </thead>
              <tbody>
                ${activeApp.exercises.map((ex, i) => `
                  <tr style="background:${i === curExIdx ? 'rgba(56,189,248,0.1)' : 'transparent'};cursor:pointer" data-judge-ex-idx="${i}" data-app-id="${activeApp.id}">
                    <td style="padding:6px 8px;font-weight:${i === curExIdx ? '700' : '500'};color:${i === curExIdx ? '#fff' : '#cbd5e1'}">
                      ${i + 1}. ${esc(ex.title)}
                    </td>
                    <td style="padding:6px 8px;text-align:right;color:#38bdf8;font-weight:700">${ex.reps} повт.</td>
                    <td style="padding:6px 8px;text-align:right;color:#22c55e;font-weight:700">${ex.judgeReps !== undefined ? ex.judgeReps + ' повт.' : '—'}</td>
                    <td style="padding:6px 8px;text-align:center">
                      ${ex.status === 'accepted' ? '<span class="admin-badge success" style="font-size:10px">✓ Зачёт</span>' :
                        ex.status === 'reshoot' ? '<span class="admin-badge warning" style="font-size:10px">⚠️ Пересъёмка</span>' :
                        '<span class="admin-badge info" style="font-size:10px">Ожидает</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div style="background:rgba(7,17,31,0.85);border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700">Текущая дисциплина</div>
          <div style="font-size:14px;font-weight:800;color:#38bdf8;margin:2px 0 6px">${esc(currentDiscipline)}</div>
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700">Заявленный результат атлета</div>
          <div style="font-size:15px;font-weight:800;color:#22c55e">${esc(currentClaimed)}</div>
        </div>

        <!-- Стандарты выполнения -->
        <div class="admin-standards-box">
          <h5>Критерии зачёта (Valid Rep):</h5>
          <p>Строгая фиксация фаз движения, соблюдение амплитуды, отсутствие запрещённых инерционных движений.</p>
          <h5 style="margin-top:8px;color:#f87171">Критерии No-Rep:</h5>
          <p>Неполная амплитуда, отсутствие фиксации в контрольных точках, нарушение правил безопасности.</p>
        </div>

        <!-- Форма судейского вердикта -->
        <div>
          <label style="display:block;font-size:11.5px;font-weight:700;color:#93c5fd;text-transform:uppercase;margin-bottom:6px">
            Итоговый зачтённый результат судьи:
          </label>
          <div style="display:flex;gap:10px;margin-bottom:10px">
            <input type="text" class="admin-form-input" id="admin-judge-result-input" value="${esc(defaultJudgeResult)}" style="flex:1" placeholder="например: 26 повт.">
            <input type="number" class="admin-form-input" id="admin-judge-noreps-input" value="${activeApp.rawVideo?.noReps || 0}" style="width:100px" placeholder="No-Reps">
          </div>
          <textarea class="admin-form-textarea" id="admin-judge-notes" rows="2" style="width:100%;box-sizing:border-box" placeholder="Комментарий судьи (обязателен при No-Rep или требовании пересъёмки)..."></textarea>
        </div>

        <!-- Сравнение заявленного и проверенного результата -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700">Заявлено атлетом</span>
            <b style="font-size:15px;color:#38bdf8">${esc(currentClaimed)}</b>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700">Ошибок No-Rep (в таймлайне)</span>
            <b style="font-size:14px;color:#f87171" id="admin-judge-norep-display">${activeApp.rawVideo?.noReps || 0}</b>
          </div>
        </div>

        <div class="admin-judging-actions">
          ${isRecordAttempt ? `
            <button type="button" class="admin-btn primary" style="flex:1.5;background:linear-gradient(135deg,#f59e0b,#d97706);border-color:#fbbf24;color:#000;font-weight:800" id="admin-judge-record-accept-btn" data-app-id="${activeApp.id}">
              <span>🏆 Зачесть Рекорд РФ</span>
            </button>
          ` : `
            <button type="button" class="admin-btn success" style="flex:1" id="admin-judge-accept-btn" data-app-id="${activeApp.id}">
              <span>${isComplex ? `✓ Зачесть упр. ${curExIdx + 1}` : '✓ Зачесть'}</span>
            </button>
          `}
          <button type="button" class="admin-btn warning" style="flex:1" id="admin-judge-reshoot-btn" data-app-id="${activeApp.id}" title="Отклонить с правом пересъёмки (атлет получит статус в Моих заявках)">
            <span>⚠️ Пересъёмка</span>
          </button>
          <button type="button" class="admin-btn danger" style="flex:1" id="admin-judge-reject-btn" data-app-id="${activeApp.id}">
            <span>✗ Отклонить</span>
          </button>
        </div>
      </div>
    </div>
  `;
}


// ---------------- 5. УЧАСТНИКИ ----------------
function renderAthletesTab(role) {
  const athletes = allAthletesCache.slice(0, 100);
  const isOrganizer = role === 'organizer';

  return `
    <!-- Блок ручной модерации дубликатов (ТЗ Этап 2 / Master Data Layer) -->
    <div class="admin-panel-card" style="margin-bottom:20px;border-left:4px solid #38bdf8;background:linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.8))">
      <div class="admin-panel-header" style="margin-bottom:8px">
        <h3 style="margin:0;font-size:15px;color:#fff;display:flex;align-items:center;gap:8px">
          <span>👥 Ручная модерация дубликатов спортсменов (Identity Resolution)</span>
        </h3>
        <span class="admin-badge info">Master Data Layer</span>
      </div>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 14px;line-height:1.4">
        Система сопоставления находит спортсменов с похожими данными из архивных протоколов и новых онлайн-регистраций. Вы можете безопасно объединить профили с автоматическим сохранением всей истории и старых ID (aliases).
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">
        <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(56,189,248,0.3);border-radius:12px;padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="admin-badge info">Совпадение: 85%</span>
            <small style="color:#64748b">Рекомендация: Объединить</small>
          </div>
          <div style="font-size:13.5px;color:#fff;font-weight:700;margin-bottom:4px">
            Яворский Валерий Иванович
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">
            📍 Хабаровский край · Онлайн-заявка WOD 2026
          </div>
          <div style="font-size:12px;color:#cbd5e1;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:10px">
            ↕ <b>Яворский Валерий</b> (ATH-0000268) · 4 архивных старта (Кубок Дальнего Востока 2022–2026)
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="admin-btn primary" style="flex:1;padding:6px 10px;font-size:12px" data-admin-merge-pair="ATH-0000268" data-duplicate-name="Яворский Валерий Иванович">
              ✓ Объединить профили
            </button>
            <button type="button" class="admin-btn secondary" style="padding:6px 10px;font-size:12px;color:#94a3b8" onclick="this.closest('div[style*=background]').style.display='none'">
              Разные люди
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <div class="admin-toolbar">
          <input type="search" class="admin-search-input" id="admin-athletes-search" placeholder="Поиск спортсмена по фамилии, клубу, региону...">
          <select class="admin-filter-select" id="admin-athletes-gender-filter">
            <option value="all">Любой пол</option>
            <option value="M">Мужчины</option>
            <option value="W">Женщины</option>
          </select>
        </div>
        <div style="font-size:12px;color:#94a3b8">
          Всего в реестре: <b>${allAthletesCache.length || 3203}</b>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Athlete ID</th>
              <th>ФИО атлета</th>
              <th>Пол</th>
              <th>Субъект РФ</th>
              <th>Ступень / Разряд</th>
              <th>Контакты (ПДн)</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody id="admin-athletes-table-body">
            ${athletes.map((ath, idx) => {
              const athleteId = ath.athlete_id || ('ATH-' + String(ath.id || idx + 1).padStart(7, '0'));
              const name = ath.name || ath.fio || 'Атлет';
              const isRevealed = store.revealedAthletes?.includes(idx);
              const phone = isRevealed ? '+7 (916) 123-45-67' : '+7 (9**) ***-**-**';
              const email = isRevealed ? 'athlete@gto.com.ru' : 'a*****@***.ru';
              return `
                <tr>
                  <td><code style="color:#38bdf8;font-size:11.5px">${esc(athleteId)}</code></td>
                  <td><b>${esc(name)}</b></td>
                  <td><span class="admin-badge ${ath.gender === 'W' || ath.gender === 'Женщины' ? 'danger' : 'info'}">${ath.gender === 'W' || ath.gender === 'Женщины' ? 'Ж' : 'М'}</span></td>
                  <td>${esc(ath.region || '—')}</td>
                  <td><span class="admin-badge neutral">${esc(ath.rank || ath.stage || 'ВФСК ГТО')}</span></td>
                  <td>
                    <div style="font-size:11px;font-family:monospace">
                      <span>📞 ${phone}</span><br>
                      <span>✉️ ${email}</span>
                    </div>
                  </td>
                  <td>
                    ${isOrganizer ? `
                      <button type="button" class="admin-btn secondary" style="padding:4px 8px;font-size:11px" data-admin-reveal-pdn="${idx}">
                        ${isRevealed ? 'Скрыть' : '🔓 Раскрыть ПДн'}
                      </button>
                    ` : '<small style="color:#64748b">Скрыто по 152-ФЗ</small>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 6. КНИГА РЕКОРДОВ ----------------
function renderRecordsTab(role) {
  const records = getUnifiedRecords();
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <div class="admin-toolbar">
          <input type="search" class="admin-search-input" id="admin-records-search" placeholder="Поиск по дисциплине, рекордсмену...">
          <select class="admin-filter-select" id="admin-records-category-filter">
            <option value="all">Все категории</option>
            <option value="Профессионалы">Профессионалы</option>
            <option value="Продвинутые">Продвинутые</option>
            <option value="Любители">Любители</option>
          </select>
        </div>
        ${role === 'organizer' ? `
          <button type="button" class="admin-btn primary" id="admin-add-record-btn">
            <span>+ Зафиксировать новый Рекорд РФ</span>
          </button>
        ` : ''}
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Дисциплина</th>
              <th>Рекордсмен</th>
              <th>Рекорд</th>
              <th>Категория</th>
              <th>Возраст / Пол</th>
              <th>Турнир и дата фиксации</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${records.slice(0, 50).map(rec => `
              <tr>
                <td><b>${esc(rec.discipline || rec.ex)}</b></td>
                <td><b>${esc(rec.holder || rec.athlete || '—')}</b></td>
                <td><b style="color:#f59e0b;font-size:14px">${esc(rec.result || rec.res)}</b></td>
                <td><span class="admin-badge info">${esc(rec.category || 'Профессионалы')}</span></td>
                <td>${esc(rec.gender === 'W' ? 'Женщины' : 'Мужчины')}, ${esc(rec.age || '18-29')}</td>
                <td><small>${esc(rec.tournament || 'Игры ГТО')}, ${esc(rec.date || '2026')}</small></td>
                <td><span class="admin-badge success">✓ Верифицирован</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 7. ПРОТОКОЛЫ И ЛИДЕРБОРДЫ (Скриншоты 32, 33, 34) ----------------
function renderResultsTab() {
  const stage = store.tournamentStage || 'review';
  const subtab = store.resultsSubtab || 'results';

  return `
    <!-- Степпер этапов соревнований (Скриншот 32) -->
    <div class="admin-stage-stepper">
      <div class="admin-stage-step passed">
        <span class="admin-stage-step-num">✓</span>
        <span>1. Приём заявок</span>
      </div>
      <div class="admin-stage-step passed">
        <span class="admin-stage-step-num">✓</span>
        <span>2. Проведение и судейство</span>
      </div>
      <div class="admin-stage-step ${stage === 'review' ? 'active' : 'passed'}">
        <span class="admin-stage-step-num">${stage === 'published' ? '✓' : '3'}</span>
        <span>3. Подведение итогов</span>
      </div>
      <div class="admin-stage-step ${stage === 'published' ? 'active' : ''}">
        <span class="admin-stage-step-num">4</span>
        <span>4. Публикация результатов</span>
      </div>
    </div>

    <div class="admin-panel-card" style="margin-bottom:16px">
      <div class="admin-panel-header">
        <div>
          <h3 class="admin-panel-title"><span>🏆 Всероссийский турнир «Гордость и Слава 2026»</span></h3>
          <p style="margin:4px 0 0;font-size:12.5px;color:#94a3b8">
            Текущий статус этапа: <b style="color:${stage === 'published' ? '#4ade80' : '#38bdf8'}">${stage === 'published' ? 'Официально опубликовано' : 'Подведение итогов судейской коллегии'}</b>
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${stage === 'published' ? `
            <button type="button" class="admin-btn success" id="admin-stage-published-badge" disabled style="opacity:1">
              ✓ Результаты опубликованы
            </button>
          ` : `
            <button type="button" class="admin-btn accent" id="admin-publish-results-btn">
              ⚡ Опубликовать результаты соревнований
            </button>
          `}
          <button type="button" class="admin-btn secondary" id="admin-export-results-csv">
            <span>📥 CSV</span>
          </button>
        </div>
      </div>

      <!-- 3 вкладки Лидерборда: Результаты / Рекорды / Медали (Скриншоты 32, 33, 34) -->
      <div class="admin-subtabs-bar">
        <button type="button" class="admin-subtab-btn ${subtab === 'results' ? 'active' : ''}" data-results-subtab="results">
          📊 Результаты (Протокол)
        </button>
        <button type="button" class="admin-subtab-btn ${subtab === 'records' ? 'active' : ''}" data-results-subtab="records">
          ⚡ Рекорды турнира
        </button>
        <button type="button" class="admin-subtab-btn ${subtab === 'medals' ? 'active' : ''}" data-results-subtab="medals">
          🥇 Медали и регионы
        </button>
      </div>

      ${subtab === 'results' ? `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Место</th>
                <th>Атлет</th>
                <th>Субъект РФ</th>
                <th>Дивизион</th>
                <th>Комплекс №1</th>
                <th>Комплекс №2</th>
                <th>Сумма очков</th>
                <th>Диплом</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b style="color:#eab308;font-size:16px">🥇 1</b></td>
                <td><b>Соболев Дмитрий Александрович</b></td>
                <td>Свердловская область</td>
                <td><span class="admin-badge info">Профессионалы</span></td>
                <td>98 повт. (100 б.)</td>
                <td>03:14 (100 б.)</td>
                <td><b style="color:#38bdf8">200 очков</b></td>
                <td><span class="admin-badge success">🥇 Диплом I степени</span></td>
              </tr>
              <tr>
                <td><b style="color:#94a3b8;font-size:16px">🥈 2</b></td>
                <td><b>Кузнецов Максим Игоревич</b></td>
                <td>г. Санкт-Петербург</td>
                <td><span class="admin-badge info">Профессионалы</span></td>
                <td>92 повт. (94 б.)</td>
                <td>03:22 (95 б.)</td>
                <td><b style="color:#38bdf8">189 очков</b></td>
                <td><span class="admin-badge success">🥈 Диплом II степени</span></td>
              </tr>
              <tr>
                <td><b style="color:#d97706;font-size:16px">🥉 3</b></td>
                <td><b>Иванов Роман Сергеевич</b></td>
                <td>г. Москва</td>
                <td><span class="admin-badge info">Профессионалы</span></td>
                <td>88 повт. (90 б.)</td>
                <td>03:30 (91 б.)</td>
                <td><b style="color:#38bdf8">181 очко</b></td>
                <td><span class="admin-badge success">🥉 Диплом III степени</span></td>
              </tr>
              <tr>
                <td><b style="color:#94a3b8">4</b></td>
                <td><b>Васильев Артём Евгеньевич</b></td>
                <td>Краснодарский край</td>
                <td><span class="admin-badge info">Профессионалы</span></td>
                <td>85 повт. (87 б.)</td>
                <td>03:35 (88 б.)</td>
                <td><b style="color:#38bdf8">175 очков</b></td>
                <td><span class="admin-badge neutral">Сертификат финалиста</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : subtab === 'records' ? `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Дисциплина</th>
                <th>Рекордсмен турнира</th>
                <th>Субъект РФ</th>
                <th>Рекорд</th>
                <th>Предыдущий</th>
                <th>Статус фиксации</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Подтягивания на перекладине (строгие)</b></td>
                <td><b>Соболев Дмитрий Александрович</b></td>
                <td>Свердловская область</td>
                <td><b style="color:#f59e0b;font-size:15px">98 повт.</b></td>
                <td>94 повт.</td>
                <td><span class="admin-badge success">⚡ Новый рекорд турнира</span></td>
              </tr>
              <tr>
                <td><b>Рывок гири 24 кг (10 минут)</b></td>
                <td><b>Кузнецов Максим Игоревич</b></td>
                <td>г. Санкт-Петербург</td>
                <td><b style="color:#f59e0b;font-size:15px">248 повт.</b></td>
                <td>241 повт.</td>
                <td><span class="admin-badge success">⚡ Новый рекорд турнира</span></td>
              </tr>
              <tr>
                <td><b>Отжимания в упоре лёжа (строгие)</b></td>
                <td><b>Иванов Роман Сергеевич</b></td>
                <td>г. Москва</td>
                <td><b style="color:#f59e0b;font-size:15px">88 повт.</b></td>
                <td>85 повт.</td>
                <td><span class="admin-badge success">✓ Подтверждён</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Место</th>
                <th>Субъект РФ / Сборная</th>
                <th>🥇 Золото</th>
                <th>🥈 Серебро</th>
                <th>🥉 Бронза</th>
                <th>Всего медалей</th>
                <th>Командные очки</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b style="color:#eab308;font-size:16px">🥇 1</b></td>
                <td><b>Свердловская область</b></td>
                <td><b style="color:#eab308">4</b></td>
                <td>2</td>
                <td>1</td>
                <td><b>7</b></td>
                <td><b style="color:#38bdf8">480 б.</b></td>
              </tr>
              <tr>
                <td><b style="color:#94a3b8;font-size:16px">🥈 2</b></td>
                <td><b>г. Москва</b></td>
                <td><b style="color:#eab308">3</b></td>
                <td>4</td>
                <td>2</td>
                <td><b>9</b></td>
                <td><b style="color:#38bdf8">465 б.</b></td>
              </tr>
              <tr>
                <td><b style="color:#d97706;font-size:16px">🥉 3</b></td>
                <td><b>г. Санкт-Петербург</b></td>
                <td><b style="color:#eab308">2</b></td>
                <td>3</td>
                <td>3</td>
                <td><b>8</b></td>
                <td><b style="color:#38bdf8">410 б.</b></td>
              </tr>
              <tr>
                <td><b>4</b></td>
                <td><b>Краснодарский край</b></td>
                <td><b style="color:#eab308">1</b></td>
                <td>2</td>
                <td>2</td>
                <td><b>5</b></td>
                <td><b style="color:#38bdf8">320 б.</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ---------------- 8. ОЧНЫЙ QR-ЧЕК-ИН И МАНДАТНАЯ КОМИССИЯ (Скриншоты 25, 26, 27) ----------------
function renderCheckinTab(role) {
  const checkedIn = store.checkedInAthletes || [];
  const activeCandidate = store.activeCheckinCandidate || null;

  return `
    <div class="admin-panel-card" style="margin-bottom:16px">
      <div class="admin-panel-header">
        <div>
          <h3 class="admin-panel-title"><span>📲 Очная мандатная комиссия и QR-чек-ин</span></h3>
          <p style="margin:4px 0 0;font-size:12.5px;color:#94a3b8">
            Сканирование QR-кода профиля атлета из мобильного «Герой ГТО», проверка допуска 1144н и выдача стартового номера.
          </p>
        </div>
        <div style="font-size:12px;color:#94a3b8">
          Допущено сегодня: <b style="color:#22c55e;font-size:15px">${checkedIn.length}</b> чел.
        </div>
      </div>

      <!-- Поле поиска / Сканер QR -->
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <input type="search" class="admin-search-input" id="admin-checkin-search-input" placeholder="Сканируйте QR-код сканером или введите ФИО / УИН..." style="flex:1;min-width:260px">
        <button type="button" class="admin-btn accent" id="admin-checkin-lookup-btn">
          🔍 Найти участника
        </button>
        <button type="button" class="admin-btn neutral" id="admin-checkin-demo-btn" title="Подставить атлета для быстрой проверки">
          ⚡ Тест: Быстрый скан
        </button>
      </div>
    </div>

    ${activeCandidate ? `
      <!-- Карточка мандатной комиссии атлета -->
      <div class="admin-panel-card" style="margin-bottom:16px;border:1px solid rgba(56, 189, 248, 0.3);background:linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(7,17,31,0.95) 100%)">
        <div class="admin-checkin-grid">
          <!-- Левая колонка: Профиль атлета -->
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:center;font-weight:800;color:#38bdf8;font-size:18px">
                ${esc(activeCandidate.name ? activeCandidate.name.charAt(0) : 'А')}
              </div>
              <div>
                <h3 style="margin:0 0 3px;font-size:17px;color:#fff">${esc(activeCandidate.name || 'Атлет')}</h3>
                <div style="font-size:12px;color:#94a3b8">
                  ${esc(activeCandidate.region || 'Субъект РФ')} · Пол: <b>${activeCandidate.gender === 'W' ? 'Женский' : 'Мужской'}</b> · ${esc(activeCandidate.rank || 'ВФСК ГТО')}
                </div>
              </div>
            </div>

            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:#94a3b8">УИН ВФСК ГТО:</span>
                <b style="color:#f1f5f9">${esc(activeCandidate.uin || '26-77-0019284')}</b>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:#94a3b8">Дивизион / Категория:</span>
                <b style="color:#38bdf8">${esc(activeCandidate.stage || 'Профессионалы (18-29 лет)')}</b>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px">
                <span style="color:#94a3b8">Статус оплаты взноса:</span>
                <b style="color:#22c55e">✓ Оплачен (ЕКП Минспорта РФ)</b>
              </div>
            </div>

            <!-- Стартовый пакет -->
            <div style="display:flex;gap:10px">
              <div style="flex:1">
                <label style="display:block;font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">СТАРТОВЫЙ НОМЕР</label>
                <input type="number" class="admin-form-input" id="admin-checkin-bib-num" value="${checkedIn.length + 101}" style="font-weight:800;font-size:16px;color:#38bdf8">
              </div>
              <div style="flex:1">
                <label style="display:block;font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">RFID-БРАСЛЕТ</label>
                <input type="text" class="admin-form-input" id="admin-checkin-rfid" value="CHIP-${1000 + checkedIn.length + 1}" style="font-size:13px">
              </div>
            </div>
          </div>

          <!-- Правая колонка: Проверка документов -->
          <div>
            <div style="font-size:12px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">
              Верификация документов мандатной комиссией:
            </div>
            <div class="admin-doc-check-box">
              <label class="admin-doc-check-item">
                <input type="checkbox" id="checkin-doc-id" checked>
                <span><b>Паспорт РФ</b> / Свидетельство о рождении проверено</span>
              </label>
              <label class="admin-doc-check-item">
                <input type="checkbox" id="checkin-doc-med" checked>
                <span><b>Медицинское заключение 1144н</b> (со штампом врача ЛФК, годен)</span>
              </label>
              <label class="admin-doc-check-item">
                <input type="checkbox" id="checkin-doc-consent" checked>
                <span><b>Согласие</b> на участие и обработку персональных данных</span>
              </label>
              <label class="admin-doc-check-item">
                <input type="checkbox" id="checkin-doc-insurance" checked>
                <span><b>Спортивная страховка</b> от несчастных случаев (действующая)</span>
              </label>
            </div>

            <div style="margin-top:16px;display:flex;gap:10px">
              <button type="button" class="admin-btn success" id="admin-confirm-checkin-btn" style="flex:1;padding:12px;font-size:13px;font-weight:800">
                ✓ ПОДТВЕРДИТЬ ДОПУСК И ВЫДАТЬ НОМЕР
              </button>
              <button type="button" class="admin-btn neutral" id="admin-cancel-checkin-btn" style="padding:12px">
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Таблица допущенных сегодня участников -->
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h4 class="admin-panel-title"><span>Реестр очного допуска турнира (${checkedIn.length})</span></h4>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Номер</th>
              <th>ФИО атлета</th>
              <th>Субъект РФ</th>
              <th>Категория</th>
              <th>Справка 1144н</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${checkedIn.length ? checkedIn.map(item => `
              <tr>
                <td><small style="color:#94a3b8">${esc(item.time)}</small></td>
                <td><b style="color:#38bdf8;font-size:14px">#${esc(item.bib)}</b></td>
                <td><b>${esc(item.name)}</b></td>
                <td>${esc(item.region || '—')}</td>
                <td><span class="admin-badge neutral">${esc(item.category || 'Общая')}</span></td>
                <td><span class="admin-badge success">✓ Проверена (1144н)</span></td>
                <td><span class="admin-badge success">Допущен к стартам</span></td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7" style="text-align:center;color:#64748b;padding:24px">
                  Пока никто не зарегистрирован на площадке. Отсканируйте QR-код участника.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 8. СТАТИСТИКА ----------------
function renderStatisticsTab() {
  return `
    <div class="admin-metrics-grid">
      <div class="admin-metric-card">
        <div class="admin-metric-head"><span class="admin-metric-title">Всего заявок</span></div>
        <div class="admin-metric-value">1 428</div>
        <div class="admin-metric-foot"><span>+18% к прошлому сезону</span></div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-head"><span class="admin-metric-title">Конверсия судейства</span></div>
        <div class="admin-metric-value" style="color:#34d399">94.2%</div>
        <div class="admin-metric-foot"><span>Успешный зачёт с первой попытки</span></div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-head"><span class="admin-metric-title">Рекордов обновлено</span></div>
        <div class="admin-metric-value" style="color:#f59e0b">14</div>
        <div class="admin-metric-foot"><span>За сезон 2026 года</span></div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-head"><span class="admin-metric-title">Активных регионов</span></div>
        <div class="admin-metric-value">49</div>
        <div class="admin-metric-foot"><span>Из 85 аккредитованных субъектов</span></div>
      </div>
    </div>

    <div class="admin-panel-card">
      <h3 class="admin-panel-title" style="margin-bottom:14px"><span>📈 Распределение участников по ступеням ВФСК ГТО</span></h3>
      <div style="display:grid;gap:12px">
        ${[
          { label: 'VII ступень (18–19 лет)', count: 482, pct: 34 },
          { label: 'VIII ступень (20–24 года)', count: 412, pct: 29 },
          { label: 'IX ступень (25–29 лет)', count: 288, pct: 20 },
          { label: 'VI ступень (16–17 лет)', count: 142, pct: 10 },
          { label: 'X–XII ступени (30–44 года)', count: 104, pct: 7 }
        ].map(item => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <b>${item.label}</b>
              <span style="color:#94a3b8">${item.count} чел. (${item.pct}%)</span>
            </div>
            <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden">
              <div style="width:${item.pct}%;height:100%;background:linear-gradient(90deg, #38bdf8, #ef4444);border-radius:4px"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------- 9. МЕРЧ И ДИПЛОМЫ ----------------
function renderMerchTab() {
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h3 class="admin-panel-title"><span>👕 Сводный расчёт экипировки к мероприятию</span></h3>
        <select class="admin-filter-select" id="admin-merch-select-event" style="min-width:260px">
          ${(allEventsCache.slice(0, 10)).map(ev => `
            <option value="${ev.id}">#${ev.id} — ${esc(ev.title)}</option>
          `).join('')}
        </select>
      </div>

      <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:16px">
        Автоматический расчёт тиражей футболок, наградных комплектов медалей и кубков на основе зарегистрированных участников и судейской бригады.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:20px">
        <!-- Футболки участников -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:12px;font-weight:700;color:#38bdf8;text-transform:uppercase;margin-bottom:10px">
            🎽 Футболки участников (128 шт.)
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;font-size:12px">
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>XS</small><br><b>14</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>S</small><br><b>32</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>M</small><br><b>44</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>L</small><br><b>26</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>XL</small><br><b>10</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>XXL</small><br><b>2</b></div>
          </div>
        </div>

        <!-- Футболки судей -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:12px;font-weight:700;color:#f87171;text-transform:uppercase;margin-bottom:10px">
            👔 Судейская форма (18 шт.)
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;font-size:12px">
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>S</small><br><b>2</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>M</small><br><b>8</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>L</small><br><b>6</b></div>
            <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;text-align:center"><small>XL</small><br><b>2</b></div>
          </div>
        </div>

        <!-- Награды и кубки -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:12px;font-weight:700;color:#fbbf24;text-transform:uppercase;margin-bottom:10px">
            🏆 Наградной фонд
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
            <div style="display:flex;justify-content:space-between"><span>🥇 Золотые медали:</span><b>12 шт.</b></div>
            <div style="display:flex;justify-content:space-between"><span>🥈 Серебряные медали:</span><b>12 шт.</b></div>
            <div style="display:flex;justify-content:space-between"><span>🥉 Бронзовые медали:</span><b>12 шт.</b></div>
            <div style="display:flex;justify-content:space-between"><span>🏆 Кубки абсолютного зачёта:</span><b>4 шт.</b></div>
          </div>
        </div>
      </div>

      <div class="admin-panel-header" style="margin-top:20px">
        <h4 class="admin-panel-title"><span>🖨️ Пакетная генерация дипломов</span></h4>
        <div style="display:flex;gap:8px">
          <button type="button" class="admin-btn primary" id="admin-batch-diploma-btn">
            <span>Сформировать PDF всех дипломов</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---------------- 10. СПРАВОЧНИКИ ----------------
function renderCatalogsTab(role) {
  const cats = store.catalogs || DEFAULT_CATALOGS;
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h3 class="admin-panel-title"><span>📚 Системные каталоги Федерации (6)</span></h3>
      </div>
      <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:16px">
        Справочники редактируются организаторами прямо в интерфейсе без необходимости выкатки кода программистами.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px">
        <!-- Возрастные группы -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b>Ступени ГТО (${cats.age_groups.length})</b>
            <span class="admin-badge info">I–XVIII</span>
          </div>
          <div style="font-size:12px;color:#cbd5e1;display:flex;flex-direction:column;gap:6px">
            ${cats.age_groups.slice(0, 5).map(g => `<div>${g.title} (${g.min}–${g.max} лет)</div>`).join('')}
            <small style="color:#64748b">+ ещё ${cats.age_groups.length - 5} возрастных ступеней</small>
          </div>
        </div>

        <!-- Дивизионы -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b>Дивизионы участия (${cats.divisions.length})</b>
          </div>
          <div style="font-size:12px;color:#cbd5e1;display:flex;flex-direction:column;gap:6px">
            ${cats.divisions.map(d => `<div><b>${d.title}</b><br><small style="color:#64748b">${d.desc}</small></div>`).join('')}
          </div>
        </div>

        <!-- Требуемые документы -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b>Обязательные документы (${cats.documents.length})</b>
          </div>
          <div style="font-size:12px;color:#cbd5e1;display:flex;flex-direction:column;gap:6px">
            ${cats.documents.map(doc => `<div>${doc.required ? '🔴' : '⚪'} ${doc.title}</div>`).join('')}
          </div>
        </div>

        <!-- Командные форматы -->
        <div style="background:rgba(7,17,31,0.7);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b>Командные форматы (${cats.team_formats.length})</b>
          </div>
          <div style="font-size:12px;color:#cbd5e1;display:flex;flex-direction:column;gap:6px">
            ${cats.team_formats.map(tf => `<div><b>${tf.title}</b><br><small style="color:#64748b">${tf.desc}</small></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------------- 11. ПОЛЬЗОВАТЕЛИ / ДОСТУП ----------------
function renderUsersTab(role) {
  return `
    <div class="admin-panel-card">
      <div class="admin-panel-header">
        <h3 class="admin-panel-title"><span>👥 Штат сотрудников и роли (RBAC)</span></h3>
        ${role === 'organizer' ? `
          <button type="button" class="admin-btn primary" id="admin-invite-user-btn">
            <span>+ Пригласить сотрудника</span>
          </button>
        ` : ''}
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Email</th>
              <th>Роль в системе</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${store.users.map(u => `
              <tr>
                <td><b>${esc(u.name)}</b></td>
                <td><small style="color:#38bdf8">${esc(u.email)}</small></td>
                <td>
                  <span class="admin-badge ${u.role === 'organizer' ? 'info' : u.role === 'judge' ? 'warning' : 'neutral'}">
                    ${u.role === 'organizer' ? 'Организатор (Full)' : u.role === 'judge' ? 'Судья видео' : u.role === 'moderator' ? 'Модератор' : 'Судья площадки'}
                  </span>
                </td>
                <td><small>${esc(u.phone)}</small></td>
                <td><span class="admin-badge success">● Активен</span></td>
                <td>
                  <button type="button" class="admin-btn secondary" style="padding:3px 8px;font-size:11px">Настроить</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- 12. ПРОФИЛЬ И АУДИТ ----------------
function renderProfileTab() {
  return `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:20px">
      <div class="admin-panel-card">
        <h3 class="admin-panel-title" style="margin-bottom:14px"><span>👤 Профиль администратора</span></h3>
        <div class="admin-form-group">
          <label>Имя сотрудника</label>
          <input type="text" class="admin-form-input" value="Алексей Михайлин" readonly>
        </div>
        <div class="admin-form-group">
          <label>Рабочий Email</label>
          <input type="text" class="admin-form-input" value="admin@gto.com.ru" readonly>
        </div>
        <div class="admin-form-group">
          <label>Уровень доступа</label>
          <input type="text" class="admin-form-input" value="Организатор (Главный администратор)" readonly>
        </div>
        <button type="button" class="admin-btn secondary" style="margin-top:6px">Сменить пароль</button>
      </div>

      <div class="admin-panel-card">
        <h3 class="admin-panel-title" style="margin-bottom:14px"><span>🔒 Журнал аудита безопасности</span></h3>
        <div style="font-size:12px;font-family:monospace;display:flex;flex-direction:column;gap:8px">
          ${store.auditLog.map(log => `
            <div style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:8px;border-left:3px solid #38bdf8">
              <span style="color:#64748b">[${log.time}]</span> <b>${esc(log.user)}:</b> ${esc(log.text)}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Вспомогательные функции
function renderStatusBadge(status) {
  switch (status) {
    case 'under_review': return '<span class="admin-badge warning">⏳ На модерации</span>';
    case 'judging': return '<span class="admin-badge info">⚖️ В судействе</span>';
    case 'approved': return '<span class="admin-badge success">✓ Одобрена</span>';
    case 'rejected': return '<span class="admin-badge danger">✗ Отклонена</span>';
    case 'reshoot_requested': return '<span class="admin-badge warning">⚠️ Пересъёмка</span>';
    case 'waitlist': return '<span class="admin-badge neutral">Лист ожидания</span>';
    default: return '<span class="admin-badge neutral">Новая</span>';
  }
}

function renderExerciseStatusBadge(status) {
  switch (status) {
    case 'accepted': return '<span class="admin-badge success" style="font-size:10px">✓ Зачёт</span>';
    case 'reshoot': return '<span class="admin-badge warning" style="font-size:10px">⚠️ Пересъёмка</span>';
    case 'rejected': return '<span class="admin-badge danger" style="font-size:10px">✗ No-Rep</span>';
    default: return '<span class="admin-badge info" style="font-size:10px">⏳ Ожидает</span>';
  }
}

const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ================= ОБРАБОТЧИКИ СОБЫТИЙ =================
function syncSpeedChips(speed) {
  document.querySelectorAll('.admin-speed-chip').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.speed || '1') === speed);
  });
}

function bindAdminEvents(container) {
  if (container._adminEventsBound) return;
  container._adminEventsBound = true;

  // v120: горячие клавиши рабочего места видеосудьи (активны только на вкладке «Судейство»)
  document.addEventListener('keydown', (e) => {
    if (!store || store.activeTab !== 'judging') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const video = document.getElementById('admin-video-inspect');
    const FRAME = 1 / 30; // покадровый шаг при 30 fps
    switch (e.key) {
      case ' ':
        if (video) { e.preventDefault(); video.paused ? video.play() : video.pause(); }
        break;
      case 'ArrowRight':
        if (video) { e.preventDefault(); video.pause(); video.currentTime = Math.min((video.duration || 1e9), video.currentTime + (e.shiftKey ? 1 : FRAME)); }
        break;
      case 'ArrowLeft':
        if (video) { e.preventDefault(); video.pause(); video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 1 : FRAME)); }
        break;
      case '1': if (video) { video.playbackRate = 1; syncSpeedChips(1); } break;
      case '2': if (video) { video.playbackRate = 0.5; syncSpeedChips(0.5); } break;
      case '3': if (video) { video.playbackRate = 0.25; syncSpeedChips(0.25); } break;
      case 'z': case 'Z': case 'я': case 'Я': {
        const b = document.getElementById('admin-judge-accept-btn'); if (b) { e.preventDefault(); b.click(); } break;
      }
      case 'x': case 'X': case 'ч': case 'Ч': {
        const b = document.getElementById('admin-judge-reject-btn'); if (b) { e.preventDefault(); b.click(); } break;
      }
    }
  });

  container.addEventListener('click', e => {
    // Переключение табов
    const tabBtn = e.target.closest('[data-admin-tab]');
    if (tabBtn) {
      store.activeTab = tabBtn.dataset.adminTab;
      saveAdminStore();
      setAdminBackdrop(false); // закрыть мобильный сайдбар при выборе раздела
      renderAdminLayout(container);
      return;
    }

    // Мобильный сайдбар (с затемняющим бэкдропом)
    if (e.target.closest('#admin-toggle-sidebar')) {
      const sidebar = document.getElementById('admin-sidebar');
      if (sidebar) {
        const opening = !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', opening);
        setAdminBackdrop(opening);
      }
      return;
    }

    // Раскрытие ПДн (с аудит-логом)
    const pdnBtn = e.target.closest('[data-admin-reveal-pdn]');
    if (pdnBtn) {
      const idx = Number(pdnBtn.dataset.adminRevealPdn);
      if (!store.revealedAthletes) store.revealedAthletes = [];
      if (store.revealedAthletes.includes(idx)) {
        store.revealedAthletes = store.revealedAthletes.filter(x => x !== idx);
      } else {
        store.revealedAthletes.push(idx);
        store.auditLog.unshift({
          time: new Date().toLocaleTimeString('ru-RU'),
          text: `Раскрытие персональных данных атлета #${idx + 1}`,
          user: 'admin@gto.com.ru'
        });
        adminToast('ПДн раскрыты — действие записано в журнал (152-ФЗ)', 'info');
      }
      saveAdminStore();
      renderAdminLayout(container);
      return;
    }

    // Объединение профилей спортсменов (Identity Resolution)
    const mergeBtn = e.target.closest('[data-admin-merge-pair]');
    if (mergeBtn) {
      const primaryId = mergeBtn.dataset.adminMergePair;
      const dupName = mergeBtn.dataset.duplicateName;
      if (confirm(`Объединить профиль «${dupName}» с каноническим профилем ${primaryId}? Все старты и рекорды сохранятся.`)) {
        adminToast(`Профили успешно объединены в ${primaryId}. Alias сохранён!`, 'success');
        const card = mergeBtn.closest('div[style*=background]');
        if (card) {
          card.innerHTML = `<div style="color:#86efac;font-weight:700;font-size:13px;padding:6px 0">✓ Профили успешно объединены в ${primaryId}. История сохранена в Master Data.</div>`;
        }
      }
      return;
    }

    // Выбор атлета в очереди судейского отсмотра (группировка по каждому участнику)
    const judgeSelectApp = e.target.closest('[data-judge-select-app]');
    if (judgeSelectApp) {
      const appId = judgeSelectApp.dataset.judgeSelectApp;
      store.selectedAppId = appId;
      const app = store.applications.find(a => a.id === appId);
      if (app && app.exercises && app.exercises.length) {
        const curIdx = app.selectedExerciseIdx || 0;
        if (app.exercises[curIdx]?.videoUrl) {
          app.videoUrl = app.exercises[curIdx].videoUrl;
        }
      }
      saveAdminStore();
      renderAdminLayout(container);
      return;
    }

    // Переключение видеозаписи упражнения в судействе комплекса (3 видео)
    const judgeExBtn = e.target.closest('[data-judge-ex-idx]');
    if (judgeExBtn) {
      const idx = parseInt(judgeExBtn.dataset.judgeExIdx, 10);
      const appId = judgeExBtn.dataset.appId;
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        app.selectedExerciseIdx = idx;
        if (app.exercises && app.exercises[idx]?.videoUrl) {
          app.videoUrl = app.exercises[idx].videoUrl;
        }
        saveAdminStore();
        renderAdminLayout(container);
      }
      return;
    }

    // Судейство: Зачесть Рекорд РФ («Иду на рекорд»)
    if (e.target.closest('#admin-judge-record-accept-btn')) {
      const appId = e.target.closest('#admin-judge-record-accept-btn').dataset.appId;
      const resVal = document.getElementById('admin-judge-result-input')?.value || 'Рекорд зачтён';
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        app.status = 'approved';
        app.judgeDecision = {
          result: resVal,
          judge: 'Главный судья Соболев Д.',
          time: new Date().toLocaleDateString('ru-RU')
        };
        addUnifiedRecord({
          discipline: app.discipline || 'Иду на рекорд',
          holder: app.athleteName || 'Атлет',
          result: resVal,
          category: app.category || 'Профессионалы',
          gender: app.gender || 'M',
          age: app.age || '18-29',
          tournament: app.tournamentTitle || 'Игры ГТО 2026 (Очный зачёт)',
          date: new Date().toLocaleDateString('ru-RU')
        });
        store.auditLog.unshift({
          time: new Date().toLocaleTimeString('ru-RU'),
          text: `🏆 Зафиксирован рекорд РФ: ${app.athleteName} — ${app.discipline} (${resVal})`,
          user: 'chief_judge@gto.com.ru'
        });
        adminToast(`🏆 Официальный Рекорд РФ зачтён: ${app.athleteName} — ${resVal}!`, 'success');
        saveAdminStore();
        renderAdminLayout(container);
      }
      return;
    }

    // Судейство: Зачесть
    if (e.target.closest('#admin-judge-accept-btn')) {
      const appId = e.target.closest('#admin-judge-accept-btn').dataset.appId;
      const resVal = document.getElementById('admin-judge-result-input')?.value || 'Зачтено';
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        if (app.exercises && app.exercises.length) {
          const curIdx = app.selectedExerciseIdx || 0;
          const curEx = app.exercises[curIdx];
          if (curEx) {
            curEx.status = 'accepted';
            curEx.judgeReps = resVal;
          }
          const allDone = app.exercises.every(e => e.status === 'accepted');
          if (allDone) {
            app.status = 'approved';
            app.judgeDecision = {
              result: app.exercises.map(e => `${e.judgeReps || e.reps} повт.`).join(' / '),
              judge: 'Главный судья Соболев Д.',
              time: new Date().toLocaleDateString('ru-RU')
            };
            adminToast(`Все 3 упражнения комплекса атлета ${app.athleteName} зачтены!`, 'success');
          } else {
            const nextIdx = app.exercises.findIndex(e => e.status !== 'accepted');
            if (nextIdx !== -1) {
              app.selectedExerciseIdx = nextIdx;
              if (app.exercises[nextIdx]?.videoUrl) app.videoUrl = app.exercises[nextIdx].videoUrl;
            }
            adminToast(`Упражнение #${curIdx + 1} зачтено (${resVal}). Переход к следующему видео.`, 'info');
          }
          // Синхронизация с мобильным черновиком
          try {
            const rawDraft = localStorage.getItem('gto_hero_active_draft_v1');
            if (rawDraft) {
              const draft = JSON.parse(rawDraft);
              if (draft.exercises) {
                const draftEx = draft.exercises.find(item => item.id === curEx?.id || item.title.toLowerCase().trim() === curEx?.title.toLowerCase().trim());
                if (draftEx) draftEx.status = 'approved';
                if (allDone) draft.status = 'approved';
                localStorage.setItem('gto_hero_active_draft_v1', JSON.stringify(draft));
              }
            }
          } catch (_) {}
        } else {
          app.status = 'approved';
          app.judgeDecision = { result: resVal, judge: 'Судья Соболев Д.', time: new Date().toLocaleDateString('ru-RU') };
          adminToast(`Попытка зачтена: ${resVal}`, 'success');
        }

        store.auditLog.unshift({
          time: new Date().toLocaleTimeString('ru-RU'),
          text: `Судейство заявки ${appId}: Зачёт (${resVal})`,
          user: 'judge@gto.com.ru'
        });
        saveAdminStore();
        fetch(`/api/hero/videos/${encodeURIComponent(appId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: app.status, judgeDecision: app.judgeDecision })
        }).then(r => { if (!r.ok) adminToast('Вердикт сохранён локально, но сервер вернул ошибку', 'error'); })
          .catch(() => adminToast('Вердикт сохранён локально (нет связи с сервером)', 'info'));
        renderAdminLayout(container);
      }
      return;
    }

    // Судейство: Отклонить / No-Rep
    if (e.target.closest('#admin-judge-reject-btn')) {
      const appId = e.target.closest('#admin-judge-reject-btn').dataset.appId;
      const notes = document.getElementById('admin-judge-notes')?.value || 'Нарушение стандартов техники';
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        app.status = 'rejected';
        app.judgeDecision = { result: 'No-Rep', reason: notes, judge: 'Судья Соболев Д.', time: new Date().toLocaleDateString('ru-RU') };
        store.auditLog.unshift({
          time: new Date().toLocaleTimeString('ru-RU'),
          text: `Судейство заявки ${appId}: Отклонено (${notes})`,
          user: 'judge@gto.com.ru'
        });
        saveAdminStore();
        fetch(`/api/hero/videos/${encodeURIComponent(appId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected', judgeDecision: app.judgeDecision })
        }).then(r => { if (!r.ok) adminToast('Вердикт сохранён локально, но сервер вернул ошибку', 'error'); })
          .catch(() => adminToast('Вердикт сохранён локально (нет связи с сервером)', 'info'));
        adminToast('Попытка отклонена (No-Rep)', 'error');
        renderAdminLayout(container);
      }
      return;
    }

    // Судейство: Отклонить с правом пересъёмки (Скриншоты 11, 23, 24)
    if (e.target.closest('#admin-judge-reshoot-btn')) {
      const appId = e.target.closest('#admin-judge-reshoot-btn').dataset.appId;
      const notes = document.getElementById('admin-judge-notes')?.value || 'Не соблюдены стандарты выполнения упражнения. Требуется пересъёмка.';
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        app.status = 'reshoot_requested';
        let targetExTitle = app.discipline;
        let curExId = null;

        if (app.exercises && app.exercises.length) {
          const curIdx = app.selectedExerciseIdx || 0;
          const curEx = app.exercises[curIdx];
          if (curEx) {
            curEx.status = 'reshoot';
            curEx.judgeNote = notes;
            targetExTitle = curEx.title;
            curExId = curEx.id;
          }
        }

        app.judgeDecision = { result: 'Требуется пересъёмка', reason: notes, judge: 'Главный судья Соболев Д.', time: new Date().toLocaleDateString('ru-RU') };
        store.auditLog.unshift({
          time: new Date().toLocaleTimeString('ru-RU'),
          text: `Судейство заявки ${appId}: Направлено на пересъёмку (${targetExTitle}: ${notes})`,
          user: 'judge@gto.com.ru'
        });
        saveAdminStore();

        // Синхронизация с мобильным черновиком атлета
        try {
          const raw = localStorage.getItem('gto_hero_active_draft_v1');
          if (raw) {
            const draft = JSON.parse(raw);
            draft.status = 'reshoot_requested';
            draft.judgeNote = notes;
            if (draft.exercises) {
              let ex = draft.exercises.find(item => item.id === curExId || item.title.toLowerCase().trim() === (targetExTitle || '').toLowerCase().trim());
              if (ex) {
                ex.status = 'reshoot_requested';
                ex.recorded = false;
              }
            }
            localStorage.setItem('gto_hero_active_draft_v1', JSON.stringify(draft));
          }
        } catch (_) {}

        fetch(`/api/hero/videos/${encodeURIComponent(appId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'reshoot_requested', judgeDecision: app.judgeDecision })
        }).then(r => { if (!r.ok) adminToast('Вердикт сохранён локально, но сервер вернул ошибку', 'error'); })
          .catch(() => adminToast('Вердикт сохранён локально (нет связи с сервером)', 'info'));
        adminToast(`Отправлено требование пересъёмки (${targetExTitle})`, 'warning');
        renderAdminLayout(container);
      }
      return;
    }

    // Переключение подвкладок протоколов (Результаты / Рекорды / Медали)
    const resultsSubtabBtn = e.target.closest('[data-results-subtab]');
    if (resultsSubtabBtn) {
      store.resultsSubtab = resultsSubtabBtn.dataset.resultsSubtab;
      saveAdminStore();
      renderAdminLayout(container);
      return;
    }

    // Публикация результатов соревнований
    if (e.target.closest('#admin-publish-results-btn')) {
      store.tournamentStage = 'published';
      store.auditLog.unshift({
        time: new Date().toLocaleTimeString('ru-RU'),
        text: 'Официальная публикация итоговых протоколов «Гордость и Слава 2026»',
        user: 'admin@gto.com.ru'
      });
      saveAdminStore();
      adminToast('✓ Результаты турнира официально опубликованы!', 'success');
      renderAdminLayout(container);
      return;
    }

    // Очный чек-ин: поиск атлета
    if (e.target.closest('#admin-checkin-lookup-btn')) {
      const q = (document.getElementById('admin-checkin-search-input')?.value || '').trim().toLowerCase();
      if (!q) {
        adminToast('Введите поисковый запрос или отсканируйте QR', 'info');
        return;
      }
      let found = allAthletesCache.find(a => (a.name || a.fio || '').toLowerCase().includes(q) || (a.uin || '').includes(q));
      if (!found) {
        found = store.applications.find(a => (a.athleteName || '').toLowerCase().includes(q) || (a.uin || '').includes(q));
        if (found) {
          found = { name: found.athleteName, uin: found.uin, region: found.region, stage: found.discipline, gender: 'M' };
        }
      }
      if (found) {
        store.activeCheckinCandidate = found;
        renderAdminLayout(container);
      } else {
        adminToast('Атлет не найден в реестре', 'error');
      }
      return;
    }

    // Очный чек-ин: демо быстрый скан
    if (e.target.closest('#admin-checkin-demo-btn')) {
      const demoAth = allAthletesCache[0] || {
        name: 'Соболев Дмитрий Александрович',
        region: 'Свердловская область',
        gender: 'M',
        rank: 'Мастер спорта / ВФСК ГТО',
        uin: '26-66-0038491',
        stage: 'Профессионалы (18-29 лет)'
      };
      store.activeCheckinCandidate = demoAth;
      renderAdminLayout(container);
      return;
    }

    // Очный чек-ин: отмена
    if (e.target.closest('#admin-cancel-checkin-btn')) {
      store.activeCheckinCandidate = null;
      renderAdminLayout(container);
      return;
    }

    // Очный чек-ин: подтверждение допуска и выдача стартового номера
    if (e.target.closest('#admin-confirm-checkin-btn')) {
      const cand = store.activeCheckinCandidate;
      if (!cand) return;
      const bib = document.getElementById('admin-checkin-bib-num')?.value || '101';
      const rfid = document.getElementById('admin-checkin-rfid')?.value || 'CHIP-1001';

      if (!store.checkedInAthletes) store.checkedInAthletes = [];
      store.checkedInAthletes.unshift({
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        bib: bib,
        rfid: rfid,
        name: cand.name || cand.fio || 'Атлет',
        region: cand.region || '—',
        category: cand.stage || 'Профессионалы',
        status: 'admitted'
      });

      store.auditLog.unshift({
        time: new Date().toLocaleTimeString('ru-RU'),
        text: `Очный допуск атлета ${cand.name || 'Атлет'} (Стартовый номер #${bib}, RFID: ${rfid})`,
        user: 'onsite_sochi@gto.com.ru'
      });

      store.activeCheckinCandidate = null;
      saveAdminStore();
      adminToast(`✓ Участник допущен к стартам! Номер #${bib} выдан.`, 'success');
      renderAdminLayout(container);
      return;
    }

    // Раскрытие / сворачивание вкладки 3-х видео комплекса атлета
    const toggleComplexBtn = e.target.closest('[data-admin-toggle-complex]');
    if (toggleComplexBtn) {
      const appId = toggleComplexBtn.dataset.adminToggleComplex;
      const app = store.applications.find(a => a.id === appId);
      if (app) {
        app._isExpanded = !app._isExpanded;
        renderAdminLayout(container);
      }
      return;
    }

    // Модерация заявки (клик из таблицы или мобильной карточки)
    const revBtn = e.target.closest('[data-admin-review-app]');
    if (revBtn) {
      const appId = revBtn.dataset.adminReviewApp;
      const exIdx = revBtn.dataset.exerciseIdx;
      store.selectedAppId = appId;
      const app = store.applications.find(a => a.id === appId);
      if (app && exIdx !== undefined && exIdx !== null) {
        const parsedIdx = parseInt(exIdx, 10);
        if (!isNaN(parsedIdx)) {
          app.selectedExerciseIdx = parsedIdx;
          if (app.exercises && app.exercises[parsedIdx]?.videoUrl) {
            app.videoUrl = app.exercises[parsedIdx].videoUrl;
          }
        }
      }
      store.activeTab = 'judging';
      saveAdminStore();
      renderAdminLayout(container);
      return;
    }

    // Скорость видео
    const speedBtn = e.target.closest('.admin-speed-chip');
    if (speedBtn) {
      const video = document.getElementById('admin-video-inspect');
      if (video) {
        const speed = parseFloat(speedBtn.dataset.speed || '1');
        video.playbackRate = speed;
        document.querySelectorAll('.admin-speed-chip').forEach(b => b.classList.remove('active'));
        speedBtn.classList.add('active');
      }
      return;
    }

    // Создать мероприятие
    if (e.target.closest('#admin-create-event-btn')) {
      openEventEditorModal();
      return;
    }

    // Зафиксировать новый Рекорд РФ
    if (e.target.closest('#admin-add-record-btn')) {
      openAddRecordModal();
      return;
    }

    // Редактировать мероприятие
    const editEvBtn = e.target.closest('[data-admin-edit-event]');
    if (editEvBtn) {
      const evId = editEvBtn.dataset.adminEditEvent;
      const ev = allEventsCache.find(x => String(x.id) === String(evId));
      openEventEditorModal(ev);
      return;
    }

    // Просмотр участников мероприятия
    const viewPartBtn = e.target.closest('[data-admin-view-participants]');
    if (viewPartBtn) {
      const evId = viewPartBtn.dataset.adminViewParticipants;
      const ev = allEventsCache.find(x => String(x.id) === String(evId));
      openAdminEventParticipantsModal(ev || { id: evId, title: `Турнир #${evId}` });
      return;
    }

    // Мерч турнира
    const merchEvBtn = e.target.closest('[data-admin-merch-event]');
    if (merchEvBtn) {
      store.activeTab = 'merch';
      saveAdminStore();
      renderAdminLayout(container);
      return;
    }

    // Экспорт в CSV
    if (e.target.closest('#admin-export-results-csv')) {
      exportResultsCsv();
      return;
    }

    // Генерация дипломов
    if (e.target.closest('#admin-batch-diploma-btn')) {
      adminToast('Сформирован пакет из 36 дипломов для печати и рассылки', 'success');
      return;
    }

    // Пригласить сотрудника
    if (e.target.closest('#admin-invite-user-btn')) {
      const email = prompt('Введите рабочий email сотрудника:');
      if (email) {
        store.users.push({
          id: 'u' + (store.users.length + 1),
          name: 'Новый сотрудник',
          email,
          role: 'judge',
          status: 'active',
          phone: '+7 (9**) ***-**-**'
        });
        saveAdminStore();
        adminToast(`Приглашение отправлено: ${email}`, 'success');
        renderAdminLayout(container);
      }
      return;
    }
  });

  // Фильтрация заявок (поиск, статус, формат)
  function applyAppsFilter() {
    const q = (document.getElementById('admin-apps-search')?.value || '').trim().toLowerCase();
    const st = document.getElementById('admin-apps-status-filter')?.value || 'all';
    const fmt = document.getElementById('admin-apps-format-filter')?.value || 'all';

    const rows = container.querySelectorAll('[data-app-row]');
    const cards = container.querySelectorAll('[data-app-card]');

    store.applications.forEach(app => {
      const matchSearch = !q || (
        (app.athleteName || '').toLowerCase().includes(q) ||
        (app.id || '').toLowerCase().includes(q) ||
        (app.discipline || '').toLowerCase().includes(q) ||
        (app.region || '').toLowerCase().includes(q)
      );
      const matchStatus = st === 'all' || app.status === st;
      const matchFormat = fmt === 'all' || app.format === fmt;
      const visible = matchSearch && matchStatus && matchFormat;

      rows.forEach(r => {
        if (r.dataset.appRow === app.id) r.style.display = visible ? '' : 'none';
      });
      cards.forEach(c => {
        if (c.dataset.appCard === app.id) c.style.display = visible ? '' : 'none';
      });
    });
  }

  container.addEventListener('input', e => {
    if (e.target.id === 'admin-apps-search') applyAppsFilter();
  });

  // Переключение роли и фильтров
  container.addEventListener('change', e => {
    if (e.target.id === 'admin-role-select') {
      store.role = e.target.value;
      saveAdminStore();
      renderAdminLayout(container);
    }
    if (e.target.id === 'admin-apps-status-filter' || e.target.id === 'admin-apps-format-filter') {
      applyAppsFilter();
    }
  });
}

function openEventEditorModal(ev) {
  const isNew = !ev;
  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="admin-modal-backdrop" id="admin-event-modal">
      <div class="admin-modal-dialog">
        <button type="button" class="admin-modal-close" id="admin-close-modal">✕</button>
        <h3 style="margin:0 0 16px;color:#fff;font-family:'TT Squares','Unbounded',sans-serif">
          ${isNew ? 'Создание нового соревнования' : 'Редактирование соревнования #' + ev.id}
        </h3>

        <div class="admin-form-group">
          <label>Название мероприятия</label>
          <input type="text" class="admin-form-input" id="aef-title" value="${esc(ev?.title || '')}" placeholder="например: Игры ГТО 2026 — Кубок Сочи">
        </div>

        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Город проведения</label>
            <input type="text" class="admin-form-input" id="aef-city" value="${esc(ev?.city || '')}" placeholder="Сочи">
          </div>
          <div class="admin-form-group">
            <label>Формат старта</label>
            <select class="admin-form-select" id="aef-format">
              <option value="Очные классические соревнования" ${(!ev?.format || ev?.format === 'Очные классические соревнования' || ev?.format === 'Офлайн') ? 'selected' : ''}>Очные классические соревнования</option>
              <option value="Чемпионат" ${ev?.format === 'Чемпионат' ? 'selected' : ''}>Чемпионат / Первенство</option>
              <option value="Кубок" ${ev?.format === 'Кубок' ? 'selected' : ''}>Кубок Федерации</option>
              <option value="Фестиваль ГТО" ${ev?.format === 'Фестиваль ГТО' ? 'selected' : ''}>Фестиваль многоборья ГТО</option>
              <option value="Игры ГТО" ${ev?.format === 'Игры ГТО' ? 'selected' : ''}>Игры ГТО</option>
              <option value="Онлайн-турнир" ${ev?.format === 'Онлайн-турнир' || ev?.format === 'ONLINE' ? 'selected' : ''}>Онлайн-турнир (дистанционный)</option>
            </select>
          </div>
        </div>

        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Даты проведения</label>
            <input type="text" class="admin-form-input" id="aef-dates" value="${esc(ev?.dates || '')}" placeholder="12–15 августа 2026">
          </div>
          <div class="admin-form-group">
            <label>Статус мероприятия</label>
            <select class="admin-form-select" id="aef-status">
              <option value="registration" ${ev?.status === 'registration' ? 'selected' : ''}>● Идёт регистрация</option>
              <option value="upcoming" ${ev?.status === 'upcoming' ? 'selected' : ''}>Предстоящее</option>
              <option value="past" ${ev?.status === 'past' ? 'selected' : ''}>Завершено</option>
              <option value="draft">Черновик</option>
            </select>
          </div>
        </div>

        <div class="admin-form-group">
          <label>Краткое описание / регламент</label>
          <textarea class="admin-form-textarea" id="aef-desc" rows="2" placeholder="Основные условия допуска, нормативы и категории...">${esc(ev?.description || '')}</textarea>
        </div>

        <!-- Дополнительные цифровые модули (опционально) -->
        <div class="admin-form-group">
          <label style="font-weight:700;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;display:block">
            Дополнительные цифровые модули (опционально):
          </label>
          <div style="display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08)">
            <label class="admin-doc-check-item">
              <input type="checkbox" id="aef-opt-records" ${ev?.hasRecordTracking ? 'checked' : ''}>
              <span>🏅 <b>Официальный зачёт рекордов («Иду на рекорд»)</b> — квалификация и фиксация в книге рекордов</span>
            </label>
            <label class="admin-doc-check-item">
              <input type="checkbox" id="aef-opt-online" ${ev?.hasOnline === true ? 'checked' : ''}>
              <span>⚡ <b>Онлайн-видеоотбор («Герой ГТО»)</b> — приём и судейство видеопопыток через таймер</span>
            </label>
          </div>
          <small style="display:block;color:#64748b;font-size:11px;margin-top:6px">Для стандартных классических турниров модули не требуются: соревнование проводится по обычным протоколам.</small>
        </div>

        <div class="admin-form-group" id="aef-wod-config-wrap" style="display:${ev?.hasOnline === true ? 'block' : 'none'}">
          <label style="font-size:12px;color:#cbd5e1;margin-bottom:4px;display:block">Дисциплины онлайн-комплекса (3 упражнения):</label>
          <input type="text" class="admin-form-input" id="aef-wod-ex1" value="${esc(ev?.wodExercises?.[0] || 'Подтягивания на перекладине (строгие)')}" placeholder="Упражнение 1" style="margin-bottom:6px">
          <input type="text" class="admin-form-input" id="aef-wod-ex2" value="${esc(ev?.wodExercises?.[1] || 'Отжимания в упоре лёжа')}" placeholder="Упражнение 2" style="margin-bottom:6px">
          <input type="text" class="admin-form-input" id="aef-wod-ex3" value="${esc(ev?.wodExercises?.[2] || 'Рывок гири (16 / 24 кг)')}" placeholder="Упражнение 3">
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button type="button" class="admin-btn secondary" id="admin-cancel-modal">Отмена</button>
          <button type="button" class="admin-btn primary" id="admin-save-event-btn">
            <span>${isNew ? 'Создать мероприятие' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-close-modal').onclick = () => modalContainer.innerHTML = '';
  document.getElementById('admin-cancel-modal').onclick = () => modalContainer.innerHTML = '';
  const onlineCheck = document.getElementById('aef-opt-online');
  const wodWrap = document.getElementById('aef-wod-config-wrap');
  if (onlineCheck && wodWrap) {
    onlineCheck.onchange = () => {
      wodWrap.style.display = onlineCheck.checked ? 'block' : 'none';
    };
  }

  document.getElementById('admin-save-event-btn').onclick = async () => {
    const title = document.getElementById('aef-title')?.value.trim();
    if (!title) { adminToast('Укажите название соревнования', 'error'); return; }
    const formatVal = document.getElementById('aef-format')?.value || 'Очные классические соревнования';
    const hasRecordTracking = document.getElementById('aef-opt-records')?.checked ?? false;
    const hasOnline = document.getElementById('aef-opt-online')?.checked ?? false;
    const hasOnsite = formatVal !== 'Онлайн-турнир';
    const wodExercises = hasOnline ? [
      document.getElementById('aef-wod-ex1')?.value.trim() || 'Подтягивания на перекладине (строгие)',
      document.getElementById('aef-wod-ex2')?.value.trim() || 'Отжимания в упоре лёжа',
      document.getElementById('aef-wod-ex3')?.value.trim() || 'Рывок гири (16 / 24 кг)'
    ] : [];

    const updated = {
      id: ev ? ev.id : (allEventsCache.length + 1),
      title,
      city: document.getElementById('aef-city')?.value.trim(),
      format: formatVal,
      dates: document.getElementById('aef-dates')?.value.trim(),
      status: document.getElementById('aef-status')?.value,
      description: document.getElementById('aef-desc')?.value.trim(),
      hasOnsite,
      hasOnline,
      hasRecordTracking,
      wodExercises
    };

    if (ev) {
      const idx = allEventsCache.findIndex(x => x.id === ev.id);
      if (idx >= 0) allEventsCache[idx] = { ...allEventsCache[idx], ...updated };
    } else {
      allEventsCache.unshift(updated);
    }

    // Синхронизируем с GTO_LIVE_TOURNAMENTS если объект существует
    if (typeof GTO_LIVE_TOURNAMENTS !== 'undefined' && Array.isArray(GTO_LIVE_TOURNAMENTS)) {
      const liveIdx = GTO_LIVE_TOURNAMENTS.findIndex(t => t.id === updated.id);
      if (liveIdx >= 0) {
        GTO_LIVE_TOURNAMENTS[liveIdx] = { ...GTO_LIVE_TOURNAMENTS[liveIdx], name: title, hasOnsite, hasOnline, wodExercises };
      }
    }

    // Отправляем в единый Master Data сервер
    try {
      await createOrUpdateMasterEvent({
        ...updated,
        event_id: 'EVT-' + String(updated.id).padStart(4, '0'),
        name: title,
        period: updated.dates,
        dates: updated.dates,
        location: updated.city,
        city: updated.city,
        format: hasOnline ? 'ONLINE' : (updated.format || 'Очные соревнования'),
        hasOnsite,
        hasOnline,
        hasRecordTracking,
        wodExercises
      });
    } catch (e) {
      console.warn('[Admin] Failed to persist event to master server:', e);
    }

    const modulesStr = [
      hasOnline ? 'Герой ГТО (Онлайн)' : null,
      hasRecordTracking ? 'Иду на рекорд' : null
    ].filter(Boolean).join(', ') || 'Обычные классические соревнования';

    store.auditLog.unshift({
      time: new Date().toLocaleTimeString('ru-RU'),
      text: `${isNew ? 'Создание' : 'Редактирование'} мероприятия: ${title} (${formatVal}, ${modulesStr})`,
      user: 'admin@gto.com.ru'
    });
    saveAdminStore();
    modalContainer.innerHTML = '';
    adminToast(isNew ? `Мероприятие создано: ${title}` : 'Изменения сохранены', 'success');
    const root = document.getElementById('admin-app-root');
    if (root) renderAdminLayout(root.parentElement);
  };
}

async function openAdminEventParticipantsModal(ev) {
  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="admin-modal-backdrop" id="admin-participants-modal">
      <div class="admin-modal-dialog" style="max-width:760px;width:95%">
        <div class="admin-modal-header">
          <div>
            <div style="font-size:11px;color:#38bdf8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Реестр участников и видеопопыток</div>
            <h3 style="margin:2px 0 0;font-size:16px">${esc(ev.title)}</h3>
          </div>
          <button type="button" class="admin-modal-close" id="admin-close-modal">✕</button>
        </div>
        <div class="admin-modal-body" id="admin-participants-body" style="padding:16px 20px;max-height:65vh;overflow-y:auto">
          <div style="text-align:center;padding:24px;color:#94a3b8">Загрузка списка участников...</div>
        </div>
        <div style="display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid rgba(255,255,255,0.08)">
          <button type="button" class="admin-btn secondary" id="admin-cancel-modal">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-close-modal').onclick = () => modalContainer.innerHTML = '';
  document.getElementById('admin-cancel-modal').onclick = () => modalContainer.innerHTML = '';

  const bodyEl = document.getElementById('admin-participants-body');
  const participants = await fetchEventParticipants(ev.id);

  if (!participants || !participants.length) {
    bodyEl.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#94a3b8">
        <div style="font-size:32px;margin-bottom:8px">👥</div>
        <b style="color:#f8fafc;display:block;margin-bottom:4px">Пока нет зарегистрированных участников</b>
        <span style="font-size:13px">Атлеты могут подать заявку через сайт или записать видеокомплекс в модуле «Герой ГТО».</span>
      </div>
    `;
    return;
  }

  bodyEl.innerHTML = `
    <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;color:#cbd5e1">Всего участников: <b style="color:#38bdf8">${participants.length}</b></span>
      <span style="font-size:12px;color:#94a3b8">ФМГТО Судейский реестр</span>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table" style="font-size:12px">
        <thead>
          <tr>
            <th>Атлет</th>
            <th>Субъект РФ</th>
            <th>Категория</th>
            <th>Результат</th>
            <th>Статус</th>
            <th>Видео</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map(p => `
            <tr>
              <td>
                <b>${esc(p.name)}</b>
                ${p.athlete_id ? `<br><small style="color:#64748b">${esc(p.athlete_id)}</small>` : ''}
              </td>
              <td>${esc(p.region || '—')}</td>
              <td><small>${esc(p.category || 'Любители')}</small></td>
              <td><b>${esc(p.result || '—')}</b></td>
              <td>
                <span class="admin-badge ${p.status === 'confirmed' ? 'success' : (p.status === 'video_uploaded' ? 'info' : 'warning')}">
                  ${p.status === 'confirmed' ? 'В протоколе' : (p.status === 'video_uploaded' ? 'Видео загружено' : 'Заявка')}
                </span>
              </td>
              <td>
                ${p.videos && p.videos.length ? `
                  <a href="${esc(p.videos[0].url)}" target="_blank" rel="noopener" class="admin-btn secondary" style="padding:3px 8px;font-size:11px;color:#38bdf8;display:inline-flex;align-items:center;gap:4px">
                    ▶ Смотреть (${p.videos.length})
                  </a>
                ` : '<span style="color:#64748b">—</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportResultsCsv() {
  const rows = [
    ['Место', 'Атлет', 'Субъект РФ', 'Дивизион', 'Сумма очков', 'Знак ГТО'],
    ['1', 'Соболев Дмитрий Александрович', 'Свердловская область', 'Профессионалы', '200', 'Золотой знак'],
    ['2', 'Кузнецов Максим Игоревич', 'г. Санкт-Петербург', 'Профессионалы', '189', 'Золотой знак'],
    ['3', 'Иванов Роман Сергеевич', 'г. Москва', 'Профессионалы', '181', 'Золотой знак']
  ];
  const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gto-protocol-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  adminToast('Протокол выгружен в CSV', 'success');
}

function openAddRecordModal() {
  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="admin-modal-backdrop" id="admin-record-modal">
      <div class="admin-modal-dialog">
        <button type="button" class="admin-modal-close" id="admin-close-record-modal">✕</button>
        <h3 style="margin:0 0 16px;color:#fff;font-family:'TT Squares','Unbounded',sans-serif">
          🏆 Фиксация нового Рекорда России
        </h3>

        <div class="admin-form-group">
          <label>Дисциплина комплекса</label>
          <input type="text" class="admin-form-input" id="arf-discipline" placeholder="например: Подтягивания на перекладине" list="arf-discipline-list">
          <datalist id="arf-discipline-list">
            <option value="Подтягивания на перекладине (строгие)">
            <option value="Отжимания в упоре лёжа">
            <option value="Рывок гири 24 кг">
            <option value="Рывок гири 16 кг">
            <option value="Прыжок в длину с места">
            <option value="Поднимание туловища из положения лёжа (пресс)">
          </datalist>
        </div>

        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>ФИО рекордсмена</label>
            <input type="text" class="admin-form-input" id="arf-holder" placeholder="Фамилия Имя Отчество">
          </div>
          <div class="admin-form-group">
            <label>Рекордный результат</label>
            <input type="text" class="admin-form-input" id="arf-result" placeholder="например: 65 повт. или 2.85 м">
          </div>
        </div>

        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Категория</label>
            <select class="admin-form-select" id="arf-category">
              <option value="Профессионалы">Профессионалы</option>
              <option value="Продвинутые">Продвинутые</option>
              <option value="Любители">Любители</option>
            </select>
          </div>
          <div class="admin-form-group">
            <label>Пол</label>
            <select class="admin-form-select" id="arf-gender">
              <option value="M">Мужчины</option>
              <option value="W">Женщины</option>
            </select>
          </div>
        </div>

        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Возрастная ступень</label>
            <input type="text" class="admin-form-input" id="arf-age" value="18-29" placeholder="18-29">
          </div>
          <div class="admin-form-group">
            <label>Турнир и дата фиксации</label>
            <input type="text" class="admin-form-input" id="arf-tournament" value="Игры ГТО 2026, г. Сочи" placeholder="Название турнира, город">
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button type="button" class="admin-btn secondary" id="admin-cancel-record-modal">Отмена</button>
          <button type="button" class="admin-btn primary" id="admin-save-record-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);border-color:#fbbf24;color:#000;font-weight:800">
            <span>🏆 Внести в Книгу Рекордов РФ</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('admin-close-record-modal').onclick = () => modalContainer.innerHTML = '';
  document.getElementById('admin-cancel-record-modal').onclick = () => modalContainer.innerHTML = '';

  document.getElementById('admin-save-record-btn').onclick = () => {
    const discipline = document.getElementById('arf-discipline')?.value.trim();
    const holder = document.getElementById('arf-holder')?.value.trim();
    const result = document.getElementById('arf-result')?.value.trim();
    const category = document.getElementById('arf-category')?.value || 'Профессионалы';
    const gender = document.getElementById('arf-gender')?.value || 'M';
    const age = document.getElementById('arf-age')?.value.trim() || '18-29';
    const tournament = document.getElementById('arf-tournament')?.value.trim() || 'Игры ГТО 2026';

    if (!discipline || !holder || !result) {
      adminToast('Заполните дисциплину, ФИО рекордсмена и результат', 'error');
      return;
    }

    addUnifiedRecord({
      discipline,
      holder,
      result,
      category,
      gender,
      age,
      tournament,
      date: new Date().toLocaleDateString('ru-RU')
    });

    store.auditLog.unshift({
      time: new Date().toLocaleTimeString('ru-RU'),
      text: `🏆 Зафиксирован официальный рекорд РФ: ${holder} — ${discipline} (${result})`,
      user: 'chief_judge@gto.com.ru'
    });
    saveAdminStore();
    modalContainer.innerHTML = '';
    adminToast(`🏆 Рекорд России зафиксирован: ${holder} — ${result}!`, 'success');
    const root = document.getElementById('admin-app-root');
    if (root) renderAdminLayout(root.parentElement);
  };
}
