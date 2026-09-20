// Спортивный функциональный аудио-таймер для тренировок многоборья ГТО
// Работает 100% автономно через Web Audio API (без внешних аудиофайлов и интернета)

class GtoAudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  beep(freq = 880, duration = 0.15, type = 'sine') {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  // 3-2-1 отсчет: короткий средний тон
  cueCount() {
    this.beep(880, 0.15, 'triangle');
    try { if ('vibrate' in navigator) navigator.vibrate(50); } catch (_) {}
  }

  // СТАРТ / РАБОТА: высокий звонкий сигнал
  cueStart() {
    this.beep(1760, 0.45, 'sine');
    try { if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]); } catch (_) {}
  }

  // ОТДЫХ: двойной мягкий сигнал
  cueRest() {
    this.beep(660, 0.25, 'sine');
    try { if ('vibrate' in navigator) navigator.vibrate(80); } catch (_) {}
  }

  // ФИНИШ: победный аккорд
  cueFinish() {
    this.beep(1174, 0.2, 'triangle');
    setTimeout(() => this.beep(1760, 0.5, 'sine'), 180);
    try { if ('vibrate' in navigator) navigator.vibrate([150, 100, 250]); } catch (_) {}
  }
}

export const soundEngine = new GtoAudioEngine();

export class GtoTimer {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.mode = 'tabata'; // 'emom' | 'amrap' | 'tabata' | 'for_time'
    this.status = 'idle'; // 'idle' | 'countdown' | 'running' | 'paused' | 'finished'
    
    // Настраиваемый предстартовый отсчёт (3, 5 или 10 сек)
    this.countdownDuration = 5;

    // Параметры режимов
    this.settings = {
      tabata: { work: 20, rest: 10, rounds: 8 },
      emom: { interval: 60, rounds: 10 },
      amrap: { duration: 600 }, // 10 минут
      for_time: { cap: 1200 }   // 20 минут ("крышка" / тайм-кэп)
    };

    this.currentRound = 1;
    this.totalRounds = 8;
    this.phase = 'work'; // 'work' | 'rest' | 'countdown'
    this.secondsRemaining = 20;
    this.secondsElapsed = 0;
    this.countdownSeconds = this.countdownDuration;
    this.intervalId = null;
  }

  setMode(mode) {
    if (this.status === 'running') this.stop();
    this.mode = mode;
    this.reset();
  }

  setCountdownDuration(sec) {
    const val = Math.max(0, Math.min(30, Number(sec) || 5));
    this.countdownDuration = val;
    this.countdownSeconds = val;
    this.notify();
  }

  setRounds(rounds) {
    const val = Math.max(1, Math.min(99, Number(rounds) || 8));
    if (this.mode === 'tabata') {
      this.settings.tabata.rounds = val;
    } else if (this.mode === 'emom') {
      this.settings.emom.rounds = val;
    }
    this.reset();
  }

  setIntervals(work, rest) {
    if (this.mode === 'tabata') {
      if (work != null) this.settings.tabata.work = Math.max(5, Math.min(300, Number(work)));
      if (rest != null) this.settings.tabata.rest = Math.max(0, Math.min(300, Number(rest)));
    } else if (this.mode === 'emom' && work != null) {
      this.settings.emom.interval = Math.max(15, Math.min(600, Number(work)));
    }
    this.reset();
  }

  setTimeCap(seconds) {
    const val = Math.max(60, Math.min(7200, Number(seconds) || 1200));
    if (this.mode === 'for_time') {
      this.settings.for_time.cap = val;
    } else if (this.mode === 'amrap') {
      this.settings.amrap.duration = val;
    }
    this.reset();
  }

  reset() {
    this.stop();
    this.status = 'idle';
    this.currentRound = 1;
    this.secondsElapsed = 0;
    this.countdownSeconds = this.countdownDuration;

    if (this.mode === 'tabata') {
      this.totalRounds = this.settings.tabata.rounds;
      this.phase = 'work';
      this.secondsRemaining = this.settings.tabata.work;
    } else if (this.mode === 'emom') {
      this.totalRounds = this.settings.emom.rounds;
      this.phase = 'work';
      this.secondsRemaining = this.settings.emom.interval;
    } else if (this.mode === 'amrap') {
      this.totalRounds = 1;
      this.phase = 'work';
      this.secondsRemaining = this.settings.amrap.duration;
    } else if (this.mode === 'for_time') {
      this.totalRounds = 1;
      this.phase = 'work';
      this.secondsRemaining = 0;
    }
    this.notify();
  }

  start() {
    soundEngine.init();
    if (this.status === 'paused') {
      this.status = 'running';
      this.startLoop();
      this.notify();
      return;
    }

    if (this.countdownDuration <= 0) {
      soundEngine.cueStart();
      this.status = 'running';
      this.startLoop();
      this.notify();
      return;
    }

    // Запуск предстартового отсчёта
    this.status = 'countdown';
    this.countdownSeconds = this.countdownDuration;
    soundEngine.cueCount();
    this.notify();

    this.intervalId = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds > 0) {
        soundEngine.cueCount();
        this.notify();
      } else {
        clearInterval(this.intervalId);
        soundEngine.cueStart();
        this.status = 'running';
        this.startLoop();
        this.notify();
      }
    }, 1000);
  }

  pause() {
    if (this.status !== 'running' && this.status !== 'countdown') return;
    this.stop();
    this.status = 'paused';
    this.notify();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  startLoop() {
    this.stop();
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    if (this.status !== 'running') return;
    this.secondsElapsed++;

    if (this.mode === 'for_time') {
      this.secondsRemaining++;
      if (this.secondsRemaining >= this.settings.for_time.cap) {
        this.finish();
      } else {
        this.notify();
      }
      return;
    }

    this.secondsRemaining--;

    // Звуковые подсказки за 3, 2, 1 сек до смены фазы
    if (this.secondsRemaining >= 1 && this.secondsRemaining <= 3) {
      soundEngine.cueCount();
    }

    if (this.secondsRemaining <= 0) {
      this.nextPhase();
    } else {
      this.notify();
    }
  }

  nextPhase() {
    if (this.mode === 'tabata') {
      if (this.phase === 'work') {
        if (this.currentRound >= this.totalRounds) {
          this.finish();
          return;
        }
        this.phase = 'rest';
        this.secondsRemaining = this.settings.tabata.rest;
        soundEngine.cueRest();
      } else {
        this.phase = 'work';
        this.currentRound++;
        this.secondsRemaining = this.settings.tabata.work;
        soundEngine.cueStart();
      }
    } else if (this.mode === 'emom') {
      if (this.currentRound >= this.totalRounds) {
        this.finish();
        return;
      }
      this.currentRound++;
      this.secondsRemaining = this.settings.emom.interval;
      soundEngine.cueStart();
    } else if (this.mode === 'amrap') {
      this.finish();
      return;
    }
    this.notify();
  }

  finish() {
    this.stop();
    this.status = 'finished';
    soundEngine.cueFinish();
    this.notify();
  }

  notify() {
    this.onChange(this.getState());
  }

  getState() {
    return {
      mode: this.mode,
      status: this.status,
      phase: this.phase,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      secondsRemaining: this.secondsRemaining,
      secondsElapsed: this.secondsElapsed,
      countdownSeconds: this.countdownSeconds,
      countdownDuration: this.countdownDuration,
      settings: JSON.parse(JSON.stringify(this.settings))
    };
  }
}
