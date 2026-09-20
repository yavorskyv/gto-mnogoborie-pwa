// Режим видеозаписи комплексов с судейским оверлеем таймера (WOD Qualifier)
// Федерация многоборья ГТО России
// HOTFIX v66: Строгий конечный автомат, устранение зависания countdown, единый источник таймера

export const CameraState = {
  IDLE: 'IDLE',
  CAMERA_OFF: 'IDLE',
  REQUESTING_CAMERA: 'REQUESTING_CAMERA',
  CAMERA_READY: 'CAMERA_READY',
  CAMERA_READY_WITH_PREVIEW: 'CAMERA_READY',
  COUNTDOWN: 'COUNTDOWN',
  STARTING: 'STARTING',
  RECORDING: 'RECORDING',
  STOPPING: 'STOPPING',
  PREVIEW: 'PREVIEW',
  PREVIEW_REVIEW: 'PREVIEW',
  ERROR: 'ERROR'
};

export const TimerState = {
  IDLE: 'IDLE',
  READY: 'READY',
  COUNTDOWN: 'COUNTDOWN',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED'
};

// Функция гарантированного определения ландшафтной ориентации устройства (ТЗ v67.2 п. 6)
export function isLandscapeNow() {
  if (typeof window === 'undefined') return true;

  // 1. matchMedia (наиболее точный стандарт для iOS Safari и современных браузеров)
  try {
    if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
      return true;
    }
  } catch (_) {}

  // 2. Фактические внутренние размеры окна viewport (ширина больше высоты)
  if (window.innerWidth > window.innerHeight) {
    return true;
  }

  // 3. Screen orientation API
  try {
    if (window.screen && window.screen.orientation && window.screen.orientation.type) {
      if (window.screen.orientation.type.includes('landscape')) return true;
    }
  } catch (_) {}

  // 4. Legacy window.orientation (для старых версий iOS: 90 или -90)
  if (typeof window.orientation === 'number') {
    if (Math.abs(window.orientation) === 90) return true;
  }

  return false;
}

const MAX_CAMERA_SWITCH_ATTEMPTS = 2;

