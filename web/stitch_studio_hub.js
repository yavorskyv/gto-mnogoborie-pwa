/**
 * Official Stitch & Google AI Studio Controller for Федерация многоборья ГТО России
 * Implements the 9 Screens architecture, responsive transitions, real-time leaderboards,
 * live countdown, FastPass QR generator, and interactive GTO calculator.
 */

import { GTO_STUDIO_ASSETS, GTO_LIVE_TOURNAMENTS } from "./gto_live_dumps_data.js";
import {
  GTO_CALENDAR_EVENTS,
  GTO_RECORDS,
  GTO_FEDERATIONS,
  GTO_STANDARDS,
  GTO_FEDERATION_INFO,
  GTO_SPORT_RULES,
  GTO_VIDEOS,
  GTO_OFFICIAL_NEWS
} from "./gto_data.js";
import { GTO_VK_ALBUMS } from "./vk_albums_data.js";
import {
  renderLeaderboards,
  selectLeaderboardTournament,
  selectLeaderboardCategory,
  selectLeaderboardComplex,
  handleLeaderboardSearch,
  openTournamentDetail,
  closeTournamentDetail,
  switchModalSubtab,
  openAthleteCard,
  closeAthleteModal,
  openProtestModal,
  closeProtestModal,
  submitOfficialProtest,
  exportOfficialProtocol
} from "./leaderboards_module.js";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const hubState = {
  activeTab: "overview",
  navHistory: ["overview"],
  activeStageOverview: 6,
  activeStageProfile: 6,
  profileIsMale: true,
  recordsIsMale: true,
  calendarFilter: "all",
  calendarSearch: "",
  regionsDistrict: "all",
  regionsSearch: "",
  tournDetailSubtab: "complexes",
  activeTournDetailId: 101,
  recordsDiscipline: "all",
  newsSearch: "",
  mediaSubtab: "photos",
  photosSearch: "",
  videosSearch: "",
  fedSubtab: "leadership",
  activeGalleryAlbum: null,
  activeGalleryIndex: 0
};

export const GTO_16_STAGES = [
  { id: 1, roman: "I ступень", age: "6–8 лет", desc: "Младший школьный возраст" },
  { id: 2, roman: "II ступень", age: "9–10 лет", desc: "Младший школьный возраст" },
  { id: 3, roman: "III ступень", age: "11–12 лет", desc: "Средний школьный возраст" },
  { id: 4, roman: "IV ступень", age: "13–15 лет", desc: "Подростковый возраст" },
  { id: 5, roman: "V ступень", age: "16–17 лет", desc: "Старший школьный возраст" },
  { id: 6, roman: "VI ступень", age: "18–19 лет", desc: "Молодёжный дивизион" },
  { id: 7, roman: "VII ступень", age: "20–24 года", desc: "Студенты и элита" },
  { id: 8, roman: "VIII ступень", age: "25–29 лет", desc: "Основной дивизион" },
  { id: 9, roman: "IX ступень", age: "30–34 года", desc: "Основной дивизион" },
  { id: 10, roman: "X ступень", age: "35–39 лет", desc: "Мастера" },
  { id: 11, roman: "XI ступень", age: "40–44 года", desc: "Ветераны спорта 40+" },
  { id: 12, roman: "XII ступень", age: "45–49 лет", desc: "Ветераны спорта 45+" },
  { id: 13, roman: "XIII ступень", age: "50–54 года", desc: "Ветераны спорта 50+" },
  { id: 14, roman: "XIV ступень", age: "55–59 лет", desc: "Ветераны спорта 55+" },
  { id: 15, roman: "XV ступень", age: "60–64 года", desc: "Старшая возрастная группа" },
  { id: 16, roman: "XVI ступень", age: "65–69 лет", desc: "Активное долголетие" }
];

export const SCREEN_TITLES = {
  "overview": { title: "ФМГТО РФ", badge: "№ 216" },
  "calendar": { title: "Календарь ЕКП", badge: "113 стартов" },
  "tournament-detail": { title: "Гранд-Финал Сириус", badge: "1 000 000 ₽" },
  "leaderboards": { title: "Протокол LIVE", badge: "VAR 100%" },
  "records": { title: "Книга рекордов", badge: "321 рекорд" },
  "profile": { title: "Цифровой профиль", badge: "УИН верифицирован" },
  "regional-branches": { title: "Регионы РФ", badge: "49 отделений" },
  "news": { title: "Пресс-служба", badge: "gto.com.ru" },
  "media": { title: "Медиацентр", badge: "19 альбомов • 220+ видео" },
  "federation": { title: "О Федерации", badge: "Минспорт РФ № 216" }
};

