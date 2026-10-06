// Profile Music Preset and Audio Manager
export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  genre: string;
  // A clean synthesized audio generator using Web Audio API or data URI
  synthType?: 'synthwave' | 'lofi' | 'cyberpunk' | 'ambient' | 'chiptune';
}

export const PRESET_TRACKS: MusicTrack[] = [
  {
    id: 'preset-synthwave',
    name: 'Neon Midnight Drive',
    artist: 'Chatflux Audio',
    genre: 'Synthwave',
    synthType: 'synthwave'
  },
  {
    id: 'preset-lofi',
    name: 'Cozy Rain & Coffee',
    artist: 'Lofi Chill Lab',
    genre: 'Lo-Fi Chill',
    synthType: 'lofi'
  },
  {
    id: 'preset-cyberpunk',
    name: 'Cyber City 2099',
    artist: 'Sector 7',
    genre: 'Cyberpunk',
    synthType: 'cyberpunk'
  },
  {
    id: 'preset-ambient',
    name: 'Starlight Dreamscape',
    artist: 'Cosmic Waves',
    genre: 'Ambient Space',
    synthType: 'ambient'
  },
  {
    id: 'preset-chiptune',
    name: 'Arcade Odyssey 8-Bit',
    artist: 'Pixel Hero',
    genre: 'Chiptune / Retro',
    synthType: 'chiptune'
  }
];

// Web Audio API Synthesizer to guarantee instant, zero-dependency background music!
class BackgroundMusicSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: any = null;
  private gainNode: GainNode | null = null;
  private volume: number = 0.5;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
    }
  }

  public playTrack(type: 'synthwave' | 'lofi' | 'cyberpunk' | 'ambient' | 'chiptune' = 'synthwave') {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume * 0.12, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    // Chords and notes according to genre
    const scales: Record<string, number[]> = {
      synthwave: [220, 261.63, 329.63, 392, 440, 523.25, 659.25], // Am7
      lofi: [174.61, 220, 261.63, 329.63, 392, 440], // Fmaj7
      cyberpunk: [110, 130.81, 146.83, 164.81, 220, 293.66], // Dark Dm
      ambient: [196, 246.94, 293.66, 392, 493.88, 587.33], // Gmaj9
      chiptune: [261.63, 329.63, 392, 523.25, 659.25, 783.99] // C Major
    };

    const notePool = scales[type] || scales.synthwave;
    let step = 0;

    const playNote = () => {
      if (!this.ctx || !this.isPlaying || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      const waveTypes: Record<string, OscillatorType> = {
        synthwave: 'sawtooth',
        lofi: 'sine',
        cyberpunk: 'triangle',
        ambient: 'sine',
        chiptune: 'square'
      };

      osc.type = waveTypes[type] || 'sawtooth';
      const baseFreq = notePool[step % notePool.length];
      const octave = step % 4 === 0 ? 0.5 : step % 3 === 0 ? 2 : 1;
      osc.frequency.setValueAtTime(baseFreq * octave, this.ctx.currentTime);

      const now = this.ctx.currentTime;
      const duration = type === 'ambient' ? 1.8 : type === 'lofi' ? 1.2 : 0.45;

      noteGain.gain.setValueAtTime(0.01, now);
      noteGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Add low-pass filter for cozy lofi & synthwave
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'lofi' ? 800 : type === 'ambient' ? 1200 : 2500, now);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + duration);

      step++;
    };

    const intervalMs = type === 'ambient' ? 1000 : type === 'lofi' ? 550 : type === 'chiptune' ? 220 : 350;
    this.intervalId = setInterval(playNote, intervalMs);
    playNote();
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const musicSynth = new BackgroundMusicSynthesizer();
