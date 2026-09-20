/**
 * МОДУЛЬ «ГЕРОЙ ГТО» — личный кабинет атлета и соревновательные инструменты
 * Федерация многоборья ГТО России · 2026
 *
 * Принцип: честная работа без выдуманных данных и фейковых статусов.
 * Данные вводит сам пользователь и хранит локально на устройстве (localStorage).
 * Реально работающие нативные инструменты:
 *  - Личная карточка атлета с реальным сканируемым QR-кодом.
 *  - QR-сканер (камера + jsQR) с режимом атлета и судейским протоколом площадки.
 *  - Видеофиксатор тренировки (переключение камер, 3-2-1 отсчёт, стандарты техники,
 *    наложение титров/водяного знака на видео через Canvas captureStream).
 *  - Соревновательный бенчмаркинг с 321 рекордом России и нормативами ГТО.
 *  - Генератор Stories 1080×1350 под VK/Telegram и печать персонального диплома.
 */

import { GTO_RECORDS, GTO_STANDARDS as GTO_NORMS } from './gto_data.js';
import { GTO_STANDARDS as GTO_TECHNIQUES } from './standards_data.js';
import { GtoCameraRecorder, CameraState, TimerState } from './camera_timer.js?v=124';
import { saveHeroVideo, updateHeroVideoStatus, getAllHeroVideos, getHeroVideo, saveJudgeResult, deleteHeroVideo } from './indexeddb_storage.js?v=116';
import { GTO_LIVE_TOURNAMENTS } from './gto_live_dumps_data.js';
import { getUnifiedRecords, syncEcosystemState } from './ecosystem_sync.js?v=128';
import { resolveAthleteIdentity, registerOrLinkProfile, fetchMasterAthlete } from './master_api.js?v=128';

// ---------- Настоящий QR-код (qrcode-generator) ----------
function realQrSvg(text, size = 200) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), cell = size / n;
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#0f172a"/>`;
        }
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border-radius:12px;padding:8px;box-sizing:border-box">${rects}</svg>`;
  } catch (e) {
    return `<div style="padding:24px;color:#94a3b8;font-size:13px;text-align:center">QR недоступен.</div>`;
  }
}

function drawQrOnCanvas(ctx, text, x, y, size) {
  try {
    if (!window.qrcode) return;
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount(), cell = size / n;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 8, y - 8, size + 16, size + 16);
    ctx.fillStyle = '#0f172a';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(x + c * cell, y + r * cell, cell + 0.3, cell + 0.3);
        }
      }
    }
  } catch (err) {
    console.warn('QR canvas render error:', err);
  }
}

const HERO_STAGES = [
  [6,7,'I'],[8,9,'II'],[10,11,'III'],[12,13,'IV'],[14,15,'V'],[16,17,'VI'],
  [18,19,'VII'],[20,24,'VIII'],[25,29,'IX'],[30,34,'X'],[35,39,'XI'],
  [40,44,'XII'],[45,49,'XIII'],[50,54,'XIV'],[55,59,'XV'],[60,64,'XVI'],
  [65,69,'XVII'],[70,200,'XVIII']
];
function ageToStage(age) {
  for (const [a, b, s] of HERO_STAGES) if (age >= a && age <= b) return s;
  return '—';
}
const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const HERO_STORE = 'hero_profiles_v1';
const JUDGE_STORE = 'hero_judge_protocol_v1';

function loadStore() {
  try {
    const d = JSON.parse(localStorage.getItem(HERO_STORE));
    if (d && Array.isArray(d.profiles)) return d;
  } catch (_) {}
  return { profiles: [], active: 0 };
}
function saveStore(s) {
  try {
    localStorage.setItem(HERO_STORE, JSON.stringify(s));
    syncEcosystemState();
  } catch (_) {}
}

let store = loadStore();
let activeHeroTab = 'card';
let editingProfile = false;

// Единый Recorder Engine (ТЗ v97 + v107 Ergonomic UX)
let heroCameraRecorder = null;
let pendingSet = null;
let heroCurrentOrientation = 'portrait'; // 'portrait' (9:16) | 'landscape' (16:9)
let heroLiveHudTimerId = null;

function getHeroCameraRecorder() {
  const videoEl = document.getElementById('hero-cam-raw-video');
  const canvasEl = document.getElementById('hero-cam-live-canvas');
  if (!heroCameraRecorder) {
    heroCameraRecorder = new GtoCameraRecorder({
      videoEl,
      canvasEl,
      targetOrientation: heroCurrentOrientation,
      onStateChange: (cState) => {
        updateHeroRecorderControls(cState);
      }
    });
    heroCameraRecorder.setTimerConfig({
      orientation: heroCurrentOrientation,
      mode: 'stopwatch',
      timerAutoStart: true,
      preStartSeconds: 3,
      repsMode: true
    });
    heroCameraRecorder.targetOrientation = heroCurrentOrientation;
  } else {
    if (videoEl) heroCameraRecorder.videoEl = videoEl;
    if (canvasEl) heroCameraRecorder.canvasEl = canvasEl;
    heroCameraRecorder.targetOrientation = heroCurrentOrientation;
  }
  window.heroCameraRecorder = heroCameraRecorder;
  return heroCameraRecorder;
}
window.getHeroCameraRecorder = getHeroCameraRecorder;

let activeDraftTargetExId = null;

