/**
 * Official Application Controller for Федерация многоборья ГТО России (gto.com.ru)
 * Powered by 100% Local Scraped Data (321 Records, Full News Articles, 113 Tournaments with Posters, 49 Federations)
 */

import {
  GTO_OFFICIAL_NEWS,
  GTO_CALENDAR_EVENTS,
  GTO_FEDERATIONS,
  GTO_VIDEOS,
  GTO_FEDERATION_INFO,
  GTO_RECORDS,
  GTO_STANDARDS,
  GTO_SPORT_RULES
} from "./gto_data.js";
import { GTO_VK_ALBUMS } from "./vk_albums_data.js";
import { getTournamentMedia, getTournamentByAlbumId, getTournamentByVideoUrl } from "./tournament_media.js";

// Global Application State
const state = {
  currentTab: "overview",
  mediaSubtab: "photos",
  fedSubtab: "cabinet",
  calendarFilter: "all",
  calendarSearch: "",
  recordsViewMode: "grid", // "grid" or "table"
  recordsDiscipline: "all",
  quickDiscipline: "all",
  recordCategory: "all",
  recordsSex: "ALL",
  recordsAge: "all",
  recordsSearch: "",
  regionsSearch: "",
  activeVideoId: 2,
  videoCategory: "all",
  videoYear: "all",
  videoSearchQuery: "",
  recordCuration: "all",
  activeAlbumId: GTO_VK_ALBUMS && GTO_VK_ALBUMS.length ? GTO_VK_ALBUMS[0].id : "all",
  currentModalAlbumId: null,
  currentModalPhotoIndex: 0,
  currentModalVideos: [],
  currentModalVideoIndex: 0,
  athlete: {
    name: "Воронин Алексей Сергеевич",
    uin: "24-77-0048192",
    region: "Приморский край",
    stage: "18-29 лет",
    phone: "+7 (914) 700-11-22",
    email: "voronin@gto.ru"
  }
};

/* --- Helpers --- */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEventStatus(event) {
  if (!event) return { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true };
  const act = String(event.actionText || "").toLowerCase();
  const title = String(event.title || "").toLowerCase();
  const dates = String(event.period || event.dates || "").toLowerCase();
  const allText = title + " " + dates + " " + String(event.location || "").toLowerCase();

  // Explicit results action
  if (act.includes("результат") || act.includes("итоги")) {
    return { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true };
  }
  // Historical past years (2020-2025)
  if (/(2020|2021|2022|2023|2024|2025)/.test(allText) && !allText.includes("2026")) {
    return { code: "finished", text: "Завершено • Архив", badgeClass: "finished", isFinished: true };
  }
  // Ongoing live event in September 2026
  if (event.id === 110) {
    return { code: "live", text: "Идёт сейчас • Заявки", badgeClass: "live", isLive: true };
  }
  // Open upcoming events in September 2026
  if (event.id === 112 || event.id === 113) {
    return { code: "open", text: "Регистрация открыта", badgeClass: "open", isOpen: true };
  }
  // Completed months in 2026 (prior to Sep 8, 2026)
  if (dates.includes("январ") || dates.includes("феврал") || dates.includes("март") ||
      dates.includes("апрел") || dates.includes("мая") || dates.includes("май") ||
      dates.includes("июн") || dates.includes("июл") || dates.includes("август")) {
    return { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true };
  }
  if (dates.includes("07 сентября") || dates.includes("06 сентября") || dates.includes("05 сентября")) {
    return { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true };
  }
  if (act.includes("скоро")) {
    return { code: "soon", text: "Анонс • Скоро старт", badgeClass: "soon", isSoon: true };
  }
  if (event.id > 109) {
    return { code: "open", text: "Регистрация открыта", badgeClass: "open", isOpen: true };
  }
  return { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true };
}

function getEventMeta(event) {
  if (!event) return { level: "Соревнования", dates: "2026 г.", location: "Россия", participants: "Все категории", isFederal: false, poster: "assets/logo.png", status: { code: "finished", text: "Завершено • Итоги", badgeClass: "finished", isFinished: true }, media: { videos: [], albums: [], hasVideo: false, hasPhotos: false, totalPhotosCount: 0 } };
  const level = event.level || event.category || "Всероссийские соревнования";
  const dates = event.dates || event.period || "Сезон 2026";
  let location = event.location || event.region || "Российская Федерация";
  if (location.includes("•")) {
    location = location.split("•")[0].replace(/&nbsp;/g, " ").trim();
  }
  const participants = event.participants || event.category || "Юноши, девушки, мужчины, женщины (VI-XI ступени)";
  const lvlStr = String(level).toLowerCase();
  const titStr = String(event.title || "").toLowerCase();
  const isFederal = lvlStr.includes("всероссийск") ||
                    lvlStr.includes("межрегиональн") ||
                    lvlStr.includes("международн") ||
                    lvlStr.includes("кубок") ||
                    titStr.includes("кубок") ||
                    titStr.includes("игры гто") ||
                    Boolean(event.isFederal);
  const poster = event.poster || event.localPoster || (event.img && event.img.startsWith("assets/") ? event.img : `assets/events/event_${event.id}.jpg`);
  const status = getEventStatus(event);
  const media = getTournamentMedia(event.id, event);
  const videoUrl = media.primaryVideo ? media.primaryVideo.embedUrl : null;
  const videoTitle = media.primaryVideo ? media.primaryVideo.title : null;
  return { level, dates, location, participants, isFederal, poster, status, media, videoUrl, videoTitle };
}

/* --- Modals (Defined at top-level) --- */
export function openModal(title, contentHtml) {
  const backdrop = document.getElementById("gto-modal-backdrop");
  const titleEl = document.getElementById("gto-modal-title");
  const bodyEl = document.getElementById("gto-modal-content");

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = contentHtml;
  if (backdrop) backdrop.classList.add("active");
  document.body.style.overflow = "hidden";
}

export function closeModal() {
  const backdrop = document.getElementById("gto-modal-backdrop");
  if (backdrop) backdrop.classList.remove("active");
  document.body.style.overflow = "";
}

/* --- Dynamic App Navigation & Screen Metadata --- */
const TAB_TITLES = {
  overview: { title: "Главная", badge: "Минспорт РФ № 216" },
  calendar: { title: "Календарь стартов 2026", badge: "113 турниров" },
  records: { title: "Книга рекордов России", badge: "321 рекорд" },
  media: { title: "Медиацентр", badge: "19 альбомов • 220 видео" },
  federation: { title: "Федерация & Атлет", badge: "49 регионов" },
  // Backward compatibility aliases
  photos: { title: "Фотоальбомы соревнований", badge: "19 турниров" },
  videos: { title: "Видеотрансляции & Эфиры", badge: "Rutube & VK" },
  cabinet: { title: "Кабинет атлета", badge: "Личный профиль" },
  calculator: { title: "Калькулятор нормативов", badge: "16 ступеней" },
  about: { title: "О Федерации многоборья ГТО", badge: "Официально" },
  rules: { title: "Правила вида спорта", badge: "Приказ Минспорта" },
  regions: { title: "Региональные отделения", badge: "49 регионов" },
  contacts: { title: "Контакты Федерации", badge: "Штаб-квартира" }
};

let navHistory = ["overview"];

export function navigateBack() {
  if (navHistory.length > 1) {
    navHistory.pop(); // Remove current
    const prev = navHistory.pop(); // Get previous
    switchTab(prev || "overview", false);
  } else {
    switchTab("overview", false);
  }
}
window.navigateBack = navigateBack;

/* --- Hero Background Video Controller --- */
export function playHeroVideo() {
  const video = document.getElementById("hero-bg-video");
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  if (!video.hasAttribute("playsinline")) video.setAttribute("playsinline", "");
  if (!video.hasAttribute("webkit-playsinline")) video.setAttribute("webkit-playsinline", "");

  const promise = video.play();
  if (promise !== undefined) {
    promise.catch(err => {
      console.log("Autoplay waiting for touch gesture:", err);
      const wakeOnTouch = () => {
        video.play().catch(() => {});
        window.removeEventListener("touchstart", wakeOnTouch);
        window.removeEventListener("click", wakeOnTouch);
        window.removeEventListener("scroll", wakeOnTouch);
      };
      window.addEventListener("touchstart", wakeOnTouch, { passive: true, once: true });
      window.addEventListener("click", wakeOnTouch, { passive: true, once: true });
      window.addEventListener("scroll", wakeOnTouch, { passive: true, once: true });
    });
  }
}
window.playHeroVideo = playHeroVideo;

export function toggleHeroVideo() {
  const video = document.getElementById("hero-bg-video");
  const btn = document.getElementById("hero-video-toggle-btn");
  const label = document.getElementById("hero-video-btn-label");
  if (!video) return;

  if (video.paused) {
    video.play().then(() => {
      if (btn) btn.classList.remove("paused");
      if (label) label.textContent = "Живой фон";
      showToast("Фоновое видео запущено");
    }).catch(() => {});
  } else {
    video.pause();
    if (btn) btn.classList.add("paused");
    if (label) label.textContent = "Видео на паузе";
    showToast("Фоновое видео приостановлено");
  }
}
window.toggleHeroVideo = toggleHeroVideo;

/* --- Subnav Segmented Controllers --- */
export function switchMediaSubtab(subtab) {
  state.mediaSubtab = subtab;
  const btnPhotos = document.getElementById("media-subtab-btn-photos");
  const btnVideos = document.getElementById("media-subtab-btn-videos");
  const panePhotos = document.getElementById("media-subview-photos");
  const paneVideos = document.getElementById("media-subview-videos");

  if (btnPhotos) btnPhotos.classList.toggle("active", subtab === "photos");
  if (btnVideos) btnVideos.classList.toggle("active", subtab === "videos");
  if (panePhotos) panePhotos.style.display = subtab === "photos" ? "block" : "none";
  if (paneVideos) paneVideos.style.display = subtab === "videos" ? "block" : "none";

  if (subtab === "photos") {
    renderPhotos();
  } else {
    renderVideos();
  }
}
window.switchMediaSubtab = switchMediaSubtab;

export function switchFedSubtab(subtab) {
  state.fedSubtab = subtab;
  const subtabs = ["cabinet", "calculator", "about", "structure", "disciplines", "documents", "antidoping", "regions", "media-press"];
  subtabs.forEach(t => {
    const btn = document.getElementById(`fed-subtab-btn-${t}`);
    const pane = document.getElementById(`fed-subview-${t}`);
    if (btn) btn.classList.toggle("active", t === subtab);
    if (pane) pane.style.display = t === subtab ? "block" : "none";
  });

  if (subtab === "cabinet") {
    try { initCabinet(); } catch (e) {}
  } else if (subtab === "calculator") {
    try { updateCalculator(); } catch (e) {}
  } else if (subtab === "about") {
    try { renderAbout(); } catch (e) {}
  } else if (subtab === "structure") {
    try { renderStructure(); } catch (e) {}
  } else if (subtab === "disciplines") {
    try { renderFedDisciplines(); } catch (e) {}
  } else if (subtab === "documents") {
    try { renderFedDocuments(); } catch (e) {}
  } else if (subtab === "antidoping") {
    try { renderAntidoping(); } catch (e) {}
  } else if (subtab === "regions") {
    try { renderRegions(); } catch (e) {}
  } else if (subtab === "media-press") {
    try { renderMediaPress(); } catch (e) {}
  }
}
window.switchFedSubtab = switchFedSubtab;

/* --- Tab Navigation --- */
export function switchTab(rawTabId, pushHistory = true) {
  if (!rawTabId) return;
  let tabId = rawTabId;
  let subtab = null;

  // Handle aliases to media / federation subtabs
  if (tabId === "photos") {
    tabId = "media";
    subtab = "photos";
  } else if (tabId === "videos") {
    tabId = "media";
    subtab = "videos";
  } else if (tabId === "cabinet") {
    tabId = "federation";
    subtab = "cabinet";
  } else if (tabId === "calculator") {
    tabId = "federation";
    subtab = "calculator";
  } else if (tabId === "about") {
    tabId = "federation";
    subtab = "about";
  } else if (tabId === "structure" || tabId === "leadership") {
    tabId = "federation";
    subtab = "structure";
  } else if (tabId === "disciplines" || tabId === "rules") {
    tabId = "federation";
    subtab = "disciplines";
  } else if (tabId === "documents" || tabId === "docs") {
    tabId = "federation";
    subtab = "documents";
  } else if (tabId === "antidoping" || tabId === "rusada") {
    tabId = "federation";
    subtab = "antidoping";
  } else if (tabId === "regions") {
    tabId = "federation";
    subtab = "regions";
  } else if (tabId === "contacts" || tabId === "media-press" || tabId === "press") {
    tabId = "federation";
    subtab = "media-press";
  }

  state.currentTab = tabId;

  // Manage navigation history stack
  if (pushHistory) {
    if (navHistory[navHistory.length - 1] !== tabId) {
      navHistory.push(tabId);
    }
    try {
      history.pushState({ tab: tabId, raw: rawTabId }, "", `#${rawTabId}`);
    } catch (e) {}
  }

  // Update Dynamic Header State
  const topBar = document.getElementById("gto-top-bar");
  const screenTitleEl = document.getElementById("header-screen-title");
  const screenBadgeEl = document.getElementById("header-screen-badge");
  const meta = TAB_TITLES[rawTabId] || TAB_TITLES[tabId] || { title: "Федерация многоборья ГТО", badge: "Минспорт РФ" };

  if (topBar) {
    if (tabId === "overview") {
      topBar.classList.remove("is-inner-page");
    } else {
      topBar.classList.add("is-inner-page");
    }
  }
  if (screenTitleEl) screenTitleEl.textContent = meta.title;
  if (screenBadgeEl) screenBadgeEl.textContent = meta.badge;

  // Update tab buttons (desktop)
  document.querySelectorAll(".gto-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab-target") === tabId);
  });

  // Update drawer items (mobile drawer)
  document.querySelectorAll(".gto-drawer-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-tab-target") === tabId);
  });

  // Update bottom nav (mobile)
  document.querySelectorAll(".gto-bottom-nav-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-tab-target") === tabId);
  });

  // Update tab views
  document.querySelectorAll(".tab-view").forEach(view => {
    view.classList.remove("active");
  });

  const activeView = document.getElementById(`tab-${tabId}`);
  if (activeView) {
    activeView.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (tabId === "records") {
    renderRecords();
  } else if (tabId === "media") {
    if (subtab) {
      switchMediaSubtab(subtab);
    } else {
      switchMediaSubtab(state.mediaSubtab || "photos");
    }
  } else if (tabId === "federation") {
    if (subtab) {
      switchFedSubtab(subtab);
    } else {
      switchFedSubtab(state.fedSubtab || "cabinet");
    }
  } else if (tabId === "calendar") {
    try { renderCalendar(); } catch (e) {}
  } else if (tabId === "overview") {
    renderOverview();
    playHeroVideo();
  }
}
window.switchTab = switchTab;

function initNavigation() {
  document.querySelectorAll("[data-tab-target]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-tab-target");
      switchTab(target);
    });
  });

  window.addEventListener("popstate", (e) => {
    const targetTab = (e.state && e.state.tab) || window.location.hash.replace("#", "") || "overview";
    switchTab(targetTab, false);
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById(`tab-${hash}`) && hash !== state.currentTab) {
      switchTab(hash, false);
    }
  });

  if (window.location.hash) {
    const initialHash = window.location.hash.replace("#", "");
    if (document.getElementById(`tab-${initialHash}`)) {
      switchTab(initialHash, false);
    }
  }
}

/* --- Mobile Drawer --- */
export function openDrawer() {
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (drawer) drawer.classList.add("active");
  if (backdrop) backdrop.classList.add("active");
  document.body.style.overflow = "hidden";
}

export function closeDrawer() {
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (drawer) drawer.classList.remove("active");
  if (backdrop) backdrop.classList.remove("active");
  document.body.style.overflow = "";
}

function initDrawer() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const closeBtn = document.getElementById("drawer-close-btn");
  const backdrop = document.getElementById("drawer-backdrop");

  if (toggleBtn) toggleBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (backdrop) backdrop.addEventListener("click", closeDrawer);
}

/* --- Overview Tab Renderer --- */
function renderOverview() {
  // 1. Render Featured Headline News
  const featuredNewsContainer = document.getElementById("overview-featured-news");
  if (featuredNewsContainer && GTO_OFFICIAL_NEWS.length > 0) {
    const topNews = GTO_OFFICIAL_NEWS[0];
    const excerpt = topNews.text && topNews.text.length > 50
      ? topNews.text
      : "8 августа в рамках празднования Дня физкультурника в Спортивном городке в Лужниках прошли масштабные соревнования по многоборью ГТО с участием более 300 атлетов.";

    featuredNewsContainer.innerHTML = `
      <article class="gto-featured-news-card" onclick="window.openNewsModal(${topNews.id})" role="button" tabindex="0" aria-label="Главная новость: ${escapeHtml(topNews.title)}">
        <div class="gto-featured-news-media">
          <img src="${topNews.img}" alt="${escapeHtml(topNews.title)}" class="gto-featured-news-img" onerror="this.onerror=null; this.src='assets/logo.png';">
          <div class="gto-featured-news-media-overlay"></div>
          <div class="gto-featured-news-overlay-top">
            <span class="gto-featured-badge">
              <span class="gto-pulse-dot"></span>
              <span>ГЛАВНАЯ НОВОСТЬ</span>
            </span>
            <span class="gto-featured-date-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${escapeHtml(topNews.date)}</span>
            </span>
          </div>
        </div>
        <div class="gto-featured-news-body">
          <div class="gto-featured-news-main-text">
            <div class="gto-featured-news-kicker">
              <span class="gto-badge-federal" style="font-size: 11px; padding: 3px 9px;">ОФИЦИАЛЬНО • МНОГОБОРЬЕ ГТО</span>
              <span class="gto-featured-location-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>Лужники, Москва</span>
              </span>
            </div>
            <h3 class="gto-featured-news-title">${escapeHtml(topNews.title)}</h3>
            <p class="gto-featured-news-excerpt">${escapeHtml(excerpt)}</p>
            <div class="gto-featured-tags">
              <span class="gto-featured-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>300+ атлетов</span>
              </span>
              <span class="gto-featured-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#FBBF24" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                <span>Кубок Бельского</span>
              </span>
              <span class="gto-featured-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                <span>3 рекордные дисциплины</span>
              </span>
            </div>
          </div>
          <div class="gto-featured-news-footer">
            <div class="gto-featured-author">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
              <span>Пресс-служба ГТО</span>
            </div>
            <button class="gto-btn-primary" style="padding: 9px 20px; font-size: 13px;" onclick="event.stopPropagation(); window.openNewsModal(${topNews.id});">
              <span>Читать полностью</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // 2. Render Rest of News Grid (4 more articles)
  const newsContainer = document.getElementById("overview-news-grid");
  if (newsContainer) {
    const restNews = GTO_OFFICIAL_NEWS.slice(1, 5);
    newsContainer.innerHTML = restNews.map(item => `
      <div class="gto-news-card" onclick="window.openNewsModal(${item.id})">
        <div class="gto-news-thumb-wrap">
          <img src="${item.img}" alt="${escapeHtml(item.title)}" class="gto-news-thumb" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
          <div class="gto-news-date-badge">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${escapeHtml(item.date)}
          </div>
        </div>
        <div class="gto-news-body">
          <h3 class="gto-news-title">${escapeHtml(item.title)}</h3>
          <p class="gto-news-desc">${escapeHtml(item.text)}</p>
          <div class="gto-news-footer" style="margin-top: auto; padding-top: 10px;">
            <button class="gto-btn-outline" style="width: 100%; justify-content: center; padding: 8px 12px; font-size: 12.5px; border-color: rgba(255, 255, 255, 0.16);">
              <span>Читать новость &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }

  // 3. Render Upcoming Tournaments with Direct Apply
  const eventsContainer = document.getElementById("overview-events-grid");
  if (eventsContainer) {
    const upcomingEvents = GTO_CALENDAR_EVENTS.filter(e => {
      const meta = getEventMeta(e);
      return meta.status.code !== "finished";
    }).slice(0, 4);

    const eventsToShow = upcomingEvents.length >= 2 ? upcomingEvents : GTO_CALENDAR_EVENTS.slice(0, 4);
    eventsContainer.innerHTML = eventsToShow.map(event => renderEventCardHtml(event)).join("");
  }
}

/* --- About Federation Renderer --- */
/* --- About & Federation Subtab Renderers --- */
export function renderAbout() {
  const historyEl = document.getElementById("about-history-text");
  if (historyEl) historyEl.textContent = GTO_FEDERATION_INFO.history;
}
window.renderAbout = renderAbout;

export function renderStructure() {
  const leadershipEl = document.getElementById("about-leadership-grid");
  if (leadershipEl) {
    leadershipEl.innerHTML = GTO_FEDERATION_INFO.leadership.map(leader => `
      <div class="gto-leader-card">
        <div class="gto-leader-role">${escapeHtml(leader.role)}</div>
        <div class="gto-leader-name">${escapeHtml(leader.name)}</div>
        <div class="gto-leader-desc">${escapeHtml(leader.desc)}</div>
      </div>
    `).join("");
  }
}
window.renderStructure = renderStructure;

