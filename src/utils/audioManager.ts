// Audio Manager for Horse Galloping Sound Effects and Volume Management

class SoundManager {
  private audio: HTMLAudioElement | null = null;
  private volume: number = 0.75;
  private isMutedState: boolean = false;
  private isPlaying: boolean = false;
  private listeners: Set<(vol: number, isMuted: boolean) => void> = new Set();
  private userInteractionBound: boolean = false;
  private testTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('jockey_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
      const savedMuted = localStorage.getItem('jockey_sound_muted');
      if (savedMuted !== null) {
        this.isMutedState = savedMuted === 'true';
      }

      this.initAudio();
      this.bindUserInteraction();
    }
  }

  private initAudio() {
    try {
      this.audio = new Audio('/sounds/gallop_3min.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.isMutedState ? 0 : this.volume;

      this.audio.addEventListener('error', () => {
        // Fallback to 25s gallop.mp3 if 3min file encounters error
        if (this.audio && this.audio.src.includes('gallop_3min.mp3')) {
          this.audio.src = '/sounds/gallop.mp3';
          this.audio.load();
          if (this.isPlaying) {
            this.audio.play().catch(() => {});
          }
        }
      });
    } catch (e) {
      console.warn('Audio initialization error:', e);
    }
  }

  private bindUserInteraction() {
    if (this.userInteractionBound || typeof window === 'undefined') return;
    this.userInteractionBound = true;

    const unlockAudio = () => {
      if (this.audio) {
        // Try warm up
        if (this.isPlaying) {
          this.audio.play().catch(() => {});
        }
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
  }

  public getVolume(): number {
    return this.volume;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    if (clamped > 0 && this.isMutedState) {
      this.isMutedState = false;
      localStorage.setItem('jockey_sound_muted', 'false');
    }
    if (this.audio) {
      this.audio.volume = this.isMutedState ? 0 : this.volume;
    }
    localStorage.setItem('jockey_sound_volume', clamped.toString());
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMutedState = !this.isMutedState;
    if (this.audio) {
      this.audio.volume = this.isMutedState ? 0 : this.volume;
    }
    localStorage.setItem('jockey_sound_muted', this.isMutedState.toString());
    this.notify();
    return this.isMutedState;
  }

  public async playRaceSound() {
    this.isPlaying = true;
    if (!this.audio) {
      this.initAudio();
    }
    if (!this.audio) return;

    this.audio.volume = this.isMutedState ? 0 : this.volume;
    this.audio.currentTime = 0;
    try {
      await this.audio.play();
    } catch (err) {
      // Browser autoplay policy blocked; will auto-resume on first click/pointer interaction
    }
  }

  public stopRaceSound() {
    this.isPlaying = false;
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  public testSound() {
    if (!this.audio) {
      this.initAudio();
    }
    if (!this.audio) return;

    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }

    this.audio.volume = this.isMutedState ? 0 : this.volume;
    this.audio.play().then(() => {
      this.testTimer = setTimeout(() => {
        if (!this.isPlaying && this.audio) {
          this.audio.pause();
          this.audio.currentTime = 0;
        }
      }, 3000);
    }).catch(() => {});
  }

  public subscribe(cb: (vol: number, isMuted: boolean) => void) {
    this.listeners.add(cb);
    cb(this.volume, this.isMutedState);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.volume, this.isMutedState));
  }
}

export const audioManager = new SoundManager();