function updateHeroRecorderControls(cState) {
  const preCard = document.getElementById('hero-pre-camera-card');
  const recorderWrap = document.getElementById('hero-camera-recorder-wrap');
  const enableBtn = document.getElementById('hero-camera-enable-btn');
  const errorBanner = document.getElementById('hero-camera-error-banner');
  const startBtn = document.getElementById('btn-hero-start-rec');
  const deckPre = document.getElementById('hero-deck-pre');
  const deckActive = document.getElementById('hero-deck-active');
  const repBadge = document.getElementById('hero-active-rep-count');
  const noRepBadge = document.getElementById('hero-active-norep-count');
  const countdownOverlay = document.getElementById('hero-countdown-overlay');
  const bigCountdown = document.getElementById('hero-cam-big-countdown');
  const statusPill = document.getElementById('hero-cam-status-pill');
  const timerVal = document.getElementById('hero-hud-timer-val');
  const hudTimer = timerVal;
  const athleteTitle = document.getElementById('hero-hud-athlete-title');
  const facingLbl = document.getElementById('hero-camera-facing-label');
  const orientLbl = document.getElementById('hero-camera-orient-label');
  const facingSelect = document.getElementById('hero-select-facing');

  if (facingSelect && cState.facingMode) facingSelect.value = cState.facingMode;
  if (facingLbl) facingLbl.textContent = cState.facingMode === 'user' ? 'Селфи' : 'Штатив';
  if (orientLbl) orientLbl.textContent = heroCurrentOrientation === 'portrait' ? '9:16' : '16:9';

  const p = activeProfile();
  const curEx = document.getElementById('hero-select-ex')?.value || 'Упражнение';
  if (athleteTitle) {
    athleteTitle.textContent = `${p?.name || 'АТЛЕТ'} • ${curEx}`;
  }

  // Live HUD timer ticker during active recording
  if (cState.state === 'RECORDING') {
    if (!heroLiveHudTimerId) {
      heroLiveHudTimerId = setInterval(() => {
        const hVal = document.getElementById('hero-hud-timer-val');
        const cdVal = document.getElementById('hero-rec-countdown-val');
        if (heroCameraRecorder && heroCameraRecorder.state === 'RECORDING') {
          const str = typeof heroCameraRecorder.getFormattedTimerString === 'function'
            ? heroCameraRecorder.getFormattedTimerString()
            : '01:00';
          if (hVal) hVal.textContent = str;
          if (cdVal) cdVal.textContent = str;
        }
      }, 100);
    }
  } else {
    if (heroLiveHudTimerId) {
      clearInterval(heroLiveHudTimerId);
      heroLiveHudTimerId = null;
    }
  }

  if (timerVal) {
    if (cState.timeFormatted) {
      timerVal.textContent = cState.timeFormatted;
    } else if (cState.state === 'CAMERA_READY' || cState.state === 'COUNTDOWN' || cState.state === 'STARTING') {
      timerVal.textContent = '00:00.0';
    }
  }

  const hideCountdownOverlay = () => {
    if (countdownOverlay) {
      countdownOverlay.classList.remove('is-active', 'is-counting-down');
      countdownOverlay.style.setProperty('display', 'none', 'important');
      countdownOverlay.setAttribute('hidden', 'true');
    }
    if (bigCountdown) bigCountdown.textContent = '';
  };

  const showCountdownOverlay = (text) => {
    if (countdownOverlay) {
      countdownOverlay.classList.add('is-active', 'is-counting-down');
      countdownOverlay.style.setProperty('display', 'flex', 'important');
      countdownOverlay.removeAttribute('hidden');
      const val = (text !== undefined && text !== null && text !== '') ? text : (cState.countdownSeconds ?? '3');
      if (bigCountdown) bigCountdown.textContent = String(val);
    }
  };

  switch (cState.state) {
    case 'IDLE':
    case 'CAMERA_OFF':
      document.body.classList.remove('hero-recorder-active', 'hero-recording-focus', 'hero-review-active');
      if (preCard) preCard.style.display = 'block';
      if (recorderWrap) recorderWrap.style.display = 'none';
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.innerHTML = '<span class="cam-btn-icon">📷</span><span class="cam-btn-text">Включить камеру</span>';
      }
      if (errorBanner) errorBanner.style.display = 'none';
      hideCountdownOverlay();
      break;

    case 'REQUESTING_CAMERA':
      document.body.classList.add('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.remove('hero-review-active');
      if (preCard) preCard.style.display = 'none';
      if (recorderWrap) recorderWrap.style.display = 'flex';
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="rec-dot-icon"></span><span>ЗАПУСК КАМЕРЫ…</span>';
      }
      if (statusPill) {
        statusPill.className = 'hud-rec-status';
        statusPill.innerHTML = '<span class="hud-rec-dot"></span><span class="hud-rec-label">ЗАПУСК...</span>';
      }
      if (errorBanner) errorBanner.style.display = 'none';
      hideCountdownOverlay();
      break;

    case 'ERROR':
      document.body.classList.remove('hero-recorder-active', 'hero-recording-focus', 'hero-review-active');
      if (preCard) preCard.style.display = 'block';
      if (recorderWrap) recorderWrap.style.display = 'none';
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.innerHTML = '<span class="cam-btn-icon">🔄</span><span class="cam-btn-text">Повторить включение камеры</span>';
      }
      hideCountdownOverlay();
      if (errorBanner) {
        errorBanner.style.display = 'block';
        errorBanner.innerHTML = `
          <div style="font-weight:700;margin-bottom:4px">⚠️ Не удалось запустить камеру</div>
          <div style="font-size:12px;opacity:0.9;margin-bottom:8px">${cState.errorMessage || 'Проверьте доступ к камере в браузере.'}</div>
          <div class="hero-camera-error-actions">
            <button type="button" class="hero-camera-error-btn" id="hero-camera-retry-btn">Повторить</button>
            <button type="button" class="hero-camera-error-btn" id="hero-camera-perm-btn">Проверить разрешение</button>
          </div>
        `;
      }
      break;

    case 'CAMERA_READY':
      document.body.classList.add('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.remove('hero-review-active');
      if (preCard) preCard.style.display = 'none';
      if (recorderWrap) recorderWrap.style.display = 'flex';
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<span class="rec-dot-icon"></span><span>НАЧАТЬ →</span>';
      }
      if (statusPill) {
        statusPill.className = 'hud-rec-status ready';
        statusPill.innerHTML = '<span class="hud-rec-dot"></span><span class="hud-rec-label">НАВЕДЕНИЕ</span>';
      }
      if (timerVal) timerVal.textContent = '01:00';
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'flex';
        if (sp) sp.style.display = 'none';
        if (cb) cb.style.display = 'none';
        if (sr) sr.style.display = 'none';
      }
      hideCountdownOverlay();
      break;

    case 'COUNTDOWN':
      document.body.classList.add('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.remove('hero-review-active');
      if (preCard) preCard.style.display = 'none';
      if (recorderWrap) recorderWrap.style.display = 'flex';
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = `<span>ОТСЧЁТ ${cState.countdownText || cState.countdownSeconds || '3'}...</span>`;
      }
      if (statusPill) {
        statusPill.className = 'hud-rec-status countdown';
        statusPill.innerHTML = '<span class="hud-rec-dot prep"></span><span class="hud-rec-label">ПОДГОТОВКА</span>';
      }
      if (timerVal) timerVal.textContent = '01:00';
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'none';
        if (sp) sp.style.display = 'block';
        if (cb) cb.style.display = 'none';
        if (sr) sr.style.display = 'none';
      }
      showCountdownOverlay(cState.countdownText || cState.countdownSeconds);
      break;

    case 'STARTING':
      document.body.classList.add('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.remove('hero-review-active');
      if (deckPre) {
        deckPre.hidden = false;
        deckPre.style.display = 'block';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      hideCountdownOverlay();
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span>ЗАПУСК...</span>';
      }
      if (statusPill) {
        statusPill.className = 'hud-rec-status countdown';
        statusPill.innerHTML = '<span class="hud-rec-dot prep"></span><span class="hud-rec-label">ПОДГОТОВКА</span>';
      }
      if (timerVal) timerVal.textContent = '01:00';
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'none';
        if (sp) sp.style.display = 'block';
        if (cb) cb.style.display = 'none';
        if (sr) sr.style.display = 'none';
      }
      break;

    case 'RECORDING':
      document.body.classList.add('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.remove('hero-review-active');
      hideCountdownOverlay();
      if (deckPre) {
        deckPre.hidden = true;
        deckPre.style.display = 'none';
      }
      if (deckActive) {
        deckActive.hidden = false;
        deckActive.style.display = 'flex';
      }
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'none';
        if (sp) sp.style.display = 'block';
        if (cb) cb.style.display = 'flex';
        if (sr) sr.style.display = 'flex';
      }
      // v117 ручной режим: показываем «Старт», пока таймер попытки не запущен и нет отсчёта
      {
        const startMode = localStorage.getItem('gto_hero_start_mode') || 'auto';
        const startAttemptBar = document.getElementById('hero-start-attempt-bar');
        if (startAttemptBar) {
          const showStart = startMode === 'manual' && cState.timerState === 'READY' && !cState.isCountdown;
          startAttemptBar.style.display = showStart ? 'block' : 'none';
        }
      }
      const curReps = (cState.reps !== undefined && cState.reps !== null) 
        ? cState.reps 
        : (heroCameraRecorder?.reps || 0);
      const curNoReps = (cState.noReps !== undefined && cState.noReps !== null) 
        ? cState.noReps 
        : (heroCameraRecorder?.noReps || 0);
      if (repBadge) repBadge.textContent = curReps;
      if (noRepBadge) noRepBadge.textContent = curNoReps;
      if (statusPill) {
        statusPill.className = 'hud-rec-status active';
        statusPill.innerHTML = '<span class="hud-rec-dot"></span><span class="hud-rec-label">● ИДЁТ ЗАПИСЬ</span>';
      }
      if (timerVal) {
        timerVal.textContent = cState.timeFormatted || (heroCameraRecorder && typeof heroCameraRecorder.getFormattedTimerString === 'function' ? heroCameraRecorder.getFormattedTimerString() : '01:00');
      }
      break;

    case 'STOPPING':
      document.body.classList.remove('hero-recorder-active', 'hero-recording-focus');
      hideCountdownOverlay();
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'none';
        if (sp) sp.style.display = 'none';
        if (cb) cb.style.display = 'none';
        if (sr) sr.style.display = 'none';
      }
      if (deckPre) {
        deckPre.hidden = true;
        deckPre.style.display = 'none';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span>СОХРАНЕНИЕ...</span>';
      }
      break;

    case 'PREVIEW':
      document.body.classList.remove('hero-recorder-active', 'hero-recording-focus');
      document.body.classList.add('hero-review-active');
      hideCountdownOverlay();
      {
        const aim = document.getElementById('hero-aim-guide-overlay');
        const sp = document.getElementById('hero-rec-speech-prompt');
        const cb = document.getElementById('hero-rec-countdown-badge');
        const sr = document.getElementById('hero-rec-stop-ring-btn');
        if (aim) aim.style.display = 'none';
        if (sp) sp.style.display = 'none';
        if (cb) cb.style.display = 'none';
        if (sr) sr.style.display = 'none';
      }
      if (preCard) preCard.style.display = 'none';
      if (recorderWrap) recorderWrap.style.display = 'none';
      if (deckPre) {
        deckPre.hidden = true;
        deckPre.style.display = 'none';
      }
      if (deckActive) {
        deckActive.hidden = true;
        deckActive.style.display = 'none';
      }
      break;
  }

  // v117: единая точка показа отсчёта — работает и для авто (state COUNTDOWN),
  // и для ручного «Старт» (state RECORDING + timerState COUNTDOWN)
  if (cState.isCountdown) {
    showCountdownOverlay(cState.countdownText || cState.countdownSeconds);
  }

  // HOTFIX #2: Активировать кнопки регистрации только в RECORDING (п. 7, 8 ТЗ)
  const repBtn = document.getElementById('hero-cam-add-rep');
  const noRepBtn = document.getElementById('hero-cam-add-norep');
  const stopBtn = document.getElementById('hero-cam-stop-rec');
  const canAct = (cState.state === 'RECORDING');
  if (repBtn) {
    repBtn.disabled = !canAct;
    repBtn.classList.toggle('is-disabled', !canAct);
  }
  if (noRepBtn) {
    noRepBtn.disabled = !canAct;
    noRepBtn.classList.toggle('is-disabled', !canAct);
  }
  if (stopBtn) {
    stopBtn.disabled = !canAct;
    stopBtn.classList.toggle('is-disabled', !canAct);
  }

  if (cState.state === 'PREVIEW' && cState.recordedUrl) {
    document.body.classList.remove('hero-recorder-active', 'hero-recording-focus');
    document.body.classList.add('hero-review-active');
    hideCountdownOverlay();
    if (preCard) preCard.style.display = 'none';
    if (recorderWrap) recorderWrap.style.display = 'none';

    const st = heroCameraRecorder ? heroCameraRecorder.getRecordingStats() : null;
    const ex = heroCameraRecorder?.workoutTitle || 'Упражнение';
    const reps = (cState.reps !== undefined && cState.reps !== null)
      ? cState.reps
      : (st?.reps ?? heroCameraRecorder?.reps ?? 0);
    const noReps = (cState.noReps !== undefined && cState.noReps !== null)
      ? cState.noReps
      : (st?.noReps ?? heroCameraRecorder?.noReps ?? 0);

    const fileMs = heroCameraRecorder?.fileDurationMs || 0;
    const exMs = heroCameraRecorder?.exerciseDurationMs || fileMs;
    const formatTimeText = (ms) => {
      const totalSec = Math.floor((ms || 0) / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const fileDurText = formatTimeText(fileMs);
    const exDurText = formatTimeText(exMs);
    const durSec = Math.round(exMs / 1000);
    const resStr = `${durSec} с`;

    pendingSet = {
      ex: ex.charAt(0) + ex.slice(1).toLowerCase(),
      res: resStr,
      date: new Date().toLocaleDateString('ru-RU')
    };

    const activeP = activeProfile();
    const isLandscape = (st?.recordingOrientation === 'landscape' || (st?.width && st.width > st.height) || heroCurrentOrientation === 'landscape');
    const orientLabel = isLandscape ? '16:9' : '9:16';
    const bench = benchmarkResult(pendingSet.ex, pendingSet.res, activeP);

    const ext = (cState.recordedBlob?.type || '').includes('mp4') ? 'mp4' : 'webm';
    const recId = 'rec_' + Date.now();
    const videoRec = {
      id: recId,
      localId: recId,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      athleteName: activeP?.name || 'Атлет ГТО',
      athleteId: activeP?.uin || activeP?.name || 'local',
      workoutTitle: pendingSet.ex,
      exerciseTitle: pendingSet.ex,
      fileDurationMs: fileMs,
      exerciseDurationMs: exMs,
      durationMs: fileMs,
      durationSec: durSec,
      reps: reps,
      noReps: noReps,
      orientation: orientLabel,
      sizeBytes: cState.recordedBlob ? cState.recordedBlob.size : 0,
      mimeType: cState.recordedBlob?.type || 'video/webm',
      status: 'RECORDED_LOCAL',
      uploadStatus: 'RECORDED_LOCAL',
      submittedForJudging: false,
      sourceType: 'recorded',
      blob: heroCameraRecorder?.recordedBlob || null
    };

    lastSavedRecord = videoRec;
    saveHeroVideo(videoRec).then(() => {
      console.log('[IndexedDB] Video saved locally on device:', videoRec.localId);
      renderHeroSavedVideosList();
    }).catch(err => console.warn('[IndexedDB Auto-Save]', err));

    // Автоматическая гарантированная привязка снятого видео к черновику онлайн-комплекса
    try {
      const draft = getHeroActiveDraft();
      let targetEx = null;
      if (activeDraftTargetExId) {
        targetEx = draft.exercises.find(e => e.id === activeDraftTargetExId);
      }
      if (!targetEx) {
        const normEx = (pendingSet?.ex || ex || '').toLowerCase().trim();
        targetEx = draft.exercises.find(e => e.title.toLowerCase().trim() === normEx);
      }
      if (!targetEx) {
        targetEx = draft.exercises.find(e => !e.recorded) || draft.exercises[0];
      }
      if (targetEx) {
        targetEx.recorded = true;
        targetEx.videoLocalId = videoRec.localId;
        targetEx.videoUrl = cState.recordedUrl;
        targetEx.reps = reps || targetEx.reps || 0;
        targetEx.noReps = noReps || targetEx.noReps || 0;
        targetEx.status = 'recorded';
        saveHeroActiveDraft(draft);
        console.log('[Draft Auto-Link] Linked video', videoRec.localId, 'to draft exercise', targetEx.title);
      }
    } catch (dErr) {
      console.warn('[Draft Auto-Link Error]', dErr);
    }

    const previewSlot = document.getElementById('hero-preview-slot');
    if (previewSlot) {
      previewSlot.innerHTML = `
        <div class="hero-review-fullscreen-modal" id="hero-fullscreen-review-modal">
          <div class="hero-review-top-bar">
            <div class="hero-review-dur-badge" id="hero-review-dur-badge">${fileDurText}</div>
          </div>
          <div class="hero-review-video-wrap">
            <video id="hero-preview-video-el" src="${cState.recordedUrl}" controls playsinline autoplay loop></video>
          </div>
          <div class="hero-review-actions-deck">
            <button type="button" class="hero-btn-gradient-primary" id="hero-btn-upload-server-direct" style="background:linear-gradient(135deg, #2563eb, #1d4ed8);border:1px solid #3b82f6;">
              <span>☁ ВЫГРУЗИТЬ НА СЕРВЕР И СУДЬЯМ ↗</span>
            </button>
            <button type="button" class="hero-btn-dark-secondary" id="hero-btn-open-rep-sheet">
              <span>💾 Сохранить локально ✓</span>
            </button>
            <button type="button" class="hero-btn-dark-secondary" id="hero-btn-review-reshoot">
              <span>ПЕРЕСНЯТЬ ⟳</span>
            </button>
            <button type="button" class="hero-btn-text-cancel" id="hero-btn-review-cancel">
              Отменить
            </button>
          </div>

          <!-- Bottom Sheet для ввода повторений (Скриншот 19) -->
          <div class="hero-rep-sheet-backdrop" id="hero-rep-sheet-backdrop" style="display:none">
            <div class="hero-rep-sheet-card">
              <div class="hero-sheet-handle"></div>
              <h3 class="hero-sheet-title">Сколько повторений?</h3>
              <p class="hero-sheet-subtitle">${esc(ex)} — укажите свой результат по видео. Судьи перепроверят его при модерации.</p>
              
              <div class="hero-stepper-wrap">
                <button type="button" class="hero-stepper-btn" id="hero-step-minus">−</button>
                <div class="hero-stepper-display">
                  <span class="hero-stepper-num" id="hero-rep-step-val">${reps}</span>
                  <span class="hero-stepper-lbl">ПОВТОРЕНИЙ</span>
                </div>
                <button type="button" class="hero-stepper-btn" id="hero-step-plus">+</button>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">
                <button type="button" class="hero-btn-gradient-primary" id="hero-btn-confirm-upload-reps" style="background:linear-gradient(135deg, #2563eb, #1d4ed8);border:1px solid #3b82f6;">
                  <span>☁ ВЫГРУЗИТЬ НА СЕРВЕР И ПОДТВЕРДИТЬ ✓</span>
                </button>
                <button type="button" class="hero-btn-dark-secondary" id="hero-btn-confirm-save-reps" style="background:rgba(255,255,255,0.06);color:#cbd5e1;">
                  <span>💾 Сохранить только на устройстве</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Модальное окно подтверждения черновика (Скриншот 22) -->
          <div class="hero-rep-sheet-backdrop" id="hero-draft-saved-backdrop" style="display:none">
            <div class="hero-saved-draft-card">
              <div class="hero-sheet-handle"></div>
              <h3 class="hero-saved-draft-title">Заявка сохранена</h3>
              <p class="hero-saved-draft-desc">Черновик со снятыми видео ждёт в «Моих заявках». Откройте его, когда будете готовы снимать дальше.</p>
              <button type="button" class="hero-btn-gradient-primary" id="hero-btn-close-draft-saved">
                <span>ПОНЯТНО</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

let lastSavedRecord = null;

async function uploadHeroVideoRecord(record) {
  if (!record || !record.blob) return false;

  const uploadBtn = document.getElementById('hero-upload-server-btn');
  if (uploadBtn) {
    uploadBtn.innerHTML = '<span>⏳ Отправка на судейство...</span>';
    uploadBtn.disabled = true;
  }

  if (!record.localId) {
    record.localId = 'hero_' + Date.now();
  }

  try {
    await updateHeroVideoStatus(record.localId, 'UPLOADING').catch(() => {});
    const formData = new FormData();
    const ext = record.orientation === 'landscape' ? 'mp4' : 'webm';
    formData.append('video', record.blob, `hero_${record.localId}.${ext}`);
    formData.append('localId', record.localId);
    formData.append('athleteId', record.athleteId || '');
    formData.append('athleteName', record.athleteName || '');
    formData.append('exerciseTitle', record.exerciseTitle || '');
    formData.append('reps', String(record.reps || 0));
    formData.append('noReps', String(record.noReps || 0));
    formData.append('durationSec', String(record.durationSec || 0));
    formData.append('orientation', record.orientation || 'portrait');
    formData.append('sourceType', record.sourceType || 'recorded');

    const draft = getHeroActiveDraft();
    const tournamentId = record.tournamentId || draft.tournamentId || '';
    const tournamentTitle = record.tournamentTitle || draft.tournamentTitle || '';
    if (tournamentId) formData.append('tournament_id', tournamentId);
    if (tournamentTitle) formData.append('tournament_title', tournamentTitle);
    formData.append('metadata', JSON.stringify({
      tournament_id: tournamentId,
      tournament_title: tournamentTitle,
      athlete_id: record.athleteId || '',
      athlete_name: record.athleteName || '',
      exercise_id: record.exerciseId || '',
      exercise_title: record.exerciseTitle || '',
      result: {
        reps: Number(record.reps || 0),
        no_reps: Number(record.noReps || 0),
        duration_sec: Number(record.durationSec || 0)
      }
    }));

    const res = await fetch('/api/hero/videos', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.ok && json.video) {
      record.uploadStatus = 'UPLOADED';
      record.status = 'ON_REVIEW';
      record.submittedForJudging = true;
      record.serverId = json.video.id;
      record.serverUrl = json.video.url;
      await updateHeroVideoStatus(record.localId, 'UPLOADED', {
        serverId: json.video.id,
        serverUrl: json.video.url,
        status: 'ON_REVIEW',
        submittedForJudging: true
      });
      if (uploadBtn) {
        uploadBtn.innerHTML = '<span>✓ Отправлено на судейство</span>';
        uploadBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        uploadBtn.style.color = '#4ade80';
        uploadBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        uploadBtn.disabled = true;
      }
      renderHeroSavedVideosList();
      return true;
    } else {
      throw new Error(json.error || 'Server error');
    }
  } catch (err) {
    console.warn('[Hero Upload]', err);
    record.uploadStatus = 'FAILED';
    await updateHeroVideoStatus(record.localId, 'FAILED', { error: err.message });
    if (uploadBtn) {
      uploadBtn.innerHTML = '<span>⚠️ Ошибка. Повторить отправку</span>';
      uploadBtn.disabled = false;
    }
    renderHeroSavedVideosList();
    return false;
  }
}

/**
 * Рендеринг списка сохранённых на устройстве видеозаписей
 */
export async function renderHeroSavedVideosList() {
  const container = document.getElementById('hero-saved-videos-list');
  if (!container) return;

  try {
    const list = await getAllHeroVideos();
    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="hero-empty-videos" style="text-align:center;padding:24px 16px;color:#64748b;font-size:13px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.08);border-radius:12px">
          <div style="font-size:24px;margin-bottom:6px">📁</div>
          <div>На этом устройстве пока нет сохранённых видео.</div>
          <div style="font-size:11px;color:#475569;margin-top:4px">Запишите попытку на камеру или загрузите готовый видеофайл выше.</div>
        </div>
      `;
      return;
    }

    // Сортировка: новые сверху
    list.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

    container.innerHTML = list.map(v => {
      const d = v.createdAt || v.date ? new Date(v.createdAt || v.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
      const dur = v.durationSec ? `${v.durationSec} сек` : (v.durationMs ? `${Math.round(v.durationMs / 1000)} сек` : '—');
      const sizeMb = v.sizeBytes ? `${(v.sizeBytes / (1024 * 1024)).toFixed(1)} МБ` : '';
      const isSrcFile = v.sourceType === 'file';
      const isSubmitted = !!v.submittedForJudging;

      let statusBadge = '';
      if (v.status === 'APPROVED') {
        statusBadge = `<span style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">✓ Зачёт (${v.judgeVerdict || 'Принято'})</span>`;
      } else if (v.status === 'REJECTED') {
        statusBadge = `<span style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">✕ No-Rep (${v.judgeVerdict || 'Отклонено'})</span>`;
      } else if (isSubmitted) {
        statusBadge = `<span style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">⏳ На проверке у судей</span>`;
      } else {
        statusBadge = `<span style="background:rgba(148,163,184,0.15);color:#cbd5e1;border:1px solid rgba(148,163,184,0.3);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">📱 На устройстве</span>`;
      }

      return `
        <div class="hero-video-item-card" style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
            <div>
              <div style="font-weight:700;font-size:14px;color:#f8fafc;display:flex;align-items:center;gap:6px">
                <span>${isSrcFile ? '📂' : '🎥'}</span>
                <span>${esc(v.exerciseTitle || v.workoutTitle || 'Попытка ГТО')}</span>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px">
                📅 ${d} · ⏱️ ${dur} ${sizeMb ? '· 💾 ' + sizeMb : ''} · 🎯 ${v.reps ?? 0} повторений
              </div>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
            <button type="button" class="hero-card-action-btn" data-video-action="play" data-local-id="${v.localId}" style="flex:1;min-width:90px;padding:6px 10px;background:#1e293b;border:1px solid #334155;color:#f1f5f9;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;touch-action:manipulation">
              ▶ Просмотр
            </button>
            <button type="button" class="hero-card-action-btn" data-video-action="download" data-local-id="${v.localId}" style="flex:1;min-width:90px;padding:6px 10px;background:#1e293b;border:1px solid #334155;color:#f1f5f9;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;touch-action:manipulation">
              📥 Скачать
            </button>
            <button type="button" class="hero-card-action-btn" data-video-action="submit-judge" data-local-id="${v.localId}" style="flex:1.2;min-width:130px;padding:6px 10px;background:${isSubmitted ? '#065f46' : 'linear-gradient(135deg,#2563eb,#1d4ed8)'};border:1px solid ${isSubmitted ? '#059669' : '#3b82f6'};color:${isSubmitted ? '#6ee7b7' : '#ffffff'};border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;touch-action:manipulation">
              ${isSubmitted ? '☁ На сервере (Обновить)' : '☁ Выгрузить на сервер'}
            </button>
            <button type="button" class="hero-card-action-btn" data-video-action="delete" data-local-id="${v.localId}" title="Удалить с устройства" style="padding:6px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:8px;font-size:12px;cursor:pointer;touch-action:manipulation">
              🗑
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.warn('[renderHeroSavedVideosList]', err);
    container.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:12px">Не удалось загрузить видео из хранилища: ${esc(err.message)}</div>`;
  }
}

/**
 * Воспроизведение сохранённого видео в модалке предпросмотра
 */
export async function playVideoInPreviewModal(videoRec) {
  if (!videoRec) return;
  const previewSlot = document.getElementById('hero-preview-slot');
  if (!previewSlot) return;

  let videoSrc = '';
  if (videoRec.blob) {
    videoSrc = URL.createObjectURL(videoRec.blob);
  } else if (videoRec.serverUrl) {
    videoSrc = videoRec.serverUrl;
  } else {
    alert('Видеофайл недоступен');
    return;
  }

  const isLand = videoRec.orientation === 'landscape';
  const durSec = videoRec.durationSec || (videoRec.durationMs ? Math.round(videoRec.durationMs / 1000) : 0);
  const sizeMb = videoRec.sizeBytes ? (videoRec.sizeBytes / (1024 * 1024)).toFixed(1) + ' МБ' : '—';
  lastSavedRecord = videoRec;

  document.body.classList.add('hero-review-active');

  previewSlot.innerHTML = `
    <div class="camera-preview-modal ${isLand ? 'preview-landscape is-landscape' : 'preview-portrait is-portrait'}" id="hero-recorded-result">
      <div class="camera-preview-title">
        <b>${esc(videoRec.exerciseTitle || 'Видео попытки')}</b>
        <small>${isLand ? '16:9' : '9:16'} · ${videoRec.sourceType === 'file' ? '📂 Загружено из файла' : '🎥 Записано в приложении'}</small>
        <button type="button" class="camera-preview-close-btn" id="hero-preview-close-btn" title="Закрыть">✕</button>
      </div>
      <div class="preview-frame ${isLand ? 'preview-landscape is-landscape' : 'preview-portrait is-portrait'}" id="hero-preview-play-frame">
        <video id="hero-preview-play-video" src="${videoSrc}" controls playsinline autoplay class="camera-preview-player recording-preview-video ${isLand ? 'preview-landscape is-landscape' : 'preview-portrait is-portrait'}" style="width:100%;max-height:48dvh;object-fit:contain;background:#000;border-radius:12px;display:block;margin:0 auto;"></video>
      </div>
      <div class="camera-stats-strip">
        <span class="camera-stat-badge">⏱️ Длит: <b>${durSec} с</b></span>
        <span class="camera-stat-badge">🎯 Повторения: <b>${videoRec.reps ?? 0}</b></span>
        <span class="camera-stat-badge">💾 Размер: <b>${sizeMb}</b></span>
        <span class="camera-stat-badge">📱 Статус: <b>${videoRec.submittedForJudging ? 'На судействе' : 'На устройстве'}</b></span>
      </div>
      <div class="camera-preview-buttons" style="margin-top:12px">
        ${!videoRec.submittedForJudging ? `
          <button type="button" class="camera-save-primary-btn" id="hero-upload-server-btn" data-hero-action="upload-server" style="background:linear-gradient(135deg, #2563eb, #1d4ed8);border-color:#3b82f6;">
            <span>⚖ ОТПРАВИТЬ СУДЬЯМ</span>
          </button>
        ` : ''}
        <button type="button" class="camera-download-sec-btn" id="hero-download-video-btn">
          <span>📥 СКАЧАТЬ ВИДЕО</span>
        </button>
        <button type="button" class="camera-download-sec-btn" id="hero-preview-back-btn">
          <span>← НАЗАД К СПИСКУ</span>
        </button>
      </div>
    </div>
  `;

  const pVid = document.getElementById('hero-preview-play-video');
  const pFrame = document.getElementById('hero-preview-play-frame');
  if (pVid && pFrame) {
    pVid.addEventListener('loadedmetadata', () => {
      if (pVid.videoWidth && pVid.videoHeight) {
        const aspect = pVid.videoWidth / pVid.videoHeight;
        pFrame.style.aspectRatio = `${pVid.videoWidth} / ${pVid.videoHeight}`;
        if (aspect < 1) {
          pFrame.classList.add('is-portrait');
          pFrame.classList.remove('is-landscape');
        } else {
          pFrame.classList.add('is-landscape');
          pFrame.classList.remove('is-portrait');
        }
      }
    });
  }

  setTimeout(() => {
    const r = document.getElementById('hero-recorded-result');
    if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

/**
 * Обработка ручной загрузки видеофайла пользователем (Загрузить видео)
 */
export async function handleUserVideoFileUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('video/')) {
    alert('Пожалуйста, выберите видеофайл (MP4, MOV, WebM и др.).');
    return;
  }

  const p = getHeroParticipant();
  const recId = 'file_' + Date.now();
  const videoRec = {
    id: recId,
    localId: recId,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    athleteName: p?.name || 'Атлет ГТО',
    athleteId: p?.uin || p?.name || 'local',
    workoutTitle: pendingSet.ex || 'Подтягивания на высокой перекладине',
    exerciseTitle: pendingSet.ex || 'Подтягивания на высокой перекладине',
    fileDurationMs: 0,
    exerciseDurationMs: 0,
    durationMs: 0,
    durationSec: 0,
    reps: 0,
    noReps: 0,
    orientation: 'portrait',
    sizeBytes: file.size,
    mimeType: file.type,
    status: 'RECORDED_LOCAL',
    uploadStatus: 'RECORDED_LOCAL',
    submittedForJudging: false,
    sourceType: 'file',
    blob: file
  };

  try {
    await saveHeroVideo(videoRec);
    renderHeroSavedVideosList();
    playVideoInPreviewModal(videoRec);
  } catch (err) {
    console.error('[handleUserVideoFileUpload]', err);
    alert('Не удалось сохранить загруженное видео: ' + err.message);
  }
}

// Восстановление сети — досыл только тех видео, которые пользователь ЯВНО отправил на судейство
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      const all = await getAllHeroVideos();
      const pending = all.filter(v => v.submittedForJudging && (v.uploadStatus === 'FAILED' || v.uploadStatus === 'UPLOADING'));
      for (const rec of pending) {
        if (rec.blob) {
          await uploadHeroVideoRecord(rec);
        }
      }
    } catch (_) {}
  });

  window.addEventListener('resize', updateRecorderLayout);
  window.addEventListener('orientationchange', updateRecorderLayout);
}

export function updateRecorderLayout() {
  const isLandscape = window.innerWidth > window.innerHeight;
  heroCurrentOrientation = isLandscape ? 'landscape' : 'portrait';
  const recorderWrap = document.getElementById('hero-camera-recorder-wrap');
  const card = document.getElementById('hero-camera-viewfinder-card');
  const orientLabel = document.getElementById('hero-camera-orient-label');
  if (orientLabel) orientLabel.textContent = isLandscape ? '16:9' : '9:16';

  if (recorderWrap) {
    recorderWrap.classList.toggle('is-landscape', isLandscape);
    recorderWrap.classList.toggle('is-portrait', !isLandscape);
  }
  if (card) {
    card.classList.toggle('is-landscape', isLandscape);
    card.classList.toggle('is-portrait', !isLandscape);
  }
  if (heroCameraRecorder && heroCameraRecorder.state !== CameraState.RECORDING && heroCameraRecorder.state !== CameraState.STARTING) {
    heroCameraRecorder.targetOrientation = heroCurrentOrientation;
    heroCameraRecorder.setTimerConfig({ orientation: heroCurrentOrientation });
    heroCameraRecorder.configureRecordingOutput();
  }
}

// Состояние сканера
let scanStream = null;
let scanRAF = null;
let scannerMode = 'athlete'; // 'athlete' | 'judge'
let scannerFacing = 'environment';
let lastScannedAthlete = null;

export function initHeroGtoScreen() {
  const container = document.getElementById('hero-gto-root');
  if (!container) return;
  store = loadStore();
  if (!store.profiles.length) editingProfile = true;
  renderHeroScreen(container);
  bindHeroEvents(container);
  try {
    getHeroCameraRecorder();
  } catch (_) {}
}

function activeProfile() {
  return store.profiles[store.active] || null;
}

function stopAllCameras() {
  if (heroCameraRecorder) {
    heroCameraRecorder.stopCamera();
    if (typeof heroCameraRecorder.cancelCountdown === 'function') {
      heroCameraRecorder.cancelCountdown();
    }
  }
  document.body.classList.remove('recorder-fullscreen');
  document.body.classList.remove('camera-recording-active');
  stopScanner();
}

function renderHeroScreen(container) {
  const p = activeProfile();
  container.innerHTML = `
    <div class="hero-app-container">
      <div class="hero-header-banner">
        <div class="hero-banner-top">
          <span class="hero-badge-pill">⚡ Герой ГТО · личный кабинет</span>
          <div class="hero-live-badge"><span class="hero-live-dot"></span><span>Данные хранятся только на вашем устройстве</span></div>
        </div>
        <h1 class="hero-banner-title">Кабинет атлета</h1>
        <p class="hero-banner-subtitle">Персональная карточка с QR, видеофиксация со стандартами и титрами, бенчмаркинг рекордов России, Stories и судейский режим.</p>
      </div>

      ${store.profiles.length ? `
      <div class="family-profile-bar">
        ${store.profiles.map((prof, i) => `
          <button class="family-profile-chip ${i === store.active ? 'active' : ''}" data-hero-profile="${i}">
            <span class="family-profile-avatar">${esc((prof.name || '?').trim()[0] || '?')}</span>
            <span><b>${esc(prof.name)}</b> <small>(${esc(prof.role || 'Атлет')})</small></span>
          </button>`).join('')}
        <button class="family-profile-chip family-profile-add" data-hero-action="add"><span>+</span><span>Добавить профиль</span></button>
      </div>` : ''}

      <div class="hero-tabs-rail">
        <button class="hero-tab-btn ${activeHeroTab === 'card' ? 'active' : ''}" data-hero-tab="card"><span>Карточка</span></button>
        <button class="hero-tab-btn ${activeHeroTab === 'video' ? 'active' : ''}" data-hero-tab="video"><span>Видеозапись 🎥</span></button>
        <button class="hero-tab-btn ${activeHeroTab === 'judge' ? 'active' : ''}" data-hero-tab="judge"><span>Судейство ⚖️</span></button>
        <button class="hero-tab-btn ${activeHeroTab === 'norms' ? 'active' : ''}" data-hero-tab="norms"><span>Результаты</span></button>
        <button class="hero-tab-btn ${activeHeroTab === 'starts' ? 'active' : ''}" data-hero-tab="starts"><span>Старты</span></button>
        <button class="hero-tab-btn ${activeHeroTab === 'scan' ? 'active' : ''}" data-hero-tab="scan"><span>Сканер QR</span></button>
      </div>

      <div class="hero-view-pane ${activeHeroTab === 'card' ? 'active' : ''}" id="pane-card">${renderCardPane(p)}</div>
      <div class="hero-view-pane ${activeHeroTab === 'video' ? 'active' : ''}" id="pane-video">${renderVideoPane(p)}</div>
      <div class="hero-view-pane ${activeHeroTab === 'judge' ? 'active' : ''}" id="pane-judge">${renderJudgePane()}</div>
      <div class="hero-view-pane ${activeHeroTab === 'norms' ? 'active' : ''}" id="pane-norms">${renderNormsPane(p)}</div>
      <div class="hero-view-pane ${activeHeroTab === 'starts' ? 'active' : ''}" id="pane-starts">${renderStartsPane()}</div>
      <div class="hero-view-pane ${activeHeroTab === 'scan' ? 'active' : ''}" id="pane-scan">${renderScanPane()}</div>
    </div>`;

  if (activeHeroTab === 'judge') {
    if (!judgeActiveVideoId) {
      loadJudgeQueue();
    } else {
      setTimeout(() => initJudgeVideoPlayer(), 50);
    }
  }

  if (activeHeroTab === 'video') {
    renderHeroSavedVideosList();
    setTimeout(updateRecorderLayout, 50);
  }
}

function renderCardPane(p) {
  if (!p || editingProfile) return renderProfileForm(p);
  const age = p.birthYear ? (new Date().getFullYear() - Number(p.birthYear)) : null;
  const stage = age ? ageToStage(age) : (p.stage || '—');
  const qrText = passText(p, age, stage);

  const competitions = Array.isArray(p.competitions) ? p.competitions : [];
  const records = Array.isArray(p.records) ? p.records : [];
  const startsCount = p.starts_count != null ? p.starts_count : competitions.length;
  const winsCount = p.wins_count != null ? p.wins_count : 0;
  const podiumsCount = p.podiums_count != null ? p.podiums_count : 0;
  const recordsCount = p.records_count != null ? p.records_count : records.length;

  return `
    <div class="hero-pass-layout">
      <div class="athlete-pass-card">
        <div class="pass-card-header">
          <div class="pass-federation-brand">
            <img src="./assets/logo-tight.png" alt="ФМГТО">
            <div><b>МНОГОБОРЬЕ ГТО</b><small>Единый профиль спортсмена</small></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${p.athlete_id ? `<span class="pass-stage-badge" style="background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.4)">${esc(p.athlete_id)}</span>` : ''}
            <span class="pass-stage-badge">${esc(stage)} СТУПЕНЬ</span>
          </div>
        </div>
        <div class="pass-qr-box" id="pass-qr-container">${realQrSvg(qrText, 190)}</div>
        <div class="pass-athlete-info">
          <h3 class="pass-athlete-name">${esc(p.name)}</h3>
          ${p.region ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:3px">📍 ${esc(p.region)}</div>` : ''}
          ${p.uin ? `<div class="pass-athlete-uin">УИН: ${esc(p.uin)}</div>` : `<div class="pass-athlete-uin" style="color:#94a3b8">УИН не указан</div>`}
        </div>
        <div class="pass-actions-row">
          <button class="pass-action-btn primary" data-hero-action="qr-full"><span>Во весь экран</span></button>
          <button class="pass-action-btn secondary" data-hero-action="edit"><span>Редактировать</span></button>
        </div>
      </div>
      <div class="athlete-profile-specs">
        <!-- Сводная спортивная статистика (Master Data) -->
        <div class="profile-spec-card">
          <h4 class="spec-card-title"><span>Карьерная статистика</span></h4>
          <div class="identity-confirm-stats" style="margin-bottom:0">
            <div><b>${startsCount}</b><small>стартов</small></div>
            <div><b>${winsCount}</b><small>побед</small></div>
            <div><b>${podiumsCount}</b><small>подиумов</small></div>
            <div><b>${recordsCount}</b><small>рекордов</small></div>
          </div>
        </div>

        <div class="profile-spec-card">
          <h4 class="spec-card-title"><span>Анкетные данные</span></h4>
          <div class="specs-grid">
            <div class="spec-item"><small>Возраст</small><b>${age ? age + ' лет' : '—'}</b></div>
            <div class="spec-item"><small>Пол</small><b>${p.gender === 'W' ? 'Женский' : p.gender === 'M' ? 'Мужской' : '—'}</b></div>
            <div class="spec-item"><small>Ступень ВФСК</small><b>${esc(stage)}</b></div>
            <div class="spec-item"><small>Год рождения</small><b>${esc(p.birthYear || '—')}</b></div>
            <div class="spec-item" style="grid-column:1/-1"><small>Субъект РФ</small><b>${esc(p.region || '—')}</b></div>
            <div class="spec-item" style="grid-column:1/-1"><small>Клуб / секция</small><b>${esc(p.club || '—')}</b></div>
          </div>
        </div>

        <div class="profile-spec-card">
          <h4 class="spec-card-title"><span>Действия</span></h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="pass-action-btn secondary" data-hero-tab="video" style="width:auto;padding:0 14px"><span>🎥 Онлайн WOD</span></button>
            <button class="pass-action-btn secondary" data-hero-tab="tournaments" style="width:auto;padding:0 14px"><span>🏟️ Старты и турниры</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Карьерный трек атлета: официальные старты из Master Data -->
    <div class="athlete-career-section">
      <div class="athlete-career-header">
        <h3 class="athlete-career-title">
          <span>🏆 История выступлений и стартов (${competitions.length})</span>
        </h3>
      </div>
      ${competitions.length ? `
        <div class="athlete-career-feed">
          ${competitions.map((c, idx) => {
            const rankStr = String(c.rank || c.overall_place || '');
            let badgeClass = '';
            if (rankStr.includes('золото') || rankStr === '1') badgeClass = 'gold';
            else if (rankStr.includes('серебро') || rankStr === '2') badgeClass = 'silver';
            else if (rankStr.includes('бронза') || rankStr === '3') badgeClass = 'bronze';

            const events = Array.isArray(c.events) ? c.events : [];

            return `
              <div class="athlete-history-card">
                <div class="ahc-header">
                  <div>
                    <div class="ahc-title">${esc(c.tournament_title || 'Соревнование ФМГТО')}</div>
                    <div class="ahc-meta">
                      ${c.tournament_date ? `<span>📅 ${esc(c.tournament_date)}</span>` : ''}
                      ${c.city ? `<span>📍 ${esc(c.city)}</span>` : ''}
                      ${c.category ? `<span>🏷️ ${esc(c.category)}</span>` : ''}
                      ${c.team_name ? `<span>👥 ${esc(c.team_name)}</span>` : ''}
                    </div>
                  </div>
                  ${rankStr ? `<span class="ahc-rank-badge ${badgeClass}">${badgeClass === 'gold' ? '🥇' : badgeClass === 'silver' ? '🥈' : badgeClass === 'bronze' ? '🥉' : ''} ${esc(rankStr)}</span>` : ''}
                </div>
                ${c.result ? `<div style="font-size:13px;color:#e2e8f0;margin-bottom:8px">Итоговый результат: <b style="color:#38bdf8">${esc(c.result)}</b></div>` : ''}
                ${events.length ? `
                  <div class="ahc-events-list">
                    ${events.map(ev => `
                      <div class="ahc-event-item">
                        <span class="ahc-event-name">${esc(ev.event_name || 'Упражнение')}</span>
                        <span class="ahc-event-result">${esc(ev.result || (ev.rank ? 'место: ' + ev.rank : '—'))}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="background:rgba(15,23,42,0.6);border:1px dashed rgba(255,255,255,0.15);border-radius:14px;padding:20px;text-align:center;color:#94a3b8;font-size:13px">
          У вас пока нет подтверждённых архивных стартов. Запишите онлайн-комплекс или отправьте заявку на турнир!
        </div>
      `}
    </div>

    <!-- Рекорды России атлета -->
    ${records.length ? `
      <div class="athlete-career-section" style="margin-top:20px">
        <div class="athlete-career-header">
          <h3 class="athlete-career-title" style="color:#f59e0b">
            <span>⭐ Рекорды России (${records.length})</span>
          </h3>
        </div>
        <div class="athlete-career-feed">
          ${records.map(r => `
            <div class="athlete-history-card" style="border-left:4px solid #f59e0b">
              <div class="ahc-header">
                <div>
                  <div class="ahc-title" style="color:#fef3c7">${esc(r.discipline || 'Рекорд России')}</div>
                  <div class="ahc-meta">
                    ${r.age_group ? `<span>Возраст: ${esc(r.age_group)}</span>` : ''}
                    ${r.event ? `<span>🏆 ${esc(r.event)}</span>` : ''}
                    ${r.city ? `<span>📍 ${esc(r.city)}</span>` : ''}
                  </div>
                </div>
                <div style="font-size:18px;font-weight:800;color:#f59e0b;font-family:'Unbounded',sans-serif">
                  ${esc(r.result)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function passText(p, age, stage) {
  return `МНОГОБОРЬЕ ГТО | Атлет: ${p.name}${p.athlete_id ? ' | ID: ' + p.athlete_id : ''}${p.uin ? ' | УИН: ' + p.uin : ''}${age ? ' | ' + age + ' лет, ступень ' + stage : ''}${p.region ? ' | ' + p.region : ''}${p.club ? ' | Клуб: ' + p.club : ''}`;
}

function renderProfileForm(p) {
  const v = p || {};
  return `
    <div class="profile-spec-card" style="max-width:560px">
      <div class="identity-confirm-badge">Master Data · Единая система ФМГТО</div>
      <h4 class="spec-card-title"><span>${p ? 'Редактирование профиля' : 'Регистрация в экосистеме «Многоборье ГТО»'}</span></h4>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;line-height:1.5">
        Введите ваши реальные спортивные данные. Система мгновенно проверит архив официальных соревнований 2020–2026 гг. и привяжет всю вашу спортивную историю к вашей карточке.
      </p>
      <div class="hero-form">
        <label>ФИО спортсмена <span style="color:#ef4444">*</span><input type="text" id="hf-name" value="${esc(v.name || '')}" placeholder="Яворский Валерий Иванович" maxlength="70" required></label>
        
        <div class="hero-form-row">
          <label>Год рождения<input type="number" id="hf-year" value="${esc(v.birthYear || '')}" placeholder="1995" min="1930" max="${new Date().getFullYear()}"></label>
          <label>Пол<select id="hf-gender"><option value="">—</option><option value="M" ${v.gender === 'M' || v.gender === 'Мужчины' ? 'selected' : ''}>Мужской</option><option value="W" ${v.gender === 'W' || v.gender === 'Женщины' ? 'selected' : ''}>Женский</option></select></label>
        </div>

        <label>Субъект РФ / Регион <span style="color:#ef4444">*</span><input type="text" id="hf-region" value="${esc(v.region || '')}" placeholder="Хабаровский край, Хабаровск" maxlength="80"></label>

        <div class="hero-form-row">
          <label>Email <span style="color:#64748b">(для привязки)</span><input type="email" id="hf-email" value="${esc(v.email || '')}" placeholder="athlete@mail.ru"></label>
          <label>Телефон <span style="color:#64748b">(необязательно)</span><input type="tel" id="hf-phone" value="${esc(v.phone || '')}" placeholder="+7 999 123-45-67"></label>
        </div>

        <label>УИН ВФСК ГТО <span style="color:#64748b">(необязательно)</span><input type="text" id="hf-uin" value="${esc(v.uin || '')}" placeholder="24-77-0012345" maxlength="20"></label>
        <label>Клуб / секция <span style="color:#64748b">(необязательно)</span><input type="text" id="hf-club" value="${esc(v.club || '')}" placeholder="СК «Восток», Хабаровск" maxlength="60"></label>
        
        <div class="hero-form-actions">
          <button class="pass-action-btn primary" data-hero-action="save-profile" id="hf-save-btn"><span>Сохранить и привязать историю</span></button>
          ${p ? `<button class="pass-action-btn secondary" data-hero-action="cancel-edit"><span>Отмена</span></button>` : ''}
          ${p && store.profiles.length > 1 ? `<button class="pass-action-btn secondary" data-hero-action="delete-profile" style="color:#fca5a5"><span>Удалить</span></button>` : ''}
        </div>
      </div>
    </div>`;
}

function renderScanPane() {
  let judgeProtocol = [];
  try { judgeProtocol = JSON.parse(localStorage.getItem(JUDGE_STORE)) || []; } catch (_) {}

  return `
    <div class="hud-recorder-box">
      <div style="display:flex;gap:8px;margin-bottom:14px;background:rgba(15,23,42,0.6);padding:6px;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
        <button class="pass-action-btn ${scannerMode === 'athlete' ? 'primary' : 'secondary'}" id="btn-mode-athlete" style="flex:1"><span>👤 Сканировать карточку</span></button>
        <button class="pass-action-btn ${scannerMode === 'judge' ? 'primary' : 'secondary'}" id="btn-mode-judge" style="flex:1"><span>📋 Судья на площадке</span></button>
      </div>

      <div class="hud-viewport-stage">
        <video id="scan-video" class="hud-video-elem" autoplay playsinline muted></video>
        <div class="hud-overlay-layer">
          <div class="scan-frame" aria-hidden="true"></div>
          ${scannerMode === 'judge' ? `<div style="position:absolute;top:12px;left:12px"><span class="judge-mode-badge">📋 Протокол площадки</span></div>` : ''}
        </div>
      </div>
      <div class="hud-controls-dock">
        <button class="hud-control-btn rec-btn" id="btn-scan-toggle"><span>${scanStream ? 'Выключить сканер' : 'Включить сканер'}</span></button>
        <button class="hud-control-btn" id="btn-scan-flip" style="background:rgba(255,255,255,0.1);color:#fff">🔄 Камера</button>
        <div id="scan-result" style="flex:1;min-width:200px;color:#cbd5e1;font-size:13px;line-height:1.4">
          ${scannerMode === 'judge' ? 'Наведите камеру на QR-код участника соревнований.' : 'Наведите камеру на QR-код карточки атлета.'}
        </div>
      </div>

      <div id="judge-entry-container"></div>

      ${scannerMode === 'judge' ? `
      <div style="margin-top:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:8px">
          <h4 style="margin:0;font-size:14px;color:#fff;text-transform:uppercase;letter-spacing:0.05em">Протокол попыток на площадке (${judgeProtocol.length})</h4>
          <div style="display:flex;gap:8px">
            <button class="pass-action-btn secondary" id="btn-export-judge-csv" style="width:auto;padding:0 12px;font-size:12px"><span>📥 Экспорт в CSV</span></button>
            <button class="pass-action-btn secondary" id="btn-clear-judge-log" style="width:auto;padding:0 12px;font-size:12px;color:#fca5a5"><span>Очистить</span></button>
          </div>
        </div>
        ${judgeProtocol.length ? `
        <div class="judge-table-wrap">
          <table class="judge-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Атлет</th>
                <th>Ступень / УИН</th>
                <th>Дисциплина</th>
                <th>Попытка</th>
                <th>Результат</th>
                <th>Вердикт</th>
              </tr>
            </thead>
            <tbody>
              ${judgeProtocol.map(item => `
                <tr>
                  <td><small>${esc(item.time)}</small></td>
                  <td><b>${esc(item.athleteName)}</b></td>
                  <td><small>${esc(item.stage || '—')}${item.uin ? ' / ' + esc(item.uin) : ''}</small></td>
                  <td>${esc(item.discipline)}</td>
                  <td>№${esc(item.attempt)}</td>
                  <td><b style="color:#38bdf8">${esc(item.result)}</b></td>
                  <td>${item.status === 'OK' ? '<span class="judge-badge-ok">✓ Зачёт</span>' : '<span class="judge-badge-norep">✗ No-Rep</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : `<p style="font-size:12px;color:#64748b;margin:6px 0">Пока нет записей. Отсканируйте карточку участника для внесения в протокол.</p>`}
      </div>` : ''}
    </div>`;
}

const HERO_DRAFT_KEY = 'gto_hero_active_draft_v1';

function getHeroActiveDraft() {
  try {
    const raw = localStorage.getItem(HERO_DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    tournamentTitle: 'Всероссийский турнир «Гордость и Слава 2026»',
    stageName: 'Онлайн-этап: Комплекс WOD',
    status: 'draft', // draft | submitted | reshoot_requested | approved
    judgeNote: '',
    exercises: [
      { id: 'ex1', title: 'ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)', reps: 0, recorded: false, videoLocalId: null, status: 'pending' },
      { id: 'ex2', title: 'ОТЖИМАНИЯ В УПОРЕ ЛЁЖА', reps: 0, recorded: false, videoLocalId: null, status: 'pending' },
      { id: 'ex3', title: 'РЫВОК ГИРИ (16 / 24 КГ)', reps: 0, recorded: false, videoLocalId: null, status: 'pending' }
    ]
  };
}

function saveHeroActiveDraft(draft) {
  try {
    localStorage.setItem(HERO_DRAFT_KEY, JSON.stringify(draft));
  } catch (_) {}
}

export function setHeroActiveTournament(tournamentId, tournamentTitle, exercises) {
  const draft = getHeroActiveDraft();
  draft.tournamentId = tournamentId;
  draft.tournamentTitle = tournamentTitle || draft.tournamentTitle;
  if (Array.isArray(exercises) && exercises.length) {
    draft.exercises = exercises.map((ex, idx) => ({
      id: `ex${idx + 1}`,
      title: typeof ex === 'string' ? ex.toUpperCase() : (ex.title || `Упражнение ${idx + 1}`).toUpperCase(),
      reps: 0,
      recorded: false,
      videoLocalId: null,
      status: 'pending'
    }));
  }
  saveHeroActiveDraft(draft);
}

function renderHeroActiveDraftCard() {
  const draft = getHeroActiveDraft();
  const totalCount = draft.exercises?.length || 3;
  const recordedCount = draft.exercises ? draft.exercises.filter(e => e.recorded).length : 0;
  const allRecorded = recordedCount >= totalCount;

  let statusBadge = `<span class="hero-draft-badge draft">Черновик (снято ${recordedCount} из ${totalCount})</span>`;
  if (draft.status === 'submitted') {
    statusBadge = '<span class="hero-draft-badge submitted">⏳ На судействе</span>';
  } else if (draft.status === 'reshoot_requested') {
    statusBadge = '<span class="hero-draft-badge reshoot">⚠️ Требуется пересъёмка</span>';
  } else if (draft.status === 'approved') {
    statusBadge = '<span class="hero-draft-badge approved">✓ Зачтено</span>';
  }

  return `
    <div class="hero-draft-application-card" id="hero-draft-app-card">
      <div class="hero-draft-card-head">
        <div class="hero-draft-badge-row">
          <span class="hero-draft-chip">🏆 ${esc(draft.tournamentTitle)}</span>
          ${statusBadge}
        </div>
        <h4 class="hero-draft-stage-title">${esc(draft.stageName)}</h4>
        <p class="hero-draft-stage-desc">Запишите видео всех ${totalCount} упражнений комплекса по стандартам ФМГТО. После записи всех видео отправьте единую заявку на судейство.</p>
        ${draft.judgeNote ? `
          <div class="hero-draft-judge-note">
            <b>Комментарий судьи:</b> ${esc(draft.judgeNote)}
          </div>
        ` : ''}
      </div>

      <div class="hero-draft-exercises-list">
        ${draft.exercises.map((item, idx) => {
          const isDone = item.recorded;
          const isReshoot = item.status === 'reshoot_requested';
          return `
            <div class="hero-draft-ex-row ${isDone ? 'is-done' : ''}">
              <div class="hero-draft-ex-left">
                <span class="hero-draft-ex-idx">${idx + 1}</span>
                <div class="hero-draft-ex-info">
                  <span class="hero-draft-ex-name">${esc(item.title)}</span>
                  <span class="hero-draft-ex-state">
                    ${isReshoot ? '<span style="color:#fbbf24">⚠️ Судья запросил пересъёмку</span>' :
                      isDone ? `<span style="color:#22c55e">✓ Записано: <b>${item.reps} повт.</b></span>` :
                      '<span style="color:#94a3b8">Не снято</span>'}
                  </span>
                </div>
              </div>
              <div class="hero-draft-ex-actions">
                ${isDone && item.videoLocalId ? `
                  <button type="button" class="hero-draft-play-btn" data-video-action="play" data-local-id="${esc(item.videoLocalId)}" title="Посмотреть">
                    ▶
                  </button>
                ` : ''}
                <button type="button" class="hero-draft-shoot-btn ${isDone ? 'reshoot' : 'primary'}" data-draft-record-ex="${esc(item.title)}" data-draft-record-ex-id="${esc(item.id)}">
                  ${isReshoot ? '⟳ Переснять' : isDone ? '⟳ Заново' : '🎥 Снять'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="hero-draft-card-foot">
        <button type="button" class="hero-btn-gradient-primary" id="hero-btn-submit-draft-app" ${!allRecorded || draft.status === 'submitted' ? 'disabled' : ''}>
          <span>${draft.status === 'submitted' ? '✓ ЗАЯВКА ОТПРАВЛЕНА' : `ОТПРАВИТЬ ЗАЯВКУ НА СУДЕЙСТВО (${recordedCount} ИЗ ${totalCount}) ↗`}</span>
        </button>
        ${!allRecorded ? `<span class="hero-draft-foot-hint">Снимите все ${totalCount} упражнения комплекса (${recordedCount} из ${totalCount} готово), чтобы отправить единую заявку на судейство</span>` : ''}
      </div>
    </div>
  `;
}

function renderVideoPane(p) {
  const isLandscape = heroCurrentOrientation === 'landscape';
  const facing = heroCameraRecorder?.facingMode || 'environment';
  const cdSec = Number(localStorage.getItem('gto_countdown_seconds') ?? 5);
  const startMode = localStorage.getItem('gto_hero_start_mode') || 'auto';

  return `
    <div class="hero-video-tab-wrap" id="hero-video-tab-wrap">
      <!-- 1. Компактная карточка ДО включения камеры (высота ~280-340px) -->
      <div class="hero-pre-camera-card" id="hero-pre-camera-card">
        <div class="hero-pre-camera-header">
          <div class="hero-pre-camera-badge">⚡ Видеофиксатор «Герой ГТО»</div>
          <h3 class="hero-pre-camera-title">Автоматическая запись с титрами</h3>
          <p class="hero-pre-camera-desc">Титры ФМГТО, таймер и счётчик повторений впечатываются прямо в видео. Камера ещё не включена.</p>
        </div>

        <div class="hero-pre-camera-fields">
          <div class="hero-select-wrap">
            <label for="hero-select-ex" class="hero-field-label">Упражнение</label>
            <select class="hud-select-discipline" id="hero-select-ex">
              <option value="ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)">Подтягивания на турнике (строгие)</option>
              <option value="ОТЖИМАНИЯ В УПОРЕ ЛЁЖА">Отжимания в упоре лёжа</option>
              <option value="РЫВОК ГИРИ (16 / 24 КГ)">Рывок гири (16 / 24 кг)</option>
              <option value="ПРЕСС / ПОДЪЁМ ТУЛОВИЩА">Пресс / подъём туловища (1 мин)</option>
              <option value="ПЛАНКА (НА ВРЕМЯ)">Планка (на время)</option>
              <option value="ПРИСЕДАНИЯ (ЗА 2 МИНУТЫ)">Приседания (за 2 минуты)</option>
              <option value="ПРЫЖОК В ДЛИНУ С МЕСТА">Прыжок в длину с места</option>
              <option value="ГИБКОСТЬ (НАКЛОН НА СКАМЬЕ)">Гибкость (наклон на скамье)</option>
              <option value="БЁРПИ (С ПРЫЖКОМ)">Бёрпи (с прыжком)</option>
            </select>
          </div>

          <div class="hero-pre-camera-actions">
            <button type="button" class="hero-btn-service" id="btn-open-technique" style="height:38px">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <span>Стандарты</span>
            </button>
            <button type="button" class="hero-btn-service" id="btn-hero-switch-camera" style="height:38px">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8h3l-4 5-4-5h3c0-5.5 4.5-10 10-10s10 4.5 10 10h-2z"/><path d="M4 14c0 4.4 3.6 8 8 8s8-3.6 8-8h-3l4-5 4 5h-3c0 5.5-4.5 10-10 10S2 19.5 2 14h2z"/></svg>
              <span id="hero-camera-facing-label">${facing === 'user' ? 'Селфи' : 'Штатив'}</span>
            </button>
            <button type="button" class="hero-btn-service" id="btn-hero-toggle-orientation" title="Переключить формат 9:16 / 16:9" style="height:38px">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
              <span id="hero-camera-orient-label">${isLandscape ? '16:9' : '9:16'}</span>
            </button>
          </div>
        </div>

        <div class="hero-pre-camera-cta">
          <button type="button" class="hero-primary-camera-btn" id="hero-camera-enable-btn">
            <span class="cam-btn-icon">📷</span>
            <span class="cam-btn-text">Включить камеру</span>
          </button>
        </div>

        <div id="hero-camera-error-banner" class="hero-camera-error-banner" style="display:none"></div>
      </div>

      <!-- 2. Полноэкранный рекордер (активен только после включения камеры) -->
      <div class="hero-recorder-container hero-recorder-fullscreen ${isLandscape ? 'is-landscape' : 'is-portrait'}" id="hero-camera-recorder-wrap" style="display:none">
        <!-- Верхний HUD в 2 уровня (HOTFIX #2) -->
        <div class="hero-recorder-hud-top">
          <div class="hero-recorder-hud-row1">
            <button type="button" class="hero-hud-close-btn" id="hero-cam-exit-btn" title="Выйти из камеры">
              <span>✕ Закрыть</span>
            </button>
            <div class="hud-athlete-title" id="hero-hud-athlete-title">
              ${p?.name || 'АТЛЕТ'} • ПОДТЯГИВАНИЯ
            </div>
          </div>
          <div class="hero-recorder-hud-row2">
            <div class="hud-timer-badge" id="hero-hud-timer-val">
              00:00.0
            </div>
            <div class="hud-rec-status ready" id="hero-cam-status-pill">
              <span class="hud-rec-dot"></span>
              <span class="hud-rec-label">ГОТОВ</span>
            </div>
          </div>
        </div>

        <!-- Центральный видоискатель (Video + Canvas) -->
        <div class="hero-viewfinder-wrapper" id="hero-viewfinder-wrapper">
          <div class="camera-viewfinder-card ${isLandscape ? 'is-landscape' : 'is-portrait'}" id="hero-camera-viewfinder-card">
            <video id="hero-cam-raw-video" class="camera-viewfinder-video" playsinline webkit-playsinline muted autoplay></video>
            <canvas id="hero-cam-live-canvas" class="camera-live-canvas ${isLandscape ? 'is-landscape' : 'is-portrait'}" width="${isLandscape ? 1920 : 1080}" height="${isLandscape ? 1080 : 1920}"></canvas>

            <!-- Рамка наведения (Шаг 3 из 3: скриншоты 14, 15, 16) -->
            <div class="hero-aim-guide-overlay" id="hero-aim-guide-overlay" style="display:flex">
              <div class="hero-aim-guide-box">
                <div class="hero-aim-guide-label">Встаньте в рамку целиком</div>
              </div>
            </div>

            <!-- Речевой промпт во время записи (Скриншот 17) -->
            <div class="hero-rec-speech-prompt" id="hero-rec-speech-prompt" style="display:none">
              Назовите имя, регион и дисциплину
            </div>

            <!-- Бейдж обратного отсчета (Скриншот 17) -->
            <div class="hero-rec-countdown-badge" id="hero-rec-countdown-badge" style="display:none">
              <span class="hero-rec-countdown-dot"></span>
              <span>ОСТАЛОСЬ <span id="hero-rec-countdown-val">01:00</span></span>
            </div>

            <!-- Круглая кнопка СТОП по центру снизу (Скриншот 17) -->
            <button type="button" class="hero-rec-stop-ring-btn" id="hero-rec-stop-ring-btn" style="display:none" title="Завершить запись">
              <div class="hero-rec-stop-inner-sq"></div>
            </button>

            <div class="camera-countdown-overlay" id="hero-countdown-overlay" style="display:none">
              <div class="cam-big-countdown" id="hero-cam-big-countdown">5</div>
              <button type="button" class="cam-cancel-countdown-btn" id="hero-cam-cancel-countdown">✕ Отмена</button>
            </div>
          </div>
        </div>

        <!-- Нижний пульт управления (Control Deck) -->
        <div class="hero-control-deck" id="hero-control-deck">
          <div class="hero-deck-pre" id="hero-deck-pre">
            <div class="hero-pre-options-row">
              <div class="hero-pre-opt-item">
                <label for="hero-select-countdown">Таймер старта:</label>
                <select id="hero-select-countdown" class="hero-opt-select">
                  <option value="0" ${cdSec === 0 ? 'selected' : ''}>Без отсчёта (0с)</option>
                  <option value="3" ${cdSec === 3 ? 'selected' : ''}>3 сек</option>
                  <option value="5" ${cdSec === 5 ? 'selected' : ''}>5 сек (по умолч.)</option>
                  <option value="10" ${cdSec === 10 ? 'selected' : ''}>10 сек</option>
                </select>
              </div>
              <div class="hero-pre-opt-item">
                <label for="hero-select-format">Формат:</label>
                <select id="hero-select-format" class="hero-opt-select">
                  <option value="portrait" ${isLandscape ? '' : 'selected'}>9:16 (вертикально)</option>
                  <option value="landscape" ${isLandscape ? 'selected' : ''}>16:9 (горизонтально)</option>
                </select>
              </div>
              <div class="hero-pre-opt-item">
                <label for="hero-select-facing">Камера:</label>
                <select id="hero-select-facing" class="hero-opt-select">
                  <option value="environment" ${facing === 'environment' ? 'selected' : ''}>Основная (штатив)</option>
                  <option value="user" ${facing === 'user' ? 'selected' : ''}>Фронтальная (селфи)</option>
                </select>
              </div>
              <div class="hero-pre-opt-item">
                <label for="hero-select-mode">Режим старта:</label>
                <select id="hero-select-mode" class="hero-opt-select">
                  <option value="auto" ${startMode === 'auto' ? 'selected' : ''}>Авто (отсчёт → запись)</option>
                  <option value="manual" ${startMode === 'manual' ? 'selected' : ''}>Ручной (запись → старт)</option>
                </select>
              </div>
            </div>

            <button type="button" class="hero-main-rec-btn start" id="btn-hero-start-rec">
              <span class="rec-dot-icon"></span>
              <span>${startMode === 'manual' ? 'НАЧАТЬ ЗАПИСЬ' : 'НАЧАТЬ ПОПЫТКУ'}</span>
            </button>
          </div>

          <div class="hero-deck-active" id="hero-deck-active" hidden>
            <div class="hero-deck-reps-row" style="display:flex;gap:10px;width:100%;margin-bottom:10px">
              <button type="button" class="hero-action-rep-btn plus-one" id="hero-cam-add-rep" style="flex:1;min-height:52px;font-size:16px;font-weight:800;border-radius:12px;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center;gap:6px">
                <span>+1 ЗАЧЁТ</span>
                <span class="hero-count-pill" id="hero-active-rep-count" style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:6px;font-size:13px">0</span>
              </button>
              <button type="button" class="hero-action-rep-btn norep" id="hero-cam-add-norep" style="flex:1;min-height:52px;font-size:16px;font-weight:800;border-radius:12px;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center;gap:6px">
                <span>✕ NO-REP</span>
                <span class="hero-count-pill" id="hero-active-norep-count" style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:6px;font-size:13px">0</span>
              </button>
            </div>
            <div class="hero-start-attempt-bar" id="hero-start-attempt-bar" style="width:100%;margin-bottom:10px;display:none">
              <button type="button" class="hero-main-rec-btn start-attempt" id="hero-cam-start-attempt">
                <span class="rec-dot-icon" style="background:#10b981"></span>
                <span>▶ СТАРТ (отсчёт 3-2-1)</span>
              </button>
            </div>
            <div class="hero-stop-action-bar" style="width:100%">
              <button type="button" class="hero-main-rec-btn stop" id="hero-cam-stop-rec">
                <span class="stop-sq-icon">■</span>
                <span>ЗАВЕРШИТЬ ПОПЫТКУ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Активная онлайн-заявка (Черновик комплекса по стандартам Герой ГТО) -->
      ${renderHeroActiveDraftCard()}

      <!-- 4. Список сохранённых видеозаписей попыток -->
      <div class="hero-saved-videos-section" id="hero-saved-videos-section" style="margin-top:24px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h4 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#f8fafc">📁 Сохранённые видеозаписи</h4>
            <p style="margin:0;font-size:12px;color:#94a3b8">Все записанные и загруженные попытки хранятся локально на вашем устройстве</p>
          </div>
          <button type="button" class="hero-btn-service" id="hero-btn-upload-file" style="height:36px;font-size:13px;padding:0 12px;display:flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>+ Загрузить видео</span>
          </button>
        </div>
        <input type="file" id="hero-upload-input" accept="video/*" style="display:none">
        <div id="hero-saved-videos-list" class="hero-saved-videos-list">
          <div style="color:#64748b;font-size:13px;padding:12px 0">Загрузка сохранённых видео...</div>
        </div>
      </div>

      <div id="hero-preview-slot"></div>
      <div id="hero-set-save"></div>
    </div>`;
}

// ============================================================================
// СУДЕЙСКИЙ РЕЖИМ (JUDGE REVIEW PANEL)
// ============================================================================
let judgeActiveVideoId = null;
let judgeActiveVideo = null;
let judgePlaybackRate = 1.0;
let judgeEvents = [];
let judgeVerdict = 'APPROVED';
let judgeComment = '';
let judgeVideosCache = [];
let judgeKeydownBound = false;

function renderJudgePane() {
  if (judgeActiveVideoId && judgeActiveVideo) {
    return renderJudgeReviewWorkspace(judgeActiveVideo);
  }

  return `
    <div class="profile-spec-card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <h4 class="spec-card-title" style="margin:0"><span>Судейская коллегия · Видеофиксация</span></h4>
        <button type="button" class="pass-action-btn secondary" id="btn-refresh-judge-queue" style="width:auto;padding:4px 12px;font-size:12px"><span>↻ Обновить очередь</span></button>
      </div>
      <p style="font-size:13px;color:#94a3b8;line-height:1.55;margin:0 0 16px">
        Проверка доказательных видеозаписей спортсменов. Покадровый просмотр, замедление 0.25× / 0.5×, фиксация повторений на таймлайне и вынесение официального судейского вердикта.
      </p>

      <div id="judge-video-queue-list">
        <div style="text-align:center;padding:24px;color:#64748b">Загрузка очереди видеопопыток...</div>
      </div>
    </div>
  `;
}

async function loadJudgeQueue() {
  const container = document.getElementById('judge-video-queue-list');
  if (!container) return;

  try {
    const videos = await getAllHeroVideos();
    judgeVideosCache = videos || [];

    if (!videos || videos.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px 16px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1);border-radius:12px">
          <div style="font-size:28px;margin-bottom:8px">⚖️</div>
          <b style="color:#e2e8f0;font-size:14px;display:block;margin-bottom:4px">Очередь проверок пуста</b>
          <p style="font-size:12px;color:#94a3b8;margin:0 0 14px">Запишите видеопопытку во вкладке «Видеозапись 🎥» или дождитесь выгрузки атлетами.</p>
          <button type="button" class="pass-action-btn primary" data-hero-tab="video" style="width:auto;padding:6px 16px;font-size:12px"><span>Перейти к видеозаписи →</span></button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">
        Попытки на проверке (${videos.length})
      </div>
      <div class="apps-list-stack">
        ${videos.map(v => {
          const isApproved = v.status === 'APPROVED' || v.judgeResult?.verdict === 'APPROVED';
          const isRetake = v.status === 'RETAKE_REQUIRED' || v.judgeResult?.verdict === 'RETAKE_REQUIRED';
          const isRejected = v.status === 'REJECTED' || v.judgeResult?.verdict === 'REJECTED';

          let statusBadge = `<span class="benchmark-badge" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4)">⏳ Ожидает проверки</span>`;
          if (isApproved) {
            statusBadge = `<span class="benchmark-badge badge-gold" style="background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.4)">✓ Зачтено (${v.reps || v.judgeResult?.validReps || 0})</span>`;
          } else if (isRetake) {
            statusBadge = `<span class="benchmark-badge" style="background:rgba(249,115,22,0.2);color:#fb923c;border:1px solid rgba(249,115,22,0.4)">↻ Повторная попытка</span>`;
          } else if (isRejected) {
            statusBadge = `<span class="benchmark-badge" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4)">✕ Отклонено</span>`;
          }

          const fileSec = Math.round((v.durationMs || v.fileDurationMs || 0) / 1000);
          const exSec = Math.round((v.exerciseDurationMs || v.durationMs || 0) / 1000);
          const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleString('ru-RU') : (v.date || '—');

          return `
            <div class="app-event-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
                <div>
                  <b style="font-size:14px;color:#fff;display:block">${esc(v.athleteName || 'Атлет')}</b>
                  <div style="font-size:12px;color:#cbd5e1">${esc(v.exerciseTitle || v.workoutTitle || 'Упражнение')}</div>
                </div>
                <div>${statusBadge}</div>
              </div>
              <div style="display:flex;gap:12px;font-size:11px;color:#94a3b8;flex-wrap:wrap">
                <span>📅 ${dateStr}</span>
                <span>⏱️ Файл: <b>${fileSec}с</b></span>
                <span>⏱️ Попытка: <b style="color:#38bdf8">${exSec}с</b></span>
                <span>📐 ${esc(v.orientation || '9:16')}</span>
                ${v.judgeResult?.comment ? `<span>💬 ${esc(v.judgeResult.comment)}</span>` : ''}
              </div>
              <div style="display:flex;gap:8px;margin-top:4px">
                <button type="button" class="pass-action-btn primary" data-judge-open-id="${v.localId || v.id}" style="width:auto;padding:6px 14px;font-size:12px">
                  <span>⚖️ Открыть судейскую панель →</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('[loadJudgeQueue error]', err);
    container.innerHTML = `<div style="color:#f87171;font-size:13px">Ошибка загрузки очереди: ${err.message}</div>`;
  }
}

function renderJudgeReviewWorkspace(v) {
  const validCount = judgeEvents.filter(e => e.type === 'valid_rep').length;
  const noRepCount = judgeEvents.filter(e => e.type === 'no_rep').length;
  const videoUrl = v.blob ? URL.createObjectURL(v.blob) : (v.serverUrl || v.url || '');

  return `
    <div class="profile-spec-card judge-workspace-card" style="margin-bottom:14px">
      <!-- Навигация назад и шапка попытки -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <button type="button" class="pass-action-btn secondary" data-judge-action="back" style="width:auto;padding:6px 12px;font-size:12px">
          <span>← Назад к очереди</span>
        </button>
        <div style="font-size:12px;color:#94a3b8">
          <span>ID: <b>${esc(v.localId || v.id)}</b></span>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <h3 style="margin:0 0 4px;font-size:18px;color:#fff">${esc(v.athleteName || 'Атлет')}</h3>
        <div style="font-size:13px;color:#38bdf8;font-weight:600">${esc(v.exerciseTitle || v.workoutTitle || 'Упражнение')}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">
          Дата: ${v.createdAt ? new Date(v.createdAt).toLocaleString('ru-RU') : (v.date || '—')} · Формат: ${esc(v.orientation || '9:16')}
        </div>
      </div>

      <!-- Видеопроигрыватель -->
      <div class="judge-video-wrapper" style="position:relative;background:#000;border-radius:12px;overflow:hidden;margin-bottom:12px;border:1px solid rgba(255,255,255,0.1)">
        <video id="judge-video-player" src="${videoUrl}" playsinline style="width:100%;max-height:48dvh;object-fit:contain;display:block;margin:0 auto"></video>

        <!-- Интерактивный таймлайн событий -->
        <div class="judge-timeline-bar-wrap" style="position:relative;background:rgba(15,23,42,0.9);padding:8px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:4px">
            <span id="judge-time-current">00:00.0</span>
            <span id="judge-time-duration">00:00.0</span>
          </div>

          <div class="judge-timeline-track" id="judge-timeline-track" style="position:relative;height:12px;background:rgba(255,255,255,0.15);border-radius:6px;cursor:pointer">
            <div id="judge-timeline-progress" style="position:absolute;top:0;left:0;bottom:0;width:0%;background:#38bdf8;border-radius:6px"></div>
            <!-- Точки событий на таймлайне -->
            <div id="judge-timeline-markers" style="position:absolute;inset:0;pointer-events:none"></div>
          </div>
        </div>
      </div>

      <!-- Панель управления воспроизведением -->
      <div class="judge-controls-row" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;gap:6px;align-items:center">
          <button type="button" class="hero-btn-service" data-judge-action="seek-back" title="Перемотка назад 5 сек" style="height:36px;padding:0 12px">
            <span>−5с</span>
          </button>
          <button type="button" class="pass-action-btn primary" id="btn-judge-play-pause" data-judge-action="play-pause" style="width:auto;height:36px;padding:0 16px;font-size:13px">
            <span>▶ Play</span>
          </button>
          <button type="button" class="hero-btn-service" data-judge-action="seek-forward" title="Перемотка вперёд 5 сек" style="height:36px;padding:0 12px">
            <span>+5с</span>
          </button>
        </div>

        <div style="display:flex;gap:4px;align-items:center">
          <span style="font-size:11px;color:#94a3b8;margin-right:4px">Скорость:</span>
          <button type="button" class="judge-speed-btn ${judgePlaybackRate === 0.25 ? 'active' : ''}" data-judge-speed="0.25">0.25×</button>
          <button type="button" class="judge-speed-btn ${judgePlaybackRate === 0.5 ? 'active' : ''}" data-judge-speed="0.5">0.5×</button>
          <button type="button" class="judge-speed-btn ${judgePlaybackRate === 1.0 ? 'active' : ''}" data-judge-speed="1.0">1.0×</button>
        </div>
      </div>

      <!-- Табло подсчёта повторений -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#34d399;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">ЗАЧТЕНО (VALID)</div>
          <div id="judge-valid-count" style="font-size:36px;font-weight:900;color:#10b981;line-height:1.1;margin-top:4px">${validCount}</div>
        </div>
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#f87171;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">ОШИБКИ (NO-REP)</div>
          <div id="judge-norep-count" style="font-size:36px;font-weight:900;color:#ef4444;line-height:1.1;margin-top:4px">${noRepCount}</div>
        </div>
      </div>

      <!-- Большие эргономичные кнопки судейства (Touch >= 48px) -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <button type="button" class="judge-action-btn valid" data-judge-action="valid-rep" style="min-height:54px;font-size:16px;font-weight:800;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(16,185,129,0.3);cursor:pointer">
          <span>+1 ЗАЧЁТ</span>
          <span style="font-size:11px;background:rgba(0,0,0,0.25);padding:2px 6px;border-radius:4px;font-weight:600">[1]</span>
        </button>
        <button type="button" class="judge-action-btn norep" data-judge-action="no-rep" style="min-height:54px;font-size:16px;font-weight:800;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(239,68,68,0.3);cursor:pointer">
          <span>✕ NO-REP</span>
          <span style="font-size:11px;background:rgba(0,0,0,0.25);padding:2px 6px;border-radius:4px;font-weight:600">[2]</span>
        </button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button type="button" class="hero-btn-service" data-judge-action="undo-rep" style="flex:1;height:38px;font-size:12px">
          <span>↶ Отменить последнее</span>
        </button>
        <button type="button" class="hero-btn-service" data-judge-action="reset-reps" style="height:38px;font-size:12px;color:#fca5a5">
          <span>Сбросить всё</span>
        </button>
      </div>

      <!-- Вердикт судьи -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Официальный вердикт:</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;margin-bottom:12px">
          <label class="judge-verdict-opt ${judgeVerdict === 'APPROVED' ? 'selected' : ''}" data-judge-verdict="APPROVED">
            <span style="color:#34d399">✓ Зачтено</span>
          </label>
          <label class="judge-verdict-opt ${judgeVerdict === 'RETAKE_REQUIRED' ? 'selected' : ''}" data-judge-verdict="RETAKE_REQUIRED">
            <span style="color:#fb923c">↻ Повторная попытка</span>
          </label>
          <label class="judge-verdict-opt ${judgeVerdict === 'REJECTED' ? 'selected' : ''}" data-judge-verdict="REJECTED">
            <span style="color:#f87171">✕ Отклонено</span>
          </label>
        </div>

        <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:4px">Комментарий судьи к попытке:</label>
        <textarea id="judge-comment-input" rows="2" placeholder="Укажите замечания: фиксация в верхней точке, касание грудью, амплитуда..." style="width:100%;box-sizing:border-box;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 10px;color:#fff;font-size:13px;resize:vertical">${esc(judgeComment || v.judgeResult?.comment || '')}</textarea>
      </div>

      <!-- Кнопка фиксации судейского решения -->
      <button type="button" class="pass-action-btn primary" id="btn-save-judge-verdict" data-judge-action="save-verdict" style="width:100%;height:48px;font-size:14px;font-weight:700">
        <span>✓ СОХРАНИТЬ И ОТПРАВИТЬ СУДЕЙСКОЕ РЕШЕНИЕ</span>
      </button>

      <div style="font-size:11px;color:#64748b;text-align:center;margin-top:8px">
        🔒 Оригинальный видеофайл сохраняется неизменным (immutable). Фиксируются только судейские метаданные.
      </div>
    </div>
  `;
}

function initJudgeVideoPlayer() {
  const video = document.getElementById('judge-video-player');
  const track = document.getElementById('judge-timeline-track');
  const progress = document.getElementById('judge-timeline-progress');
  const curTimeEl = document.getElementById('judge-time-current');
  const durTimeEl = document.getElementById('judge-time-duration');
  const playBtn = document.getElementById('btn-judge-play-pause');

  if (!video) return;

  video.playbackRate = judgePlaybackRate;

  const formatSec = (s) => {
    const sec = Math.floor(s || 0);
    const m = Math.floor(sec / 60);
    const rem = sec % 60;
    const ms = Math.floor(((s || 0) - sec) * 10);
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}.${ms}`;
  };

  video.onloadedmetadata = () => {
    if (durTimeEl) durTimeEl.textContent = formatSec(video.duration);
    renderJudgeTimelineMarkers();
  };

  video.ontimeupdate = () => {
    if (curTimeEl) curTimeEl.textContent = formatSec(video.currentTime);
    if (progress && video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      progress.style.width = pct + '%';
    }
  };

  video.onplay = () => {
    if (playBtn) playBtn.innerHTML = '<span>⏸ Pause</span>';
  };
  video.onpause = () => {
    if (playBtn) playBtn.innerHTML = '<span>▶ Play</span>';
  };

  if (track) {
    track.onclick = (e) => {
      const rect = track.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      if (video.duration) {
        video.currentTime = pos * video.duration;
      }
    };
  }

  renderJudgeTimelineMarkers();

  // Desktop keyboard bindings
  if (!judgeKeydownBound) {
    judgeKeydownBound = true;
    window.addEventListener('keydown', (e) => {
      const v = document.getElementById('judge-video-player');
      if (!v || activeHeroTab !== 'judge' || !judgeActiveVideoId) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        v.paused ? v.play() : v.pause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 3);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 9999, v.currentTime + 3);
      } else if (e.code === 'Digit1') {
        e.preventDefault();
        addJudgeEvent('valid_rep');
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        addJudgeEvent('no_rep');
      }
    });
  }
}

function addJudgeEvent(type) {
  const video = document.getElementById('judge-video-player');
  const timeMs = video ? Math.round(video.currentTime * 1000) : 0;
  judgeEvents.push({
    type,
    timeMs,
    label: `${type === 'valid_rep' ? '✓ Зачёт' : '✕ No-Rep'} (${(timeMs / 1000).toFixed(1)}с)`
  });
  updateJudgeCounters();
  renderJudgeTimelineMarkers();
}

function updateJudgeCounters() {
  const validEl = document.getElementById('judge-valid-count');
  const noRepEl = document.getElementById('judge-norep-count');
  const validCount = judgeEvents.filter(e => e.type === 'valid_rep').length;
  const noRepCount = judgeEvents.filter(e => e.type === 'no_rep').length;
  if (validEl) validEl.textContent = validCount;
  if (noRepEl) noRepEl.textContent = noRepCount;
}

function renderJudgeTimelineMarkers() {
  const markersContainer = document.getElementById('judge-timeline-markers');
  const video = document.getElementById('judge-video-player');
  if (!markersContainer || !video) return;

  const durMs = (video.duration && video.duration > 0) ? (video.duration * 1000) : (judgeActiveVideo?.durationMs || 1000);

  markersContainer.innerHTML = judgeEvents.map((evt) => {
    const leftPct = Math.min(100, Math.max(0, (evt.timeMs / durMs) * 100));
    return `
      <div class="judge-timeline-marker ${evt.type === 'valid_rep' ? 'valid' : 'norep'}"
           style="left:${leftPct.toFixed(2)}%"
           title="${evt.label || ''}"
           data-seek-ms="${evt.timeMs}"></div>
    `;
  }).join('');
}

async function applyJudgeDecision(container) {
  if (!judgeActiveVideoId || !judgeActiveVideo) return;
  const commentEl = document.getElementById('judge-comment-input');
  const comment = commentEl ? commentEl.value.trim() : '';
  const validCount = judgeEvents.filter(e => e.type === 'valid_rep').length;
  const noRepCount = judgeEvents.filter(e => e.type === 'no_rep').length;

  const judgeResult = {
    validReps: validCount,
    noReps: noRepCount,
    events: judgeEvents,
    verdict: judgeVerdict,
    comment: comment,
    judgeName: 'Судья ФМГТО',
    judgedAt: new Date().toISOString()
  };

  try {
    await saveJudgeResult(judgeActiveVideoId, judgeResult);
    fetch('/api/hero_video_judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: judgeActiveVideoId, judgeResult })
    }).catch(() => {});

    alert(`✓ Судейское решение сохранено!\nВердикт: ${judgeVerdict === 'APPROVED' ? 'Зачтено' : judgeVerdict === 'RETAKE_REQUIRED' ? 'Требуется пересдача' : 'Отклонено'}\nЗачтено: ${validCount}, Ошибок: ${noRepCount}`);

    judgeActiveVideoId = null;
    judgeActiveVideo = null;
    renderHeroScreen(container);
  } catch (err) {
    alert('Ошибка сохранения решения: ' + err.message);
  }
}

function renderNormsPane(p) {
  const key = 'hero_results_' + store.active;
  let results = [];
  try { results = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}

  return `
    <div class="profile-spec-card" style="margin-bottom:14px">
      <h4 class="spec-card-title"><span>Официальные нормативы</span></h4>
      <p style="font-size:13px;color:#94a3b8;line-height:1.55;margin:0 0 14px">
        Точный расчёт нормативов на Золотой / Серебряный / Бронзовый знак по вашему возрасту и полу в калькуляторе приложения (Приказ Минспорта № 114).
      </p>
      <button class="pass-action-btn primary" data-go="calculator" style="width:auto;padding:0 18px"><span>Открыть калькулятор нормативов →</span></button>
    </div>
    <div class="profile-spec-card">
      <h4 class="spec-card-title"><span>Мой личный журнал результатов (${results.length})</span></h4>
      <div class="hero-form-row" style="margin-bottom:10px">
        <input type="text" id="hr-ex" placeholder="Упражнение (напр. Подтягивания)" maxlength="40">
        <input type="text" id="hr-res" placeholder="Результат (напр. 24)" maxlength="20" style="max-width:150px">
        <button class="pass-action-btn secondary" data-hero-action="add-result" style="width:auto;padding:0 14px"><span>+ Добавить</span></button>
      </div>
      ${results.length ? `
        <div class="apps-list-stack">
          ${results.map((r, i) => {
            const bench = benchmarkResult(r.ex, r.res, p);
            return `
            <div class="app-event-item" style="flex-direction:column;align-items:stretch;gap:8px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div class="app-event-info">
                  <b>${esc(r.ex)}</b>
                  <small>${esc(r.date)}</small>
                </div>
                <span style="display:flex;align-items:center;gap:10px">
                  <b style="color:#38bdf8;font-size:16px">${esc(r.res)}</b>
                  <button data-hero-action="del-result" data-idx="${i}" style="background:none;border:0;color:#fca5a5;cursor:pointer;font-size:16px" title="Удалить">✕</button>
                </span>
              </div>
              ${bench ? `
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  ${bench.medal === 'gold' ? `<span class="benchmark-badge badge-gold">🥇 Золотой знак ГТО</span>` : ''}
                  ${bench.medal === 'silver' ? `<span class="benchmark-badge badge-silver">🥈 Серебряный знак</span>` : ''}
                  ${bench.medal === 'bronze' ? `<span class="benchmark-badge badge-silver">🥉 Бронзовый знак</span>` : ''}
                  ${bench.matchedRecord && bench.recordPct ? `<span class="benchmark-badge badge-record">🏆 Рекорд РФ: ${esc(bench.matchedRecord.result)} (${esc(bench.matchedRecord.holder)}) · ${bench.recordPct}%</span>` : ''}
                </div>` : ''}
              <div style="display:flex;gap:8px;margin-top:4px">
                <button class="pass-action-btn secondary" data-hero-action="stories" data-idx="${i}" style="width:auto;padding:2px 10px;font-size:11px"><span>📲 Stories 1080×1350</span></button>
                <button class="pass-action-btn secondary" data-hero-action="diploma" data-idx="${i}" style="width:auto;padding:2px 10px;font-size:11px"><span>🖨 Диплом</span></button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<p style="font-size:13px;color:#64748b;margin:0">Записей пока нет — зафиксируйте тренировку или добавьте результат вручную.</p>`}
    </div>`;
}

function findTournamentById(tId) {
  try {
    const adminRaw = localStorage.getItem('gto_admin_store_v1');
    if (adminRaw) {
      const parsed = JSON.parse(adminRaw);
      const found = parsed?.events?.find(e => String(e.id) === String(tId));
      if (found) return found;
    }
  } catch (_) {}
  const live = (typeof GTO_LIVE_TOURNAMENTS !== 'undefined' ? GTO_LIVE_TOURNAMENTS : []) || [];
  return live.find(t => String(t.id) === String(tId)) || live[0];
}

export function openTournamentRegistrationModal(tournamentId) {
  const t = findTournamentById(tournamentId);
  if (!t) return;
  const p = activeProfile() || { name: 'Атлет', uin: '—' };
  const hasOnsite = t.hasOnsiteRecord !== false;
  const hasOnline = t.hasOnlineHero !== false;
  const wodExs = (t.wodExercises && t.wodExercises.length === 3)
    ? t.wodExercises
    : ['ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)', 'ОТЖИМАНИЯ В УПОРЕ ЛЁЖА', 'РЫВОК ГИРИ (16 / 24 КГ)'];

  const selectedFormat = hasOnline ? 'online' : 'onsite';

  const modalHtml = `
    <div class="hero-modal-backdrop" id="hero-tournament-reg-modal">
      <div class="hero-reg-dialog">
        <button type="button" class="hero-modal-close-btn" id="hero-close-tournament-reg-btn" aria-label="Закрыть">✕</button>
        <div class="hero-reg-badge">🏆 Официальная регистрация ФМГТО</div>
        <h3 class="hero-reg-title">${esc(t.name || 'Всероссийский турнир')}</h3>
        <p class="hero-reg-meta">📅 ${esc(t.date || '2026')} · 📍 ${esc(t.location || 'РФ')}${t.venue ? ' (' + esc(t.venue) + ')' : ''}</p>

        <div class="hero-reg-profile-preview">
          <div class="hero-reg-prof-name">Заявитель: ${esc(p.name || 'Атлет')}</div>
          <div class="hero-reg-prof-sub">УИН: ${esc(p.uin || 'Не указан')} · Категория: ${esc(p.stage || 'VI ступень')}</div>
        </div>

        <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">
          Выберите формат участия:
        </div>

        ${hasOnline ? `
          <div class="hero-reg-format-card ${selectedFormat === 'online' ? 'selected' : ''}" data-format-opt="online">
            <div class="hrf-radio"></div>
            <div>
              <div class="hrf-title">📹 Онлайн-отбор «Герой ГТО» (Комплекс WOD)</div>
              <div class="hrf-desc">
                Видеофиксация 3-х упражнений со встроенным таймером и титрами:
                <div style="margin-top:4px;color:#38bdf8;font-weight:600">
                  1. ${esc(wodExs[0])}<br>
                  2. ${esc(wodExs[1])}<br>
                  3. ${esc(wodExs[2])}
                </div>
                После записи всех 3 видео единая заявка направляется в судейскую коллегию.
              </div>
            </div>
          </div>
        ` : ''}

        ${hasOnsite ? `
          <div class="hero-reg-format-card ${selectedFormat === 'onsite' ? 'selected' : ''}" data-format-opt="onsite">
            <div class="hrf-radio"></div>
            <div>
              <div class="hrf-title">🏟️ Очный зачёт «Иду на рекорд»</div>
              <div class="hrf-desc">Личное участие на официальном помосте соревнований. Регламент заходов и стартовый номер формируются в системе.</div>
            </div>
          </div>
        ` : ''}

        <div style="margin-top:16px">
          <button type="button" class="hero-btn-gradient-primary" id="hero-confirm-tournament-reg-btn" data-tournament-id="${esc(t.id)}" style="width:100%">
            <span>ПОДТВЕРДИТЬ РЕГИСТРАЦИЮ ✓</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const old = document.getElementById('hero-tournament-reg-modal');
  if (old) old.remove();

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modalEl = document.getElementById('hero-tournament-reg-modal');
  if (!modalEl) return;

  modalEl.addEventListener('click', (e) => {
    // 1. Закрытие модального окна
    if (e.target.closest('#hero-close-tournament-reg-btn') || e.target === modalEl) {
      modalEl.remove();
      return;
    }

    // 2. Выбор формата участия
    const formatCard = e.target.closest('.hero-reg-format-card');
    if (formatCard) {
      modalEl.querySelectorAll('.hero-reg-format-card').forEach(c => c.classList.remove('selected'));
      formatCard.classList.add('selected');
      return;
    }

    // 3. Подтверждение регистрации
    const confirmRegBtn = e.target.closest('#hero-confirm-tournament-reg-btn');
    if (confirmRegBtn) {
      const tId = confirmRegBtn.dataset.tournamentId;
      const tourney = findTournamentById(tId) || t;
      const chosenFormat = modalEl.querySelector('.hero-reg-format-card.selected')?.dataset.formatOpt || 'online';
      modalEl.remove();

      if (chosenFormat === 'online') {
        const exs = (tourney && tourney.wodExercises && tourney.wodExercises.length === 3)
          ? tourney.wodExercises
          : ['ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)', 'ОТЖИМАНИЯ В УПОРЕ ЛЁЖА', 'РЫВОК ГИРИ (16 / 24 КГ)'];
        
        const newDraft = {
          tournamentId: tourney?.id || 'tourn_' + Date.now(),
          tournamentTitle: tourney?.name || 'Всероссийский турнир «Гордость и Слава 2026»',
          stageName: 'Онлайн-этап: Комплекс WOD',
          status: 'draft',
          judgeNote: '',
          exercises: exs.map((title, i) => ({
            id: `ex${i + 1}`,
            title: title.toUpperCase(),
            reps: 0,
            recorded: false,
            videoLocalId: null,
            status: 'pending'
          }))
        };
        saveHeroActiveDraft(newDraft);
        activeHeroTab = 'video';
        
        const screenEl = document.getElementById('hero-screen') || document.getElementById('pane-herogto');
        if (screenEl) {
          renderHeroScreen(screenEl);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        alert(`✓ Вы успешно зарегистрированы на онлайн-отбор турнира «${tourney?.name || 'Турнир'}»!\n\nОткрыта карточка комплекса с 3 упражнениями. Запишите все 3 видео по стандартам ФМГТО для отправки на судейство.`);
      } else {
        // Очный старт «Иду на рекорд»
        try {
          const rawStore = localStorage.getItem('gto_admin_store_v1');
          const adStore = rawStore ? JSON.parse(rawStore) : {};
          if (!adStore.applications) adStore.applications = [];
          const prof = activeProfile() || { name: 'Атлет', uin: '—' };
          adStore.applications.unshift({
            id: 'APP-' + Date.now().toString().slice(-6),
            tournamentId: tourney?.id,
            tournamentName: tourney?.name || 'Официальный старт',
            athleteName: prof.name || 'Атлет',
            uin: prof.uin || '—',
            region: prof.region || 'Москва',
            format: 'offline',
            discipline: 'Очный зачёт «Иду на рекорд»',
            claimedResult: 'Ожидает старта',
            status: 'new',
            submittedDate: new Date().toLocaleDateString('ru-RU')
          });
          localStorage.setItem('gto_admin_store_v1', JSON.stringify(adStore));
        } catch (_) {}
        alert(`✓ Заявка на очный старт турнира «${tourney?.name || 'Турнир'}» («Иду на рекорд») успешно зарегистрирована! Информация передана в оргкомитет.`);
      }
    }
  });
}

function renderStartsPane() {
  const tournaments = (typeof GTO_LIVE_TOURNAMENTS !== 'undefined' ? GTO_LIVE_TOURNAMENTS : []) || [];
  const upcoming = tournaments.filter(t => !t.statusText?.includes('Завершено'));
  const archive = tournaments.filter(t => t.statusText?.includes('Завершено'));

  return `
    <div class="profile-spec-card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <h4 class="spec-card-title" style="margin:0"><span>Официальные старты Федерации ГТО</span></h4>
        <div style="display:flex;gap:6px">
          <button class="pass-action-btn primary" data-go="events" style="width:auto;padding:4px 12px;font-size:12px"><span>Календарь →</span></button>
          <button class="pass-action-btn secondary" data-go="leaderboards" style="width:auto;padding:4px 12px;font-size:12px"><span>Лидерборды 🏆</span></button>
        </div>
      </div>
      <p style="font-size:13px;color:#94a3b8;line-height:1.55;margin:0 0 16px">
        Официальные всероссийские соревнования по многоборью ГТО (ЕКП Минспорта РФ).
        Заявки, прямые трансляции, тайминг комплексов и утверждённые судейские протоколы.
      </p>

      <!-- Предстоящие и активные старты -->
      <div style="font-size:12px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 10px;display:flex;align-items:center;gap:6px">
        <span>⚡ Предстоящие и активные старты (${upcoming.length})</span>
      </div>
      <div class="apps-list-stack" style="margin-bottom:20px">
        ${upcoming.map(t => {
          const tTitle = (t.slug === 'gordost-i-slava-2026')
            ? 'Всероссийский турнир «Гордость и Слава 2026» · ' + t.name
            : ((t.slug === 'vostok-team-series-26-2')
              ? 'Vostok Team Series 2026 · ' + t.name
              : t.name);
          return `
          <div class="app-event-item start-card" style="display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;width:100%;max-width:100%;min-width:0;box-sizing:border-box">
            <b style="font-size:15px;color:#fff;display:block;line-height:1.35;margin-bottom:2px;width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word">${esc(tTitle)}</b>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
              <span class="benchmark-badge badge-gold" style="white-space:nowrap;font-size:11px;padding:3px 10px;display:inline-flex">
                ${esc(t.statusText || 'Прием заявок')}
              </span>
              <div style="font-size:12px;color:#94a3b8;line-height:1.4">📅 ${esc(t.date)} · 📍 ${esc(t.location || '')}${t.venue ? ' (' + esc(t.venue) + ')' : ''}</div>
            </div>
            ${t.description ? `<div style="font-size:12px;color:#cbd5e1;line-height:1.45;overflow-wrap:anywhere">${esc(t.description)}</div>` : ''}
            <div style="display:flex;gap:12px;font-size:12px;color:#94a3b8;flex-wrap:wrap">
              ${t.prizePool ? `<span>💰 Призовой фонд: <b style="color:#fbbf24">${esc(t.prizePool)}</b></span>` : ''}
              ${t.quota ? `<span>👥 Квота: <b style="color:#e2e8f0">${esc(t.quota)}</b></span>` : ''}
              ${t.categories?.length ? `<span>Категорий: <b style="color:#e2e8f0">${t.categories.length}</b></span>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
              <button type="button" class="pass-action-btn primary" data-hero-action="register-tournament" data-tournament-id="${t.id}" style="width:auto;padding:6px 14px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
                <span>Подать заявку ✍️</span>
              </button>
              <button class="pass-action-btn secondary" data-go="leaderboards" data-tournament-id="${t.id}" style="width:auto;padding:6px 14px;font-size:12px">
                <span>Протокол / Лидерборд</span>
              </button>
            </div>
          </div>
        `;}).join('')}
      </div>

      <!-- Архив соревнований -->
      <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 10px;display:flex;align-items:center;gap:6px">
        <span>📁 Архив турниров (${archive.length})</span>
      </div>
      <div class="apps-list-stack">
        ${archive.map(t => {
          const aTitle = (t.slug === 'gordost-i-slava-2026')
            ? 'Всероссийский турнир «Гордость и Слава 2026» · ' + t.name
            : ((t.slug === 'vostok-team-series-26-2')
              ? 'Vostok Team Series 2026 · ' + t.name
              : t.name);
          return `
          <div class="app-event-item start-card" style="display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;width:100%;max-width:100%;min-width:0;box-sizing:border-box">
            <b style="font-size:14px;color:#cbd5e1;display:block;line-height:1.35;margin-bottom:2px;width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word">${esc(aTitle)}</b>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
              <span class="benchmark-badge" style="background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);white-space:nowrap;font-size:11px;padding:3px 10px;display:inline-flex">
                ${esc(t.statusText || 'Завершено')}
              </span>
              <div style="font-size:12px;color:#64748b;line-height:1.4">📅 ${esc(t.date)} · 📍 ${esc(t.location || '')}${t.venue ? ' (' + esc(t.venue) + ')' : ''}</div>
            </div>
            ${t.description ? `<div style="font-size:12px;color:#94a3b8;line-height:1.45;overflow-wrap:anywhere">${esc(t.description)}</div>` : ''}
            <div style="display:flex;gap:12px;font-size:12px;color:#64748b;flex-wrap:wrap">
              ${t.prizePool ? `<span>💰 Призовой фонд: ${esc(t.prizePool)}</span>` : ''}
              ${t.teams?.length ? `<span>Участников: <b style="color:#94a3b8">${t.teams.length}</b></span>` : ''}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
              <button class="pass-action-btn secondary" data-go="leaderboards" data-tournament-id="${t.id}" style="width:auto;padding:6px 14px;font-size:12px">
                <span>Итоговый протокол турнира</span>
              </button>
            </div>
          </div>
        `;}).join('')}
      </div>
    </div>`;
}

function bindHeroEvents(container) {
  if (container._heroEventsBound) return;
  container._heroEventsBound = true;

  container.addEventListener('click', e => {
    const tBtn = e.target.closest('[data-tournament-id]');
    if (tBtn) {
      const tid = Number(tBtn.dataset.tournamentId);
      try {
        if (window.lbState) window.lbState.activeTournamentId = tid;
      } catch (_) {}
    }
    const tab = e.target.closest('[data-hero-tab]');
    if (tab) {
      stopAllCameras();
      activeHeroTab = tab.dataset.heroTab;
      editingProfile = false;
      renderHeroScreen(container);
      return;
    }
    const prof = e.target.closest('[data-hero-profile]');
    if (prof) {
      stopAllCameras();
      store.active = Number(prof.dataset.heroProfile);
      saveStore(store);
      editingProfile = false;
      renderHeroScreen(container);
      return;
    }

    const act = e.target.closest('[data-hero-action]')?.dataset.heroAction;
    if (act === 'add') { editingProfile = true; store._draft = true; activeHeroTab = 'card'; renderHeroScreen(container); return; }
    if (act === 'edit') { editingProfile = true; renderHeroScreen(container); return; }
    if (act === 'cancel-edit') { editingProfile = false; delete store._draft; renderHeroScreen(container); return; }
    if (act === 'save-profile') { saveProfileFromForm(container); return; }
    if (act === 'delete-profile') {
      if (confirm('Удалить этот профиль?')) {
        store.profiles.splice(store.active, 1);
        store.active = 0;
        editingProfile = !store.profiles.length;
        saveStore(store);
        renderHeroScreen(container);
      }
      return;
    }
    if (act === 'qr-full') { openQrFull(); return; }
    if (act === 'add-result') { addResult(container); return; }
    if (act === 'del-result') { delResult(container, Number(e.target.closest('[data-hero-action]').dataset.idx)); return; }
    if (act === 'save-set') { saveSetToJournal(); return; }
    if (act === 'dismiss-set') { const b = document.getElementById('hero-set-save'); if (b) b.innerHTML = ''; return; }
    if (act === 'set-stories') { if (pendingSet) openStoriesGenerator(pendingSet); return; }
    if (act === 'set-diploma') { if (pendingSet) openHeroDiploma(pendingSet); return; }

    if (act === 'stories') {
      const idx = Number(e.target.closest('[data-hero-action]').dataset.idx);
      const key = 'hero_results_' + store.active;
      let results = []; try { results = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
      if (results[idx]) openStoriesGenerator(results[idx]);
      return;
    }
    if (act === 'diploma') {
      const idx = Number(e.target.closest('[data-hero-action]').dataset.idx);
      const key = 'hero_results_' + store.active;
      let results = []; try { results = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
      if (results[idx]) openHeroDiploma(results[idx]);
      return;
    }

    // Сканер
    if (e.target.closest('#btn-scan-toggle')) {
      scanStream ? (stopScanner(), setScanBtn('Включить сканер')) : startScanner();
      return;
    }
    if (e.target.closest('#btn-scan-flip')) {
      toggleScannerFacing();
      return;
    }
    if (e.target.closest('#btn-mode-athlete')) {
      scannerMode = 'athlete';
      renderHeroScreen(container);
      return;
    }
    if (e.target.closest('#btn-mode-judge')) {
      scannerMode = 'judge';
      renderHeroScreen(container);
      return;
    }
    if (e.target.closest('#btn-save-judge-entry')) {
      saveJudgeEntry();
      return;
    }
    if (e.target.closest('#btn-export-judge-csv')) {
      exportJudgeCsv();
      return;
    }
    if (e.target.closest('#btn-clear-judge-log')) {
      if (confirm('Очистить судейский протокол?')) {
        localStorage.removeItem(JUDGE_STORE);
        renderHeroScreen(container);
      }
      return;
    }

    // Тренировка (ТЗ v97 — единый GtoCameraRecorder)
    if (e.target.closest('#hero-camera-enable-btn') || e.target.closest('#btn-hero-toggle-camera') || e.target.closest('#hero-camera-retry-btn')) {
      console.log('[HERO CAMERA] click received');
      const rec = getHeroCameraRecorder();
      if (!rec.stream) {
        rec.startCamera();
      } else {
        rec.stopCamera();
      }
      return;
    }
    if (e.target.closest('#hero-camera-perm-btn')) {
      alert('Чтобы разрешить доступ к камере, откройте настройки браузера или нажмите значок настроек сайта в адресной строке и включите «Камера: Разрешить».');
      return;
    }
    if (e.target.closest('#hero-cam-exit-btn')) {
      const rec = getHeroCameraRecorder();
      rec.stopCamera();
      return;
    }
    if (e.target.closest('#hero-cam-cancel-countdown')) {
      const rec = getHeroCameraRecorder();
      rec.cancelCountdown();
      return;
    }
    if (e.target.closest('#btn-hero-switch-camera')) {
      getHeroCameraRecorder().switchCamera();
      return;
    }
    if (e.target.closest('#btn-open-technique')) {
      const curEx = document.getElementById('hero-select-ex')?.value || '';
      openTechniqueModal(curEx);
      return;
    }
    if (e.target.closest('#btn-hero-start-rec')) {
      const rec = getHeroCameraRecorder();
      const st = rec.state || rec.cameraState;
      if (st === CameraState.RECORDING || st === CameraState.COUNTDOWN || st === CameraState.STARTING) {
        rec.stopRecording();
      } else if (st === CameraState.CAMERA_READY) {
        const p = activeProfile();
        rec.athleteName = p?.name || 'АТЛЕТ';
        const ex = document.getElementById('hero-select-ex')?.value || 'Упражнение';
        rec.workoutTitle = ex;
        const startMode = localStorage.getItem('gto_hero_start_mode') || 'auto';
        if (startMode === 'manual') {
          rec.startRecordingManual();
        } else {
          rec.startVideoRecording();
        }
      } else {
        console.warn('[HERO CAMERA] Start recording rejected, state is:', st);
      }
      return;
    }
    if (e.target.closest('#btn-hero-toggle-orientation')) {
      heroCurrentOrientation = (heroCurrentOrientation === 'portrait') ? 'landscape' : 'portrait';
      const isLandscape = heroCurrentOrientation === 'landscape';
      const rec = getHeroCameraRecorder();
      rec.targetOrientation = heroCurrentOrientation;
      rec.setTimerConfig({ orientation: heroCurrentOrientation });

      const card = document.getElementById('hero-camera-viewfinder-card');
      if (card) {
        card.classList.toggle('is-landscape', isLandscape);
        card.classList.toggle('is-portrait', !isLandscape);
      }
      const canvas = document.getElementById('hero-cam-live-canvas');
      if (canvas) {
        canvas.width = isLandscape ? 1920 : 1080;
        canvas.height = isLandscape ? 1080 : 1920;
        canvas.classList.toggle('is-landscape', isLandscape);
        canvas.classList.toggle('is-portrait', !isLandscape);
      }
      // v117: контейнер рекордера тоже должен получить is-landscape, иначе ландшафт-CSS не применяется
      const wrap = document.getElementById('hero-camera-recorder-wrap');
      if (wrap) {
        wrap.classList.toggle('is-landscape', isLandscape);
        wrap.classList.toggle('is-portrait', !isLandscape);
      }
      const orientLbl = document.getElementById('hero-camera-orient-label');
      if (orientLbl) orientLbl.textContent = isLandscape ? '16:9' : '9:16';
      return;
    }
    if (e.target.closest('#hero-cam-add-rep')) {
      const rec = getHeroCameraRecorder();
      rec.addRep();
      const badge = document.getElementById('hero-active-rep-count');
      if (badge) badge.textContent = rec.reps;
      return;
    }
    if (e.target.closest('#hero-cam-add-norep')) {
      const rec = getHeroCameraRecorder();
      rec.addNoRep();
      const badge = document.getElementById('hero-active-norep-count');
      if (badge) badge.textContent = rec.noReps;
      return;
    }
    if (e.target.closest('#hero-cam-start-timer')) {
      getHeroCameraRecorder().startTimerNow();
      return;
    }
    if (e.target.closest('#hero-cam-start-attempt')) {
      // v117 ручной режим: запуск отсчёта 3-2-1 и таймера попытки во время активной записи
      const bar = document.getElementById('hero-start-attempt-bar');
      if (bar) bar.style.display = 'none';
      getHeroCameraRecorder().startTimerWithCountdown();
      return;
    }
    if (e.target.closest('#hero-cam-stop-rec')) {
      getHeroCameraRecorder().stopRecording();
      return;
    }
    if (e.target.closest('#hero-upload-server-btn')) {
      if (lastSavedRecord) {
        uploadHeroVideoRecord(lastSavedRecord);
      }
      return;
    }
    if (e.target.closest('#hero-cam-retry-btn')) {
      const rec = getHeroCameraRecorder();
      rec.startCamera();
      return;
    }
    if (e.target.closest('#hero-cam-check-perm-btn')) {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            stream.getTracks().forEach(t => t.stop());
            alert('✓ Доступ к камере подтверждён! Нажмите «Повторить» для запуска.');
            getHeroCameraRecorder().startCamera();
          })
          .catch(err => {
            alert('⚠️ Доступ к камере заблокирован в настройках браузера: ' + (err.message || err.name) + '\nПожалуйста, разрешите доступ к камере для этого сайта.');
          });
      }
      return;
    }
    if (e.target.closest('#hero-download-video-btn')) {
      getHeroCameraRecorder().downloadVideo();
      return;
    }
    if (e.target.closest('#hero-retry-rec-btn')) {
      const slot = document.getElementById('hero-preview-slot');
      if (slot) slot.innerHTML = '';
      document.body.classList.remove('hero-review-active');
      const rec = getHeroCameraRecorder();
      rec.clearRecordedVideo();
      if (!rec.stream) {
        rec.startCamera();
      } else {
        rec.state = CameraState.CAMERA_READY;
        rec.notify();
      }
      return;
    }
    if (e.target.closest('#hero-preview-close-btn') || e.target.closest('#hero-preview-back-btn')) {
      const slot = document.getElementById('hero-preview-slot');
      if (slot) slot.innerHTML = '';
      document.body.classList.remove('hero-review-active');
      const rec = getHeroCameraRecorder();
      if (rec) {
        rec.clearRecordedVideo();
        rec.stopCamera();
      }
      return;
    }

    // Красная кнопка СТОП по центру видоискателя (Скриншот 17)
    if (e.target.closest('#hero-rec-stop-ring-btn')) {
      getHeroCameraRecorder().stopRecording();
      return;
    }

    // Открытие Bottom Sheet ввода повторений (Скриншот 19)
    if (e.target.closest('#hero-btn-open-rep-sheet')) {
      const sheet = document.getElementById('hero-rep-sheet-backdrop');
      if (sheet) sheet.style.display = 'flex';
      return;
    }

    // Прямая выгрузка на сервер из деки ревью
    if (e.target.closest('#hero-btn-upload-server-direct')) {
      const sheet = document.getElementById('hero-rep-sheet-backdrop');
      if (sheet) sheet.style.display = 'flex';
      return;
    }

    // Степпер повторений (−)
    if (e.target.closest('#hero-step-minus')) {
      const valEl = document.getElementById('hero-rep-step-val');
      if (valEl) {
        const cur = Math.max(0, parseInt(valEl.textContent || '0', 10) - 1);
        valEl.textContent = cur;
      }
      return;
    }

    // Степпер повторений (+)
    if (e.target.closest('#hero-step-plus')) {
      const valEl = document.getElementById('hero-rep-step-val');
      if (valEl) {
        const cur = parseInt(valEl.textContent || '0', 10) + 1;
        valEl.textContent = cur;
      }
      return;
    }

    // Подтверждение повторений и выгрузка на сервер (Судьям)
    if (e.target.closest('#hero-btn-confirm-upload-reps')) {
      const valEl = document.getElementById('hero-rep-step-val');
      const count = valEl ? parseInt(valEl.textContent || '0', 10) : (lastSavedRecord?.reps || 0);
      if (lastSavedRecord) {
        lastSavedRecord.reps = count;
        saveHeroVideo(lastSavedRecord).then(() => {
          renderHeroSavedVideosList();
          uploadHeroVideoRecord(lastSavedRecord);
        }).catch(err => console.warn(err));
      }
      const draft = getHeroActiveDraft();
      let matched = null;
      if (activeDraftTargetExId) {
        matched = draft.exercises.find(item => item.id === activeDraftTargetExId);
      }
      if (!matched) {
        const ex = document.getElementById('hero-select-ex')?.value || lastSavedRecord?.exerciseTitle || '';
        matched = draft.exercises.find(item => item.title.toLowerCase().trim() === ex.toLowerCase().trim());
      }
      if (!matched) matched = draft.exercises.find(e => !e.recorded) || draft.exercises[0];
      if (matched) {
        matched.recorded = true;
        matched.reps = count;
        matched.videoLocalId = lastSavedRecord?.localId || null;
        matched.status = 'recorded';
      }
      saveHeroActiveDraft(draft);

      const repSheet = document.getElementById('hero-rep-sheet-backdrop');
      if (repSheet) repSheet.style.display = 'none';

      const draftSaved = document.getElementById('hero-draft-saved-backdrop');
      if (draftSaved) {
        const tEl = draftSaved.querySelector('.hero-saved-draft-title');
        const dEl = draftSaved.querySelector('.hero-saved-draft-desc');
        if (tEl) tEl.textContent = '☁ Выгрузка на сервер запущена';
        if (dEl) dEl.textContent = 'Видеозапись отправляется в судейскую коллегию ФМГТО. Статус проверки обновляется в списке сохранённых видео.';
        draftSaved.style.display = 'flex';
      }
      return;
    }

    // Подтверждение повторений и сохранение в черновик (Скриншот 19 -> 22)
    if (e.target.closest('#hero-btn-confirm-save-reps')) {
      const valEl = document.getElementById('hero-rep-step-val');
      const count = valEl ? parseInt(valEl.textContent || '0', 10) : (lastSavedRecord?.reps || 0);
      if (lastSavedRecord) {
        lastSavedRecord.reps = count;
        saveHeroVideo(lastSavedRecord).then(() => {
          renderHeroSavedVideosList();
        }).catch(err => console.warn(err));
      }
      // Обновляем драфт онлайн-заявки
      const draft = getHeroActiveDraft();
      let matched = null;
      if (activeDraftTargetExId) {
        matched = draft.exercises.find(item => item.id === activeDraftTargetExId);
      }
      if (!matched) {
        const ex = document.getElementById('hero-select-ex')?.value || lastSavedRecord?.exerciseTitle || '';
        matched = draft.exercises.find(item => item.title.toLowerCase().trim() === ex.toLowerCase().trim());
      }
      if (!matched) matched = draft.exercises.find(e => !e.recorded) || draft.exercises[0];
      if (matched) {
        matched.recorded = true;
        matched.reps = count;
        matched.videoLocalId = lastSavedRecord?.localId || null;
        matched.status = 'recorded';
      }
      saveHeroActiveDraft(draft);

      const repSheet = document.getElementById('hero-rep-sheet-backdrop');
      if (repSheet) repSheet.style.display = 'none';

      const draftSaved = document.getElementById('hero-draft-saved-backdrop');
      if (draftSaved) draftSaved.style.display = 'flex';
      return;
    }

    // Закрытие подтверждения «Заявка сохранена в черновиках» (Скриншот 22)
    if (e.target.closest('#hero-btn-close-draft-saved')) {
      const modal = document.getElementById('hero-fullscreen-review-modal');
      if (modal) modal.remove();
      const slot = document.getElementById('hero-preview-slot');
      if (slot) slot.innerHTML = '';
      document.body.classList.remove('hero-review-active');
      const rec = getHeroCameraRecorder();
      if (rec) {
        rec.clearRecordedVideo();
        rec.stopCamera();
      }
      renderHeroScreen(container);
      return;
    }

    // Пересъёмка видео из полноэкранного модального окна (Скриншот 18)
    if (e.target.closest('#hero-btn-review-reshoot')) {
      const modal = document.getElementById('hero-fullscreen-review-modal');
      if (modal) modal.remove();
      const slot = document.getElementById('hero-preview-slot');
      if (slot) slot.innerHTML = '';
      document.body.classList.remove('hero-review-active');
      const rec = getHeroCameraRecorder();
      if (rec) {
        rec.clearRecordedVideo();
        if (!rec.stream) {
          rec.startCamera();
        } else {
          rec.state = CameraState.CAMERA_READY;
          rec.notify();
        }
      }
      return;
    }

    // Отмена / Закрытие просмотра видео (Скриншот 18)
    if (e.target.closest('#hero-btn-review-cancel')) {
      const modal = document.getElementById('hero-fullscreen-review-modal');
      if (modal) modal.remove();
      const slot = document.getElementById('hero-preview-slot');
      if (slot) slot.innerHTML = '';
      document.body.classList.remove('hero-review-active');
      const rec = getHeroCameraRecorder();
      if (rec) {
        rec.clearRecordedVideo();
        rec.stopCamera();
      }
      return;
    }

    // Клик по кнопке [ Снять ] / [ Переснять ] в карточке черновика комплекса
    const draftRecordBtn = e.target.closest('[data-draft-record-ex]');
    if (draftRecordBtn) {
      const exName = draftRecordBtn.dataset.draftRecordEx;
      activeDraftTargetExId = draftRecordBtn.dataset.draftRecordExId || null;
      const selectEx = document.getElementById('hero-select-ex');
      if (selectEx) {
        let foundOpt = Array.from(selectEx.options).find(o => o.value.toLowerCase().trim() === exName.toLowerCase().trim());
        if (!foundOpt) {
          const opt = document.createElement('option');
          opt.value = exName;
          opt.textContent = exName;
          selectEx.appendChild(opt);
          selectEx.value = exName;
        } else {
          selectEx.value = foundOpt.value;
        }
      }
      const rec = getHeroCameraRecorder();
      rec.workoutTitle = exName;
      const p = activeProfile();
      rec.athleteName = p?.name || 'АТЛЕТ';
      rec.startCamera();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Открытие модального окна регистрации на турнир (Старты)
    const regTournBtn = e.target.closest('[data-hero-action="register-tournament"]');
    if (regTournBtn) {
      const tId = regTournBtn.dataset.tournamentId;
      openTournamentRegistrationModal(tId);
      return;
    }

    // Закрытие модального окна регистрации на турнир
    if (e.target.closest('#hero-close-tournament-reg-btn') || (e.target.classList.contains('hero-modal-backdrop') && e.target.id === 'hero-tournament-reg-modal')) {
      document.getElementById('hero-tournament-reg-modal')?.remove();
      return;
    }

    // Выбор формата участия в модальном окне регистрации
    const formatCard = e.target.closest('.hero-reg-format-card');
    if (formatCard && document.getElementById('hero-tournament-reg-modal')) {
      document.querySelectorAll('#hero-tournament-reg-modal .hero-reg-format-card').forEach(c => c.classList.remove('selected'));
      formatCard.classList.add('selected');
      return;
    }

    // Подтверждение регистрации на турнир
    const confirmRegBtn = e.target.closest('#hero-confirm-tournament-reg-btn');
    if (confirmRegBtn) {
      const tId = confirmRegBtn.dataset.tournamentId;
      const t = findTournamentById(tId);
      const selectedFormat = document.querySelector('#hero-tournament-reg-modal .hero-reg-format-card.selected')?.dataset.formatOpt || 'online';
      
      document.getElementById('hero-tournament-reg-modal')?.remove();

      if (selectedFormat === 'online') {
        const wodExs = (t && t.wodExercises && t.wodExercises.length === 3)
          ? t.wodExercises
          : ['ПОДТЯГИВАНИЯ НА ТУРНИКЕ (СТРОГИЕ)', 'ОТЖИМАНИЯ В УПОРЕ ЛЁЖА', 'РЫВОК ГИРИ (16 / 24 КГ)'];
        
        const newDraft = {
          tournamentId: t?.id || 'tourn_' + Date.now(),
          tournamentTitle: t?.name || 'Всероссийский турнир «Гордость и Слава 2026»',
          stageName: 'Онлайн-этап: Комплекс WOD',
          status: 'draft',
          judgeNote: '',
          exercises: wodExs.map((title, i) => ({
            id: `ex${i + 1}`,
            title: title.toUpperCase(),
            reps: 0,
            recorded: false,
            videoLocalId: null,
            status: 'pending'
          }))
        };
        saveHeroActiveDraft(newDraft);
        activeHeroTab = 'video';
        renderHeroScreen(container);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        alert(`✓ Вы зарегистрированы на онлайн-отбор турнира «${t?.name || 'Турнир'}»!\n\nНиже представлена карточка комплекса с 3 упражнениями. Запишите все 3 видео по стандартам ФМГТО для отправки на судейство.`);
      } else {
        // Очный старт «Иду на рекорд»
        try {
          const rawStore = localStorage.getItem('gto_admin_store_v1');
          const adStore = rawStore ? JSON.parse(rawStore) : {};
          if (!adStore.applications) adStore.applications = [];
          const p = activeProfile() || { name: 'Атлет', uin: '—' };
          adStore.applications.unshift({
            id: 'APP-' + Date.now().toString().slice(-6),
            tournamentId: t?.id,
            tournamentName: t?.name || 'Официальный старт',
            athleteName: p.name || 'Атлет',
            uin: p.uin || '—',
            region: p.region || 'Москва',
            format: 'offline',
            discipline: 'Очный зачёт «Иду на рекорд»',
            claimedResult: 'Ожидает старта',
            status: 'new',
            submittedDate: new Date().toLocaleDateString('ru-RU')
          });
          localStorage.setItem('gto_admin_store_v1', JSON.stringify(adStore));
        } catch (_) {}
        alert(`✓ Заявка на очный старт турнира «${t?.name || 'Турнир'}» («Иду на рекорд») успешно зарегистрирована! Информация передана в оргкомитет.`);
      }
      return;
    }

    // Отправка активного черновика онлайн-заявки на судейство (Правило 3 видео)
    if (e.target.closest('#hero-btn-submit-draft-app')) {
      const draft = getHeroActiveDraft();
      const totalCount = draft.exercises?.length || 3;
      const recordedCount = draft.exercises ? draft.exercises.filter(e => e.recorded).length : 0;
      if (recordedCount < totalCount) {
        alert(`⚠️ Для отправки единой заявки на судейство необходимо записать все ${totalCount} упражнения комплекса (сейчас записано ${recordedCount} из ${totalCount}).`);
        return;
      }
      draft.status = 'submitted';
      saveHeroActiveDraft(draft);

      const p = activeProfile() || { name: 'Атлет', uin: '—' };
      getAllHeroVideos().then(vids => {
        const exercisesWithVids = draft.exercises.map(ex => {
          const mv = (vids || []).find(v => v.localId === ex.videoLocalId);
          return {
            id: ex.id,
            title: ex.title,
            reps: ex.reps || 0,
            videoLocalId: ex.videoLocalId,
            videoUrl: mv?.serverUrl || (mv?.blob ? URL.createObjectURL(mv.blob) : ''),
            status: 'pending'
          };
        });

        // Создаём объединённую заявку комплекса в админке
        try {
          const rawStore = localStorage.getItem('gto_admin_store_v1');
          const adStore = rawStore ? JSON.parse(rawStore) : {};
          if (!adStore.applications) adStore.applications = [];
          const appId = 'APP-WOD-' + Date.now().toString().slice(-6);
          const complexApp = {
            id: appId,
            tournamentId: draft.tournamentId || 'gordost-i-slava-2026',
            tournamentName: draft.tournamentTitle || 'Всероссийский турнир «Гордость и Слава 2026»',
            athleteName: p.name || 'Алексей Смирнов (Вы)',
            uin: p.uin || '24-77-0019283',
            region: p.region || 'Москва',
            format: 'online',
            discipline: 'Онлайн-комплекс WOD (3 упражнения)',
            claimedResult: exercisesWithVids.map(e => `${e.reps} повт.`).join(' / '),
            status: 'judging',
            submittedDate: new Date().toLocaleDateString('ru-RU'),
            videoUrl: exercisesWithVids[0]?.videoUrl || '',
            selectedExerciseIdx: 0,
            exercises: exercisesWithVids,
            rawVideo: {
              reps: exercisesWithVids[0]?.reps || 0,
              noReps: 0
            }
          };
          adStore.applications.unshift(complexApp);
          localStorage.setItem('gto_admin_store_v1', JSON.stringify(adStore));
        } catch (_) {}

        if (vids && vids.length) {
          vids.forEach(v => {
            if (draft.exercises.some(ex => ex.videoLocalId === v.localId)) {
              uploadHeroVideoRecord(v);
            }
          });
        }
      }).catch(_ => {});

      alert('✓ Единая заявка со всеми 3 видеозаписями комплекса успешно отправлена в судейскую коллегию ФМГТО! Статус рассмотрения обновляется в карточке.');
      renderHeroScreen(container);
      return;
    }

    // Сохранённые видео: кнопка загрузить файл
    if (e.target.closest('#hero-btn-upload-file')) {
      const inp = document.getElementById('hero-upload-input');
      if (inp) inp.click();
      return;
    }

    // Сохранённые видео: действия над карточкой видео
    const vidActBtn = e.target.closest('[data-video-action]');
    if (vidActBtn) {
      const actType = vidActBtn.dataset.videoAction;
      const locId = vidActBtn.dataset.localId;
      if (locId) {
        if (actType === 'play') {
          getHeroVideo(locId).then(v => {
            if (v) playVideoInPreviewModal(v);
          }).catch(err => alert('Ошибка открытия видео: ' + err.message));
        } else if (actType === 'download') {
          getHeroVideo(locId).then(v => {
            if (v && v.blob) {
              const url = URL.createObjectURL(v.blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hero_gto_${locId}.mp4`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            } else {
              alert('Файл видео недоступен');
            }
          }).catch(err => alert('Ошибка скачивания: ' + err.message));
        } else if (actType === 'submit-judge') {
          getHeroVideo(locId).then(v => {
            if (v) uploadHeroVideoRecord(v);
          }).catch(err => alert('Ошибка отправки: ' + err.message));
        } else if (actType === 'delete') {
          if (confirm('Удалить эту видеозапись с устройства?')) {
            deleteHeroVideo(locId).then(() => {
              renderHeroSavedVideosList();
            }).catch(err => alert('Ошибка удаления: ' + err.message));
          }
        }
      }
      return;
    }

    // Судейский режим: открытие попытки из списка
    const judgeOpenBtn = e.target.closest('[data-judge-open-id]');
    if (judgeOpenBtn) {
      const vidId = judgeOpenBtn.getAttribute('data-judge-open-id');
      const v = judgeVideosCache.find(item => String(item.localId || item.id) === String(vidId));
      if (v) {
        judgeActiveVideoId = vidId;
        judgeActiveVideo = v;
        judgeEvents = Array.isArray(v.judgeResult?.events) ? [...v.judgeResult.events] : [];
        judgeVerdict = v.judgeResult?.verdict || 'APPROVED';
        judgeComment = v.judgeResult?.comment || '';
        judgePlaybackRate = 1.0;
        renderHeroScreen(container);
      }
      return;
    }

    if (e.target.closest('#btn-refresh-judge-queue')) {
      loadJudgeQueue();
      return;
    }

    // Судейский режим: действия внутри панели проверки
    const judgeActionBtn = e.target.closest('[data-judge-action]');
    if (judgeActionBtn) {
      const act = judgeActionBtn.getAttribute('data-judge-action');
      const video = document.getElementById('judge-video-player');

      if (act === 'back') {
        judgeActiveVideoId = null;
        judgeActiveVideo = null;
        renderHeroScreen(container);
      } else if (act === 'play-pause') {
        if (video) video.paused ? video.play() : video.pause();
      } else if (act === 'seek-back') {
        if (video) video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (act === 'seek-forward') {
        if (video) video.currentTime = Math.min(video.duration || 9999, video.currentTime + 5);
      } else if (act === 'valid-rep') {
        addJudgeEvent('valid_rep');
      } else if (act === 'no-rep') {
        addJudgeEvent('no_rep');
      } else if (act === 'undo-rep') {
        judgeEvents.pop();
        updateJudgeCounters();
        renderJudgeTimelineMarkers();
      } else if (act === 'reset-reps') {
        if (confirm('Сбросить все отмеченные судейские повторения?')) {
          judgeEvents = [];
          updateJudgeCounters();
          renderJudgeTimelineMarkers();
        }
      } else if (act === 'save-verdict') {
        applyJudgeDecision(container);
      }
      return;
    }

    // Судейский режим: выбор скорости
    const speedBtn = e.target.closest('[data-judge-speed]');
    if (speedBtn) {
      const sp = parseFloat(speedBtn.getAttribute('data-judge-speed') || '1.0');
      judgePlaybackRate = sp;
      const video = document.getElementById('judge-video-player');
      if (video) video.playbackRate = sp;
      container.querySelectorAll('.judge-speed-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.getAttribute('data-judge-speed')) === sp);
      });
      return;
    }

    // Судейский режим: выбор вердикта
    const verdictOpt = e.target.closest('[data-judge-verdict]');
    if (verdictOpt) {
      judgeVerdict = verdictOpt.getAttribute('data-judge-verdict');
      container.querySelectorAll('.judge-verdict-opt').forEach(b => {
        b.classList.toggle('selected', b.getAttribute('data-judge-verdict') === judgeVerdict);
      });
      return;
    }

    // Клик по маркеру таймлайна судьи для мгновенного перехода
    const markerEl = e.target.closest('.judge-timeline-marker');
    if (markerEl) {
      const seekMs = parseFloat(markerEl.getAttribute('data-seek-ms') || '0');
      const video = document.getElementById('judge-video-player');
      if (video) video.currentTime = seekMs / 1000;
      return;
    }
  });

  container.addEventListener('change', e => {
    if (e.target.id === 'hero-select-ex') {
      const rec = getHeroCameraRecorder();
      rec.workoutTitle = e.target.value;
    }
    if (e.target.id === 'hero-select-countdown') {
      const rec = getHeroCameraRecorder();
      const val = Number(e.target.value || 0);
      rec.setCountdownSeconds(val);
      localStorage.setItem('gto_countdown_seconds', val);
    }
    if (e.target.id === 'hero-select-format') {
      const val = e.target.value;
      heroCurrentOrientation = val;
      const isLandscape = val === 'landscape';
      const rec = getHeroCameraRecorder();
      rec.targetOrientation = val;
      rec.setTimerConfig({ orientation: val });

      const card = document.getElementById('hero-camera-viewfinder-card');
      if (card) {
        card.classList.toggle('is-landscape', isLandscape);
        card.classList.toggle('is-portrait', !isLandscape);
      }
      const canvas = document.getElementById('hero-cam-live-canvas');
      if (canvas) {
        canvas.width = isLandscape ? 1920 : 1080;
        canvas.height = isLandscape ? 1080 : 1920;
        canvas.classList.toggle('is-landscape', isLandscape);
        canvas.classList.toggle('is-portrait', !isLandscape);
      }
      // v117: синхронизируем класс контейнера рекордера для ландшафт-CSS
      const wrap = document.getElementById('hero-camera-recorder-wrap');
      if (wrap) {
        wrap.classList.toggle('is-landscape', isLandscape);
        wrap.classList.toggle('is-portrait', !isLandscape);
      }
      const orientLbl = document.getElementById('hero-camera-orient-label');
      if (orientLbl) orientLbl.textContent = isLandscape ? '16:9' : '9:16';
    }
    if (e.target.id === 'hero-select-facing') {
      const val = e.target.value;
      const rec = getHeroCameraRecorder();
      if (rec.facingMode !== val) {
        rec.switchCamera(val);
      }
    }
    if (e.target.id === 'hero-select-mode') {
      const val = e.target.value === 'manual' ? 'manual' : 'auto';
      localStorage.setItem('gto_hero_start_mode', val);
      // обновить подпись главной кнопки без полного ре-рендера
      const startBtn = document.getElementById('btn-hero-start-rec');
      const lbl = startBtn?.querySelector('span:last-child');
      if (lbl) lbl.textContent = val === 'manual' ? 'НАЧАТЬ ЗАПИСЬ' : 'НАЧАТЬ ПОПЫТКУ';
    }
    if (e.target.id === 'hero-upload-input' && e.target.files && e.target.files.length) {
      handleUserVideoFileUpload(e.target.files[0]);
    }
  });
}

function setScanBtn(text) {
  const b = document.getElementById('btn-scan-toggle');
  if (b) b.querySelector('span').textContent = text;
}

async function saveProfileFromForm(container) {
  const name = (container.querySelector('#hf-name')?.value || '').trim();
  if (!name) { alert('Укажите имя и фамилию.'); return; }
  const birthYear = (container.querySelector('#hf-year')?.value || '').trim();
  const gender = container.querySelector('#hf-gender')?.value || '';
  const uin = (container.querySelector('#hf-uin')?.value || '').trim();
  const club = (container.querySelector('#hf-club')?.value || '').trim();
  const region = (container.querySelector('#hf-region')?.value || '').trim();
  const email = (container.querySelector('#hf-email')?.value || '').trim();
  const phone = (container.querySelector('#hf-phone')?.value || '').trim();

  const saveBtn = container.querySelector('#hf-save-btn');
  if (saveBtn) saveBtn.innerHTML = '<span>Поиск в архиве соревнований...</span>';

  let resolveRes = null;
  try {
    resolveRes = await resolveAthleteIdentity({ name, birthYear, gender, uin, region, email, phone });
  } catch (err) {
    console.warn('[Identity Resolver] Error:', err);
  }

  if (saveBtn) saveBtn.innerHTML = '<span>Сохранить и привязать историю</span>';

  if (resolveRes && (resolveRes.match_level === 'HIGH_CONFIDENCE' || resolveRes.match_level === 'POSSIBLE_MATCH') && resolveRes.best_match) {
    showIdentityMatchDialog(container, resolveRes.best_match, resolveRes.top_score, {
      name, birthYear, gender, uin, club, region, email, phone
    });
    return;
  }

  await completeAthleteSave(container, {
    name, birthYear, gender, uin, club, region, email, phone,
    confirmed_athlete_id: (resolveRes?.match_level === 'EXACT' && resolveRes?.best_match) ? resolveRes.best_match.athlete_id : null
  });
}

function showIdentityMatchDialog(container, candidate, score, formValues) {
  const existingOverlay = document.getElementById('hero-identity-modal');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hero-identity-modal';
  overlay.className = 'hero-identity-confirm-overlay';
  overlay.innerHTML = `
    <div class="hero-identity-confirm-card">
      <div class="identity-confirm-badge">🎯 Найден спортивный профиль в архиве (${score}% совпадение)</div>
      <h3 class="identity-confirm-title">${esc(candidate.name)}</h3>
      <p class="identity-confirm-region">📍 ${esc(candidate.region || 'Россия')}</p>
      
      <div class="identity-confirm-stats">
        <div><b>${candidate.starts_count || 0}</b><small>стартов</small></div>
        <div><b>${candidate.wins_count || 0}</b><small>побед</small></div>
        <div><b>${candidate.podiums_count || 0}</b><small>подиумов</small></div>
        <div><b>${candidate.records_count || 0}</b><small>рекордов</small></div>
      </div>

      <p style="font-size:13.5px;color:#cbd5e1;line-height:1.5;margin:0 0 16px">
        Мы нашли ваши результаты в официальных протоколах и Кубках Федерации. Привязать эту историю к вашему личному кабинету?
      </p>

      <div class="identity-confirm-actions">
        <button type="button" class="pass-action-btn primary" id="btn-confirm-link">
          <span>✓ Да, это мой профиль (Объединить историю)</span>
        </button>
        <button type="button" class="pass-action-btn secondary" id="btn-force-create" style="background:rgba(255,255,255,0.06);color:#94a3b8">
          <span>Нет, это другой человек (Создать новый)</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#btn-confirm-link').addEventListener('click', async () => {
    overlay.remove();
    await completeAthleteSave(container, {
      ...formValues,
      confirmed_athlete_id: candidate.athlete_id
    });
  });

  overlay.querySelector('#btn-force-create').addEventListener('click', async () => {
    overlay.remove();
    await completeAthleteSave(container, {
      ...formValues,
      force_create: true
    });
  });
}

async function completeAthleteSave(container, formValues) {
  let backendRes = null;
  try {
    backendRes = await registerOrLinkProfile(formValues);
  } catch (e) {
    console.warn('[Register or Link] Backend call warning:', e);
  }

  const athlete = (backendRes && backendRes.athlete) ? backendRes.athlete : null;

  const prof = {
    athlete_id: athlete ? athlete.athlete_id : ('ATH-' + Date.now().toString().slice(-7)),
    name: athlete ? athlete.name : formValues.name,
    birthYear: (athlete && athlete.birth_year) ? athlete.birth_year : formValues.birthYear,
    gender: (athlete && athlete.gender) ? athlete.gender : formValues.gender,
    uin: (athlete && athlete.uin) ? athlete.uin : formValues.uin,
    club: (athlete && athlete.club) ? athlete.club : formValues.club,
    region: (athlete && athlete.region) ? athlete.region : formValues.region,
    email: (athlete && athlete.email) ? athlete.email : formValues.email,
    phone: (athlete && athlete.phone) ? athlete.phone : formValues.phone,
    starts_count: athlete ? athlete.starts_count : 0,
    wins_count: athlete ? athlete.wins_count : 0,
    podiums_count: athlete ? athlete.podiums_count : 0,
    records_count: athlete ? athlete.records_count : 0,
    competitions: (athlete && Array.isArray(athlete.competitions)) ? athlete.competitions : [],
    records: (athlete && Array.isArray(athlete.records)) ? athlete.records : [],
    role: 'Атлет'
  };

  if (store._draft || !store.profiles.length) {
    store.profiles.push(prof);
    store.active = store.profiles.length - 1;
  } else {
    store.profiles[store.active] = prof;
  }

  delete store._draft;
  editingProfile = false;
  saveStore(store);
  renderHeroScreen(container);
}

function addResult(container) {
  const ex = (container.querySelector('#hr-ex')?.value || '').trim();
  const res = (container.querySelector('#hr-res')?.value || '').trim();
  if (!ex || !res) { alert('Заполните упражнение и результат.'); return; }
  pushResult({ ex, res });
  renderHeroScreen(container);
}

function delResult(container, idx) {
  const key = 'hero_results_' + store.active;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
  arr.splice(idx, 1);
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch (_) {}
  renderHeroScreen(container);
}

function pushResult(r) {
  const key = 'hero_results_' + store.active;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
  arr.unshift({ ex: r.ex, res: r.res, date: new Date().toLocaleDateString('ru-RU') });
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch (_) {}
}

function saveSetToJournal() {
  if (pendingSet) {
    pushResult({ ex: pendingSet.ex, res: pendingSet.res });
  }
  const b = document.getElementById('hero-set-save');
  if (b) {
    b.innerHTML = `<div class="hero-set-saved" style="pointer-events:none;margin-top:10px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:12px;padding:10px 14px;color:#4ade80;font-weight:700;font-size:13px;text-align:center;transition:opacity 0.3s ease">✓ Результат сохранён в «Мои результаты»</div>`;
    setTimeout(() => {
      if (b) b.innerHTML = '';
    }, 2000);
  }
}
if (typeof window !== 'undefined') {
  window.saveSetToJournal = saveSetToJournal;
}

function openQrFull() {
  const p = activeProfile();
  if (!p) return;
  const age = p.birthYear ? (new Date().getFullYear() - Number(p.birthYear)) : null;
  const stage = age ? ageToStage(age) : '—';
  const qrText = passText(p, age, stage);
  let modal = document.getElementById('hero-qr-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hero-qr-modal';
    modal.className = 'diploma-modal-backdrop';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="diploma-modal-dialog" style="text-align:center;max-width:360px">
      <button class="diploma-modal-close" id="hero-qr-close">✕</button>
      <div style="background:#fff;border-radius:16px;padding:14px;display:inline-block;margin:6px 0 14px">${realQrSvg(qrText, 260)}</div>
      <div style="font-family:'TT Squares','Unbounded',sans-serif;font-size:18px;color:#fff">${esc(p.name)}</div>
      ${p.uin ? `<div style="color:#94a3b8;font-size:13px;margin-top:4px">УИН: ${esc(p.uin)}</div>` : ''}
      <div style="color:#64748b;font-size:11px;margin-top:12px;line-height:1.5">
        Личная карточка атлета для сканирования на площадке.
      </div>
    </div>`;
  modal.hidden = false;
  modal.onclick = ev => {
    if (ev.target === modal || ev.target.id === 'hero-qr-close') modal.hidden = true;
  };
}

// =========================================================================
// ЭТАП 1: Стандарты выполнения упражнений (техника)
// =========================================================================

// Модальное окно техники и стандартов выполнения
function openTechniqueModal(initialEx) {
  let modal = document.getElementById('hero-technique-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hero-technique-modal';
    modal.className = 'diploma-modal-backdrop';
    document.body.appendChild(modal);
  }

  const items = GTO_TECHNIQUES || [];
  let currentId = items[0]?.id || 'pull_up';
  if (initialEx) {
    const low = initialEx.toLowerCase();
    if (low.includes('подтягиван')) currentId = 'pull_up';
    else if (low.includes('рывок')) currentId = 'kettlebell_snatch';
    else if (low.includes('отжиман')) currentId = 'push_up';
    else if (low.includes('наклон') || low.includes('гибкост')) currentId = 'forward_bend';
    else if (low.includes('прыжок')) currentId = 'standing_broad_jump';
  }

  const renderContent = id => {
    const cur = items.find(x => x.id === id) || items[0];
    if (!cur) return '';
    return `
      <div class="technique-chip-row">
        ${items.map(it => `
          <button class="technique-chip ${it.id === id ? 'active' : ''}" data-tech-id="${it.id}">${esc(it.title)}</button>
        `).join('')}
      </div>

      <div class="technique-section">
        <h4 style="color:#38bdf8">📌 Оборудование и исходное положение</h4>
        <p style="font-size:13px;color:#cbd5e1;margin:0 0 6px"><b>Инвентарь:</b> ${esc(cur.equipment)}</p>
        <p style="font-size:13px;color:#cbd5e1;margin:0"><b>ИП:</b> ${esc(cur.startingPosition)}</p>
      </div>

      <div class="technique-section">
        <h4 style="color:#22c55e">✓ Критерии зачёта повторения (Rep standard)</h4>
        <ul>${cur.repStandard.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>

      <div class="technique-section">
        <h4 style="color:#ef4444">✗ Ошибки (No-Rep)</h4>
        <ul>${cur.noRep.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>

      <div class="technique-section" style="border-color:rgba(245,158,11,0.4)">
        <h4 style="color:#f59e0b">📐 Рекомендации по установке камеры для фиксации</h4>
        <ul>
          <li><b>Ракурс сбоку под 90° (в профиль):</b> в кадре обязательно должны быть видны стопы, поясница, плечи и снаряд/перекладина.</li>
          <li><b>Высота камеры:</b> 1.0–1.2 метра от пола (на штативе или подставке).</li>
          <li><b>Освещение:</b> источник света перед вами или сверху, избегайте съёмки против яркого окна.</li>
          <li><b>Звук:</b> оставьте микрофон включённым — звуковые сигналы таймера фиксируют время старта.</li>
        </ul>
      </div>`;
  };

  modal.innerHTML = `
    <div class="technique-modal-dialog">
      <button class="diploma-modal-close" id="hero-technique-close">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <img src="./assets/logo-tight.png" width="28" height="28" alt="">
        <div>
          <h3 style="margin:0;font-size:18px;color:#fff;font-family:'TT Squares','Unbounded',sans-serif">Судейские стандарты выполнения</h3>
          <small style="color:#94a3b8">Официальные методические рекомендации Министерства спорта РФ</small>
        </div>
      </div>
      <div id="tech-modal-body">${renderContent(currentId)}</div>
    </div>`;

  modal.hidden = false;
  modal.onclick = ev => {
    if (ev.target === modal || ev.target.id === 'hero-technique-close') modal.hidden = true;
    const chip = ev.target.closest('[data-tech-id]');
    if (chip) {
      const body = modal.querySelector('#tech-modal-body');
      if (body) body.innerHTML = renderContent(chip.dataset.techId);
    }
  };
}

// =========================================================================
// ЭТАП 2: Соревновательный бенчмаркинг (Рекорды России + Нормативы ГТО)
// =========================================================================

function benchmarkResult(exName, resStr, athlete) {
  if (!athlete) return null;
  const age = athlete.birthYear ? (new Date().getFullYear() - Number(athlete.birthYear)) : 25;
  const sex = athlete.gender === 'W' ? 'W' : 'M';

  // Извлекаем числовое значение результата
  let val = 0;
  const m = String(resStr).match(/(\d+(?:[.,]\d+)?)/);
  if (m) val = parseFloat(m[1].replace(',', '.'));

  const exLower = (exName || '').toLowerCase();

  // 1. Поиск рекорда России
  const allRecords = getUnifiedRecords();
  const matchedRecords = (allRecords || []).filter(r => {
    const rSex = r.sex || r.gender;
    if (rSex && rSex !== sex) return false;
    const rd = (r.discipline || r.ex || '').toLowerCase();
    if (exLower.includes('подтягиван') && rd.includes('подтягиван')) return true;
    if (exLower.includes('рывок') && rd.includes('рывок')) return true;
    if (exLower.includes('отжиман') && rd.includes('отжиман')) return true;
    if (exLower.includes('пресс') && rd.includes('пресс')) return true;
    if (exLower.includes('планк') && (rd.includes('вис') || rd.includes('планк'))) return true;
    if (exLower.includes('прыжок') && rd.includes('прыжок')) return true;
    if (exLower.includes('гибкост') && rd.includes('гибкост')) return true;
    if (exLower.includes('приседан') && rd.includes('приседан')) return true;
    return false;
  });

  let matchedRecord = null;
  for (const r of matchedRecords) {
    const grp = (r.ageGroup || '').match(/(\d+)-(\d+)/);
    if (grp) {
      const minA = parseInt(grp[1]), maxA = parseInt(grp[2]);
      if (age >= minA && age <= maxA) { matchedRecord = r; break; }
    }
  }
  if (!matchedRecord && matchedRecords.length) matchedRecord = matchedRecords[0];

  let recordPct = null;
  if (matchedRecord && val > 0) {
    let recVal = 0;
    if (matchedRecord.result.includes(':')) {
      const parts = matchedRecord.result.split(':').map(Number);
      if (parts.length === 3) recVal = parts[0]*60 + parts[1] + parts[2]/100;
      else if (parts.length === 2) recVal = parts[0]*60 + parts[1];
    } else {
      recVal = parseFloat(matchedRecord.result);
    }
    if (recVal > 0) recordPct = Math.round((val / recVal) * 100);
  }

  // 2. Определение норматива знака ГТО
  let ageKey = "18-29";
  if (age < 9) ageKey = "6-8";
  else if (age <= 10) ageKey = "9-10";
  else if (age <= 12) ageKey = "11-12";
  else if (age <= 15) ageKey = "13-15";
  else if (age <= 17) ageKey = "16-17";
  else if (age <= 29) ageKey = "18-29";
  else if (age <= 39) ageKey = "30-39";
  else if (age <= 49) ageKey = "40-49";
  else if (age <= 59) ageKey = "50-59";
  else if (age <= 69) ageKey = "60-69";
  else ageKey = "70+";

  let medal = null;
  const list = GTO_NORMS?.[ageKey]?.[sex] || GTO_NORMS?.["18-29"]?.[sex] || [];
  for (const n of list) {
    const nn = (n.name || '').toLowerCase();
    let hit = false;
    if (exLower.includes('подтягиван') && nn.includes('подтягиван')) hit = true;
    else if (exLower.includes('отжиман') && nn.includes('отжимания')) hit = true;
    else if (exLower.includes('рывок') && nn.includes('рывок')) hit = true;
    else if (exLower.includes('пресс') && (nn.includes('туловищ') || nn.includes('пресс'))) hit = true;
    else if (exLower.includes('наклон') && nn.includes('наклон')) hit = true;
    else if (exLower.includes('прыжок') && nn.includes('прыжок')) hit = true;

    if (hit && val > 0) {
      if (val >= n.gold) medal = 'gold';
      else if (val >= n.silver) medal = 'silver';
      else if (val >= n.bronze) medal = 'bronze';
      break;
    }
  }

  return { matchedRecord, recordPct, medal };
}

// =========================================================================
// ЭТАП 3: Генератор Stories 1080×1350 и Персональный Диплом
// =========================================================================

function openStoriesGenerator(resItem) {
  const p = activeProfile();
  if (!p) return;
  const age = p.birthYear ? (new Date().getFullYear() - Number(p.birthYear)) : null;
  const stage = age ? ageToStage(age) : '—';
  const bench = benchmarkResult(resItem.ex, resItem.res, p);

  let modal = document.getElementById('hero-stories-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hero-stories-modal';
    document.body.appendChild(modal);
  }
  modal.className = 'hero-certificate-viewer-modal';

  modal.innerHTML = `
    <!-- Фиксированная верхняя панель (Sticky Toolbar) -->
    <header class="cert-toolbar">
      <div class="cert-toolbar-info">
        <span class="cert-pill">Документ Федерации многоборья ГТО</span>
        <h3 class="cert-title">Сертификат результата</h3>
      </div>
      <div class="cert-toolbar-actions">
        <button type="button" class="cert-btn primary" id="btn-download-stories" title="Скачать PNG 1080×1350">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Скачать PNG</span>
        </button>
        <button type="button" class="cert-btn secondary" id="btn-save-stories-profile" title="Сохранить в личный кабинет">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Сохранить</span>
        </button>
        <button type="button" class="cert-btn secondary" id="btn-share-stories" title="Поделиться в VK или Telegram">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>Поделиться</span>
        </button>
        <button type="button" class="cert-btn close" id="hero-stories-close" aria-label="Закрыть">✕</button>
      </div>
    </header>

    <!-- Скроллируемая рабочая область с естественной прокруткой и масштабированием -->
    <main class="cert-scroll-viewport" id="hero-cert-viewport">
      <div class="cert-canvas-container">
        <canvas id="stories-canvas" class="cert-document-canvas" width="1080" height="1350"></canvas>
      </div>

      <div class="cert-mobile-bottom-bar">
        <button type="button" class="cert-btn-mobile primary" id="btn-download-stories-mobile">
          ⬇ Скачать сертификат (PNG 1080×1350)
        </button>
        <button type="button" class="cert-btn-mobile secondary" id="btn-share-stories-mobile">
          📲 Поделиться результатом в соцсетях
        </button>
      </div>
    </main>`;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const canvas = modal.querySelector('#stories-canvas');
  const ctx = canvas.getContext('2d');
  renderStoriesCanvas(ctx, canvas.width, canvas.height, p, age, stage, resItem, bench);

  modal.onclick = ev => {
    if (ev.target.id === 'hero-stories-close') {
      modal.hidden = true;
      document.body.style.overflow = '';
    }
    if (ev.target.closest('#btn-download-stories') || ev.target.closest('#btn-download-stories-mobile')) {
      downloadStoriesCanvas(canvas);
    }
    if (ev.target.closest('#btn-share-stories') || ev.target.closest('#btn-share-stories-mobile')) {
      shareStoriesCanvas(canvas);
    }
    if (ev.target.closest('#btn-save-stories-profile')) {
      const key = 'hero_results_' + store.active;
      let results = [];
      try { results = JSON.parse(localStorage.getItem(key)) || []; } catch (_) {}
      const exists = results.some(r => r.ex === resItem.ex && r.res === resItem.res && r.date === resItem.date);
      if (!exists) {
        results.unshift(resItem);
        try { localStorage.setItem(key, JSON.stringify(results)); } catch (_) {}
      }
      const btn = modal.querySelector('#btn-save-stories-profile');
      if (btn) {
        btn.innerHTML = '<span>✓ Сохранено</span>';
        btn.style.borderColor = '#10b981';
        btn.style.color = '#34d399';
      }
    }
  };
}

function renderStoriesCanvas(ctx, W, H, p, age, stage, resItem, bench) {
  // Фон
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0b1329');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Свечение вверху
  const glow = ctx.createRadialGradient(W / 2, 160, 40, W / 2, 160, 450);
  glow.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
  glow.addColorStop(0.7, 'rgba(56, 189, 248, 0.1)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 600);

  // Сетка декоративных полос
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Шапка: Бейдж «ГЕРОЙ ГТО»
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 160, 90, 320, 50, 25);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 22px "TT Squares", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ ГЕРОЙ ГТО · ЛИЧНЫЙ ЗАЧЁТ', W / 2, 123);

  // Федерация
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('ФЕДЕРАЦИЯ МНОГОБОРЬЯ ГТО РОССИИ', W / 2, 175);

  // Имя атлета
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px "TT Squares", "Unbounded", sans-serif';
  ctx.fillText((p.name || 'АТЛЕТ').toUpperCase(), W / 2, 260);

  // Ступень и клуб
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px "TT Squares", sans-serif';
  const subText = `${stage} СТУПЕНЬ ВФСК ГТО${age ? ' · ' + age + ' ЛЕТ' : ''}${p.club ? ' · ' + p.club.toUpperCase() : ''}`;
  ctx.fillText(subText, W / 2, 305);

  // Основная карточка результата (стекло)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(80, 360, W - 160, 480, 28);
  ctx.fill(); ctx.stroke();

  // Название упражнения
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 22px "TT Squares", sans-serif';
  ctx.fillText('ДИСЦИПЛИНА', W / 2, 420);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 36px "TT Squares", sans-serif';
  ctx.fillText(String(resItem.ex || '').toUpperCase(), W / 2, 475);

  // Большие цифры результата
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 100px "TT Squares", "Unbounded", monospace';
  ctx.fillText(String(resItem.res || ''), W / 2, 600);

  // Дата фиксации
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Зафиксировано видеофиксатором · ${resItem.date || new Date().toLocaleDateString('ru-RU')}`, W / 2, 650);

  // Бенчмарк-значок в карточке
  if (bench) {
    let badgeText = '';
    let badgeCol = '#f59e0b';
    if (bench.medal === 'gold') {
      badgeText = '🥇 ВЫПОЛНЕН НОРМАТИВ ЗОЛОТОГО ЗНАКА ГТО';
    } else if (bench.matchedRecord && bench.recordPct) {
      badgeText = `🏆 ${bench.recordPct}% ОТ РЕКОРДА РОССИИ (${bench.matchedRecord.result})`;
      badgeCol = '#38bdf8';
    }
    if (badgeText) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = badgeCol;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(140, 690, W - 280, 64, 14);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = badgeCol;
      ctx.font = 'bold 22px "TT Squares", sans-serif';
      ctx.fillText(badgeText, W / 2, 731);
    }
  }

  // Нижняя зона: QR-код для сканирования и верификации
  const qrPass = passText(p, age, stage);
  const qrSize = 160;
  const qrX = 120, qrY = 900;
  drawQrOnCanvas(ctx, qrPass, qrX, qrY, qrSize);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "TT Squares", sans-serif';
  ctx.fillText('ПРОВЕРЬ КАРТОЧКУ АТЛЕТА', 320, 950);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  ctx.fillText('Наведите камеру смартфона на QR-код для подтверждения.', 320, 990);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px "TT Squares", sans-serif';
  ctx.fillText('gto.com.ru · #ГеройГТО #ИгрыГТО', 320, 1030);

  // Подвал
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = '16px sans-serif';
  ctx.fillText('Федерация многоборья ГТО России · Официальный модуль экосистемы', W / 2, 1260);
}

function downloadStoriesCanvas(canvas) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hero-gto-stories-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function shareStoriesCanvas(canvas) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], 'hero-gto-stories.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'Мой результат в Герой ГТО',
        text: 'Мой результат фиксации тренировки в Федерации многоборья ГТО России!'
      }).catch(() => {});
    } else {
      downloadStoriesCanvas(canvas);
    }
  });
}

// =========================================================================
// ЭТАП 3.5: Полноэкранный просмотрщик диплома (#hero-diploma-viewer)
// =========================================================================

function renderHeroDiplomaToCanvas(canvas, p, resItem, stage, qrPass) {
  const width = 1240;
  const height = 1754; // A4 пропорция при 150 DPI
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Фон под пергамент
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#fdfbf7');
  bgGrad.addColorStop(0.5, '#faf6ee');
  bgGrad.addColorStop(1, '#f5eee0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Декоративные рамки
  // Внешняя золотая рамка
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Тонкая внутренняя рамка
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  // Внутренняя декоративная тонкая рамка с отступами
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(54, 54, width - 108, height - 108);

  // Угловые декоративные орнаменты
  const corners = [
    [54, 54],
    [width - 54, 54],
    [54, height - 54],
    [width - 54, height - 54]
  ];
  ctx.fillStyle = '#b45309';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Верхний колонтитул: Бренд ФМГТО
  ctx.textAlign = 'center';
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 26px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText('ФЕДЕРАЦИЯ МНОГОБОРЬЯ ГТО РОССИИ', width / 2, 130);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Общероссийская общественная организация · ВФСК ГТО', width / 2, 160);

  // Разделительная золотая линия под шапкой
  const lineGrad = ctx.createLinearGradient(160, 180, width - 160, 180);
  lineGrad.addColorStop(0, 'rgba(180,83,9,0.1)');
  lineGrad.addColorStop(0.5, '#b45309');
  lineGrad.addColorStop(1, 'rgba(180,83,9,0.1)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 190);
  ctx.lineTo(width - 160, 190);
  ctx.stroke();

  // Ступень ВФСК ГТО
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText(`${stage.toUpperCase()} СТУПЕНЬ`, width / 2, 230);

  // Главный заголовок
  ctx.fillStyle = '#92400e';
  ctx.font = '900 54px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText('СЕРТИФИКАТ', width / 2, 310);
  ctx.font = '800 38px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText('ФИКСАЦИИ РЕЗУЛЬТАТА', width / 2, 365);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('ЛИЧНЫЙ КАБИНЕТ АТЛЕТА · СИСТЕМА «ГЕРОЙ ГТО»', width / 2, 410);

  // Блок получателя
  ctx.fillStyle = '#64748b';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('Настоящим подтверждается, что атлет', width / 2, 510);

  // Имя атлета
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText(p.name, width / 2, 570);

  // Подчёркивание имени
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const nameWidth = Math.min(ctx.measureText(p.name).width + 60, 800);
  ctx.moveTo((width - nameWidth) / 2, 590);
  ctx.lineTo((width + nameWidth) / 2, 590);
  ctx.stroke();

  if (p.club || p.region) {
    ctx.fillStyle = '#475569';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(p.club ? `${p.club}${p.region ? ' · ' + p.region : ''}` : p.region, width / 2, 630);
  }

  // Текст о выполнении
  ctx.fillStyle = '#334155';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText('успешно выполнил(а) комплекс упражнений и зафиксировал(а) результат', width / 2, 720);
  ctx.fillText('в соревновательной дисциплине:', width / 2, 750);

  // Дисциплина
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 36px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText(resItem.ex.toUpperCase(), width / 2, 820);

  // Плашка результата (Banner)
  const bW = 740;
  const bH = 130;
  const bX = (width - bW) / 2;
  const bY = 870;

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(bX, bY, bW, bH, 20);
  ctx.fill();

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bX, bY, bW, bH, 20);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('ЗАФИКСИРОВАННЫЙ РЕЗУЛЬТАТ', width / 2, bY + 40);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 50px "TT Squares", "Unbounded", Arial, sans-serif';
  ctx.fillText(resItem.res, width / 2, bY + 100);

  // Пояснительный судейский текст
  ctx.fillStyle = '#64748b';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Фиксация произведена встроенным видеофиксатором с контролем судейских стандартов,', width / 2, 1070);
  ctx.fillText('таймером и видеотитрованием Федерацией многоборья ГТО России.', width / 2, 1098);

  // Нижний блок: подпись, печать, QR
  const footY = 1260;

  // Левая колонка: Подпись
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '17px Arial, sans-serif';
  ctx.fillText('Генеральный секретарь ФМГТО', 130, footY);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('В. С. Войтеховский', 130, footY + 40);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(`Дата фиксации: ${resItem.date || new Date().toLocaleDateString('ru-RU')}`, 130, footY + 75);

  // Центральная гербовая золотая печать
  const sX = width / 2;
  const sY = footY + 30;
  ctx.save();
  ctx.translate(sX, sY);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 67, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.fill();

  ctx.fillStyle = '#b45309';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('★ ФМГТО РОССИИ ★', 0, -25);
  ctx.font = '900 16px "TT Squares", Arial, sans-serif';
  ctx.fillText('ОФИЦИАЛЬНО', 0, 2);
  ctx.fillText('ЗАВЕРЕНО', 0, 24);
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText('2026', 0, 45);
  ctx.restore();

  // Правая колонка: QR-код верификации
  const qrSize = 130;
  const qrX = width - 130 - qrSize;
  const qrY = footY - 35;
  drawQrOnCanvas(ctx, qrPass, qrX, qrY, qrSize);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText('Верификация атлета', qrX + qrSize / 2, qrY + qrSize + 25);
}

// Официальный диплом фиксации результата (Полноэкранный Viewer #hero-diploma-viewer)
function openHeroDiploma(resItem) {
  const p = activeProfile() || { name: 'Атлет ВФСК ГТО', birthYear: 1995, club: 'ФМГТО Россия' };
  const age = p.birthYear ? (new Date().getFullYear() - Number(p.birthYear)) : 30;
  const stage = age ? ageToStage(age) : 'VIII';
  const qrPass = passText(p, age, stage);

  let viewer = document.getElementById('hero-diploma-viewer');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'hero-diploma-viewer';
    viewer.className = 'hero-certificate-viewer-modal';
    document.body.appendChild(viewer);
  }

  viewer.innerHTML = `
    <!-- Фиксированная шапка / Тулбар -->
    <div class="cert-toolbar">
      <div class="cert-toolbar-info">
        <span class="cert-pill">ВФСК ГТО · ${esc(stage)} СТУПЕНЬ</span>
        <h3 class="cert-title">Электронный диплом фиксации</h3>
      </div>
      <div class="cert-toolbar-actions">
        <button type="button" class="cert-btn secondary" id="hdv-zoom-out" title="Уменьшить">−</button>
        <span id="hdv-zoom-val" style="font-size:12px;font-weight:700;color:#94a3b8;min-width:40px;text-align:center">100%</span>
        <button type="button" class="cert-btn secondary" id="hdv-zoom-in" title="Увеличить">+</button>
        <button type="button" class="cert-btn secondary" id="hdv-zoom-reset" title="Масштаб 1:1">1:1</button>
        <button type="button" class="cert-btn close" id="hdv-close-btn" title="Закрыть">✕ Закрыть</button>
      </div>
    </div>

    <!-- Изолированная область просмотра с pan/pinch-zoom -->
    <div class="cert-scroll-viewport" id="hdv-viewport">
      <div class="cert-canvas-container" id="hdv-canvas-wrap" style="transition:transform 0.15s ease-out;transform-origin:center top">
        <canvas id="hero-cert-canvas" class="cert-document-canvas"></canvas>
      </div>

      <!-- Кнопки действий экспорта -->
      <div class="cert-mobile-bottom-bar">
        <button type="button" class="cert-btn-mobile primary" id="hdv-save-png">
          <span>🖼 Сохранить изображение (PNG)</span>
        </button>
        <button type="button" class="cert-btn-mobile secondary" id="hdv-export-pdf">
          <span>📄 Распечатать / Скачать PDF</span>
        </button>
        <button type="button" class="cert-btn-mobile secondary" id="hdv-share-btn">
          <span>↗ Поделиться дипломом</span>
        </button>
      </div>
    </div>
  `;

  viewer.hidden = false;
  document.body.classList.add('diploma-viewer-open');

  const canvas = document.getElementById('hero-cert-canvas');
  if (canvas) {
    renderHeroDiplomaToCanvas(canvas, p, resItem, stage, qrPass);
  }

  // Zoom & Pan
  let currentZoom = 1.0;
  const wrap = document.getElementById('hdv-canvas-wrap');
  const zoomVal = document.getElementById('hdv-zoom-val');

  function updateZoom(z) {
    currentZoom = Math.min(Math.max(0.5, z), 2.5);
    if (wrap) wrap.style.transform = `scale(${currentZoom})`;
    if (zoomVal) zoomVal.textContent = Math.round(currentZoom * 100) + '%';
  }

  // Поддержка pinch-to-zoom на сенсорных экранах
  let initialDist = 0;
  const viewport = document.getElementById('hdv-viewport');
  if (viewport) {
    viewport.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && initialDist > 0) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialDist;
        updateZoom(currentZoom * (factor > 1 ? 1.03 : 0.97));
        initialDist = dist;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', () => { initialDist = 0; }, { passive: true });
  }

  // Обработчики кнопок
  viewer.onclick = e => {
    if (e.target.id === 'hdv-close-btn') {
      viewer.hidden = true;
      document.body.classList.remove('diploma-viewer-open');
      return;
    }
    if (e.target.id === 'hdv-zoom-in') {
      updateZoom(currentZoom + 0.15);
      return;
    }
    if (e.target.id === 'hdv-zoom-out') {
      updateZoom(currentZoom - 0.15);
      return;
    }
    if (e.target.id === 'hdv-zoom-reset') {
      updateZoom(1.0);
      return;
    }
    if (e.target.closest('#hdv-save-png')) {
      if (!canvas) return;
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `diploma_gto_${p.name.replace(/\s+/g, '_')}.png`;
        a.click();
      }, 'image/png');
      return;
    }
    if (e.target.closest('#hdv-export-pdf')) {
      window.print();
      return;
    }
    if (e.target.closest('#hdv-share-btn')) {
      if (canvas && navigator.share) {
        canvas.toBlob(blob => {
          if (!blob) return;
          const file = new File([blob], `diploma_${Date.now()}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              title: 'Диплом Герой ГТО',
              text: `Диплом фиксации результата: ${resItem.ex} — ${resItem.res}`,
              files: [file]
            }).catch(() => {});
          } else {
            alert('Ссылка на диплом скопирована в буфер обмена');
          }
        }, 'image/png');
      } else {
        alert('Ссылка на диплом скопирована в буфер обмена');
      }
      return;
    }
  };
}
window.openHeroDiploma = openHeroDiploma;