export class GtoCameraRecorder {
  constructor(options = {}) {
    this.videoEl = options.videoEl || null;
    this.canvasEl = options.canvasEl || null;
    this.onStateChange = options.onStateChange || (() => {});

    this.state = CameraState.IDLE;
    this.timerState = TimerState.IDLE;
    this.stream = null;
    this.hasAudioTrack = false;
    this.audioDenied = false;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.recordedUrl = null;
    this.actualMimeType = '';
    this.actualExtension = 'mp4';

    this.facingMode = 'environment';
    this.cameraSwitchAttempts = 0;
    this.currentDeviceId = null;

    // Конфигурация независимого спортивного таймера (ТЗ v67)
    this.timerConfig = this.loadTimerConfig();

    // Счетчики повторений и протокол событий (ТЗ v97)
    this.reps = 0;
    this.noReps = 0;
    this.events = [];
    this.targetOrientation = options.targetOrientation || 'auto'; // 'auto' | 'portrait' | 'landscape'

    // Тайминги видеозаписи (секундомер MediaRecorder)
    this.recordingStartedAt = 0;
    this.recordedSeconds = 0;
    this.recordedMs = 0;

    // Зафиксированные параметры геометрии записи (ТЗ v67.2 п. 4, 19, v76, v97)
    this.currentOrientation = isLandscapeNow() ? 'landscape' : 'portrait';
    this.cameraViewport = {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      orientation: this.currentOrientation
    };
    this.recordingOrientation = null;
    this.recordingWidth = 0;
    this.recordingHeight = 0;

    // Тайминги спортивного таймера комплекса
    this.timerStartedAt = 0;
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = 0;
    this.timerCurrentRound = 1;
    this.timerInRoundSeconds = 0;
    this.timerFinished = false;
    this.lastAnnouncedRound = 1;

    // Обратный отсчет перед стартом таймера (3..2..1)
    this.timerCountdownSeconds = 0;
    this.timerCountdownText = '';
    this.countdownTimerId = null;

    // Web Audio API синтезатор сигналов
    this.audioCtx = null;

    // Старые поля для обратной совместимости
    this.countdownSeconds = 0;
    this.countdownText = '';
    this.countdownId = 0;

    // Таймеры
    this.countdownTimerId = null;
    this.startTimeoutId = null;
    this.animationId = null;
    this.wakeLock = null;

    this.logoImg = null;
    this.loadLogo();

    // Защита и надежность
    this.wasMinimizedDuringRecording = false;
    this.lockedCanvasWidth = 0;
    this.lockedCanvasHeight = 0;
    this.errorReason = null;
    this.errorMessage = '';
    this.isDiscarding = false;
    this.isExiting = false;
    this.canvasStream = null;
    this.combinedStream = null;
    this.abortController = null;

    // Метаданные атлета и комплекса
    this.athleteName = localStorage.getItem('gto_rec_athlete') || '';
    this.workoutTitle = localStorage.getItem('gto_rec_workout') || 'Комплекс №1 (Отбор на Игры ГТО)';

    // Кэшированные форматеры для Московского времени (Europe/Moscow)
    this.moscowDateFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    this.moscowTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    this.cachedDateStr = '';
    this.cachedTimeStr = '';
    this.lastTimeTickSec = -1;
    this.debugFrameCount = 0;

    // Системные слушатели
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    this.boundBeforeUnloadHandler = this.handleBeforeUnload.bind(this);
    this.boundResizeHandler = this.handleScreenOrientationCheck.bind(this);

    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    window.addEventListener('resize', this.boundResizeHandler);
    window.addEventListener('orientationchange', this.boundResizeHandler);

    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
        window.screen.orientation.addEventListener('change', this.boundResizeHandler);
      }
    } catch (_) {}

    try {
      const mql = window.matchMedia('(orientation: landscape)');
      if (mql) {
        if (mql.addEventListener) mql.addEventListener('change', this.boundResizeHandler);
        else if (mql.addListener) mql.addListener(this.boundResizeHandler);
      }
    } catch (_) {}
  }

  get cameraState() {
    return this.state;
  }

  set cameraState(val) {
    this.state = val;
  }

  loadTimerConfig() {
    let savedCd = 5;
    try {
      const v = localStorage.getItem('gto_countdown_seconds');
      if (v !== null) savedCd = Number(v);
    } catch (_) {}

    const defaults = {
      mode: 'stopwatch', // 'none' | 'stopwatch' | 'countdown' | 'interval'
      orientation: 'auto', // 'auto' | 'portrait' | 'landscape' (ТЗ v97)
      timerAutoStart: true, // true: автостарт с видео; false: ручной старт атлетом (ТЗ v97)
      preStartSeconds: savedCd, // 0, 3, 5 (по умолчанию), 10 (отсчет перед записью)
      durationSeconds: 600, // For countdown / Time Cap (10 min default)
      intervalSeconds: 60, // For EMOM (60s default)
      rounds: 10, // For EMOM (10 rounds default)
      countUp: true, // For interval count direction
      soundEnabled: true,
      allowPause: false,
      repsMode: false // ТЗ: во время записи атлета счетчик повторов скрыт (судейство отдельно)
    };
    try {
      const saved = localStorage.getItem('gto_cam_timer_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.preStartSeconds === undefined) parsed.preStartSeconds = savedCd;
        parsed.repsMode = false;
        return Object.assign({}, defaults, parsed);
      }
    } catch (_) {}
    return defaults;
  }

  saveTimerConfig() {
    try {
      if (this.timerConfig && this.timerConfig.preStartSeconds !== undefined) {
        localStorage.setItem('gto_countdown_seconds', String(this.timerConfig.preStartSeconds));
      }
      localStorage.setItem('gto_cam_timer_config', JSON.stringify(this.timerConfig));
    } catch (_) {}
  }

  setTimerConfig(partialConfig = {}) {
    this.timerConfig = Object.assign({}, this.timerConfig, partialConfig);
    if (partialConfig.orientation) {
      this.targetOrientation = partialConfig.orientation;
    }
    this.saveTimerConfig();
    this.notify();
  }

  setCountdownSeconds(sec) {
    const num = Math.max(0, parseInt(sec, 10) || 0);
    this.timerConfig.preStartSeconds = num;
    this.saveTimerConfig();
    this.notify();
    return num;
  }

  initAudioContext() {
    if (!this.timerConfig.soundEnabled) return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('[Audio] Web Audio initialization warning:', e);
      return null;
    }
  }

  playBeep(type = 'countdown') {
    if (!this.timerConfig.soundEnabled) return;
    try {
      const ctx = this.initAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = (type === 'no_rep') ? 'sawtooth' : 'sine';

      const now = ctx.currentTime;
      let freq = 600;
      let duration = 0.12;

      if (type === 'countdown') {
        freq = 440;
        duration = 0.14;
      } else if (type === 'start') {
        freq = 880;
        duration = 0.35;
      } else if (type === 'round') {
        freq = 960;
        duration = 0.22;
      } else if (type === 'finish') {
        freq = 880;
        duration = 0.6;
      } else if (type === 'rep') {
        freq = 1040;
        duration = 0.08;
      } else if (type === 'no_rep') {
        freq = 220;
        duration = 0.22;
      }

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('[Audio] Beep playback error:', e);
    }
  }

  // ----------------------------------------------------
  // СЧЕТЧИКИ ПОВТОРЕНИЙ И СОБЫТИЙ (ТЗ v97)
  // ----------------------------------------------------
  addRep() {
    this.reps = (this.reps || 0) + 1;
    const time = this.getWorkoutTimeFloat();
    this.events.push({ type: 'rep', count: this.reps, time });
    this.playBeep('rep');
    this.notify();
    return this.reps;
  }

  addNoRep() {
    this.noReps = (this.noReps || 0) + 1;
    const time = this.getWorkoutTimeFloat();
    this.events.push({ type: 'no_rep', count: this.noReps, time });
    this.playBeep('no_rep');
    this.notify();
    return this.noReps;
  }

  resetReps() {
    this.reps = 0;
    this.noReps = 0;
    this.events = [];
    this.notify();
  }

  getWorkoutTimeFloat() {
    if (this.timerState === TimerState.RUNNING && this.timerStartedAt > 0) {
      const activeTimerMs = Math.max(0, performance.now() - this.timerStartedAt - this.timerTotalPausedMs);
      return Number((activeTimerMs / 1000).toFixed(1));
    }
    if (this.state === CameraState.RECORDING && this.recordingStartedAt > 0) {
      const recMs = Math.max(0, performance.now() - this.recordingStartedAt);
      return Number((recMs / 1000).toFixed(1));
    }
    return 0;
  }

  loadLogo() {
    this.logoImg = new Image();
    this.logoImg.crossOrigin = 'anonymous';
    this.logoImg.src = './assets/logo-tight.png';
  }

  clearAllTimers() {
    if (this.countdownAnimFrame) {
      cancelAnimationFrame(this.countdownAnimFrame);
      this.countdownAnimFrame = null;
    }
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    if (this.startTimeoutId) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }

  checkCapability() {
    const isHttps = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isHttps && window.isSecureContext === false) {
      return { supported: false, reason: 'insecure_context', message: 'Камера требует защищённого HTTPS-соединения.' };
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, reason: 'not_supported', message: 'Браузер не поддерживает доступ к камере.' };
    }
    if (typeof MediaRecorder === 'undefined') {
      return { supported: false, reason: 'no_media_recorder', message: 'Ваш браузер не поддерживает запись видео (MediaRecorder).' };
    }
    return { supported: true, reason: 'ok', message: '' };
  }

  setMetadata(athlete, workout) {
    if (athlete != null) {
      this.athleteName = String(athlete).trim();
      localStorage.setItem('gto_rec_athlete', this.athleteName);
    }
    if (workout != null) {
      this.workoutTitle = String(workout).trim();
      localStorage.setItem('gto_rec_workout', this.workoutTitle);
    }
  }

  handleVisibilityChange() {
    if (this.state === CameraState.RECORDING && document.visibilityState === 'hidden') {
      this.wasMinimizedDuringRecording = true;
      console.warn('[Recorder] Приложение было свернуто во время активной записи.');
    }
  }

  handleBeforeUnload(e) {
    if (this.state === CameraState.RECORDING || this.state === CameraState.COUNTDOWN || this.state === CameraState.STARTING) {
      e.preventDefault();
      e.returnValue = 'Идет видеозапись комплекса! Вы действительно хотите покинуть страницу?';
      return e.returnValue;
    }
  }

  handleScreenOrientationCheck() {
    // 1. Во время активной записи / подготовки геометрия холста наглухо заморожена! (v76 ТЗ п. 5)
    if (this.state === CameraState.RECORDING || this.state === CameraState.STARTING || this.state === CameraState.COUNTDOWN) {
      const currentIsLandscape = isLandscapeNow();
      const expectedIsLandscape = this.lockedOrientation === 'landscape';
      this.orientationMismatch = (currentIsLandscape !== expectedIsLandscape);
      return;
    }

    // 2. Проверка реальной смены ориентации (v76 ТЗ п. 3, 4):
    // Если изменилась только высота (Safari toolbar / клавиатура), а ориентация осталась прежней — НЕ перестраивать!
    const nextIsLandscape = isLandscapeNow();
    const nextOrientation = nextIsLandscape ? 'landscape' : 'portrait';
    if (nextOrientation === this.currentOrientation && this.lockedCanvasWidth > 0) {
      return; // Toolbar resize / keyboard — zero layout recalculation!
    }

    this.currentOrientation = nextOrientation;
    this.orientationMismatch = false;
    // Только при реальной смене ориентации перенастраиваем физический размер canvas под ориентацию
    this.configureRecordingOutput();
    this.renderSingleFrame();
  }

  // ----------------------------------------------------
  // ПОДБОР ОСНОВНОЙ (ЗАДНЕЙ) КАМЕРЫ (HOTFIX v66.1)
  // ----------------------------------------------------
  async getBestCameraStream(requestedFacing = 'environment') {
    this.audioDenied = false;
    if (typeof window !== 'undefined' && window.__GTO_MOCK_CAMERA_STREAM__) {
      console.log('[Camera] Using test media stream');
      return window.__GTO_MOCK_CAMERA_STREAM__;
    }

    // Требования ТЗ v66.1 (п. 3, 4, 5):
    // 1. Использовать facingMode: { ideal: requestedFacing }
    // 2. НЕ использовать exact: "environment"
    // 3. НЕ пытаться угадывать камеру по label с "0" или по deviceId до первого успешного getUserMedia
    const videoConstraints = {
      facingMode: { ideal: requestedFacing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 }
    };

    let acquiredStream = null;
    let audioOk = false;

    // Шаг 1: Запрос камеры с микрофоном
    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      audioOk = acquiredStream.getAudioTracks().length > 0;
    } catch (audioErr) {
      console.warn('[Camera] Audio permission denied or unavailable, trying video-only:', audioErr);
      this.audioDenied = true;
      // Шаг 2: Fallback на video-only
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
        audioOk = false;
      } catch (videoErr) {
        console.warn('[Camera] Fallback to simple facingMode video-only:', videoErr);
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: requestedFacing } },
          audio: false
        });
        audioOk = false;
      }
    }

    if (!acquiredStream || acquiredStream.getVideoTracks().length === 0) {
      throw new Error('Камера не вернула валидный видеопоток.');
    }

    this.hasAudioTrack = audioOk;
    const videoTrack = acquiredStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
    this.currentDeviceId = settings.deviceId || null;

    // Обязательная диагностика п. 24 ТЗ
    console.info('[Camera stream ready]', {
      facingMode: settings.facingMode,
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      deviceId: settings.deviceId,
      hasAudio: this.hasAudioTrack
    });

    // Шаг 3 (п. 3 и 4 ТЗ): Если settings.facingMode === 'environment' — НЕ ПЕРЕКЛЮЧАТЬ КАМЕРУ ДАЛЬШЕ!
    // Только если достоверно получен facingMode === 'user' при запросе 'environment' — делаем одну осторожную попытку.
    if (requestedFacing === 'environment' && settings.facingMode === 'user' && this.cameraSwitchAttempts < MAX_CAMERA_SWITCH_ATTEMPTS) {
      this.cameraSwitchAttempts++;
      console.warn(`[Camera] Browser returned 'user' camera instead of 'environment'. Attempt ${this.cameraSwitchAttempts}`);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        const backDev = videoDevs.find(d => /back|rear|environment|world|main|основн|задн/i.test(d.label));
        if (backDev && backDev.deviceId !== settings.deviceId) {
          videoTrack.stop();
          acquiredStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { ideal: backDev.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: this.hasAudioTrack
          });
        }
      } catch (switchErr) {
        console.warn('[Camera] Fallback switch attempt failed:', switchErr);
      }
    } else if (requestedFacing === 'user' && settings.facingMode === 'environment' && this.cameraSwitchAttempts < MAX_CAMERA_SWITCH_ATTEMPTS) {
      this.cameraSwitchAttempts++;
      console.warn(`[Camera] Browser returned 'environment' camera instead of 'user'. Attempt ${this.cameraSwitchAttempts}`);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter(d => d.kind === 'videoinput');
        const frontDev = videoDevs.find(d => /front|user|facetime|selfie|передн|внутр|селфи/i.test(d.label));
        if (frontDev && frontDev.deviceId !== settings.deviceId) {
          videoTrack.stop();
          acquiredStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { ideal: frontDev.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: this.hasAudioTrack
          });
        }
      } catch (switchErr) {
        console.warn('[Camera] Fallback user switch attempt failed:', switchErr);
      }
    }

    return acquiredStream;
  }

  // Проверка абсолютной готовности кадра камеры и холста к записи (HOTFIX 2026)
  isCameraFrameReady() {
    if (!this.stream) return false;
    const videoTracks = this.stream.getVideoTracks();
    if (!videoTracks.length || videoTracks[0].readyState !== 'live') return false;

    if (!this.videoEl) return false;
    if (!this.videoEl.srcObject) return false;
    if (this.videoEl.readyState < 2) return false;
    if (!this.videoEl.videoWidth || !this.videoEl.videoHeight) return false;

    if (this.canvasEl) {
      if (this.canvasEl.width <= 0 || this.canvasEl.height <= 0) return false;
    }

    return true;
  }

  // Ожидание РЕАЛЬНЫХ размеров видеопотока с таймаутом (ТЗ HOTFIX)
  async waitForRealVideoDimensions(video, timeoutMs = 6000) {
    if (!video) return false;
    return new Promise((resolve) => {
      const isReady = () => {
        return video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;
      };

      if (isReady()) {
        resolve(true);
        return;
      }

      let timer = null;
      let timeoutId = null;

      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onEvent);
        video.removeEventListener('canplay', onEvent);
        video.removeEventListener('playing', onEvent);
        if (timer) clearInterval(timer);
        if (timeoutId) clearTimeout(timeoutId);
      };

      const onEvent = () => {
        if (isReady()) {
          cleanup();
          resolve(true);
        }
      };

      video.addEventListener('loadedmetadata', onEvent);
      video.addEventListener('canplay', onEvent);
      video.addEventListener('playing', onEvent);

      timer = setInterval(() => {
        if (isReady()) {
          cleanup();
          resolve(true);
        }
      }, 100);

      timeoutId = setTimeout(() => {
        cleanup();
        resolve(isReady());
      }, timeoutMs);
    });
  }

  // Физическая настройка разрешения и ориентации canvas ДО записи (ТЗ v67.2 п. 1, 3, 20, ТЗ v97, HOTFIX #2)
  configureRecordingOutput() {
    if (!this.canvasEl) return;
    if (this.state === CameraState.RECORDING || this.state === CameraState.STARTING) {
      // Запрещено менять размеры canvas в процессе активной записи (п. 16, 18 ТЗ)
      return;
    }
    
    let isLandscape;
    const orient = (this.targetOrientation && this.targetOrientation !== 'auto') 
      ? this.targetOrientation 
      : (this.timerConfig.orientation || 'auto');

    if (orient === 'portrait') {
      isLandscape = false;
    } else if (orient === 'landscape') {
      isLandscape = true;
    } else {
      isLandscape = isLandscapeNow();
    }

    const targetW = isLandscape ? 1920 : 1080;
    const targetH = isLandscape ? 1080 : 1920;

    const changed = (this.canvasEl.width !== targetW || this.canvasEl.height !== targetH);
    if (changed) {
      this.canvasEl.width = targetW;
      this.canvasEl.height = targetH;
    }
    this.lockedCanvasWidth = targetW;
    this.lockedCanvasHeight = targetH;
    this.lockedOrientation = isLandscape ? 'landscape' : 'portrait';
    this.recordingWidth = targetW;
    this.recordingHeight = targetH;
    this.recordingOrientation = this.lockedOrientation;

    console.info('[Recording output]', {
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      sourceVideo: this.videoEl ? `${this.videoEl.videoWidth}×${this.videoEl.videoHeight}` : 'none',
      canvas: `${this.canvasEl.width}×${this.canvasEl.height}`,
      orientation: this.lockedOrientation,
      targetConfig: orient
    });

    this.updateDebugString();
  }

  // Обратная совместимость
  configureCanvasFromVideo() {
    return this.configureRecordingOutput();
  }

  // Отрисовка одиночного кадра для немедленной актуализации холста (п. 8 ТЗ)
  renderSingleFrame() {
    if (!this.canvasEl) return;
    const ctx = this.canvasEl.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;
    const cw = this.canvasEl.width || (isLandscapeNow() ? 1920 : 1080);
    const ch = this.canvasEl.height || (isLandscapeNow() ? 1080 : 1920);
    if (this.videoEl && this.videoEl.readyState >= 2 && this.videoEl.videoWidth > 0) {
      this.drawVideoCover(ctx, this.videoEl, this.videoEl.videoWidth, this.videoEl.videoHeight, cw, ch);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, cw, ch);
    }
    this.drawOverlay(ctx, cw, ch);
  }

  // Информационная debug-строка ориентации потока (ТЗ v67.2)
  getDebugString() {
    const vw = this.videoEl?.videoWidth || 0;
    const vh = this.videoEl?.videoHeight || 0;
    const cw = this.canvasEl?.width || 0;
    const ch = this.canvasEl?.height || 0;
    const orient = (cw > ch) ? 'LANDSCAPE' : 'PORTRAIT';
    return `SOURCE ${vw}×${vh} | OUTPUT ${cw}×${ch} | ${orient}`;
  }

  updateDebugString() {
    const badge = document.getElementById('camera-debug-badge');
    if (badge) {
      const isDebug = typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('cameraDebug') === '1'
      );
      if (!isDebug) {
        badge.style.display = 'none';
        return;
      }
      badge.style.display = 'block';
      badge.textContent = this.getDebugString();
    }
  }

  // ----------------------------------------------------
  // ЗАПУСК И ОСТАНОВКА КАМЕРЫ
  // ----------------------------------------------------
  async startCamera(facing = this.facingMode) {
    if (this.state === CameraState.REQUESTING_CAMERA) return false;
    this.clearAllTimers();
    this.state = CameraState.REQUESTING_CAMERA;
    this.facingMode = facing;
    this.errorReason = null;
    this.errorMessage = '';
    console.log('[HERO CAMERA] requesting camera');
    this.notify();

    try {
      this.stopCameraStreamTracks();

      const cap = this.checkCapability();
      if (!cap.supported) {
        this.state = CameraState.ERROR;
        this.errorReason = cap.reason;
        this.errorMessage = cap.message;
        console.error('[HERO CAMERA ERROR]', cap.message);
        this.notify();
        return false;
      }

      this.stream = await this.getBestCameraStream(this.facingMode);
      console.log('[HERO CAMERA] stream received', this.stream);

      if (this.videoEl) {
        // Требования п. 6 ТЗ (playsinline, muted, autoplay)
        this.videoEl.setAttribute('autoplay', '');
        this.videoEl.setAttribute('playsinline', '');
        this.videoEl.setAttribute('webkit-playsinline', '');
        this.videoEl.setAttribute('muted', '');
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.srcObject = this.stream;
        console.log('[HERO CAMERA] video attached');

        // Требование п. 7 ТЗ: обязательно дождаться play()
        try {
          await this.videoEl.play();
        } catch (playErr) {
          console.warn('[Camera] video.play() warning:', playErr);
        }

        // Требование ТЗ HOTFIX: дождаться РЕАЛЬНЫХ размеров видео с таймаутом 6 секунд
        const okDim = await this.waitForRealVideoDimensions(this.videoEl, 6000);
        if (!okDim) {
          throw new Error('Камера подключена, но preview не отображается (видеокадр не получен за 6 секунд).');
        }
        console.log(
          '[HERO CAMERA] ready',
          this.videoEl.videoWidth,
          this.videoEl.videoHeight,
          this.videoEl.readyState
        );
      }

      // Настройка холста ОДИН раз
      this.configureCanvasFromVideo();

      this.state = CameraState.CAMERA_READY;
      this.startRenderLoop();
      this.notify();
      return true;
    } catch (err) {
      console.error('[HERO CAMERA ERROR]', err);
      this.state = CameraState.ERROR;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.errorReason = 'permission_denied';
        this.errorMessage = 'Доступ к камере заблокирован. Разрешите доступ в настройках браузера.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        this.errorReason = 'not_found';
        this.errorMessage = 'Камера на устройстве не найдена.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.errorReason = 'in_use';
        this.errorMessage = 'Камера используется другим приложением.';
      } else {
        this.errorReason = 'unknown';
        this.errorMessage = err.message || 'Ошибка запуска камеры.';
      }
      this.notify();
      return false;
    }
  }

  isCameraPreviewLive() {
    if (!this.stream || !this.videoEl) return false;
    const vTracks = this.stream.getVideoTracks ? this.stream.getVideoTracks() : [];
    if (!vTracks.length || vTracks[0].readyState !== 'live' || !vTracks[0].enabled) return false;
    if (!this.videoEl.srcObject) return false;
    if (this.videoEl.readyState < 2) return false;
    if (this.videoEl.videoWidth === 0 || this.videoEl.videoHeight === 0) return false;
    return true;
  }

  async toggleCamera() {
    if (this.state === CameraState.REQUESTING_CAMERA || this.state === CameraState.RECORDING || this.state === CameraState.COUNTDOWN || this.state === CameraState.STARTING) {
      return false;
    }
    const nextFacing = this.facingMode === 'environment' ? 'user' : 'environment';
    this.cameraSwitchAttempts = 0;
    return this.startCamera(nextFacing);
  }

  async switchCamera(targetFacing = null) {
    if (this.state === CameraState.REQUESTING_CAMERA || this.state === CameraState.RECORDING || this.state === CameraState.COUNTDOWN || this.state === CameraState.STARTING) {
      return false;
    }
    const nextFacing = (targetFacing === 'user' || targetFacing === 'environment')
      ? targetFacing
      : (this.facingMode === 'environment' ? 'user' : 'environment');
    this.cameraSwitchAttempts = 0;
    return this.startCamera(nextFacing);
  }

  stopCameraStreamTracks() {
    this.stopRenderLoop();
    if (this.stream) {
      try {
        this.stream.getTracks().forEach(track => {
          try { track.stop(); } catch (_) {}
        });
      } catch (_) {}
      this.stream = null;
    }
    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.srcObject = null;
      } catch (_) {}
    }
  }

  stopCanvasStreamTracks() {
    if (this.canvasStream) {
      try {
        this.canvasStream.getTracks().forEach(t => {
          try { t.stop(); } catch (_) {}
        });
      } catch (_) {}
      this.canvasStream = null;
    }
    if (this.combinedStream) {
      try {
        this.combinedStream.getTracks().forEach(t => {
          try { t.stop(); } catch (_) {}
        });
      } catch (_) {}
      this.combinedStream = null;
    }
  }

  revokeRecordedUrl() {
    if (this.recordedUrl) {
      try {
        URL.revokeObjectURL(this.recordedUrl);
      } catch (_) {}
      this.recordedUrl = null;
    }
  }

  cleanupMediaObjects() {
    this.revokeRecordedUrl();
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.releaseWakeLock();

    if (this.videoEl) {
      try {
        this.videoEl.pause();
        this.videoEl.srcObject = null;
      } catch (_) {}
    }

    const previewVideo = document.querySelector('.camera-preview-player');
    if (previewVideo) {
      try {
        previewVideo.pause();
        previewVideo.removeAttribute('src');
        previewVideo.load();
      } catch (_) {}
    }
  }

  removeSystemListeners() {
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    window.removeEventListener('resize', this.boundResizeHandler);
    window.removeEventListener('orientationchange', this.boundResizeHandler);
    window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.removeEventListener) {
        window.screen.orientation.removeEventListener('change', this.boundResizeHandler);
      }
    } catch (_) {}
    try {
      const mql = window.matchMedia('(orientation: landscape)');
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener('change', this.boundResizeHandler);
        else if (mql.removeListener) mql.removeListener(this.boundResizeHandler);
      }
    } catch (_) {}
    if (this.abortController) {
      try { this.abortController.abort(); } catch (_) {}
      this.abortController = null;
    }
  }

  clearCanvas() {
    if (this.canvasEl) {
      try {
        const ctx = this.canvasEl.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
      } catch (_) {}
    }
  }

  async stopRecorderAsync() {
    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    await new Promise(resolve => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      const safetyTimer = setTimeout(done, 800);

      const previousOnStop = recorder.onstop;
      recorder.onstop = (event) => {
        clearTimeout(safetyTimer);
        if (typeof previousOnStop === 'function') {
          try {
            previousOnStop(event);
          } catch (err) {
            console.error('[stopRecorderAsync onstop error]', err);
          }
        }
        done();
      };

      try {
        recorder.stop();
      } catch (err) {
        clearTimeout(safetyTimer);
        done();
      }
    });
  }

  stopCamera() {
    this.clearAllTimers();
    this.stopCanvasStreamTracks();
    this.stopCameraStreamTracks();
    this.releaseWakeLock();
    this.cleanupMediaObjects();
    window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    this.state = CameraState.IDLE;
    this.notify();
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (_) {}
  }

  releaseWakeLock() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch (_) {}
  }

  // ----------------------------------------------------
  // РЕНДЕР: COVER ОБРЕЗКА И ФИКСИРОВАННЫЙ ХОЛСТ
  // ----------------------------------------------------
  startRenderLoop() {
    if (!this.canvasEl) return;
    const ctx = this.canvasEl.getContext('2d', { alpha: false, desynchronized: true });

    const render = () => {
      if (this.isExiting || !this.stream || !this.videoEl) {
        return;
      }

      if (this.videoEl.readyState < 2 || this.videoEl.videoWidth === 0) {
        if (!this.isExiting && this.stream) {
          this.animationId = requestAnimationFrame(render);
        }
        return;
      }

      const vw = this.videoEl.videoWidth;
      const vh = this.videoEl.videoHeight;
      const cw = this.canvasEl.width || (isLandscapeNow() ? 1920 : 1080);
      const ch = this.canvasEl.height || (isLandscapeNow() ? 1080 : 1920);

      // 1. Отрисовка видео с алгоритмом Cover (без растягивания)
      this.drawVideoCover(ctx, this.videoEl, vw, vh, cw, ch);

      // 2. Обновление точного времени видеозаписи (performance.now)
      if (this.state === CameraState.RECORDING && this.recordingStartedAt > 0) {
        const elapsedRecMs = Math.max(0, performance.now() - this.recordingStartedAt);
        this.recordedMs = elapsedRecMs;
        this.recordedSeconds = Math.floor(elapsedRecMs / 1000);
      } else if (this.state !== CameraState.RECORDING) {
        this.recordedSeconds = 0;
        this.recordedMs = 0;

        // Периодическое обновление debug-строки ориентации
        this.debugFrameCount = (this.debugFrameCount || 0) + 1;
        if (this.debugFrameCount % 25 === 0) {
          this.updateDebugString();
        }
      }

      // 3. Обновление спортивного таймера (независимо от видео)
      if (this.timerState === TimerState.RUNNING && this.timerStartedAt > 0) {
        const activeTimerMs = Math.max(0, performance.now() - this.timerStartedAt - this.timerTotalPausedMs);
        const elapsedTimerSec = Math.floor(activeTimerMs / 1000);
        this.timerElapsedSeconds = elapsedTimerSec;

        const mode = this.timerConfig.mode || 'stopwatch';
        if (mode === 'stopwatch') {
          // Если задан Time Cap и время вышло
          if (this.timerConfig.durationSeconds > 0 && elapsedTimerSec >= this.timerConfig.durationSeconds) {
            this.timerState = TimerState.FINISHED;
            this.timerFinished = true;
            this.playBeep('finish');
            this.notify();
          }
        } else if (mode === 'countdown') {
          const dur = this.timerConfig.durationSeconds || 600;
          const rem = Math.max(0, dur - elapsedTimerSec);
          this.timerRemainingSeconds = rem;
          if (rem === 0 && !this.timerFinished) {
            this.timerState = TimerState.FINISHED;
            this.timerFinished = true;
            this.playBeep('finish');
            this.notify();
          }
        } else if (mode === 'interval') {
          const intSec = Math.max(5, this.timerConfig.intervalSeconds || 60);
          const totalRounds = Math.max(1, this.timerConfig.rounds || 10);
          const totalDuration = intSec * totalRounds;

          if (elapsedTimerSec >= totalDuration) {
            this.timerState = TimerState.FINISHED;
            this.timerFinished = true;
            this.timerCurrentRound = totalRounds;
            this.timerInRoundSeconds = intSec;
            this.playBeep('finish');
            this.notify();
          } else {
            const currentRound = Math.floor(elapsedTimerSec / intSec) + 1;
            const inRoundSec = elapsedTimerSec % intSec;
            if (currentRound > this.lastAnnouncedRound) {
              this.lastAnnouncedRound = currentRound;
              this.playBeep('round');
            }
            this.timerCurrentRound = currentRound;
            this.timerInRoundSeconds = inRoundSec;
          }
        }
      }

      // 4. Отрисовка судейского табло
      this.drawOverlay(ctx, cw, ch);

      if (!this.isExiting && this.stream) {
        this.animationId = requestAnimationFrame(render);
      }
    };

    this.stopRenderLoop();
    if (!this.isExiting && this.stream) {
      this.animationId = requestAnimationFrame(render);
    }
  }

  stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  drawVideoCover(ctx, video, vw, vh, cw, ch) {
    const vAspect = vw / vh;
    const cAspect = cw / ch;

    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (vAspect > cAspect) {
      sw = vh * cAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / cAspect;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    if (this.facingMode === 'user') {
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    }
    ctx.restore();
  }

  // ----------------------------------------------------
  // ----------------------------------------------------
  // ----------------------------------------------------
  // ----------------------------------------------------
  // СПОРТИВНЫЙ СУДЕЙСКИЙ HUD (ТЗ v81: Симметричный Top-Header)
  // Левая карточка: REC + крупное ФИО + Комплекс
  // Центральная карточка: Workout Timer + КЭП
  // Правая карточка: Дата + Московское время
  // ----------------------------------------------------
  drawOverlay(ctx, w, h) {
    const isLandscape = w >= h;
    const scale = w / (isLandscape ? 1920 : 1080);
    const safeTop = Math.round(isLandscape ? 48 * scale : 44 * scale);
    const safeLeft = Math.round(isLandscape ? 60 * scale : 36 * scale);
    const safeRight = Math.round(isLandscape ? 60 * scale : 36 * scale);

    const pad = (n) => String(n).padStart(2, '0');
    const formatTime = (totalSec) => {
      const s = Math.max(0, Math.floor(totalSec));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${pad(m)}:${pad(rem)}`;
    };

    const truncate = (text, maxW) => {
      if (!text) return '';
      if (ctx.measureText(text).width <= maxW) return text;
      let cur = text;
      while (cur.length > 1 && ctx.measureText(cur + '…').width > maxW) {
        cur = cur.slice(0, -1);
      }
      return cur + '…';
    };

    // 1. Московское время (Europe/Moscow)
    const now = new Date();
    const currentSec = now.getSeconds();
    if (currentSec !== this.lastTimeTickSec || !this.cachedDateStr) {
      this.lastTimeTickSec = currentSec;
      this.cachedDateStr = this.moscowDateFormatter.format(now);
      this.cachedTimeStr = this.moscowTimeFormatter.format(now);
    }
    const isRec = this.state === CameraState.RECORDING;

    const athleteDisplay = (this.athleteName || 'АТЛЕТ НЕ УКАЗАН').toUpperCase();
    const workoutDisplay = this.workoutTitle || 'Комплекс №1 (Отбор на Игры ГТО)';

    // 2. Параметры таймера комплекса
    const timerMode = this.timerConfig.mode || 'stopwatch';
    const isRunning = this.timerState === TimerState.RUNNING;
    const isPaused = this.timerState === TimerState.PAUSED;
    const isFinished = this.timerState === TimerState.FINISHED;

    let digits = '00:00';
    if (this.timerState === TimerState.READY || this.timerState === TimerState.COUNTDOWN || this.timerState === TimerState.IDLE) {
      if (timerMode === 'stopwatch') {
        digits = '00:00';
      } else if (timerMode === 'countdown') {
        digits = formatTime(this.timerConfig.durationSeconds || 600);
      } else if (timerMode === 'interval') {
        digits = this.timerConfig.countUp ? '00:00' : formatTime(this.timerConfig.intervalSeconds || 60);
      }
    } else if (isRunning || isPaused) {
      if (timerMode === 'stopwatch') {
        digits = formatTime(this.timerElapsedSeconds);
      } else if (timerMode === 'countdown') {
        digits = formatTime(this.timerRemainingSeconds);
      } else if (timerMode === 'interval') {
        digits = this.timerConfig.countUp 
          ? formatTime(this.timerInRoundSeconds)
          : formatTime(Math.max(0, (this.timerConfig.intervalSeconds || 60) - this.timerInRoundSeconds));
      }
    } else if (isFinished) {
      if (timerMode === 'stopwatch') {
        digits = formatTime(this.timerElapsedSeconds);
      } else {
        digits = '00:00';
      }
    }

    let modeLabel = '';
    if (isFinished) {
      modeLabel = 'ВРЕМЯ ВЫШЛО';
    } else if (timerMode === 'interval') {
      modeLabel = `EMOM · ${this.timerCurrentRound}/${this.timerConfig.rounds || 10}`;
    } else if (timerMode === 'countdown') {
      modeLabel = 'ОБРАТНЫЙ ОТСЧЁТ';
    } else if (timerMode === 'stopwatch' && this.timerConfig.durationSeconds > 0) {
      modeLabel = `КЭП ${formatTime(this.timerConfig.durationSeconds)}`;
    }

    let timerBorderColor = 'rgba(96, 165, 250, 0.25)';
    if (isFinished) timerBorderColor = '#ef4444';
    else if (isRunning) timerBorderColor = 'rgba(16, 185, 129, 0.6)';
    else if (isPaused) timerBorderColor = '#f59e0b';

    ctx.save();

    if (isLandscape) {
      // ====================================================
      // LANDSCAPE 16:9 — 3 СИММЕТРИЧНЫЕ ВЕРХНИЕ КАРТОЧКИ
      // ====================================================
      const cardH = Math.round(104 * scale);
      const cardY = safeTop;

      // ----------------------------------------------------
      // ЛЕВАЯ КАРТОЧКА: REC + КРУПНОЕ ФИО + КОМПЛЕКС
      // ----------------------------------------------------
      const athBoxX = safeLeft;
      const athBoxW = Math.round(580 * scale);

      ctx.fillStyle = 'rgba(8, 17, 31, 0.82)';
      ctx.strokeStyle = isRec ? 'rgba(239, 68, 68, 0.45)' : 'rgba(96, 165, 250, 0.22)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, athBoxX, cardY, athBoxW, cardH, 14 * scale);
      ctx.fill();
      ctx.stroke();

      let nameX = athBoxX + Math.round(20 * scale);
      let maxNameW = athBoxW - Math.round(36 * scale);

      // Индикатор REC / STANDBY (ТЗ v97)
      if (isRec) {
        const flash = Math.floor(Date.now() / 500) % 2 === 0;
        ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(athBoxX + Math.round(22 * scale), cardY + Math.round(34 * scale), Math.round(6 * scale), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.round(20 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('REC', athBoxX + Math.round(34 * scale), cardY + Math.round(34 * scale));

        nameX = athBoxX + Math.round(96 * scale);
        maxNameW = athBoxW - Math.round(112 * scale);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(athBoxX + Math.round(20 * scale), cardY + Math.round(34 * scale), Math.round(5 * scale), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(15 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('STANDBY', athBoxX + Math.round(30 * scale), cardY + Math.round(34 * scale));

        nameX = athBoxX + Math.round(114 * scale);
        maxNameW = athBoxW - Math.round(124 * scale);
      }

      // Главный текст: Крупное ФИО атлета (34–38px на 1920p)
      let athFont = Math.round(36 * scale);
      ctx.font = `800 ${athFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      while (athFont > Math.round(22 * scale) && ctx.measureText(athleteDisplay).width > maxNameW) {
        athFont -= 1;
        ctx.font = `800 ${athFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncate(athleteDisplay, maxNameW), nameX, cardY + Math.round(34 * scale));

      // Вторая строка: Название комплекса (22–26px)
      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(23 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(truncate(workoutDisplay, athBoxW - Math.round(40 * scale)), athBoxX + Math.round(20 * scale), cardY + Math.round(74 * scale));

      // ----------------------------------------------------
      // ЦЕНТРАЛЬНАЯ КАРТОЧКА: WORKOUT TIMER СВЕРХУ ПО ЦЕНТРУ
      // ----------------------------------------------------
      if (timerMode !== 'none') {
        const timerW = Math.round(300 * scale);
        const timerH = cardH;
        const timerX = Math.round(w / 2 - timerW / 2);
        const timerY = cardY;

        ctx.fillStyle = 'rgba(8, 17, 31, 0.82)';
        ctx.strokeStyle = timerBorderColor;
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, timerX, timerY, timerW, timerH, 14 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';

        if (modeLabel) {
          ctx.fillStyle = isFinished ? '#ef4444' : isRunning ? '#34d399' : '#94a3b8';
          ctx.font = `bold ${Math.round(20 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(modeLabel, w / 2, timerY + Math.round(28 * scale));

          ctx.fillStyle = isFinished ? '#fca5a5' : '#ffffff';
          ctx.font = `900 ${Math.round(52 * scale)}px "Unbounded", monospace`;
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fillText(digits, w / 2, timerY + Math.round(72 * scale));
        } else {
          ctx.fillStyle = isFinished ? '#fca5a5' : '#ffffff';
          ctx.font = `900 ${Math.round(62 * scale)}px "Unbounded", monospace`;
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fillText(digits, w / 2, timerY + Math.round(52 * scale));
        }
        ctx.shadowBlur = 0;
      }

      // ----------------------------------------------------
      // ПРАВАЯ КАРТОЧКА: ДАТА И МОСКОВСКОЕ ВРЕМЯ
      // ----------------------------------------------------
      const timeBoxW = Math.round(240 * scale);
      const timeBoxH = cardH;
      const timeBoxX = w - safeRight - timeBoxW;
      const timeBoxY = cardY;

      ctx.fillStyle = 'rgba(8, 17, 31, 0.82)';
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.22)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, timeBoxX, timeBoxY, timeBoxW, timeBoxH, 14 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Дата: 13.09.2026
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(19 * scale)}px monospace`;
      ctx.fillText(this.cachedDateStr, timeBoxX + timeBoxW - Math.round(20 * scale), timeBoxY + Math.round(34 * scale));

      // Время: 06:51:46 МСК
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(25 * scale)}px monospace`;
      ctx.fillText(`${this.cachedTimeStr} МСК`, timeBoxX + timeBoxW - Math.round(20 * scale), timeBoxY + Math.round(74 * scale));

      // ----------------------------------------------------
      // ПЛАШКА ПОВТОРЕНИЙ В LANDSCAPE: СПРАВА ВНИЗУ (ТЗ v97)
      // ----------------------------------------------------
      if (this.timerConfig.repsMode !== false) {
        const repCardW = Math.round(220 * scale);
        const repCardH = (this.noReps > 0) ? Math.round(108 * scale) : Math.round(76 * scale);
        const repCardX = w - safeRight - repCardW;
        const repCardY = h - Math.round(50 * scale) - repCardH;

        ctx.fillStyle = 'rgba(8, 17, 31, 0.88)';
        ctx.strokeStyle = this.reps > 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(96, 165, 250, 0.22)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, repCardX, repCardY, repCardW, repCardH, 14 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText('ПОВТОРЫ', repCardX + repCardW / 2, repCardY + Math.round(18 * scale));

        ctx.fillStyle = '#22c55e';
        ctx.font = `900 ${Math.round(36 * scale)}px "Unbounded", monospace`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(String(this.reps || 0), repCardX + repCardW / 2, repCardY + Math.round(48 * scale));
        ctx.shadowBlur = 0;

        if (this.noReps > 0) {
          ctx.fillStyle = '#fca5a5';
          ctx.font = `bold ${Math.round(14 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillText(`NO REP: ${this.noReps}`, repCardX + repCardW / 2, repCardY + Math.round(86 * scale));
        }
      }

    } else {
      // ====================================================
      // PORTRAIT 9:16 — ВЕРХНИЙ РЯД + ТАЙМЕР + ПОВТОРЫ ПОД НИМ
      // ====================================================
      const topRowH = Math.round(102 * scale);
      const topRowY = safeTop;

      // Левая карточка: REC + Атлет + Комплекс
      const athBoxX = safeLeft;
      const athBoxW = Math.round(w * 0.58);

      ctx.fillStyle = 'rgba(8, 17, 31, 0.88)';
      ctx.strokeStyle = isRec ? 'rgba(239, 68, 68, 0.45)' : 'rgba(96, 165, 250, 0.22)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, athBoxX, topRowY, athBoxW, topRowH, 12 * scale);
      ctx.fill();
      ctx.stroke();

      let pNameX = athBoxX + Math.round(16 * scale);
      let pMaxNameW = athBoxW - Math.round(28 * scale);

      if (isRec) {
        const flash = Math.floor(Date.now() / 500) % 2 === 0;
        ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(athBoxX + Math.round(18 * scale), topRowY + Math.round(32 * scale), Math.round(5.5 * scale), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('REC', athBoxX + Math.round(28 * scale), topRowY + Math.round(32 * scale));

        pNameX = athBoxX + Math.round(80 * scale);
        pMaxNameW = athBoxW - Math.round(92 * scale);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(athBoxX + Math.round(16 * scale), topRowY + Math.round(32 * scale), Math.round(4.5 * scale), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(13 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('STANDBY', athBoxX + Math.round(26 * scale), topRowY + Math.round(32 * scale));

        pNameX = athBoxX + Math.round(96 * scale);
        pMaxNameW = athBoxW - Math.round(106 * scale);
      }

      let pAthFont = Math.round(28 * scale);
      ctx.font = `800 ${pAthFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      while (pAthFont > Math.round(18 * scale) && ctx.measureText(athleteDisplay).width > pMaxNameW) {
        pAthFont -= 1;
        ctx.font = `800 ${pAthFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(truncate(athleteDisplay, pMaxNameW), pNameX, topRowY + Math.round(32 * scale));

      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(19 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(truncate(workoutDisplay, athBoxW - Math.round(28 * scale)), athBoxX + Math.round(16 * scale), topRowY + Math.round(72 * scale));

      // Правая карточка: Дата + МСК
      const timeBoxW = Math.round(w * 0.34);
      const timeBoxH = topRowH;
      const timeBoxX = w - safeRight - timeBoxW;

      ctx.fillStyle = 'rgba(8, 17, 31, 0.88)';
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.22)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, timeBoxX, topRowY, timeBoxW, timeBoxH, 12 * scale);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(16 * scale)}px monospace`;
      ctx.fillText(this.cachedDateStr, timeBoxX + timeBoxW - Math.round(16 * scale), topRowY + Math.round(32 * scale));

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(21 * scale)}px monospace`;
      ctx.fillText(`${this.cachedTimeStr} МСК`, timeBoxX + timeBoxW - Math.round(16 * scale), topRowY + Math.round(72 * scale));

      // Центральная карточка таймера в Portrait (под верхним рядом, без пересечений)
      let timerBottomY = topRowY + topRowH;
      if (timerMode !== 'none') {
        const timerW = Math.round(310 * scale);
        const timerH = Math.round(94 * scale);
        const timerX = Math.round(w / 2 - timerW / 2);
        const timerY = topRowY + topRowH + Math.round(18 * scale);
        timerBottomY = timerY + timerH;

        ctx.fillStyle = 'rgba(8, 17, 31, 0.88)';
        ctx.strokeStyle = timerBorderColor;
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, timerX, timerY, timerW, timerH, 14 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        if (modeLabel) {
          ctx.fillStyle = isFinished ? '#ef4444' : isRunning ? '#34d399' : '#94a3b8';
          ctx.font = `bold ${Math.round(17 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(modeLabel, w / 2, timerY + Math.round(24 * scale));

          ctx.fillStyle = isFinished ? '#fca5a5' : '#ffffff';
          ctx.font = `900 ${Math.round(48 * scale)}px "Unbounded", monospace`;
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fillText(digits, w / 2, timerY + Math.round(64 * scale));
        } else {
          ctx.fillStyle = isFinished ? '#fca5a5' : '#ffffff';
          ctx.font = `900 ${Math.round(54 * scale)}px "Unbounded", monospace`;
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fillText(digits, w / 2, timerY + Math.round(47 * scale));
        }
        ctx.shadowBlur = 0;
      }

      // ТЗ v97: Карточка повторений в Portrait (под таймером по центру)
      if (this.timerConfig.repsMode !== false) {
        const repsW = Math.round(310 * scale);
        const repsH = Math.round(56 * scale);
        const repsX = Math.round(w / 2 - repsW / 2);
        const repsY = timerBottomY + Math.round(12 * scale);

        ctx.fillStyle = 'rgba(8, 17, 31, 0.88)';
        ctx.strokeStyle = this.reps > 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(96, 165, 250, 0.22)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, repsX, repsY, repsW, repsH, 12 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.textBaseline = 'middle';
        if (this.noReps > 0) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${Math.round(13 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillText('ПОВТОРЫ', repsX + Math.round(repsW * 0.26), repsY + Math.round(17 * scale));
          ctx.fillStyle = '#22c55e';
          ctx.font = `900 ${Math.round(26 * scale)}px "Unbounded", monospace`;
          ctx.fillText(String(this.reps || 0), repsX + Math.round(repsW * 0.26), repsY + Math.round(39 * scale));

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(repsX + repsW / 2, repsY + 6 * scale);
          ctx.lineTo(repsX + repsW / 2, repsY + repsH - 6 * scale);
          ctx.stroke();

          ctx.fillStyle = '#fca5a5';
          ctx.font = `bold ${Math.round(13 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillText('NO REP', repsX + Math.round(repsW * 0.74), repsY + Math.round(17 * scale));
          ctx.fillStyle = '#ef4444';
          ctx.font = `900 ${Math.round(26 * scale)}px "Unbounded", monospace`;
          ctx.fillText(String(this.noReps), repsX + Math.round(repsW * 0.74), repsY + Math.round(39 * scale));
        } else {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillText('ПОВТОРЕНИЯ: ', repsX + Math.round(repsW * 0.40), repsY + Math.round(repsH / 2));
          ctx.fillStyle = '#22c55e';
          ctx.font = `900 ${Math.round(30 * scale)}px "Unbounded", monospace`;
          ctx.fillText(String(this.reps || 0), repsX + Math.round(repsW * 0.72), repsY + Math.round(repsH / 2));
        }
      }
    }

    ctx.restore();

    // ----------------------------------------------------
    // ЦЕНТР КАДРА: COUNTDOWN 3..2..1..СТАРТ (ТЗ v67.1 п. 7, 16, ТЗ v97)
    // ----------------------------------------------------
    if (this.state === CameraState.COUNTDOWN || this.timerState === TimerState.COUNTDOWN) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, w, h);

      const cdText = this.countdownText || this.timerCountdownText || '3';
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.round(isLandscape ? 150 * scale : 140 * scale)}px "Unbounded", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 24;
      ctx.fillText(cdText, w / 2, h / 2 - Math.round(10 * scale));

      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(24 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText('ПРИГОТОВЬТЕСЬ!', w / 2, h / 2 + Math.round(90 * scale));
      ctx.restore();
    }

    // Предупреждение о повороте телефона
    if (this.orientationMismatch) {
      ctx.save();
      const warnH = Math.round(44 * scale);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.92)';
      ctx.fillRect(0, h / 2 - warnH / 2, w, warnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(16 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ НЕ ПОВОРАЧИВАЙТЕ ТЕЛЕФОН ВО ВРЕМЯ ЗАПИСИ', w / 2, h / 2);
      ctx.restore();
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ----------------------------------------------------
  // ЗАПУСК ВИДЕОЗАПИСИ (ТЗ v67, ТЗ v97)
  // ----------------------------------------------------
  async startVideoRecording() {
    if (this.state === CameraState.STARTING || this.state === CameraState.RECORDING || this.state === CameraState.COUNTDOWN) {
      return false;
    }

    // Инициализация звука на пользовательский клик для iOS Safari
    this.initAudioContext();
    this.clearAllTimers();
    this._suppressAutoTimer = false; // v117: авто-режим всегда стартует таймер сам

    // 1. Проверяем наличие потока или запускаем камеру: IDLE -> REQUESTING_CAMERA -> CAMERA_READY
    if (!this.stream || !this.isCameraFrameReady()) {
      const ok = await this.startCamera(this.facingMode);
      if (!ok) {
        this.cancelCountdown();
        this.state = CameraState.ERROR;
        this.errorMessage = this.errorMessage || 'Камера не готова. Проверьте разрешение.';
        this.notify();
        return false;
      }
    }

    // 2. Строгая проверка готовности видеокадра: videoWidth, videoHeight, readyState >= 2
    if (!this.isCameraFrameReady()) {
      const okDim = await this.waitForRealVideoDimensions(this.videoEl, 5000);
      if (!okDim || !this.isCameraFrameReady()) {
        this.cancelCountdown();
        this.state = CameraState.ERROR;
        this.errorMessage = 'Камера не готова: не удалось получить живой видеокадр.';
        this.notify();
        return false;
      }
    }

    if (this.videoEl.paused) {
      try { await this.videoEl.play(); } catch (_) {}
    }

    // 3. Физическая настройка разрешения и ориентации canvas ДО старта записи (1080x1920 / 1920x1080)
    this.configureRecordingOutput();

    // 4. Проверка готовности холста к захвату
    if (!this.canvasEl || this.canvasEl.width <= 0 || this.canvasEl.height <= 0) {
      this.cancelCountdown();
      this.state = CameraState.ERROR;
      this.errorMessage = 'Ошибка инициализации холста записи.';
      this.notify();
      return false;
    }

    // Сброс спортивного таймера в режим ожидания
    this.timerState = (this.timerConfig.mode === 'none') ? TimerState.IDLE : TimerState.READY;
    this.timerStartedAt = 0;
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = this.timerConfig.durationSeconds || 600;
    this.timerCurrentRound = 1;
    this.timerInRoundSeconds = 0;
    this.timerFinished = false;
    this.lastAnnouncedRound = 1;

    // Сброс повторений и событий перед новой записью
    this.reps = 0;
    this.noReps = 0;
    this.events = [];
    this.recordingStartedAt = null;
    this.exerciseStartedAt = null;
    this.fileDurationMs = 0;
    this.exerciseDurationMs = 0;

    // Получаем значение обратного отсчета (0, 3, 5, 10 сек; по умолчанию 5)
    let cdSec = 5;
    if (this.timerConfig.preStartSeconds !== undefined && this.timerConfig.preStartSeconds !== null) {
      cdSec = Math.max(0, parseInt(this.timerConfig.preStartSeconds, 10) || 0);
    }

    this.countdownId = (this.countdownId || 0) + 1;
    const currentCountdownId = this.countdownId;

    if (cdSec <= 0) {
      this.isCountingDown = false;
      this.countdownSeconds = null;
      this.countdownText = '';
      this.state = CameraState.STARTING;
      this.notify();

      this.startMediaRecording(false);
      this.state = CameraState.RECORDING;
      this.exerciseStartedAt = performance.now();
      this.startTimerNow();
      this.notify();
      return true;
    }

    // Состояние COUNTDOWN от абсолютного времени performance.now() (HOTFIX v116)
    this.isCountingDown = true;
    this.countdownSeconds = cdSec;
    this.countdownText = String(cdSec);
    this.timerCountdownSeconds = cdSec;
    this.timerCountdownText = String(cdSec);
    this.state = CameraState.COUNTDOWN;
    this.notify();

    // Запускаем MediaRecorder для доказательного видео (pre-roll)
    this.startMediaRecording(true);

    const countdownStartedAt = performance.now();
    const countdownDurationMs = cdSec * 1000;
    let lastReportedSec = cdSec;

    this.playBeep('countdown');

    const updateCountdown = () => {
      if (this.countdownId !== currentCountdownId) return;
      if (this.state !== CameraState.COUNTDOWN) return;

      const elapsed = performance.now() - countdownStartedAt;
      const remainingMs = countdownDurationMs - elapsed;

      if (remainingMs > 0) {
        const sec = Math.ceil(remainingMs / 1000);
        if (sec !== lastReportedSec) {
          lastReportedSec = sec;
          this.countdownSeconds = sec;
          this.countdownText = String(sec);
          this.timerCountdownSeconds = sec;
          this.timerCountdownText = String(sec);
          this.playBeep('countdown');
          this.notify();
        }
        // HOTFIX v116: отсчёт ведёт setInterval(100ms) ниже; rAF убран — он встаёт при сворачивании/блокировке экрана и плодил параллельные цепочки
      } else if (remainingMs > -500) {
        // Показываем "СТАРТ" в течение 500мс
        if (this.countdownText !== 'СТАРТ') {
          this.countdownSeconds = 0;
          this.countdownText = 'СТАРТ';
          this.timerCountdownSeconds = 0;
          this.timerCountdownText = 'СТАРТ';
          this.playBeep('start');
          this.notify();
        }
        // HOTFIX v116: отсчёт ведёт setInterval(100ms) ниже; rAF убран — он встаёт при сворачивании/блокировке экрана и плодил параллельные цепочки
      } else {
        // Завершение отсчета: полное уничтожение countdown и старт секундомера с 00:00.0
        if (this.countdownAnimFrame) {
          cancelAnimationFrame(this.countdownAnimFrame);
          this.countdownAnimFrame = null;
        }
        if (this.countdownTimerId) {
          clearInterval(this.countdownTimerId);
          this.countdownTimerId = null;
        }
        this.isCountingDown = false;
        this.countdownSeconds = null;
        this.countdownText = '';
        this.timerCountdownSeconds = 0;
        this.timerCountdownText = '';
        this.state = CameraState.RECORDING;
        this.exerciseStartedAt = performance.now();
        this.startTimerNow();
        this.notify();
        console.info('[Countdown Finish] Transitioned from COUNTDOWN to RECORDING');
      }
    };

    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    this.countdownTimerId = setInterval(updateCountdown, 100);
    // HOTFIX v116: старт отсчёта ведёт setInterval выше (без requestAnimationFrame)
    return true;
  }

  // Для обратной совместимости
  async beginRecordingWithCountdown() {
    return this.startVideoRecording();
  }

  // ----------------------------------------------------
  // РУЧНОЙ РЕЖИМ (v117): сначала запись, потом «Старт» с отсчётом
  // Камера начинает писать сразу, БЕЗ обратного отсчёта и БЕЗ старта
  // таймера попытки (таймер стоит на 00:00 в состоянии READY).
  // Отсчёт 3-2-1 и таймер попытки запускаются позже через
  // startTimerWithCountdown() по кнопке «Старт».
  // ----------------------------------------------------
  async startRecordingManual() {
    if (this.state === CameraState.STARTING || this.state === CameraState.RECORDING || this.state === CameraState.COUNTDOWN) {
      return false;
    }

    this.initAudioContext();
    this.clearAllTimers();

    // 1. Камера готова (тот же строгий гейт, что и в startVideoRecording)
    if (!this.stream || !this.isCameraFrameReady()) {
      const ok = await this.startCamera(this.facingMode);
      if (!ok) {
        this.state = CameraState.ERROR;
        this.errorMessage = this.errorMessage || 'Камера не готова. Проверьте разрешение.';
        this.notify();
        return false;
      }
    }
    if (!this.isCameraFrameReady()) {
      const okDim = await this.waitForRealVideoDimensions(this.videoEl, 5000);
      if (!okDim || !this.isCameraFrameReady()) {
        this.state = CameraState.ERROR;
        this.errorMessage = 'Камера не готова: не удалось получить живой видеокадр.';
        this.notify();
        return false;
      }
    }
    if (this.videoEl && this.videoEl.paused) {
      try { await this.videoEl.play(); } catch (_) {}
    }

    this.configureRecordingOutput();
    if (!this.canvasEl || this.canvasEl.width <= 0 || this.canvasEl.height <= 0) {
      this.state = CameraState.ERROR;
      this.errorMessage = 'Ошибка инициализации холста записи.';
      this.notify();
      return false;
    }

    // 2. Таймер попытки в ожидании (00:00), без автозапуска
    this.timerState = (this.timerConfig.mode === 'none') ? TimerState.IDLE : TimerState.READY;
    this.timerStartedAt = 0;
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = this.timerConfig.durationSeconds || 600;
    this.timerCurrentRound = 1;
    this.timerInRoundSeconds = 0;
    this.timerFinished = false;
    this.lastAnnouncedRound = 1;

    this.reps = 0;
    this.noReps = 0;
    this.events = [];
    this.recordingStartedAt = null;
    this.exerciseStartedAt = null;
    this.fileDurationMs = 0;
    this.exerciseDurationMs = 0;

    this.countdownId = (this.countdownId || 0) + 1;
    this.isCountingDown = false;
    this.countdownSeconds = null;
    this.countdownText = '';
    this.timerCountdownSeconds = 0;
    this.timerCountdownText = '';

    // 3. Пишем без автозапуска таймера попытки
    this._suppressAutoTimer = true;
    this.state = CameraState.STARTING;
    this.notify();
    return this.startMediaRecording(false);
  }

  // ----------------------------------------------------
  // НЕЗАВИСИМОЕ УПРАВЛЕНИЕ ТАЙМЕРОМ КОМПЛЕКСА (ТЗ v67)
  // ----------------------------------------------------
  startTimerWithCountdown() {
    if (this.timerState === TimerState.COUNTDOWN || this.timerState === TimerState.RUNNING) {
      return false;
    }
    this.initAudioContext();

    const preStart = Number(this.timerConfig.preStartSeconds ?? 5);
    if (preStart <= 0) {
      this.startTimerNow();
      return true;
    }

    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }

    this.timerState = TimerState.COUNTDOWN;
    this.timerCountdownSeconds = preStart;
    this.timerCountdownText = String(preStart);
    this.playBeep('countdown');
    this.notify();

    this.countdownTimerId = setInterval(() => {
      this.timerCountdownSeconds--;
      if (this.timerCountdownSeconds > 0) {
        this.timerCountdownText = String(this.timerCountdownSeconds);
        this.playBeep('countdown');
        this.notify();
      } else if (this.timerCountdownSeconds === 0) {
        this.timerCountdownText = 'СТАРТ!';
        this.playBeep('start');
        this.notify();
      } else {
        clearInterval(this.countdownTimerId);
        this.countdownTimerId = null;
        this.timerCountdownText = '';
        this.startTimerNow();
      }
    }, 1000);

    return true;
  }

  startTimerNow() {
    this.initAudioContext();
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    // v117: старт таймера попытки == момент начала попытки (для ручного режима считаем от «Старт»)
    if (!this.exerciseStartedAt) {
      this.exerciseStartedAt = performance.now();
    }
    this.timerState = TimerState.RUNNING;
    this.timerStartedAt = performance.now();
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = this.timerConfig.durationSeconds || 600;
    this.timerCurrentRound = 1;
    this.timerInRoundSeconds = 0;
    this.timerFinished = false;
    this.lastAnnouncedRound = 1;
    this.playBeep('start');
    this.notify();
  }

  pauseTimer() {
    if (this.timerState === TimerState.RUNNING) {
      this.timerState = TimerState.PAUSED;
      this.timerPausedAt = performance.now();
      this.notify();
    }
  }

  resumeTimer() {
    if (this.timerState === TimerState.PAUSED) {
      if (this.timerPausedAt > 0) {
        this.timerTotalPausedMs += (performance.now() - this.timerPausedAt);
        this.timerPausedAt = 0;
      }
      this.timerState = TimerState.RUNNING;
      this.notify();
    }
  }

  resetTimer() {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    this.timerState = (this.timerConfig.mode === 'none') ? TimerState.IDLE : TimerState.READY;
    this.timerStartedAt = 0;
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = this.timerConfig.durationSeconds || 600;
    this.timerCurrentRound = 1;
    this.timerInRoundSeconds = 0;
    this.timerFinished = false;
    this.lastAnnouncedRound = 1;
    this.notify();
  }

  startMediaRecording(withCountdown = false) {
    this.clearAllTimers();
    this.state = withCountdown ? CameraState.COUNTDOWN : CameraState.STARTING;
    this.notify();

    // 1. Физически выставить canvas ДО captureStream (ТЗ v67.2 п. 1, 3, 20)
    this.configureRecordingOutput();

    // 2. Двойная проверка: при горизонтальном телефоне canvas ОБЯЗАН быть 1920x1080
    const isLandscape = isLandscapeNow();
    if (isLandscape && (this.canvasEl.width <= this.canvasEl.height || this.canvasEl.width !== 1920)) {
      console.warn('[Recording] Enforcing 1920x1080 for landscape canvas');
      this.canvasEl.width = 1920;
      this.canvasEl.height = 1080;
      this.lockedCanvasWidth = 1920;
      this.lockedCanvasHeight = 1080;
      this.lockedOrientation = 'landscape';
    } else if (!isLandscape && (this.canvasEl.width >= this.canvasEl.height || this.canvasEl.height !== 1920)) {
      console.warn('[Recording] Enforcing 1080x1920 for portrait canvas');
      this.canvasEl.width = 1080;
      this.canvasEl.height = 1920;
      this.lockedCanvasWidth = 1080;
      this.lockedCanvasHeight = 1920;
      this.lockedOrientation = 'portrait';
    }

    // 3. Зафиксировать параметры геометрии записи
    this.recordingOrientation = this.lockedOrientation;
    this.recordingWidth = this.canvasEl.width;
    this.recordingHeight = this.canvasEl.height;

    // 4. Обязательный лог
    console.log('[Recording canvas]', {
      width: this.canvasEl.width,
      height: this.canvasEl.height,
      orientation: this.canvasEl.width > this.canvasEl.height ? 'landscape' : 'portrait',
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      sourceVideo: `${this.videoEl?.videoWidth}×${this.videoEl?.videoHeight}`
    });

    // 5. Отрисовать свежий кадр в canvas перед вызовом captureStream
    this.renderSingleFrame();

    // 6. Проверка доступности камеры и треков
    const cameraTrack = this.stream ? this.stream.getVideoTracks()[0] : null;
    if (!cameraTrack || cameraTrack.readyState !== 'live') {
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Поток камеры не активен. Перезапустите камеру.';
      this.notify();
      return false;
    }

    if (this.videoEl && this.videoEl.paused) {
      try { this.videoEl.play(); } catch (_) {}
    }

    if (!this.canvasEl) {
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Холст для записи недоступен';
      this.notify();
      return false;
    }

    if (typeof this.canvasEl.captureStream !== 'function') {
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Ваш браузер не поддерживает canvas.captureStream';
      this.notify();
      return false;
    }

    // 7. Захват потока из 1920x1080 canvas
    let canvasStream = null;
    try {
      canvasStream = this.canvasEl.captureStream(30);
      this.canvasStream = canvasStream;
    } catch (e) {
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Ошибка захвата видеопотока: ' + e.message;
      this.notify();
      return false;
    }

    // 8. Проверка трека захваченного canvas
    const videoTracks = canvasStream.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0 || videoTracks[0].readyState !== 'live') {
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Видеотрек холста не активен';
      this.notify();
      return false;
    }

    const canvasTrack = videoTracks[0];
    console.log('[Canvas track]', {
      readyState: canvasTrack.readyState,
      settings: canvasTrack.getSettings ? canvasTrack.getSettings() : null
    });

    // 9. Микширование аудиодорожки микрофона с защитой от сбоев Safari
    let streamToRecord = canvasStream;
    try {
      const audioTracks = this.stream ? this.stream.getAudioTracks() : [];
      if (audioTracks.length > 0) {
        const combined = new MediaStream();
        combined.addTrack(videoTracks[0]);
        combined.addTrack(audioTracks[0]);
        streamToRecord = combined;
        this.combinedStream = combined;
      }
    } catch (mixErr) {
      console.warn('[Recorder] Audio track mix error, fallback to canvasStream:', mixErr);
      streamToRecord = canvasStream;
    }

    const preferredTypes = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];

    let selectedMime = '';
    for (const t of preferredTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        selectedMime = t;
        break;
      }
    }

    this.actualMimeType = selectedMime;
    this.actualExtension = (selectedMime && selectedMime.includes('mp4')) ? 'mp4' : 'webm';

    this.recordedChunks = [];
    if (this.recordedUrl) {
      try { URL.revokeObjectURL(this.recordedUrl); } catch (_) {}
      this.recordedUrl = null;
    }
    this.recordedBlob = null;

    try {
      const options = selectedMime ? { mimeType: selectedMime } : {};
      this.mediaRecorder = new MediaRecorder(streamToRecord, options);
    } catch (err) {
      console.warn('[Recorder] MediaRecorder with streamToRecord failed, trying raw canvasStream:', err);
      try {
        this.mediaRecorder = new MediaRecorder(canvasStream);
      } catch (rawErr) {
        this.state = CameraState.CAMERA_READY;
        this.errorMessage = 'Браузер не смог создать рекордер: ' + rawErr.message;
        this.notify();
        return false;
      }
    }

    console.info('[Recorder] Pre-start diagnostics:', {
      state: this.mediaRecorder.state,
      mimeType: this.mediaRecorder.mimeType || selectedMime,
      canvasTracks: streamToRecord.getTracks().map(t => ({ kind: t.kind, readyState: t.readyState })),
      hasAudio: streamToRecord.getAudioTracks().length > 0
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.clearAllTimers();
      this.countdownSeconds = null;
      this.countdownText = '';
      this.isCountingDown = false;
      if (this.isExiting || this.isDiscarding) {
        console.info('[Recorder] onstop discarded by exit/cancellation');
        this.recordedChunks = [];
        this.revokeRecordedUrl();
        this.recordedBlob = null;
        this.stopCanvasStreamTracks();
        this.stopCameraStreamTracks();
        this.releaseWakeLock();
        window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
        this.state = CameraState.IDLE;
        return;
      }
      console.info('[Recorder] onstop triggered, chunks count:', this.recordedChunks.length);
      const finalMime = this.mediaRecorder.mimeType || this.actualMimeType || 'video/mp4';
      this.recordedBlob = new Blob(this.recordedChunks, { type: finalMime });
      this.recordedUrl = URL.createObjectURL(this.recordedBlob);

      this.stopCanvasStreamTracks();
      this.stopCameraStreamTracks();
      this.releaseWakeLock();
      window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);

      this.state = CameraState.PREVIEW;
      this.notify();
    };

    const triggerRecordingStart = () => {
      if (this.recordingStartedAt) return;
      this.recordingStartedAt = performance.now();
      this.recordedSeconds = 0;
      this.recordedMs = 0;
      this.wasMinimizedDuringRecording = false;

      if (withCountdown) {
        this.state = CameraState.COUNTDOWN;
        this.timerState = TimerState.READY;
        this.timerStartedAt = 0;
        this.timerElapsedSeconds = 0;
      } else {
        this.state = CameraState.RECORDING;
        this.isCountingDown = false;
        this.countdownSeconds = null;
        this.countdownText = '';
        this.exerciseStartedAt = performance.now();
        // v117: в ручном режиме таймер попытки НЕ стартует автоматически — ждёт кнопку «Старт»
        if (!this._suppressAutoTimer && this.timerConfig.timerAutoStart !== false && this.timerConfig.mode !== 'none') {
          this.startTimerNow();
        } else {
          this.timerState = (this.timerConfig.mode === 'none') ? TimerState.IDLE : TimerState.READY;
          this.exerciseStartedAt = 0;
        }
        this._suppressAutoTimer = false;
      }

      this.requestWakeLock();
      window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);
      this.notify();
      console.info('[HERO CAMERA] MediaRecorder started successfully, withCountdown:', withCountdown);
    };

    this.mediaRecorder.onstart = () => {
      triggerRecordingStart();
    };

    // Защитный таймаут 3.5 сек: если onstart не сработал
    this.startTimeoutId = setTimeout(() => {
      if (this.state === CameraState.STARTING || this.state === CameraState.COUNTDOWN) {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          console.warn('[Recorder] onstart event was not dispatched but mediaRecorder is recording');
          triggerRecordingStart();
          return;
        }
        console.error('[Recorder] onstart timed out after 3500ms');
        try { this.mediaRecorder.stop(); } catch (_) {}
        this.state = CameraState.CAMERA_READY;
        this.errorMessage = 'Не удалось запустить запись кодеком браузера. Попробуйте еще раз.';
        this.notify();
      }
    }, 3500);

    try {
      this.mediaRecorder.start(1000);
      if (this.mediaRecorder.state === 'recording') {
        triggerRecordingStart();
      }
      return true;
    } catch (e) {
      this.clearAllTimers();
      console.error('[Recorder] MediaRecorder.start failed:', e);
      this.state = CameraState.CAMERA_READY;
      this.errorMessage = 'Не удалось начать запись: ' + e.message;
      this.notify();
      return false;
    }
  }

  // ----------------------------------------------------
  // ЗАВЕРШЕНИЕ И ОТМЕНА ЗАПИСИ (ТЗ v67.4, ТЗ Разделение)
  // ----------------------------------------------------
  stopRecording() {
    this.clearAllTimers();
    this.countdownSeconds = null;
    this.countdownText = '';
    this.isCountingDown = false;
    this.timerState = TimerState.FINISHED;

    const now = performance.now();
    this.fileDurationMs = this.recordingStartedAt ? Math.round(now - this.recordingStartedAt) : 0;
    this.exerciseDurationMs = this.exerciseStartedAt ? Math.round(now - this.exerciseStartedAt) : this.fileDurationMs;

    console.info('[Recorder] stopRecording called:', {
      fileDurationMs: this.fileDurationMs,
      exerciseDurationMs: this.exerciseDurationMs
    });

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.state = CameraState.STOPPING;
      this.notify();
      try {
        this.mediaRecorder.stop();
      } catch (_) {
        this.state = CameraState.CAMERA_READY;
        this.notify();
      }
    } else {
      this.stopCameraStreamTracks();
      this.state = CameraState.CAMERA_READY;
      this.notify();
    }
  }

  discardAndStopRecording() {
    this.isDiscarding = true;
    this.clearAllTimers();
    this.countdownSeconds = null;
    this.countdownText = '';
    this.isCountingDown = false;
    this.timerState = TimerState.IDLE;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }

    this.recordedChunks = [];
    this.revokeRecordedUrl();
    this.recordedBlob = null;
    this.stopCanvasStreamTracks();
    this.stopCameraStreamTracks();
    this.releaseWakeLock();
    window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
    this.state = CameraState.IDLE;
    this.notify();
  }

  cancelCountdown() {
    this.countdownId = (this.countdownId || 0) + 1;
    this.clearAllTimers();
    this.countdownSeconds = null;
    this.countdownText = '';
    this.isCountingDown = false;
    this.timerCountdownSeconds = 0;
    this.timerCountdownText = '';
    this.recordingStartedAt = null;
    this.exerciseStartedAt = null;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.isDiscarding = true;
      try { this.mediaRecorder.stop(); } catch (_) {}
    }

    if (this.stream && this.isCameraFrameReady()) {
      this.state = CameraState.CAMERA_READY;
    } else {
      this.state = CameraState.IDLE;
    }
    this.timerState = TimerState.READY;
    this.notify();
  }

  clearRecordedVideo() {
    this.revokeRecordedUrl();
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.countdownSeconds = null;
    this.countdownText = '';
    this.isCountingDown = false;
    this.state = CameraState.IDLE;
    this.stopCanvasStreamTracks();
    this.stopCameraStreamTracks();
    this.releaseWakeLock();
    this.notify();
  }

  // ----------------------------------------------------
  // СТАТИСТИКА И ЭКСПОРТ
  // ----------------------------------------------------
  getRecordingStats() {
    if (!this.recordedBlob) return null;
    const mb = (this.recordedBlob.size / (1024 * 1024)).toFixed(1);
    const mins = String(Math.floor(this.recordedSeconds / 60)).padStart(2, '0');
    const secs = String(this.recordedSeconds % 60).padStart(2, '0');
    const formatName = this.actualExtension.toUpperCase();
    const w = this.recordingWidth || this.lockedCanvasWidth || (isLandscapeNow() ? 1920 : 1080);
    const h = this.recordingHeight || this.lockedCanvasHeight || (isLandscapeNow() ? 1080 : 1920);
    const aspect = w > h ? '16:9' : '9:16';
    const resText = `${w}×${h} (${aspect})`;

    return {
      sizeMb: mb,
      sizeText: `${mb} МБ`,
      durationText: `${mins}:${secs}`,
      durationSec: this.recordedSeconds,
      resolutionText: resText,
      formatText: formatName,
      reps: this.reps || 0,
      noReps: this.noReps || 0,
      events: this.events || [],
      wasMinimized: this.wasMinimizedDuringRecording
    };
  }

  getSafeFilename() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const athleteClean = (this.athleteName || 'gto_athlete')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 40);
    const workoutClean = (this.workoutTitle || 'WOD')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 30);
    return `GTO_${athleteClean}_${workoutClean}_${date}_${time}.${this.actualExtension}`;
  }

  downloadVideo() {
    if (!this.recordedUrl || !this.recordedBlob) return false;
    const filename = this.getSafeFilename();
    const a = document.createElement('a');
    a.href = this.recordedUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 200);
    return true;
  }

  async shareVideo() {
    if (!this.recordedBlob) return false;
    const filename = this.getSafeFilename();
    const file = new File([this.recordedBlob], filename, { type: this.recordedBlob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Судейская видеозапись · Игры ГТО',
          text: `Судейская видеозапись отбора на Игры ГТО: ${this.athleteName || 'Атлет'} · ${this.workoutTitle}`
        });
        return { success: true, method: 'share' };
      } catch (e) {
        if (e.name === 'AbortError') return { success: false, method: 'cancelled' };
        console.warn('[Recorder] Share Sheet error, fallback to download:', e);
      }
    }

    this.downloadVideo();
    return { success: true, method: 'download' };
  }

  retry() {
    this.clearAllTimers();
    if (this.recordedUrl) {
      try { URL.revokeObjectURL(this.recordedUrl); } catch (_) {}
      this.recordedUrl = null;
    }
    this.recordedBlob = null;
    this.recordedChunks = [];
    this.stopCanvasStreamTracks();
    this.recordedSeconds = 0;
    this.recordedMs = 0;
    this.timerCountdownSeconds = 0;
    this.timerCountdownText = '';
    this.timerStartedAt = 0;
    this.timerPausedAt = 0;
    this.timerTotalPausedMs = 0;
    this.timerElapsedSeconds = 0;
    this.timerRemainingSeconds = 0;
    this.timerFinished = false;
    this.wasMinimizedDuringRecording = false;
    this.state = CameraState.IDLE;
    this.timerState = TimerState.IDLE;
    return this.startCamera();
  }

  destroy() {
    this.isExiting = true;
    this.clearAllTimers();
    this.stopRenderLoop();
    this.stopCanvasStreamTracks();
    this.stopCameraStreamTracks();
    this.cleanupMediaObjects();
    this.removeSystemListeners();
    this.clearCanvas();
    this.state = CameraState.IDLE;
  }

  getFormattedTimerString() {
    if (this.timerConfig && this.timerConfig.mode === 'countdown') {
      const dur = this.timerConfig.durationSeconds || 60;
      let elapsedMs = 0;
      if (this.state === CameraState.RECORDING && this.exerciseStartedAt > 0) {
        elapsedMs = Math.max(0, performance.now() - this.exerciseStartedAt);
      } else if (this.timerState === TimerState.RUNNING && this.timerStartedAt > 0) {
        elapsedMs = Math.max(0, performance.now() - this.timerStartedAt - (this.timerTotalPausedMs || 0));
      }
      const remMs = Math.max(0, (dur * 1000) - elapsedMs);
      const totalSec = Math.ceil(remMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    let ms = 0;
    if (this.state === CameraState.RECORDING) {
      // v117: HUD показывает таймер ПОПЫТКИ (от «Старт»), а не время файла.
      // В ручном режиме до «Старт» exerciseStartedAt=0 → на табло 00:00.0.
      if (this.exerciseStartedAt && this.exerciseStartedAt > 0) {
        ms = Math.max(0, performance.now() - this.exerciseStartedAt);
      }
    } else if (this.timerState === TimerState.RUNNING && this.timerStartedAt > 0) {
      ms = Math.max(0, performance.now() - this.timerStartedAt - (this.timerTotalPausedMs || 0));
    }
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
  }

  notify() {
    const cdSec = (this.countdownSeconds !== null && this.countdownSeconds !== undefined) 
      ? this.countdownSeconds 
      : this.timerCountdownSeconds;
    const cdText = this.countdownText || this.timerCountdownText || '';

    this.onStateChange({
      state: this.state,
      timerState: this.timerState,
      timerConfig: this.timerConfig,
      hasStream: !!this.stream,
      facingMode: this.facingMode,
      isRecording: this.state === CameraState.RECORDING,
      isStarting: this.state === CameraState.STARTING,
      isCountdown: this.state === CameraState.COUNTDOWN || this.timerState === TimerState.COUNTDOWN,
      timerRunning: this.timerState === TimerState.RUNNING,
      timerPaused: this.timerState === TimerState.PAUSED,
      timerFinished: this.timerState === TimerState.FINISHED,
      timerReady: this.timerState === TimerState.READY,
      countdownSeconds: cdSec,
      countdownText: cdText,
      timerCountdownSeconds: cdSec,
      timerCountdownText: cdText,
      timeFormatted: this.getFormattedTimerString(),
      timerElapsedSeconds: this.timerElapsedSeconds,
      timerRemainingSeconds: this.timerRemainingSeconds,
      timerCurrentRound: this.timerCurrentRound,
      timerInRoundSeconds: this.timerInRoundSeconds,
      recordedSeconds: this.recordedSeconds,
      recordedUrl: this.recordedUrl,
      recordedBlob: this.recordedBlob,
      reps: this.reps || 0,
      noReps: this.noReps || 0,
      events: this.events || [],
      hasAudio: this.hasAudioTrack,
      audioDenied: this.audioDenied,
      errorReason: this.errorReason,
      errorMessage: this.errorMessage,
      stats: this.getRecordingStats()
    });
  }
}