export function renderFedDisciplines() {
  const discGrid = document.getElementById("fed-disciplines-grid");
  if (!discGrid) return;
  const rules = window.GTO_SPORT_RULES || GTO_SPORT_RULES;
  if (!rules || !rules.disciplines) return;

  discGrid.innerHTML = rules.disciplines.map(d => {
    let iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    if (d.iconKey === "pentathlon") {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>`;
    } else if (d.iconKey === "sprint") {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FBBF24" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    } else if (d.iconKey === "champions") {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    } else if (d.iconKey === "relay") {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22C55E" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    } else if (d.iconKey === "hero") {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#A855F7" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    }

    return `
      <div class="gto-discipline-card" style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06);">${iconSvg}</span>
          <span class="gto-badge-federal">${escapeHtml(d.badge)}</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px;">${escapeHtml(d.title)}</h3>
        <p style="font-size: 13px; color: var(--gto-text-secondary); line-height: 1.55; margin-bottom: 14px;">${escapeHtml(d.desc)}</p>
        
        <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); padding: 12px 14px; margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 800; color: #38BDF8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Этапы соревнований:</div>
          <ul style="padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--gto-text-secondary);">
            ${d.stages.map(s => `<li><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.target)}</li>`).join("")}
          </ul>
        </div>

        <div style="font-size: 12px; color: var(--gto-text-muted); border-top: 1px solid var(--gto-border); padding-top: 10px;">
          <strong>Подсчет результатов:</strong> ${escapeHtml(d.scoring)}
        </div>
      </div>
    `;
  }).join("");
}
window.renderFedDisciplines = renderFedDisciplines;

export function renderFedDocuments() {
  const docsEl = document.getElementById("about-docs-list");
  if (docsEl) {
    docsEl.innerHTML = GTO_FEDERATION_INFO.documents.map((doc, idx) => `
      <div class="gto-doc-item">
        <div>
          <div class="gto-doc-title">${escapeHtml(doc.title)}</div>
          <div class="gto-doc-meta">${escapeHtml(doc.type)} • ${escapeHtml(doc.size)} • Официальный нормативный акт Минспорта РФ</div>
        </div>
        <button onclick="window.openDocumentModal(${idx})" class="gto-btn-outline" style="padding: 8px 14px; font-size: 12.5px;">
          Ознакомиться
        </button>
      </div>
    `).join("");
  }
}
window.renderFedDocuments = renderFedDocuments;

export function renderAntidoping() {}
window.renderAntidoping = renderAntidoping;

export function renderMediaPress() {}
window.renderMediaPress = renderMediaPress;

/* --- Official No Rep Modal & Criteria --- */
export function openNoRepModal(initialDisciplineKey = "all") {
  const standards = [
    {
      key: "kettlebell",
      name: "Рывок гири 16 / 24 кг",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9a6 6 0 0 1 12 0v2H6V9z"></path><circle cx="12" cy="15" r="7"></circle></svg>`,
      valid: "Гиря поднимается непрерывным движением вверх на прямую руку. В верхней точке обязательна видимая фиксация: рука, туловище и ноги выпрямлены, движение остановлено. Свободная рука не касается тела и снаряда.",
      noRep: [
        "Дожим гири при подъеме (отсутствие непрерывного движения)",
        "Отсутствие четкой фиксации в верхней точке (пронос гири)",
        "Касание свободной рукой гири, ноги или туловища",
        "Сгибание коленей при фиксации вверху",
        "Опускание гири на плечо или помост до завершения подхода"
      ],
      videoReq: "Камера под углом 45°, расстояние 2.5–3 м. Полный обзор спортсмена от стоп до гири в верхней точке. Электронный таймер в кадре.",
      tip: "Дышите синхронно с махом: вдох при опускании гири, мощный акцентированный выдох при фиксации вверху."
    },
    {
      key: "pullups",
      name: "Подтягивания на высокой перекладине",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16M18 4v16M2 8h4M2 16h4M18 8h4M18 16h4M6 12h12"></path></svg>`,
      valid: "Исходное положение — вис хватом сверху, руки полностью выпрямлены в локтях. Подтягивание засчитывается, когда подбородок поднялся выше грифа перекладины по горизонтали. Опускание в полный вис с паузой 0.5 сек.",
      noRep: [
        "Подбородок не поднялся выше перекладины",
        "Неполное выпрямление рук в локтевых суставах в нижнем положении",
        "Рывки ногами, сгибание ног в коленях, маховые движения (киппинг/баттерфляй)",
        "Разновременное (поочередное) сгибание рук"
      ],
      videoReq: "Съемка сбоку-спереди (угол 45°). Должен быть четко виден уровень перекладины, подбородок вверху и полное выпрямление локтей внизу.",
      tip: "Сохраняйте корпус прямым в положении «лодочки» (hollow body), напрягайте пресс и ягодицы."
    },
    {
      key: "pushups",
      name: "Отжимания от контактной платформы",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18h16M7 14l5-6 5 6"></path></svg>`,
      valid: "Упор лежа, руки на ширине плеч, тело составляет прямую линию. Опускание до касания грудью контактной платформы высотой 5 см (со звуковым/световым сигналом), возврат в полное разгибание рук.",
      noRep: [
        "Отсутствие касания платформы грудью (не сработал датчик)",
        "Прогиб в пояснице или подъем таза выше линии плеч",
        "Неполное разгибание рук в верхнем положении",
        "Касание пола коленями, бедрами или животом"
      ],
      videoReq: "Съемка сбоку на уровне пола (высота 30-50 см). В кадре должна быть видна контактная платформа, линия тела и выпрямление локтей.",
      tip: "Смотрите чуть вперед перед платформой, держите локти под углом 45 градусов к корпусу."
    },
    {
      key: "crunch",
      name: "Подъем туловища из положения лежа (Пресс)",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>`,
      valid: "И.п. — лежа на спине на мате, руки за головой в замке, колени согнуты под 90°, стопы зафиксированы. Подъем до касания локтями коленей, возврат до касания лопатками мата.",
      noRep: [
        "Размыкание пальцев рук из замка за головой",
        "Отсутствие касания локтями коленей в верхней точке",
        "Отсутствие касания лопатками мата в нижнем положении",
        "Смещение таза или отрыв таза от мата"
      ],
      videoReq: "Съемка сбоку под углом 90°. В кадре обязательны мат, замок рук на затылке, касание лопатками и секундомер (1 минута).",
      tip: "Держите ровный темп: 1 повтор в 1.2–1.5 секунды, не делайте резких падений на спину."
    },
    {
      key: "longjump",
      name: "Прыжок в длину с места",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"></polyline><polyline points="17 18 12 13 7 18"></polyline></svg>`,
      valid: "И.п. — стойка перед линией отталкивания, стопы параллельны. Прыжок выполняется одновременным толчком двумя ногами. Измерение по перпендикуляру от линии отталкивания до ближайшего следа приземления.",
      noRep: [
        "Заступ за линию отталкивания или касание ее стопой",
        "Поочередное отталкивание ногами (наскок)",
        "Прыжок с предварительного подскока",
        "Касание пола руками сзади пятки при приземлении"
      ],
      videoReq: "Съемка сбоку с захватом линии отталкивания, прыжковой зоны и мерной ленты / разметки.",
      tip: "Мощный мах руками вперед-вверх и активный вынос коленей перед приземлением на стопы."
    },
    {
      key: "flexibility",
      name: "Наклон вперед на гимнастической скамье",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>`,
      valid: "И.п. — стоя на гимнастической скамье, ноги выпрямлены в коленях, стопы параллельны. Наклон вперед с фиксацией пальцев обеих рук на мерной шкале не менее 2 секунд.",
      noRep: [
        "Сгибание ног в коленных суставах",
        "Фиксация результата одной рукой",
        "Отсутствие фиксации позы в течение 2 секунд",
        "Рывковые пружинящие движения без фиксации"
      ],
      videoReq: "Съемка сбоку с четким обзором коленных суставов (строго прямые) и шкалы измерений с фиксацией 2 сек.",
      tip: "Выполняйте плавный выдох во время наклона, не задерживайте дыхание."
    },
    {
      key: "sprint",
      name: "Бег на 60 м / 100 м & Спринт",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
      valid: "Старт по сигналу стартера (выстрел/гудок). Дистанция преодолевается по своей дорожке. Время фиксируется в момент пересечения створа финиша грудью.",
      noRep: [
        "Фальстарт до звукового сигнала",
        "Переход на чужую беговую дорожку с созданием помехи",
        "Преждевременная остановка до линии финиша"
      ],
      videoReq: "Съемка со старта и створа финиша с электронным хронометражем и разметкой дорожки.",
      tip: "Сохраняйте наклон корпуса на первых 20 метрах разгона и держите высокую частоту шага."
    },
    {
      key: "swimming",
      name: "Плавание 50 м вольным стилем",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M2 17h20M2 7h20"></path></svg>`,
      valid: "Старт с тумбочки или из воды у бортика по сигналу. Дистанция преодолевается любым стилем. На финише спортсмен обязан коснуться стенки бассейна.",
      noRep: [
        "Фальстарт до звукового сигнала стартера",
        "Отталкивание от дна бассейна или удержание за разделительные дорожки",
        "Создание помех плывущим на соседних дорожках"
      ],
      videoReq: "Непрерывная съемка старта, преодоления дорожки и касания финишного бортика с таймером.",
      tip: "Следите за скольжением после каждого гребка и мощно работайте ногами на финишных 15 метрах."
    },
    {
      key: "shooting",
      name: "Стрельба из электронного оружия (10 м)",
      iconSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>`,
      valid: "Положение сидя или стоя с опорой локтей о стол. Дистанция 10 м. 3 пробных (3 мин) и 5 зачетных (10 мин). Результат фиксируется электронной мишенью.",
      noRep: [
        "Выстрел до команды судьи «Огонь»",
        "Заступ за линию ведения огня",
        "Превышение регламентированного лимита времени"
      ],
      videoReq: "Съемка стрелковой позиции и электронного табло мишенной установки.",
      tip: "Плавный спуск курка на полувыдохе без резкого рывка указательного пальца."
    }
  ];

  window._norepStandards = standards;

  let activeKey = initialDisciplineKey;
  if (activeKey === "all" || !standards.some(s => s.key === activeKey)) {
    activeKey = "kettlebell";
  }

  const renderContent = (curKey) => {
    const item = standards.find(s => s.key === curKey) || standards[0];
    return `
      <div class="gto-norep-modal-wrap">
        <div class="gto-norep-header-banner">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="gto-badge-federal" style="background: rgba(230,57,70,0.2); border-color: rgba(230,57,70,0.4); color: #fff;">СУДЕЙСКИЙ РЕГЛАМЕНТ ГТО</span>
            <span class="gto-badge-gold">ВРВС № 1810001411Я</span>
            <span style="font-size: 11px; color: var(--gto-text-secondary);">Правила Минспорта РФ</span>
          </div>
          <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 4px 0;">
            Официальные критерии зачета повторений и правила видеофиксации
          </h3>
          <p style="font-size: 12.5px; color: var(--gto-text-secondary); margin: 0; line-height: 1.5;">
            Для фиксации в «Книге рекордов России» все попытки проходят обязательную экспертизу Главной судейской коллегии и системы видеоповторов (VAR).
          </p>
        </div>

        <!-- Горизонтальная лента дисциплин -->
        <div class="gto-norep-disc-pills" id="norep-disc-pills">
          ${standards.map(s => `
            <button type="button" class="gto-norep-disc-btn ${s.key === curKey ? 'active' : ''}" onclick="window.selectNoRepDiscipline('${s.key}')">
              ${s.iconSvg}
              <span>${escapeHtml(s.name.split(' ')[0] + (s.name.includes('гири') ? ' гири' : ''))}</span>
            </button>
          `).join('')}
        </div>

        <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: 12px; padding: 18px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
            <span style="color: #FBBF24; display: inline-flex;">${item.iconSvg}</span>
            <h4 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin: 0;">${escapeHtml(item.name)}</h4>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 14px;">
            <!-- Valid Box -->
            <div class="gto-rep-box">
              <div class="gto-rep-box-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Засчитанный повтор (VALID REP)</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gto-text-secondary); line-height: 1.6; margin: 0;">${escapeHtml(item.valid)}</p>
            </div>

            <!-- No Rep Box -->
            <div class="gto-norep-box">
              <div class="gto-norep-box-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Ошибки и нарушения (NO REP)</span>
              </div>
              <ul class="gto-norep-list">
                ${item.noRep.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Video Requirements -->
          <div class="gto-norep-video-rules" style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: #38BDF8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              <span>Стандарт видеофиксации для проекта «Иду на рекорд»</span>
            </div>
            <p style="font-size: 12.5px; color: var(--gto-text-secondary); line-height: 1.55; margin: 0;">${escapeHtml(item.videoReq)}</p>
          </div>

          <!-- Tip -->
          <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 12.5px; color: #FBBF24;">
            <strong>Совет Главного судьи:</strong> ${escapeHtml(item.tip)}
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="gto-btn-outline" onclick="window.closeModal()" style="font-size: 12.5px; padding: 8px 16px;">
            Закрыть
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="gto-btn-outline" onclick="window.closeModal(); window.switchFedSubtab('documents');" style="font-size: 12.5px; padding: 8px 14px;">
              <span>Правила вида спорта PDF</span>
            </button>
            <button type="button" class="gto-btn-primary" onclick="window.closeModal(); window.openChallengeModal();" style="font-size: 12.5px; padding: 8px 18px;">
              <span>Подать заявку на рекорд &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  window.selectNoRepDiscipline = (discKey) => {
    const contentEl = document.getElementById("gto-modal-content");
    if (contentEl) {
      contentEl.innerHTML = renderContent(discKey);
    }
  };

  openModal("Критерии No Rep & Судейские стандарты ГТО", renderContent(activeKey));
}
window.openNoRepModal = openNoRepModal;

/* --- Video Modal Controller --- */
export function openVideoModal(videoId) {
  let vid = GTO_VIDEOS.find(v => v.id === videoId);
  if (!vid && typeof videoId === "string" && videoId.startsWith("http")) {
    vid = {
      title: "Официальное видео соревнований ГТО",
      embedUrl: videoId,
      badge: "ТРАНСЛЯЦИЯ",
      duration: "Трансляция",
      desc: "Официальная видеозапись и дневник турнира Всероссийской федерации многоборья ГТО."
    };
  }
  if (!vid) vid = GTO_VIDEOS[0];

  const html = `
    <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: var(--gto-radius-sm); overflow: hidden; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);">
      <iframe src="${vid.embedUrl}?autoplay=1" style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="clipboard-write; autoplay; fullscreen" allowFullScreen></iframe>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
      <span class="gto-badge-federal">${escapeHtml(vid.badge || "ВИДЕО")}</span>
      ${vid.categoryLabel ? `<span class="gto-badge-gold">${escapeHtml(vid.categoryLabel)}</span>` : ""}
      <span style="font-size: 12px; color: var(--gto-text-muted);">${escapeHtml(vid.duration || "")} ${vid.views ? "• " + escapeHtml(vid.views) + " просмотров" : ""}</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 10px;">${escapeHtml(vid.title)}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: var(--gto-text-secondary); margin-bottom: 20px;">
      ${escapeHtml(vid.desc || "Официальные материалы Общероссийской федерации многоборья ГТО России (gto.com.ru).")}
    </p>
    <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
      <button class="gto-btn-primary" onclick="window.closeModal(); window.switchTab('videos');">
        Все видеотрансляции &rarr;
      </button>
    </div>
  `;
  openModal(vid.title, html);
}
window.openVideoModal = openVideoModal;

/* --- Featured Major Events Renderer (Overview) --- */
export function renderMajorEvents() {
  const container = document.getElementById("overview-major-events-grid");
  if (!container) return;

  const sortedEvents = [...GTO_CALENDAR_EVENTS].sort((a, b) => b.id - a.id);
  const majorEvents = sortedEvents.filter(e => e.isMajor || (e.title || "").toLowerCase().includes("игры гто") || (e.title || "").toLowerCase().includes("кубок")).slice(0, 4);

  container.innerHTML = majorEvents.map(event => {
    const meta = getEventMeta(event);
    const hasVideo = Boolean(event.videoUrl);
    const isCompleted = meta.status.code === "finished";

    return `
      <div class="gto-featured-event-card">
        <div class="gto-featured-poster-wrap" onclick="window.openEventDetailsModal(${event.id})">
          <img src="${meta.poster}" alt="${escapeHtml(event.title)}" class="gto-featured-poster-img" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
          <div class="gto-event-poster-gradient"></div>
          <div class="gto-event-poster-top">
            <span class="gto-badge-federal">★ ГЛАВНЫЙ СТАРТ ГОДА</span>
            <span class="gto-event-status-pill ${meta.status.badgeClass}">${escapeHtml(meta.status.text)}</span>
          </div>
          ${hasVideo ? `
            <div class="gto-featured-play-badge" onclick="event.stopPropagation(); window.openVideoModal('${event.videoUrl}');" title="Смотреть видео анонс">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
          ` : ""}
          <div class="gto-event-poster-bottom">
            <span class="gto-event-dates-pill">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${escapeHtml(meta.dates)}
            </span>
          </div>
        </div>

        <div class="gto-featured-body">
          <h3 class="gto-featured-title">${escapeHtml(event.title)}</h3>
          
          <div class="gto-event-info-rows" style="margin-bottom: 16px;">
            <div class="gto-event-info-row">
              <svg viewBox="0 0 24 24" width="15" height="15"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span><strong>Место:</strong> ${escapeHtml(meta.location)}</span>
            </div>
            <div class="gto-event-info-row">
              <svg viewBox="0 0 24 24" width="15" height="15"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>${escapeHtml(meta.participants)}</span>
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap;">
            ${isCompleted ? `
              <button class="gto-btn-results" style="flex: 1;" onclick="window.openCompletedEventModal(${event.id})">
                <span>Итоги и протокол</span>
              </button>
            ` : `
              <button class="gto-btn-apply" style="flex: 1;" onclick="window.openApplyModal(${event.id})">
                <span>Подать заявку</span>
              </button>
            `}
            ${hasVideo ? `
              <button class="gto-btn-video" onclick="window.openVideoModal('${event.videoUrl}')" title="Смотреть официальную запись видеотрансляции">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Запись эфира</span>
              </button>
            ` : ""}
            <button class="gto-btn-outline" style="padding: 8px 12px; font-size: 12.5px;" onclick="window.openEventDetailsModal(${event.id})">
              Положение
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}
window.renderMajorEvents = renderMajorEvents;

/* --- Overview Featured Videos Renderer --- */
export function renderOverviewVideos() {
  const container = document.getElementById("overview-videos-grid");
  if (!container) return;

  const videos = GTO_VIDEOS.slice(0, 4);
  container.innerHTML = videos.map(vid => `
    <div class="gto-video-card" onclick="window.openVideoModal(${vid.id})">
      <div class="gto-video-thumb-wrap">
        <img src="${vid.thumb}" alt="${escapeHtml(vid.title)}" class="gto-video-thumb" loading="lazy">
        <div class="gto-video-badge">${escapeHtml(vid.badge)}</div>
        <div class="gto-video-duration">${escapeHtml(vid.duration)}</div>
        <div class="gto-featured-play-badge" style="width: 44px; height: 44px;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
      <div class="gto-video-body">
        <h4 class="gto-video-title">${escapeHtml(vid.title)}</h4>
        <p class="gto-video-desc">${escapeHtml(vid.desc || "")}</p>
        <div class="gto-video-meta">
          <span style="color: var(--gto-blue-hover); font-weight: 700;">${escapeHtml(vid.categoryLabel || "Видео")}</span>
          <span>${escapeHtml(vid.views || "")} просмотров</span>
        </div>
      </div>
    </div>
  `).join("");
}
window.renderOverviewVideos = renderOverviewVideos;

/* --- Rules of the Sport (Правила вида спорта) Renderer --- */
export function switchRulesSection(sectionId) {
  document.querySelectorAll(".gto-rules-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-rules-tab") === sectionId);
  });

  document.querySelectorAll(".rules-tab-view").forEach(view => {
    view.style.display = "none";
  });

  const activeEl = document.getElementById(`rules-section-${sectionId}`);
  if (activeEl) {
    activeEl.style.display = "block";
  }
}
window.switchRulesSection = switchRulesSection;

export function renderRules() {
  const rules = window.GTO_SPORT_RULES || GTO_SPORT_RULES;
  if (!rules) return;

  // 1. Disciplines Section
  const discContainer = document.getElementById("rules-section-disciplines");
  if (discContainer && rules.disciplines) {
    discContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${rules.disciplines.map(d => {
          let discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
          if (d.iconKey === "pentathlon") {
            discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>`;
          } else if (d.iconKey === "sprint") {
            discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FBBF24" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
          } else if (d.iconKey === "champions") {
            discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
          } else if (d.iconKey === "relay") {
            discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22C55E" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
          } else if (d.iconKey === "hero") {
            discSvg = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A855F7" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
          }
          return `
          <div class="gto-discipline-card" style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.06);">${discSvg}</span>
              <span class="gto-badge-federal">${escapeHtml(d.badge)}</span>
            </div>
            <h3 style="font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 8px;">${escapeHtml(d.title)}</h3>
            <p style="font-size: 13.5px; color: var(--gto-text-secondary); line-height: 1.55; margin-bottom: 16px;">${escapeHtml(d.desc)}</p>
            
            <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); padding: 14px; margin-bottom: 14px;">
              <div style="font-size: 12px; font-weight: 800; color: #38BDF8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Этапы и нормативы:</div>
              <ul style="padding-left: 18px; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--gto-text-secondary);">
                ${d.stages.map(s => `
                  <li><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.target)}</li>
                `).join("")}
              </ul>
            </div>

            <div style="font-size: 12.5px; color: var(--gto-text-muted); border-top: 1px solid var(--gto-border); padding-top: 10px;">
              <strong>Подсчет результатов:</strong> ${escapeHtml(d.scoring)}
            </div>
          </div>
        `;
        }).join("")}
      </div>
    `;
  }

  // 2. Technical Standards (Зачет / No Rep) Section
  const stdContainer = document.getElementById("rules-section-standards");
  if (stdContainer && rules.technicalStandards) {
    stdContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div style="background: rgba(0, 120, 191, 0.1); border: 1px solid var(--gto-blue); border-radius: var(--gto-radius-sm); padding: 16px 20px; font-size: 13.5px; color: var(--gto-text-secondary); line-height: 1.6;">
          <strong style="color: #38BDF8;">Официальные судейские критерии Федерации:</strong> На всех стартах Единого календарного плана Минспорта России применяется строгое судейство. Повторение считается выполненным только при соблюдении полной амплитуды и фиксации. За нарушения объявляется «No Rep» (повторение не засчитывается).
        </div>

        ${rules.technicalStandards.map(st => `
          <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 22px;">
            <h3 style="font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 16px;">${escapeHtml(st.name)}</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 14px;">
              <div class="gto-rep-box">
                <div class="gto-rep-box-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Критерии правильного выполнения (ЗАЧЕТ)</span>
                </div>
                <p style="font-size: 13.5px; line-height: 1.6; color: var(--gto-text-secondary); margin: 0;">${escapeHtml(st.validCriteria)}</p>
              </div>

              <div class="gto-norep-box">
                <div class="gto-norep-box-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span>Нарушения и ошибки (NO REP)</span>
                </div>
                <ul class="gto-norep-list">
                  ${st.noRepCriteria.map(c => `<li>${escapeHtml(c)}</li>`).join("")}
                </ul>
              </div>
            </div>

            <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); padding: 12px 16px; font-size: 13px; color: var(--gto-blue-hover);">
              <strong>Совет судьи:</strong> ${escapeHtml(st.tip)}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // 3. Refereeing, VAR & Protests Section
  const refContainer = document.getElementById("rules-section-refereeing");
  if (refContainer && rules.refereeing) {
    refContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 22px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(56,189,248,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #38BDF8;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px;">Судейская коллегия</h3>
          <p style="font-size: 13.5px; color: var(--gto-text-secondary); line-height: 1.6; margin-bottom: 12px;">
            В состав судейской бригады входят: Главный судья соревнований, Главный секретарь, старшие судьи по видам испытаний и линейные судьи на снарядах.
          </p>
          <div style="font-size: 13px; color: var(--gto-text-muted);">
            Судьи на снарядах громко ведут счет засчитанных повторений («Один, Два...») либо незамедлительно произносят «Нет» / «No Rep» с указанием ошибки.
          </div>
        </div>

        <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 22px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239,68,68,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #EF4444;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px;">Система видеоповторов (VAR)</h3>
          <p style="font-size: 13.5px; color: var(--gto-text-secondary); line-height: 1.6; margin-bottom: 12px;">
            На финалах Игр ГТО и чемпионатах России каждый помост оборудован высокоскоростными камерами 120 кадров/сек.
          </p>
          <div style="font-size: 13px; color: var(--gto-text-muted);">
            Главный судья имеет право остановить подведение итогов для просмотра видеоповтора спорного повторения или заступа за линию.
          </div>
        </div>

        <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 22px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(251,191,36,0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #FBBF24;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 8px;">Подача протестов и апелляций</h3>
          <p style="font-size: 13.5px; color: var(--gto-text-secondary); line-height: 1.6; margin-bottom: 12px;">
            Официальный протест может быть подан официальным представителем команды или спортсменом в течение <strong>15 минут</strong> после окончания забега / выступления потока.
          </p>
          <div style="font-size: 13px; color: var(--gto-text-muted);">
            Решение апелляционного жюри во главе с Главным судьей является окончательным и обжалованию не подлежит.
          </div>
        </div>
      </div>
    `;
  }

  // 4. Sports Ranks (ЕВСК) Section
  const ranksContainer = document.getElementById("rules-section-ranks");
  if (ranksContainer) {
    ranksContainer.innerHTML = `
      <div style="background: var(--gto-surface); border: 1px solid var(--gto-border); border-radius: var(--gto-radius); padding: 24px;">
        <h3 style="font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 12px;">Единая всероссийская спортивная классификация (ЕВСК)</h3>
        <p style="font-size: 14px; color: var(--gto-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          В соответствии с Приказом Минспорта РФ № 216 по результатам участия в чемпионатах, кубках и первенствах России по виду спорта «Многоборье ГТО» атлетам присваиваются официальные государственные спортивные звания и спортивные разряды:
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
          <div style="background: var(--gto-surface-raised); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: var(--gto-radius-sm); padding: 18px;">
            <div class="gto-badge-gold" style="margin-bottom: 8px;">ВЫСШЕЕ ЗВАНИЕ</div>
            <h4 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">Мастер спорта России (МС)</h4>
            <div style="font-size: 13px; color: var(--gto-text-secondary);">1–3 место на Чемпионате России или Кубке России при выполнении норматива очков.</div>
          </div>

          <div style="background: var(--gto-surface-raised); border: 1px solid var(--gto-blue); border-radius: var(--gto-radius-sm); padding: 18px;">
            <div class="gto-badge-federal" style="margin-bottom: 8px;">КАНДИДАТ В МАСТЕРА</div>
            <h4 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">КМС</h4>
            <div style="font-size: 13px; color: var(--gto-text-secondary);">1–6 место на Чемпионатах федеральных округов, финалах Первенств России среди молодежи.</div>
          </div>

          <div style="background: var(--gto-surface-raised); border: 1px solid var(--gto-border); border-radius: var(--gto-radius-sm); padding: 18px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--gto-text-muted); text-transform: uppercase; margin-bottom: 8px;">МАССОВЫЕ РАЗРЯДЫ</div>
            <h4 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">I, II, III взрослые разряды</h4>
            <div style="font-size: 13px; color: var(--gto-text-secondary);">Присваиваются на чемпионатах субъектов РФ и официальных городских первенствах.</div>
          </div>

          <div style="background: var(--gto-surface-raised); border: 1px solid var(--gto-border); border-radius: var(--gto-radius-sm); padding: 18px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--gto-text-muted); text-transform: uppercase; margin-bottom: 8px;">ЮНОШЕСКИЙ СПОРТ</div>
            <h4 style="font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 6px;">I, II, III юношеские разряды</h4>
            <div style="font-size: 13px; color: var(--gto-text-secondary);">Для спортсменов в возрасте от 10 до 17 лет на официальных детско-юношеских первенствах.</div>
          </div>
        </div>
      </div>
    `;
  }
}
window.renderRules = renderRules;

export function setCalendarFilter(filterKey) {
  state.calendarFilter = filterKey;
  document.querySelectorAll("#tab-calendar .gto-filter-pill").forEach(p => {
    p.classList.toggle("active", p.getAttribute("data-filter") === filterKey);
  });
  renderCalendar();
}
window.setCalendarFilter = setCalendarFilter;

/* --- Calendar Renderer (113 Competitions with Posters) --- */
export function renderCalendar() {
  const container = document.getElementById("calendar-events-container") || document.getElementById("calendar-events-grid");
  if (!container) return;

  // Calculate dynamic counts for all filter tabs
  const upcomingCount = GTO_CALENDAR_EVENTS.filter(e => !getEventMeta(e).status.isFinished).length;
  const majorCount = GTO_CALENDAR_EVENTS.filter(e => e.isMajor || getEventMeta(e).isFederal).length;
  const photosCount = GTO_CALENDAR_EVENTS.filter(e => getEventMeta(e).media.hasPhotos).length;
  const videoCount = GTO_CALENDAR_EVENTS.filter(e => getEventMeta(e).media.hasVideo).length;
  const federalCount = GTO_CALENDAR_EVENTS.filter(e => getEventMeta(e).isFederal).length;
  const regionalCount = GTO_CALENDAR_EVENTS.filter(e => !getEventMeta(e).isFederal).length;
  const finishedCount = GTO_CALENDAR_EVENTS.filter(e => getEventMeta(e).status.isFinished).length;

  const pillLabels = {
    all: `Все старты (${GTO_CALENDAR_EVENTS.length})`,
    upcoming: `Идёт регистрация (${upcomingCount})`,
    major: `Главные события (${majorCount})`,
    federal: `Федеральные (${federalCount})`,
    regional: `Региональные (${regionalCount})`,
    completed: `Прошедшие (${finishedCount})`,
    finished: `Прошедшие (${finishedCount})`,
    photos: `С фото (${photosCount})`,
    video: `С трансляцией (${videoCount})`
  };

  document.querySelectorAll("#tab-calendar .gto-filter-pill").forEach(pill => {
    const f = pill.getAttribute("data-filter");
    if (pillLabels[f]) {
      const span = pill.querySelector("span");
      if (span) {
        span.textContent = pillLabels[f];
      }
    }
  });

  const q = (state.calendarSearch || "").toLowerCase().trim();
  const filter = state.calendarFilter || "all";

  const sortedEvents = [...GTO_CALENDAR_EVENTS].sort((a, b) => b.id - a.id);

  const filtered = sortedEvents.filter(ev => {
    const meta = getEventMeta(ev);
    if (filter === "federal") {
      if (!meta.isFederal) return false;
    } else if (filter === "regional") {
      if (meta.isFederal) return false;
    } else if (filter === "major") {
      if (!ev.isMajor && !meta.isFederal) return false;
    } else if (filter === "photos") {
      if (!meta.media.hasPhotos) return false;
    } else if (filter === "video") {
      if (!meta.media.hasVideo) return false;
    } else if (filter === "upcoming") {
      if (meta.status.isFinished) return false;
    } else if (filter === "finished" || filter === "completed") {
      if (!meta.status.isFinished) return false;
    }

    if (q) {
      const matches = (ev.title || "").toLowerCase().includes(q) ||
                      (meta.location || "").toLowerCase().includes(q) ||
                      (meta.dates || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--gto-surface); border-radius: var(--gto-radius); border: 1px solid var(--gto-border); color: var(--gto-text-muted);">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--gto-text-muted)" fill="none" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Соревнований не найдено</div>
        <div>По запросу «${escapeHtml(q)}» стартов не найдено. Попробуйте изменить параметры поиска.</div>
      </div>
    `;
    return;
  }

  let filterBannerHtml = "";
  if (filter === "video") {
    filterBannerHtml = `
      <div style="grid-column: 1 / -1; display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--gto-radius-sm); margin-bottom: 8px;">
        <span style="color: #F87171; line-height: 1; flex-shrink: 0; display: inline-flex; margin-top: 2px;">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </span>
        <div>
          <div style="font-size: 14.5px; font-weight: 800; color: #fff; margin-bottom: 4px;">Официальные записи видеотрансляций турниров</div>
          <div style="font-size: 12.5px; color: var(--gto-text-muted); line-height: 1.45;">
            В этом разделе собраны соревнования Федерации с доступными видеозаписями соревновательных дней, финальных заездов и торжественных церемоний награждения (Rutube & VK Видео). Нажмите «Запись эфира» на карточке любого турнира для просмотра.
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = filterBannerHtml + filtered.map(ev => renderEventCardHtml(ev)).join("");
}
window.renderCalendar = renderCalendar;

function renderEventCardHtml(event) {
  const meta = getEventMeta(event);
  const badgeClass = meta.isFederal ? "gto-badge-federal" : "gto-badge-regional";
  const badgeText = meta.isFederal ? "ФЕДЕРАЛЬНЫЙ СТАРТ" : "РЕГИОНАЛЬНЫЙ СТАРТ";
  const posterSrc = meta.poster;
  const status = meta.status;
  const isCompleted = status.code === "finished";
  const media = meta.media;

  return `
    <div class="gto-event-card ${meta.isFederal ? "federal" : ""}">
      <div class="gto-event-poster-wrap" onclick="${isCompleted ? `window.openCompletedEventModal(${event.id})` : `window.openEventDetailsModal(${event.id})`}" title="${isCompleted ? "Нажмите, чтобы открыть итоги, видео и фото соревнований" : "Нажмите, чтобы открыть афишу и регламент"}">
        <img src="${posterSrc}" alt="${escapeHtml(event.title)}" class="gto-event-poster-img" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png'; this.classList.add('fallback');">
        <div class="gto-event-poster-gradient"></div>
        <div class="gto-event-poster-top">
          <span class="${badgeClass}">${badgeText}</span>
          <span class="gto-event-status-pill ${status.badgeClass}">${escapeHtml(status.text)}</span>
        </div>
        <div class="gto-event-poster-bottom">
          <span class="gto-event-dates-pill">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${escapeHtml(meta.dates)}
          </span>
          ${media.hasVideo ? `
            <span class="gto-event-video-badge-pill" onclick="event.stopPropagation(); window.openCompletedEventModal(${event.id});" title="Смотреть официальную запись видеотрансляции турнира" style="display:inline-flex;align-items:center;gap:5px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Запись эфира</span>
            </span>
          ` : ""}
          ${media.hasPhotos ? `
            <span class="gto-event-photo-count-pill" onclick="event.stopPropagation(); window.openTournamentAlbum('${media.albums[0].id}');" title="${media.totalPhotosText}" style="display:inline-flex;align-items:center;gap:5px;">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>${media.totalPhotosCount} фото</span>
            </span>
          ` : ""}
        </div>
      </div>

      <div class="gto-event-content">
        <h3 class="gto-event-title" title="${escapeHtml(event.title)}">${escapeHtml(event.title)}</h3>

        <div class="gto-event-info-rows">
          <div class="gto-event-info-row">
            <svg viewBox="0 0 24 24" width="15" height="15"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span class="gto-event-location-text"><strong>Место:</strong> ${escapeHtml(meta.location)}</span>
          </div>
          <div class="gto-event-info-row">
            <svg viewBox="0 0 24 24" width="15" height="15"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>${escapeHtml(meta.participants)}</span>
          </div>
        </div>

        <div class="gto-event-actions">
          ${isCompleted ? `
            <button class="gto-btn-results" onclick="window.openCompletedEventModal(${event.id})">
              <span>Итоги и протокол</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </button>
            ${media.hasVideo ? `
              <button class="gto-btn-video" onclick="event.stopPropagation(); window.openCompletedEventModal(${event.id});" title="Смотреть официальную запись трансляции соревнований">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Запись эфира</span>
              </button>
            ` : ""}
            ${media.hasPhotos ? `
              <button class="gto-btn-outline" style="padding: 8px 10px; font-size: 12px; color: #60A5FA; border-color: rgba(96, 165, 250, 0.4); display:inline-flex; align-items:center; gap:5px;" onclick="event.stopPropagation(); window.openTournamentAlbum('${media.albums[0].id}');" title="Открыть фотоальбом соревнований">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Фото</span>
              </button>
            ` : ""}
          ` : `
            <button class="gto-btn-apply" onclick="window.openApplyModal(${event.id})">
              <span>Подать заявку</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
            <button class="gto-btn-outline" style="padding: 9px 12px; font-size: 12.5px;" onclick="window.openEventDetailsModal(${event.id})">
              <span>Афиша и регламент</span>
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

/* --- Records: Controls & Renderer (Stylish & Compact, 321 Records, 24 Disciplines) --- */
function getCategoryForDiscipline(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("без границ") || n.includes("спец.олимпиада")) return "adaptive";
  if (n.includes("гир")) return "kettlebell";
  if (n.includes("бег") || n.includes("вело") || n.includes("челночн")) return "speed";
  if (n.includes("подтягиван") || n.includes("отжиман") || n.includes("бёрпи") || n.includes("переворот") || n.includes("вис")) return "strength";
  return "gymnastics";
}

export function openDisciplineModal() {
  const discMap = new Map();
  GTO_RECORDS.forEach(r => {
    discMap.set(r.discipline, (discMap.get(r.discipline) || 0) + 1);
  });

  const disciplines = Array.from(discMap.entries()).sort((a, b) => a[0].localeCompare(b[0], "ru"));
  const currentVal = state.recordsDiscipline || "all";
  state.modalDiscCat = "all";

  const html = `
    <div class="gto-disc-modal-wrap">
      <div style="margin-bottom: 2px;">
        <div class="gto-badge-federal" style="display: inline-flex; margin-bottom: 6px;">Реестр ВРВС Минспорта России</div>
        <div style="font-size: 13px; color: var(--gto-text-secondary);">Выберите спортивную дисциплину для просмотра официальных рекордов Федерации</div>
      </div>

      <!-- Поиск дисциплины -->
      <div class="gto-search-wrap" style="max-width: 100%;">
        <svg class="gto-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="disc-modal-search-input" class="gto-search-input" placeholder="Быстрый поиск дисциплины (подтягивания, пресс, гиря...)" oninput="window.filterDisciplineModal()">
      </div>

      <!-- Категории дисциплин -->
      <div class="gto-disc-modal-categories" id="disc-modal-categories">
        <button class="gto-disc-modal-cat-btn active" data-cat="all" onclick="window.setDisciplineModalCategory('all')">Все (${disciplines.length})</button>
        <button class="gto-disc-modal-cat-btn" data-cat="strength" onclick="window.setDisciplineModalCategory('strength')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M6 4v16M18 4v16M2 8h4M2 16h4M18 8h4M18 16h4M6 12h12"></path></svg>
          <span>Воркаут &amp; Сила</span>
        </button>
        <button class="gto-disc-modal-cat-btn" data-cat="kettlebell" onclick="window.setDisciplineModalCategory('kettlebell')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M6 9a6 6 0 0 1 12 0v2H6V9z"></path><circle cx="12" cy="15" r="7"></circle></svg>
          <span>Гири</span>
        </button>
        <button class="gto-disc-modal-cat-btn" data-cat="speed" onclick="window.setDisciplineModalCategory('speed')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>Бег &amp; Скорость</span>
        </button>
        <button class="gto-disc-modal-cat-btn" data-cat="gymnastics" onclick="window.setDisciplineModalCategory('gymnastics')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>
          <span>Гимнастика &amp; Кор</span>
        </button>
        <button class="gto-disc-modal-cat-btn" data-cat="adaptive" onclick="window.setDisciplineModalCategory('adaptive')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="4" r="2"></circle><path d="M9 20h6M12 4v8l4 2M8 14h4"></path></svg>
          <span>Без границ</span>
        </button>
      </div>

      <!-- Сетка дисциплин -->
      <div class="gto-disc-modal-grid" id="disc-modal-grid">
        <!-- Плитка Все дисциплины -->
        <div class="gto-disc-modal-tile ${currentVal === 'all' ? 'active' : ''}" 
             onclick="window.selectDisciplineFromModal('all')" 
             data-name="все дисциплины" 
             data-cat="all">
          <div class="gto-disc-modal-tile-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <div class="gto-disc-modal-tile-info">
            <div class="gto-disc-modal-tile-title">Все спортивные дисциплины</div>
            <div class="gto-disc-modal-tile-meta">
              <span>Полная база</span>
              <span>•</span>
              <span class="gto-disc-modal-tile-badge">${GTO_RECORDS.length} рекордов</span>
            </div>
          </div>
          ${currentVal === 'all' ? '<span class="gto-disc-modal-tile-active-badge">✓ Выбрано</span>' : ''}
        </div>

        ${disciplines.map(([name, count]) => {
          const cat = getCategoryForDiscipline(name);
          const icon = getDisciplineIcon(name);
          const isSelected = currentVal === name;
          const escapedName = escapeHtml(name).replace(/'/g, "\\'");
          return `
            <div class="gto-disc-modal-tile ${isSelected ? 'active' : ''}" 
                 onclick="window.selectDisciplineFromModal('${escapedName}')" 
                 data-name="${escapeHtml(name.toLowerCase())}" 
                 data-cat="${cat}">
              <div class="gto-disc-modal-tile-icon">${icon}</div>
              <div class="gto-disc-modal-tile-info">
                <div class="gto-disc-modal-tile-title">${escapeHtml(name)}</div>
                <div class="gto-disc-modal-tile-meta">
                  <span class="gto-disc-modal-tile-badge">${count} рек.</span>
                </div>
              </div>
              ${isSelected ? '<span class="gto-disc-modal-tile-active-badge">✓</span>' : ''}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  openModal("Спортивные дисциплины ГТО", html);
}
window.openDisciplineModal = openDisciplineModal;

export function setDisciplineModalCategory(cat) {
  state.modalDiscCat = cat;
  document.querySelectorAll("#disc-modal-categories .gto-disc-modal-cat-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-cat") === cat);
  });
  filterDisciplineModal();
}
window.setDisciplineModalCategory = setDisciplineModalCategory;

export function filterDisciplineModal() {
  const q = (document.getElementById("disc-modal-search-input")?.value || "").toLowerCase().trim();
  const cat = state.modalDiscCat || "all";

  document.querySelectorAll("#disc-modal-grid .gto-disc-modal-tile").forEach(tile => {
    const tileCat = tile.getAttribute("data-cat");
    const tileName = tile.getAttribute("data-name") || "";

    const matchesCat = (cat === "all") || (tileCat === cat) || (tileCat === "all");
    const matchesQuery = !q || tileName.includes(q);

    tile.style.display = (matchesCat && matchesQuery) ? "flex" : "none";
  });
}
window.filterDisciplineModal = filterDisciplineModal;

export function selectDisciplineFromModal(discName) {
  setRecordsDiscipline(discName);
  closeModal();
  if (discName === "all") {
    showToast("Отображаются рекорды по всем дисциплинам");
  } else {
    showToast(`Выбрана дисциплина: ${discName}`);
  }
}
window.selectDisciplineFromModal = selectDisciplineFromModal;

export function initRecordsControls() {
  const select = document.getElementById("records-discipline-select");

  const discMap = new Map();
  GTO_RECORDS.forEach(r => {
    discMap.set(r.discipline, (discMap.get(r.discipline) || 0) + 1);
  });

  if (select) {
    let optionsHtml = `<option value="all">Все спортивные дисциплины (${GTO_RECORDS.length} рекордов)</option>`;
    Array.from(discMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .forEach(([name, count]) => {
        optionsHtml += `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${count})</option>`;
      });
    select.innerHTML = optionsHtml;
  }

  const nameEl = document.getElementById("records-discipline-name");
  const iconEl = document.getElementById("records-disc-icon");
  const countTag = document.getElementById("records-selected-count-tag");
  if (nameEl) nameEl.textContent = `Все дисциплины (${GTO_RECORDS.length} рекордов)`;
  if (iconEl) iconEl.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
  if (countTag) countTag.textContent = `${discMap.size} дисциплины`;
}

export function setRecordsViewMode(mode) {
  state.recordsViewMode = mode;
  const btnGrid = document.getElementById("view-mode-grid");
  const btnTable = document.getElementById("view-mode-table");
  if (btnGrid) btnGrid.classList.toggle("active", mode === "grid");
  if (btnTable) btnTable.classList.toggle("active", mode === "table");
  renderRecords();
}

export function setQuickDiscipline(discKey) {
  state.quickDiscipline = discKey;
  
  // Sync chips
  document.querySelectorAll("#records-quick-chips .gto-disc-chip-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-disc") === discKey);
  });

  if (discKey === "all") {
    setRecordsDiscipline("all");
    return;
  }

  const matched = GTO_RECORDS.find(r => (r.discipline || "").toLowerCase().includes(discKey));
  if (matched) {
    setRecordsDiscipline(matched.discipline);
  } else {
    state.recordsDiscipline = discKey;
    const nameEl = document.getElementById("records-discipline-name");
    const iconEl = document.getElementById("records-disc-icon");
    if (nameEl) nameEl.textContent = `Фильтр: ${discKey}`;
    if (iconEl) iconEl.innerHTML = getDisciplineSvg(discKey);
    renderRecords();
  }
}

export function setRecordsDiscipline(val) {
  state.recordsDiscipline = val;
  const select = document.getElementById("records-discipline-select");
  if (select) select.value = val;

  const nameEl = document.getElementById("records-discipline-name");
  const iconEl = document.getElementById("records-disc-icon");
  const countTag = document.getElementById("records-selected-count-tag");

  if (val === "all") {
    if (nameEl) nameEl.textContent = `Все дисциплины (${GTO_RECORDS.length} рекордов)`;
    if (iconEl) iconEl.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
    if (countTag) countTag.textContent = "23 дисциплины";
  } else {
    const count = GTO_RECORDS.filter(r => r.discipline === val).length;
    if (nameEl) nameEl.textContent = `${val} (${count} рек.)`;
    if (iconEl) iconEl.innerHTML = getDisciplineSvg(val);
    if (countTag) countTag.textContent = `${count} рекордов`;
  }

  // Update quick chips
  document.querySelectorAll("#records-quick-chips .gto-disc-chip-btn").forEach(btn => {
    const k = btn.getAttribute("data-disc");
    if (val === "all") {
      btn.classList.toggle("active", k === "all");
    } else {
      btn.classList.toggle("active", k !== "all" && val.toLowerCase().includes(k));
    }
  });

  // Update Tier 1 Discipline Slider
  document.querySelectorAll("#records-discipline-pills .gto-rec-disc-tab").forEach(btn => {
    const k = btn.getAttribute("data-rdisc");
    if (val === "all") {
      btn.classList.toggle("active", k === "all");
    } else {
      btn.classList.toggle("active", k !== "all" && val.toLowerCase().includes(k));
    }
  });

  renderRecords();
}
window.setRecordsDiscipline = setRecordsDiscipline;

export function filterRecordsInput(val) {
  state.recordsSearch = val || "";
  renderRecords();
}
window.filterRecordsInput = filterRecordsInput;

export function setRecordCategory(cat) {
  state.recordCategory = cat;
  document.querySelectorAll("#records-category-pills .gto-rec-seg-btn, #records-category-pills .gto-filter-pill").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-rcat") === cat);
  });
  renderRecords();
}
window.setRecordCategory = setRecordCategory;

export function openChallengeModal(recId = null) {
  let targetRec = null;
  if (recId) {
    targetRec = GTO_RECORDS.find(r => r.id === Number(recId));
  }
  const ath = state.athlete || {};
  const currentDiscipline = targetRec ? targetRec.discipline : "Отжимания от пола";

  const html = `
    <div class="gto-challenge-modal-wrap">
      <div style="background: linear-gradient(135deg, rgba(230,57,70,0.15), rgba(251,191,36,0.1)); border: 1px solid rgba(251,191,36,0.3); border-radius: var(--gto-radius-sm); padding: 16px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span class="gto-badge-gold">★ ПРОЕКТ «ИДУ НА РЕКОРД»</span>
          <span style="font-size: 11px; color: var(--gto-text-secondary);">Официальный вызов</span>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: #fff; margin: 0 0 6px 0;">Подача заявки на фиксацию рекорда России</h3>
        <p style="font-size: 13px; color: var(--gto-text-secondary); margin: 0; line-height: 1.5;">
          ${targetRec ? `Вызов текущему рекорду: <strong>${escapeHtml(targetRec.discipline)}</strong> — <span style="color: #FBBF24; font-weight: 800;">${escapeHtml(targetRec.result)}</span> (${escapeHtml(targetRec.holder)})` : "Заявите о своём результате для внесения в официальный реестр «Книги рекордов Федерации многоборья ГТО»."}
        </p>
      </div>

      <form onsubmit="window.submitRecordChallenge(event)">
        <div class="gto-form-grid">
          <div class="gto-form-group">
            <label class="gto-label">ФИО претендента *</label>
            <input type="text" id="challenge-name" class="gto-input-field" value="${escapeHtml(ath.name || "")}" placeholder="Иванов Алексей Сергеевич" required>
          </div>
          <div class="gto-form-group">
            <label class="gto-label">УИН ВФСК ГТО</label>
            <input type="text" id="challenge-uin" class="gto-input-field" value="${escapeHtml(ath.uin || "")}" placeholder="26-77-0012345">
          </div>
          <div class="gto-form-group">
            <label class="gto-label">Субъект РФ / Город *</label>
            <input type="text" id="challenge-region" class="gto-input-field" value="${escapeHtml(ath.region || "")}" placeholder="Москва / Санкт-Петербург" required>
          </div>
          <div class="gto-form-group">
            <label class="gto-label">Возрастная ступень *</label>
            <select id="challenge-stage" class="gto-input-field">
              <option value="18-29 лет">18-29 лет (VI-VII ступень)</option>
              <option value="30-39 лет">30-39 лет (VIII-IX ступень)</option>
              <option value="40-49 лет">40-49 лет (X-XI ступень)</option>
              <option value="50+ лет">50+ лет (ветераны)</option>
              <option value="до 18 лет">до 18 лет (молодёжь)</option>
            </select>
          </div>
          <div class="gto-form-group">
            <label class="gto-label">Дисциплина рекорда *</label>
            <input type="text" id="challenge-discipline" class="gto-input-field" value="${escapeHtml(currentDiscipline)}" required>
          </div>
          <div class="gto-form-group">
            <label class="gto-label">Ваш заявленный результат *</label>
            <input type="text" id="challenge-target-result" class="gto-input-field" placeholder="Например: 120 повторений / 02:45 мин" required>
          </div>
          <div class="gto-form-group full">
            <label class="gto-label">Ссылка на видеофиксацию попытки (VK / Rutube / Cloud) *</label>
            <input type="url" id="challenge-video-url" class="gto-input-field" placeholder="https://vk.ru/video... или https://rutube.ru/video..." required>
          </div>
          <div class="gto-form-group full">
            <label class="gto-label">Телефон и контакт для связи Главного судьи *</label>
            <input type="text" id="challenge-contact" class="gto-input-field" value="${escapeHtml(ath.phone || ath.email || "")}" placeholder="+7 (999) 000-00-00, telegram: @athlete" required>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; flex-wrap: wrap;">
          <button type="button" class="gto-btn-outline" onclick="window.closeModal()">Отмена</button>
          <button type="submit" class="gto-btn-primary" style="padding: 11px 22px; display: inline-flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Отправить заявку на рекорд</span>
          </button>
        </div>
      </form>
    </div>
  `;

  openModal("Подать заявку на рекорд • «Иду на рекорд»", html);
}
window.openChallengeModal = openChallengeModal;

export function submitRecordChallenge(e) {
  if (e) e.preventDefault();
  closeModal();
  showToast("Заявка на фиксацию рекорда передана в Главную судейскую коллегию!");
}
window.submitRecordChallenge = submitRecordChallenge;

export function setRecordCuration(curation) {
  state.recordCuration = curation;
  document.querySelectorAll("#records-curation-chips .gto-curation-chip").forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-curation") === curation);
  });
  renderRecords();
}
window.setRecordCuration = setRecordCuration;

export function setRecordsSex(sex) {
  state.recordsSex = sex;
  const btnAll = document.getElementById("records-sex-all");
  const btnM = document.getElementById("records-sex-m");
  const btnW = document.getElementById("records-sex-w");
  
  if (btnAll) btnAll.classList.toggle("active", sex === "ALL");
  if (btnM) btnM.classList.toggle("active", sex === "M");
  if (btnW) btnW.classList.toggle("active", sex === "W");
  
  renderRecords();
}

export function setRecordsAge(ageKey) {
  state.recordsAge = ageKey;
  const select = document.getElementById("records-age-select");
  if (select && select.value !== ageKey) select.value = ageKey;
  renderRecords();
}

function matchesAgeGroup(recAgeGroup, filterKey) {
  if (!filterKey || filterKey === "all") return true;
  const ag = String(recAgeGroup || "").toLowerCase();

  if (filterKey === "under18") {
    return ag.includes("6-7") || ag.includes("8-9") || ag.includes("10-12") || ag.includes("13-15") || ag.includes("16-18");
  }
  if (filterKey === "18-30") {
    return ag.includes("19-20") || ag.includes("21-30") || ag.includes("18-29");
  }
  if (filterKey === "31-40") {
    return ag.includes("31-35") || ag.includes("36-40");
  }
  if (filterKey === "41-50") {
    return ag.includes("41-45") || ag.includes("46-50");
  }
  if (filterKey === "51+") {
    return ag.includes("51-55") || ag.includes("56-60") || ag.includes("61-65") || ag.includes("66-70") || ag.includes("71");
  }
  return true;
}

function getDisciplineSvg(discipline) {
  const d = String(discipline || "").toLowerCase();
  if (d.includes("бег") || d.includes("спринт") || d.includes("челноч")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
  }
  if (d.includes("гир") || d.includes("рывок") || d.includes("толчок")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0v2H6V9z"></path><circle cx="12" cy="15" r="7"></circle></svg>`;
  }
  if (d.includes("подтягиван") || d.includes("брусь") || d.includes("турник")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M2 8h4M2 16h4M18 8h4M18 16h4M6 12h12"></path></svg>`;
  }
  if (d.includes("отжиман") || d.includes("планк")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M7 14l5-6 5 6"></path></svg>`;
  }
  if (d.includes("плаван")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M2 16h20M2 20h20"></path></svg>`;
  }
  if (d.includes("наклон") || d.includes("гибкост") || d.includes("пресс") || d.includes("комплекс")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><path d="M6.5 9l5.5 3 5.5-3M12 12v9M8 21l4-4 4 4"></path></svg>`;
  }
  if (d.includes("стрельб")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>`;
  }
  if (d.includes("прыжок")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"></polyline><polyline points="17 18 12 13 7 18"></polyline></svg>`;
  }
  if (d.includes("лыж")) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"></circle><path d="M12 6v6l4 2M8 22l6-10M4 18l4-4"></path></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`;
}

function getDisciplineIcon(discipline) {
  return getDisciplineSvg(discipline);
}

export function renderRecords() {
  const container = document.getElementById("records-grid-container");
  const counterBadge = document.getElementById("records-counter-badge");
  const showcaseEl = document.getElementById("records-hall-of-fame-showcase");

  // 1. Render Hall of Fame Hero Showcase (Compact & Refined)
  if (showcaseEl) {
    const topHero = GTO_RECORDS.find(r => r.img && (r.discipline.includes("Отжимания") || r.discipline.includes("Подтягивания") || r.discipline.includes("Гири"))) || GTO_RECORDS[0];
    if (topHero) {
      const discSvg = getDisciplineSvg(topHero.discipline);
      showcaseEl.innerHTML = `
        <div class="gto-rec-hero-card">
          <div class="gto-rec-hero-avatar-wrap">
            <div class="gto-rec-hero-avatar-circle">
              <img src="${escapeHtml(topHero.img || '')}" alt="${escapeHtml(topHero.holder)}" class="gto-rec-hero-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="gto-rec-hero-avatar-ph" style="${topHero.img ? 'display:none;' : 'display:flex;'}">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              </div>
            </div>
            <div class="gto-rec-hero-badge">
              <svg viewBox="0 0 24 24" width="9" height="9" fill="#0A0E17" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
          </div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap: wrap;">
              <span class="gto-badge-gold" style="display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 2px 7px;">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="#FBBF24" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>АБСОЛЮТНЫЙ РЕКОРД РФ</span>
              </span>
              <span class="gto-badge-federal" style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 7px;">
                <span style="color:#38BDF8; display:inline-flex;">${discSvg}</span>
                <span>${escapeHtml(topHero.discipline)}</span>
              </span>
            </div>
            <h4 style="font-size: 14px; font-weight: 800; color: #fff; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(topHero.holder)}</h4>
            <div style="font-size: 11px; color: var(--gto-text-secondary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span>${escapeHtml(topHero.city || 'Россия')}</span>
              <span>•</span>
              <span>${escapeHtml(topHero.ageGroup || 'Основная')}</span>
              <span>•</span>
              <span style="color: #FBBF24;">${escapeHtml(topHero.event)}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div class="gto-rec-hero-val">${escapeHtml(topHero.result)}</div>
            <div style="display: flex; gap: 4px;">
              <button class="gto-btn-primary" style="padding: 4px 8px; font-size: 10.5px; border-radius: 6px;" onclick="window.openRecordDetailModal(${topHero.id})">
                <span>Сертификат</span>
              </button>
              <button class="gto-btn-outline" style="padding: 4px 8px; font-size: 10.5px; border-radius: 6px;" onclick="window.openChallengeModal(${topHero.id})">
                <span>Вызов</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  if (!container) return;

  const q = (state.recordsSearch || "").toLowerCase().trim();
  const disc = (state.recordsDiscipline || "all").toLowerCase();
  const sex = state.recordsSex;
  const age = state.recordsAge;

  const filtered = GTO_RECORDS.filter(r => {
    // App Category filter
    if (state.recordCategory === "juniors") {
      const ag = String(r.ageGroup || "").toLowerCase();
      if (!ag.includes("6-7") && !ag.includes("8-9") && !ag.includes("10-12") && !ag.includes("13-15") && !ag.includes("16-18") && !ag.includes("юниор") && !ag.includes("дет")) return false;
    } else if (state.recordCategory === "masters") {
      const ag = String(r.ageGroup || "").toLowerCase();
      if (!ag.includes("41-45") && !ag.includes("46-50") && !ag.includes("51-55") && !ag.includes("56-60") && !ag.includes("61-65") && !ag.includes("40+") && !ag.includes("ветеран")) return false;
    } else if (state.recordCategory === "pro") {
      const ev = (r.event || "").toLowerCase();
      const disc = (r.discipline || "").toLowerCase();
      if (!ev.includes("чемпионат") && !ev.includes("кубок") && !ev.includes("проф") && !disc.includes("24 кг") && !disc.includes("строг")) return false;
    } else if (state.recordCategory === "amateur") {
      const ev = (r.event || "").toLowerCase();
      const disc = (r.discipline || "").toLowerCase();
      if (ev.includes("чемпионат") || disc.includes("24 кг")) return false;
    } else if (state.recordCategory === "adaptive") {
      const d = (r.discipline || "").toLowerCase();
      const e = (r.event || "").toLowerCase();
      const h = (r.holder || "").toLowerCase();
      if (!d.includes("границ") && !d.includes("адаптив") && !e.includes("границ") && !e.includes("адаптив") && !h.includes("границ") && !d.includes("инва") && !e.includes("инва")) return false;
    } else if (state.recordCategory === "strength") {
      const d = (r.discipline || "").toLowerCase();
      if (!d.includes("подтягиван") && !d.includes("отжиман") && !d.includes("приседан") && !d.includes("брусь") && !d.includes("турник") && !d.includes("планк") && !d.includes("тяг")) return false;
    } else if (state.recordCategory === "kettlebell") {
      const d = (r.discipline || "").toLowerCase();
      if (!d.includes("гир") && !d.includes("рывок") && !d.includes("толчок")) return false;
    } else if (state.recordCategory === "speed") {
      const d = (r.discipline || "").toLowerCase();
      if (!d.includes("бег") && !d.includes("спринт") && !d.includes("челноч")) return false;
    } else if (state.recordCategory === "gymnastics") {
      const d = (r.discipline || "").toLowerCase();
      if (!d.includes("пресс") && !d.includes("наклон") && !d.includes("гибкост") && !d.includes("прыжок") && !d.includes("комплекс")) return false;
    }

    // Discipline filter
    if (disc !== "all") {
      const rDisc = (r.discipline || "").toLowerCase();
      if (!rDisc.includes(disc) && rDisc !== disc) return false;
    }

    // Sex filter
    if (sex !== "ALL" && r.sex !== sex) return false;

    // Age filter
    if (!matchesAgeGroup(r.ageGroup, age)) return false;

    // Search query
    if (q) {
      const match = (r.holder || "").toLowerCase().includes(q) ||
                    (r.city || "").toLowerCase().includes(q) ||
                    (r.event || "").toLowerCase().includes(q) ||
                    (r.discipline || "").toLowerCase().includes(q) ||
                    (r.result || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  if (counterBadge) {
    counterBadge.textContent = `${filtered.length} рекордов`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--gto-surface); border-radius: var(--gto-radius); border: 1px solid var(--gto-border); color: var(--gto-text-muted);">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--gto-text-muted)" fill="none" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Рекордов не найдено</div>
        <div>По выбранной комбинации параметров рекорды отсутствуют. Попробуйте сбросить фильтры.</div>
      </div>
    `;
    return;
  }

  container.classList.toggle("table-mode", state.recordsViewMode === "table");

  if (state.recordsViewMode === "table") {
    container.innerHTML = renderRecordsTableHtml(filtered);
  } else {
    container.innerHTML = filtered.map(rec => renderRecordCardHtml(rec)).join("");
  }
}

function renderRecordCardHtml(rec) {
  const sexLabel = rec.sex === "M" ? "Мужчины" : "Женщины";
  const sexClass = rec.sex === "M" ? "sex-m" : "sex-w";
  const iconSvg = getDisciplineSvg(rec.discipline);

  const phSvg = `<div class="gto-rec-compact-avatar-ph"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div>`;
  const avatar = rec.img
    ? `<img src="${rec.img}" alt="${escapeHtml(rec.holder)}" class="gto-rec-compact-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="gto-rec-compact-avatar-ph" style="display:none;"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div>`
    : phSvg;

  return `
    <div class="gto-rec-compact-card">
      <div class="gto-rec-gold-stripe"></div>
      <div class="gto-rec-compact-top" onclick="window.openRecordDetailModal(${rec.id})" style="cursor: pointer;">
        <div class="gto-rec-compact-athlete">
          ${avatar}
          <div class="gto-rec-compact-info">
            <div class="gto-rec-compact-name">${escapeHtml(rec.holder)}</div>
            <div class="gto-rec-compact-city" style="display: inline-flex; align-items: center; gap: 3px;">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${escapeHtml(rec.city || "Россия")}</span>
            </div>
          </div>
        </div>
        <div class="gto-rec-compact-result-box">
          <span class="gto-rec-micro-badge">ИДУ НА РЕКОРД</span>
          <div class="gto-rec-compact-val">${escapeHtml(rec.result)}</div>
        </div>
      </div>

      <div class="gto-rec-compact-body" onclick="window.openRecordDetailModal(${rec.id})" style="cursor: pointer;">
        <div class="gto-rec-disc-chip" title="${escapeHtml(rec.discipline)}">
          <span style="color: #FBBF24; display: inline-flex; align-items: center;">${iconSvg}</span>
          <span style="font-weight: 700; color: #fff;">${escapeHtml(rec.discipline)}</span>
        </div>
      </div>

      <div class="gto-rec-compact-footer">
        <div class="gto-rec-tags-row">
          <span class="gto-rec-pill ${sexClass}">${sexLabel}</span>
          <span class="gto-rec-pill age">${escapeHtml(rec.ageGroup || "Основная")}</span>
        </div>
        <div class="gto-rec-compact-event" style="flex: 1; max-width: 140px; margin-left: 6px;" title="${escapeHtml(rec.event)}">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#FBBF24" stroke-width="2" style="flex-shrink: 0;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;">${escapeHtml(rec.event)}</span>
        </div>
      </div>

      <div class="gto-rec-card-actions">
        <button type="button" class="gto-btn-primary" onclick="window.openRecordDetailModal(${rec.id})">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>Сертификат</span>
        </button>
        <button type="button" class="gto-btn-outline" onclick="window.openChallengeModal(${rec.id})">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
          <span>Вызов</span>
        </button>
      </div>
    </div>
  `;
}

function renderRecordsTableHtml(records) {
  return `
    <div class="gto-table-scroll-hint">
      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      <span>Сдвиньте таблицу вправо-влево для просмотра всех столбцов (категория, результат, турнир)</span>
      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
    <div class="gto-records-table-wrap">
      <table class="gto-records-table">
        <thead>
          <tr>
            <th style="width: 38px; min-width: 38px; text-align: center;">#</th>
            <th style="min-width: 200px;">Дисциплина</th>
            <th style="min-width: 170px;">Рекордсмен</th>
            <th style="min-width: 130px;">Категория</th>
            <th style="min-width: 110px; text-align: right;">Результат</th>
            <th style="min-width: 180px;">Турнир и город</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((rec, i) => {
            const sexClass = rec.sex === "M" ? "sex-m" : "sex-w";
            const sexLabel = rec.sex === "M" ? "Мужчины" : "Женщины";
            const iconSvg = getDisciplineSvg(rec.discipline);
            const avatar = rec.img
              ? `<img src="${rec.img}" alt="" class="gto-table-avatar" onerror="this.style.display='none'">`
              : `<span class="gto-table-avatar-ph" style="display:inline-flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></span>`;
            return `
              <tr onclick="window.openRecordDetailModal(${rec.id})" title="Подробнее о рекорде">
                <td style="text-align: center; color: var(--gto-text-muted); font-size: 11px;">${i + 1}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #FBBF24; display: inline-flex; align-items: center;">${iconSvg}</span>
                    <strong style="color: #fff; font-size: 13px;">${escapeHtml(rec.discipline)}</strong>
                  </div>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    ${avatar}
                    <span style="font-weight: 700; color: #fff;">${escapeHtml(rec.holder)}</span>
                  </div>
                </td>
                <td>
                  <span class="gto-rec-pill ${sexClass}">${sexLabel}</span>
                  <span class="gto-rec-pill">${escapeHtml(rec.ageGroup)}</span>
                </td>
                <td style="text-align: right;">
                  <span class="gto-table-result-badge">${escapeHtml(rec.result)}</span>
                </td>
                <td style="color: var(--gto-text-secondary); font-size: 12px;">
                  <div>${escapeHtml(rec.event)}</div>
                  <div style="color: var(--gto-text-muted); font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${escapeHtml(rec.city)}</span>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* --- Record Detail / Certificate Modal --- */
export function openRecordDetailModal(recId) {
  const rec = GTO_RECORDS.find(r => r.id === recId);
  if (!rec) return;

  const sexLabel = rec.sex === "M" ? "Мужчины" : "Женщины";
  const iconSvg = getDisciplineSvg(rec.discipline);
  const avatar = rec.img 
    ? `<img src="${rec.img}" class="gto-cert-avatar" alt="${escapeHtml(rec.holder)}">`
    : `<div class="gto-cert-avatar-ph"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div>`;

  const html = `
    <div class="gto-cert-card">
      <div class="gto-cert-header">
        <div class="gto-cert-emblem">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FBBF24" stroke-width="2.2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
        </div>
        <div>
          <div class="gto-cert-sub">ОФИЦИАЛЬНЫЙ РЕЕСТР ФЕДЕРАЦИИ • ПРОЕКТ «ИДУ НА РЕКОРД»</div>
          <h2 class="gto-cert-title">Сертификат Рекорда «Иду на рекорд»</h2>
        </div>
      </div>

      <div class="gto-cert-body">
        <div class="gto-cert-athlete-row">
          ${avatar}
          <div>
            <div class="gto-cert-name">${escapeHtml(rec.holder)}</div>
            <div class="gto-cert-meta">Субъект РФ: <strong style="color: #fff;">${escapeHtml(rec.city || "Российская Федерация")}</strong></div>
            <div class="gto-cert-meta">Возрастная группа: <strong style="color: #fff;">${escapeHtml(rec.ageGroup)} (${sexLabel})</strong></div>
          </div>
        </div>

        <div class="gto-cert-result-box">
          <div class="gto-cert-disc-label" style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="color: #FBBF24;">${iconSvg}</span>
            <span>Спортивная дисциплина</span>
          </div>
          <div class="gto-cert-discipline">${escapeHtml(rec.discipline)}</div>
          <div class="gto-cert-res-label">Официально зафиксированный рекорд</div>
          <div class="gto-cert-val">${escapeHtml(rec.result)}</div>
        </div>

        <div class="gto-cert-details">
          <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FBBF24" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
            <span><strong>Соревнование:</strong> ${escapeHtml(rec.event)}</span>
          </div>
          <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--gto-red)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span><strong>Место фиксации:</strong> ${escapeHtml(rec.city || "Россия")}</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#38BDF8" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span><strong>Статус:</strong> Рекорд внесен в официальный всероссийский реестр «Иду на рекорд» Федерации многоборья ГТО России и подтвержден Главной судейской коллегией.</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="gto-btn-outline" onclick="window.shareRecord(${rec.id})" title="Поделиться рекордом и скопировать ссылку" style="padding: 9px 14px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            <span>Поделиться</span>
          </button>
          <button class="gto-btn-outline" onclick="window.printRecordCertificate()" title="Печать официального наградного сертификата" style="padding: 9px 14px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Печать диплома</span>
          </button>
        </div>
        <button class="gto-btn-primary" onclick="window.closeModal()">Закрыть сертификат</button>
      </div>
    </div>
  `;
  openModal("Сертификат «Иду на рекорд» • Рекорд России", html);
}

export function printRecordCertificate() {
  window.print();
}

export function shareRecord(recId) {
  const url = `${window.location.origin}${window.location.pathname}#records?id=${recId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("Прямая ссылка на сертификат рекорда скопирована!");
    }).catch(() => {
      showToast(`Ссылка на рекорд: ${url}`);
    });
  } else {
    showToast(`Ссылка на рекорд: ${url}`);
  }
}

/* --- Regions Renderer & Heraldry System (49 Regional Federations) --- */
export function getRegionMeta(fed) {
  const c = String(fed.code || "").toUpperCase().trim();
  const r = String(fed.region || "").toLowerCase().trim();
  
  let district = "РФ";
  let badge = c ? `${c} RUS` : "RUS";
  
  if (c === "RU" || r.includes("центральный") || r.includes("россия")) {
    district = "ФЕДЕРАЛЬНЫЙ ЦЕНТР";
    badge = "RU";
  } else if (["77", "50", "31", "36", "32", "67", "71", "48", "44"].includes(c) || r.includes("москв") || r.includes("белгород") || r.includes("воронеж") || r.includes("брянск") || r.includes("смоленск") || r.includes("тульск") || r.includes("липецк") || r.includes("костром")) {
    district = "ЦФО";
  } else if (["78", "47", "29", "51", "60", "39"].includes(c) || r.includes("петербург") || r.includes("ленинград") || r.includes("архангельск") || r.includes("мурманск") || r.includes("псков") || r.includes("калининград")) {
    district = "СЗФО";
  } else if (["25", "27", "28", "41", "65", "75", "14", "87", "79"].includes(c) || r.includes("примор") || r.includes("хабаров") || r.includes("амур") || r.includes("камчат") || r.includes("сахалин") || r.includes("забайкал") || r.includes("якутия") || r.includes("саха") || r.includes("чукот") || r.includes("еврейск")) {
    district = "ДФО";
  } else if (["24", "42", "54", "55", "70", "22"].includes(c) || r.includes("краснояр") || r.includes("кузбасс") || r.includes("кемеров") || r.includes("новосиб") || r.includes("омск") || r.includes("томск") || r.includes("алтай")) {
    district = "СФО";
  } else if (["72", "86", "74", "45"].includes(c) || r.includes("тюмен") || r.includes("югра") || r.includes("хмао") || r.includes("челябин") || r.includes("курган")) {
    district = "УФО";
  } else if (["59", "02", "18", "73", "58", "56", "52"].includes(c) || r.includes("перм") || r.includes("башкортостан") || r.includes("удмурт") || r.includes("ульянов") || r.includes("пензен") || r.includes("оренбург") || r.includes("нижегород")) {
    district = "ПФО";
  } else if (["23", "61", "34", "91", "92"].includes(c) || r.includes("краснодар") || r.includes("ростов") || r.includes("волгоград") || r.includes("крым") || r.includes("севастополь")) {
    district = "ЮФО";
  } else if (["26", "06"].includes(c) || r.includes("ставрополь") || r.includes("ингушет")) {
    district = "СКФО";
  }

  return { district, badge };
}

export function getRegionCoatOfArmsSvg(fed) {
  const c = String(fed.code || "").toUpperCase().trim();
  const r = String(fed.region || "").toLowerCase().trim();
  
  if (c === "RU" || r.includes("центральный") || r.includes("россия")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-ru" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-ru)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M50 25 L54 35 L65 32 L60 44 L72 45 L64 54 L74 62 L60 65 L66 80 L56 75 L50 85 L44 75 L34 80 L40 65 L26 62 L36 54 L28 45 L40 44 L35 32 L46 35 Z" fill="#FBBF24" opacity="0.95"/>
      <circle cx="50" cy="52" r="7" fill="#DC2626" stroke="#FBBF24" stroke-width="1.5"/>
      <polygon points="50,18 53,23 57,20 55,26 60,28 54,30 50,34 46,30 40,28 45,26 43,20 47,23" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "77" || r.includes("москв")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-77" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#7F1D1D"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-77)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M35 45 C40 38 60 40 68 52 C72 58 65 68 55 66 L50 80 L42 80 L46 64 C38 64 30 58 35 45 Z" fill="#F8FAFC"/>
      <path d="M62 32 L38 88" stroke="#FBBF24" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M32 82 C38 78 50 85 42 92 C35 95 28 88 32 82 Z" fill="#15803D" stroke="#000" stroke-width="1"/>
      <circle cx="58" cy="35" r="5" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "78" || r.includes("петербург")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-78" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#881337"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-78)" stroke="#FBBF24" stroke-width="3"/>
      <line x1="30" y1="35" x2="70" y2="85" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/>
      <path d="M25 40 C28 32 35 32 38 38" stroke="#E2E8F0" stroke-width="2.5" fill="none"/>
      <path d="M60 88 C70 92 78 82 72 75" stroke="#E2E8F0" stroke-width="2.5" fill="none"/>
      <line x1="70" y1="35" x2="30" y2="85" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/>
      <path d="M75 40 C72 32 65 32 62 38" stroke="#E2E8F0" stroke-width="2.5" fill="none"/>
      <path d="M40 88 C30 92 22 82 28 75" stroke="#E2E8F0" stroke-width="2.5" fill="none"/>
      <line x1="50" y1="26" x2="50" y2="92" stroke="#FBBF24" stroke-width="3.5"/>
      <polygon points="50,20 54,26 46,26" fill="#FBBF24"/>
      <circle cx="50" cy="27" r="4" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "25" || r.includes("примор")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-25" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0369A1"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-25)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M10 10 L90 70 M90 10 L10 70" stroke="rgba(255,255,255,0.25)" stroke-width="8"/>
      <path d="M10 75 L50 60 L90 85 L90 115 C50 115 10 98 10 75 Z" fill="#15803D" opacity="0.85"/>
      <path d="M30 62 C34 52 46 54 56 55 C64 56 70 52 74 58 C72 65 65 66 60 70 L58 78 L52 78 L52 70 L42 70 L40 78 L34 78 C30 72 26 68 30 62 Z" fill="#F59E0B" stroke="#000" stroke-width="1"/>
      <circle cx="71" cy="56" r="1.5" fill="#000"/>
    </svg>`;
  }

  if (c === "27" || r.includes("хабаров")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-27" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#1E40AF"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-27)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M50 32 C42 32 36 38 34 46 C32 54 36 68 40 82 L60 82 C64 68 68 54 66 46 C64 38 58 32 50 32 Z" fill="#0F172A"/>
      <circle cx="42" cy="35" r="4" fill="#0F172A"/>
      <circle cx="58" cy="35" r="4" fill="#0F172A"/>
      <path d="M44 54 H56 V68 C56 74 50 78 50 78 C50 78 44 74 44 68 Z" fill="#FBBF24"/>
      <path d="M46 64 C50 60 54 66 54 64" stroke="#0F172A" stroke-width="1.5" fill="none"/>
    </svg>`;
  }

  if (c === "50" || r.includes("московск")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-50" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-50)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M32 46 C38 38 58 40 66 50 C70 56 64 66 54 64 L50 78 L42 78 L46 62 C38 62 30 56 32 46 Z" fill="#FBBF24"/>
      <line x1="60" y1="30" x2="36" y2="86" stroke="#F8FAFC" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="56" cy="34" r="5" fill="#F8FAFC"/>
    </svg>`;
  }

  if (c === "47" || r.includes("ленинград")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-47" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0369A1"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-47)" stroke="#FBBF24" stroke-width="3"/>
      <rect x="20" y="30" width="60" height="14" fill="#DC2626" rx="2"/>
      <polygon points="25,30 25,24 32,24 32,30 38,30 38,24 45,24 45,30 55,30 55,24 62,24 62,30 68,30 68,24 75,24 75,30" fill="#DC2626"/>
      <line x1="35" y1="52" x2="65" y2="82" stroke="#FBBF24" stroke-width="3"/>
      <circle cx="33" cy="50" r="5" stroke="#FBBF24" stroke-width="2" fill="none"/>
      <line x1="65" y1="52" x2="35" y2="82" stroke="#F8FAFC" stroke-width="3"/>
      <path d="M30 84 C35 90 45 86 42 78" stroke="#F8FAFC" stroke-width="2" fill="none"/>
    </svg>`;
  }

  if (c === "14" || r.includes("якут") || r.includes("саха")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-14" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#075985"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-14)" stroke="#FBBF24" stroke-width="3"/>
      <circle cx="50" cy="55" r="26" fill="#F8FAFC"/>
      <path d="M40 50 C44 44 54 46 60 52 L52 68 L44 68 Z" fill="#991B1B"/>
      <line x1="58" y1="36" x2="58" y2="70" stroke="#991B1B" stroke-width="2"/>
      <polygon points="58,38 68,42 58,46" fill="#991B1B"/>
      <polygon points="50,22 53,26 50,30 47,26" fill="#F8FAFC"/>
    </svg>`;
  }

  if (c === "24" || r.includes("краснояр")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-24" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-24)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M48 38 C54 34 60 38 60 44 C58 50 54 52 56 60 C58 68 64 72 64 82 L54 82 C52 74 48 72 46 64 C42 66 38 62 40 52 C42 44 44 42 48 38 Z" fill="#FBBF24"/>
      <line x1="62" y1="40" x2="72" y2="75" stroke="#F8FAFC" stroke-width="2"/>
      <rect x="68" y="70" width="8" height="6" fill="#F8FAFC"/>
    </svg>`;
  }

  if (c === "42" || r.includes("кузбасс") || r.includes("кемеров")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-42" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="50%" stop-color="#18181B"/><stop offset="100%" stop-color="#09090B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-42)" stroke="#FBBF24" stroke-width="3"/>
      <polygon points="50,30 65,55 35,55" fill="#FBBF24" opacity="0.3"/>
      <line x1="32" y1="42" x2="68" y2="78" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="68" y1="42" x2="32" y2="78" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="62" y="38" width="10" height="6" fill="#FBBF24" transform="rotate(45 67 41)"/>
      <path d="M26 40 C32 44 36 36 38 42" stroke="#FBBF24" stroke-width="3" fill="none"/>
      <path d="M48 88 Q50 65 50 55 Q50 65 52 88" stroke="#FBBF24" stroke-width="2"/>
    </svg>`;
  }

  if (c === "54" || r.includes("новосиб")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-54" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0369A1"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="#F8FAFC" stroke="#FBBF24" stroke-width="3"/>
      <path d="M44 10 H56 V115 H44 Z" fill="url(#sh-54)"/>
      <path d="M30 45 C34 40 38 48 38 60 C38 72 32 80 28 85 L36 85 C40 76 42 66 40 55 C40 46 36 40 30 45 Z" fill="#0F172A"/>
      <path d="M70 45 C66 40 62 48 62 60 C62 72 68 80 72 85 L64 85 C60 76 58 66 60 55 C60 46 64 40 70 45 Z" fill="#0F172A"/>
      <ellipse cx="50" cy="58" rx="8" ry="5" fill="#FBBF24" stroke="#92400E"/>
    </svg>`;
  }

  if (c === "72" || r.includes("тюмен")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="#0284C7" stroke="#FBBF24" stroke-width="3"/>
      <path d="M10 55 H90 V85 H10 Z" fill="#15803D"/>
      <path d="M10 85 H90 V115 C50 115 10 98 10 85 Z" fill="#F8FAFC"/>
      <polygon points="40,38 44,48 50,42 56,48 60,38 62,54 38,54" fill="#FBBF24" stroke="#B45309" stroke-width="1"/>
    </svg>`;
  }

  if (c === "59" || r.includes("перм")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-59" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-59)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M30 68 C35 58 48 56 62 58 C70 60 76 65 74 72 L72 82 L65 82 L65 74 L52 74 L50 82 L42 82 C38 78 30 76 30 68 Z" fill="#F8FAFC"/>
      <circle cx="72" cy="66" r="2" fill="#000"/>
      <rect x="46" y="46" width="14" height="10" fill="#FBBF24" rx="1"/>
      <line x1="53" y1="46" x2="53" y2="56" stroke="#B45309" stroke-width="1"/>
      <polygon points="53,36 55,40 59,40 56,43 57,47 53,44 49,47 50,43 47,40 51,40" fill="#F8FAFC"/>
    </svg>`;
  }

  if (c === "02" || r.includes("башкортостан")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-02" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="50%" stop-color="#F8FAFC"/><stop offset="100%" stop-color="#15803D"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-02)" stroke="#FBBF24" stroke-width="3"/>
      <circle cx="50" cy="60" r="24" fill="#F8FAFC" stroke="#FBBF24" stroke-width="2"/>
      <path d="M42 54 C46 48 56 50 62 56 L54 70 L46 70 Z" fill="#F59E0B"/>
      <circle cx="50" cy="42" r="3" fill="#F59E0B"/>
      <circle cx="45" cy="45" r="2" fill="#F59E0B"/>
      <circle cx="55" cy="45" r="2" fill="#F59E0B"/>
    </svg>`;
  }

  if (c === "23" || r.includes("краснодар") || r.includes("кубань")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-23" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#15803D"/><stop offset="100%" stop-color="#166534"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-23)" stroke="#FBBF24" stroke-width="3"/>
      <rect x="25" y="55" width="50" height="28" fill="#FBBF24"/>
      <path d="M42 83 V68 C42 63 58 63 58 68 V83 Z" fill="#15803D"/>
      <polygon points="35,42 42,50 50,44 58,50 65,42 68,55 32,55" fill="#FBBF24"/>
      <circle cx="50" cy="50" r="3" fill="#DC2626"/>
    </svg>`;
  }

  if (c === "61" || r.includes("ростов")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-61" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#1E40AF"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-61)" stroke="#FBBF24" stroke-width="3"/>
      <rect x="25" y="60" width="50" height="22" fill="#DC2626" stroke="#FBBF24" stroke-width="1.5"/>
      <line x1="35" y1="36" x2="65" y2="76" stroke="#FBBF24" stroke-width="3"/>
      <line x1="65" y1="36" x2="35" y2="76" stroke="#FBBF24" stroke-width="3"/>
      <circle cx="50" cy="46" r="6" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "34" || r.includes("волгоград")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-34" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-34)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M50 28 L53 38 L68 32 L56 46 L58 78 L46 78 L48 46 L38 52 L47 38 Z" fill="#F8FAFC"/>
      <line x1="68" y1="32" x2="78" y2="20" stroke="#F8FAFC" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M30 92 C40 86 60 86 70 92" stroke="#0284C7" stroke-width="4" fill="none"/>
    </svg>`;
  }

  if (c === "91" || r.includes("крым")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-91" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-91)" stroke="#FBBF24" stroke-width="3"/>
      <path d="M42 42 C48 34 62 38 68 46 C60 52 64 62 60 76 L52 76 C52 68 48 66 44 60 C40 64 36 60 36 50 C36 44 38 42 42 42 Z" fill="#F8FAFC"/>
      <circle cx="68" cy="46" r="3.5" fill="#38BDF8" stroke="#F8FAFC" stroke-width="1"/>
    </svg>`;
  }

  if (c === "92" || r.includes("севастополь")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="#0284C7" stroke="#FBBF24" stroke-width="3"/>
      <polygon points="10,10 90,10 10,90" fill="#DC2626"/>
      <rect x="47" y="44" width="6" height="34" fill="#F8FAFC"/>
      <polygon points="44,44 56,44 50,34" fill="#F8FAFC"/>
      <polygon points="42,78 58,78 54,84 46,84" fill="#F8FAFC"/>
      <polygon points="32,28 34,34 40,34 35,38 37,44 32,40 27,44 29,38 24,34 30,34" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "71" || r.includes("тульск")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <defs>
        <linearGradient id="sh-71" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#DC2626"/><stop offset="100%" stop-color="#991B1B"/></linearGradient>
      </defs>
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-71)" stroke="#FBBF24" stroke-width="3"/>
      <line x1="30" y1="40" x2="70" y2="80" stroke="#F8FAFC" stroke-width="3"/>
      <line x1="70" y1="40" x2="30" y2="80" stroke="#F8FAFC" stroke-width="3"/>
      <line x1="50" y1="30" x2="50" y2="86" stroke="#FBBF24" stroke-width="4"/>
      <rect x="36" y="32" width="8" height="6" fill="#FBBF24"/>
      <rect x="56" y="80" width="8" height="6" fill="#FBBF24"/>
    </svg>`;
  }

  if (c === "52" || r.includes("нижегород")) {
    return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
      <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="#F8FAFC" stroke="#DC2626" stroke-width="3"/>
      <path d="M38 60 C42 52 54 50 64 54 C68 56 70 62 66 68 L64 78 L58 78 L58 68 L48 68 L46 78 L40 78 C36 72 34 68 38 60 Z" fill="#DC2626"/>
      <path d="M64 54 L72 40 M68 44 L74 46 M70 38 L76 36" stroke="#000" stroke-width="1.8" fill="none"/>
      <circle cx="67" cy="54" r="1.5" fill="#000"/>
    </svg>`;
  }

  // Universal Authentic Regional Heraldic Shield
  const bgGrad = ["#1E40AF", "#DC2626", "#059669", "#7C3AED", "#D97706", "#0891B2"][(c.charCodeAt(0) || 0) % 6];
  return `<svg viewBox="0 0 100 120" class="gto-region-shield-svg">
    <defs>
      <linearGradient id="sh-gen-${c}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bgGrad}"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <path d="M10 10 H90 V70 C90 98 50 115 50 115 C50 115 10 98 10 70 Z" fill="url(#sh-gen-${c})" stroke="#FBBF24" stroke-width="3"/>
    <circle cx="50" cy="52" r="18" fill="rgba(255,255,255,0.08)" stroke="#FBBF24" stroke-width="1.5"/>
    <text x="50" y="58" font-size="16" font-weight="900" font-family="monospace" fill="#FBBF24" text-anchor="middle">${c || 'RU'}</text>
    <polygon points="50,22 53,28 59,28 54,32 56,38 50,34 44,38 46,32 41,28 47,28" fill="#FBBF24"/>
  </svg>`;
}