export function switchTab(tabId) {
  if (!tabId) return;

  if (hubState.activeTab !== tabId) {
    hubState.navHistory.push(tabId);
    hubState.activeTab = tabId;
  }

  document.querySelectorAll(".tab-view").forEach(el => {
    el.classList.remove("active");
  });
  const targetSec = document.getElementById("tab-" + tabId);
  if (targetSec) {
    targetSec.classList.add("active");
  }

  document.querySelectorAll(".gto-stitch-nav-item").forEach(item => {
    const t = item.getAttribute("data-tab-target");
    if (t === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  document.querySelectorAll(".gto-stitch-desktop-btn, .gto-stitch-nav-link").forEach(link => {
    const t = link.getAttribute("data-tab-target");
    if (t === tabId) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  const meta = SCREEN_TITLES[tabId] || { title: "ФМГТО РФ", badge: "ЕКП № 216" };
  const titleEl = document.getElementById("header-screen-title");
  if (titleEl) titleEl.textContent = meta.title;

  const badgeEl = document.getElementById("header-order-badge");
  if (badgeEl) badgeEl.textContent = meta.badge;

  const backBtn = document.getElementById("header-back-btn");
  if (backBtn) {
    if (tabId !== "overview" && hubState.navHistory.length > 1) {
      backBtn.style.display = "inline-flex";
    } else {
      backBtn.style.display = "none";
    }
  }

  if (tabId === "leaderboards") {
    try { renderLeaderboards(); } catch (e) { console.error("Leaderboards error:", e); }
  } else if (tabId === "tournament-detail") {
    renderStandaloneTournamentDetail(hubState.activeTournDetailId);
  } else if (tabId === "calendar") {
    renderCalendarEvents();
  } else if (tabId === "records") {
    renderRecordsScreen();
  } else if (tabId === "regional-branches") {
    renderRegionalBranchesScreen();
  } else if (tabId === "news") {
    renderNewsScreen();
  } else if (tabId === "media") {
    renderMediaScreen();
  } else if (tabId === "federation") {
    renderFederationScreen();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.switchTab = switchTab;

export function navigateBack() {
  if (hubState.navHistory.length > 1) {
    hubState.navHistory.pop();
    const prev = hubState.navHistory.pop() || "overview";
    switchTab(prev);
  } else {
    switchTab("overview");
  }
}
window.navigateBack = navigateBack;

export function initCountdownTimer() {
  const targetDate = new Date(2026, 5, 12, 9, 0, 0).getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      const d = document.getElementById("countdown-days");
      if (d) d.textContent = "0";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const dEl = document.getElementById("countdown-days");
    const hEl = document.getElementById("countdown-hours");
    const mEl = document.getElementById("countdown-min");
    const sEl = document.getElementById("countdown-sec");

    if (dEl) dEl.textContent = String(days);
    if (hEl) hEl.textContent = String(hours).padStart(2, "0");
    if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
    if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
  }

  update();
  setInterval(update, 1000);
}

export function renderOverviewTournaments() {
  const container = document.getElementById("overview-tournaments-carousel");
  if (!container) return;

  const tList = GTO_LIVE_TOURNAMENTS || [];
  container.innerHTML = tList.map(t => {
    const poster = t.heroImage || t.poster || t.img || GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;
    return `
      <div class="gto-tournament-card" onclick="window.openTournamentDetailDirect(${t.id})" style="cursor: pointer;">
        <div style="position: relative; height: 120px; margin: -16px -16px 12px; overflow: hidden; border-radius: 16px 16px 0 0; background: #070a10;">
          <img src="${poster}" alt="${escapeHtml(t.name)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null;this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 20%, rgba(15,19,28,0.9) 100%);"></div>
          <span class="gto-badge-federal" style="position: absolute; top: 10px; left: 10px; font-size: 10px; padding: 2px 7px;">${t.isLive ? "LIVE" : "ЕКП 2026"}</span>
          <span class="gto-badge-gold" style="position: absolute; top: 10px; right: 10px; font-size: 10px; padding: 2px 7px;">${escapeHtml(t.prizePool)}</span>
        </div>
        <div class="gto-tournament-card-title">${escapeHtml(t.name)}</div>
        <div class="gto-tournament-card-meta">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg>
          <span>${escapeHtml(t.venue || t.location)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11.5px; color: var(--text-secondary);">
          <span>📅 ${escapeHtml(t.date)}</span>
          <span style="color: var(--secondary-blue); font-weight: 700;">Подробнее →</span>
        </div>
      </div>
    `;
  }).join("");
}

export function renderOverviewTopRecords() {
  const container = document.getElementById("overview-top-records");
  if (!container) return;

  const topRecords = [
    {
      discipline: "Подтягивания на перекладине",
      val: "42",
      unit: "повт.",
      athlete: "Михаил Ковалев",
      rank: "МСМК",
      region: "Москва",
      status: "Рекорд РФ (ВРВС)",
      avatar: GTO_STUDIO_ASSETS.ATHLETE_SAVELYEV_URL,
      badgeColor: "var(--badge-gold)"
    },
    {
      discipline: "Рывок гири 24 кг (10 мин)",
      val: "178",
      unit: "повт.",
      athlete: "Елена Смирнова",
      rank: "МС РФ",
      region: "Санкт-Петербург",
      status: "Судейство VAR",
      avatar: GTO_STUDIO_ASSETS.ATHLETE_KOVALEVA_URL,
      badgeColor: "#38bdf8"
    },
    {
      discipline: "Прыжок в длину с места",
      val: "324",
      unit: "см",
      athlete: "Артем Васильев",
      rank: "КМС",
      region: "Казань",
      status: "Сенсорная полоса",
      avatar: GTO_STUDIO_ASSETS.ATHLETE_VOLKOV_URL,
      badgeColor: "var(--status-accredited)"
    }
  ];

  container.innerHTML = topRecords.map(r => `
    <div style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 14px; padding: 14px; display: flex; gap: 12px; align-items: center;">
      <div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; border: 1.5px solid ${r.badgeColor}; flex-shrink: 0;">
        <img src="${r.avatar}" alt="${escapeHtml(r.athlete)}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span style="font-size: 10.5px; font-weight: 800; color: ${r.badgeColor}; text-transform: uppercase;">${escapeHtml(r.status)}</span>
          <span style="font-size: 14px; font-weight: 900; color: #FFFFFF; font-family: var(--gto-mono);">${r.val} <span style="font-size: 11px; color: var(--text-tertiary);">${r.unit}</span></span>
        </div>
        <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(r.athlete)} <span style="font-size: 11px; color: var(--badge-gold);">(${r.rank})</span>
        </div>
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
          ${escapeHtml(r.discipline)} • ${escapeHtml(r.region)}
        </div>
      </div>
    </div>
  `).join("");
}

export function renderOverviewStages() {
  const pillsContainer = document.getElementById("overview-stages-pills");
  if (!pillsContainer) return;

  pillsContainer.innerHTML = GTO_16_STAGES.map(s => {
    const isActive = s.id === hubState.activeStageOverview;
    return `
      <button class="gto-complex-pill ${isActive ? "active" : ""}" onclick="window.selectOverviewStage(${s.id}, this)">
        ${s.roman} (${s.age})
      </button>
    `;
  }).join("");

  renderOverviewStageStandards(hubState.activeStageOverview);
}

export function selectOverviewStage(stageId, btn) {
  hubState.activeStageOverview = stageId;
  if (btn) {
    document.querySelectorAll("#overview-stages-pills .gto-complex-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  renderOverviewStageStandards(stageId);
}
window.selectOverviewStage = selectOverviewStage;

function renderOverviewStageStandards(stageId) {
  const container = document.getElementById("overview-stage-standards-grid");
  if (!container) return;

  const st = GTO_16_STAGES.find(x => x.id === stageId) || GTO_16_STAGES[5];
  const items = [
    { title: "Челночный бег 3x10 м", gold: "6.9 с", silver: "7.4 с", bronze: "7.9 с" },
    { title: "Подтягивание на перекладине", gold: "15 повт.", silver: "12 повт.", bronze: "9 повт." },
    { title: "Сгибание и разгибание рук в упоре лежа", gold: "44 повт.", silver: "34 повт.", bronze: "24 повт." },
    { title: "Наклон вперед из положения стоя", gold: "+13 см", silver: "+8 см", bronze: "+6 см" },
    { title: "Прыжок в длину с места", gold: "240 см", silver: "230 см", bronze: "215 см" },
    { title: "Поднимание туловища из положения лежа (1 мин)", gold: "50 повт.", silver: "44 повт.", bronze: "38 повт." }
  ];

  container.innerHTML = items.map(item => `
    <div style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 12px; padding: 14px;">
      <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">${item.title}</div>
      <div style="display: flex; gap: 8px; font-size: 11.5px;">
        <span class="gto-badge-gold">🥇 ${item.gold}</span>
        <span class="gto-badge-silver">🥈 ${item.silver}</span>
        <span class="gto-badge-bronze">🥉 ${item.bronze}</span>
      </div>
    </div>
  `).join("");
}

export function renderOverviewNews() {
  const container = document.getElementById("overview-news-grid");
  if (!container) return;

  const news = (GTO_OFFICIAL_NEWS || []).slice(0, 3);
  container.innerHTML = news.map(n => `
    <div class="gto-news-card" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s;">
      <div style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #070a10;">
        <img src="${n.img}" alt="${escapeHtml(n.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
        <div style="position: absolute; top: 10px; left: 10px;">
          <span class="gto-badge-gold" style="font-size: 10.5px; padding: 3px 8px;">${escapeHtml(n.date)}</span>
        </div>
      </div>
      <div style="padding: 16px; display: flex; flex-direction: column; flex: 1;">
        <h4 style="font-size: 14.5px; font-weight: 800; color: #fff; line-height: 1.35; margin: 0 0 8px; min-height: 40px;">
          ${escapeHtml(n.title)}
        </h4>
        <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.45; margin: 0 0 14px; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(n.text || "")}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);">
          <a href="${n.url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; font-weight: 700; color: var(--secondary-blue); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
            <span>На gto.com.ru</span>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </a>
          <button class="gto-btn-outline" onclick="window.openNewsModal(${n.id})" style="font-size: 11.5px; padding: 4px 10px; min-height: auto;">
            <span>Читать</span>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}
window.renderOverviewNews = renderOverviewNews;

export function renderNewsScreen() {
  const container = document.getElementById("full-news-grid");
  if (!container) return;

  const news = GTO_OFFICIAL_NEWS || [];
  let filtered = news;

  if (hubState.newsSearch) {
    const q = hubState.newsSearch.toLowerCase();
    filtered = news.filter(n =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.text && n.text.toLowerCase().includes(q))
    );
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #111a2a; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Новости не найдены</h4>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Попробуйте изменить поисковый запрос.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(n => `
    <div class="gto-news-card" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
      <div style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #070a10;">
        <img src="${n.img}" alt="${escapeHtml(n.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
        <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 6px;">
          <span class="gto-badge-gold" style="font-size: 10.5px; padding: 3px 8px;">${escapeHtml(n.date)}</span>
          <span class="gto-badge-federal" style="font-size: 10.5px; padding: 3px 8px;">gto.com.ru</span>
        </div>
      </div>
      <div style="padding: 16px; display: flex; flex-direction: column; flex: 1;">
        <h4 style="font-size: 15px; font-weight: 800; color: #fff; line-height: 1.35; margin: 0 0 8px;">
          ${escapeHtml(n.title)}
        </h4>
        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px; flex: 1;">
          ${escapeHtml(n.text || "")}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); gap: 8px;">
          <a href="${n.url}" target="_blank" rel="noopener noreferrer" class="gto-btn-primary" style="flex: 1; font-size: 12px; padding: 8px 12px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            <span>Читать на gto.com.ru</span>
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </a>
          <button class="gto-btn-outline" onclick="window.openNewsModal(${n.id})" style="font-size: 12px; padding: 8px 12px;">
            <span>Просмотр</span>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}
window.renderNewsScreen = renderNewsScreen;

export function handleNewsSearch(query) {
  hubState.newsSearch = (query || "").trim();
  renderNewsScreen();
}
window.handleNewsSearch = handleNewsSearch;

export function openNewsModal(newsId) {
  const n = (GTO_OFFICIAL_NEWS || []).find(item => item.id === newsId);
  if (!n) return;

  showActionNotice(
    n.title,
    `
      <div style="text-align: left; font-size: 13.5px; color: #cbd5e1; line-height: 1.6;">
        <div style="color: var(--badge-gold); font-weight: 700; margin-bottom: 8px;">📅 ${n.date} • Официальная публикация ФМГТО</div>
        <p style="margin-bottom: 12px;">${escapeHtml(n.text)}</p>
        <a href="${n.url}" target="_blank" rel="noopener noreferrer" class="gto-btn-primary" style="display: inline-flex; font-size: 12.5px; padding: 8px 16px; text-decoration: none; margin-top: 10px;">
          Перейти к полной новости на gto.com.ru ↗
        </a>
      </div>
    `
  );
}
window.openNewsModal = openNewsModal;

export function renderCalendarEvents() {
  const container = document.getElementById("calendar-events-grid");
  if (!container) return;

  const events = GTO_CALENDAR_EVENTS || [];
  let filtered = events;

  if (hubState.calendarFilter !== "all") {
    filtered = filtered.filter(e => {
      if (hubState.calendarFilter === "registration") return e.status === "registration_open";
      if (hubState.calendarFilter === "major") return e.isMajor;
      if (hubState.calendarFilter === "federal") return e.level === "federal";
      if (hubState.calendarFilter === "regional") return e.level === "regional";
      if (hubState.calendarFilter === "stream") return e.hasStream;
      return true;
    });
  }

  if (hubState.calendarSearch) {
    const q = hubState.calendarSearch.toLowerCase();
    filtered = filtered.filter(e => 
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.city && e.city.toLowerCase().includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
  }

  const badgeEl = document.getElementById("calendar-count-badge");
  if (badgeEl) badgeEl.textContent = `${filtered.length} стартов`;

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #111a2a; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="#64748b" fill="none" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">События не найдены</h4>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Попробуйте скорректировать фильтры или строку поиска.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(ev => {
    const poster = ev.poster || ev.img || ev.image || (ev.id ? `assets/events/event_${ev.id}.jpg` : GTO_STUDIO_ASSETS.SOCHI_ARENA_URL);
    const fallbackImg = ev.img || 'https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg';
    return `
      <div class="gto-calendar-card" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;">
        <div style="position: relative; height: 140px; background: #070a10;">
          <img src="${poster}" alt="${escapeHtml(ev.title)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,15,25,0.85) 100%);"></div>
          <div style="position: absolute; top: 10px; left: 10px; display: flex; gap: 6px;">
            <span class="gto-badge-gold" style="font-size: 10px;">${ev.statusText || "ЕКП № 216"}</span>
            ${ev.hasStream ? '<span class="gto-badge-federal" style="background: rgba(56, 189, 248, 0.2); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; font-size: 10px;">Трансляция</span>' : ''}
          </div>
          <span class="gto-badge-federal" style="position: absolute; bottom: 8px; right: 10px; font-size: 11px;">${escapeHtml(ev.prizePool || "Кубок РФ")}</span>
        </div>
        <div style="padding: 16px; display: flex; flex-direction: column; flex: 1;">
          <h4 style="font-size: 15px; font-weight: 800; color: #FFFFFF; line-height: 1.35; margin: 0 0 10px; min-height: 40px;">
            ${escapeHtml(ev.title)}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 14px;">
            <span>📅 ${escapeHtml(ev.dates || ev.date || "2026 год")}</span>
            <span>📍 ${escapeHtml(ev.city || ev.location || "Россия")}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="gto-btn-primary" style="flex: 1; font-size: 12px; padding: 7px 12px; min-height: 36px;" onclick="window.switchTab('tournament-detail')">
              <span>Хаб турнира</span>
            </button>
            <button class="gto-btn-outline" style="padding: 7px 12px; font-size: 12px; min-height: 36px;" onclick="window.switchTab('leaderboards')">
              <span>LIVE</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export function filterCalendar(filterKey, btn) {
  hubState.calendarFilter = filterKey;
  if (btn) {
    document.querySelectorAll("#calendar-filter-chips .gto-complex-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  renderCalendarEvents();
}
window.filterCalendar = filterCalendar;

export function handleCalendarSearch(query) {
  hubState.calendarSearch = (query || "").trim();
  renderCalendarEvents();
}
window.handleCalendarSearch = handleCalendarSearch;

export function openTournamentDetailDirect(id) {
  hubState.activeTournDetailId = id;
  switchTab("tournament-detail");
}
window.openTournamentDetailDirect = openTournamentDetailDirect;

export function renderStandaloneTournamentDetail(tournId) {
  const container = document.getElementById("standalone-tournament-detail-container");
  if (!container) return;

  const tList = GTO_LIVE_TOURNAMENTS || [];
  const tourn = tList.find(x => x.id === tournId) || tList[0];
  if (!tourn) return;

  const heroBg = tourn.heroImage || tourn.poster || tourn.img || GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;

  container.innerHTML = `
    <div style="position: relative; border-radius: 20px; overflow: hidden; margin-bottom: 24px; border: 1px solid var(--surface-border); box-shadow: 0 16px 40px rgba(0,0,0,0.5);">
      <div style="position: relative; height: 320px; background: #070a10;">
        <img src="${heroBg}" alt="${escapeHtml(tourn.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,15,23,0.3) 0%, rgba(11,15,23,0.95) 100%);"></div>
        <div style="position: absolute; bottom: 24px; left: 24px; right: 24px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
            <span class="gto-badge-federal">${escapeHtml(tourn.statusText || "Официальный турнир ВРВС")}</span>
            <span class="gto-badge-gold">Призовой фонд: ${escapeHtml(tourn.prizePool)}</span>
            <span class="gto-badge-federal" style="border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">100% VAR Видеоконтроль</span>
          </div>
          <h1 style="font-size: clamp(22px, 3vw, 36px); font-weight: 900; color: #FFFFFF; line-height: 1.15; margin: 0 0 10px;">
            ${escapeHtml(tourn.name)}
          </h1>
          <div style="display: flex; gap: 16px; align-items: center; color: var(--text-secondary); font-size: 13.5px; flex-wrap: wrap;">
            <span>📅 ${escapeHtml(tourn.date)}</span>
            <span>📍 ${escapeHtml(tourn.location)} (${escapeHtml(tourn.venue)})</span>
            <span>👥 Квота: ${escapeHtml(tourn.quota)}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--surface-border);">
      <button class="gto-complex-pill active" id="td-subtab-btn-complexes" onclick="window.switchTournDetailSubtab('complexes')">Комплексы соревнований (WOD)</button>
      <button class="gto-complex-pill" id="td-subtab-btn-judges" onclick="window.switchTournDetailSubtab('judges')">Судейство VAR и комиссия</button>
      <button class="gto-complex-pill" id="td-subtab-btn-regs" onclick="window.switchTournDetailSubtab('regs')">Регламент и Положение</button>
      <button class="gto-complex-pill" id="td-subtab-btn-table" onclick="window.switchTournDetailSubtab('table')">LIVE Таблица (${tourn.teams ? tourn.teams.length : 0} атлетов)</button>
    </div>

    <div id="tourn-detail-subtab-body">
      ${renderTournDetailComplexes(tourn)}
    </div>
  `;
}

export function switchTournDetailSubtab(subtab) {
  hubState.tournDetailSubtab = subtab;
  const tList = GTO_LIVE_TOURNAMENTS || [];
  const tourn = tList.find(x => x.id === hubState.activeTournDetailId) || tList[0];
  const body = document.getElementById("tourn-detail-subtab-body");
  if (!body || !tourn) return;

  const btnIds = ["complexes", "judges", "regs", "table"];
  btnIds.forEach(id => {
    const btn = document.getElementById(`td-subtab-btn-${id}`);
    if (btn) {
      if (id === subtab) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  if (subtab === "complexes") {
    body.innerHTML = renderTournDetailComplexes(tourn);
  } else if (subtab === "judges") {
    body.innerHTML = renderTournDetailJudges(tourn);
  } else if (subtab === "regs") {
    body.innerHTML = renderTournDetailRegs(tourn);
  } else if (subtab === "table") {
    body.innerHTML = `
      <div style="text-align: center; padding: 24px 0;">
        <p style="color: var(--text-secondary); margin-bottom: 14px;">Для просмотра интерактивного лидерборда и видеоповторов перейдите в раздел Протокол LIVE.</p>
        <button class="gto-btn-primary" onclick="window.switchTab('leaderboards')">
          <span>Открыть Протокол LIVE</span>
        </button>
      </div>
    `;
  }
}
window.switchTournDetailSubtab = switchTournDetailSubtab;

function renderTournDetailComplexes(tourn) {
  const comps = tourn.complexes || [];
  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${comps.map((c, i) => `
        <div style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="gto-badge-gold" style="font-size: 11px;">КФУ №${i + 1}</span>
              <h3 style="font-size: 17px; font-weight: 800; color: #FFFFFF; margin: 0;">${escapeHtml(c.name)}</h3>
            </div>
            <div style="display: flex; gap: 6px;">
              ${c.score1TimeCap ? `<span class="gto-badge-federal">Тайм-кап: ${c.score1TimeCap}</span>` : ''}
              <span class="gto-badge-federal">${c.lanes || 4} дорожки</span>
            </div>
          </div>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 14px; white-space: pre-line;">
            ${escapeHtml(c.description || "Официальный комплекс упражнений многоборья ГТО.")}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: var(--text-secondary);">
            <span>Локация: ${escapeHtml(c.venue || "Главный помост")}</span>
            <span style="color: var(--secondary-blue); font-weight: 700;">Критерий: ${escapeHtml(c.score1Name)}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTournDetailJudges(tourn) {
  const judges = tourn.judges || [];
  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="gto-badge-federal" style="align-self: flex-start;">ВСЕРОССИЙСКАЯ КОЛЛЕГИЯ СУДЕЙ (ВКС РФ)</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
        ${judges.map(j => `
          <div style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 14px; padding: 18px;">
            <div style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">${escapeHtml(j.name)}</div>
            <div style="font-size: 13px; color: var(--badge-gold); margin-bottom: 8px;">${escapeHtml(j.role)}</div>
            <span class="gto-badge-federal" style="font-size: 11px;">${escapeHtml(j.rank)}</span>
          </div>
        `).join("")}
      </div>
      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 14px; padding: 18px; margin-top: 8px;">
        <h4 style="font-size: 14.5px; font-weight: 800; color: #38bdf8; margin: 0 0 6px;">Регламент судейства VAR (Video Assistant Referee)</h4>
        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin: 0;">
          Видеофиксация соревнований ведется 8 высокоскоростными камерами 120 кадров/сек. Решение о пересмотре спорного повторения принимается ВКС по официальному запросу капитана команды.
        </p>
      </div>
    </div>
  `;
}

function renderTournDetailRegs(tourn) {
  return `
    <div style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 22px;">
      <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 12px;">Положение о соревнованиях</h3>
      <ul style="font-size: 13.5px; color: #cbd5e1; line-height: 1.8; margin: 0 0 20px 20px;">
        <li>Мандатная комиссия: обязательна справка по форме 1144-н и полис страхования.</li>
        <li>Возрастные ограничения: взрослые спортсмены от 18 лет, юниоры 14–17 лет.</li>
        <li>Взвешивание снарядов: калиброванные соревновательные диски и штанги.</li>
        <li>Протесты: принимаются в течение 15 минут после финиша захода.</li>
      </ul>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="gto-btn-primary" onclick="window.showActionNotice('Положение о турнире', 'Официальный регламент утвержден Минспортом РФ (ЕКП № 216). Электронный документ загружен.')">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Скачать Положение (PDF)</span>
        </button>
      </div>
    </div>
  `;
}

export function renderRecordsDisciplineChips() {
  const container = document.getElementById("records-discipline-chips");
  if (!container) return;
  const disciplines = [
    { key: "all", label: "Все дисциплины" },
    { key: "pullups", label: "Подтягивания" },
    { key: "kettlebell", label: "Гиря 24 кг" },
    { key: "jump", label: "Прыжок в длину" },
    { key: "running", label: "Бег" },
    { key: "pushups", label: "Отжимания" },
    { key: "flexibility", label: "Гибкость" },
  ];
  container.innerHTML = disciplines.map(d => {
    const isActive = hubState.recordsDiscipline === d.key;
    return `<button class="gto-complex-pill ${isActive ? "active" : ""}" onclick="window.filterRecordsDiscipline('${d.key}', this)" style="white-space: nowrap; font-size: 12px;">${d.label}</button>`;
  }).join("");
}
window.renderRecordsDisciplineChips = renderRecordsDisciplineChips;

export function renderRecordsScreen() {
  renderRecordsDisciplineChips();
  const gridContainer = document.getElementById("records-list-grid");
  if (!gridContainer) return;

  const isM = hubState.recordsIsMale;
  let records = GTO_RECORDS || [];

  if (hubState.recordsDiscipline && hubState.recordsDiscipline !== "all") {
    records = records.filter(r => r.disciplineKey === hubState.recordsDiscipline || (r.discipline && r.discipline.includes(hubState.recordsDiscipline)));
  }

  records = records.filter(r => {
    if (isM) return !r.sex || r.sex === "M" || r.sex === "М" || (r.category && !r.category.includes("Жен"));
    return r.sex === "F" || r.sex === "Ж" || (r.category && r.category.includes("Жен"));
  });

  gridContainer.innerHTML = records.slice(0, 24).map(r => `
    <div class="gto-record-card" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="gto-badge-federal" style="font-size: 10px;">${escapeHtml(r.discipline || "Многоборье")}</span>
        <span class="gto-badge-gold" style="font-size: 10.5px;">ВРВС РФ</span>
      </div>
      <div style="font-size: 26px; font-weight: 900; color: #FFFFFF; font-family: var(--gto-mono); margin-bottom: 4px;">
        ${escapeHtml(r.score || r.result || "42")} <span style="font-size: 14px; color: var(--badge-gold);">${escapeHtml(r.unit || "повт.")}</span>
      </div>
      <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
        ${escapeHtml(r.athleteName || r.athlete || "Атлет Федерации")}
      </div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
        ${escapeHtml(r.location || "Россия")} • ${escapeHtml(r.tier || "VI ступень")}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11.5px; color: var(--text-secondary);">
        <span>Сертификат: ${escapeHtml(r.certNumber || "№ RU-2026")}</span>
        <button class="gto-btn-outline" onclick="window.openVideoDialog()" style="padding: 4px 8px; font-size: 11px; min-height: auto;">
          VAR Запись
        </button>
      </div>
    </div>
  `).join("");
}

export function filterRecordsDiscipline(key, btn) {
  hubState.recordsDiscipline = key;
  if (btn) {
    document.querySelectorAll("#records-discipline-chips .gto-complex-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  renderRecordsScreen();
}
window.filterRecordsDiscipline = filterRecordsDiscipline;

export function setRecordsGender(isMale) {
  hubState.recordsIsMale = isMale;
  const mBtn = document.getElementById("records-gender-m");
  const fBtn = document.getElementById("records-gender-f");
  if (mBtn && fBtn) {
    if (isMale) {
      mBtn.classList.add("active");
      fBtn.classList.remove("active");
    } else {
      fBtn.classList.add("active");
      mBtn.classList.remove("active");
    }
  }
  renderRecordsScreen();
}
window.setRecordsGender = setRecordsGender;

export function renderProfileStagePills() {
  const container = document.getElementById("profile-stage-pills");
  if (!container) return;
  container.innerHTML = GTO_16_STAGES.map(s => {
    const isActive = s.id === hubState.activeStageProfile;
    return `<button class="gto-complex-pill ${isActive ? "active" : ""}" onclick="window.selectProfileStage(${s.id})" style="white-space: nowrap; font-size: 12px;">${s.roman} (${s.age})</button>`;
  }).join("");
}
window.renderProfileStagePills = renderProfileStagePills;

export function renderProfileStandards() {
  renderProfileStagePills();
  const container = document.getElementById("profile-standards-container");
  if (!container) return;

  const st = GTO_16_STAGES.find(x => x.id === hubState.activeStageProfile) || GTO_16_STAGES[5];
  const items = [
    { title: "Челночный бег 3x10 м", result: "6.8 с", badge: "Золотой знак", pct: 100, isDone: true, status: "Выполнено с запасом (+0.1 с)" },
    { title: "Подтягивание на перекладине", result: "16 повт.", badge: "Золотой знак", pct: 100, isDone: true, status: "Стандарт зафиксирован" },
    { title: "Прыжок в длину с места", result: "245 см", badge: "Золотой знак", pct: 100, isDone: true, status: "Личный рекорд сезона" },
    { title: "Наклон вперед из положения стоя", result: "+14 см", badge: "Золотой знак", pct: 100, isDone: true, status: "Выполнено" },
    { title: "Бег на 3000 м", result: "12:10 мин", badge: "Серебряный знак", pct: 85, isDone: false, status: "До золотого знака: -25 сек" }
  ];

  container.innerHTML = items.map(item => `
    <div style="background: var(--surface-raised); border: 1px solid var(--surface-border); border-radius: 14px; padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
        <span style="font-size: 14px; font-weight: 800; color: #FFFFFF;">${item.title}</span>
        <span class="${item.isDone ? "gto-badge-gold" : "gto-badge-federal"}" style="font-size: 11px;">${item.badge}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px;">
        <span>Ваш результат: <strong style="color: #fff;">${item.result}</strong></span>
        <span>Прогресс: ${item.pct}%</span>
      </div>
      <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
        <div style="width: ${item.pct}%; height: 100%; background: ${item.isDone ? "var(--status-accredited)" : "var(--badge-gold)"}; border-radius: 3px;"></div>
      </div>
      <div style="font-size: 11.5px; color: var(--text-tertiary);">${item.status}</div>
    </div>
  `).join("");
}

export function selectProfileStage(stageId) {
  hubState.activeStageProfile = stageId;
  renderProfileStandards();
}
window.selectProfileStage = selectProfileStage;

export function setProfileGender(isMale) {
  hubState.profileIsMale = isMale;
  const mBtn = document.getElementById("profile-gender-m");
  const fBtn = document.getElementById("profile-gender-f");
  if (mBtn && fBtn) {
    if (isMale) {
      mBtn.classList.add("active");
      fBtn.classList.remove("active");
    } else {
      fBtn.classList.add("active");
      mBtn.classList.remove("active");
    }
  }
  renderProfileStandards();
}
window.setProfileGender = setProfileGender;

export function copyAthleteUin() {
  const uin = "24-77-0091823";
  navigator.clipboard.writeText(uin).then(() => {
    showToast("УИН скопирован в буфер обмена: " + uin);
  }).catch(() => {
    showToast("УИН: " + uin);
  });
}
window.copyAthleteUin = copyAthleteUin;

export function downloadWalletPass() {
  showToast("Электронный пропуск FastPass сохранен в формате .pkpass");
}
window.downloadWalletPass = downloadWalletPass;

export function generateGtoCertificate() {
  showToast("Генерация официального сертификата ВРВС РФ...");
  setTimeout(() => {
    window.showActionNotice(
      "Электронный сертификат атлета",
      "Сертификат готов к печати: подтверждены нормативы VI ступени (Золотой знак отличия ГТО). Код сертификата: GTORU-2026-98124."
    );
  }, 400);
}
window.generateGtoCertificate = generateGtoCertificate;

export function renderRegionalBranchesScreen() {
  const container = document.getElementById("regional-branches-grid");
  if (!container) return;

  const branches = GTO_FEDERATIONS || [];
  let filtered = branches;

  if (hubState.regionsDistrict !== "all") {
    filtered = filtered.filter(b => b.districtKey === hubState.regionsDistrict || (b.district && b.district.toLowerCase().includes(hubState.regionsDistrict.toLowerCase())));
  }

  if (hubState.regionsSearch) {
    const q = hubState.regionsSearch.toLowerCase();
    filtered = filtered.filter(b => 
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.leader && b.leader.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  }

  const badgeEl = document.getElementById("regions-count-badge");
  if (badgeEl) badgeEl.textContent = `${filtered.length} отделений`;

  container.innerHTML = filtered.map(b => `
    <div class="gto-region-card" style="background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="gto-badge-federal" style="font-size: 10px;">${escapeHtml(b.district || "РФ")}</span>
        <span class="gto-badge-gold" style="font-size: 10px;">АККРЕДИТОВАН</span>
      </div>
      <h4 style="font-size: 16px; font-weight: 800; color: #FFFFFF; line-height: 1.3; margin: 0 0 8px;">
        ${escapeHtml(b.title)}
      </h4>
      <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px; flex: 1;">
        Руководитель: <strong style="color: #cbd5e1;">${escapeHtml(b.leader || "Назначается")}</strong>
      </div>
      <div style="font-size: 12px; color: #cbd5e1; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
        📍 ${escapeHtml(b.city || "Центр региона")} • ${escapeHtml(b.phone || "info@gto.com.ru")}
      </div>
    </div>
  `).join("");
}

export function filterRegions(districtKey, btn) {
  hubState.regionsDistrict = districtKey;
  if (btn) {
    document.querySelectorAll("#regions-district-chips .gto-complex-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  renderRegionalBranchesScreen();
}
window.filterRegions = filterRegions;

export function handleRegionsSearch(query) {
  hubState.regionsSearch = (query || "").trim();
  renderRegionalBranchesScreen();
}
window.handleRegionsSearch = handleRegionsSearch;

export function openFastPassQrModal() {
  const modal = document.getElementById("qr-fastpass-modal");
  if (!modal) return;

  const canvas = document.getElementById("qr-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 240, 240);

    ctx.fillStyle = "#0B0F17";
    for (let r = 0; r < 24; r++) {
      for (let c = 0; c < 24; c++) {
        if ((r < 7 && c < 7) || (r < 7 && c > 16) || (r > 16 && c < 7)) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            ctx.fillRect(c * 10, r * 10, 10, 10);
          }
        } else if (Math.sin(r * 13 + c * 17) > 0.1) {
          ctx.fillRect(c * 10, r * 10, 10, 10);
        }
      }
    }

    ctx.fillStyle = "#EF233C";
    ctx.beginPath();
    ctx.arc(120, 120, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ГТО", 120, 120);
  }

  modal.classList.add("active");
}
window.openFastPassQrModal = openFastPassQrModal;

export function closeFastPassQrModal() {
  const modal = document.getElementById("qr-fastpass-modal");
  if (modal) modal.classList.remove("active");
}
window.closeFastPassQrModal = closeFastPassQrModal;

export function openNoticeModal(title, msg) {
  const modal = document.getElementById("action-notice-modal");
  const tEl = document.getElementById("action-notice-title");
  const mEl = document.getElementById("action-notice-msg");
  if (!modal) return;
  if (tEl) tEl.textContent = title || "Уведомление";
  if (mEl) mEl.textContent = msg || "";
  modal.classList.add("active");
}
window.openNoticeModal = openNoticeModal;

export function closeNoticeModal() {
  const modal = document.getElementById("action-notice-modal");
  if (modal) modal.classList.remove("active");
}
window.closeNoticeModal = closeNoticeModal;

export function showActionNotice(title, msg) {
  openNoticeModal(title, msg);
}
window.showActionNotice = showActionNotice;

export function openRecordApplicationModal() {
  showActionNotice(
    "Заявка на фиксацию рекорда России",
    `Для подачи заявки в Реестр рекордов подготовьте:
1. Видеозапись выполнения попытки без склеек (1080p 60fps).
2. Протокол сертифицированного центра тестирования или турнира ВРВС.
3. Паспорт и подтвержденный УИН ВФСК ГТО.

Заявка будет рассмотрена комиссией VAR в течение 48 часов.`
  );
}
window.openRecordApplicationModal = openRecordApplicationModal;

export function showToast(msg) {
  const toast = document.getElementById("gto-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}
window.showToast = showToast;

export function closeModal() {
  document.querySelectorAll(".gto-modal-backdrop").forEach(m => m.classList.remove("active"));
}
window.closeModal = closeModal;


/* ==========================================================================
   МОДУЛЬ 8: МЕДИАЦЕНТР (MediaScreen.kt)
   19 официальных фотоальбомов ВКонтакте и 220+ видео Rutube/VK
   ========================================================================== */

export function renderMediaScreen() {
  if (hubState.mediaSubtab === "photos") {
    renderMediaAlbums();
  } else {
    renderMediaVideos();
  }
}
window.renderMediaScreen = renderMediaScreen;

export function switchMediaSubtab(subtab) {
  hubState.mediaSubtab = subtab;
  const pBtn = document.getElementById("media-subtab-photos-btn");
  const vBtn = document.getElementById("media-subtab-videos-btn");
  const pContainer = document.getElementById("media-photos-container");
  const vContainer = document.getElementById("media-videos-container");

  if (pBtn && vBtn) {
    if (subtab === "photos") {
      pBtn.classList.add("active");
      vBtn.classList.remove("active");
    } else {
      vBtn.classList.add("active");
      pBtn.classList.remove("active");
    }
  }

  if (pContainer && vContainer) {
    if (subtab === "photos") {
      pContainer.style.display = "block";
      vContainer.style.display = "none";
      renderMediaAlbums();
    } else {
      pContainer.style.display = "none";
      vContainer.style.display = "block";
      renderMediaVideos();
    }
  }
}
window.switchMediaSubtab = switchMediaSubtab;

export function handlePhotosSearch(query) {
  hubState.photosSearch = (query || "").trim().toLowerCase();
  renderMediaAlbums();
}
window.handlePhotosSearch = handlePhotosSearch;

export function renderMediaAlbums() {
  const container = document.getElementById("media-albums-grid");
  if (!container) return;

  const albums = GTO_VK_ALBUMS || [];
  let filtered = albums;

  if (hubState.photosSearch) {
    const q = hubState.photosSearch;
    filtered = albums.filter(a =>
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.desc && a.desc.toLowerCase().includes(q)) ||
      (a.id && String(a.id).includes(q))
    );
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #111a2a; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="#64748b" fill="none" stroke-width="1.5" style="margin-bottom: 12px;"><rect x="2" y="2" width="20" height="20" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Фотоальбомы не найдены</h4>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Попробуйте скорректировать запрос в строке поиска.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(album => {
    const count = album.photos ? album.photos.length : 0;
    const coverPhoto = (album.photos && album.photos[0]) ? (album.photos[0].thumb || album.photos[0].src) : GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;
    const yearMatch = album.title.match(/202[0-9]/);
    const yearStr = yearMatch ? yearMatch[0] : "2026";

    return `
      <div class="gto-album-card" style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; box-shadow: 0 4px 18px rgba(0,0,0,0.3);">
        <div style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #070a10; cursor: pointer;" onclick="window.openAlbumGallery('${album.id}')">
          <img src="${coverPhoto}" alt="${escapeHtml(album.title)}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" loading="lazy">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,15,25,0.85) 100%);"></div>
          
          <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 6px;">
            <span class="gto-badge-gold" style="font-size: 10.5px; padding: 3px 8px; backdrop-filter: blur(8px);">${count} фото</span>
            <span class="gto-badge-federal" style="font-size: 10.5px; padding: 3px 8px; backdrop-filter: blur(8px);">${yearStr}</span>
          </div>

          <div style="position: absolute; bottom: 10px; right: 10px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); color: #fff;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
          </div>
        </div>

        <div style="padding: 16px; display: flex; flex-direction: column; flex: 1;">
          <h4 style="font-size: 15px; font-weight: 800; color: #FFFFFF; line-height: 1.35; margin: 0 0 8px; min-height: 40px; cursor: pointer;" onclick="window.openAlbumGallery('${album.id}')">
            ${escapeHtml(album.title)}
          </h4>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Официальный фотоархив ВКонтакте</span>
          </div>

          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="gto-btn-primary" style="flex: 1; font-size: 12px; padding: 7px 12px; min-height: 36px;" onclick="window.openAlbumGallery('${album.id}')">
              <span>Смотреть галерею</span>
            </button>
            <a href="${(album.photos && album.photos[0] && album.photos[0].vkAlbumUrl) || 'https://vk.com/albums-211529393'}" target="_blank" rel="noopener noreferrer" class="gto-btn-outline" style="padding: 7px 10px; font-size: 12px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center;" title="Открыть в VK">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export function openAlbumGallery(albumId) {
  const albums = GTO_VK_ALBUMS || [];
  const album = albums.find(a => String(a.id) === String(albumId)) || albums[0];
  if (!album || !album.photos || !album.photos.length) {
    showToast("В данном альбоме нет доступных фото");
    return;
  }

  hubState.activeGalleryAlbum = album;
  hubState.activeGalleryIndex = 0;

  const modal = document.getElementById("media-photo-modal");
  const titleEl = document.getElementById("gallery-album-title");
  const counterEl = document.getElementById("gallery-counter");
  const imgEl = document.getElementById("gallery-active-img");

  if (titleEl) titleEl.textContent = album.title;
  if (counterEl) counterEl.textContent = `1 / ${album.photos.length}`;
  if (imgEl) imgEl.src = album.photos[0].src;

  if (modal) {
    modal.classList.add("active");
  }
}
window.openAlbumGallery = openAlbumGallery;

export function prevGalleryPhoto() {
  const album = hubState.activeGalleryAlbum;
  if (!album || !album.photos || !album.photos.length) return;

  hubState.activeGalleryIndex = (hubState.activeGalleryIndex - 1 + album.photos.length) % album.photos.length;
  updateGalleryDisplay();
}
window.prevGalleryPhoto = prevGalleryPhoto;

export function nextGalleryPhoto() {
  const album = hubState.activeGalleryAlbum;
  if (!album || !album.photos || !album.photos.length) return;

  hubState.activeGalleryIndex = (hubState.activeGalleryIndex + 1) % album.photos.length;
  updateGalleryDisplay();
}
window.nextGalleryPhoto = nextGalleryPhoto;

function updateGalleryDisplay() {
  const album = hubState.activeGalleryAlbum;
  if (!album) return;

  const curIdx = hubState.activeGalleryIndex;
  const photo = album.photos[curIdx];

  const counterEl = document.getElementById("gallery-counter");
  const imgEl = document.getElementById("gallery-active-img");

  if (counterEl) counterEl.textContent = `${curIdx + 1} / ${album.photos.length}`;
  if (imgEl && photo) imgEl.src = photo.src;
}

export function closeGalleryModal() {
  const modal = document.getElementById("media-photo-modal");
  if (modal) modal.classList.remove("active");
}
window.closeGalleryModal = closeGalleryModal;

export function handleVideosSearch(query) {
  hubState.videosSearch = (query || "").trim().toLowerCase();
  renderMediaVideos();
}
window.handleVideosSearch = handleVideosSearch;

export function renderMediaVideos() {
  const container = document.getElementById("media-videos-grid");
  if (!container) return;

  const videos = GTO_VIDEOS || [];
  let filtered = videos;

  if (hubState.videosSearch) {
    const q = hubState.videosSearch;
    filtered = videos.filter(v =>
      (v.title && v.title.toLowerCase().includes(q)) ||
      (v.desc && v.desc.toLowerCase().includes(q)) ||
      (v.badge && v.badge.toLowerCase().includes(q)) ||
      (v.categoryLabel && v.categoryLabel.toLowerCase().includes(q))
    );
  }

  const badgeEl = document.getElementById("media-videos-count-badge");
  if (badgeEl) badgeEl.textContent = `${filtered.length} видео`;

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #111a2a; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="#64748b" fill="none" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Видеоматериалы не найдены</h4>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Попробуйте скорректировать запрос в строке поиска.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(video => {
    const thumbUrl = video.thumb || GTO_STUDIO_ASSETS.VIDEO_THUMB_URL;
    const isRutube = video.platform === "rutube" || (video.embedUrl && video.embedUrl.includes("rutube"));

    return `
      <div class="gto-video-card" style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; box-shadow: 0 4px 18px rgba(0,0,0,0.3);">
        <div style="position: relative; width: 100%; height: 165px; overflow: hidden; background: #070a10; cursor: pointer;" onclick="window.openVideoDialog('${video.embedUrl}', '${escapeHtml(video.title)}')">
          <img src="${thumbUrl}" alt="${escapeHtml(video.title)}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" loading="lazy">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,15,25,0.8) 100%);"></div>
          
          <div style="position: absolute; top: 10px; left: 10px; display: flex; gap: 6px;">
            <span class="gto-badge-gold" style="font-size: 10px; padding: 2px 7px;">${escapeHtml(video.badge || "ЭФИР")}</span>
            <span class="gto-badge-federal" style="font-size: 10px; padding: 2px 7px; background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">${isRutube ? "Rutube" : "VK Video"}</span>
          </div>

          <div style="position: absolute; bottom: 8px; right: 8px;">
            <span class="gto-badge-federal" style="font-size: 10.5px; padding: 2px 7px; background: rgba(0,0,0,0.75);">${video.duration || "04:00"}</span>
          </div>

          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(225, 29, 72, 0.9); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 14px rgba(225,29,72,0.4); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="6 4 18 12 6 20 6 4"></polygon></svg>
            </div>
          </div>
        </div>

        <div style="padding: 14px; display: flex; flex-direction: column; flex: 1;">
          <div style="font-size: 11px; color: var(--secondary-blue); font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">
            ${escapeHtml(video.categoryLabel || "Соревнования")} • ${video.year || 2026}
          </div>
          <h4 style="font-size: 13.5px; font-weight: 800; color: #FFFFFF; line-height: 1.35; margin: 0 0 10px; min-height: 38px; cursor: pointer;" onclick="window.openVideoDialog('${video.embedUrl}', '${escapeHtml(video.title)}')">
            ${escapeHtml(video.title)}
          </h4>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);">
            <span style="font-size: 11.5px; color: var(--text-tertiary);">${video.views ? (video.views + " просмотров") : "Официальная трансляция"}</span>
            <button class="gto-btn-primary" style="padding: 5px 12px; font-size: 11.5px; min-height: auto;" onclick="window.openVideoDialog('${video.embedUrl}', '${escapeHtml(video.title)}')">
              <span>Смотреть</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

export function openVideoDialog(url, title) {
  const modal = document.getElementById("video-stream-modal");
  const iframe = document.getElementById("video-modal-iframe");
  const titleEl = document.getElementById("video-modal-title");

  if (!modal || !iframe) return;

  if (titleEl) titleEl.textContent = title || "Видеотрансляция ФМГТО РФ";
  iframe.src = url || "https://rutube.ru/play/embed/909056aa1ac71b1ba47e4f6955400ec6/";
  modal.classList.add("active");
}
window.openVideoDialog = openVideoDialog;

export function closeVideoDialog() {
  const modal = document.getElementById("video-stream-modal");
  const iframe = document.getElementById("video-modal-iframe");
  if (iframe) iframe.src = "";
  if (modal) modal.classList.remove("active");
}
window.closeVideoDialog = closeVideoDialog;


/* ==========================================================================
   МОДУЛЬ 9: О ФЕДЕРАЦИИ (FederationScreen.kt)
   Руководство, Правила вида спорта № 216, Приказы Минспорта, РУСАДА, Контакты
   ========================================================================== */

export function renderFederationScreen() {
  switchFedSubtab(hubState.fedSubtab || "leadership");
}
window.renderFederationScreen = renderFederationScreen;

export function switchFedSubtab(subtab) {
  hubState.fedSubtab = subtab;

  const btnIds = ["leadership", "rules", "docs", "antidoping", "contacts"];
  btnIds.forEach(id => {
    const btn = document.getElementById(`fed-subtab-${id}-btn`);
    if (btn) {
      if (id === subtab) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  const body = document.getElementById("fed-subtab-body");
  if (!body) return;

  if (subtab === "leadership") {
    body.innerHTML = renderLeadershipSubtab();
  } else if (subtab === "rules") {
    body.innerHTML = renderRulesSubtab();
  } else if (subtab === "docs") {
    body.innerHTML = renderDocsSubtab();
  } else if (subtab === "antidoping") {
    body.innerHTML = renderAntidopingSubtab();
  } else if (subtab === "contacts") {
    body.innerHTML = renderContactsSubtab();
  }
}
window.switchFedSubtab = switchFedSubtab;

function renderLeadershipSubtab() {
  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Президент Федерации Banner -->
      <div style="background: linear-gradient(135deg, rgba(20,29,48,0.95) 0%, rgba(10,16,28,0.95) 100%), url('${GTO_STUDIO_ASSETS.HERO_BG_URL}') center/cover; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); position: relative; overflow: hidden;">
        <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
          <div style="position: relative; width: 110px; height: 110px; border-radius: 50%; overflow: hidden; border: 3px solid #ffb300; box-shadow: 0 0 20px rgba(255,179,0,0.3); flex-shrink: 0;">
            <img src="${GTO_STUDIO_ASSETS.PRESIDENT_SHAMANOV_URL}" alt="Президент Шаманов В.А." style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="gto-badge-gold">ГЕРОЙ РОССИЙСКОЙ ФЕДЕРАЦИИ</span>
              <span class="gto-badge-federal">ГЕНЕРАЛ-ПОЛКОВНИК</span>
            </div>
            <h3 style="font-size: 22px; font-weight: 900; color: #FFFFFF; margin: 0 0 4px;">Шаманов Владимир Анатольевич</h3>
            <p style="font-size: 13.5px; color: var(--secondary-blue); font-weight: 700; margin: 0 0 10px;">
              Президент Общероссийской общественной организации «Федерация многоборья ГТО России»
            </p>
            <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin: 0; font-style: italic; border-left: 2px solid #ffb300; padding-left: 12px;">
              «Многоборье ГТО — это не просто вид спорта, это основа физического воспитания патриотичной, сильной и несгибаемой нации. Наша цель — вовлечь миллионы граждан России в соревновательное движение высших спортивных стандартов.»
            </p>
          </div>
        </div>
      </div>

      <!-- Исполнительный комитет и коллегия судей -->
      <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin: 8px 0 0;">Исполнительный комитет и ВКС РФ</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
        <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
          <div style="font-size: 11.5px; text-transform: uppercase; color: #ffb300; font-weight: 800; margin-bottom: 4px;">Вице-президент &amp; Главный судья ВКС</div>
          <div style="font-size: 16px; font-weight: 900; color: #FFFFFF;">Филатов Павел Андреевич</div>
          <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">Судья Всероссийской категории (СВК), координатор национальной судейской коллегии</div>
        </div>

        <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
          <div style="font-size: 11.5px; text-transform: uppercase; color: #60a5fa; font-weight: 800; margin-bottom: 4px;">Генеральный секретарь</div>
          <div style="font-size: 16px; font-weight: 900; color: #FFFFFF;">Войтеховский Владимир</div>
          <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">Мастер спорта, руководитель взаимодействия с Минспортом РФ и регионами</div>
        </div>

        <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
          <div style="font-size: 11.5px; text-transform: uppercase; color: #38bdf8; font-weight: 800; margin-bottom: 4px;">Главный комиссар VAR</div>
          <div style="font-size: 16px; font-weight: 900; color: #FFFFFF;">Ковалев Михаил Дмитриевич</div>
          <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">МСМК, председатель комиссии видеоповторов и спортивно-технического контроля</div>
        </div>

        <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
          <div style="font-size: 11.5px; text-transform: uppercase; color: #a78bfa; font-weight: 800; margin-bottom: 4px;">Председатель наблюдательного совета</div>
          <div style="font-size: 16px; font-weight: 900; color: #FFFFFF;">Колесов Александр</div>
          <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">Координатор федерального проекта «Спорт — норма жизни»</div>
        </div>
      </div>
    </div>
  `;
}

function renderRulesSubtab() {
  return `
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="gto-badge-gold">ВРВС № 1810001411Я</span>
            <span class="gto-badge-federal">ПРИКАЗ МИНСПОРТА № 216</span>
          </div>
          <button class="gto-btn-primary" onclick="window.downloadDocMock('Правила_многоборья_ГТО_№216.pdf')" style="font-size: 12px; padding: 6px 14px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Скачать Правила (PDF)</span>
          </button>
        </div>

        <h3 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 10px;">
          Официальные правила вида спорта «Многоборье ГТО»
        </h3>
        <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin: 0 0 16px;">
          Вид спорта «Многоборье ГТО» включает в себя комплексное тестирование физических качеств атлетов (силы, выносливости, скорости, координации и гибкости) в соревновательном формате с жестким техническим судейством и видеофиксацией VAR.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
          <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 14px; border-left: 3px solid #ffb300;">
            <div style="font-size: 13.5px; font-weight: 800; color: #fff; margin-bottom: 4px;">Стандарты снарядов</div>
            <div style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">Штанги калиброванные 20/15 кг, диски соревновательные бамперные, гири соревновательные 16/24/32 кг.</div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 14px; border-left: 3px solid #38bdf8;">
            <div style="font-size: 13.5px; font-weight: 800; color: #fff; margin-bottom: 4px;">Система видеоповторов VAR</div>
            <div style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">Съемка 120 FPS по углам помоста. Протест подается представителем команды в течение 15 минут после раунда.</div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 14px; border-left: 3px solid #22c55e;">
            <div style="font-size: 13.5px; font-weight: 800; color: #fff; margin-bottom: 4px;">Спортивные разряды ЕВСК</div>
            <div style="font-size: 12.5px; color: #94a3b8; line-height: 1.5;">Присвоение спортивных разрядов (3, 2, 1) и спортивных званий «Кандидат в мастера спорта», «Мастер спорта России».</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDocsSubtab() {
  const docs = (GTO_FEDERATION_INFO && GTO_FEDERATION_INFO.documents) || [];
  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">
        Официальные нормативные документы и приказы Минспорта Российской Федерации:
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${docs.map(doc => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); display: flex; align-items: center; justify-content: center; color: #ef4444; font-weight: 900; font-size: 12px;">
                PDF
              </div>
              <div>
                <div style="font-size: 14.5px; font-weight: 800; color: #FFFFFF; max-width: 650px;">${escapeHtml(doc.title)}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 2px;">Размер: ${doc.size || "1.5 MB"} • Официальный приказ</div>
              </div>
            </div>

            <button class="gto-btn-primary" onclick="window.downloadDocMock('${escapeHtml(doc.title)}.pdf')" style="font-size: 12px; padding: 7px 16px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>Скачать документ</span>
            </button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAntidopingSubtab() {
  return `
    <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span class="gto-badge-federal" style="background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.35); color: #22c55e;">ЧИСТЫЙ СПОРТ</span>
        <span class="gto-badge-gold">РУСАДА / RUSADA 2026</span>
      </div>

      <h3 style="font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 10px;">
        Антидопинговая политика Федерации многоборья ГТО
      </h3>
      <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin: 0 0 16px;">
        Федерация категорически осуждает применение допинга и строго соблюдает Общероссийские антидопинговые правила и Всемирный антидопинговый кодекс WADA. Все атлеты категории «Элита» и «Профессионалы» подлежат выборочному допинг-контролю.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
          <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0 0 6px;">Сертификат РУСАДА «ТРИАГОН»</h4>
          <p style="font-size: 12.5px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px;">Обязателен для допуска ко всем всероссийским стартам ЕКП 2026 года.</p>
          <a href="https://course.rusada.ru/" target="_blank" rel="noopener noreferrer" class="gto-btn-primary" style="font-size: 12px; padding: 6px 12px; text-decoration: none; display: inline-flex;">
            Пройти онлайн-курс РУСАДА
          </a>
        </div>

        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06);">
          <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0 0 6px;">Проверка препаратов</h4>
          <p style="font-size: 12.5px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px;">Сервис оперативной проверки лекарственных средств на наличие субстанций из Запрещенного списка 2026.</p>
          <a href="https://list.rusada.ru/" target="_blank" rel="noopener noreferrer" class="gto-btn-outline" style="font-size: 12px; padding: 6px 12px; text-decoration: none; display: inline-flex;">
            Проверить препарат в базе
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderContactsSubtab() {
  return `
    <div style="display: flex; flex-direction: column; gap: 18px;">
      <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;">
        <h3 style="font-size: 18px; font-weight: 900; color: #fff; margin: 0 0 14px;">
          Центральный аппарат Федерации
        </h3>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 12px; color: #ffb300; font-weight: 800; text-transform: uppercase;">Штаб-квартира &amp; Президиум</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff; margin-top: 4px;">119270, г. Москва, ул. Лужники, д. 24</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Спортивный комплекс «Лужники», офис 310</div>
          </div>

          <div>
            <div style="font-size: 12px; color: #60a5fa; font-weight: 800; text-transform: uppercase;">Электронная почта</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff; margin-top: 4px;">info@gto.com.ru</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Судейство: referees@gto.com.ru</div>
          </div>

          <div>
            <div style="font-size: 12px; color: #22c55e; font-weight: 800; text-transform: uppercase;">Горячая линия атлетов</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff; margin-top: 4px;">8 (800) 550-20-26</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Пн–Пт с 09:00 до 18:00 МСК</div>
          </div>
        </div>

        <div style="border-radius: 14px; overflow: hidden; height: 200px; border: 1px solid rgba(255,255,255,0.1); position: relative;">
          <img src="${GTO_STUDIO_ASSETS.LUZHNIKI_MAP_URL}" alt="Карта Лужники" style="width: 100%; height: 100%; object-fit: cover;">
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(10,15,25,0.7) 100%); display: flex; align-items: flex-end; padding: 16px;">
            <span class="gto-badge-gold">Олимпийский комплекс «Лужники» • Главный стадион</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function downloadDocMock(docName) {
  showToast(`Загрузка документа: ${docName}`);
}
window.downloadDocMock = downloadDocMock;

export function initStitchHub() {
  console.log("Initializing Official Stitch & Google AI Studio Hub...");
  initCountdownTimer();
  renderOverviewTournaments();
  renderOverviewTopRecords();
  renderOverviewStages();
  renderOverviewNews();
  renderCalendarEvents();
  renderProfileStandards();
  renderRegionalBranchesScreen();
  renderRecordsScreen();
  renderStandaloneTournamentDetail(101);
  renderMediaScreen();
  renderFederationScreen();

  const hash = window.location.hash.replace("#", "");
  if (hash && SCREEN_TITLES[hash]) {
    switchTab(hash);
  } else {
    switchTab("overview");
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStitchHub);
  } else {
    initStitchHub();
  }
}