// =========================================================================
// ЭТАП 4: Сканер QR и Судейский режим на площадке
// =========================================================================

function startScanner() {
  const video = document.getElementById('scan-video');
  const out = document.getElementById('scan-result');
  if (!navigator.mediaDevices?.getUserMedia) {
    if (out) out.textContent = 'Камера не поддерживается в этом браузере.';
    return;
  }
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: scannerFacing },
    audio: false
  }).then(s => {
    scanStream = s;
    if (video) { video.srcObject = s; video.play().catch(() => {}); }
    setScanBtn('Выключить сканер');
    if (out) out.textContent = 'Наведите камеру на QR-код…';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const loop = () => {
      if (!scanStream) return;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            onScanResult(code.data);
            return;
          }
        } catch (_) {}
      }
      scanRAF = requestAnimationFrame(loop);
    };
    scanRAF = requestAnimationFrame(loop);
  }).catch(() => {
    if (out) out.textContent = 'Камера недоступна или доступ к ней запрещён.';
  });
}

function stopScanner() {
  if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  const v = document.getElementById('scan-video');
  if (v) v.srcObject = null;
}

function toggleScannerFacing() {
  scannerFacing = (scannerFacing === 'environment') ? 'user' : 'environment';
  if (scanStream) {
    stopScanner();
    startScanner();
  }
}

