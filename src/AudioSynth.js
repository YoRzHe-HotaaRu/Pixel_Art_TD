// Procedural Chiptune Audio Synthesizer using Web Audio API
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.bgmVolume = null;
    this.sfxVolume = null;
    this.isMuted = false;
    this.isAttractMode = false;
    this.delayNode = null;
    this.delayFeedback = null;

    // BGM Sequencer state
    this.bgmTimer = null;
    this.isPlayingBgm = false;
    this.currentStep = 0;
    this.tempo = 120; // Beats per minute
    this.worldTheme = 1; // 1: Oasis, 2: Volcanic, 3: Frozen
    this.notesInQueue = [];
    this.nextNoteTime = 0.0;
    this.scheduleAheadTime = 0.1; // Schedule notes 100ms in advance
    this.lookahead = 30.0; // Run scheduler check every 30ms

    // Scale frequencies (Chiptune chords)
    // pentatonic scales to keep BGM sounding melodic
    this.scales = {
      1: [261.63, 293.66, 329.63, 392.00, 440.00], // C Major Pentatonic (Oasis - Happy/Bright)
      2: [146.83, 164.81, 174.61, 196.00, 220.00], // D Minor Pentatonic (Volcanic - Fast/Intense, lowered octave)
      3: [220.00, 246.94, 261.63, 329.63, 349.23]  // A Minor Pentatonic (Frozen - Icy/Melancholic)
    };

    this.bassScales = {
      1: [65.41, 73.42, 82.41, 98.00], // Low Octave C, D, E, G
      2: [36.71, 41.20, 43.65, 49.00], // Low Octave D, E, F, G
      3: [55.00, 61.74, 65.41, 82.41]  // Low Octave A, B, C, E
    };

    // Sequencer Drum Pattern (0 = silent, 1 = snare noise, 2 = kick wave)
    this.drumPattern = [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 2, 0, 1, 0, 0, 0];
  }

  // Initialize the audio graph
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext on init: ", e));
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Volume Gain
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);

      // BGM Volume Gain
      this.bgmVolume = this.ctx.createGain();
      this.bgmVolume.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.bgmVolume.connect(this.masterVolume);

      // SFX Volume Gain
      this.sfxVolume = this.ctx.createGain();
      this.sfxVolume.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxVolume.connect(this.masterVolume);

      // Delay Node for Stereo Echo
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayFeedback = this.ctx.createGain();
      this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime); // 240ms echo spacing
      this.delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime); // 35% feedback volume
      
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterVolume);

      // Start BGM loop scheduler
      this.nextNoteTime = this.ctx.currentTime;
      this.schedulerInterval = setInterval(() => this.scheduler(), this.lookahead);
      this.isPlayingBgm = true;

    } catch (e) {
      console.error("Web Audio API failed to load: ", e);
    }
  }

  // Ensure AudioContext is active (resuming if suspended)
  ensureContextActive() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext: ", e));
    }
  }

  // Set active world theme to adapt the BGM tempo & key
  setWorldTheme(themeId) {
    this.worldTheme = parseInt(themeId);
    if (this.worldTheme === 1) {
      this.tempo = 110; // Relaxed
    } else if (this.worldTheme === 2) {
      this.tempo = 135; // Fast, fiery
    } else {
      this.tempo = 95;  // Slow, cold
    }
  }

  // Master mute toggle
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterVolume) {
      this.masterVolume.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setBgmVolume(val) {
    if (this.bgmVolume && this.ctx) {
      this.bgmVolume.gain.setValueAtTime(parseFloat(val) * 0.4, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    if (this.sfxVolume && this.ctx) {
      this.sfxVolume.gain.setValueAtTime(parseFloat(val) * 0.6, this.ctx.currentTime);
    }
  }

  // Helper to create a panned node to position audio in stereo field
  createPanner(posX) {
    if (!this.ctx || !this.sfxVolume) return null;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      const x = typeof posX === 'number' && !isNaN(posX) ? posX : 0;
      // Map world X (-10 to 10) to stereo pan (-1.0 to 1.0)
      const pan = Math.max(-1.0, Math.min(1.0, x / 9.6));
      panner.pan.setValueAtTime(pan, this.ctx.currentTime);
      panner.connect(this.sfxVolume);
      return panner;
    }
    return this.sfxVolume; // Fallback if StereoPanner is not supported
  }

  // ----------------------------------------------------
  // BGM SEQUENCER
  // ----------------------------------------------------
  scheduler() {
    if (!this.isPlayingBgm || !this.ctx || this.isMuted) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
  }

  advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes (4 notes per beat)
    this.currentStep = (this.currentStep + 1) % 16;
  }

  scheduleNote(step, time) {
    // 1. Play Drums
    const drumType = this.drumPattern[step];
    if (drumType === 2) {
      this.playKickBgm(time);
    } else if (drumType === 1) {
      this.playSnareBgm(time);
    }

    // 2. Play Bass Line & Backing Chords (every 4 steps, i.e., quarter notes)
    if (step % 4 === 0) {
      this.playBassBgm(step, time);
      this.playChordBgm(step, time);
    }

    // 3. Play Melody (Pentatonic arpeggios, probabilistic)
    if (step % 2 === 0 && Math.random() < 0.65) {
      this.playMelodyBgm(step, time);
    }
  }

  // Synth Kick Drum
  playKickBgm(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.bgmVolume);

    osc.type = "sine";
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  // Synth Hi-Hat / Snare noise
  playSnareBgm(time) {
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 0.08; // 80ms duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmVolume);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.08);

    noise.start(time);
    noise.stop(time + 0.09);
  }

  // Play Bass Note (with rich Sawtooth + LFO filter sweep)
  playBassBgm(step, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(250, time);
    filter.Q.setValueAtTime(4.0, time);

    // LFO for filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(5.5, time); // 5.5 Hz sweep

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, time); // sweep depth

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmVolume);

    osc.type = "sawtooth"; // Rich raw sound

    const bassScale = this.bassScales[this.worldTheme];
    const noteIdx = Math.floor(step / 4) % bassScale.length;
    const freq = bassScale[noteIdx];

    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + 0.25);
    lfo.stop(time + 0.25);
  }

  // Play backing polyphonic synth chords
  playChordBgm(step, time) {
    const chords = {
      1: [ // Oasis (C Major Pentatonic)
        [261.63, 329.63, 392.00], // C4, E4, G4
        [349.23, 440.00, 523.25], // F4, A4, C5
        [392.00, 493.88, 587.33], // G4, B4, D5
        [440.00, 523.25, 659.25]  // A4, C5, E5
      ],
      2: [ // Volcanic (D Minor)
        [146.83, 174.61, 220.00], // D3, F3, A3
        [196.00, 233.08, 293.66], // G3, Bb3, D4
        [220.00, 261.63, 329.63], // A3, C4, E4
        [233.08, 293.66, 349.23]  // Bb3, D4, F4
      ],
      3: [ // Frozen (A Minor)
        [220.00, 261.63, 329.63], // A3, C4, E4
        [293.66, 349.23, 440.00], // D4, F4, A4
        [329.63, 392.00, 493.88], // E4, G4, B4
        [349.23, 440.00, 523.25]  // F4, A4, C5
      ]
    };

    const themeChords = chords[this.worldTheme];
    if (!themeChords) return;
    const chordIdx = Math.floor(step / 4) % themeChords.length;
    const notes = themeChords[chordIdx];

    notes.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine"; // smooth pure synth pads
      osc.frequency.setValueAtTime(freq, time);

      osc.connect(gain);
      gain.connect(this.bgmVolume);

      // soft padding volume
      gain.gain.setValueAtTime(0.045, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

      osc.start(time);
      osc.stop(time + 0.68);
    });
  }

  // Play Melody Note (with vibrato LFO and echo delay sends)
  playMelodyBgm(step, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.bgmVolume);

    // Route a copy of melody to echo delay node
    if (this.delayNode) {
      const delaySend = this.ctx.createGain();
      delaySend.gain.setValueAtTime(0.24, time); // send 24% to echo
      gain.connect(delaySend);
      delaySend.connect(this.delayNode);
    }

    // Vibe depends on world theme
    if (this.worldTheme === 3) {
      osc.type = "sine"; // Pure whistle for ice world
    } else {
      osc.type = "square"; // Chiptune lead for neon/volcano worlds
    }

    const scale = this.scales[this.worldTheme];
    const noteIdx = Math.floor(Math.random() * scale.length);
    let freq = scale[noteIdx];

    // Sometimes pitch up by an octave for light melodies
    if (Math.random() < 0.3) freq *= 2;

    osc.frequency.setValueAtTime(freq, time);

    // Pitch LFO for vibrato
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(6.0, time); // 6 Hz vibrato speed
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(freq * 0.012, time); // 1.2% pitch variance depth

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.002, time + 0.15);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + 0.16);
    lfo.stop(time + 0.16);
  }

  // ----------------------------------------------------
  // RETRO SOUND EFFECTS (SFX)
  // ----------------------------------------------------

  // Play shooting sounds panned to the source position
  playShoot(type, posX) {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const panner = this.createPanner(posX);
    if (!panner) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(panner);

    const now = this.ctx.currentTime;

    // Send a copy to the delay node for premium spatial echo
    const routeToDelay = (gainNode, level = 0.2) => {
      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(level, now);
        gainNode.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
    };

    if (type === "archer") {
      // String snap (short high-frequency click)
      const snapOsc = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snapOsc.type = "triangle";
      snapOsc.frequency.setValueAtTime(1400, now);
      snapOsc.frequency.linearRampToValueAtTime(300, now + 0.025);
      snapGain.gain.setValueAtTime(0.28, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      snapOsc.connect(snapGain);
      snapGain.connect(panner);
      snapOsc.start(now);
      snapOsc.stop(now + 0.03);

      // Whistling arrow (sine wave sweep)
      osc.type = "sine";
      osc.frequency.setValueAtTime(650, now + 0.01);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.16);
      gain.gain.setValueAtTime(0.14, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      routeToDelay(gain, 0.22);

      osc.start(now + 0.01);
      osc.stop(now + 0.17);

    } else if (type === "cannon") {
      // Low-frequency explosion rumble
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.32);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.start(now);
      osc.stop(now + 0.33);

      // Lowpassed noise component for industrial rumble
      this.playExplosionNoise(now, panner, 0.32, 0.35);
      routeToDelay(gain, 0.35);

    } else if (type === "frost") {
      // Shimmering high-pitch sine arpeggio
      const notes = [650, 975, 1460];
      notes.forEach((freq, i) => {
        const oscNode = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        oscNode.type = "sine";
        oscNode.frequency.setValueAtTime(freq, now + i * 0.035);
        
        gainNode.gain.setValueAtTime(0.12, now + i * 0.035);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.14);
        
        oscNode.connect(gainNode);
        gainNode.connect(panner);
        
        if (this.delayNode) {
          const delaySend = this.ctx.createGain();
          delaySend.gain.setValueAtTime(0.45, now + i * 0.035); // heavy echo for frozen shimmer
          gainNode.connect(delaySend);
          delaySend.connect(this.delayNode);
        }
        
        oscNode.start(now + i * 0.035);
        oscNode.stop(now + i * 0.035 + 0.15);
      });

      // Mute the main oscillator node
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.001, now);
      osc.start(now);
      osc.stop(now + 0.01);

    } else if (type === "laser") {
      // Sweeping resonant frequency beep with bandpass filter
      osc.disconnect(gain); // disconnect direct path
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.06);
      filter.Q.setValueAtTime(6.0, now);

      osc.connect(filter);
      filter.connect(gain);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      routeToDelay(gain, 0.18);

      osc.start(now);
      osc.stop(now + 0.07);
    }
  }

  // Cannon explosion noise helper
  playExplosionNoise(time, destinationNode, volume, duration) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(35, time + duration);

    const gain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destinationNode);

    if (this.delayNode) {
      const delaySend = this.ctx.createGain();
      delaySend.gain.setValueAtTime(volume * 0.45, time);
      gain.connect(delaySend);
      delaySend.connect(this.delayNode);
    }

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.start(time);
    noise.stop(time + duration + 0.05);
  }

  // Hit Impact Sound
  playHit(posX) {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const panner = this.createPanner(posX);
    if (!panner) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(panner);

    const now = this.ctx.currentTime;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    if (this.delayNode) {
      const delaySend = this.ctx.createGain();
      delaySend.gain.setValueAtTime(0.12, now);
      gain.connect(delaySend);
      delaySend.connect(this.delayNode);
    }

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Tower Build Sound
  playBuild(posX) {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const panner = this.createPanner(posX);
    if (!panner) return;

    const now = this.ctx.currentTime;
    
    // Play quick ascending arpeggio notes
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(panner);
      
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + index * 0.05);
      
      gain.gain.setValueAtTime(0.09, now + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.08);

      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.25, now + index * 0.05);
        gain.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
      
      osc.start(now + index * 0.05);
      osc.stop(now + index * 0.05 + 0.09);
    });
  }

  // Tower Upgrade Sound
  playUpgrade(posX) {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const panner = this.createPanner(posX);
    if (!panner) return;

    const now = this.ctx.currentTime;
    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(panner);
      
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + index * 0.04);
      
      gain.gain.setValueAtTime(0.09, now + index * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.07);

      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.3, now + index * 0.04);
        gain.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
      
      osc.start(now + index * 0.04);
      osc.stop(now + index * 0.04 + 0.08);
    });
  }

  // Tower Sell Sound
  playSell(posX) {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const panner = this.createPanner(posX);
    if (!panner) return;

    const now = this.ctx.currentTime;
    
    // Play quick descending arpeggio notes
    const notes = [523.25, 392.00, 329.63, 261.63]; // C5, G4, E4, C4
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(panner);
      
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + index * 0.05);
      
      gain.gain.setValueAtTime(0.09, now + index * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.08);

      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.2, now + index * 0.05);
        gain.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
      
      osc.start(now + index * 0.05);
      osc.stop(now + index * 0.05 + 0.09);
    });
  }

  // Castle Damaged Alarm
  playWarning() {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    const now = this.ctx.currentTime;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.35);

    gain.gain.setValueAtTime(0.48, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    if (this.delayNode) {
      const delaySend = this.ctx.createGain();
      delaySend.gain.setValueAtTime(0.2, now);
      gain.connect(delaySend);
      delaySend.connect(this.delayNode);
    }

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Victory Fanfare
  playVictory() {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const chords = [
      [261.63, 329.63, 392.00], // C major
      [293.66, 369.99, 440.00], // D major
      [329.63, 415.30, 493.88], // E major
      [523.25, 659.25, 783.99, 1046.50] // High C major chord
    ];

    chords.forEach((freqs, chordIndex) => {
      const delay = chordIndex * 0.18;
      const duration = chordIndex === 3 ? 0.8 : 0.15;
      
      freqs.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.sfxVolume);
        
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + delay);
        
        gain.gain.setValueAtTime(0.07, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

        if (this.delayNode) {
          const delaySend = this.ctx.createGain();
          delaySend.gain.setValueAtTime(0.25, now + delay);
          gain.connect(delaySend);
          delaySend.connect(this.delayNode);
        }
        
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.05);
      });
    });
  }

  // Defeat Theme
  playDefeat() {
    if (this.isAttractMode) return;
    this.ensureContextActive();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Sad minor chords
    const notes = [220.00, 207.65, 196.00, 146.83]; // A3, Ab3, G3, D3 (depressing fall)
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.sfxVolume);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + index * 0.25);
      
      gain.gain.setValueAtTime(0.14, now + index * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.25 + 0.3);

      if (this.delayNode) {
        const delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.3, now + index * 0.25);
        gain.connect(delaySend);
        delaySend.connect(this.delayNode);
      }
      
      osc.start(now + index * 0.25);
      osc.stop(now + index * 0.25 + 0.35);
    });
  }
}

export default new AudioSynth();
