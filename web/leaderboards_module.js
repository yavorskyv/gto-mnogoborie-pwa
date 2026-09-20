/**
 * Official Live Leaderboards, Tournament Detail Hub & VAR Judicial System
 * Powered by Google Studio Assets and Database Dumps
 */

import { GTO_STUDIO_ASSETS, GTO_LIVE_TOURNAMENTS } from "./gto_live_dumps_data.js";

// Local state for leaderboards
export const lbState = {
  activeTournamentId: 101, // default: Sirius Grand Final
  category: "all",
  complex: "overall",
  search: "",
  tournamentDetailSubtab: "complexes"
};
if (typeof window !== "undefined") {
  window.lbState = lbState;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToastMsg(msg) {
  if (typeof window.showToast === "function") {
    window.showToast(msg);
  } else {
    alert(msg);
  }
}

export function renderLeaderboards() {
  const tList = GTO_LIVE_TOURNAMENTS || [];
  if (!tList.length) return;

  let activeTourn = tList.find(t => t.id === lbState.activeTournamentId) || tList[0];
  lbState.activeTournamentId = activeTourn.id;

  // 1. Render Hero Showcase
  const heroEl = document.getElementById("leaderboards-hero-showcase");
  if (heroEl) {
    const heroBg = activeTourn.heroImage || activeTourn.poster || activeTourn.img || GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;
    heroEl.innerHTML = `
      <img src="${heroBg}" alt="${escapeHtml(activeTourn.name)}" class="gto-leaderboard-hero-bg" onerror="this.onerror=null;this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
      <div class="gto-leaderboard-hero-content">
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
          <div class="gto-badge-federal">${escapeHtml(activeTourn.statusText || "Официальный протокол")}</div>
          <div class="gto-badge-gold">Призовой фонд: ${escapeHtml(activeTourn.prizePool || "1 000 000 ₽")}</div>
          <div class="gto-badge-federal" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            VAR Видеоповторы
          </div>
        </div>
        <h2 style="font-size: clamp(22px, 2.6vw, 36px); font-weight: 900; color: #FFFFFF; line-height: 1.15; margin-bottom: 10px; max-width: 900px;">
          ${escapeHtml(activeTourn.name)}
        </h2>
        <div style="display: flex; gap: 16px; align-items: center; color: var(--gto-text-secondary); font-size: 13.5px; margin-bottom: 18px; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${escapeHtml(activeTourn.date)}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${escapeHtml(activeTourn.location)} (${escapeHtml(activeTourn.venue)})
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            ${escapeHtml(activeTourn.quota)}
          </span>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="gto-btn-primary" onclick="window.openTournamentDetail(${activeTourn.id})">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <span>Турнирный хаб &amp; Программа заходов</span>
          </button>
          <button class="gto-btn-outline" onclick="window.openProtestModal(${activeTourn.id})">
            <span>Подать протест в Главную судейскую коллегию</span>
          </button>
        </div>
      </div>
    `;
  }

  // 2. Render Tournament Selector Carousel
  const selectorEl = document.getElementById("leaderboards-tournament-selector");
  if (selectorEl) {
    selectorEl.innerHTML = tList.map(t => {
      const isActive = t.id === activeTourn.id;
      const tImg = t.heroImage || t.poster || t.img || GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;
      return `
        <div class="gto-tournament-card ${isActive ? "active" : ""}" onclick="window.selectLeaderboardTournament(${t.id})" style="cursor: pointer;">
          <div style="position: relative; height: 90px; margin: -14px -14px 10px; overflow: hidden; border-radius: 14px 14px 0 0; background: #070a10;">
            <img src="${tImg}" alt="${escapeHtml(t.name)}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85;" onerror="this.onerror=null;this.src='https://gto.com.ru/extore/frontend/themes/gto/img/events.jpg'">
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,19,28,0.9) 100%);"></div>
            <span class="gto-badge-federal" style="position: absolute; top: 6px; left: 6px; font-size: 9px; padding: 2px 6px;">${t.isLive ? "LIVE" : "ЕКП 2026"}</span>
            <span class="gto-badge-gold" style="position: absolute; top: 6px; right: 6px; font-size: 9px; padding: 2px 6px;">${escapeHtml(t.prizePool)}</span>
          </div>
          <div class="gto-tournament-card-title">${escapeHtml(t.name)}</div>
          <div class="gto-tournament-card-meta">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg>
            <span>${escapeHtml(t.venue || t.location)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11.5px; color: var(--gto-text-secondary);">
            <span>${escapeHtml(t.date)}</span>
            <span style="color: #60a5fa; font-weight: 700;">${t.teams ? t.teams.length : 0} атлетов</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // 3. Render Category Pills
  const catContainer = document.getElementById("leaderboard-category-pills");
  if (catContainer) {
    const cats = [{ id: "all", name: "Все дивизионы (" + (activeTourn.teams ? activeTourn.teams.length : 0) + ")" }, ...(activeTourn.categories || [])];
    catContainer.innerHTML = cats.map(c => {
      const isAct = String(lbState.category) === String(c.id);
      return `
        <button class="gto-complex-pill ${isAct ? "active" : ""}" onclick="window.selectLeaderboardCategory('${c.id}')">
          ${escapeHtml(c.name)}
        </button>
      `;
    }).join("");
  }

  // 4. Render Complex Selector Tabs
  const compContainer = document.getElementById("leaderboard-complex-tabs");
  if (compContainer) {
    const complexes = activeTourn.complexes || [];
    let compTabs = [
      { key: "overall", label: "Общий зачёт (Сумма баллов)" }
    ];
    complexes.forEach((c, idx) => {
      compTabs.push({
        key: "k" + (idx + 1),
        label: (c.name || ("КФУ №" + (idx + 1))) + (c.score1TimeCap ? " [Cap: " + c.score1TimeCap + "]" : "")
      });
    });

    compContainer.innerHTML = compTabs.map(tab => {
      const isAct = lbState.complex === tab.key;
      return `
        <button class="gto-complex-pill ${isAct ? "active" : ""}" onclick="window.selectLeaderboardComplex('${tab.key}')">
          ${escapeHtml(tab.label)}
        </button>
      `;
    }).join("");
  }

  // 5. Render Leaderboard Rows
  renderLeaderboardRows(activeTourn);
}

export function selectLeaderboardTournament(id) {
  lbState.activeTournamentId = id;
  lbState.category = "all";
  lbState.complex = "overall";
  lbState.search = "";
  const input = document.getElementById("leaderboard-search-input");
  if (input) input.value = "";
  renderLeaderboards();
}

export function selectLeaderboardCategory(catId) {
  lbState.category = catId;
  const activeTourn = (GTO_LIVE_TOURNAMENTS || []).find(t => t.id === lbState.activeTournamentId);
  if (activeTourn) renderLeaderboardRows(activeTourn);
  document.querySelectorAll("#leaderboard-category-pills .gto-complex-pill").forEach(p => {
    p.classList.remove("active");
  });
  if (event && event.target) event.target.classList.add("active");
}

export function selectLeaderboardComplex(kKey) {
  lbState.complex = kKey;
  const activeTourn = (GTO_LIVE_TOURNAMENTS || []).find(t => t.id === lbState.activeTournamentId);
  if (activeTourn) renderLeaderboardRows(activeTourn);
  document.querySelectorAll("#leaderboard-complex-tabs .gto-complex-pill").forEach(p => {
    p.classList.remove("active");
  });
  if (event && event.target) event.target.classList.add("active");
}

export function handleLeaderboardSearch(query) {
  lbState.search = (query || "").trim().toLowerCase();
  const activeTourn = (GTO_LIVE_TOURNAMENTS || []).find(t => t.id === lbState.activeTournamentId);
  if (activeTourn) renderLeaderboardRows(activeTourn);
}

function renderLeaderboardRows(tourn) {
  const container = document.getElementById("leaderboards-grid");
  if (!container) return;

  let teams = (tourn.teams || []).slice();

  // Filter category
  if (lbState.category && lbState.category !== "all") {
    teams = teams.filter(t => String(t.categoryId) === String(lbState.category) || String(t.categoryName) === String(lbState.category));
  }

  // Filter search
  if (lbState.search) {
    const q = lbState.search;
    teams = teams.filter(t => 
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.bib && t.bib.toLowerCase().includes(q)) ||
      (t.region && t.region.toLowerCase().includes(q))
    );
  }

  const badgeEl = document.getElementById("leaderboard-count-badge");
  if (badgeEl) badgeEl.textContent = teams.length + " атлетов";

  if (!teams.length) {
    container.innerHTML = `
      <div class="gto-empty-state" style="padding: 48px; text-align: center; background: #111a2a; border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
        <svg viewBox="0 0 24 24" width="42" height="42" stroke="#64748b" fill="none" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <h4 style="font-size: 16px; color: #fff; margin-bottom: 6px;">Атлеты не найдены</h4>
        <p style="font-size: 13px; color: #94a3b8;">Попробуйте изменить категорию или поисковый запрос.</p>
      </div>
    `;
    return;
  }

  const isOverall = lbState.complex === "overall";
  const complexKey = lbState.complex;

  const rowsHtml = teams.map(team => {
    let rankBadgeClass = "rank-default";
    if (team.rank === 1) rankBadgeClass = "rank-1";
    else if (team.rank === 2) rankBadgeClass = "rank-2";
    else if (team.rank === 3) rankBadgeClass = "rank-3";

    let scoreColHtml = "";
    if (isOverall) {
      scoreColHtml = `
        <span style="font-size: 16px; font-weight: 900; color: #ffb300;">${team.totalPoints} б.</span>
        <span style="font-size: 11px; color: var(--gto-text-secondary); margin-left: 6px;">(${team.diff})</span>
      `;
    } else {
      const cScore = (team.complexScores && team.complexScores[complexKey]) || { val: "—", points: 0 };
      scoreColHtml = `
        <span style="font-size: 15px; font-weight: 800; color: #60a5fa;">${cScore.val}</span>
        <span style="font-size: 11px; color: #ffb300; margin-left: 6px;">(${cScore.points} б.)</span>
      `;
    }

    return `
      <tr>
        <td style="width: 50px; text-align: center;">
          <span class="gto-rank-badge ${rankBadgeClass}">${team.rank}</span>
        </td>
        <td style="width: 70px;">
          <span class="gto-badge-federal" style="font-size: 11px; padding: 2px 7px;">${escapeHtml(team.bib)}</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="gto-athlete-avatar-wrap">
              <img src="${team.avatarUrl || GTO_STUDIO_ASSETS.ATHLETE_SAVELYEV_URL}" alt="${escapeHtml(team.name)}" loading="lazy">
            </div>
            <div>
              <div style="font-size: 14.5px; font-weight: 800; color: #FFFFFF; cursor: pointer;" onclick="window.openAthleteCard(${tourn.id}, ${team.id})">
                ${escapeHtml(team.name)}
              </div>
              <div style="font-size: 11.5px; color: var(--gto-text-secondary); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path></svg>
                <span>${escapeHtml(team.region || "Россия")}</span>
              </div>
            </div>
          </div>
        </td>
        <td style="font-size: 12.5px; color: #94a3b8;">
          ${escapeHtml(team.categoryName)}
        </td>
        <td>
          ${scoreColHtml}
        </td>
        <td>
          <span class="gto-var-badge ${team.varBadge || "valid"}" title="${escapeHtml(team.varDesc || "")}">
            ${escapeHtml(team.varStatus || "Засчитано")}
          </span>
        </td>
        <td style="text-align: right; width: 140px;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="gto-btn-outline" style="padding: 5px 9px; font-size: 11.5px; min-height: auto;" onclick="window.openAthleteCard(${tourn.id}, ${team.id})" title="Карточка зачетов">
              Инфо
            </button>
            <button class="gto-btn-outline" style="padding: 5px 9px; font-size: 11.5px; min-height: auto; border-color: rgba(239,68,68,0.3); color: #f87171;" onclick="window.openProtestModal(${tourn.id}, ${team.id})" title="Подать протест">
              VAR
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="gto-leaderboard-table-wrap">
      <table class="gto-leaderboard-table">
        <thead>
          <tr>
            <th style="text-align: center;">Место</th>
            <th>Bib</th>
            <th>Атлет / Команда</th>
            <th>Категория</th>
            <th>${isOverall ? "Итоговые баллы" : "Результат раунда"}</th>
            <th>Судейство &amp; VAR</th>
            <th style="text-align: right;">Действия</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/* --- Модальное окно турнира (Tournament Detail Hub) --- */
export function openTournamentDetail(tournamentId) {
  const t = (GTO_LIVE_TOURNAMENTS || []).find(x => x.id === tournamentId) || GTO_LIVE_TOURNAMENTS[0];
  if (!t) return;

  const modal = document.getElementById("tournament-detail-modal");
  const content = document.getElementById("tournament-detail-content");
  if (!modal || !content) return;

  const heroBg = t.heroImage || GTO_STUDIO_ASSETS.SOCHI_ARENA_URL;

  content.innerHTML = `
    <div style="position: relative; padding: 40px 32px 28px; background: linear-gradient(180deg, rgba(10,17,40,0.6) 0%, #0d1627 100%), url('${heroBg}') center/cover no-repeat; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <button class="gto-modal-close" style="position: absolute; top: 16px; right: 16px; z-index: 10;" onclick="window.closeTournamentDetail()">&times;</button>
      <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
        <span class="gto-badge-federal">${escapeHtml(t.statusText || "Официальный старт")}</span>
        <span class="gto-badge-gold">Призовой фонд: ${escapeHtml(t.prizePool)}</span>
        <span class="gto-badge-federal">Квота: ${escapeHtml(t.quota)}</span>
      </div>
      <h2 style="font-size: clamp(20px, 2.4vw, 32px); font-weight: 900; color: #FFFFFF; line-height: 1.2; margin-bottom: 10px;">
        ${escapeHtml(t.name)}
      </h2>
      <p style="font-size: 14px; color: #cbd5e1; max-width: 750px; line-height: 1.5; margin-bottom: 16px;">
        ${escapeHtml(t.description)}
      </p>
      <div style="display: flex; gap: 14px; color: var(--gto-text-secondary); font-size: 13px; flex-wrap: wrap;">
        <span>📅 <strong>Даты:</strong> ${escapeHtml(t.date)}</span>
        <span>📍 <strong>Арена:</strong> ${escapeHtml(t.venue || t.location)}</span>
      </div>
    </div>

    <!-- Вкладки модального окна -->
    <div style="display: flex; gap: 8px; padding: 14px 24px; background: #0b1322; border-bottom: 1px solid rgba(255,255,255,0.06); overflow-x: auto;">
      <button class="gto-complex-pill active" id="modal-tab-btn-complexes" onclick="window.switchModalSubtab('complexes')">Программа комплексов КФУ</button>
      <button class="gto-complex-pill" id="modal-tab-btn-judges" onclick="window.switchModalSubtab('judges')">Судейская коллегия и VAR</button>
      <button class="gto-complex-pill" id="modal-tab-btn-regs" onclick="window.switchModalSubtab('regs')">Регламент и Положение</button>
    </div>

    <!-- Содержимое вкладок -->
    <div id="tournament-modal-body" style="padding: 24px; max-height: 55vh; overflow-y: auto;">
      ${renderTournamentModalComplexes(t)}
    </div>
  `;

  modal.classList.add("active");
}

export function closeTournamentDetail() {
  const modal = document.getElementById("tournament-detail-modal");
  if (modal) modal.classList.remove("active");
}

export function switchModalSubtab(subtab) {
  const t = (GTO_LIVE_TOURNAMENTS || []).find(x => x.id === lbState.activeTournamentId) || GTO_LIVE_TOURNAMENTS[0];
  const body = document.getElementById("tournament-modal-body");
  if (!body || !t) return;

  document.querySelectorAll("#tournament-detail-content .gto-complex-pill").forEach(b => b.classList.remove("active"));
  const actBtn = document.getElementById(`modal-tab-btn-${subtab}`);
  if (actBtn) actBtn.classList.add("active");

  if (subtab === "complexes") {
    body.innerHTML = renderTournamentModalComplexes(t);
  } else if (subtab === "judges") {
    body.innerHTML = renderTournamentModalJudges(t);
  } else if (subtab === "regs") {
    body.innerHTML = renderTournamentModalRegs(t);
  }
}

function renderTournamentModalComplexes(t) {
  const comps = t.complexes || [];
  if (!comps.length) return "<p style=\"color: #94a3b8;\">Комплексы уточняются судейской коллегией.</p>";

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${comps.map((c, i) => `
        <div style="background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="gto-badge-gold" style="font-size: 11px;">КФУ №${i + 1}</span>
              <h4 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin: 0;">${escapeHtml(c.name)}</h4>
            </div>
            <div style="display: flex; gap: 6px;">
              ${c.score1TimeCap ? `<span class="gto-badge-federal" style="font-size: 11px;">Тайм-кап: ${c.score1TimeCap}</span>` : ""}
              <span class="gto-badge-federal" style="font-size: 11px;">${c.lanes || 4} дорожки</span>
            </div>
          </div>
          <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 12px; white-space: pre-line;">
            ${escapeHtml(c.description || "Зачет по правилам многоборья ГТО")}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: var(--gto-text-secondary);">
            <span>Локация: ${escapeHtml(c.venue || "Главный помост")}</span>
            <span style="color: #60a5fa;">Критерий: ${escapeHtml(c.score1Name || "Время / Повторения")}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTournamentModalJudges(t) {
  const judges = t.judges || [];
  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div class="gto-badge-federal" style="align-self: flex-start; margin-bottom: 6px;">ВСЕРОССИЙСКАЯ КОЛЛЕГИЯ СУДЕЙ (ВКС)</div>
      ${judges.map(j => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: #111a2a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px;">
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #FFFFFF;">${escapeHtml(j.name)}</div>
            <div style="font-size: 12.5px; color: #ffb300; margin-top: 2px;">${escapeHtml(j.role)}</div>
          </div>
          <span class="gto-badge-federal" style="font-size: 11px;">${escapeHtml(j.rank)}</span>
        </div>
      `).join("")}
      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 14px; margin-top: 8px;">
        <h5 style="font-size: 13.5px; font-weight: 800; color: #38bdf8; margin: 0 0 4px;">Видеоконтроль VAR</h5>
        <p style="font-size: 12.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
          На помостах установлены высокоскоростные камеры с частотой 120 FPS. Любое спорное решение судьи на помосте рассматривается старшим VAR-комиссаром в течение 3 минут.
        </p>
      </div>
    </div>
  `;
}

function renderTournamentModalRegs(t) {
  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <h4 style="font-size: 15px; font-weight: 800; color: #fff;">Официальные нормативные требования</h4>
      <ul style="font-size: 13px; color: #cbd5e1; line-height: 1.8; margin-left: 20px;">
        <li>Наличие действующего полиса страхования жизни и здоровья от несчастных случаев при занятиях спортом.</li>
        <li>Оригинал медицинского допуска (справка по форме № 1144-н).</li>
        <li>Подтвержденный УИН в системе ВФСК ГТО.</li>
        <li>Согласие на обработку персональных данных и антидопинговую декларацию.</li>
      </ul>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button class="gto-btn-primary" onclick="if(window.downloadDocMock) window.downloadDocMock('Положение_${encodeURIComponent(t.slug || "turnir")}.pdf')">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Скачать Положение о турнире (PDF)</span>
        </button>
      </div>
    </div>
  `;
}

/* --- Модальное окно карточки атлета --- */
export function openAthleteCard(tournamentId, teamId) {
  const t = (GTO_LIVE_TOURNAMENTS || []).find(x => x.id === tournamentId) || GTO_LIVE_TOURNAMENTS[0];
  if (!t) return;
  const athlete = (t.teams || []).find(x => x.id === teamId);
  if (!athlete) return;

  const modal = document.getElementById("athlete-card-modal");
  const content = document.getElementById("athlete-modal-content");
  if (!modal || !content) return;

  const cScores = athlete.complexScores || {};

  content.innerHTML = `
    <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08);">
      <div class="gto-athlete-avatar-wrap" style="width: 64px; height: 64px;">
        <img src="${athlete.avatarUrl || GTO_STUDIO_ASSETS.ATHLETE_SAVELYEV_URL}" alt="${escapeHtml(athlete.name)}">
      </div>
      <div>
        <div style="display: flex; gap: 6px; margin-bottom: 4px;">
          <span class="gto-badge-gold">Место №${athlete.rank}</span>
          <span class="gto-badge-federal">${escapeHtml(athlete.bib)}</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin: 0 0 4px;">${escapeHtml(athlete.name)}</h3>
        <div style="font-size: 12.5px; color: var(--gto-text-secondary);">${escapeHtml(athlete.region)} • ${escapeHtml(athlete.categoryName)}</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div style="background: #111a2a; border-radius: 12px; padding: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; text-transform: uppercase; color: #8da7cb; font-weight: 700;">Сумма баллов</div>
        <div style="font-size: 26px; font-weight: 900; color: #ffb300; margin-top: 4px;">${athlete.totalPoints}</div>
      </div>
      <div style="background: #111a2a; border-radius: 12px; padding: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.06);">
        <div style="font-size: 11px; text-transform: uppercase; color: #8da7cb; font-weight: 700;">Отрыв от лидера</div>
        <div style="font-size: 26px; font-weight: 900; color: #60a5fa; margin-top: 4px;">${athlete.diff}</div>
      </div>
    </div>

    <h4 style="font-size: 14px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px;">Результаты по комплексам:</h4>
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      ${Object.keys(cScores).map((k, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 14px;">
          <span style="font-size: 13px; font-weight: 700; color: #cbd5e1;">КФУ №${i + 1}</span>
          <div>
            <span style="font-size: 14px; font-weight: 800; color: #60a5fa;">${cScores[k].val}</span>
            <span style="font-size: 12px; color: #ffb300; margin-left: 8px;">${cScores[k].points} б.</span>
          </div>
        </div>
      `).join("")}
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #34d399;">Статус судейства</div>
        <div style="font-size: 13px; color: #fff; margin-top: 2px;">${escapeHtml(athlete.varStatus)}</div>
      </div>
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="#34d399" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="gto-btn-primary" onclick="if(window.downloadDocMock) window.downloadDocMock('Сертификат_${encodeURIComponent(athlete.name)}.pdf')">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>Диплом атлета с QR</span>
      </button>
    </div>
  `;

  modal.classList.add("active");
}

export function closeAthleteModal() {
  const modal = document.getElementById("athlete-card-modal");
  if (modal) modal.classList.remove("active");
}

/* --- Протест в ВКС --- */
export function openProtestModal(tournamentId, teamId) {
  const modal = document.getElementById("protest-modal");
  if (!modal) return;

  const select = document.getElementById("protest-tournament-select");
  if (select) {
    select.innerHTML = (GTO_LIVE_TOURNAMENTS || []).map(t => `
      <option value="${t.id}" ${t.id === (tournamentId || lbState.activeTournamentId) ? "selected" : ""}>${escapeHtml(t.name)}</option>
    `).join("");
  }

  const athleteInput = document.getElementById("protest-athlete-input");
  if (athleteInput && teamId) {
    const t = (GTO_LIVE_TOURNAMENTS || []).find(x => x.id === (tournamentId || lbState.activeTournamentId));
    if (t) {
      const a = (t.teams || []).find(x => x.id === teamId);
      if (a) athleteInput.value = a.bib + " " + a.name;
    }
  }

  modal.classList.add("active");
}

export function closeProtestModal() {
  const modal = document.getElementById("protest-modal");
  if (modal) modal.classList.remove("active");
}

export function submitOfficialProtest(event) {
  if (event && event.preventDefault) event.preventDefault();

  const num = "ВКС-2026-ПР-" + Math.floor(100 + Math.random() * 900);
  showToastMsg("Протест зарегистрирован (" + num + "). Комиссия VAR пересмотрит видеозапись в течение 15 минут.");
  closeProtestModal();
}

/* --- Экспорт протокола соревнований --- */
export function exportOfficialProtocol() {
  const t = (GTO_LIVE_TOURNAMENTS || []).find(x => x.id === lbState.activeTournamentId) || GTO_LIVE_TOURNAMENTS[0];
  if (!t) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToastMsg("Разрешите всплывающие окна для печати официального протокола");
    return;
  }

  const teams = t.teams || [];
  const rows = teams.map(tm => `
    <tr>
      <td style="text-align: center; font-weight: bold;">${tm.rank}</td>
      <td style="text-align: center;">${tm.bib}</td>
      <td>${escapeHtml(tm.name)}</td>
      <td>${escapeHtml(tm.region)}</td>
      <td>${escapeHtml(tm.categoryName)}</td>
      <td style="text-align: center; font-weight: bold;">${tm.totalPoints}</td>
      <td style="text-align: center;">${escapeHtml(tm.varStatus)}</td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <title>Официальный протокол соревнований • Многоборье ГТО</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; }
        th { background: #eee; text-align: left; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #666; margin-bottom: 4px;">Министерство спорта Российской Федерации • ВРВС № 1810001411Я</div>
        <div class="title">${escapeHtml(t.name)}</div>
        <div class="sub">ОФИЦИАЛЬНЫЙ СУДЕЙСКИЙ ИТОГОВЫЙ ПРОТОКОЛ</div>
        <div class="sub">Место проведения: ${escapeHtml(t.location)} (${escapeHtml(t.venue)}) • Даты: ${escapeHtml(t.date)}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">Место</th>
            <th style="width: 60px; text-align: center;">Нагрудный №</th>
            <th>Ф.И.О. атлета / Состав команды</th>
            <th>Субъект РФ</th>
            <th>Дивизион</th>
            <th style="width: 60px; text-align: center;">Баллы</th>
            <th style="width: 140px; text-align: center;">Статус судейства</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        <div>
          <div><strong>Главный судья соревнований:</strong></div>
          <div style="margin-top: 24px; border-top: 1px solid #000; width: 220px; text-align: center;">Филатов П.А. (СВК)</div>
        </div>
        <div>
          <div><strong>Главный секретарь:</strong></div>
          <div style="margin-top: 24px; border-top: 1px solid #000; width: 220px; text-align: center;">Смирнова Е.С. (1К)</div>
        </div>
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Bind to window for HTML click handlers
if (typeof window !== "undefined") {
  window.renderLeaderboards = renderLeaderboards;
  window.selectLeaderboardTournament = selectLeaderboardTournament;
  window.selectLeaderboardCategory = selectLeaderboardCategory;
  window.selectLeaderboardComplex = selectLeaderboardComplex;
  window.handleLeaderboardSearch = handleLeaderboardSearch;
  window.openTournamentDetail = openTournamentDetail;
  window.closeTournamentDetail = closeTournamentDetail;
  window.switchModalSubtab = switchModalSubtab;
  window.openAthleteCard = openAthleteCard;
  window.closeAthleteModal = closeAthleteModal;
  window.openProtestModal = openProtestModal;
  window.closeProtestModal = closeProtestModal;
  window.submitOfficialProtest = submitOfficialProtest;
  window.exportOfficialProtocol = exportOfficialProtocol;
}