function parseAthleteQr(text) {
  // Формат карточки: "МНОГОБОРЬЕ ГТО | Атлет: Иван Петров | УИН: 21-77-0012345 | 28 лет, ступень IX | Клуб: ..."
  const result = { name: '', uin: '', age: '', stage: '', club: '', raw: text };
  const parts = text.split('|').map(s => s.trim());
  for (const part of parts) {
    if (part.toLowerCase().startsWith('атлет:')) result.name = part.replace(/^атлет:\s*/i, '');
    else if (part.toLowerCase().startsWith('уин:')) result.uin = part.replace(/^уин:\s*/i, '');
    else if (part.toLowerCase().startsWith('клуб:')) result.club = part.replace(/^клуб:\s*/i, '');
    else if (part.includes('ступень')) {
      const sm = part.match(/ступень\s+([IVXLCDM—]+)/i);
      if (sm) result.stage = sm[1];
      const am = part.match(/(\d+)\s+лет/i);
      if (am) result.age = am[1];
    }
  }
  if (!result.name && text.length > 0) result.name = text.slice(0, 40);
  return result;
}

function onScanResult(data) {
  playBeep(880, 0.12);
  stopScanner();
  setScanBtn('Сканировать ещё');

  const out = document.getElementById('scan-result');
  const athlete = parseAthleteQr(data);
  lastScannedAthlete = athlete;

  if (scannerMode === 'judge') {
    if (out) out.innerHTML = `<b style="color:#22c55e">Карточка считана:</b> ${esc(athlete.name)} (${esc(athlete.stage || '—')} ступень)`;
    renderJudgeEntryForm(athlete);
  } else {
    if (out) {
      out.innerHTML = `
        <div style="background:rgba(255,255,255,0.06);padding:10px;border-radius:8px;margin-top:6px">
          <b style="color:#22c55e">✓ Атлет распознан:</b> <b style="color:#fff">${esc(athlete.name)}</b>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">
            ${athlete.stage ? 'Ступень: ' + esc(athlete.stage) : ''}
            ${athlete.uin ? ' · УИН: ' + esc(athlete.uin) : ''}
            ${athlete.club ? ' · Клуб: ' + esc(athlete.club) : ''}
          </div>
        </div>`;
    }
  }
}