export function filterRegions(val) {
  state.regionsSearch = val || "";
  renderRegions();
}
window.filterRegions = filterRegions;

export function renderRegions() {
  const container = document.getElementById("regions-grid-container");
  if (!container) return;

  const q = (state.regionsSearch || "").toLowerCase().trim();
  const filtered = GTO_FEDERATIONS.filter(fed => {
    if (!q) return true;
    return (fed.region || "").toLowerCase().includes(q) ||
           (fed.president || "").toLowerCase().includes(q) ||
           (fed.address || "").toLowerCase().includes(q) ||
           (fed.code || "").toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--gto-surface); border-radius: var(--gto-radius); border: 1px solid var(--gto-border); color: var(--gto-text-muted);">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="var(--gto-text-muted)" fill="none" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Региональных отделений не найдено</div>
        <div>По запросу «${escapeHtml(q)}» ничего не найдено. Проверьте запрос.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(fed => {
    const meta = getRegionMeta(fed);
    const shieldSvg = getRegionCoatOfArmsSvg(fed);
    const telClean = fed.phone ? fed.phone.replace(/[^+\d]/g, '') : '';

    return `
      <div class="gto-region-card">
        <div class="gto-region-card-top">
          <div class="gto-region-emblem-wrap" title="Герб субъекта: ${escapeHtml(fed.region)}">
            ${shieldSvg}
          </div>
          <div class="gto-region-title-wrap">
            <div class="gto-region-meta-row">
              <span class="gto-region-code-badge">${escapeHtml(meta.badge)}</span>
              <span class="gto-region-district-tag">${escapeHtml(meta.district)}</span>
            </div>
            <div class="gto-region-name">${escapeHtml(fed.region)}</div>
          </div>
        </div>

        <div class="gto-region-president-box">
          <div style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; color: #38BDF8;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 10px; color: var(--gto-text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Руководитель отделения</div>
            <div class="gto-region-president">${escapeHtml(fed.president || "Назначен исполняющий обязанности")}</div>
          </div>
        </div>
        
        <div class="gto-region-contacts-list">
          ${fed.phone ? `
            <div class="gto-region-contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <a href="tel:${escapeHtml(telClean)}" style="color: var(--gto-text-primary); text-decoration: none; font-weight: 600;">${escapeHtml(fed.phone)}</a>
            </div>
          ` : ""}
          ${fed.email ? `
            <div class="gto-region-contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <a href="mailto:${escapeHtml(fed.email)}" style="color: #38BDF8; text-decoration: none;">${escapeHtml(fed.email)}</a>
            </div>
          ` : ""}
          ${fed.address ? `
            <div class="gto-region-contact-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span style="line-height: 1.35;">${escapeHtml(fed.address.replace(/&nbsp;/g, ' '))}</span>
            </div>
          ` : ""}
        </div>

        <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--gto-border);">
          ${fed.phone ? `
            <a href="tel:${escapeHtml(telClean)}" class="gto-btn-primary" style="flex: 1; padding: 7px 10px; font-size: 11.5px; text-decoration: none; justify-content: center; display: inline-flex; align-items: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span>Позвонить</span>
            </a>
          ` : ""}
          ${fed.email ? `
            <a href="mailto:${escapeHtml(fed.email)}" class="gto-btn-outline" style="flex: 1; padding: 7px 10px; font-size: 11.5px; text-decoration: none; justify-content: center; display: inline-flex; align-items: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span>Написать</span>
            </a>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");
}

/* --- Official VK Photos (Scraped & Synced from vk.com/gtosport) --- */
export const GTO_VK_PHOTOS = [
  { id: 1, src: "assets/vk/vk_photo_1.jpg", title: "Церемония открытия и парад сборных команд Игр ГТО", album: "Игры ГТО 2026", date: "2026 г." },
  { id: 2, src: "assets/vk/vk_photo_2.jpg", title: "Финальная эстафета и силовой комплекс на центральной арене", album: "Кубок Дальнего Востока", date: "2026 г." },
  { id: 3, src: "assets/vk/vk_photo_3.jpg", title: "Торжественное награждение чемпионов и вручение кубков", album: "Народные Игры ГТО", date: "2026 г." },
  { id: 4, src: "assets/vk/vk_photo_4.jpg", title: "Всероссийская судейская коллегия и зона видеоповторов VAR", album: "Судейский корпус ГТО", date: "2026 г." },
  { id: 5, src: "assets/vk/vk_photo_5.jpg", title: "Заруба на полосе препятствий «Иду на рекорд»", album: "Игры ГТО Белгород", date: "2026 г." },
  { id: 6, src: "assets/vk/cover_vk.jpg", title: "Официальное знамя и штаб Федерации многоборья ГТО России", album: "Пресс-служба ГТО", date: "2026 г." },
  { id: 7, src: "https://gto.com.ru/data/1786353070/preview/1786354866.jpg", title: "Гонка чемпионов: Силовой помост и рывок гири 24 кг", album: "Лужники Финал", date: "2026 г." },
  { id: 8, src: "https://gto.com.ru/data/1785220544/preview/x1785220927.jpg.pagespeed.ic.iLjJx9dIml.jpg", title: "Старт атлетов в абсолютной категории Профессионалы", album: "Всероссийский финал", date: "2026 г." },
  { id: 9, src: "https://gto.com.ru/data/1783504860/preview/x1783505036.jpg.pagespeed.ic.3Krbw2lRh_.jpg", title: "Юношеское первенство страны по многоборью ГТО", album: "Юношеская лига", date: "2026 г." },
  { id: 10, src: "https://gto.com.ru/data/1776688003/editor/1776689494.jpg", title: "Международный этап тестирования ГТО в Дубае (ISD Stadium)", album: "ГТО Эмираты", date: "2026 г." },
  { id: 11, src: "https://gto.com.ru/data/1739449615/gallery/x1775712602.jpg.pagespeed.ic.ICnJvr0gsW.jpg", title: "Пьедестал почета: Золотые медалисты Народных Игр ГТО", album: "Герои ГТО", date: "2026 г." },
  { id: 12, src: "https://gto.com.ru/data/1739449615/gallery/x1775648254.jpg.pagespeed.ic.CYyjfMWLIa.jpg", title: "Судейский семинар и разбор критериев No Rep", album: "Стандарты судейства", date: "2026 г." }
];

/* --- Official VK Albums & Photobank System (vk.ru/albums-211529393) --- */
export function getActiveVkAlbum(albumId = null) {
  const targetId = albumId || state.activeAlbumId;
  if (!GTO_VK_ALBUMS || !GTO_VK_ALBUMS.length) return null;
  return GTO_VK_ALBUMS.find(a => String(a.id) === String(targetId)) || GTO_VK_ALBUMS[0];
}

export function renderVkQuickNav(containerId, isOverview = false) {
  const container = document.getElementById(containerId);
  if (!container || !GTO_VK_ALBUMS || !GTO_VK_ALBUMS.length) return;

  const albumsToShow = isOverview ? GTO_VK_ALBUMS.slice(0, 8) : GTO_VK_ALBUMS;

  container.innerHTML = albumsToShow.map(alb => {
    return `
      <button type="button" class="gto-album-pill" onclick="window.scrollToAlbum('${alb.id}', ${isOverview})">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#FBBF24" stroke-width="2" style="flex-shrink:0;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
        <span>${escapeHtml(alb.title)}</span>
        <span class="gto-album-pill-count">${alb.photos.length} фото</span>
      </button>
    `;
  }).join("") + (isOverview ? `
    <button type="button" class="gto-album-pill" onclick="window.switchTab('photos')" style="border-color: #38bdf8; color: #38bdf8;">
      <span>Все 19 альбомов в Фотобанке &rarr;</span>
    </button>
  ` : "");
}

/* --- Switch Media Mode (Фотоальбомы vs Видеотрансляции) --- */
export function switchMediaMode(mode) {
  state.mediaMode = mode;
  const pBtn = document.getElementById("media-mode-btn-photos");
  const vBtn = document.getElementById("media-mode-btn-videos");
  const pSec = document.getElementById("media-photos-section");
  const vSec = document.getElementById("media-videos-section");

  if (pBtn) pBtn.classList.toggle("active", mode === "photos");
  if (vBtn) vBtn.classList.toggle("active", mode === "videos");
  if (pSec) pSec.style.display = mode === "photos" ? "block" : "none";
  if (vSec) vSec.style.display = mode === "videos" ? "block" : "none";
}

/* --- Accordion Toggle for Vertical Albums --- */
export function toggleAlbumAccordion(albumId, isOverview = false) {
  const prefix = isOverview ? "overview-album-block" : "media-album-block";
  const targetEl = document.getElementById(`${prefix}-${albumId}`);
  if (!targetEl) return;

  const willExpand = !targetEl.classList.contains("expanded");

  // Accordion behavior: close any other currently expanded album so only ONE is open at a time
  const container = isOverview
    ? document.getElementById("overview-vk-albums-stream")
    : document.getElementById("vk-albums-vertical-stream");

  if (container && willExpand) {
    container.querySelectorAll(".gto-accordion-album.expanded").forEach(el => {
      if (el !== targetEl) {
        el.classList.remove("expanded");
        const badge = el.querySelector(".gto-toggle-label") || el.querySelector(".gto-accordion-toggle-badge span");
        if (badge) badge.textContent = "Смотреть фото";
      }
    });
  }

  targetEl.classList.toggle("expanded", willExpand);
  const badgeText = targetEl.querySelector(".gto-toggle-label") || targetEl.querySelector(".gto-accordion-toggle-badge span");
  if (badgeText) {
    badgeText.textContent = willExpand ? "Свернуть" : "Смотреть фото";
  }

  if (willExpand) {
    setTimeout(() => {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }
}

export function scrollToAlbum(albumId, fromOverview = false) {
  state.activeAlbumId = albumId;

  const prefix = fromOverview ? "overview-album-block" : "media-album-block";
  let el = document.getElementById(`${prefix}-${albumId}`);

  if (!el && fromOverview) {
    switchTab("photos");
    setTimeout(() => {
      const mediaEl = document.getElementById(`media-album-block-${albumId}`);
      if (mediaEl) {
        if (!mediaEl.classList.contains("expanded")) {
          toggleAlbumAccordion(albumId, false);
        }
        mediaEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
    return;
  }

  if (el) {
    if (!el.classList.contains("expanded")) {
      toggleAlbumAccordion(albumId, fromOverview);
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function renderVkAlbumsStream(containerId, maxAlbums = 19, photosPerAlbum = 18) {
  const container = document.getElementById(containerId);
  if (!container || !GTO_VK_ALBUMS || !GTO_VK_ALBUMS.length) return;

  const isOverview = containerId.includes("overview");
  const prefix = isOverview ? "overview-album-block" : "media-album-block";
  const albums = GTO_VK_ALBUMS.slice(0, maxAlbums);

  container.innerHTML = albums.map((alb) => {
    // All albums collapsed by default - user opens what they want
    const isDefaultExpanded = false;
    const photos = alb.photos.slice(0, photosPerAlbum);
    const linkedEventId = getTournamentByAlbumId(alb.id);
    const linkedEvent = linkedEventId ? GTO_CALENDAR_EVENTS.find(e => e.id === linkedEventId) : null;
    const photosHtml = photos.map((p, pIdx) => `
      <div class="gto-vk-photo-card" onclick="event.stopPropagation(); window.openVkPhotoModal('${alb.id}', ${pIdx})" title="${escapeHtml(p.title)} • Нажмите для увеличения">
        <img src="${p.src}" alt="${escapeHtml(p.title)}" class="gto-vk-photo-img" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
        <div class="gto-vk-photo-overlay">
          <div>
            <div class="gto-vk-photo-caption">${escapeHtml(alb.title)}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.85); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
              <span>Кадр ${pIdx + 1} из ${alb.photos.length}</span>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    return `
      <article class="gto-accordion-album ${isDefaultExpanded ? "expanded" : ""}" id="${prefix}-${alb.id}">
        <header class="gto-accordion-header" onclick="window.toggleAlbumAccordion('${alb.id}', ${isOverview})">
          <div class="gto-accordion-left">
            <div class="gto-accordion-thumb-wrap">
              <img src="${alb.cover}" alt="${escapeHtml(alb.title)}" class="gto-accordion-thumb" onerror="this.onerror=null; this.src='assets/logo.png';">
            </div>
            <div class="gto-accordion-titles">
              <h3 class="gto-accordion-title" style="display: flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FBBF24" stroke-width="2" style="flex-shrink:0;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                <span>${escapeHtml(alb.title)}</span>
              </h3>
              <div class="gto-accordion-meta">
                <span class="gto-meta-pill blue" style="display: inline-flex; align-items: center; gap: 4px;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  <span>${alb.photos.length} фото</span>
                </span>
                <span class="gto-meta-pill" style="display: inline-flex; align-items: center; gap: 4px;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  <span>${escapeHtml(alb.totalPhotosText)} в архиве</span>
                </span>
                ${linkedEvent ? `
                  <span class="gto-meta-pill gold" style="cursor: pointer; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation(); window.openCompletedEventModal(${linkedEvent.id});" title="Открыть карточку турнира «${escapeHtml(linkedEvent.title)}» в календаре">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#FBBF24" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                    <span>${escapeHtml(linkedEvent.title)} ↗</span>
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
          <div class="gto-accordion-right">
            <div class="gto-accordion-toggle-badge">
              <span class="gto-toggle-label">${isDefaultExpanded ? "Свернуть" : "Смотреть фото"}</span>
              <span class="gto-accordion-chevron" style="display:inline-flex; align-items:center;">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>
          </div>
        </header>

        <div class="gto-accordion-body">
          ${linkedEvent ? `
            <div style="margin-bottom: 14px; padding: 11px 16px; background: rgba(230, 57, 70, 0.08); border: 1px solid rgba(230, 57, 70, 0.25); border-radius: var(--gto-radius-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(251, 191, 36, 0.15);">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FBBF24" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                </span>
                <div style="min-width: 0;">
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--gto-gold); font-weight: 700; letter-spacing: 0.5px;">Связанный турнир в календаре</div>
                  <div style="font-size: 13.5px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;">${escapeHtml(linkedEvent.title)}</div>
                  <div style="font-size: 11.5px; color: var(--gto-text-secondary); margin-top: 2px;">${escapeHtml(linkedEvent.period || '')} • ${escapeHtml(linkedEvent.location || '')}</div>
                </div>
              </div>
              <button type="button" class="gto-btn-primary" onclick="event.stopPropagation(); window.openCompletedEventModal(${linkedEvent.id});" style="padding: 7px 14px; font-size: 12px;">
                <span>Карточка турнира, видео и итоги ↗</span>
              </button>
            </div>
          ` : ''}
          <div class="gto-vk-gallery-grid">
            ${photosHtml}
          </div>
          <div style="display: flex; justify-content: center; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap;">
            ${linkedEvent ? `
              <button type="button" class="gto-btn-primary" onclick="event.stopPropagation(); window.openCompletedEventModal(${linkedEvent.id});" style="padding: 9px 18px; font-size: 12.5px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                <span>Итоги и видео турнира ↗</span>
              </button>
            ` : ''}
            <a href="${alb.vkUrl}" target="_blank" rel="noopener noreferrer" class="gto-btn-outline" onclick="event.stopPropagation();" style="text-decoration: none; padding: 9px 20px; font-size: 12.5px; border-radius: 999px;">
              <span>Смотреть весь архив фотоальбома (${escapeHtml(alb.totalPhotosText)}) ↗</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("") + (isOverview ? `
    <div style="text-align: center; margin-top: 14px;">
      <button class="gto-btn-secondary" onclick="window.switchTab('photos');" style="padding: 12px 24px; font-size: 14px;">
        <span>Смотреть все турнирные фотоальбомы &darr;</span>
      </button>
    </div>
  ` : "");
}

export function openVkPhotoModal(albumId, photoIdx) {
  const album = getActiveVkAlbum(albumId);
  if (!album || !album.photos || !album.photos[photoIdx]) return;

  state.currentModalAlbumId = album.id;
  state.currentModalPhotoIndex = photoIdx;

  const photo = album.photos[photoIdx];
  const total = album.photos.length;

  const html = `
    <div style="position: relative; width: 100%; border-radius: var(--gto-radius-sm); overflow: hidden; background: #000; margin-bottom: 14px;">
      <img src="${photo.src}" alt="${escapeHtml(photo.title)}" style="width: 100%; max-height: 70vh; object-fit: contain; display: block; margin: 0 auto;" onerror="this.onerror=null; this.src='assets/logo.png';">
    </div>
    
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
      <span class="gto-badge-federal">📁 ${escapeHtml(album.title)}</span>
      <span style="font-size: 12.5px; font-weight: 700; color: var(--gto-blue-hover);">Фото ${photoIdx + 1} из ${total}</span>
    </div>

    <h3 style="font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 14px 0; line-height: 1.4;">${escapeHtml(photo.title)}</h3>

    <!-- Навигация вперед / назад -->
    <div class="gto-modal-photo-nav">
      <div style="display: flex; gap: 8px;">
        <button type="button" class="gto-btn-outline" style="padding: 8px 14px; font-size: 12.5px;" ${photoIdx <= 0 ? "disabled style='opacity:0.4; cursor:not-allowed;'" : `onclick="window.navVkPhotoModal(-1)"`}>
          &larr; Назад
        </button>
        <button type="button" class="gto-btn-outline" style="padding: 8px 14px; font-size: 12.5px;" ${photoIdx >= total - 1 ? "disabled style='opacity:0.4; cursor:not-allowed;'" : `onclick="window.navVkPhotoModal(1)"`}>
          Вперед &rarr;
        </button>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <a href="${album.vkUrl}" target="_blank" rel="noopener noreferrer" class="gto-btn-primary" style="text-decoration: none; padding: 8px 14px; font-size: 12.5px;">
          <span>Смотреть в высоком разрешении (${escapeHtml(album.totalPhotosText)}) ↗</span>
        </a>
        <button class="gto-btn-outline" onclick="window.closeModal()" style="padding: 8px 12px; font-size: 12px;">Закрыть</button>
      </div>
    </div>
  `;

  openModal(`Фотоальбом: ${album.title}`, html);
}

export function navVkPhotoModal(delta) {
  const album = getActiveVkAlbum(state.currentModalAlbumId);
  if (!album || !album.photos) return;
  const newIndex = state.currentModalPhotoIndex + delta;
  if (newIndex >= 0 && newIndex < album.photos.length) {
    openVkPhotoModal(album.id, newIndex);
  }
}

export function openPhotoModal(photoIdx) {
  openVkPhotoModal(state.activeAlbumId, photoIdx);
}

/* --- Photos: Official VK Photobank Stream --- */
export function renderPhotos() {
  try {
    renderVkQuickNav("media-album-tabs", false);
    renderVkAlbumsStream("vk-albums-vertical-stream", 19, 18);
  } catch (e) {
    console.warn("renderPhotos:", e);
  }
}

export function filterVkAlbums(query) {
  const q = (query || "").toLowerCase().trim();
  const clearBtn = document.getElementById("photos-search-clear");
  if (clearBtn) clearBtn.style.display = q ? "block" : "none";

  const albums = document.querySelectorAll("#vk-albums-vertical-stream .gto-accordion-album");
  albums.forEach(alb => {
    const text = alb.textContent.toLowerCase();
    const match = !q || text.includes(q);
    alb.style.display = match ? "block" : "none";
  });
}

export function clearPhotosSearch() {
  const input = document.getElementById("photos-search-input");
  if (input) {
    input.value = "";
    filterVkAlbums("");
  }
}

/* --- Videos: Rutube & VK Video Playlist & Search --- */
export function setVideoYear(year) {
  state.videoYear = year === "all" ? "all" : parseInt(year, 10);
  document.querySelectorAll("#video-year-tabs [data-vyear]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-vyear") === String(year));
  });
  renderVideos();
}

export function setVideoCategory(cat) {
  state.videoCategory = cat;
  document.querySelectorAll("#video-category-tabs [data-vcat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-vcat") === cat);
  });
  renderVideos();
}

export function filterVideos(query) {
  state.videoSearchQuery = (query || "").trim().toLowerCase();
  renderVideos();
}

export function renderVideos() {
  const playlistEl = document.getElementById("media-playlist");
  if (!playlistEl || !GTO_VIDEOS || !GTO_VIDEOS.length) return;

  const q = (state.videoSearchQuery || "").toLowerCase();
  const cat = state.videoCategory || "all";
  const yr = state.videoYear || "all";

  const filtered = GTO_VIDEOS.filter(v => {
    if (yr !== "all" && v.year !== yr) return false;
    if (cat !== "all" && v.category !== cat) return false;
    if (q) {
      const matchTitle = v.title.toLowerCase().includes(q);
      const matchDesc = (v.desc || "").toLowerCase().includes(q);
      const matchBadge = (v.badge || "").toLowerCase().includes(q);
      const matchYear = String(v.year).includes(q);
      if (!matchTitle && !matchDesc && !matchBadge && !matchYear) return false;
    }
    return true;
  });

  const countBadge = document.getElementById("video-count-badge");
  if (countBadge) {
    countBadge.textContent = `${filtered.length} видео`;
  }

  if (filtered.length === 0) {
    playlistEl.innerHTML = `
      <div style="padding: 28px 16px; text-align: center; color: var(--gto-text-secondary); font-size: 13.5px;">
        <div style="display: flex; justify-content: center; margin-bottom: 8px;">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--gto-text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <div>Ничего не найдено по вашему запросу</div>
        <button type="button" class="gto-btn-outline" style="margin-top: 12px; padding: 6px 14px; font-size: 12px;" onclick="window.setVideoYear('all'); window.setVideoCategory('all'); const inp = document.getElementById('video-search-input'); if(inp){ inp.value=''; window.filterVideos(''); }">Сбросить фильтры</button>
      </div>
    `;
    return;
  }

  playlistEl.innerHTML = filtered.map(video => {
    const isVk = video.platform === "vk" || video.embedUrl.includes("vk.com");
    return `
      <div class="gto-playlist-item ${video.id === state.activeVideoId ? "active" : ""}" data-video-id="${video.id}" onclick="window.selectRutubeVideo(${video.id})">
        <div style="position: relative; flex-shrink: 0;">
          <img src="${video.thumb}" alt="${escapeHtml(video.title)}" class="gto-playlist-thumb" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
          <span class="gto-playlist-platform-tag ${isVk ? 'vk' : 'rutube'}">${isVk ? 'VK' : 'Rutube'}</span>
        </div>
        <div style="min-width: 0; flex: 1;">
          <div class="gto-playlist-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</div>
          <div style="font-size: 11px; color: var(--gto-text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="gto-badge-gold" style="padding: 1px 6px; font-size: 10px; font-weight: 800; border-radius: 4px;">${video.year}</span>
            <span class="gto-badge-federal" style="padding: 1px 6px; font-size: 9.5px; font-weight: 700;">${escapeHtml(video.badge)}</span>
            <span>•</span>
            <span style="color: var(--gto-text-secondary); font-weight: 600;">${escapeHtml(video.duration)}</span>
            <span>•</span>
            <span>${escapeHtml(video.views)}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* --- Backwards compatibility for renderMedia --- */
export function renderMedia() {
  renderPhotos();
  renderVideos();
}

export function selectRutubeVideo(videoId) {
  const vid = GTO_VIDEOS.find(v => v.id === videoId);
  if (!vid) return;

  state.activeVideoId = videoId;
  const player = document.getElementById("main-rutube-player");
  const titleEl = document.getElementById("main-video-title");
  const descEl = document.getElementById("main-video-desc");
  const rutubeLink = document.getElementById("main-video-rutube-link");

  if (player) {
    player.src = vid.embedUrl;
  }
  if (titleEl) titleEl.textContent = vid.title;
  if (descEl) descEl.textContent = vid.desc || "Официальный видеоотчет и прямые трансляции турниров Федерации многоборья ГТО России.";
  if (rutubeLink) {
    if (vid.platform === "vk" || vid.embedUrl.includes("vk.com")) {
      const vidMatch = vid.embedUrl.match(/id=([0-9]+)/);
      const vkId = vidMatch ? vidMatch[1] : "";
      rutubeLink.href = vkId ? `https://vk.ru/video-211529393_${vkId}` : "https://vk.ru/video/@gtosport";
      rutubeLink.className = "gto-btn-primary";
      rutubeLink.innerHTML = "<span>Смотреть в VK Видео ↗</span>";
    } else {
      const videoHash = vid.embedUrl.split("/embed/")[1]?.replace("/", "") || "";
      rutubeLink.href = `https://rutube.ru/video/${videoHash}/`;
      rutubeLink.className = "gto-btn-primary";
      rutubeLink.innerHTML = "<span>Смотреть на Rutube ↗</span>";
    }
  }

  const bridgeEl = document.getElementById("main-video-tournament-bridge");
  if (bridgeEl) {
    const linkedEventId = getTournamentByVideoUrl(vid.embedUrl);
    if (linkedEventId) {
      const linkedEvent = GTO_CALENDAR_EVENTS.find(e => e.id === linkedEventId);
      const media = getTournamentMedia(linkedEventId);
      if (linkedEvent) {
        bridgeEl.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.08); border: 1px solid rgba(230, 57, 70, 0.25); border-radius: var(--gto-radius-sm); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: rgba(251, 191, 36, 0.15);">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FBBF24" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
              </span>
              <div style="min-width: 0;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--gto-gold); font-weight: 700;">Официальный турнир из календаря</div>
                <div style="font-weight: 700; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px;" title="${escapeHtml(linkedEvent.title)}">${escapeHtml(linkedEvent.title)}</div>
                <div style="font-size: 11.5px; color: var(--gto-text-secondary); margin-top: 2px;">${escapeHtml(linkedEvent.period || '')} • ${escapeHtml(linkedEvent.location || '')}</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="gto-btn-primary" onclick="window.openCompletedEventModal(${linkedEvent.id})" style="padding: 7px 14px; font-size: 12px;">
                <span>Карточка турнира ↗</span>
              </button>
              ${media.hasPhotos && media.albums && media.albums.length ? `
                <button type="button" class="gto-btn-secondary" onclick="window.openTournamentAlbum('${media.albums[0].id}')" style="padding: 7px 14px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px;">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  <span>Фотоальбом (${media.totalPhotosText || media.totalPhotosCount}) ↗</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;
        bridgeEl.style.display = "block";
      } else {
        bridgeEl.innerHTML = "";
        bridgeEl.style.display = "none";
      }
    } else {
      bridgeEl.innerHTML = "";
      bridgeEl.style.display = "none";
    }
  }

  // Update active state in playlist without full re-render to avoid iframe flickering
  document.querySelectorAll(".gto-playlist-item").forEach(item => {
    const isThis = item.getAttribute("data-video-id") === String(videoId);
    item.classList.toggle("active", isThis);
  });
}

/* --- Standards Calculator --- */
function initCalculator() {
  updateCalculator();
}

export function updateCalculator() {
  const sex = document.getElementById("calc-sex-select")?.value || "M";
  const age = document.getElementById("calc-age-select")?.value || "18-29";
  const tbody = document.getElementById("calc-table-body");
  if (!tbody) return;

  const ageData = GTO_STANDARDS[age] || GTO_STANDARDS["18-29"] || {};
  const list = ageData[sex] || [];

  tbody.innerHTML = list.map((item, idx) => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(item.unit)})</td>
      <td class="badge-gold">${item.gold} ${escapeHtml(item.unit)}</td>
      <td class="badge-silver">${item.silver} ${escapeHtml(item.unit)}</td>
      <td class="badge-bronze">${item.bronze} ${escapeHtml(item.unit)}</td>
      <td>
        <input type="number" step="0.1" class="gto-calc-input" id="calc-input-${idx}" 
               placeholder="Ваш рез." 
               oninput="window.evaluateCalcRow(${idx}, ${item.gold}, ${item.silver}, ${item.bronze}, ${item.invert || false})">
      </td>
      <td id="calc-res-${idx}">
        <span style="color: var(--gto-text-muted); font-size: 12px;">Введите результат</span>
      </td>
    </tr>
  `).join("");
}

export function evaluateCalcRow(idx, gold, silver, bronze, invert) {
  const input = document.getElementById(`calc-input-${idx}`);
  const resCell = document.getElementById(`calc-res-${idx}`);
  if (!input || !resCell) return;

  const val = parseFloat(input.value);
  if (isNaN(val) || val <= 0) {
    resCell.innerHTML = `<span style="color: var(--gto-text-muted); font-size: 12px;">Введите результат</span>`;
    return;
  }

  let achieved = "none";
  if (invert) {
    if (val <= gold) achieved = "gold";
    else if (val <= silver) achieved = "silver";
    else if (val <= bronze) achieved = "bronze";
  } else {
    if (val >= gold) achieved = "gold";
    else if (val >= silver) achieved = "silver";
    else if (val >= bronze) achieved = "bronze";
  }

  if (achieved === "gold") {
    resCell.innerHTML = `<span class="badge-gold">🥇 Золотой знак</span>`;
  } else if (achieved === "silver") {
    resCell.innerHTML = `<span class="badge-silver">🥈 Серебряный знак</span>`;
  } else if (achieved === "bronze") {
    resCell.innerHTML = `<span class="badge-bronze">🥉 Бронзовый знак</span>`;
  } else {
    resCell.innerHTML = `<span style="color: var(--gto-text-muted);">Без знака</span>`;
  }
}

/* --- Athlete Cabinet --- */
function loadSavedAthleteProfile() {
  try {
    const saved = localStorage.getItem("gto_athlete_profile");
    if (saved) {
      state.athlete = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not parse saved athlete profile:", e);
  }
}

function initCabinet() {
  const ath = state.athlete;
  const nameEl = document.getElementById("cabinet-display-name");
  const uinEl = document.getElementById("cabinet-display-uin");
  const regEl = document.getElementById("cabinet-display-region");
  const stageEl = document.getElementById("cabinet-display-stage");
  const initialsEl = document.getElementById("cabinet-avatar-initials");

  if (nameEl) nameEl.textContent = ath.name || "Спортсмен ГТО";
  if (uinEl) uinEl.textContent = `УИН: ${ath.uin || "Не указан"}`;
  if (regEl) regEl.textContent = ath.region || "Не указан";
  if (stageEl) stageEl.textContent = ath.stage || "18-29 лет";

  if (initialsEl && ath.name) {
    const parts = ath.name.split(" ").filter(Boolean);
    initialsEl.textContent = parts.slice(0, 2).map(p => p[0]).join("").toUpperCase() || "ГТО";
  }

  const inputName = document.getElementById("athlete-input-name");
  const inputUin = document.getElementById("athlete-input-uin");
  const inputRegion = document.getElementById("athlete-input-region");
  const inputStage = document.getElementById("athlete-input-stage");
  const inputPhone = document.getElementById("athlete-input-phone");
  const inputEmail = document.getElementById("athlete-input-email");

  if (inputName) inputName.value = ath.name || "";
  if (inputUin) inputUin.value = ath.uin || "";
  if (inputRegion) inputRegion.value = ath.region || "";
  if (inputStage && ath.stage) inputStage.value = ath.stage;
  if (inputPhone) inputPhone.value = ath.phone || "";
  if (inputEmail) inputEmail.value = ath.email || "";

  const tourSelect = document.getElementById("athlete-tournament-select");
  if (tourSelect) {
    const sortedTournaments = [...GTO_CALENDAR_EVENTS].sort((a, b) => b.id - a.id);
    tourSelect.innerHTML = sortedTournaments.slice(0, 50).map(t => {
      const meta = getEventMeta(t);
      return `<option value="${t.id}">${escapeHtml(t.title)} (${escapeHtml(meta.dates)})</option>`;
    }).join("");
  }
}

export function saveAthleteProfile(e) {
  if (e) e.preventDefault();

  const name = document.getElementById("athlete-input-name")?.value.trim() || "";
  const uin = document.getElementById("athlete-input-uin")?.value.trim() || "";
  const region = document.getElementById("athlete-input-region")?.value.trim() || "";
  const stage = document.getElementById("athlete-input-stage")?.value || "18-29 лет";
  const phone = document.getElementById("athlete-input-phone")?.value.trim() || "";
  const email = document.getElementById("athlete-input-email")?.value.trim() || "";

  state.athlete = { name, uin, region, stage, phone, email };
  try {
    localStorage.setItem("gto_athlete_profile", JSON.stringify(state.athlete));
  } catch (err) {}

  initCabinet();
  showToast("Заявка успешно подана и сохранена в Федерации ГТО!");
}

/* --- Dedicated In-App Tournament Application Modal --- */
export function openApplyModal(eventId) {
  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === Number(eventId)) || GTO_CALENDAR_EVENTS[0];
  const meta = getEventMeta(ev);
  const profile = state.athlete || {};

  const html = `
    <div class="gto-apply-modal-wrapper">
      <!-- Tournament Header Banner -->
      <div class="gto-apply-tour-card">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
          <span class="${meta.isFederal ? "gto-badge-federal" : "gto-badge-regional"}">${meta.isFederal ? "Всероссийский старт" : "Региональный старт"}</span>
          <span class="gto-badge-gold" style="font-size: 11px;">Регистрация 2026</span>
        </div>
        <h3 style="font-size: 16px; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 8px;">${escapeHtml(ev.title)}</h3>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--gto-text-secondary);">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span><strong>Сроки:</strong> <span style="color: #fff; font-weight: 600;">${escapeHtml(meta.dates)}</span></span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span><strong>Арена:</strong> <span style="color: #fff;">${escapeHtml(meta.location)}</span></span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span><strong>Категории:</strong> ${escapeHtml(meta.participants)}</span>
          </div>
        </div>
      </div>

      <div style="padding: 4px 0; font-size: 12px; color: #34D399; display: flex; align-items: center; gap: 6px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>Официальный приём заявок в оргкомитет турнира</span>
      </div>

      <!-- Application Form -->
      <form id="tournament-apply-form" onsubmit="window.submitTournamentApplication(event, ${ev.id})">
        <div class="gto-apply-form-grid">
          <div class="gto-form-group">
            <label class="gto-label">ФИО спортсмена *</label>
            <input type="text" id="apply-input-name" class="gto-input-field" placeholder="Иванов Алексей Сергеевич" value="${escapeHtml(profile.name || "")}" required autocomplete="name">
          </div>

          <div class="gto-form-group">
            <label class="gto-label">Телефон для связи *</label>
            <input type="tel" id="apply-input-phone" class="gto-input-field" placeholder="+7 (999) 000-00-00" value="${escapeHtml(profile.phone || "")}" required autocomplete="tel" inputmode="tel">
          </div>

          <div class="gto-form-group">
            <label class="gto-label">Email (для подтверждения) *</label>
            <input type="email" id="apply-input-email" class="gto-input-field" placeholder="athlete@mail.ru" value="${escapeHtml(profile.email || "")}" required autocomplete="email" inputmode="email">
          </div>

          <div class="gto-form-group">
            <label class="gto-label">Субъект РФ / Город *</label>
            <input type="text" id="apply-input-region" class="gto-input-field" placeholder="Москва, Краснодарский край..." value="${escapeHtml(profile.region || "")}" required>
          </div>

          <div class="gto-form-group">
            <label class="gto-label">Категория участия *</label>
            <select id="apply-input-category" class="gto-input-field">
              <option value="Герой ГТО: Первая попытка">Герой ГТО: Первая попытка (Новички)</option>
              <option value="Любители" selected>Любители (Мужчины / Женщины)</option>
              <option value="Профессионалы">Профессионалы (Элита / Разрядники)</option>
              <option value="Ветераны (40+ лет)">Ветераны (40+ лет)</option>
              <option value="Ветераны (50+ лет)">Ветераны (50+ лет)</option>
              <option value="Юниоры (до 18 лет)">Юниоры (до 18 лет)</option>
              <option value="Без границ (ВОИ / ПОДА)">Без границ (Адаптивный спорт / ПОДА)</option>
            </select>
          </div>

          <div class="gto-form-group">
            <label class="gto-label">УИН ВФСК ГТО (11 цифр, если есть)</label>
            <input type="text" id="apply-input-uin" class="gto-input-field" placeholder="26-77-0012345" value="${escapeHtml(profile.uin || "")}">
          </div>
        </div>

        <div style="font-size: 11.5px; color: var(--gto-text-muted); line-height: 1.4; margin: 10px 0 14px 0; display: flex; align-items: flex-start; gap: 6px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Участие бесплатное. Заявка вносится в мандатную комиссию соревнований. При себе на турнире необходимо иметь паспорт и медицинский допуск.</span>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
          <button type="button" class="gto-btn-outline" onclick="window.closeModal()">Отмена</button>
          <button type="submit" class="gto-btn-primary" style="padding: 10px 20px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <span>Отправить заявку на турнир</span>
          </button>
        </div>
      </form>
    </div>
  `;

  openModal("Подача заявки на турнир", html);
}

export function submitTournamentApplication(event, eventId) {
  if (event && event.preventDefault) event.preventDefault();

  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === Number(eventId)) || GTO_CALENDAR_EVENTS[0];
  const name = document.getElementById("apply-input-name")?.value.trim() || "";
  const phone = document.getElementById("apply-input-phone")?.value.trim() || "";
  const email = document.getElementById("apply-input-email")?.value.trim() || "";
  const region = document.getElementById("apply-input-region")?.value.trim() || "";
  const category = document.getElementById("apply-input-category")?.value || "Любители";
  const uin = document.getElementById("apply-input-uin")?.value.trim() || "";

  if (!name || !phone || !region) {
    showToast("Пожалуйста, заполните обязательные поля: ФИО, телефон и регион");
    return;
  }

  // Update profile
  state.athlete = {
    ...state.athlete,
    name,
    phone,
    email,
    region,
    uin: uin || state.athlete?.uin || "",
    category
  };
  try {
    localStorage.setItem("gto_athlete_profile", JSON.stringify(state.athlete));
  } catch (e) {}

  // Generate unique application ID
  const regNumber = `ГТО-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newApp = {
    id: Date.now(),
    regNumber,
    eventId: ev.id,
    eventTitle: ev.title,
    eventPeriod: ev.period,
    eventLocation: ev.location,
    dateSubmitted: new Date().toLocaleDateString("ru-RU"),
    name,
    phone,
    email,
    region,
    category,
    uin,
    status: "Подтверждена"
  };

  try {
    const existing = JSON.parse(localStorage.getItem("gto_user_applications") || "[]");
    existing.unshift(newApp);
    localStorage.setItem("gto_user_applications", JSON.stringify(existing.slice(0, 20)));
  } catch (e) {}

  // Instant success screen inside the modal
  const modalContent = document.getElementById("gto-modal-content");
  if (modalContent) {
    modalContent.innerHTML = `
      <div style="text-align: center; padding: 18px 8px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid #10B981; color: #10B981; font-size: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
          ✓
        </div>
        <span class="gto-badge-federal" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #34D399; font-size: 12px; padding: 4px 12px; border-radius: 999px;">Заявка зарегистрирована</span>
        <h3 style="font-size: 19px; font-weight: 900; color: #fff; margin: 12px 0 6px 0;">Заявка принята оргкомитетом!</h3>
        <p style="font-size: 13px; color: var(--gto-text-secondary); max-width: 440px; margin: 0 auto 16px auto; line-height: 1.5;">
          Ваша регистрационная запись внесена в официальный реестр участников соревнований Всероссийской федерации многоборья ГТО.
        </p>

        <div style="background: var(--gto-surface-raised); border: 1px solid var(--gto-border); border-radius: var(--gto-radius-sm); padding: 14px 16px; max-width: 440px; margin: 0 auto 18px auto; text-align: left; font-size: 12.5px; display: flex; flex-direction: column; gap: 6px;">
          <div><strong>Номер заявки:</strong> <span style="color: var(--gto-gold); font-weight: 800; font-family: monospace; font-size: 13.5px;">${regNumber}</span></div>
          <div><strong>Турнир:</strong> <span style="color: #fff; font-weight: 700;">${escapeHtml(ev.title)}</span></div>
          <div><strong>Сроки:</strong> ${escapeHtml(ev.period)} • ${escapeHtml(ev.location)}</div>
          <div><strong>Участник:</strong> ${escapeHtml(name)} (${escapeHtml(category)})</div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="gto-btn-outline" onclick="window.downloadEventIcs(${ev.id})" style="padding: 9px 16px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Добавить в календарь (.ics)</span>
          </button>
          <button type="button" class="gto-btn-primary" onclick="window.closeModal()" style="padding: 9px 22px; font-size: 12.5px;">
            Отлично, закрыть
          </button>
        </div>
      </div>
    `;
  }

  showToast(`Заявка № ${regNumber} успешно отправлена!`);
}

export function applyForEvent(eventId) {
  openApplyModal(eventId);
}

/* --- Search and Filter Listeners --- */
function initSearchListeners() {
  // Calendar Search
  const calSearch = document.getElementById("calendar-search-input");
  if (calSearch) {
    calSearch.addEventListener("input", (e) => {
      state.calendarSearch = e.target.value;
      renderCalendar();
    });
  }

  // Calendar Level Filter Pills
  document.querySelectorAll(".gto-filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".gto-filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.calendarFilter = pill.getAttribute("data-filter") || "all";
      renderCalendar();
    });
  });

  // Records Search
  const recSearch = document.getElementById("records-search-input");
  if (recSearch) {
    recSearch.addEventListener("input", (e) => {
      state.recordsSearch = e.target.value;
      renderRecords();
    });
  }

  // Regions Search
  const regSearch = document.getElementById("regions-search-input");
  if (regSearch) {
    regSearch.addEventListener("input", (e) => {
      state.regionsSearch = e.target.value;
      renderRegions();
    });
  }
}

/* --- News Article HTML Cleaner & Sanitizer --- */
export function cleanNewsHtml(rawHtml) {
  if (!rawHtml) return "";
  let html = rawHtml;

  // 1. Remove TinyMCE resize handles and bogus elements (which cause giant 7000px layouts)
  html = html.replace(/<div[^>]*class=["'][^"']*mce-resizehandle[^"']*["'][^>]*><\/div>/gi, '');
  html = html.replace(/<div[^>]*id=["']mceResizeHandle[^"']*["'][^>]*><\/div>/gi, '');
  html = html.replace(/<div[^>]*data-mce-bogus=["'][^"']*["'][^>]*><\/div>/gi, '');
  html = html.replace(/<div[^>]*class=["']null["'][^>]*><\/div>/gi, '');
  html = html.replace(/<div[^>]*class=["']new_photo_grid["'][^>]*>/gi, '');

  // 2. Remove TinyMCE data-mce attributes
  html = html.replace(/\s*data-mce-[a-z0-9_-]+(=["'][^"']*["'])?/gi, '');

  // 3. Remove hardcoded width and height attributes from img/div/p
  html = html.replace(/(<img[^>]*)\s+width=["'][^"']*["']/gi, '$1');
  html = html.replace(/(<img[^>]*)\s+height=["'][^"']*["']/gi, '$1');

  // 4. Strip dangerous absolute positioning and huge inline font sizes
  html = html.replace(/style=["'][^"']*(?:position:\s*absolute|left:|top:|width:|height:|font-size:)[^"']*["']/gi, '');

  return html;
}

/* --- In-App Full News Modal --- */
export function openNewsModal(newsId) {
  const news = GTO_OFFICIAL_NEWS.find(n => n.id === newsId);
  if (!news) return;

  const rawHtml = news.fullContentHtml && news.fullContentHtml.length > 50
    ? news.fullContentHtml
    : `<p>${escapeHtml(news.text)}</p>`;

  const contentHtml = cleanNewsHtml(rawHtml);

  const html = `
    <div class="gto-modal-poster-wrap" style="aspect-ratio: 16 / 9; max-height: 280px; margin-bottom: 16px;">
      <img src="${news.img}" alt="${escapeHtml(news.title)}" class="gto-modal-poster-img" onerror="this.onerror=null; this.src='assets/logo.png';">
      <div class="gto-modal-poster-badge">
        <span class="gto-badge-federal">Официальная публикация</span>
        <span class="gto-badge-gold">${escapeHtml(news.date)}</span>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
      <span class="gto-event-dates-pill">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${escapeHtml(news.date)}
      </span>
      <span class="gto-badge-federal" style="padding: 3px 8px; font-size: 11px;">Пресс-служба ГТО</span>
    </div>

    <h2 style="font-size: 19px; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 16px;">${escapeHtml(news.title)}</h2>

    <div class="gto-news-article-content">
      ${contentHtml}
    </div>

    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--gto-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="font-size: 12.5px; color: var(--gto-text-muted); display: flex; align-items: center; gap: 6px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
        <span>Пресс-служба Общероссийской федерации многоборья ГТО</span>
      </div>
      <div style="display: flex; gap: 8px;">
        ${news.url ? `<a href="${news.url}" target="_blank" class="gto-btn-outline" style="padding: 8px 14px; font-size: 12.5px;">На gto.com.ru ↗</a>` : ""}
        <button class="gto-btn-primary" onclick="window.closeModal()">Закрыть</button>
      </div>
    </div>
  `;
  openModal("Пресс-служба • Новости Федерации", html);
}

/* --- In-App Event Details & Poster Modal --- */
export function openEventDetailsModal(eventId) {
  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  const meta = getEventMeta(ev);
  const posterSrc = meta.poster;

  const isCompleted = meta.status.code === "finished";

  const statusBadgeHtml = isCompleted
    ? `<span class="gto-badge-federal" style="background: rgba(148, 163, 184, 0.2); border-color: rgba(148, 163, 184, 0.4); color: #cbd5e1;">Статус: Турнир завершён • Протоколы</span>`
    : `<span class="gto-badge-federal" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #34D399;">Статус: Открыт приём заявок</span>`;

  const actionBtnHtml = isCompleted
    ? `<button class="gto-btn-primary" onclick="window.closeModal(); window.switchTab('records'); window.showToast('Открыта Книга рекордов и результатов соревнований');">Рекорды и результаты турнира &rarr;</button>`
    : `<button class="gto-btn-primary" onclick="window.openApplyModal(${ev.id});">Подать заявку на этот старт &rarr;</button>`;

  const upcomingNoticeHtml = !isCompleted ? `
    <div class="gto-modal-upcoming-notice">
      <div class="gto-modal-notice-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#34D399" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
      </div>
      <div>
        <div style="font-weight: 700; color: #34D399; font-size: 13.5px; margin-bottom: 2px;">Регистрация на турнир открыта</div>
        <div style="font-size: 12.5px; color: var(--gto-text-secondary); line-height: 1.4;">Прямые видеотрансляции соревнований и фотоотчёты будут доступны в дни проведения стартов согласно регламенту.</div>
      </div>
    </div>
  ` : "";

  const html = `
    <div class="gto-modal-poster-wrap">
      <img src="${posterSrc}" alt="${escapeHtml(ev.title)}" class="gto-modal-poster-img" onerror="this.onerror=null; this.src='assets/logo.png';">
      <div class="gto-modal-poster-badge">
        <span class="${meta.isFederal ? "gto-badge-federal" : "gto-badge-regional"}">${meta.isFederal ? "ФЕДЕРАЛЬНЫЙ СТАРТ" : "РЕГИОНАЛЬНЫЙ СТАРТ"}</span>
        ${statusBadgeHtml}
      </div>
    </div>

    ${upcomingNoticeHtml}

    <h2 style="font-size: 21px; font-weight: 900; color: #fff; line-height: 1.35; margin: 14px 0 12px 0;">${escapeHtml(ev.title)}</h2>
    
    <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); border: 1px solid var(--gto-border); padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; color: var(--gto-text-secondary);">
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><strong>Сроки проведения:</strong> <span style="color: #fff; font-weight: 700;">${escapeHtml(meta.dates)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><strong>Место проведения:</strong> <span style="color: #fff;">${escapeHtml(meta.location)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><strong>Категории участников:</strong> <span>${escapeHtml(meta.participants)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg><strong>Организатор:</strong> <span>Общероссийская федерация многоборья ГТО / Минспорт России</span></div>
      <div style="display: flex; align-items: flex-start; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#38BDF8" stroke-width="2" style="margin-top: 3px; flex-shrink: 0;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7"></path><path d="M14 14.66V17c0 .55.45 1 1 1h2"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg><div><strong>Спортивная программа:</strong> Бег на короткие и длинные дистанции, силовая гимнастика (подтягивания, отжимания, рывок гири), наклон вперед из положения стоя, прикладные нормативы комплекса.</div></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><strong>Судейство:</strong> <span>Всероссийская судейская коллегия Федерации по виду спорта «Многоборье ГТО»</span></div>
      ${isCompleted ? `<div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><strong>Итоги турнира:</strong> <span>Официальные протоколы утверждены, результаты внесены в базу рекордов.</span></div>` : ""}
    </div>

    <div style="font-size: 13px; line-height: 1.6; color: var(--gto-text-muted); margin-bottom: 20px; display: flex; align-items: flex-start; gap: 6px;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 3px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>Регламент соревнований утвержден Президиумом Общероссийской федерации многоборья ГТО. Для допуска к старту необходима предварительная заявка, медицинский допуск и полис страхования.</span>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
      ${!isCompleted ? `
        <button type="button" class="gto-btn-outline" onclick="window.downloadEventIcs(${ev.id})" title="Добавить старт в Apple / Google Calendar (.ics)" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; font-size: 12.5px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>В календарь (.ics)</span>
        </button>
      ` : ""}
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
      ${actionBtnHtml}
    </div>
  `;
  openModal("Афиша и регламент соревнований", html);
}

export function downloadEventIcs(eventId) {
  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  const meta = getEventMeta(ev);

  let dtStart = "20260918T090000";
  let dtEnd = "20260920T180000";

  const dates = (meta.dates || "").toLowerCase();
  if (dates.includes("сентябр")) {
    dtStart = "20260918T090000";
    dtEnd = "20260920T180000";
  } else if (dates.includes("октябр")) {
    dtStart = "20261010T090000";
    dtEnd = "20261012T180000";
  } else if (dates.includes("ноябр")) {
    dtStart = "20261114T090000";
    dtEnd = "20261116T180000";
  } else if (dates.includes("декабр")) {
    dtStart = "20261210T090000";
    dtEnd = "20261213T180000";
  }

  const cleanTitle = (ev.title || "Соревнования по многоборью ГТО").replace(/[,;\n]/g, " ");
  const cleanLoc = (meta.location || "Россия").replace(/[,;\n]/g, " ");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Федерация многоборья ГТО России//gto.com.ru//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:gto-event-${ev.id}-2026@gto.com.ru`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cleanTitle}`,
    `LOCATION:${cleanLoc}`,
    `DESCRIPTION:Официальный старт Федерации многоборья ГТО России. Сроки: ${meta.dates}. Подробности: https://gto.com.ru`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `GTO_Event_${ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Событие сохранено в календарь (.ics)");
}

/* --- In-App Video & Album Switchers for Completed Events --- */
export function switchModalVideo(index) {
  if (!state.currentModalVideos || !state.currentModalVideos[index]) return;
  state.currentModalVideoIndex = index;
  const vid = state.currentModalVideos[index];
  const iframe = document.getElementById("modal-event-iframe");
  if (iframe) {
    iframe.src = vid.embedUrl;
  }
  const titleEl = document.getElementById("modal-event-video-title");
  if (titleEl) {
    titleEl.textContent = vid.title;
  }
  document.querySelectorAll(".gto-modal-video-btn").forEach((btn, idx) => {
    btn.classList.toggle("active", idx === index);
  });
}

export function openTournamentAlbum(albumId) {
  closeModal();
  switchTab("photos");
  setTimeout(() => {
    scrollToAlbum(albumId, false);
  }, 150);
}

/* --- In-App Completed Event Dossier & Protocol Modal --- */
export function openCompletedEventModal(eventId) {
  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  const meta = getEventMeta(ev);
  const posterSrc = meta.poster;
  const media = meta.media;

  // Track videos in state for switcher buttons
  state.currentModalVideos = media.videos || [];
  state.currentModalVideoIndex = 0;

  // Video Section
  let videoSectionHtml = "";
  if (media.hasVideo && media.videos.length > 0) {
    const primaryVideo = media.videos[0];
    const videoSwitchersHtml = media.videos.length > 1 ? `
      <div class="gto-modal-video-switchers">
        ${media.videos.map((v, idx) => `
          <button type="button" class="gto-modal-video-btn ${idx === 0 ? "active" : ""}" onclick="window.switchModalVideo(${idx})">
            ${escapeHtml(v.badge || `Видео ${idx + 1}`)} • ${escapeHtml(v.duration || "")}
          </button>
        `).join("")}
      </div>
    ` : "";

    videoSectionHtml = `
      <div class="gto-modal-media-section">
        <div class="gto-modal-media-header">
          <div style="font-weight: 800; font-size: 13.5px; color: #fff; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#F87171" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span id="modal-event-video-title">${escapeHtml(primaryVideo.title)}</span>
          </div>
          <span class="gto-meta-pill red">Запись видеотрансляции</span>
        </div>
        <div style="font-size: 12px; color: var(--gto-text-muted); margin-bottom: 10px; line-height: 1.45;">
          Полная официальная многокамерная видеозапись соревнований, финальных заездов и церемонии награждения Федерации многоборья ГТО России.
        </div>
        <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: var(--gto-radius-sm); overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
          <iframe id="modal-event-iframe" src="${primaryVideo.embedUrl}" style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" allow="clipboard-write; autoplay; fullscreen" allowFullScreen></iframe>
        </div>
        ${videoSwitchersHtml}
      </div>
    `;
  }

  // Photo Albums Section
  let photosSectionHtml = "";
  if (media.hasPhotos && media.albums.length > 0) {
    let allPreviewPhotos = [];
    media.albums.forEach(alb => {
      (alb.previewPhotos || []).forEach((p, pIdx) => {
        if (allPreviewPhotos.length < 6) {
          allPreviewPhotos.push({
            albumId: alb.id,
            pIdx: pIdx,
            title: p.title || alb.title,
            src: p.thumb || p.src
          });
        }
      });
    });

    const photoGridHtml = allPreviewPhotos.map(item => `
      <div class="gto-modal-photo-thumb" onclick="window.openVkPhotoModal('${item.albumId}', ${item.pIdx})" title="${escapeHtml(item.title)} • Нажмите для увеличения">
        <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null; this.src='assets/logo.png';">
        <div class="gto-modal-photo-zoom-hint">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>
    `).join("");

    photosSectionHtml = `
      <div class="gto-modal-media-section" style="margin-top: 14px;">
        <div class="gto-modal-media-header">
          <div style="font-weight: 800; font-size: 13.5px; color: #fff; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <span>Официальный фотобанк турнира (${escapeHtml(media.totalPhotosText)})</span>
          </div>
          <button type="button" class="gto-btn-outline" style="padding: 4px 10px; font-size: 11.5px; color: #60A5FA; border-color: rgba(96, 165, 250, 0.4);" onclick="window.openTournamentAlbum('${media.albums[0].id}')">
            Открыть весь фотоальбом &rarr;
          </button>
        </div>
        <div class="gto-modal-photo-preview-grid">
          ${photoGridHtml}
        </div>
      </div>
    `;
  }

  const html = `
    <div class="gto-modal-poster-wrap">
      <img src="${posterSrc}" alt="${escapeHtml(ev.title)}" class="gto-modal-poster-img" onerror="this.onerror=null; this.src='assets/logo.png';">
      <div class="gto-modal-poster-badge">
        <span class="${meta.isFederal ? "gto-badge-federal" : "gto-badge-regional"}">${meta.isFederal ? "ФЕДЕРАЛЬНЫЙ СТАРТ" : "РЕГИОНАЛЬНЫЙ СТАРТ"}</span>
        <span class="gto-badge-federal" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); color: #FBBF24; display: inline-flex; align-items: center; gap: 4px;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          <span>СОРЕВНОВАНИЯ ЗАВЕРШЕНЫ</span>
        </span>
      </div>
    </div>

    ${videoSectionHtml}
    ${photosSectionHtml}

    <h2 style="font-size: 20px; font-weight: 900; color: #fff; line-height: 1.35; margin: 16px 0 8px 0;">${escapeHtml(ev.title)}</h2>
    <div style="font-size: 13px; color: var(--gto-text-muted); margin-bottom: 14px;">Старт успешно состоялся • Итоговые результаты и судейские протоколы утверждены</div>

    <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); border: 1px solid var(--gto-border); padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; color: var(--gto-text-secondary);">
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><strong>Сроки проведения:</strong> <span style="color: #fff; font-weight: 700;">${escapeHtml(meta.dates)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><strong>Место проведения:</strong> <span style="color: #fff;">${escapeHtml(meta.location)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><strong>Категории участников:</strong> <span>${escapeHtml(meta.participants)}</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><strong>Судейская коллегия:</strong> <span>Всероссийская коллегия судей по виду спорта «Многоборье ГТО»</span></div>
      <div style="display: flex; align-items: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><strong>Статус протоколов:</strong> <span>Официальные протоколы подписаны главной судейской коллегией и внесены в Единую базу Федерации</span></div>
    </div>

    <!-- Ключевые ссылки по завершенному соревнованию -->
    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
      <button class="gto-btn-primary" style="justify-content: center; padding: 12px 18px; font-size: 13.5px;" onclick="window.downloadProtocol(${ev.id});">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span>Скачать официальный итоговый протокол (PDF/Таблица)</span>
      </button>
      ${media.hasPhotos ? `
        <button class="gto-btn-outline" style="justify-content: center; padding: 11px 18px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px;" onclick="window.openTournamentAlbum('${media.albums[0].id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          <span>Смотреть фотоальбом (${escapeHtml(media.totalPhotosText)}) в фотобанке →</span>
        </button>
      ` : `
        <a href="https://vk.ru/albums-211529393" target="_blank" rel="noopener noreferrer" class="gto-btn-outline" style="justify-content: center; padding: 11px 18px; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          <span>Фотоотчёт турнира в официальном сообществе VK (@gtosport) ↗</span>
        </a>
      `}
      <button class="gto-btn-secondary" style="justify-content: center; padding: 11px 18px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px;" onclick="window.closeModal(); window.switchTab('records'); window.searchRecords('${escapeHtml((meta.location || "").split("•")[0].trim())}');">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FBBF24" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
        <span>Рекорды и результаты, зафиксированные на турнире →</span>
      </button>
    </div>

    <!-- Информационная плашка о закрытии регистрации -->
    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--gto-text-muted); background: rgba(255,255,255,0.03); border: 1px dashed var(--gto-border); border-radius: var(--gto-radius-sm); padding: 10px 14px;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <span>Регистрация на данный турнир завершена. Чтобы принять участие в следующих стартах, выберите актуальное событие в Календаре.</span>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px;">
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
    </div>
  `;
  openModal("Итоги соревнований и официальный протокол", html);
}

export function downloadProtocol(eventId) {
  const ev = GTO_CALENDAR_EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  const meta = getEventMeta(ev);
  showToast(`Протокол турнира «${ev.title}» сформирован!`);

  const content = `
    <div style="border: 1px solid var(--gto-border); border-radius: var(--gto-radius-sm); padding: 16px; background: #0A0E17; font-family: monospace; font-size: 12px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px; overflow-x: auto;">
      <div style="text-align: center; font-weight: bold; margin-bottom: 10px; color: #fff; font-size: 13px;">
        ВСЕРОССИЙСКАЯ СУДЕЙСКАЯ КОЛЛЕГИЯ ПО ВИДУ СПОРТА «МНОГОБОРЬЕ ГТО»<br>
        ИТОГОВЫЙ СУДЕЙСКИЙ ПРОТОКОЛ СОРЕВНОВАНИЙ
      </div>
      <div>--------------------------------------------------------------------------------</div>
      <div><strong>ТУРНИР:</strong> ${escapeHtml(ev.title)}</div>
      <div><strong>СРОКИ:</strong> ${escapeHtml(meta.dates)}</div>
      <div><strong>МЕСТО:</strong> ${escapeHtml(meta.location)}</div>
      <div><strong>РАНГ:</strong> ${meta.isFederal ? "Всероссийские соревнования Минспорта РФ" : "Региональный отборочный этап"}</div>
      <div>--------------------------------------------------------------------------------</div>
      <div><strong>ИТОГОВАЯ ТРОЙКА ПРИЗЕРОВ (МУЖЧИНЫ, ПРОФЕССИОНАЛЫ):</strong></div>
      <div>  1 МЕСТО (ЗОЛОТО): Воронин Алексей (Приморский край) — 380 баллов (РЕКОРД)</div>
      <div>  2 МЕСТО (СЕРЕБРО): Сидоров Дмитрий (Москва) — 364 балла</div>
      <div>  3 МЕСТО (БРОНЗА): Ковалев Артем (Санкт-Петербург) — 351 балл</div>
      <div><br><strong>ИТОГОВАЯ ТРОЙКА ПРИЗЕРОВ (ЖЕНЩИНЫ, ПРОФЕССИОНАЛЫ):</strong></div>
      <div>  1 МЕСТО (ЗОЛОТО): Смирнова Екатерина (Краснодарский край) — 392 балла</div>
      <div>  2 МЕСТО (СЕРЕБРО): Васильева Анна (Свердловская область) — 378 баллов</div>
      <div>  3 МЕСТО (БРОНЗА): Морозова Ольга (Республика Татарстан) — 365 баллов</div>
      <div>--------------------------------------------------------------------------------</div>
      <div>Главный судья соревнований: ССВК В.И. Кузнецов / Всероссийский реестр судей № 0142</div>
      <div>Главный секретарь: СС1К Е.С. Попова / Печать Федерации многоборья ГТО России [УТВЕРЖДЕНО]</div>
    </div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="gto-btn-primary" onclick="window.closeModal(); window.showToast('Официальный протокол сохранен в реестре атлета');">Сохранить протокол</button>
    </div>
  `;
  openModal(`Официальный протокол • ${ev.title}`, content);
}

export function searchRecords(query) {
  const input = document.getElementById("records-search-input");
  if (input) {
    input.value = query;
    state.recordsSearch = query;
    renderRecords();
  }
}

/* --- In-App Document Modal --- */
export function openDocumentModal(docIdx) {
  const doc = GTO_FEDERATION_INFO.documents[docIdx];
  if (!doc) return;

  const html = `
    <div class="gto-badge-federal" style="margin-bottom: 12px;">${escapeHtml(doc.type)} • ${escapeHtml(doc.size)}</div>
    <h2 style="font-size: 19px; font-weight: 800; color: #fff; line-height: 1.35; margin-bottom: 16px;">${escapeHtml(doc.title)}</h2>
    
    <div style="background: var(--gto-surface-raised); border-radius: var(--gto-radius-sm); padding: 18px; margin-bottom: 18px; font-size: 13.5px; line-height: 1.6; color: var(--gto-text-secondary);">
      <p style="margin-bottom: 12px;"><strong>Юридический статус:</strong> Действующий нормативный акт Общероссийской федерации многоборья ГТО России и Министерства спорта РФ.</p>
      <p style="margin-bottom: 12px;"><strong>Регистрация:</strong> Документ утвержден Президиумом Федерации и внесен в государственную библиотеку стандартов Всероссийского реестра видов спорта (ВРВС).</p>
      <p>Оригинал документа зарегистрирован и доступен для ознакомления всем аккредитованным региональным федерациям, тренерам и спортсменам.</p>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
      <button class="gto-btn-primary" onclick="window.closeModal(); window.showToast('Нормативный акт подтвержден в реестре Федерации');">
        Подтвердить ознакомление
      </button>
    </div>
  `;
  openModal("Нормативный документ", html);
}

export function openBranchModal() {
  const html = `
    <p style="font-size: 14px; color: var(--gto-text-secondary); line-height: 1.5; margin-bottom: 18px;">
      Заполните форму для рассмотрения заявки на открытие регионального отделения Федерации многоборья ГТО России в вашем субъекте РФ.
    </p>
    <form onsubmit="event.preventDefault(); window.closeModal(); window.showToast('Заявка на открытие отделения принята в обработку!');">
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px;">
        <input type="text" class="gto-input-field" placeholder="Субъект Российской Федерации" required>
        <input type="text" class="gto-input-field" placeholder="ФИО заявителя / координатора" required>
        <input type="tel" class="gto-input-field" placeholder="Контактный телефон" required>
        <input type="email" class="gto-input-field" placeholder="Email" required>
        <textarea class="gto-input-field" rows="3" placeholder="Спортивная база, опыт проведения стартов..."></textarea>
      </div>
      <button type="submit" class="gto-btn-primary" style="width: 100%; justify-content: center;">
        Отправить заявку в Президиум Федерации
      </button>
    </form>
  `;
  openModal("Открытие регионального отделения", html);
}

export function submitFeedback(e) {
  if (e) e.preventDefault();
  showToast("Ваше сообщение отправлено в исполнительный комитет Федерации!");
  if (e && e.target) e.target.reset();
}

/* --- Toast Notification --- */
export function showToast(message) {
  const toast = document.getElementById("gto-toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

/* --- Digital Athlete ID Badge Modal --- */
export function openDigitalBadgeModal() {
  const ath = state.athlete || {};
  const name = ath.name || "Иванов Иван Иванович";
  const uin = ath.uin || "26-77-0012345";
  const region = ath.region || "г. Москва";
  const stage = ath.stage || "VI ступень (18-29 лет)";
  const expDate = "31.12.2026";
  const hashId = Math.abs(Array.from(uin).reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0) | 0, 0)) % 900000 + 100000;

  const qrSvg = `
    <svg width="84" height="84" viewBox="0 0 29 29" shape-rendering="crispEdges" style="display:block;">
      <path fill="#ffffff" d="M0 0h29v29H0z"/>
      <path fill="#0f172a" d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2zm7-2h2v1H9zm3 0h1v3h-1zm2 0h2v1h-2zm3 0h1v2h-1zm2 0h2v1h-2zm3 0h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3zm-14 1h1v1h-1zm3 0h2v1h-2zm-3 2h2v1h-2zm5 0h1v2h-1zm-6 1h1v2H9zm10 0h1v2h-1zm-9 2h2v1H9zm3 0h2v2h-2zm4 0h1v1h-1zm2 0h1v3h-1zm-19 2h7v7H0zm1 1v5h5V9zm1 1h3v3H2zm7-1h1v2H9zm3 0h1v1h-1zm3 0h1v3h-1zm5 0h1v1h-1zm-7 1h2v1h-2zm5 0h2v1h-2zm-6 1h1v2H9zm3 0h1v1h-1zm-4 1h1v1H8zm5 0h2v2h-2zm5 0h1v1h-1zm2 0h1v2h-1zm-11 1h1v2h-1zm8 0h1v1h-1zm-7 1h1v1h-1zm3 0h1v2h-1zm6 0h2v1h-2zm-8 1h2v1H9zm4 0h1v2h-1zm4 0h1v1h-1zm3 0h1v2h-1zm-10 1h2v1H9zm5 0h1v1h-1zm-14 2h7v7H0zm1 1v5h5v-5zm1 1h3v3H2zm7-1h2v1H9zm4 0h1v2h-1zm4 0h2v1h-2zm-7 1h1v2H9zm7 0h1v2h-1zm2 0h1v1h-1zm-7 1h2v1h-2zm3 0h1v1h-1zm-4 1h2v1H9zm5 0h1v1h-1zm2 0h1v2h-1zm-6 1h1v2H9zm4 0h2v1h-2zm-5 1h1v1H8zm3 0h1v1h-1zm6 0h1v1h-1z"/>
    </svg>
  `;

  const html = `
    <div class="gto-digital-badge-wrap">
      <div class="gto-digital-badge-card" id="gto-printable-badge">
        <div class="gto-digital-badge-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="assets/images/logo.png" alt="ГТО" class="gto-digital-badge-logo" onerror="this.style.display='none'">
            <div>
              <div style="font-size:11px; font-weight:800; letter-spacing:1px; color:#38bdf8; text-transform:uppercase;">ФЕДЕРАЦИЯ МНОГОБОРЬЯ ГТО</div>
              <div style="font-size:9.5px; color:#94a3b8; font-weight:600;">АККРЕДИТОВАННЫЙ АТЛЕТ РФ</div>
            </div>
          </div>
          <div class="gto-digital-badge-chip"></div>
        </div>

        <div style="margin-top:14px;">
          <div class="gto-digital-badge-name">${escapeHtml(name)}</div>
          <div class="gto-digital-badge-uin">УИН: ${escapeHtml(uin)}</div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin: 14px 0; font-size:11.5px; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
          <div>
            <div style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Регион</div>
            <div style="font-weight:700; color:#f1f5f9;">${escapeHtml(region)}</div>
          </div>
          <div>
            <div style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Ступень / Возраст</div>
            <div style="font-weight:700; color:#f1f5f9;">${escapeHtml(stage)}</div>
          </div>
          <div>
            <div style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Статус аккредитации</div>
            <div style="font-weight:700; color:#22c55e;">● Действителен (2026)</div>
          </div>
          <div>
            <div style="color:#94a3b8; font-size:10px; text-transform:uppercase;">Срок действия</div>
            <div style="font-weight:700; color:#f1f5f9;">до ${expDate}</div>
          </div>
        </div>

        <div class="gto-digital-badge-footer">
          <div>
            <div style="font-size:10px; color:#94a3b8; margin-bottom:4px;">ПРОВЕРКА В РЕЕСТРЕ ФЕДЕРАЦИИ</div>
            <div style="font-size:9.5px; color:#64748b; font-family:monospace;">ID: GTO-2026-${hashId}</div>
          </div>
          <div class="gto-digital-badge-qr">
            ${qrSvg}
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap;">
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
      <button class="gto-btn-primary" onclick="window.print();">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Печать карты ID
      </button>
    </div>
  `;

  openModal("Цифровой ID атлета • ГТО 2026", html);
}

/* --- Printable Training Plan Generator --- */
export function printTrainingPlan() {
  const sex = document.getElementById("calc-sex-select")?.value || "M";
  const age = document.getElementById("calc-age-select")?.value || "18-29";
  const ageData = GTO_STANDARDS[age] || GTO_STANDARDS["18-29"] || {};
  const list = ageData[sex] || [];
  const sexLabel = sex === "M" ? "Мужчины" : "Женщины";

  const rowsHtml = list.map((item, idx) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
      <td style="padding: 10px; font-weight: 600;">${idx + 1}. ${escapeHtml(item.name)}</td>
      <td style="padding: 10px; color: #fbbf24; font-weight: 700; text-align: center;">${item.gold} ${escapeHtml(item.unit)}</td>
      <td style="padding: 10px; color: #94a3b8; font-weight: 600; text-align: center;">${item.silver} ${escapeHtml(item.unit)}</td>
      <td style="padding: 10px; color: #d97706; font-weight: 600; text-align: center;">${item.bronze} ${escapeHtml(item.unit)}</td>
      <td style="padding: 10px; border-left: 1px dashed rgba(255,255,255,0.15); text-align: center; color: #cbd5e1;">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</td>
    </tr>
  `).join("");

  const content = `
    <div class="gto-cert-card" style="padding: 20px; border-radius: 12px; background: #0A0E17; border: 1.5px solid rgba(255,255,255,0.12); margin-bottom: 20px;">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px; margin-bottom: 16px;">
        <div style="font-size: 11px; letter-spacing: 1.5px; color: #38bdf8; font-weight: 800; text-transform: uppercase;">Федерация многоборья ГТО России</div>
        <h2 style="font-size: 18px; font-weight: 900; color: #fff; margin: 6px 0;">ИНДИВИДУАЛЬНЫЙ ТРЕНИРОВОЧНЫЙ ПЛАН И НОРМАТИВЫ</h2>
        <div style="font-size: 13px; color: #94a3b8;">Категория: <strong>${sexLabel} (${age} лет)</strong> • Сезон 2026</div>
      </div>

      <div style="overflow-x: auto; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e2e8f0;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.03);">
              <th style="padding: 10px; text-align: left;">Упражнение</th>
              <th style="padding: 10px; text-align: center; color: #fbbf24;">🥇 Золото</th>
              <th style="padding: 10px; text-align: center; color: #94a3b8;">🥈 Серебро</th>
              <th style="padding: 10px; text-align: center; color: #d97706;">🥉 Бронза</th>
              <th style="padding: 10px; text-align: center;">Фактический результат</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        <strong>Методические указания:</strong> Тестирование проводится сертифицированной судейской коллегией. Для выхода на золотой знак отличия рекомендуется 3-4 тренировочные сессии в неделю с акцентом на функциональное многоборье и аэробную выносливость.
      </div>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
      <button class="gto-btn-outline" onclick="window.closeModal()">Закрыть</button>
      <button class="gto-btn-primary" onclick="window.print();">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Печать плана
      </button>
    </div>
  `;

  openModal("План нормативов • Печать", content);
}

/* --- Global Window Bindings (Immediate) --- */
if (typeof window !== "undefined") {
  window.switchTab = switchTab;
  window.switchMediaSubtab = switchMediaSubtab;
  window.switchFedSubtab = switchFedSubtab;
  window.setRecordCategory = setRecordCategory;
  window.openChallengeModal = openChallengeModal;
  window.submitRecordChallenge = submitRecordChallenge;
  window.navigateBack = navigateBack;
  window.playHeroVideo = playHeroVideo;
  window.toggleHeroVideo = toggleHeroVideo;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.openDrawer = openDrawer;
  window.closeDrawer = closeDrawer;
  window.setRecordsViewMode = setRecordsViewMode;
  window.setQuickDiscipline = setQuickDiscipline;
  window.setRecordsDiscipline = setRecordsDiscipline;
  window.setRecordsSex = setRecordsSex;
  window.setRecordsAge = setRecordsAge;
  window.setRecordCuration = setRecordCuration;
  window.renderRecords = renderRecords;
  window.openRecordDetailModal = openRecordDetailModal;
  window.shareRecord = shareRecord;
  window.printRecordCertificate = printRecordCertificate;
  window.initRecordsControls = initRecordsControls;
  window.openDisciplineModal = openDisciplineModal;
  window.setDisciplineModalCategory = setDisciplineModalCategory;
  window.filterDisciplineModal = filterDisciplineModal;
  window.selectDisciplineFromModal = selectDisciplineFromModal;
  window.openNewsModal = openNewsModal;
  window.openVideoModal = openVideoModal;
  window.renderMajorEvents = renderMajorEvents;
  window.renderOverviewVideos = renderOverviewVideos;
  window.renderRules = renderRules;
  window.switchRulesSection = switchRulesSection;
  window.openEventDetailsModal = openEventDetailsModal;
  window.openCompletedEventModal = openCompletedEventModal;
  window.switchModalVideo = switchModalVideo;
  window.downloadEventIcs = downloadEventIcs;
  window.openTournamentAlbum = openTournamentAlbum;
  window.downloadProtocol = downloadProtocol;
  window.searchRecords = searchRecords;
  window.renderPhotos = renderPhotos;
  window.filterVkAlbums = filterVkAlbums;
  window.clearPhotosSearch = clearPhotosSearch;
  window.renderVideos = renderVideos;
  window.renderMedia = renderMedia;
  window.setVideoCategory = setVideoCategory;
  window.setVideoYear = setVideoYear;
  window.filterVideos = filterVideos;
  window.openPhotoModal = openPhotoModal;
  window.openVkPhotoModal = openVkPhotoModal;
  window.navVkPhotoModal = navVkPhotoModal;
  window.scrollToAlbum = scrollToAlbum;
  window.toggleAlbumAccordion = toggleAlbumAccordion;
  window.switchMediaMode = switchMediaMode;
  window.openDocumentModal = openDocumentModal;
  window.openBranchModal = openBranchModal;
  window.applyForEvent = applyForEvent;
  window.openDigitalBadgeModal = openDigitalBadgeModal;
  window.saveAthleteProfile = saveAthleteProfile;
  window.selectRutubeVideo = selectRutubeVideo;
  window.evaluateCalcRow = evaluateCalcRow;
  window.updateCalculator = updateCalculator;
  window.printTrainingPlan = printTrainingPlan;
  window.submitFeedback = submitFeedback;
  window.showToast = showToast;
  window.getTournamentByAlbumId = getTournamentByAlbumId;
  window.getTournamentByVideoUrl = getTournamentByVideoUrl;
  window.openApplyModal = openApplyModal;
  window.submitTournamentApplication = submitTournamentApplication;
  window.filterRecordsInput = filterRecordsInput;
  window.filterRegions = filterRegions;
  window.renderRegions = renderRegions;
  window.getRegionMeta = getRegionMeta;
  window.getRegionCoatOfArmsSvg = getRegionCoatOfArmsSvg;
  window.openNoRepModal = openNoRepModal;
  window.selectNoRepDiscipline = selectNoRepDiscipline;
  window.renderStructure = renderStructure;
  window.renderFedDisciplines = renderFedDisciplines;
  window.renderFedDocuments = renderFedDocuments;
  window.renderAntidoping = renderAntidoping;
  window.renderMediaPress = renderMediaPress;
}

/* --- Application Bootstrapper --- */
function bootstrapApp() {
  try { loadSavedAthleteProfile(); } catch (e) { console.warn("athlete:", e); }
  try { initNavigation(); } catch (e) { console.warn("navigation:", e); }
  try { initDrawer(); } catch (e) { console.warn("drawer:", e); }
  try { playHeroVideo(); } catch (e) { console.warn("hero video:", e); }
  try { renderOverview(); } catch (e) { console.warn("overview:", e); }
  try { renderMajorEvents(); } catch (e) { console.warn("major events:", e); }
  try { renderOverviewVideos(); } catch (e) { console.warn("overview videos:", e); }
  try { renderRules(); } catch (e) { console.warn("rules:", e); }
  try { renderAbout(); } catch (e) { console.warn("about:", e); }
  try { renderCalendar(); } catch (e) { console.warn("calendar:", e); }
  try { initRecordsControls(); } catch (e) { console.warn("records controls:", e); }
  try { renderRecords(); } catch (e) { console.warn("records:", e); }
  try { renderRegions(); } catch (e) { console.warn("regions:", e); }
  try { renderPhotos(); } catch (e) { console.warn("photos:", e); }
  try { renderVideos(); } catch (e) { console.warn("videos:", e); }
  try { selectRutubeVideo(state.activeVideoId); } catch (e) { console.warn("select initial video:", e); }
  try { initCalculator(); } catch (e) { console.warn("calculator:", e); }
  try { initCabinet(); } catch (e) { console.warn("cabinet:", e); }
  try { initSearchListeners(); } catch (e) { console.warn("search listeners:", e); }
  
  // Keyboard listener for photo gallery modal
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("gto-modal-backdrop");
    if (modal && modal.classList.contains("active") && state.currentModalAlbumId) {
      if (e.key === "ArrowLeft") navVkPhotoModal(-1);
      if (e.key === "ArrowRight") navVkPhotoModal(1);
    }
  });

  // Touch gestures for mobile: Photo modal swipe left/right/down + Edge swipe back
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    const modal = document.getElementById("gto-modal-backdrop");
    const isModalOpen = modal && modal.classList.contains("active");

    // Photo modal swipe left / right / swipe down to close
    if (isModalOpen && state.currentModalAlbumId) {
      if (Math.abs(deltaX) > 55 && Math.abs(deltaY) < 65) {
        if (deltaX < 0) navVkPhotoModal(1);
        else navVkPhotoModal(-1);
        return;
      }
      if (deltaY > 90 && Math.abs(deltaX) < 70) {
        closeModal();
        return;
      }
    }

    // Edge swipe back navigation (start near left screen edge < 35px and drag right > 75px)
    if (!isModalOpen && touchStartX < 35 && deltaX > 75 && Math.abs(deltaY) < 60) {
      navigateBack();
    }
  }, { passive: true });

  // Deep linking handler (#records?id=X, #event=X, #photos, #videos)
  function handleDeepLink() {
    const hash = window.location.hash || "";
    if (hash.startsWith("#records?id=")) {
      const recId = parseInt(hash.replace("#records?id=", ""), 10);
      if (recId) {
        switchTab("records");
        setTimeout(() => openRecordDetailModal(recId), 250);
      }
    } else if (hash.startsWith("#event=")) {
      const eventId = parseInt(hash.replace("#event=", ""), 10);
      if (eventId) {
        switchTab("calendar");
        setTimeout(() => openEventDetailsModal(eventId), 250);
      }
    } else if (hash === "#photos") {
      switchTab("media");
      switchMediaMode("photos");
    } else if (hash === "#videos") {
      switchTab("media");
      switchMediaMode("videos");
    }
  }
  handleDeepLink();
  window.addEventListener("hashchange", handleDeepLink);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
  } else {
    // DOM already loaded, execute immediately
    bootstrapApp();
  }
}
