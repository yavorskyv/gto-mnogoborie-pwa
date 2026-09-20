/**
 * Interactive WOD Competition Timer with Web Audio Beeps
 */

class WodTimer {
  constructor() {
    this.mode = 'for_time'; // 'for_time', 'amrap', 'emom', 'countdown'
    this.status = 'stopped'; // 'stopped', 'running', 'paused', 'countdown'
    this.currentTimeSeconds = 0;
    this.capSeconds = 600; // 10:00 default
    this.countdownSeconds = 10; // 10s prepare
    this.intervalId = null;
    this.audioCtx = null;
    this.laps = [];
    this.emomRound = 1;
    this.emomTotalRounds = 10;

    this.onTick = null;
    this.onStateChange = null;
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(frequency = 880, duration = 0.15, type = 'sine') {
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playHighBeep() {
    this.playBeep(1760, 0.4, 'triangle');
  }

  playCountdownBeep() {
    this.playBeep(880, 0.15, 'sine');
  }

  setMode(mode, capSeconds = 600) {
    this.reset();
    this.mode = mode;
    this.capSeconds = capSeconds;
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  start() {
    this.initAudio();
    if (this.status === 'running') return;

    if (this.status === 'stopped') {
      // Start 10s pre-countdown
      this.status = 'countdown';
      this.countdownSeconds = 5; // snappy 5 seconds
      this.playCountdownBeep();
      if (this.onStateChange) this.onStateChange(this.getState());

      this.intervalId = setInterval(() => {
        this.countdownSeconds--;
        if (this.countdownSeconds > 0) {
          this.playCountdownBeep();
        } else if (this.countdownSeconds === 0) {
          this.playHighBeep();
          clearInterval(this.intervalId);
          this.beginTimerRun();
        }
        if (this.onTick) this.onTick(this.getState());
      }, 1000);
      return;
    }

    if (this.status === 'paused') {
      this.beginTimerRun();
    }
  }

  beginTimerRun() {
    this.status = 'running';
    if (this.onStateChange) this.onStateChange(this.getState());

    this.intervalId = setInterval(() => {
      if (this.mode === 'amrap' || this.mode === 'countdown') {
        this.currentTimeSeconds--;
        if (this.currentTimeSeconds <= 0) {
          this.currentTimeSeconds = 0;
          this.finish();
        }
      } else {
        // for_time or emom
        this.currentTimeSeconds++;
        if (this.mode === 'emom') {
          if (this.currentTimeSeconds % 60 === 0) {
            this.emomRound++;
            this.playHighBeep();
            if (this.emomRound > this.emomTotalRounds) {
              this.finish();
            }
          } else if (this.currentTimeSeconds % 60 >= 57) {
            this.playCountdownBeep();
          }
        }
        if (this.capSeconds && this.currentTimeSeconds >= this.capSeconds) {
          this.finish();
        }
      }
      if (this.onTick) this.onTick(this.getState());
    }, 1000);
  }

  pause() {
    if (this.status === 'running' || this.status === 'countdown') {
      clearInterval(this.intervalId);
      this.status = 'paused';
      if (this.onStateChange) this.onStateChange(this.getState());
    }
  }

  reset() {
    clearInterval(this.intervalId);
    this.status = 'stopped';
    this.laps = [];
    this.emomRound = 1;
    if (this.mode === 'amrap') {
      this.currentTimeSeconds = this.capSeconds || 900;
    } else {
      this.currentTimeSeconds = 0;
    }
    if (this.onStateChange) this.onStateChange(this.getState());
    if (this.onTick) this.onTick(this.getState());
  }

  addLap() {
    if (this.status !== 'running') return;
    const lapTime = this.formatTime(this.currentTimeSeconds);
    this.laps.unshift({
      id: this.laps.length + 1,
      time: lapTime,
      rawSeconds: this.currentTimeSeconds
    });
    this.playCountdownBeep();
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  finish() {
    clearInterval(this.intervalId);
    this.status = 'finished';
    this.playHighBeep();
    setTimeout(() => this.playHighBeep(), 400);
    if (this.onStateChange) this.onStateChange(this.getState());
  }

  formatTime(totalSecs) {
    const minutes = Math.floor(Math.abs(totalSecs) / 60);
    const seconds = Math.abs(totalSecs) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  getState() {
    return {
      mode: this.mode,
      status: this.status,
      currentTime: this.formatTime(this.currentTimeSeconds),
      rawSeconds: this.currentTimeSeconds,
      countdown: this.countdownSeconds,
      capText: this.formatTime(this.capSeconds),
      laps: [...this.laps],
      emomRound: this.emomRound,
      emomTotal: this.emomTotalRounds
    };
  }
}

export const timerInstance = new WodTimer();