function renderJudgeEntryForm(athlete) {
  const box = document.getElementById('judge-entry-container');
  if (!box) return;

  box.innerHTML = `
    <div class="judge-entry-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h4 style="margin:0;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:0.05em">
          Фиксация попытки: <span style="color:#38bdf8">${esc(athlete.name)}</span>
        </h4>
        <span class="judge-mode-badge">${esc(athlete.stage || '—')} СТУПЕНЬ</span>
      </div>
      <div class="hero-form">
        <div class="hero-form-row">
          <label>Дисциплина
            <select id="judge-discipline">
              <option value="Подтягивания строгие">Подтягивания строгие (2 мин)</option>
              <option value="Отжимания">Отжимания от пола (2 мин)</option>
              <option value="Рывок гири 16 кг">Рывок гири 16 кг (4 мин)</option>
              <option value="Рывок гири 24 кг">Рывок гири 24 кг (4 мин)</option>
              <option value="Пресс / подъём туловища">Пресс (1 мин)</option>
              <option value="Прыжок в длину с места">Прыжок в длину с места (см)</option>
              <option value="Наклон на скамье">Наклон на скамье (см)</option>
              <option value="Планка">Планка (время)</option>
            </select>
          </label>
          <label>Результат (повт. / см / время)
            <input type="text" id="judge-result-val" placeholder="напр. 28" maxlength="20">
          </label>
        </div>
        <div class="hero-form-row">
          <label>Номер попытки
            <select id="judge-attempt">
              <option value="1">Попытка №1</option>
              <option value="2">Попытка №2</option>
              <option value="3">Попытка №3</option>
            </select>
          </label>
          <label>Вердикт судьи
            <select id="judge-status">
              <option value="OK">✓ Зачёт (OK)</option>
              <option value="NOREP">✗ No-Rep / Нарушение</option>
            </select>
          </label>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="pass-action-btn primary" id="btn-save-judge-entry" style="flex:1"><span>✓ Занести в протокол соревнований</span></button>
          <button class="pass-action-btn secondary" onclick="document.getElementById('judge-entry-container').innerHTML=''" style="width:auto;padding:0 14px"><span>Отмена</span></button>
        </div>
      </div>
    </div>`;
}

function saveJudgeEntry() {
  if (!lastScannedAthlete) return;
  const disc = document.getElementById('judge-discipline')?.value || 'Дисциплина';
  const res = (document.getElementById('judge-result-val')?.value || '').trim();
  const attempt = document.getElementById('judge-attempt')?.value || '1';
  const status = document.getElementById('judge-status')?.value || 'OK';

  if (!res) { alert('Укажите результат попытки.'); return; }

  let protocol = [];
  try { protocol = JSON.parse(localStorage.getItem(JUDGE_STORE)) || []; } catch (_) {}

  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  protocol.unshift({
    time: timeStr,
    athleteName: lastScannedAthlete.name,
    stage: lastScannedAthlete.stage,
    uin: lastScannedAthlete.uin,
    discipline: disc,
    attempt,
    result: res,
    status
  });

  try { localStorage.setItem(JUDGE_STORE, JSON.stringify(protocol)); } catch (_) {}

  const container = document.getElementById('hero-gto-root');
  if (container) renderHeroScreen(container);
  playBeep(880, 0.2);
}

function exportJudgeCsv() {
  let protocol = [];
  try { protocol = JSON.parse(localStorage.getItem(JUDGE_STORE)) || []; } catch (_) {}
  if (!protocol.length) { alert('Протокол пуст.'); return; }

  let csv = '\uFEFFВремя;Атлет;Ступень;УИН;Дисциплина;Попытка;Результат;Вердикт\n';
  for (const row of protocol) {
    csv += `"${row.time}";"${row.athleteName}";"${row.stage || ''}";"${row.uin || ''}";"${row.discipline}";"${row.attempt}";"${row.result}";"${row.status}"\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hero_gto_protocol_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Звуковой сигнал Web Audio API
function playBeep(freq = 440, duration = 0.1) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}
